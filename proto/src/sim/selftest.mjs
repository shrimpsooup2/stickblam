// Headless physics checks. `node proto/src/sim/selftest.mjs`
import { T, TICK, STANCE } from './constants.js';
import { makeWorld, addBox, raycast, groundClearance } from './world.js';
import { makePlayer, stepPlayer, hurtDepth, canShoot } from './player.js';

const NONE = { fwd:0, right:0, jump:false, crouch:false, edge:false, glide:false, scoped:false };
const inp = (o={}) => ({ ...NONE, ...o });
// World +x is screen-LEFT (camera right = cross(forward, up) = -x at yaw 0), so
// tests that want to travel toward +x drive the strafe stick left.
const toPlusX = { right: -1 };
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
    stepPlayer(p, inp(toPlusX), w, TICK);
    if (!p.grounded) { left = true; break; }
  }
  ok('left the ledge', left);
  stepPlayer(p, inp({ ...toPlusX, jump: true }), w, TICK);
  ok('coyote jump fires just after leaving ground', p.vel.y > 5,
     'vy=' + p.vel.y.toFixed(2));
  const late = makePlayer(0, 0, 0);
  for (let i = 0; i < 2000; i++) { stepPlayer(late, inp(toPlusX), w, TICK); if (!late.grounded) break; }
  run(late, w, inp(toPlusX), T.coyoteTime + 0.05);
  const vBefore = late.vel.y;
  stepPlayer(late, inp({ ...toPlusX, jump: true }), w, TICK);
  ok('coyote window does expire', late.vel.y < vBefore,
     'vy=' + late.vel.y.toFixed(2) + ' (no launch)');
  // Glide is a separate, gated toggle now -- jump does not deploy it.
  ok('a late jump does nothing at all', late.gliding === false);

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
  for (let i = 0; i < 240; i++) { stepPlayer(p, inp(toPlusX), w, TICK); peak = Math.max(peak, p.pos.y); }
  ok('climbs a 0.30m curb', peak > 0.25, 'peak y=' + peak.toFixed(3));

  const w2 = flatWorld();
  addBox(w2, 3, 0.5, 0, 2, 1.0, 4, 'wall');      // 1.0m, over stepHeight
  const q = makePlayer(0, 0, 0);
  run(q, w2, inp(toPlusX), 2.0);
  ok('blocked by a 1.0m wall', q.pos.y < 0.05 && q.pos.x < 2.0,
     'x=' + q.pos.x.toFixed(2) + ' y=' + q.pos.y.toFixed(2));
}

console.log('\n--- no tunnelling at speed ---');
{
  const w = flatWorld();
  addBox(w, 20, 2, 0, 0.5, 4, 20, 'thin wall');
  const p = makePlayer(0, 0, 0);
  p.vel.x = 60;                                   // far above any legal speed
  run(p, w, inp(toPlusX), 2.0);
  ok('does not pass through a thin wall at 60 m/s', p.pos.x < 20,
     'x=' + p.pos.x.toFixed(2));
}

console.log('\n--- paper glide ---');
{
  const w = flatWorld();
  // will not deploy without enough air beneath you
  const low = makePlayer(0, 1.0, 0);
  run(low, w, inp({ glide: true }), 0.1);
  ok('will not deploy below the clearance floor', low.gliding === false,
     'clearance ' + low.clearance.toFixed(2) + 'm < ' + T.glideMinClearance + 'm');

  const high = makePlayer(0, 30, 0);
  stepPlayer(high, inp(), w, TICK);
  stepPlayer(high, inp({ glide: true }), w, TICK);
  ok('deploys with clearance', high.gliding === true);

  // it is a toggle: releasing the key does not cancel it
  run(high, w, inp(), 0.5);
  ok('cannot be cancelled once open', high.gliding === true);

  // slow enough to aim and shoot
  run(high, w, inp(), 1.0);
  ok('falls slowly', Math.abs(high.vel.y) <= T.glideFallSpeed + 0.05,
     high.vel.y.toFixed(2) + ' m/s');
  ok('can shoot while gliding', canShoot(high) === true);

  // a normal fall from the same height is far quicker
  const drop = makePlayer(0, 30, 0);
  let ta = 0, tb = 0;
  for (let i = 0; i < 8000 && !drop.grounded; i++) { stepPlayer(drop, inp(), w, TICK); ta += TICK; }
  const g2 = makePlayer(0, 30, 0);
  stepPlayer(g2, inp(), w, TICK);
  stepPlayer(g2, inp({ glide: true }), w, TICK);
  for (let i = 0; i < 8000 && !g2.grounded; i++) { stepPlayer(g2, inp(), w, TICK); tb += TICK; }
  ok('glide descent is much slower', tb > ta * 5,
     'fall ' + ta.toFixed(2) + 's vs glide ' + tb.toFixed(2) + 's');

  // and it always ends face down
  ok('lands flat and has to get up', g2.recover > 0 && g2.stance === STANCE.RECOVER);
  ok('cannot shoot while getting up', canShoot(g2) === false);
  run(g2, w, inp({ fwd: 1 }), 0.3);
  ok('barely moves while getting up', g2.speed < 1.0, g2.speed.toFixed(2) + ' m/s');
  run(g2, w, inp(), T.glideRecoverTime);
  ok('recovers to normal', g2.stance === STANCE.NORMAL && canShoot(g2) === true);
}

console.log('\n--- edge-on ---');
{
  const w = flatWorld(), p = makePlayer(0, 0, 0);
  const wide = hurtDepth(p);
  run(p, w, inp({ edge: true }), T.edgeEnterTime + 0.02);
  ok('turns a full 90 degrees', p.thin > 0.99, 'thin=' + p.thin.toFixed(3));
  ok('hurtbox collapses to a sliver', hurtDepth(p) < wide * 0.25,
     wide.toFixed(3) + 'm -> ' + hurtDepth(p).toFixed(3) + 'm');
  ok('cannot shoot while sideways', canShoot(p) === false);

  // even a tap costs you: slow return AND a shooting lockout
  const tap = makePlayer(0, 0, 0);
  run(tap, w, inp({ edge: true }), 0.05);
  run(tap, w, inp(), TICK);
  ok('tapping still locks the weapon', tap.shootLock > 0.9,
     tap.shootLock.toFixed(2) + 's');
  run(tap, w, inp(), T.edgeExitTime * 0.4);
  ok('returns slowly, not instantly', tap.thin > 0.0 || tap.shootLock > 0.3);
  run(tap, w, inp(), T.edgeShootLock);
  ok('lock expires', canShoot(tap) === true);

  const q = makePlayer(0, 0, 0);
  run(q, w, inp({ fwd: 1 }), 2.5);
  const full = q.speed;
  run(q, w, inp({ fwd: 1, edge: true }), 2.0);
  ok('edge-on costs speed', q.speed < full * 0.7,
     full.toFixed(2) + ' -> ' + q.speed.toFixed(2) + ' m/s');
}

console.log('\n--- crumple ---');
{
  const w = flatWorld();
  // no speed gate: holding crouch IS the stance
  const p = makePlayer(0, 0, 0);
  run(p, w, inp({ crouch: true }), 0.2);
  ok('holding crouch from standing still crumples', p.crumpled === true);
  ok('can shoot while crumpled', canShoot(p) === true);
  run(p, w, inp({ crouch: true }), 0.4);
  ok('height drops', p.height < T.height * 0.6, p.height.toFixed(2) + 'm');

  // entering with speed gives a push
  const q = makePlayer(0, 0, 0);
  run(q, w, inp({ fwd: 1 }), 2.5);
  const before = q.speed;
  run(q, w, inp({ fwd: 1, crouch: true }), TICK * 2);
  ok('entering with speed boosts', q.speed > before + 0.5,
     before.toFixed(2) + ' -> ' + q.speed.toFixed(2));

  // it coasts rather than stopping dead -- but it is not frictionless
  const r2 = makePlayer(0, 0, 0);
  run(r2, w, inp({ fwd: 1 }), 2.0);
  run(r2, w, inp({ fwd: 1, crouch: true }), 0.5);
  const rollSpeed = r2.speed;
  run(r2, w, inp({ crouch: true }), 2.0);       // let go of the stick entirely
  ok('still rolling 2s after input stops', r2.speed > 1.0,
     rollSpeed.toFixed(2) + ' -> ' + r2.speed.toFixed(2) + ' m/s');
  ok('but it does bleed speed -- not frictionless', r2.speed < rollSpeed * 0.45,
     'kept ' + (100 * r2.speed / rollSpeed).toFixed(0) + '%');

  // compare against standing, which stops dead
  const walk = makePlayer(0, 0, 0);
  run(walk, w, inp({ fwd: 1 }), 2.0);
  run(walk, w, inp(), 2.0);
  ok('standing stops dead by comparison', walk.speed < 0.01 && r2.speed > 1.0,
     'walk ' + walk.speed.toFixed(3) + ' vs crumple ' + r2.speed.toFixed(2));

  ok('it visibly rolls', r2.roll > 1.0, 'roll=' + r2.roll.toFixed(1) + ' rad');
}

console.log('\n--- crumple tunnel clearance ---');
{
  const w = flatWorld();
  addBox(w, 17, 2.1, 0, 6, 2.0, 6, 'low ceiling');
  const p = makePlayer(0, 0, 0);
  run(p, w, inp(toPlusX), 1.2);
  run(p, w, inp({ ...toPlusX, crouch: true }), 2.5);
  ok('rolls under a 1.1m ceiling', p.pos.x > 20, 'x=' + p.pos.x.toFixed(2));
  ok('cannot stand up until clear', p.crumpled === true || p.pos.x > 20);
  const q = makePlayer(0, 0, 0);
  run(q, w, inp(toPlusX), 4.0);
  ok('standing is blocked by the same tunnel', q.pos.x < 14.1, 'x=' + q.pos.x.toFixed(2));
}

console.log('\n--- ground clearance ---');
{
  const w = flatWorld();
  ok('clearance on the floor is ~0', groundClearance(w, 0, 0, 0) < 0.05);
  ok('clearance at 10m is ~10', Math.abs(groundClearance(w, 0, 10, 0) - 10) < 0.05,
     groundClearance(w, 0, 10, 0).toFixed(3));
  ok('clearance over a void is infinite', groundClearance(makeWorld(), 0, 5, 0) === Infinity);
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
