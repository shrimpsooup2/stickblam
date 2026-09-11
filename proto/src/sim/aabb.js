// Axis-aligned box collision.
//
// The player origin is at the FEET, centred horizontally. Feet-origin makes
// ground detection and step-up straightforward, which is most of what a
// character controller does.
//
// Resolution is per-axis (Y, then X, then Z) rather than a true swept capsule.
// It is stable, cheap, and never tunnels at our speeds and tick rate; the one
// thing it needs help with is ledges, which is what stepping is for.

export const box = (minx, miny, minz, maxx, maxy, maxz, tag = '') =>
  ({ minx, miny, minz, maxx, maxy, maxz, tag });

export function overlaps(a, b) {
  return a.minx < b.maxx && a.maxx > b.minx &&
         a.miny < b.maxy && a.maxy > b.miny &&
         a.minz < b.maxz && a.maxz > b.minz;
}

function playerBox(pos, half, height, out) {
  out.minx = pos.x - half; out.maxx = pos.x + half;
  out.miny = pos.y;        out.maxy = pos.y + height;
  out.minz = pos.z - half; out.maxz = pos.z + half;
  return out;
}

const _pb = box(0, 0, 0, 0, 0, 0);

/**
 * Move one axis and push out of anything we end up inside.
 * Returns the signed penetration that had to be corrected (0 = free move).
 */
function moveAxis(pos, half, height, axis, amount, solids) {
  if (amount === 0) return 0;
  pos[axis] += amount;
  playerBox(pos, half, height, _pb);
  let corrected = 0;

  for (let i = 0; i < solids.length; i++) {
    const s = solids[i];
    if (!overlaps(_pb, s)) continue;
    if (axis === 'y') {
      if (amount > 0) { pos.y = s.miny - height; corrected = -1; }
      else            { pos.y = s.maxy;          corrected =  1; }
    } else if (axis === 'x') {
      if (amount > 0) { pos.x = s.minx - half; corrected = -1; }
      else            { pos.x = s.maxx + half; corrected =  1; }
    } else {
      if (amount > 0) { pos.z = s.minz - half; corrected = -1; }
      else            { pos.z = s.maxz + half; corrected =  1; }
    }
    playerBox(pos, half, height, _pb);
  }
  return corrected;
}

export function anyOverlap(pos, half, height, solids) {
  playerBox(pos, half, height, _pb);
  for (let i = 0; i < solids.length; i++) if (overlaps(_pb, solids[i])) return true;
  return false;
}

/**
 * Integrate velocity against the world for one tick.
 * Mutates pos and vel. Returns collision flags for the caller's state machine.
 */
export function moveAndCollide(pos, vel, half, height, dt, solids, stepHeight, wasGrounded = false) {
  const res = { grounded: false, ceiling: false, wallX: 0, wallZ: 0, steppedUp: false };

  // --- vertical first, so grounded is known before we try to step ---
  const cy = moveAxis(pos, half, height, 'y', vel.y * dt, solids);
  if (cy > 0) { res.grounded = true; vel.y = 0; }
  else if (cy < 0) { res.ceiling = true; vel.y = 0; }

  // --- horizontal, with a step-up retry if we get stopped while grounded ---
  const dx = vel.x * dt, dz = vel.z * dt;
  const sx = pos.x, sy = pos.y, sz = pos.z;

  const cx = moveAxis(pos, half, height, 'x', dx, solids);
  const cz = moveAxis(pos, half, height, 'z', dz, solids);

  if ((cx || cz) && (res.grounded || wasGrounded) && stepHeight > 0) {
    // Retry the whole horizontal move from a raised position, then settle back
    // down. If that lands us higher and unobstructed, we climbed a ledge.
    const tx = pos.x, tz = pos.z;
    pos.x = sx; pos.y = sy + stepHeight; pos.z = sz;
    if (!anyOverlap(pos, half, height, solids)) {
      moveAxis(pos, half, height, 'x', dx, solids);
      moveAxis(pos, half, height, 'z', dz, solids);
      // settle
      const drop = moveAxis(pos, half, height, 'y', -stepHeight, solids);
      const gainedGround = drop > 0;
      const movedFurther = Math.hypot(pos.x - sx, pos.z - sz) > Math.hypot(tx - sx, tz - sz) + 1e-4;
      if (gainedGround && movedFurther) {
        res.steppedUp = true;
      } else {
        pos.x = tx; pos.y = sy; pos.z = tz;   // no better, take the blocked slide
      }
    } else {
      pos.x = tx; pos.y = sy; pos.z = tz;
    }
  }

  if (cx && !res.steppedUp) { res.wallX = cx; vel.x = 0; }
  if (cz && !res.steppedUp) { res.wallZ = cz; vel.z = 0; }

  // --- ground probe: are we standing on something right now? ---
  if (!res.grounded && vel.y <= 0) {
    pos.y -= 0.02;
    if (anyOverlap(pos, half, height, solids)) res.grounded = true;
    pos.y += 0.02;
  }
  return res;
}

/** Nearest wall within `reach`, as a surface normal. Used by Flatten. */
export function probeWall(pos, half, height, reach, solids) {
  const mid = pos.y + height * 0.5, hh = height * 0.35;
  let best = null, bestDist = reach;
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i];
    if (s.maxy < mid - hh || s.miny > mid + hh) continue;
    const cx = Math.max(s.minx, Math.min(pos.x, s.maxx));
    const cz = Math.max(s.minz, Math.min(pos.z, s.maxz));
    const dx = pos.x - cx, dz = pos.z - cz;
    const d = Math.hypot(dx, dz) - half;
    if (d < bestDist) {
      // which face are we nearest?
      const px = Math.min(Math.abs(pos.x - s.minx), Math.abs(pos.x - s.maxx));
      const pz = Math.min(Math.abs(pos.z - s.minz), Math.abs(pos.z - s.maxz));
      let nx = 0, nz = 0;
      if (px < pz) nx = pos.x < (s.minx + s.maxx) / 2 ? -1 : 1;
      else         nz = pos.z < (s.minz + s.maxz) / 2 ? -1 : 1;
      best = { nx, nz, solid: s, dist: d };
      bestDist = d;
    }
  }
  return best;
}
