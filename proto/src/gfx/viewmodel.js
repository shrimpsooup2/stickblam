// The first-person weapon: a ballpoint pen, held in a stickman hand.
//
// Drawn with the same anchor-and-scrawl approach as the characters and
// regenerated on the boil tick, so the gun in your hands wobbles exactly like
// everything else in the world. Two cells: hip and scoped.

const CELL = 256;

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

function stroke(ctx, pts, r, width) {
  ctx.lineWidth = width * (0.8 + r() * 0.45);
  ctx.beginPath();
  let first = true;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len, py = dx / len;
    const bow = (r() - 0.5) * len * 0.10;
    const segs = Math.max(3, Math.round(len / 10));
    for (let s2 = 0; s2 <= segs; s2++) {
      const t = s2 / segs;
      const off = Math.sin(Math.PI * t) * bow + (r() - 0.5) * width * 0.4;
      const x = a.x + dx * t + px * off, y = a.y + dy * t + py * off;
      if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

const P = (x, y) => ({ x, y });

/** Hip: the pen held low and angled across, the way you carry a thing you are about to use. */
function drawHip(ctx, r) {
  const lw = 4.0;
  // Two lines down the barrel rather than one fat one -- a pen read as an
  // outline, not a silhouette. A single heavy stroke just makes a black blob.
  stroke(ctx, [P(206, 250), P(150, 146), P(118, 80)], r, lw);
  stroke(ctx, [P(224, 244), P(168, 140), P(133, 74)], r, lw);
  stroke(ctx, [P(118, 80), P(126, 74)], r, lw * 0.8);   // barrel end
  stroke(ctx, [P(126, 74), P(120, 44)], r, lw * 0.7);   // taper
  stroke(ctx, [P(133, 74), P(120, 44)], r, lw * 0.7);
  stroke(ctx, [P(120, 44), P(116, 28)], r, lw * 0.55);  // the nib
  stroke(ctx, [P(178, 168), P(196, 154)], r, lw * 0.7); // clip
  // hand: an open outline with a couple of fingers over the barrel
  ctx.lineWidth = lw;
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const a = i / 20 * 5.4 + 0.9;
    const rr = 26 * (1 + (r() - 0.5) * 0.18);
    const x = 196 + Math.cos(a) * rr * 1.1, y = 204 + Math.sin(a) * rr * 0.95;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  stroke(ctx, [P(180, 186), P(163, 180)], r, lw * 0.65);
  stroke(ctx, [P(186, 200), P(168, 195)], r, lw * 0.65);
}

/** Scoped: the pen brought up to the eye, foreshortened almost to a point. */
function drawScoped(ctx, r) {
  const lw = 4.0;
  // Foreshortened hard: you are looking almost straight down the barrel.
  stroke(ctx, [P(114, 256), P(118, 168), P(122, 124)], r, lw);
  stroke(ctx, [P(146, 256), P(142, 168), P(138, 124)], r, lw);
  stroke(ctx, [P(122, 124), P(138, 124)], r, lw * 0.8);
  stroke(ctx, [P(124, 124), P(128, 96)], r, lw * 0.65);
  stroke(ctx, [P(136, 124), P(132, 96)], r, lw * 0.65);
  stroke(ctx, [P(128, 96), P(130, 82)], r, lw * 0.5);   // nib, dead centre
  // sighting scratches either side
  stroke(ctx, [P(102, 150), P(112, 138)], r, lw * 0.5);
  stroke(ctx, [P(158, 150), P(148, 138)], r, lw * 0.5);
  ctx.lineWidth = lw;
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const a = i / 20 * 5.4 + 1.1;
    const rr = 26 * (1 + (r() - 0.5) * 0.16);
    const x = 130 + Math.cos(a) * rr * 1.2, y = 224 + Math.sin(a) * rr * 0.85;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

export function makeViewmodel() {
  const canvas = document.createElement('canvas');
  canvas.width = CELL * 2;
  canvas.height = CELL;
  const ctx = canvas.getContext('2d');

  function redraw(tick) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#fff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [i, fn] of [[0, drawHip], [1, drawScoped]]) {
      ctx.save();
      ctx.translate(i * CELL, 0);
      ctx.beginPath(); ctx.rect(0, 0, CELL, CELL); ctx.clip();
      fn(ctx, rng(tick * 2654435761 + i * 7919 + 13));
      ctx.restore();
    }
  }
  redraw(0);
  return { canvas, redraw, CELL };
}
