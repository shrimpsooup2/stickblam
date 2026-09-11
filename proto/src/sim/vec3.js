// Minimal vector helpers. Mutating forms are used in the hot path to keep the
// fixed-step loop allocation-free.
export const v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
export const set = (a, x, y, z) => { a.x = x; a.y = y; a.z = z; return a; };
export const copy = (a, b) => { a.x = b.x; a.y = b.y; a.z = b.z; return a; };
export const addScaled = (a, b, s) => { a.x += b.x * s; a.y += b.y * s; a.z += b.z * s; return a; };
export const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
export const len = (a) => Math.hypot(a.x, a.y, a.z);
export const lenXZ = (a) => Math.hypot(a.x, a.z);

export function normalize(a) {
  const l = len(a);
  if (l > 1e-8) { a.x /= l; a.y /= l; a.z /= l; }
  return a;
}
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// Move `cur` toward `target` at `rate` per second. Frame-rate independent.
export function approach(cur, target, rate, dt) {
  const d = target - cur;
  const step = rate * dt;
  if (Math.abs(d) <= step) return target;
  return cur + Math.sign(d) * step;
}
