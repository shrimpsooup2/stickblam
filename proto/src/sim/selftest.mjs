// Headless physics checks. `node proto/src/sim/selftest.mjs`
import { T, TICK, STANCE } from './constants.js';
import { makeWorld, addBox, raycast } from './world.js';
import { makePlayer, stepPlayer, hurtDepth } from './player.js';

const NONE = { fwd:0, right:0, jump:false, crouch:false, edge:false, flatten:false };
const inp = (o={}) => ({ ...NONE, ...o });
let pass = 0, fail = 0;
const ok = (name, cond, detail='') => {
  if (cond) { pass++; console.log('  PASS  ' + name + (detail ? '   ' + detail : '')); }
  else      { fail++; console.log('  FAIL  ' + name + '   ' + detail); }
};
function run(p, w, input, seconds) {
  const n = Math.round(seconds / TICK);
  for (let i = 0; i < n; i++) stepPlayer(p, input, w, TICK);
}

function flatWorld() {
  const w = makeWorld();
  addBox(w, 0, -1, 0, 400, 2, 400, 'floor');
  return w;
}

console.log('\n--- gravity & ground ---');
{
  const w = flatWorld(), p = makePlayer(0, 5, 0);
  run(p, w, inp(), 3);
  ok('falls and settles on the floor', Math.abs(p.pos.y) < 1e-3, 'y=' + p.pos.y.toFixed(4));
  ok('is grounded', p.grounded === true);
  ok('vertical velocity zeroed', Math.abs(p.vel.y) < 1e-6);
}

console.log('\n--- run speed ---');
{
  const w = flatWorld(), p = makePlayer(0, 0, 0);
  run(p, w, inp({ fwd: 1 }), 2.5);
  ok('reaches max speed', Math.abs(p.speed - T.maxSpeed) < 0.05, p.speed.toFixed(3) + ' m/s');
  run(p, w, inp(), 1.5);
  ok('friction brings it to rest', p.speed < 1e-3, p.speed.toExponential(2));
}

console.log('\n--- jump arc ---');
{
  const w = flatWorld(), p = makePlayer(0, 0, 0);
  let apex = 0, air = 0;
  stepPlayer(p, inp({ jump: true }), w, TICK);
  for (let i = 0; i < 400; i++) {
    stepPlayer(p, inp({ jump: false }), w, TICK);
    apex = Math.max(apex, p.pos.y);
    if (!p.grounded) air += TICK; else if (air > 0.1) break;
  }
  // Semi-implicit Euler sits v*dt/2 above the continuous solution. That is the
  // integrator being honest, not a bug, so predict the discrete value.
  const predicted = (T.jumpVel * T.jumpVel) / (2 * T.gravity) + T.jumpVel * TICK / 2;
  ok('apex matches the discrete prediction', Math.abs(apex - predicted) < 0.01,
     apex.toFixed(3) + 'm vs ' + predicted.toFixed(3) + 'm');
  ok('hang time is arena-appropriate', air > 0.5 && air < 0.9, air.toFixed(3) + 's');
}

console.log('\n--- coyote time & jump buffer ---');
{
  const w = makeWorld();
  addBox(w, 0, -1, 0, 10, 2, 10, 'ledge');
  const p = makePlayer(0, 0, 0);
  let left = false;
  for (let i = 0; i < 2000; i++) {              // walk until the ground goes
    stepPlayer(p, inp({ right: 1 }), w, TICK);
    if (!p.grounded) { left = true; break; }
  }
  ok('left the ledge', left);
  stepPlayer(p, inp({ right: 1, jump: true }), w, TICK);
  ok('coyote jump fires just after leaving ground', p.vel.y > 5,
     'vy=' + p.vel.y.toFixed(2));
  const late = makePlayer(0, 0, 0);
  for (let i = 0; i < 2000; i++) { stepPlayer(late, inp({ right: 1 }), w, TICK); if (!late.grounded) break; }
  run(late, w, inp({ right: 1 }), T.coyoteTime + 0.05);
  stepPlayer(late, inp({ right: 1, jump: true }), w, TICK);
  // Note: jump-while-falling deploys the glide, so vy rises slightly. What must
  // NOT happen is a launch.
  ok('coyote window does expire', late.vel.y < 0, 'vy=' + late.vel.y.toFixed(2) + ' (no launch)');
  ok('late jump becomes a glide instead', late.gliding === true);

  const w2 = flatWorld(), q = makePlayer(0, 2.0, 0);
  let fired = false;
  for (let i = 0; i < 400; i++) {
    // tap jump while still ~0.08s from the floor, then release
    const press = !q.grounded && q.pos.y < 0.35 && q.vel.y < 0;
    const wasAir = !q.grounded;
    stepPlayer(q, inp({ jump: press }), w2, TICK);
    if (wasAir && q.vel.y > 5) { fired = true; break; }
  }
  ok('jump pressed just before landing is buffered', fired);
}

console.log('\n--- step up ---');
{
  const w = flatWorld();
  addBox(w, 3, 0.15, 0, 2, 0.3, 4, 'curb');      // 0.30m, under stepHeight
  const p = makePlayer(0, 0, 0);
  let peak = 0;
  for (let i = 0; i < 240; i++) { stepPlayer(p, inp({ right: 1 }), w, TICK); peak = Math.max(peak, p.pos.y); }
  ok('climbs a 0.30m curb', peak > 0.25, 'peak y=' + peak.toFixed(3));

  const w2 = flatWorld();
  addBox(w2, 3, 0.5, 0, 2, 1.0, 4, 'wall');      // 1.0m, over stepHeight
  const q = makePlayer(0, 0, 0);
  run(q, w2, inp({ right: 1 }), 2.0);
  ok('blocked by a 1.0m wall', q.pos.y < 0.05 && q.pos.x < 2.0,
     'x=' + q.pos.x.toFixed(2) + ' y=' + q.pos.y.toFixed(2));
}

console.log('\n--- no tunnelling at speed ---');
{
  const w = flatWorld();
  addBox(w, 20, 2, 0, 0.5, 4, 20, 'thin wall');
  const p = makePlayer(0, 0, 0);
  p.vel.x = 60;                                   // far above any legal speed
  run(p, w, inp({ right: 1 }), 2.0);
  ok('does not pass through a thin wall at 60 m/s', p.pos.x < 20,
     'x=' + p.pos.x.toFixed(2));
}

console.log('\n--- paper glide ---');
{
  const w = flatWorld();
  const a = makePlayer(0, 40, 0), b = makePlayer(0, 40, 0);
  let ta = 0, tb = 0;
  for (let i = 0; i < 4000 && !a.grounded; i++) { stepPlayer(a, inp(), w, TICK); ta += TICK; }
  for (let i = 0; i < 4000 && !b.grounded; i++) { stepPlayer(b, inp({ jump: true }), w, TICK); tb += TICK; }
  ok('gliding slows the fall a lot', tb > ta * 2.2,
     'fall ' + ta.toFixed(2) + 's vs glide ' + tb.toFixed(2) + 's');
  ok('glide clamps fall speed', Math.abs(b.vel.y) <= T.glideMaxFall + 1e-6);

  const c = makePlayer(0, 5, 0);
  stepPlayer(c, inp({ jump: true }), w, TICK);
  ok('does not engage before falling', c.gliding === false);
}

console.log('\n--- edge-on ---');
{
  const w = flatWorld(), p = makePlayer(0, 0, 0);
  const wide = hurtDepth(p);
  run(p, w, inp({ edge: true }), 0.5);
  ok('hurtbox collapses to a sliver', hurtDepth(p) < wide * 0.25,
     wide.toFixed(3) + 'm -> ' + hurtDepth(p).toFixed(3) + 'm');
  ok('thinning is not instant', T.edgeEnterTime > 0.08);
  const q = makePlayer(0, 0, 0);
  run(q, w, inp({ fwd: 1 }), 2.5);
  const full = q.speed;
  run(q, w, inp({ fwd: 1, edge: true }), 2.0);
  ok('edge-on costs speed', q.speed < full * 0.7,
     full.toFixed(2) + ' -> ' + q.speed.toFixed(2) + ' m/s');
}

console.log('\n--- crumple ---');
{
  const w = flatWorld(), p = makePlayer(0, 0, 0);
  run(p, w, inp({ fwd: 1 }), 2.5);
  const before = p.speed;
  stepPlayer(p, inp({ fwd: 1, crouch: true }), w, TICK);
  ok('entering a roll boosts speed', p.speed > before + 2, before.toFixed(2) + ' -> ' + p.speed.toFixed(2));
  ok('is crumpled', p.crumpled === true);
  run(p, w, inp({ fwd: 1, crouch: true }), 0.4);
  ok('height drops', p.height < T.height * 0.75, p.height.toFixed(2) + 'm');

  const q = makePlayer(0, 0, 0);
  stepPlayer(q, inp({ crouch: true }), w, TICK);
  ok('cannot roll from standing still', q.crumpled === false);
}

console.log('\n--- crumple tunnel clearance ---');
{
  const w = flatWorld();
  // underside at 1.1m: standing (1.78) will not fit, rolling (0.85) will.
  // Entrance at x=14, far enough that the 1.2s approach run does not reach it.
  addBox(w, 17, 2.1, 0, 6, 2.0, 6, 'low ceiling');
  const p = makePlayer(0, 0, 0);
  run(p, w, inp({ right: 1 }), 1.2);
  ok('approach run stops short of the tunnel', p.pos.x < 14, 'x=' + p.pos.x.toFixed(2));
  run(p, w, inp({ right: 1, crouch: true }), 2.5);
  ok('rolls under a 1.1m ceiling', p.pos.x > 20, 'x=' + p.pos.x.toFixed(2));
  ok('cannot stand up until clear of the ceiling', p.crumpled === true || p.pos.x > 20);

  // and standing height genuinely cannot pass
  const q = makePlayer(0, 0, 0);
  run(q, w, inp({ right: 1 }), 4.0);
  ok('standing is blocked by the same tunnel', q.pos.x < 14.1, 'x=' + q.pos.x.toFixed(2));
}

console.log('\n--- flatten ---');
{
  const w = flatWorld();
  addBox(w, 2.0, 2, 0, 0.4, 4, 8, 'wall');
  const p = makePlayer(1.4, 0, 0);
  run(p, w, inp({ right: 1 }), 0.8);
  run(p, w, inp({ flatten: true }), 1.0);
  ok('sticks to the wall', p.stance === STANCE.FLATTEN);
  ok('gravity is cancelled while flattened', Math.abs(p.vel.y) < 0.2, 'vy=' + p.vel.y.toFixed(3));
  ok('hurtbox is thinnest of all', hurtDepth(p) <= T.normalDepth * 0.2);
  const y0 = p.pos.y;
  run(p, w, inp({ flatten: true, jump: true }), 0.1);
  ok('kicks off the wall on jump', p.vel.y > 5 || p.pos.y > y0 + 0.05);
}

console.log('\n--- raycast ---');
{
  const w = flatWorld();
  addBox(w, 10, 2, 0, 1, 4, 4, 'target');
  const hit = raycast(w, 0, 2, 0, 1, 0, 0);
  ok('ray hits the near face', hit && Math.abs(hit.t - 9.5) < 1e-6, hit ? 't=' + hit.t : 'null');
  ok('normal points back at the shooter', hit && hit.nx === -1);
  ok('ray into empty space misses', raycast(makeWorld(), 0, 2, 0, 1, 0, 0) === null);
}

console.log('\n--- determinism ---');
{
  const script = [];
  for (let i = 0; i < 600; i++)
    script.push(inp({ fwd: 1, right: Math.sin(i / 40) > 0 ? 1 : -1,
                      jump: i % 73 === 0, crouch: i > 300 && i < 380, edge: i > 450 && i < 500 }));
  const sample = () => {
    const w = flatWorld(); addBox(w, 6, .15, 0, 3, .3, 8);
    const p = makePlayer(0, 0, 0);
    for (const s of script) stepPlayer(p, s, w, TICK);
    return [p.pos.x, p.pos.y, p.pos.z, p.vel.x, p.vel.y, p.vel.z].join(',');
  };
  const a = sample(), b = sample();
  ok('identical inputs give bit-identical state', a === b);
}

console.log('\n' + (fail ? 'FAILED ' + fail + ' / ' + (pass + fail) : 'All ' + pass + ' checks passed'));
process.exit(fail ? 1 : 0);
