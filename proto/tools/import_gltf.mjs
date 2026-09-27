// Turn a glTF mesh into the axis-aligned boxes the sim collides against.
//
//   node tools/import_gltf.mjs <dir-with-scene.gltf> <scale> <voxel> <out.js>
//
// The solver handles boxes and nothing else -- no meshes, no ramps -- so an
// imported model has to become boxes or it cannot be stood on. The route is:
// rasterise every triangle into a voxel grid, flood the outside so enclosed
// space counts as solid, fill the hollows a player could not stand up in, then
// greedily merge runs of voxels into as few boxes as possible.
//
// `scale` converts model units to metres. `voxel` is the collision grain, and
// it is the dial that matters: it trades fidelity against box count, and box
// count drives both the instance cap and how much linework the ink pass has to
// draw. Around 1m reads as brutalist massing and lands near the hand-laid maps;
// 0.4m quadruples the strokes for detail you cannot stand on anyway.
//
// What this CANNOT do is make a map. It gives you a massing; spawns, sightlines,
// cover and routes are still authored on top -- see levels/concrete.js.

import fs from 'fs';
import path from 'path';

const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array,
             5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

// ------------------------------------------------------------------ glTF ----

export function loadTriangles(dir) {
  const g = JSON.parse(fs.readFileSync(path.join(dir, 'scene.gltf'), 'utf8'));
  const bufs = g.buffers.map((b) => fs.readFileSync(path.join(dir, decodeURIComponent(b.uri))));

  const acc = (i) => {
    const a = g.accessors[i];
    const bv = g.bufferViews[a.bufferView];
    const TA = CT[a.componentType];
    const comp = NC[a.type];
    const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
    const raw = bufs[bv.buffer];
    // interleaved attributes are normal in glTF: honour byteStride
    const stride = bv.byteStride || comp * TA.BYTES_PER_ELEMENT;
    const out = new Float64Array(a.count * comp);
    for (let e = 0; e < a.count; e++) {
      const view = new TA(raw.buffer, raw.byteOffset + base + e * stride, comp);
      for (let c = 0; c < comp; c++) out[e * comp + c] = view[c];
    }
    return { data: out, comp, count: a.count };
  };

  const fromGltf = (m) => [[m[0], m[4], m[8], m[12]], [m[1], m[5], m[9], m[13]],
                           [m[2], m[6], m[10], m[14]], [m[3], m[7], m[11], m[15]]];
  const ident = () => [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
  const mul = (a, b) => a.map((row) =>
    [0,1,2,3].map((j) => row[0]*b[0][j] + row[1]*b[1][j] + row[2]*b[2][j] + row[3]*b[3][j]));
  const nodeMatrix = (n) => {
    if (n.matrix) return fromGltf(n.matrix);
    let m = ident();
    if (n.scale) m = mul([[n.scale[0],0,0,0],[0,n.scale[1],0,0],[0,0,n.scale[2],0],[0,0,0,1]], m);
    if (n.rotation) {
      const [x, y, z, w] = n.rotation;
      m = mul([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w), 0],
               [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w), 0],
               [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y), 0],
               [0, 0, 0, 1]], m);
    }
    if (n.translation)
      m = mul([[1,0,0,n.translation[0]], [0,1,0,n.translation[1]],
               [0,0,1,n.translation[2]], [0,0,0,1]], m);
    return m;
  };
  const xf = (M, x, y, z) => [M[0][0]*x + M[0][1]*y + M[0][2]*z + M[0][3],
                              M[1][0]*x + M[1][1]*y + M[1][2]*z + M[1][3],
                              M[2][0]*x + M[2][1]*y + M[2][2]*z + M[2][3]];

  const tris = [];
  const walk = (i, parent) => {
    const n = g.nodes[i];
    const M = mul(parent, nodeMatrix(n));
    if (n.mesh !== undefined) {
      for (const prim of g.meshes[n.mesh].primitives) {
        if (prim.mode !== undefined && prim.mode !== 4) continue;   // triangles only
        const P = acc(prim.attributes.POSITION);
        const I = prim.indices !== undefined ? acc(prim.indices).data
                : Float64Array.from({ length: P.count }, (_, k) => k);
        const pt = (k) => xf(M, P.data[k*3], P.data[k*3+1], P.data[k*3+2]);
        for (let t = 0; t + 2 < I.length; t += 3) tris.push([pt(I[t]), pt(I[t+1]), pt(I[t+2])]);
      }
    }
    for (const c of n.children || []) walk(c, M);
  };
  for (const r of g.scenes[g.scene].nodes) walk(r, ident());
  return tris;
}

// --------------------------------------------------------------- voxels -----

export function voxelize(tris, vox) {
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) for (const p of t) for (let i = 0; i < 3; i++) {
    if (p[i] < lo[i]) lo[i] = p[i];
    if (p[i] > hi[i]) hi[i] = p[i];
  }
  const pad = 1;
  const dim = [0,1,2].map((i) => Math.ceil((hi[i] - lo[i]) / vox) + pad * 2);
  const [NX, NY, NZ] = dim;
  const at = (x, y, z) => (z * NY + y) * NX + x;
  const grid = new Uint8Array(NX * NY * NZ);
  const ix = (p, i) => Math.floor((p - lo[i]) / vox) + pad;

  // Sample each triangle finely enough that no voxel along it is skipped.
  for (const [a, b, c] of tris) {
    const e1 = [b[0]-a[0], b[1]-a[1], b[2]-a[2]];
    const e2 = [c[0]-a[0], c[1]-a[1], c[2]-a[2]];
    const n = Math.max(1, Math.ceil(Math.max(Math.hypot(...e1), Math.hypot(...e2)) / (vox * 0.4)));
    for (let i = 0; i <= n; i++) for (let j = 0; i + j <= n; j++) {
      const u = i / n, v = j / n;
      const x = ix(a[0] + e1[0]*u + e2[0]*v, 0);
      const y = ix(a[1] + e1[1]*u + e2[1]*v, 1);
      const z = ix(a[2] + e1[2]*u + e2[2]*v, 2);
      if (x >= 0 && y >= 0 && z >= 0 && x < NX && y < NY && z < NZ) grid[at(x, y, z)] = 1;
    }
  }

  // Flood the outside; whatever the flood cannot reach is enclosed, so it is
  // solid. Without this a model built from thin plates comes back hollow and
  // you fall inside it through the first opening.
  const out = new Uint8Array(grid.length);
  const stack = [0];
  out[0] = 1;
  while (stack.length) {
    const i = stack.pop();
    const x = i % NX, y = ((i / NX) | 0) % NY, z = (i / (NX * NY)) | 0;
    for (const [dx, dy, dz] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) {
      const nx = x+dx, ny = y+dy, nz = z+dz;
      if (nx < 0 || ny < 0 || nz < 0 || nx >= NX || ny >= NY || nz >= NZ) continue;
      const k = at(nx, ny, nz);
      if (out[k] || grid[k]) continue;
      out[k] = 1; stack.push(k);
    }
  }
  const solid = new Uint8Array(grid.length);
  for (let i = 0; i < grid.length; i++) solid[i] = (grid[i] || !out[i]) ? 1 : 0;
  return { solid, dim, lo, pad, vox, at };
}

/**
 * A void you cannot stand up in is not a space, it is a hollow. Fill it.
 *
 * Filling every vertical gap SHORTER than a standing player closes the insides
 * of thin-walled blocks while leaving real passages -- an archway, the space
 * under a platform -- open.
 */
export function fillHollows(v, minPassageVox) {
  const [NX, NY, NZ] = v.dim;
  for (let z = 0; z < NZ; z++) for (let x = 0; x < NX; x++) {
    let top = -1, bot = -1;
    for (let y = 0; y < NY; y++) if (v.solid[v.at(x, y, z)]) { if (bot < 0) bot = y; top = y; }
    if (bot < 0) continue;
    let y = bot;
    while (y <= top) {
      if (v.solid[v.at(x, y, z)]) { y++; continue; }
      let e = y;
      while (e <= top && !v.solid[v.at(x, e, z)]) e++;
      if (e - y < minPassageVox) for (let k = y; k < e; k++) v.solid[v.at(x, k, z)] = 1;
      y = e;
    }
  }
  return v;
}

/**
 * Stand the model on the floor.
 *
 * A prop like this is a diorama: the blocks hang in space with nothing under
 * them, and dropped onto a ground plane the bulk of it becomes a concrete
 * ceiling floating six metres up with no supports. Extending every occupied
 * column down to y=0 turns that mass into buildings standing on the floor, and
 * the columns that were empty stay empty -- which is where the streets are.
 * It costs the archways, and it buys a map you can move through.
 */
export function standOnGround(v) {
  const [NX, NY, NZ] = v.dim;
  for (let z = 0; z < NZ; z++) for (let x = 0; x < NX; x++) {
    let bot = -1;
    for (let y = 0; y < NY; y++) if (v.solid[v.at(x, y, z)]) { bot = y; break; }
    for (let y = v.pad; y < bot; y++) v.solid[v.at(x, y, z)] = 1;
  }
  return v;
}

/** Greedy merge of solid voxels into as few boxes as possible. */
export function toBoxes(v) {
  const { solid, dim, lo, pad, vox, at } = v;
  const [NX, NY, NZ] = dim;
  const used = new Uint8Array(solid.length);
  const boxes = [];
  for (let z = 0; z < NZ; z++) for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
    const i = at(x, y, z);
    if (!solid[i] || used[i]) continue;
    let w = 1;
    while (x + w < NX && solid[at(x+w, y, z)] && !used[at(x+w, y, z)]) w++;
    let h = 1;
    grow: while (y + h < NY) {
      for (let k = 0; k < w; k++) { const j = at(x+k, y+h, z); if (!solid[j] || used[j]) break grow; }
      h++;
    }
    let d = 1;
    growz: while (z + d < NZ) {
      for (let b = 0; b < h; b++) for (let k = 0; k < w; k++) {
        const j = at(x+k, y+b, z+d);
        if (!solid[j] || used[j]) break growz;
      }
      d++;
    }
    for (let c = 0; c < d; c++) for (let b = 0; b < h; b++) for (let k = 0; k < w; k++)
      used[at(x+k, y+b, z+c)] = 1;
    boxes.push({ x: lo[0] + (x - pad) * vox, y: lo[1] + (y - pad) * vox,
                 z: lo[2] + (z - pad) * vox, sx: w * vox, sy: h * vox, sz: d * vox });
  }
  return boxes;
}

// ------------------------------------------------------------------ CLI -----

export function convert(dir, S, worldVox, standM = 2.2, ground = true) {
  const v = fillHollows(voxelize(loadTriangles(dir), worldVox / S),
                        Math.ceil(standM / worldVox));
  if (ground) standOnGround(v);
  let boxes = toBoxes(v);
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  for (const b of boxes) {
    lo[0] = Math.min(lo[0], b.x); hi[0] = Math.max(hi[0], b.x + b.sx);
    lo[1] = Math.min(lo[1], b.y); hi[1] = Math.max(hi[1], b.y + b.sy);
    lo[2] = Math.min(lo[2], b.z); hi[2] = Math.max(hi[2], b.z + b.sz);
  }
  // centre on the origin, lowest solid at y = 0, and snap to a half-voxel
  // lattice so neighbouring boxes share exact faces (the ink pass culls edges
  // by probing across them, and a hairline gap reads as a real edge).
  const cx = (lo[0] + hi[0]) / 2, cz = (lo[2] + hi[2]) / 2;
  const q = (n) => +(Math.round(n / (worldVox / 2)) * (worldVox / 2)).toFixed(3);
  const rows = boxes.map((b) => {
    const x = (b.x - cx) * S, y = (b.y - lo[1]) * S, z = (b.z - cz) * S;
    const sx = b.sx * S, sy = b.sy * S, sz = b.sz * S;
    return [q(x + sx/2), q(y + sy/2), q(z + sz/2), q(sx), q(sy), q(sz)];
  });
  return { rows, extent: [(hi[0]-lo[0])*S, (hi[1]-lo[1])*S, (hi[2]-lo[2])*S] };
}

const [dir, S, vox, out, flag] = process.argv.slice(2);
if (dir && out) {
  const { rows, extent } = convert(dir, +S, +vox, 2.2, flag !== 'float');
  const credit = fs.existsSync(path.join(dir, 'license.txt'))
    ? fs.readFileSync(path.join(dir, 'license.txt'), 'utf8')
        .split('\n').filter((l) => /title:|author:|license type:|source:/.test(l))
        .map((l) => '// ' + l.trim().replace(/\s+/g, ' ')).join('\n') + '\n//\n'
    : '';
  fs.writeFileSync(out,
`// GENERATED by tools/import_gltf.mjs -- do not edit by hand.
//
${credit}// Voxelised at ${vox}m, hollows filled, greedily merged. Centre + size, in metres.
export const SCALE = ${+S};
export const VOXEL = ${+vox};
export const EXTENT = [${extent.map((n) => +n.toFixed(1)).join(', ')}];
export const BOXES = [
${rows.map((r) => '[' + r.join(',') + ']').join(',\n')}
];
`);
  console.log(`${rows.length} boxes  ${extent.map((n) => n.toFixed(1)).join(' x ')} m  -> ${out}`);
}
