import { T, STANCE } from './constants.js';
import { v3, clamp, approach } from './vec3.js';
import { moveAndCollide, anyOverlap } from './aabb.js';
import { groundClearance } from './world.js';

// Quake-family acceleration: you only gain speed in the wish direction up to
// wishSpeed, which is what makes air control fall out for free.
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
  const s = Math.max(0, speed - drop) / speed;
  vel.x *= s; vel.z *= s;
}

export function makePlayer(x = 0, y = 0, z = 0) {
  return {
    pos: v3(x, y, z),
    vel: v3(0, 0, 0),
    yaw: 0, pitch: 0,

    grounded: false,
    stance: STANCE.NORMAL,

    thin: 0,            // 0 = square on, 1 = fully edge-on (90 degrees)
    edgeHeld: false,
    shootLock: 0,       // seconds until the weapon works again

    gliding: false,
    recover: 0,         // seconds left lying flat after a glide landing
    clearance: 0,       // metres of air below the feet

    crumpled: false,
    roll: 0,            // accumulated roll angle, for the sprite

    coyote: 0,
    buffered: 0,
    lastJumpHeld: false,
    lastGlideHeld: false,

    height: T.height,
    facing: 1,
    flipT: 1,

    speed: 0, apex: 0,
  };
}

/** Can the weapon fire right now? Gliding and rolling are both fine -- that is the point. */
export function canShoot(p) {
  return p.shootLock <= 0 && p.stance !== STANCE.EDGE_ON && p.stance !== STANCE.RECOVER;
}

/** Hurtbox depth. This is what turning sideways actually buys you. */
export function hurtDepth(p) {
  return T.normalDepth + (T.edgeDepth - T.normalDepth) * p.thin;
}

/**
 * One fixed sim tick. `input` is engine-agnostic:
 * { fwd, right, jump, crouch, edge, glide }
 */
export function stepPlayer(p, input, world, dt) {
  const solids = world.solids;
  const wasGrounded = p.grounded;
  p.shootLock = Math.max(0, p.shootLock - dt);
  p.clearance = groundClearance(world, p.pos.x, p.pos.y, p.pos.z);

  // ---------------- recovery: flat on the page, getting up ----------------
  if (p.recover > 0) {
    p.recover -= dt;
    p.stance = STANCE.RECOVER;
    applyFriction(p.vel, T.friction * 2.2, T.stopSpeed, dt);
    p.vel.y -= T.gravity * dt;
    p.height = approach(p.height, T.height * 0.30, 7, dt);
    p.thin = approach(p.thin, 0, 1 / T.edgeExitTime, dt);
    const r0 = moveAndCollide(p.pos, p.vel, T.halfWidth, p.height, dt, solids, 0, wasGrounded);
    p.grounded = r0.grounded;
    p.speed = Math.hypot(p.vel.x, p.vel.z);
    if (p.recover <= 0) p.stance = STANCE.NORMAL;
    return r0;
  }

  // ---------------- crumple ----------------
  // Hold crouch and you crumple into a ball. No speed gate: it is a stance,
  // not a trick you have to earn with speed.
  // --- uncurl tech bookkeeping ---
  // Track time spent balled in mid-air, and how long ago it was released.
  if (p.grounded) { p.airCurl = 0; p.uncurlAt = -1; }
  else {
    if (p.crumpled) { p.airCurl += dt; p.uncurlAt = -1; }
    else if (p.airCurl >= T.uncurlMinCurl && p.uncurlAt < 0) p.uncurlAt = 0;
    else if (p.uncurlAt >= 0) p.uncurlAt += dt;
  }
  p.uncurlOk = Math.max(0, p.uncurlOk - dt * 2.2);

  const wantCrumple = input.crouch && !p.gliding;
  if (wantCrumple && !p.crumpled) {
    p.crumpled = true;
    const s = Math.hypot(p.vel.x, p.vel.z);
    if (s > 0.5) { const k = (s + T.crumpleEnterBoost) / s; p.vel.x *= k; p.vel.z *= k; }
  } else if (!wantCrumple && p.crumpled) {
    // only stand up if there is headroom
    if (!anyOverlap(p.pos, T.halfWidth, T.height, solids)) p.crumpled = false;
  }

  // ---------------- edge-on ----------------
  // Held: snap to 90 degrees. Released: come back slowly, and no shooting for a
  // second. Tapping it is not free.
  const wantEdge = input.edge && !p.crumpled && !p.gliding;
  if (p.edgeHeld && !wantEdge) p.shootLock = Math.max(p.shootLock, T.edgeShootLock);
  p.edgeHeld = wantEdge;
  const rate = wantEdge ? 1 / T.edgeEnterTime : 1 / T.edgeExitTime;
  p.thin = approach(p.thin, wantEdge ? 1 : 0, rate, dt);

  // ---------------- glide deploy ----------------
  const glidePressed = input.glide && !p.lastGlideHeld;
  p.lastGlideHeld = input.glide;
  if (glidePressed && !p.grounded && !p.gliding && !p.crumpled &&
      p.clearance >= T.glideMinClearance) {
    p.gliding = true;
    p.vel.y = Math.max(p.vel.y, -T.glideFallSpeed);
  }
  // Once open it stays open. There is no cancelling a sheet of paper.

  // ---------------- stance readout ----------------
  p.stance = p.gliding ? STANCE.GLIDE
           : p.crumpled ? STANCE.CRUMPLE
           : (p.thin > 0.02 ? STANCE.EDGE_ON : STANCE.NORMAL);

  const targetHeight = p.crumpled ? T.height * T.crumpleHeightMult : T.height;
  p.height = approach(p.height, targetHeight, 6.0, dt);

  // ---------------- wish direction ----------------
  // forward = (-sin, 0, cos); camera right = cross(forward, up) = (-cos, 0, -sin).
  // The right term used to be the negation of that, so strafing was mirrored
  // while forward/back was fine.
  const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
  let wx = -input.right * cy - input.fwd * sy;
  let wz = -input.right * sy + input.fwd * cy;
  const wl = Math.hypot(wx, wz);
  const wishing = wl > 1e-5;
  if (wishing) { wx /= wl; wz /= wl; } else { wx = 0; wz = 0; }

  // ---------------- jump bookkeeping ----------------
  const jumpPressed = input.jump && !p.lastJumpHeld;
  p.lastJumpHeld = input.jump;
  if (jumpPressed) p.buffered = T.jumpBuffer;
  p.buffered = Math.max(0, p.buffered - dt);
  p.coyote = p.grounded ? T.coyoteTime : Math.max(0, p.coyote - dt);

  if (p.gliding) {
    // ---------------- gliding ----------------
    // Slow, steerable, and shootable. That is the whole trade: you are a
    // defenceless slow-moving target with a clear shot.
    if (wishing) accelerate(p.vel, wx, wz, T.glideMaxSpeed, T.glideAirAccel, dt);
    else applyFriction(p.vel, 1.1, 0.4, dt);
    p.vel.y = approach(p.vel.y, -T.glideFallSpeed, 26, dt);
  } else if (p.grounded) {
    // ---------------- ground ----------------
    applyFriction(p.vel,
                  p.crumpled ? T.crumpleFriction : T.friction,
                  p.crumpled ? T.crumpleStopSpeed : T.stopSpeed, dt);
    const maxS = p.crumpled ? T.crumpleMaxSpeed
               : T.maxSpeed * (p.stance === STANCE.EDGE_ON ? T.edgeSpeedMult : 1)
                            * (input.scoped ? T.scopeSpeedMult : 1);
    const acc = p.crumpled ? T.crumpleAccel : T.accel;
    if (wishing) accelerate(p.vel, wx, wz, maxS, acc, dt);
  } else {
    // ---------------- air ----------------
    if (wishing) accelerate(p.vel, wx, wz, T.airWishSpeed, T.airAccel * T.airControl, dt);
    p.vel.y -= T.gravity * dt;
    if (p.vel.y < -T.terminalFall) p.vel.y = -T.terminalFall;
  }

  // jump sits outside the branches so coyote time means something
  if (!p.gliding) {
    const wantJump = p.buffered > 0 || (T.autoHop && input.jump);
    if (wantJump && p.coyote > 0) {
      p.vel.y = T.jumpVel * (p.crumpled ? T.crumpleJumpMult : 1);
      p.grounded = false;
      p.buffered = 0; p.coyote = 0;
      p.apex = p.pos.y;
    }
  }

  // ---------------- integrate ----------------
  const fallSpeed = p.vel.y;
  const r = moveAndCollide(p.pos, p.vel, T.halfWidth, p.height, dt, solids,
                           p.crumpled ? T.stepHeight * 0.5 : T.stepHeight, wasGrounded);
  p.grounded = r.grounded;

  if (p.grounded) {
    p.coyote = T.coyoteTime;

    // --- the uncurl payoff ---
    // Released inside the window, on the same airtime you balled up: the fall
    // becomes speed, and it hops you straight back out so it chains.
    if (!wasGrounded && p.uncurlAt >= 0 && p.uncurlAt <= T.uncurlWindow && !p.gliding) {
      const sp = Math.hypot(p.vel.x, p.vel.z);
      const target = Math.min(sp + T.uncurlGain, T.uncurlMaxSpeed);
      if (sp > 0.4) { const k = target / sp; p.vel.x *= k; p.vel.z *= k; }
      p.vel.y = T.jumpVel * T.uncurlHop;
      p.grounded = false;
      p.lastUncurl = p.uncurlAt;
      p.uncurlOk = 1;
      p.airCurl = 0; p.uncurlAt = -1;
    }

    if (p.gliding) {
      // A glide always ends the same way: flat on your face.
      p.gliding = false;
      p.recover = T.glideRecoverTime;
      p.stance = STANCE.RECOVER;
      p.vel.x *= 0.25; p.vel.z *= 0.25;
    } else if (p.crumpled && fallSpeed < -4) {
      p.vel.y = -fallSpeed * T.crumpleBounce;    // a ball bounces
      p.grounded = false;
    }
  }

  // ---------------- facing, flip, roll ----------------
  if (wishing && !p.crumpled) {
    const want = -(wx * cy + wz * sy) >= 0 ? 1 : -1;
    if (want !== p.facing) { p.facing = want; p.flipT = 0; }
  }
  p.flipT = Math.min(1, p.flipT + dt * 9);
  p.speed = Math.hypot(p.vel.x, p.vel.z);
  if (p.crumpled) p.roll += (p.speed / Math.max(0.35, T.height * T.crumpleHeightMult * 0.5)) * dt;

  if (!p.grounded) p.apex = Math.max(p.apex, p.pos.y);
  return r;
}
