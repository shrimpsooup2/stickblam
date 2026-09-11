// Procedurally drawn stickmen.
//
// The skeleton is a set of ANCHOR POINTS the pen must pass through. The strokes
// between them are regenerated from scratch every boil tick, so a pose stays
// on-model while the drawing of it is never the same twice. That is what makes
// "a hold is still redrawn" literally true -- a stickman standing still is being
// re-drawn 8 times a second, not shown the same picture repeatedly.
//
// All the wrongness rules from docs/VISUAL_DIRECTION.md live here rather than in a
// shader, because they have to be authored with habits, not applied as uniform
// runtime noise.

export const POSES = ['idle', 'run0', 'run1', 'run2', 'jump', 'fall', 'crumple', 'edge', 'flatten'];
export const VARIANTS = 3;          // three different drawings co-exist, so two
                                    // stickmen side by side are never identical
export const BOIL_FPS = 8;
const COLS = 6, CELL_W = 128, CELL_H = 192;

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

/**
 * One continuous pen stroke through every anchor in `pts`.
 *
 * The offset is forced to zero AT each anchor and bows freely between them, so
 * the line always crosses the points that define the pose but takes a different
 * route there every time it is drawn.
 */
function penStroke(ctx, pts, r, width, overshoot = true) {
  if (pts.length < 2) return;
  ctx.lineWidth = width * (0.8 + r() * 0.5);
  ctx.beginPath();

  let first = true;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len, py = dx / len;

    const bow = (r() - 0.5) * len * 0.16;      // how far this segment bends
    const segs = Math.max(3, Math.round(len / 9));

    // start a touch before the first anchor and run a touch past the last
    const t0 = (overshoot && i === 0) ? -0.05 : 0;
    const t1 = (overshoot && i === pts.length - 2) ? 1.06 : 1;

    for (let s = 0; s <= segs; s++) {
      const t = t0 + (t1 - t0) * (s / segs);
      // sin() pins the offset to zero at t=0 and t=1: the anchors are honoured
      const off = Math.sin(Math.PI * Math.min(Math.max(t, 0), 1)) * bow
                + (r() - 0.5) * width * 0.5;
      const x = a.x + dx * t + px * off;
      const y = a.y + dy * t + py * off;
      if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
}

/** A head. Never a real circle, never quite closed. */
function penBlob(ctx, c, r, width) {
  ctx.lineWidth = width * (0.85 + r() * 0.4);
  ctx.beginPath();
  const start = r() * 6.28;
  const gap = 0.10 + r() * 0.4;
  const squash = 0.9 + r() * 0.18;
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    const a = start + (i / steps) * (Math.PI * 2 - gap);
    const rr = c.r * (1 + (r() - 0.5) * 0.15);
    const x = c.x + Math.cos(a) * rr;
    const y = c.y + Math.sin(a) * rr * squash;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

const P = (x, y) => ({ x, y });

/** Joint angles per pose. 0 = straight down. Jitter keeps proportions drifting. */
function poseAngles(name, r) {
  const s = (a, b) => a + (r() - 0.5) * b;
  switch (name) {
    case 'run0':    return { lean: s(.18,.06), armL: s(-1.15,.25), armR: s(1.05,.25), legL: s(.72,.18), legR: s(-.58,.18), kneeBend: .55, elbowBend: .5 };
    case 'run1':    return { lean: s(.22,.06), armL: s(-.25,.25),  armR: s(.25,.25),  legL: s(.06,.12), legR: s(-.12,.12), kneeBend: .15, elbowBend: .3 };
    case 'run2':    return { lean: s(.18,.06), armL: s(1.05,.25),  armR: s(-1.15,.25),legL: s(-.58,.18),legR: s(.72,.18),  kneeBend: .55, elbowBend: .5 };
    case 'jump':    return { lean: s(-.12,.06),armL: s(-2.15,.25), armR: s(2.05,.25), legL: s(.48,.14), legR: s(-.32,.14), kneeBend: .85, elbowBend: .6 };
    case 'fall':    return { lean: s(.06,.08), armL: s(-2.6,.3),   armR: s(2.5,.3),   legL: s(.28,.22), legR: s(-.38,.22), kneeBend: .35, elbowBend: .7 };
    case 'crumple': return { lean: s(1.3,.09), armL: s(-.55,.25),  armR: s(.55,.25),  legL: s(-1.25,.25),legR: s(1.25,.25),kneeBend: 1.5, elbowBend: 1.2, ball: true };
    case 'flatten': return { lean: s(0,.03),   armL: s(-1.62,.1),  armR: s(1.62,.1),  legL: s(.12,.06), legR: s(-.12,.06), kneeBend: .05, elbowBend: .08 };
    case 'edge':    return { lean: s(.04,.04), armL: s(-.15,.08),  armR: s(.15,.08),  legL: s(.08,.06), legR: s(-.08,.06), kneeBend: .1, elbowBend: .12, thin: true };
    default:        return { lean: s(.04,.06), armL: s(-.3,.2),    armR: s(.32,.2),   legL: s(.14,.12), legR: s(-.16,.12), kneeBend: .12, elbowBend: .2 };
  }
}

/**
 * Build the anchor points for a pose. These are the things that must be true of
 * the drawing; everything else is up to the pen.
 */
function skeleton(name, r) {
  const a = poseAngles(name, r);
  const W = CELL_W, H = CELL_H;

  // Proportions drift between frames. Heads change size. Do not correct it.
  const scale = a.ball ? 0.6 : 1.0;
  const headR = W * 0.115 * (0.88 + r() * 0.26) * scale;
  const bodyLen = H * (a.ball ? 0.19 : 0.35) * scale * (0.94 + r() * 0.13);
  const legLen  = H * (a.ball ? 0.15 : 0.30) * scale * (0.94 + r() * 0.13);
  const armLen  = H * 0.26 * scale * (0.92 + r() * 0.17);

  const groundY = H * 0.94;
  const hip = P(W * 0.5 - a.lean * W * 0.15, groundY - legLen);
  const neck = P(hip.x + Math.sin(a.lean) * bodyLen, hip.y - Math.cos(a.lean) * bodyLen);
  const head = { x: neck.x + Math.sin(a.lean) * headR * 1.1,
                 y: neck.y - Math.cos(a.lean) * headR * 1.1, r: headR };

  const chain = (ox, oy, ang, len, bend) => {
    const mid = P(ox + Math.sin(ang) * len * 0.52, oy + Math.cos(ang) * len * 0.52);
    const a2 = ang + bend * (0.6 + r() * 0.6);
    const end = P(mid.x + Math.sin(a2) * len * 0.5, mid.y + Math.cos(a2) * len * 0.5);
    return [mid, end];
  };

  const shoulder = P(neck.x, neck.y + bodyLen * 0.13);
  const [elbowL, handL] = chain(shoulder.x, shoulder.y, a.armL, armLen, -a.elbowBend);
  const [elbowR, handR] = chain(shoulder.x, shoulder.y, a.armR, armLen, a.elbowBend);
  const [kneeL, footL]  = chain(hip.x, hip.y, a.legL, legLen, a.kneeBend * 0.5);
  const [kneeR, footR]  = chain(hip.x, hip.y, a.legR, legLen, -a.kneeBend * 0.5);

  return {
    head,
    strokes: [
      [neck, hip],                       // spine, one stroke
      [handL, elbowL, shoulder],         // arms are ONE pen movement through the
      [shoulder, elbowR, handR],         // elbow, not two separate bones
      [hip, kneeL, footL],
      [hip, kneeR, footR],
    ],
    squash: a.thin ? 0.16 : 1.0,
  };
}

function drawStickman(ctx, name, seed) {
  const r = rng(seed);
  ctx.save();
  ctx.strokeStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const sk = skeleton(name, r);
  const lw = CELL_W * 0.038 * (0.9 + r() * 0.24);

  if (sk.squash !== 1.0) {          // edge-on: the same skeleton, seen side-on
    ctx.translate(CELL_W * 0.5, 0);
    ctx.scale(sk.squash, 1);
    ctx.translate(-CELL_W * 0.5, 0);
  }

  penBlob(ctx, sk.head, r, lw);
  for (const s of sk.strokes) penStroke(ctx, s, r, lw);

  // a face, drawn with no care at all, and not always
  if (r() > 0.3) {
    const h = sk.head;
    ctx.lineWidth = lw * 0.55;
    ctx.beginPath();
    ctx.moveTo(h.x - h.r * 0.36, h.y - h.r * 0.14);
    ctx.lineTo(h.x - h.r * 0.26, h.y - h.r * 0.02);
    ctx.moveTo(h.x + h.r * 0.24, h.y - h.r * 0.14);
    ctx.lineTo(h.x + h.r * 0.34, h.y - h.r * 0.01);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The atlas. `redraw(tick)` regenerates every cell with fresh linework -- call it
 * at BOIL_FPS, not at frame rate.
 */
export function makeAtlas() {
  const rows = Math.ceil((POSES.length * VARIANTS) / COLS);
  const canvas = document.createElement('canvas');
  canvas.width = COLS * CELL_W;
  canvas.height = rows * CELL_H;
  const ctx = canvas.getContext('2d');

  const rects = {};
  let i = 0;
  const cells = [];
  for (const name of POSES) {
    rects[name] = [];
    for (let v = 0; v < VARIANTS; v++, i++) {
      const cx = (i % COLS) * CELL_W, cy = Math.floor(i / COLS) * CELL_H;
      cells.push({ name, v, cx, cy });
      rects[name].push({
        x: cx / canvas.width, y: cy / canvas.height,
        w: CELL_W / canvas.width, h: CELL_H / canvas.height,
      });
    }
  }

  function redraw(tick) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const c of cells) {
      ctx.save();
      ctx.translate(c.cx, c.cy);
      ctx.beginPath(); ctx.rect(0, 0, CELL_W, CELL_H); ctx.clip();
      // seed changes every boil tick -> genuinely new linework each time
      drawStickman(ctx, c.name, (tick * 2654435761 + c.v * 40503 + c.name.charCodeAt(0) * 7919) >>> 0);
      ctx.restore();
    }
  }
  redraw(0);
  return { canvas, rects, redraw };
}

/**
 * Choose the pose for a sim state. 8fps with IRREGULAR holds -- even spacing
 * reads as machine-made, uneven spacing reads as hand-made.
 */
const HOLD = [2, 5, 3, 2, 4, 3];
export function poseFor(state, t, id = 0) {
  const time = Math.max(0, t) || 0;              // never index a cycle with NaN or < 0
  const frame = Math.floor(time * BOIL_FPS);
  let acc = 0, idx = 0;
  for (let i = 0; i < 32; i++) { acc += HOLD[i % HOLD.length]; if (acc > frame % 19) { idx = i; break; } }
  const variant = ((id + idx) % VARIANTS + VARIANTS) % VARIANTS;

  if (state.stance === 3) return { pose: 'flatten', variant };
  if (state.crumpled)     return { pose: 'crumple', variant };
  if (state.thin > 0.55)  return { pose: 'edge', variant };
  if (!state.grounded)    return { pose: state.vy > 0.5 ? 'jump' : 'fall', variant };
  if (state.speed > 0.6) {
    const cycle = ['run0', 'run1', 'run2', 'run1'];
    return { pose: cycle[Math.floor(time * (5 + state.speed * 0.85)) % cycle.length], variant };
  }
  return { pose: 'idle', variant };
}
