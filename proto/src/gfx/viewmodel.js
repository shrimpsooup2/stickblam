// The first-person weapons.
//
// Every weapon in Stickblam is an implement, and the roster in docs/DESIGN.md is
// built around what each one is LIKE to hold: a biro is a precise little stick,
// a marker is a fat wedge, a spraycan is a can you hold in your fist and press
// down on. So the models are defined by those few facts -- barrel width, how far
// it sticks out, what is on the end -- and one painter draws all of them. That
// keeps eight weapons honest with each other, and adding a ninth is a data row.
//
// Everything is drawn on a SCRAP: a piece of paper torn out and cut round with
// no patience. Flat things in this world are always on paper (see paper.js), and
// the weapon in your hands is the flattest thing you own.
//
// Two sheets come out of here, not one. The INK sheet carries the linework; the
// MASK sheet carries the scrap's silhouette. They have to be separate textures
// because a single RGBA sheet cannot be filtered without the transparent
// surround bleeding into the paper colour at every torn edge.

import { tornShape, tornPath, fillScrap, strokeScrap, bounds } from './paper.js';

const CELL = 256;
export const VM_COLS = 4, VM_ROWS = 4;

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

const P = (x, y) => ({ x, y });

/**
 * Eight implements, described by how they sit in a hand.
 *
 * `w` is barrel width in cell pixels, `len` how far it reaches as a fraction of
 * the full reach, `tip` what is on the business end, `deco` the details that
 * make it that implement and not a generic tube.
 */
export const WEAPONS = [
  { id: 'biro', name: 'Biro', w: 17, len: 1.00, lean: 0.44, tip: 'cone', deco: ['clip', 'rings'],
    role: 'Semi-auto pistol. The all-rounder you spawn with.',
    slots: ['MUZZLE', 'BODY', 'SIGHT'], quirk: 'Takes everything.' },
  { id: 'fineliner', name: 'Fineliner', w: 12, len: 1.18, lean: 0.40, tip: 'needle', deco: ['sight', 'knurl'],
    role: 'Precision rifle. Draws one long exact line.',
    slots: ['MUZZLE', 'SIGHT', 'GRIP'], quirk: 'Bans SPRAY and CHAOS — a shaky hand ruins a fine line.' },
  { id: 'brush', name: 'Brush', w: 25, len: 0.86, lean: 0.48, tip: 'bristles', deco: ['ferrule'],
    role: 'SMG. Fast, sloppy, wide.',
    slots: ['MUZZLE', 'GRIP', 'RESERVOIR'], quirk: 'Bans PRECISION. Cannot mount a scope.' },
  { id: 'marker', name: 'Marker', w: 36, len: 0.86, lean: 0.46, tip: 'chisel', deco: ['band', 'cap'],
    role: 'Shotgun. Bold, short, wide strokes.',
    slots: ['MUZZLE', 'BODY', 'GRIP'], quirk: 'Ink bleeds into adjacent slots whether you wanted it to or not.' },
  { id: 'spraycan', name: 'Spraycan', w: 64, len: 0.72, lean: 0.16, body: 'can', tip: 'nozzle', deco: ['rim', 'label'],
    role: 'Launcher. Arcing blobs, area denial.',
    slots: ['MUZZLE', 'BODY', 'RESERVOIR'], quirk: 'Nothing about this is precise and nothing about it penetrates.' },
  { id: 'eraser', name: 'Eraser', w: 58, len: 0.50, lean: 0.26, body: 'block', tip: 'worn', deco: ['crumbs', 'bevel'],
    role: 'Short-range cone. Low lethality; strips enemy parts.',
    slots: ['BODY', 'GRIP', 'RESERVOIR'], quirk: 'It does not shoot. It un-draws.' },
  { id: 'stapler', name: 'Stapler', w: 42, len: 0.82, lean: 0.52, body: 'jawed', tip: 'jaw', deco: ['hinge', 'mag'],
    role: 'Nailgun. Fires map-found staples, not ink.',
    slots: ['BODY', 'MAGAZINE', 'GRIP'], quirk: 'Sits entirely outside the ink economy.' },
  { id: 'highlighter', name: 'Highlighter', w: 33, len: 0.82, lean: 0.44, tip: 'wedge', deco: ['window', 'band'],
    role: 'Support beam. Marks enemies, boosts allied ink gain.',
    slots: ['MUZZLE', 'BODY', 'SIGHT'], quirk: 'Cannot kill. Can only bring an enemy to 1 HP.' },
];

// ---------------------------------------------------------------- drawing --

/** One pen stroke through the given points, bowed and overshooting a little. */
function line(out, pts, w, off = false) { out.push({ pts, w, off }); }

function paint(ctx, s, r) {
  const { pts, w } = s;
  ctx.lineWidth = w * (0.82 + r() * 0.4);
  ctx.beginPath();
  let first = true;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len, py = dx / len;
    const bow = (r() - 0.5) * len * 0.09;
    const segs = Math.max(3, Math.round(len / 11));
    const t0 = i === 0 ? -0.04 : 0;
    const t1 = i === pts.length - 2 ? 1.05 : 1;
    for (let k = 0; k <= segs; k++) {
      const t = t0 + (t1 - t0) * (k / segs);
      const off = Math.sin(Math.PI * Math.min(Math.max(t, 0), 1)) * bow + (r() - 0.5) * w * 0.45;
      const x = a.x + dx * t + px * off, y = a.y + dy * t + py * off;
      if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

/**
 * Build one weapon in one pose as a list of strokes.
 *
 * Hip carries the thing low and angled across you, the way you hold something
 * you are about to use. Scoped brings it up in front of your eye, where you see
 * it almost end-on -- so it gets shorter, not bigger.
 */
function build(wp, scoped, r) {
  const out = [];
  const lw = 4.2;
  // The axis the whole weapon is built on. `lean` is how far off vertical this
  // particular implement sits in the hand: a pen is carried across you, a
  // spraycan is held nearly upright because that is the only way a can works.
  const lean = scoped ? 0 : (wp.lean ?? 0.44);
  const G = scoped ? P(128, 258) : P(198, 248);
  const dir = P(-Math.sin(lean), -Math.cos(lean));
  // Reach is capped so the longest weapon's tip still lands inside its atlas
  // cell. It used to be set by eye and the Fineliner ran clean off the top.
  const reach = (scoped ? 126 : 148) * wp.len;
  const w = wp.w * (0.92 + r() * 0.16);
  const px = -dir.y, py = dir.x;                     // unit perpendicular

  const at = (t, off = 0) => P(G.x + dir.x * reach * t + px * off,
                               G.y + dir.y * reach * t + py * off);
  const M = at(1);

  // --- the body ---
  // Two lines with paper between them, never one fat one: a single heavy stroke
  // is a silhouette, not a drawing of an object. Beyond that the body shape is
  // per-implement, because a can, a rubber block and a stapler are not tubes
  // and drawing all three as tubes is why they used to be indistinguishable.
  switch (wp.body || 'tube') {
    case 'can':
      line(out, [at(0,  w / 2), at(0.86,  w / 2)], lw);
      line(out, [at(0, -w / 2), at(0.86, -w / 2)], lw);
      // a domed top, the way a can is pressed
      line(out, [at(0.86, w / 2), at(0.95, w * 0.34), at(1.0, 0),
                 at(0.95, -w * 0.34), at(0.86, -w / 2)], lw * 0.9);
      break;
    case 'block':
      // a rubber, worn round on the corner that does the work
      line(out, [at(0, w / 2), at(0.90, w / 2), at(1.0, w * 0.30),
                 at(1.0, -w * 0.34), at(0.92, -w / 2), at(0, -w / 2)], lw);
      break;
    case 'jawed':
      // two plates hinged at the back, open at the front
      line(out, [at(0.05, w * 0.14), at(0.20, w / 2), at(1.0, w * 0.40)], lw);
      line(out, [at(0.20, w * 0.16), at(1.0, w * 0.06)], lw * 0.8);
      line(out, [at(0.05, -w * 0.14), at(0.16, -w / 2), at(1.0, -w * 0.34)], lw);
      line(out, [at(1.0, -w * 0.34), at(1.0, -w * 0.02)], lw * 0.7);
      break;
    default:
      line(out, [at(0,  w / 2), at(1,  w / 2)], lw);
      line(out, [at(0, -w / 2), at(1, -w / 2)], lw);
  }
  if ((wp.body || 'tube') !== 'jawed')
    line(out, [at(-0.01, w / 2), at(-0.01, -w / 2)], lw * 0.8);   // the butt

  // --- the business end ---
  switch (wp.tip) {
    case 'cone':
      line(out, [at(1, w / 2), at(1.13, w * 0.16), at(1.20, 0)], lw * 0.8);
      line(out, [at(1, -w / 2), at(1.13, -w * 0.16), at(1.20, 0)], lw * 0.8);
      break;
    case 'needle':
      line(out, [at(1, w / 2), at(1.10, w * 0.20)], lw * 0.75);
      line(out, [at(1, -w / 2), at(1.10, -w * 0.20)], lw * 0.75);
      line(out, [at(1.10, w * 0.20), at(1.24, 0)], lw * 0.55);
      line(out, [at(1.10, -w * 0.20), at(1.24, 0)], lw * 0.55);
      break;
    case 'bristles': {
      // a splayed head: every hair its own stroke, none of them the same length
      const n = 7;
      for (let i = 0; i < n; i++) {
        const f = (i / (n - 1) - 0.5) * 2;
        const spread = w * 0.95 * f;
        const L = 0.30 + r() * 0.16 - Math.abs(f) * 0.08;
        line(out, [at(1.0, f * w * 0.30), at(1 + L * 0.6, spread * 0.7), at(1 + L, spread)], lw * 0.6);
      }
      break;
    }
    case 'chisel':
      // a flat cut across the end, so the tip has a direction of its own
      line(out, [at(1, w / 2), at(1.34, w * 0.30)], lw * 0.9);
      line(out, [at(1, -w / 2), at(1.12, -w * 0.54)], lw * 0.9);
      line(out, [at(1.34, w * 0.30), at(1.12, -w * 0.54)], lw);
      break;
    case 'wedge':
      line(out, [at(1, w / 2), at(1.24, w * 0.78)], lw * 0.85);
      line(out, [at(1, -w / 2), at(1.24, -w * 0.78)], lw * 0.85);
      line(out, [at(1.24, w * 0.78), at(1.24, -w * 0.78)], lw * 0.9);
      break;
    case 'nozzle':
      line(out, [at(1, w * 0.22), at(1.12, w * 0.22)], lw * 0.8);
      line(out, [at(1, -w * 0.22), at(1.12, -w * 0.22)], lw * 0.8);
      line(out, [at(1.12, w * 0.22), at(1.12, -w * 0.22)], lw * 0.8);
      for (let i = 0; i < 3; i++)                        // a hiss coming off it
        line(out, [at(1.20 + i * 0.05, (r() - 0.5) * w * 0.9),
                   at(1.30 + i * 0.06, (r() - 0.5) * w * 1.5)], lw * 0.42);
      break;
    case 'worn':
      // no tip at all: a block whose working corner has gone round
      line(out, [at(1, w / 2), at(1.05, w * 0.28), at(1.03, -w * 0.30), at(1, -w / 2)], lw * 0.9);
      break;
    case 'jaw':
      line(out, [at(1, w / 2), at(1.26, w * 0.66)], lw * 0.85);
      line(out, [at(1, -w / 2), at(1.20, -w * 0.30)], lw * 0.85);
      line(out, [at(1.26, w * 0.66), at(1.20, -w * 0.30)], lw * 0.7);
      break;
  }

  // --- what makes it this implement and not a tube ---
  for (const d of wp.deco) {
    switch (d) {
      case 'clip':
        line(out, [at(0.34, w * 0.62), at(0.58, w * 0.74), at(0.62, w * 0.40)], lw * 0.7);
        break;
      case 'rings':
        for (let i = 0; i < 3; i++)
          line(out, [at(0.13 + i * 0.055, w / 2), at(0.13 + i * 0.055, -w / 2)], lw * 0.55);
        break;
      case 'knurl':
        for (let i = 0; i < 5; i++)
          line(out, [at(0.10 + i * 0.035, w * 0.55), at(0.13 + i * 0.035, -w * 0.55)], lw * 0.42);
        break;
      case 'sight':
        line(out, [at(0.60, w * 0.5), at(0.60, w * 1.35), at(0.66, w * 1.35), at(0.66, w * 0.5)], lw * 0.7);
        line(out, [at(0.63, w * 1.35), at(0.63, w * 0.95)], lw * 0.5);   // the notch
        break;
      case 'ferrule':
        line(out, [at(0.74, w * 0.62), at(0.74, -w * 0.62)], lw * 0.7);
        line(out, [at(0.88, w * 0.58), at(0.88, -w * 0.58)], lw * 0.7);
        line(out, [at(0.74, w * 0.62), at(0.88, w * 0.58)], lw * 0.6);
        line(out, [at(0.74, -w * 0.62), at(0.88, -w * 0.58)], lw * 0.6);
        break;
      case 'band':
        line(out, [at(0.66, w / 2), at(0.66, -w / 2)], lw * 0.65);
        line(out, [at(0.72, w / 2), at(0.72, -w / 2)], lw * 0.65);
        break;
      case 'cap':
        line(out, [at(0.80, w * 0.54), at(0.80, -w * 0.54)], lw * 0.6);
        break;
      case 'rim':
        line(out, [at(0.92, w * 0.54), at(0.92, -w * 0.54)], lw * 0.7);
        line(out, [at(0.97, w * 0.42), at(0.97, -w * 0.42)], lw * 0.55);
        break;
      case 'label':
        line(out, [at(0.28, w * 0.34), at(0.62, w * 0.34)], lw * 0.5);
        line(out, [at(0.28, -w * 0.34), at(0.62, -w * 0.34)], lw * 0.5);
        line(out, [at(0.28, w * 0.34), at(0.28, -w * 0.34)], lw * 0.5);
        line(out, [at(0.62, w * 0.34), at(0.62, -w * 0.34)], lw * 0.5);
        break;
      case 'window':
        line(out, [at(0.34, w * 0.22), at(0.58, w * 0.22)], lw * 0.5);
        line(out, [at(0.34, -w * 0.22), at(0.58, -w * 0.22)], lw * 0.5);
        line(out, [at(0.34, w * 0.22), at(0.34, -w * 0.22)], lw * 0.5);
        line(out, [at(0.58, w * 0.22), at(0.58, -w * 0.22)], lw * 0.5);
        break;
      case 'hinge':
        line(out, [at(0.20, w * 0.62), at(0.30, w * 0.62), at(0.30, -w * 0.62), at(0.20, -w * 0.62)], lw * 0.6);
        break;
      case 'mag':
        line(out, [at(0.32, -w * 0.30), at(0.92, -w * 0.30)], lw * 0.5);
        break;
      case 'bevel':
        line(out, [at(0.10, w * 0.30), at(0.95, w * 0.30)], lw * 0.5);
        break;
      case 'crumbs':
        for (let i = 0; i < 4; i++)
          line(out, [at(1.12 + r() * 0.25, (r() - 0.5) * w * 2.0),
                     at(1.14 + r() * 0.25, (r() - 0.5) * w * 2.0)], lw * 0.4);
        break;
    }
  }

  // --- the hand: an open outline, never a filled mitt ---
  // It has to be big enough to read as a fist at viewmodel scale. At 27px it
  // was a scribble under the grip and the weapon looked like it was floating.
  // A closed lumpy outline for the fist, then SHORT ticks across the barrel for
  // the fingers. Long finger strokes ran parallel to the barrel and the whole
  // grip collapsed into a bundle of lines going the same way.
  const H = at(0.10, w * 0.06);
  const hr = 31;
  const hand = [];
  for (let i = 0; i <= 24; i++) {
    const a = i / 24 * 6.2832 + 0.4;
    const rr = hr * (1 + 0.13 * Math.sin(a * 2 + 1.1) + 0.08 * Math.sin(a * 3) + (r() - 0.5) * 0.12);
    hand.push(P(H.x + Math.cos(a) * rr * 1.06, H.y + Math.sin(a) * rr * 0.94));
  }
  hand.push(hand[0]);
  line(out, hand, lw);
  for (let i = 0; i < 3; i++) {            // knuckles, across the grip
    const t = 0.05 + i * 0.075;
    line(out, [at(t, w * 0.44), at(t - 0.012, w * 0.02)], lw * 0.55);
  }
  // a forearm running off the bottom of the cell, so the thing is HELD
  // `off: true` -- these leave the cell on purpose, and must not be counted
  // when the scrap is cut, or the scrap gets fitted to an arm that is mostly
  // outside the picture and ends up a narrow band across the middle.
  const F = P(H.x + (scoped ? 6 : 30), H.y + hr * 0.8);
  line(out, [P(F.x - 19, F.y), P(F.x - 11, CELL + 26)], lw * 0.95, true);
  line(out, [P(F.x + 19, F.y), P(F.x + 34, CELL + 26)], lw * 0.95, true);

  return out;
}

// ------------------------------------------------------------------ sheet --

export function makeViewmodel() {
  const canvas = document.createElement('canvas');       // ink
  const mask = document.createElement('canvas');         // scrap silhouette
  canvas.width = mask.width = CELL * VM_COLS;
  canvas.height = mask.height = CELL * VM_ROWS;
  const ctx = canvas.getContext('2d');
  const mtx = mask.getContext('2d');

  /** Atlas rect for weapon `i` in pose `scoped`. */
  function cell(i, scoped) {
    const idx = i * 2 + (scoped ? 1 : 0);
    return { x: (idx % VM_COLS) / VM_COLS, y: Math.floor(idx / VM_COLS) / VM_ROWS,
             w: 1 / VM_COLS, h: 1 / VM_ROWS };
  }

  function redraw(tick) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    mtx.clearRect(0, 0, mask.width, mask.height);
    ctx.strokeStyle = '#fff'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    mtx.fillStyle = '#fff';

    for (let i = 0; i < WEAPONS.length; i++) {
      for (let p = 0; p < 2; p++) {
        const idx = i * 2 + p;
        const ox = (idx % VM_COLS) * CELL, oy = Math.floor(idx / VM_COLS) * CELL;
        const r = rng(tick * 2654435761 + idx * 7919 + 13);
        const strokes = build(WEAPONS[i], p === 1, r);

        // The scrap is cut round the drawing, loosely, and clamped so it never
        // runs off its own cell -- a scrap that overflows bleeds into the
        // neighbouring weapon's atlas cell.
        // The scrap has to fit its own cell INCLUDING its spikes, or the tear is
        // squared off against the atlas boundary and the weapon ends up on a
        // piece of paper with one suspiciously straight edge. tornShape can push
        // a vertex out by about half again, so budget for that and then slide
        // the centre until it fits -- with the BOTTOM allowed to run off, since
        // that is where the arm leaves the picture anyway.
        const b = bounds(strokes.filter((st) => !st.off).map((st) => st.pts), 8);
        const spike = 1.5, m = 5;
        const rx = Math.min((b.maxx - b.minx) / 2 + 4, (CELL / 2 - m) / spike);
        const ry = Math.min((b.maxy - b.miny) / 2 + 4, (CELL / 2 - m) / spike);
        const cx = Math.min(CELL - m - rx * spike,
                            Math.max(m + rx * spike, (b.minx + b.maxx) / 2));
        const cy = Math.max(m + ry * spike, (b.miny + b.maxy) / 2);
        const path = tornPath(tornShape(cx, cy, rx, ry, r, 15), r);

        for (const t of [[mtx, 'm'], [ctx, 'c']]) {
          const g = t[0];
          g.save();
          g.translate(ox, oy);
          g.beginPath(); g.rect(0, 0, CELL, CELL); g.clip();
          if (t[1] === 'm') fillScrap(g, path);
          else {
            strokeScrap(g, path, 3.0, r);
            for (const s of strokes) paint(g, s, r);
          }
          g.restore();
        }
      }
    }
  }
  redraw(0);
  return { canvas, mask, redraw, cell, CELL, WEAPONS };
}
