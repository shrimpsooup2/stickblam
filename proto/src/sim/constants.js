// Every tuning number in the game, in one object.
// The HUD edits this live; nothing else should hold a magic number.
export const T = {
  // --- world ---
  gravity:            22.0,   // m/s^2
  terminalFall:       38.0,

  // --- ground movement (Quake-family accelerate/friction) ---
  maxSpeed:            7.6,   // m/s on foot
  accel:              62.0,
  friction:            8.2,
  stopSpeed:           2.2,   // friction floor, stops the long slow slide

  // --- air ---
  airAccel:           14.0,
  airWishSpeed:        1.25,  // the classic small cap: enables strafe accel
  airControl:          0.9,

  // --- jump ---
  jumpVel:             7.35,  // ~1.23 m apex at g=22
  coyoteTime:          0.10,  // still jumpable this long after leaving ground
  jumpBuffer:          0.12,  // early press still fires on landing
  autoHop:            true,   // holding jump re-hops on landing
  stepHeight:          0.38,  // auto-climb ledges up to here

  // --- Edge-On: turn a full 90 degrees and become a sliver ---
  edgeEnterTime:       0.14,  // snap round to perpendicular
  edgeExitTime:        0.55,  // but come back slowly -- the tax on tapping it
  edgeShootLock:       1.00,  // and you cannot shoot for this long after release
  edgeSpeedMult:       0.55,
  edgeDepth:           0.05,
  normalDepth:         0.30,

  // --- Paper Glide: a committed deployment, not a hold ---
  glideMinClearance:   2.60,  // needs more air beneath you than a jump can buy
  glideFallSpeed:      1.55,  // slow enough to aim and shoot on the way down
  glideAirAccel:      10.0,
  glideMaxSpeed:       5.20,
  glideRecoverTime:    0.95,  // you land flat and have to get up

  // --- Ball: hold crouch and roll ---
  ballFriction:        0.34,  // barely any -- a ball does not come to a stop
  ballAccel:           9.0,   // and you can barely steer it
  ballMaxSpeed:       13.0,
  ballEnterBoost:      1.9,
  ballHeightMult:      0.42,
  ballJumpMult:        0.72,
  ballBounce:          0.32,  // keeps a little vertical energy on landing

  // --- body ---
  height:              1.78,
  halfWidth:           0.32,  // world-collision half-extent (square-ish, so you
                              // never wedge on a corner because you turned)
  eyeHeight:           1.62,

  // --- camera ---
  lookSensitivity:     0.0022,
  fov:                 88,

  // --- weapon feel ---
  scopeTime:           0.16,  // hip <-> scoped
  scopeFov:            52,
  scopeSpeedMult:      0.52,
  fireInterval:        0.16,
  recoilKick:          0.055,
  swayAmount:          0.030,
  bobAmount:           0.024,
};

export const STANCE = { NORMAL: 0, EDGE_ON: 1, BALL: 2, GLIDE: 3, RECOVER: 4 };
export const STANCE_NAME = ['Normal', 'Edge-On', 'Ball', 'Gliding', 'Getting up'];

export const TICK = 1 / 120;   // fixed sim step. Deterministic on purpose:
                               // this is what server-authoritative netcode needs.
