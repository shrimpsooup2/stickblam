import { T, TICK, STANCE } from './sim/constants.js';
import { makePlayer, hurtDepth, canShoot } from './sim/player.js';
import { makeSim, advance, renderPos } from './sim/sim.js';
import { raycast } from './sim/world.js';
import { createRenderer } from './gfx/renderer.js';
import { poseFor } from './gfx/sprites.js';
import { MAPS } from './levels/index.js';
import { createInput } from './input.js';
import { createHud } from './hud.js';
import { clamp } from './sim/vec3.js';

const canvas = document.getElementById('view');
const hudRoot = document.getElementById('hud');

let renderer;
try {
  renderer = createRenderer(canvas);
} catch (err) {
  hudRoot.innerHTML = '<div id="fatal"><b>Cannot start</b><p>' + err.message + '</p></div>';
  throw err;
}

let mapIndex = 0;
let level = MAPS[mapIndex].build();
const player = makePlayer(level.world.spawn.x, level.world.spawn.y, level.world.spawn.z);
player.yaw = level.world.spawnYaw;
let sim = makeSim(level.world, player);

const post = { time: 0, hatch: 1.0, grain: 0.75, outline: 1.0 };
// Weapon state lives here, not in the sim: it is presentation until Phase 4.
const gun = { scopeT: 0, recoil: 0, cooldown: 0, bob: 0, swayX: 0, swayY: 0 };
const hud = createHud(hudRoot, post);
hud.setLabels(level.labels);
hud.setMap(MAPS[mapIndex]);
const input = createInput(canvas);

let thirdPerson = false;
const inkMarks = [];          // flat [x,y,z,ink] * 2 per segment
const rp = { x: 0, y: 0, z: 0, h: 0 };

function loadMap(i) {
  mapIndex = ((i % MAPS.length) + MAPS.length) % MAPS.length;
  level = MAPS[mapIndex].build();
  boxes = level.boxes;
  sim = makeSim(level.world, player);
  inkMarks.length = 0;
  hud.setLabels(level.labels);
hud.setMap(MAPS[mapIndex]);
  hud.setMap(MAPS[mapIndex]);
  respawn();
  player.yaw = level.world.spawnYaw;
}

function respawn() {
  player.pos.x = level.world.spawn.x;
  player.pos.y = level.world.spawn.y + 0.5;
  player.pos.z = level.world.spawn.z;
  player.vel.x = player.vel.y = player.vel.z = 0;
  player.crumpled = false;
  player.gliding = false;
  player.recover = 0;
  player.thin = 0;
  player.shootLock = 0;
  player.stance = STANCE.NORMAL;
  player.apex = 0;
}

/** Debug trace: draws where a shot would land. Not the weapon system. */
function traceShot(ox, oy, oz, dx, dy, dz) {
  const hit = raycast(level.world, ox, oy, oz, dx, dy, dz, 180);
  const t = hit ? hit.t : 180;
  const ex = ox + dx * t, ey = oy + dy * t, ez = oz + dz * t;
  inkMarks.push(ox + dx * 0.4, oy + dy * 0.4 - 0.06, oz + dz * 0.4, 0.35, ex, ey, ez, 1.0);
  if (hit) {
    // a scratchy splat on the surface it hit
    const n = [hit.nx, hit.ny, hit.nz];
    const ux = Math.abs(n[1]) > 0.5 ? 1 : 0, uy = Math.abs(n[1]) > 0.5 ? 0 : 1;
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * 6.28, r1 = 0.05 + Math.random() * 0.28;
      const o = 0.02;
      inkMarks.push(
        ex + n[0] * o + Math.cos(a) * r1 * ux, ey + n[1] * o + Math.sin(a) * r1 * uy,
        ez + n[2] * o + (ux ? Math.sin(a) * r1 : Math.cos(a) * r1 * (1 - Math.abs(n[2]))), 1.0,
        ex + n[0] * o, ey + n[1] * o, ez + n[2] * o, 1.0);
    }
  }
  while (inkMarks.length > 8000 * 4) inkMarks.splice(0, 8 * 4);
}

let boxes = level.boxes;
const sprites = [];
let last = performance.now(), fps = 60, fpsAcc = 0, fpsN = 0;

function frame(now) {
  // The first rAF timestamp can predate the performance.now() captured at module
  // load, so dt can be negative on frame one. Left unclamped that runs the sim
  // accumulator backwards and indexes animation cycles with negative numbers.
  const dtReal = Math.max(0, Math.min((now - last) / 1000, 0.25));
  last = now;
  post.time += dtReal;
  fpsAcc += dtReal; fpsN++;
  if (fpsAcc > 0.25) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }

  // ---------- input ----------
  const st = input.sample();
  const m = input.consumeMouse();
  if (input.state.locked) {
    player.yaw += m.dx * T.lookSensitivity;
    player.pitch = clamp(player.pitch - m.dy * T.lookSensitivity, -1.52, 1.52);
    hud.hideHint();
  }
  if (input.state.locked) {
    gun.swayX += (-m.dx * 0.0016 - gun.swayX) * Math.min(1, dtReal * 9);
    gun.swayY += (-m.dy * 0.0016 - gun.swayY) * Math.min(1, dtReal * 9);
  }
  if (input.consume('view')) thirdPerson = !thirdPerson;
  if (input.consume('respawn')) respawn();
  if (input.consume('map')) loadMap(mapIndex + 1);
  if (input.consume('panel')) hud.togglePanel();
  if (player.pos.y < -40) respawn();

  // ---------- simulate ----------
  advance(sim, dtReal, st);
  renderPos(sim, rp);

  // ---------- weapon ----------
  gun.scopeT += (((st.scoped || gun.forceScope) && canShoot(player) ? 1 : 0) - gun.scopeT) *
                Math.min(1, dtReal / Math.max(T.scopeTime, 1e-3));
  gun.recoil = Math.max(0, gun.recoil - dtReal * 5.5);
  gun.cooldown = Math.max(0, gun.cooldown - dtReal);
  gun.bob += dtReal * player.speed * 1.5;

  // ---------- camera ----------
  const cp = Math.cos(player.pitch), sp = Math.sin(player.pitch);
  const cy = Math.cos(player.yaw), sy = Math.sin(player.yaw);
  const fx = -sy * cp, fy = sp, fz = cy * cp;        // forward
  const eyeY = rp.y + rp.h * (T.eyeHeight / T.height);
  const cam = { fov: T.fov + (T.scopeFov - T.fov) * gun.scopeT, x: rp.x, y: eyeY, z: rp.z,
                tx: rp.x + fx, ty: eyeY + fy, tz: rp.z + fz };
  if (thirdPerson) {
    const back = 4.2, up = 1.1;
    cam.x = rp.x - fx * back; cam.y = eyeY - fy * back + up; cam.z = rp.z - fz * back;
    cam.tx = rp.x + fx * 2; cam.ty = eyeY + fy * 2; cam.tz = rp.z + fz * 2;
  }
  const look = { rx: -cy, rz: -sy };   // cross(forward, up) on the ground plane

  if (input.firing() && gun.cooldown <= 0 && canShoot(player)) {
    gun.cooldown = T.fireInterval;
    gun.recoil = 1;
    traceShot(rp.x, eyeY, rp.z, fx, fy, fz);
  }

  // ---------- viewmodel ----------
  // hip: low and off to the side. scoped: brought up onto the centre line.
  const sc = gun.scopeT;
  const gnd = player.grounded ? 1 : 0.25;
  const bobX = Math.sin(gun.bob) * T.bobAmount * (1 - sc) * gnd;
  const bobY = Math.abs(Math.cos(gun.bob)) * T.bobAmount * 0.7 * (1 - sc) * gnd;
  const vmodel = thirdPerson ? null : {
    cx: (0.26 - 0.26 * sc) + bobX + gun.swayX * T.swayAmount * 26,
    cy: (-0.70 + 0.10 * sc) + bobY + gun.swayY * T.swayAmount * 26 - gun.recoil * T.recoilKick,
    hw: 0.34 - 0.04 * sc,
    hh: 0.46 - 0.05 * sc,
    rot: (-0.14 + 0.14 * sc) - gun.recoil * 0.10,
    cell: sc > 0.5 ? 1 : 0,
  };

  // ---------- sprites ----------
  sprites.length = 0;
  for (let i = 0; i < level.dummies.length; i++) {
    const d = level.dummies[i];
    const pick = poseFor({ stance: 0, ball: false, thin: 0, grounded: true,
                           vy: 0, speed: d.pose.startsWith('run') ? 4 : 0 }, post.time, d.seed);
    const r = renderer.atlas.rects[d.pose.startsWith('run') ? pick.pose : 'idle'][pick.variant];
    sprites.push(d.x, d.y, d.z, T.height, r.x, r.y, r.w, r.h, 1, 0.62, 0, 0);
  }
  if (thirdPerson) {
    const pick = poseFor({ stance: player.stance, ball: player.crumpled, thin: player.thin,
                           grounded: player.grounded, vy: player.vel.y, speed: player.speed },
                         post.time, 0);
    const r = renderer.atlas.rects[pick.pose][pick.variant];
    // the card flip: compress to nothing, pop out mirrored
    const flip = Math.sin(clamp(player.flipT, 0, 1) * Math.PI * 0.5);
    const thinScale = 1 - player.thin * 0.86;
    sprites.push(rp.x, rp.y, rp.z, rp.h,
                 r.x, r.y, r.w, r.h,
                 player.facing * flip * thinScale, 0.9, 0,
                 player.crumpled ? -player.roll * player.facing : 0);
  }

  // ---------- draw ----------
  const w = Math.floor(canvas.clientWidth * Math.min(devicePixelRatio || 1, 1.75));
  const h = Math.floor(canvas.clientHeight * Math.min(devicePixelRatio || 1, 1.75));
  renderer.resize(Math.max(2, w), Math.max(2, h));
  renderer.render({ cam, boxes, sprites, lines: inkMarks, post, vmodel }, look);

  hud.updateLabels(
    (x, y, z) => { const p = renderer.project(x, y, z); if (!p) return null;
                   return { x: p.x / (w / canvas.clientWidth), y: p.y / (h / canvas.clientHeight),
                            z: p.z, dist: p.dist }; },
    canvas.clientWidth, canvas.clientHeight);
  const locked = !canShoot(player);
  const spread = 7 + player.speed * 0.55 + (player.grounded ? 0 : 5)
               - gun.scopeT * 5 + gun.recoil * 9;
  hud.updateCrosshair(Math.max(2, spread), locked, gun.scopeT);
  hud.update(player, sim, fps, { hurt: hurtDepth(player), apex: player.apex, locked });

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.__stickblam = { player, get sim() { return sim; }, get level() { return level; },
  T, post, gun, MAPS, loadMap, get mapIndex() { return mapIndex; }, gl: renderer.gl, atlas: renderer.atlas,
  get spriteCount(){ return sprites.length / 12; }, get firstSprite(){ return sprites.slice(0,12); } };
