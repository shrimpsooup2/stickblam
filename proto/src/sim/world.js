import { box } from './aabb.js';

export function makeWorld() {
  return { solids: [], props: [], spawn: { x: 0, y: 0.2, z: 0 }, spawnYaw: 0 };
}

/** Add a solid from centre + size, which is how level data is easier to write. */
export function addBox(world, cx, cy, cz, sx, sy, sz, tag = '') {
  const b = box(cx - sx / 2, cy - sy / 2, cz - sz / 2,
                cx + sx / 2, cy + sy / 2, cz + sz / 2, tag);
  world.solids.push(b);
  return b;
}

/**
 * Ray vs the static world (slab method). Returns {t, box, nx, ny, nz} or null.
 * Used by the debug trace to show what a shot would actually hit.
 */
export function raycast(world, ox, oy, oz, dx, dy, dz, maxT = 200) {
  let best = null;
  for (const s of world.solids) {
    let tmin = 0, tmax = maxT, hitAxis = -1, hitSign = 1;
    const o = [ox, oy, oz], d = [dx, dy, dz];
    const lo = [s.minx, s.miny, s.minz], hi = [s.maxx, s.maxy, s.maxz];
    let ok = true;
    for (let a = 0; a < 3; a++) {
      if (Math.abs(d[a]) < 1e-9) {
        if (o[a] < lo[a] || o[a] > hi[a]) { ok = false; break; }
        continue;
      }
      const inv = 1 / d[a];
      let t1 = (lo[a] - o[a]) * inv, t2 = (hi[a] - o[a]) * inv, sign = -1;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; sign = 1; }
      if (t1 > tmin) { tmin = t1; hitAxis = a; hitSign = sign; }
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) { ok = false; break; }
    }
    if (!ok || tmin <= 0 || (best && tmin >= best.t)) continue;
    best = {
      t: tmin, box: s,
      nx: hitAxis === 0 ? hitSign : 0,
      ny: hitAxis === 1 ? hitSign : 0,
      nz: hitAxis === 2 ? hitSign : 0,
    };
  }
  return best;
}
