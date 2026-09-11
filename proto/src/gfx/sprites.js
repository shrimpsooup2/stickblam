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

export const POSES = ['idle', 'run0', 'run1', 'run2', 'jump', 'fall', 'crumple', 'edge', 'glide', 'recover'];
export const VARIANTS = 3;          // three different drawings co-exist, so two
                                    // stickmen side by side are never identical
export const BOIL_FPS = 8;
export const COLS = 6, CELL_W = 152, CELL_H = 192;
export const SHEET_W = COLS * CELL_W;
export const SHEET_ROWS = Math.ceil((10 * 3) / COLS);   // POSES.length * VARIANTS
export const SHEET_H = SHEET_ROWS * CELL_H;

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

/**
 * A head. Big, lumpy, wider than tall, never quite closed.
 *
 * Built from three low-frequency harmonics rather than per-point noise: noise on
 * a circle still reads as a circle, where a few slow lumps give you an actual
 * potato. This is where most of the character lives -- the head is a quarter of
 * the figure's height, so its shape IS the silhouette.
 */
function penBlob(ctx, c, r, width) {
  ctx.lineWidth = width * (0.85 + r() * 0.4);
  ctx.beginPath();
  const start = r() * 6.28;
  const gap = 0.05 + r() * 0.20;           // left slightly open, by a hand that moved on
  const a1 = 0.07 + r() * 0.10, p1 = r() * 6.28;
  const a2 = 0.05 + r() * 0.09, p2 = r() * 6.28;
  const a3 = 0.02 + r() * 0.05, p3 = r() * 6.28;
  const steps = 30;
  for (let i = 0; i <= steps; i++) {
    const a = start + (i / steps) * (Math.PI * 2 - gap);
    const lump = 1 + a1 * Math.sin(a + p1) + a2 * Math.sin(2 * a + p2) + a3 * Math.sin(3 * a + p3);
    const x = c.x + Math.cos(a) * c.rx * lump;
    const y = c.y + Math.sin(a) * c.ry * lump;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

const P = (x, y) => ({ x, y });

/**
 * Joint angles per pose, plus a warp of the entire figure.
 *
 * The warp is the point: the reference sheet is one construction stretched and
 * squashed into each pose rather than redrawn per pose. Gliding is the same
 * stickman pulled flat and wide; the ball is the same stickman crushed down.
 */
function poseAngles(name, r) {
  const s = (a, b) => a + (r() - 0.5) * b;
  const base = { sx: 1, sy: 1, headMul: 1, bend: 0.22, anchor: 1 };
  switch (name) {
    case 'run0':    return { ...base, sx: 1.08, sy: .98, lean: s(.16,.06), armL: s(-1.05,.22), armR: s(.95,.22), legL: s(.62,.16), legR: s(-.5,.16) };
    case 'run1':    return { ...base, sx: 1.04, sy: 1.0, lean: s(.20,.06), armL: s(-.3,.22),   armR: s(.3,.22),  legL: s(.08,.12), legR: s(-.14,.12) };
    case 'run2':    return { ...base, sx: 1.08, sy: .98, lean: s(.16,.06), armL: s(.95,.22),   armR: s(-1.05,.22),legL: s(-.5,.16),legR: s(.62,.16) };
    case 'jump':    return { ...base, sx: .90, sy: 1.12, lean: s(-.10,.06),armL: s(-1.42,.18), armR: s(1.34,.18), legL: s(.42,.14), legR: s(-.28,.14) };
    case 'fall':    return { ...base, sx: .96, sy: 1.06, lean: s(.05,.08), armL: s(-1.52,.16), armR: s(1.46,.16), legL: s(.26,.2),  legR: s(-.34,.2) };
    // crushed down and spread wide
    case 'crumple': return { ...base, sx: 1.30, sy: .52, headMul: 1.12, bend: .5,
                             lean: s(1.15,.12), armL: s(-.7,.3), armR: s(.7,.3), legL: s(-1.15,.3), legR: s(1.15,.3) };
    // pulled flat and wide, like a dropped sheet
    // mid-air, so it hangs in the middle of the cell rather than standing on it
    case 'glide':   return { ...base, sx: 1.48, sy: .60, bend: .12, anchor: .45,
                             lean: s(1.38,.08), armL: s(-1.75,.15), armR: s(1.35,.15), legL: s(-1.5,.12), legR: s(1.5,.12) };
    // face down on the page, pushing up
    case 'recover': return { ...base, sx: 1.52, sy: .44, headMul: 1.05, bend: .45,
                             lean: s(1.5,.06), armL: s(-1.2,.2), armR: s(1.2,.2), legL: s(-1.55,.1), legR: s(1.55,.1) };
    case 'edge':    return { ...base, thin: true, lean: s(.04,.04), armL: s(-.2,.1), armR: s(.2,.1), legL: s(.1,.08), legR: s(-.1,.08) };
    default:        return { ...base, lean: s(.04,.07), armL: s(-.34,.2), armR: s(.36,.2), legL: s(.16,.14), legR: s(-.18,.14) };
  }
}

/**
 * Build the anchor points for a pose.
 *
 * Proportions come straight off docs/reference/stickman-proportions.png:
 * head about 27% of total height and WIDER than tall, no neck and no shoulder
 * line -- arms, spine and head all meet at one node directly under the skull --
 * and limbs that are single long strokes with a gentle bow rather than two bones
 * around a hard joint.
 *
 * Lengths are defined in unwarped "figure space" and the pose warp (sx, sy) is
 * applied exactly once, at placement. Baking the warp into the lengths as well
 * squares it, which stretched jump 25% too tall and crushed glide to a third of
 * its size.
 *
 * The finished skeleton is then fitted and centred in the cell, so a pose can be
 * warped as far as it likes without sliding off the edge.
 */
function skeleton(name, r) {
  const a = poseAngles(name, r);
  const W = CELL_W, H = CELL_H;
  const figH = H * 0.90;
  const sx = a.sx, sy = a.sy;

  // base dimensions -- proportions drift between frames, and that is the point
  const headR = figH * 0.135 * a.headMul * (0.88 + r() * 0.26);
  const spine = figH * 0.45 * (0.93 + r() * 0.14);
  const leg   = figH * 0.31 * (0.92 + r() * 0.16);
  const arm   = figH * 0.47 * (0.90 + r() * 0.18);

  const headRy = headR * sy;
  const headRx = headR * (1.15 + r() * 0.22) * sx;   // wider than tall, always

  const hip = P(0, 0);
  // The node: where arms, spine and head all meet. There is no neck.
  const node = P(hip.x + Math.sin(a.lean) * spine * sx,
                 hip.y - Math.cos(a.lean) * spine * sy);
  const head = {
    x: node.x + Math.sin(a.lean) * headR * 0.85 * sx,
    y: node.y - Math.cos(a.lean) * headR * 0.85 * sy,
    rx: headRx, ry: headRy,
  };

  // Arms hang clear of the skull. Their bow is perpendicular to the stroke, so a
  // near-horizontal arm starting at the node would arc up through the head.
  const armY = node.y + headRy * 0.30;

  // One stroke per limb, with a slight kink partway rather than a real joint.
  const limb = (ox, oy, ang, len, bend) => {
    const mid = P(ox + Math.sin(ang) * len * 0.58 * sx,
                  oy + Math.cos(ang) * len * 0.58 * sy);
    const a2 = ang + bend * (0.5 + r() * 0.8);
    const end = P(mid.x + Math.sin(a2) * len * 0.44 * sx,
                  mid.y + Math.cos(a2) * len * 0.44 * sy);
    return [mid, end];
  };

  const [elbowL, handL] = limb(node.x, armY, a.armL, arm, -a.bend);
  const [elbowR, handR] = limb(node.x, armY, a.armR, arm, a.bend);
  const [kneeL, footL]  = limb(hip.x, hip.y, a.legL, leg, a.bend * 0.6);
  const [kneeR, footR]  = limb(hip.x, hip.y, a.legR, leg, -a.bend * 0.6);

  const strokes = [
    [node, hip],                        // the spine
    [handL, elbowL, P(node.x, armY)],   // arms run all the way in to the node
    [P(node.x, armY), elbowR, handR],
    [hip, kneeL, footL],
    [hip, kneeR, footR],
  ];

  // --- fit and centre in the cell ---
  let minx = head.x - head.rx, maxx = head.x + head.rx;
  let miny = head.y - head.ry, maxy = head.y + head.ry;
  for (const st of strokes) for (const pt of st) {
    if (pt.x < minx) minx = pt.x; if (pt.x > maxx) maxx = pt.x;
    if (pt.y < miny) miny = pt.y; if (pt.y > maxy) maxy = pt.y;
  }
  const pad = W * 0.06;
  const k = Math.min(1, (W - pad * 2) / Math.max(maxx - minx, 1e-3),
                        (H - pad * 2) / Math.max(maxy - miny, 1e-3));
  const ox = W * 0.5 - ((minx + maxx) * 0.5) * k;
  // anchor 1 stands the figure on the cell floor; lower values hang it higher up,
  // which is what an airborne pose needs -- the quad is anchored at the feet.
  const figH2 = (maxy - miny) * k;
  const floorY = H * 0.94;                       // where feet rest
  const bottomY = floorY - (floorY - figH2) * (1 - a.anchor);
  const oy = bottomY - maxy * k;
  const map = (pt) => P(pt.x * k + ox, pt.y * k + oy);

  return {
    head: { x: head.x * k + ox, y: head.y * k + oy, rx: head.rx * k, ry: head.ry * k },
    strokes: strokes.map((st) => st.map(map)),
    squash: a.thin ? 0.16 : 1.0,
    scale: k,
  };
}

/** Guides for the hand-drawing template: where the feet, head and node must land. */
export function poseGuide(name, seed) {
  const sk = skeleton(name, rng(seed >>> 0 || 1));
  const node = sk.strokes[0][0];
  let miny = sk.head.y - sk.head.ry, maxy = sk.head.y + sk.head.ry;
  let minx = sk.head.x - sk.head.rx, maxx = sk.head.x + sk.head.rx;
  for (const st of sk.strokes) for (const pt of st) {
    if (pt.x < minx) minx = pt.x; if (pt.x > maxx) maxx = pt.x;
    if (pt.y < miny) miny = pt.y; if (pt.y > maxy) maxy = pt.y;
  }
  return { head: sk.head, node, bbox: { minx, miny, maxx, maxy }, strokes: sk.strokes };
}

function drawStickman(ctx, name, seed) {
  const r = rng(seed);
  ctx.save();
  ctx.strokeStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const sk = skeleton(name, r);
  // Thin lines against a big head -- that contrast is most of the look.
  const lw = CELL_W * 0.026 * (0.9 + r() * 0.26) * (0.75 + sk.scale * 0.25);

  if (sk.squash !== 1.0) {          // edge-on: the same skeleton, seen side-on
    ctx.translate(CELL_W * 0.5, 0);
    ctx.scale(sk.squash, 1);
    ctx.translate(-CELL_W * 0.5, 0);
  }

  penBlob(ctx, sk.head, r, lw);
  for (const s of sk.strokes) penStroke(ctx, s, r, lw);

  // a face, drawn with no care at all, and not always
  if (r() > 0.35) {
    const h = sk.head;
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    ctx.moveTo(h.x - h.rx * 0.34, h.y - h.ry * 0.16);
    ctx.lineTo(h.x - h.rx * 0.22, h.y - h.ry * 0.02);
    ctx.moveTo(h.x + h.rx * 0.22, h.y - h.ry * 0.16);
    ctx.lineTo(h.x + h.rx * 0.34, h.y - h.ry * 0.02);
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

  if (state.stance === 4) return { pose: 'recover', variant };   // STANCE.RECOVER
  if (state.stance === 3) return { pose: 'glide', variant };     // STANCE.GLIDE
  if (state.crumpled)     return { pose: 'crumple', variant };
  if (state.thin > 0.55)  return { pose: 'edge', variant };
  if (!state.grounded)    return { pose: state.vy > 0.5 ? 'jump' : 'fall', variant };
  if (state.speed > 0.6) {
    const cycle = ['run0', 'run1', 'run2', 'run1'];
    return { pose: cycle[Math.floor(time * (5 + state.speed * 0.85)) % cycle.length], variant };
  }
  return { pose: 'idle', variant };
}
