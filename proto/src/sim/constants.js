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

  // --- Edge-On: turn sideways, become a sliver ---
  edgeEnterTime:       0.12,  // seconds to rotate perpendicular
  edgeSpeedMult:       0.60,
  edgeDepth:           0.05,  // hurtbox depth when fully edge-on
  normalDepth:         0.30,

  // --- Flatten: press onto a wall, become part of the artwork ---
  flattenSpeed:        0.42,  // fraction of maxSpeed while sliding along a wall
  flattenReach:        0.55,  // how close a wall must be
  flattenMaxTime:      4.0,   // 0 = unlimited
  flattenDepth:        0.03,

  // --- Paper Glide: flat things catch air ---
  glideGravityMult:    0.22,
  glideMaxFall:        3.2,
  glideAirControl:     2.1,   // multiplies airAccel while gliding
  glideMinFallSpeed:   0.6,   // must actually be falling before it engages

  // --- Crumple: ball up and roll ---
  crumpleEnterSpeed:   4.2,   // need this much speed to start a roll
  crumpleBoost:        3.4,   // m/s added on entry
  crumpleMaxSpeed:    12.5,
  crumpleFriction:     1.5,   // much slicker than standing
  crumpleAccel:        7.0,   // but you can barely steer
  crumpleHeightMult:   0.48,
  crumpleExitSpeed:    3.0,   // drops out of the roll below this

  // --- body ---
  height:              1.78,
  halfWidth:           0.32,  // world-collision half-extent (square-ish, so you
                              // never wedge on a corner because you turned)
  eyeHeight:           1.62,

  // --- camera ---
  lookSensitivity:     0.0022,
  fov:                 88,
};

export const STANCE = { NORMAL: 0, EDGE_ON: 1, CRUMPLE: 2, FLATTEN: 3 };
export const STANCE_NAME = ['Normal', 'Edge-On', 'Crumple', 'Flatten'];

export const TICK = 1 / 120;   // fixed sim step. Deterministic on purpose:
                               // this is what server-authoritative netcode needs.
