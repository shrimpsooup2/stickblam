import { makeWorld, addBox } from '../sim/world.js';
import { T } from '../sim/constants.js';

// Vocabulary for blocking out maps. Everything is axis-aligned boxes, because
// that is what the collision solver handles -- there is no ramp support yet, so
// height changes are stairs, terraces and drops rather than slopes. See
// docs/MAPS.md for what that costs us.

export const TONE = { floor: 0.80, block: 0.66, wall: 0.60, dark: 0.48, light: 0.74, accent: 0.42 };
export const STYLE = { plain: 0, ruled: 1, grid: 2 };

// Numbers the maps are designed against, pulled from the movement constants so
// a tuning change shows up in the geometry review rather than silently breaking it.
export const M = {
  apex: (T.jumpVel * T.jumpVel) / (2 * T.gravity),   // 1.26m
  step: T.stepHeight,                                 // 0.38m -- free to walk up
  crouchFit: T.height * T.crumpleHeightMult + 0.08,   // 0.83m -- crumple-only gaps
  standFit: T.height + 0.12,                          // 1.90m -- normal doorway
  glideFloor: T.glideMinClearance,                    // 2.60m -- below this, no glide
  eye: T.eyeHeight,                                   // 1.62m -- cover at 1.2 lets you shoot over
  run: T.maxSpeed,                                    // 7.6 m/s -- 1 second is 7.6m
};

export function createBuilder(name) {
  const world = makeWorld();
  const boxes = [], labels = [], markers = [], dummies = [];

  const api = {
    world, boxes, labels, markers, dummies, name,

    /** A solid box from centre + size. */
    box(cx, cy, cz, sx, sy, sz, tone = TONE.block, style = STYLE.plain, tag = '') {
      addBox(world, cx, cy, cz, sx, sy, sz, tag);
      boxes.push([cx, cy, cz, sx, sy, sz, tone, style]);
      return api;
    },

    /** Ground plane, centred on (cx,cz). */
    ground(cx, cz, sx, sz, tone = TONE.floor) {
      return api.box(cx, -1, cz, sx, 2, sz, tone, STYLE.ruled, 'floor');
    },

    /** A flat platform you stand on top of; y is the WALK SURFACE. */
    plat(cx, y, cz, sx, sz, tone = TONE.light) {
      return api.box(cx, y - 0.15, cz, sx, 0.3, sz, tone, STYLE.plain);
    },

    /** A solid building. y is the roof height. */
    building(cx, cz, sx, sz, h, tone = TONE.block) {
      return api.box(cx, h / 2, cz, sx, h, sz, tone, STYLE.grid, 'building');
    },

    /** A wall segment. h defaults to chest-high cover you can shoot over. */
    wall(cx, cz, sx, sz, h = 1.2, tone = TONE.wall) {
      return api.box(cx, h / 2, cz, sx, h, sz, tone, STYLE.grid);
    },

    /** A stair run. dir is 'x' or 'z'; sign gives direction. */
    stairs(x, y, z, dir, steps, rise, run, width, tone = TONE.light) {
      const s = Math.sign(run) || 1;
      for (let i = 0; i < steps; i++) {
        const h = y + (i + 1) * rise;
        const off = (i + 0.5) * Math.abs(run) * s;
        if (dir === 'x') api.box(x + off, h / 2, z, Math.abs(run), h, width, tone);
        else             api.box(x, h / 2, z + off, width, h, Math.abs(run), tone);
      }
      return api;
    },

    /**
     * A covered passage. `clear` is the headroom underneath: pass M.crouchFit for
     * a crumple-only tunnel, M.standFit for a normal underpass.
     */
    tunnel(cx, cz, sx, sz, clear, thickness = 2.4, tone = TONE.dark) {
      return api.box(cx, clear + thickness / 2, cz, sx, thickness, sz, tone, STYLE.plain, 'roof');
    },

    /** A helical stair around a column. */
    helix(cx, cz, radius, turns, topY, stepCount, width = 2.0, tone = TONE.light) {
      for (let i = 0; i < stepCount; i++) {
        const t = i / stepCount;
        const a = t * turns * Math.PI * 2;
        const h = (i + 1) * (topY / stepCount);
        api.box(cx + Math.sin(a) * radius, h / 2, cz + Math.cos(a) * radius,
                width, h, width, tone, STYLE.plain);
      }
      return api;
    },

    spawn(team, x, y, z, yaw = 0) {
      markers.push({ kind: 'spawn', team, x, y, z, yaw });
      if (team === 0) { world.spawn = { x, y, z }; world.spawnYaw = yaw; }
      return api;
    },
    mural(team, x, y, z)   { markers.push({ kind: 'mural', team, x, y, z }); return api; },
    inkwell(x, y, z)       { markers.push({ kind: 'inkwell', x, y, z }); return api; },
    card(x, y, z)          { markers.push({ kind: 'card', x, y, z }); return api; },
    dummy(x, y, z, pose = 'idle', seed = 1) { dummies.push({ x, y, z, pose, seed }); return api; },

    label(x, y, z, text, kind = '') { labels.push({ x, y, z, text, kind }); return api; },

    /** Mirror everything built so far across an axis, for symmetric maps. */
    mirrorZ() {
      const n = boxes.length;
      for (let i = 0; i < n; i++) {
        const b = boxes[i];
        if (b[8] === 'nomirror') continue;
        api.box(b[0], b[1], -b[2], b[3], b[4], b[5], b[6], b[7]);
      }
      const mk = markers.slice();
      for (const m of mk) {
        if (m.kind === 'spawn' || m.kind === 'mural')
          markers.push({ ...m, team: 1 - m.team, z: -m.z, yaw: (m.yaw || 0) + Math.PI });
        else markers.push({ ...m, z: -m.z });
      }
      const lb = labels.slice();
      for (const l of lb) labels.push({ ...l, z: -l.z });
      return api;
    },
  };
  return api;
}

/** Turn marker data into visible blockout furniture. */
export function drawMarkers(b) {
  for (const m of b.markers) {
    if (m.kind === 'mural') {
      b.box(m.x, m.y + 3, m.z, 14, 6, 0.6, TONE.accent, STYLE.grid, 'mural');
      b.label(m.x, m.y + 7, m.z, 'MURAL ' + (m.team === 0 ? 'A' : 'B'), 'station');
    } else if (m.kind === 'inkwell') {
      b.box(m.x, m.y + 0.4, m.z, 2.2, 0.8, 2.2, TONE.accent, STYLE.plain);
      b.label(m.x, m.y + 1.6, m.z, 'inkwell', 'note');
    } else if (m.kind === 'card') {
      b.box(m.x, m.y + 0.9, m.z, 0.9, 0.06, 0.7, TONE.accent, STYLE.plain);
      b.box(m.x, m.y + 0.45, m.z, 0.12, 0.9, 0.12, TONE.dark, STYLE.plain);
      b.label(m.x, m.y + 1.5, m.z, 'card', 'note');
    } else if (m.kind === 'spawn') {
      b.label(m.x, m.y + 2.6, m.z, 'SPAWN ' + (m.team === 0 ? 'A' : 'B'), 'home');
    }
  }
}
