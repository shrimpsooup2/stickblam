import { T, STANCE } from './constants.js';
import { v3, clamp, approach } from './vec3.js';
import { moveAndCollide, probeWall, anyOverlap } from './aabb.js';

// Quake-family acceleration: you only gain speed in the wish direction up to
// wishSpeed, which is what makes air control (and strafe-jumping) fall out for
// free rather than needing a special case.
function accelerate(vel, wx, wz, wishSpeed, accel, dt) {
  const current = vel.x * wx + vel.z * wz;
  const add = wishSpeed - current;
  if (add <= 0) return;
  const a = Math.min(accel * wishSpeed * dt, add);
  vel.x += wx * a;
  vel.z += wz * a;
}

function applyFriction(vel, friction, stopSpeed, dt) {
  const speed = Math.hypot(vel.x, vel.z);
  if (speed < 1e-4) { vel.x = 0; vel.z = 0; return; }
  const control = Math.max(speed, stopSpeed);
  const drop = control * friction * dt;
  const newSpeed = Math.max(0, speed - drop) / speed;
  vel.x *= newSpeed;
  vel.z *= newSpeed;
}

export function makePlayer(x = 0, y = 0, z = 0) {
  return {
    pos: v3(x, y, z),
    vel: v3(0, 0, 0),
    yaw: 0, pitch: 0,

    grounded: false,
    stance: STANCE.NORMAL,
    thin: 0,             // 0 = full width, 1 = fully edge-on
    gliding: false,
    crumpled: false,
    flattenTime: 0,
    wallNormal: null,

    coyote: 0,
    buffered: 0,
    lastJumpHeld: false,

    height: T.height,
    facing: 1,           // +1 / -1, the sprite flip
    flipT: 1,            // 1 = settled, 0 = mid-flip (render squashes on this)

    // stats the HUD reads
    speed: 0, apex: 0, groundedTime: 0, airTime: 0,
  };
}

/**
 * One fixed sim tick.
 * `input` is { fwd, right, jump, crouch, edge, flatten } — all engine-agnostic,
 * so this module has no idea a keyboard or a browser exists.
 */
export function stepPlayer(p, input, world, dt) {
  const solids = world.solids;

  // ---------- stance resolution ----------
  const wantEdge = input.edge && !p.crumpled;
  const wall = input.flatten ? probeWall(p.pos, T.halfWidth, p.height, T.flattenReach, solids) : null;
  const canFlatten = !!wall && (T.flattenMaxTime <= 0 || p.flattenTime < T.flattenMaxTime);

  if (canFlatten) {
    p.stance = STANCE.FLATTEN;
    p.wallNormal = wall;
    p.flattenTime += dt;
  } else {
    if (p.stance === STANCE.FLATTEN) p.wallNormal = null;
    if (!input.flatten) p.flattenTime = Math.max(0, p.flattenTime - dt * 2);
    p.stance = p.crumpled ? STANCE.CRUMPLE : (wantEdge ? STANCE.EDGE_ON : STANCE.NORMAL);
  }

  // Edge-On is a continuous rotation, not a toggle: the sliver arrives over
  // edgeEnterTime so it reads as a commitment rather than a twitch.
  const thinTarget = (p.stance === STANCE.EDGE_ON) ? 1 : (p.stance === STANCE.FLATTEN ? 1 : 0);
  p.thin = approach(p.thin, thinTarget, 1 / Math.max(T.edgeEnterTime, 1e-3), dt);

  // ---------- crumple entry / exit ----------
  const speedXZ = Math.hypot(p.vel.x, p.vel.z);
  if (!p.crumpled && input.crouch && p.grounded && speedXZ >= T.crumpleEnterSpeed &&
      p.stance !== STANCE.FLATTEN) {
    p.crumpled = true;
    const s = Math.max(speedXZ, 1e-4);
    const boosted = Math.min(speedXZ + T.crumpleBoost, T.crumpleMaxSpeed);
    p.vel.x *= boosted / s; p.vel.z *= boosted / s;
  }
  if (p.crumpled) {
    const tooSlow = speedXZ < T.crumpleExitSpeed;
    if ((!input.crouch || tooSlow)) {
      // only stand up if there is headroom
      const probe = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
      if (!anyOverlap(probe, T.halfWidth, T.height, solids)) p.crumpled = false;
    }
  }
  const targetHeight = p.crumpled ? T.height * T.crumpleHeightMult : T.height;
  p.height = approach(p.height, targetHeight, 6.0, dt);

  // ---------- wish direction, in world space ----------
  const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
  let wx = input.right * cy - input.fwd * sy;
  let wz = input.right * sy + input.fwd * cy;
  const wl = Math.hypot(wx, wz);
  if (wl > 1e-5) { wx /= wl; wz /= wl; } else { wx = 0; wz = 0; }
  const wishing = wl > 1e-5;

  // ---------- jump bookkeeping ----------
  const jumpPressed = input.jump && !p.lastJumpHeld;
  p.lastJumpHeld = input.jump;
  if (jumpPressed) p.buffered = T.jumpBuffer;
  p.buffered = Math.max(0, p.buffered - dt);
  p.coyote = p.grounded ? T.coyoteTime : Math.max(0, p.coyote - dt);

  // ---------- FLATTEN: stuck to the wall, sliding along it ----------
  if (p.stance === STANCE.FLATTEN && p.wallNormal) {
    const n = p.wallNormal;
    // tangent along the wall surface
    const tx = -n.nz, tz = n.nx;
    const along = wishing ? (wx * tx + wz * tz) : 0;
    const target = along * T.maxSpeed * T.flattenSpeed;
    p.vel.x = approach(p.vel.x, tx * target, 40, dt);
    p.vel.z = approach(p.vel.z, tz * target, 40, dt);
    p.vel.y = approach(p.vel.y, 0, 60, dt);        // no gravity while pressed on
    if (p.buffered > 0) {                          // kick off the wall
      p.vel.y = T.jumpVel * 0.92;
      p.vel.x += n.nx * T.maxSpeed * 0.55;
      p.vel.z += n.nz * T.maxSpeed * 0.55;
      p.buffered = 0; p.stance = STANCE.NORMAL; p.wallNormal = null;
    }
  } else {
    // ---------- GROUND / AIR ----------
    if (p.grounded) {
      const fr = p.crumpled ? T.crumpleFriction : T.friction;
      applyFriction(p.vel, fr, T.stopSpeed, dt);

      let maxS = T.maxSpeed, acc = T.accel;
      if (p.crumpled)                  { maxS = T.crumpleMaxSpeed; acc = T.crumpleAccel; }
      else if (p.stance === STANCE.EDGE_ON) { maxS *= T.edgeSpeedMult; }
      if (wishing) accelerate(p.vel, wx, wz, maxS, acc, dt);

    } else {
      // Paper Glide: flat things catch air. Only once actually falling, so it
      // reads as deploying a sheet rather than as a double jump.
      p.gliding = input.jump && p.vel.y < -T.glideMinFallSpeed && !p.crumpled;
      const airAcc = T.airAccel * (p.gliding ? T.glideAirControl : 1) * T.airControl;
      if (wishing) accelerate(p.vel, wx, wz, T.airWishSpeed, airAcc, dt);

      const g = T.gravity * (p.gliding ? T.glideGravityMult : 1);
      p.vel.y -= g * dt;
      const floor = p.gliding ? -T.glideMaxFall : -T.terminalFall;
      if (p.vel.y < floor) p.vel.y = floor;
    }

    // Jump lives outside the grounded branch on purpose: coyote time only means
    // anything if you can still jump after the ground has gone.
    const wantJump = p.buffered > 0 || (T.autoHop && input.jump);
    if (wantJump && p.coyote > 0) {
      p.vel.y = T.jumpVel;
      p.grounded = false;
      p.gliding = false;
      p.buffered = 0;
      p.coyote = 0;
      p.apex = p.pos.y;
    }
  }

  // ---------- integrate against the world ----------
  const wasGrounded = p.grounded;
  const r = moveAndCollide(p.pos, p.vel, T.halfWidth, p.height, dt, solids,
                           p.crumpled ? T.stepHeight * 0.5 : T.stepHeight, wasGrounded);
  p.grounded = r.grounded;
  if (p.grounded) { p.gliding = false; p.coyote = T.coyoteTime; }
  if (p.stance === STANCE.FLATTEN) p.grounded = false;

  // ---------- facing / flip ----------
  if (wishing) {
    const want = (wx * cy - wz * sy) >= 0 ? 1 : -1;   // sidedness relative to view
    if (want !== p.facing) { p.facing = want; p.flipT = 0; }
  }
  p.flipT = Math.min(1, p.flipT + dt * 9);   // ~0.11s card flip

  // ---------- readouts ----------
  p.speed = Math.hypot(p.vel.x, p.vel.z);
  if (p.grounded) { p.groundedTime += dt; p.airTime = 0; }
  else            { p.airTime += dt; p.groundedTime = 0; p.apex = Math.max(p.apex, p.pos.y); }
  return r;
}

/** Hurtbox depth, in metres. This is what Edge-On and Flatten actually buy you. */
export function hurtDepth(p) {
  const base = T.normalDepth;
  const target = p.stance === STANCE.FLATTEN ? T.flattenDepth : T.edgeDepth;
  return base + (target - base) * p.thin;
}
