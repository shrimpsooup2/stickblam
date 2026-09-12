// A scrap of paper: torn out of a page, or cut round with no patience.
//
// Design rule from docs/VISUAL_DIRECTION.md: everything FLAT in this world sits
// on a scrap. The player, the weapon in your hands, and every panel in the HUD
// are drawings on bits of paper somebody pulled out of a book -- not floating
// linework and not rectangles.
//
// The shape matters more than the noise on it. A scrap is a POLYGON: a dozen or
// so vertices, long straightish cuts between them, and the odd spike where the
// tear ran away from whoever was doing it. Take a rounded rectangle and perturb
// its edge with noise and you get a blob, which reads as organic rather than as
// something a person ripped.

/** Vertices of one scrap around an ellipse-ish footprint. */
export function tornShape(cx, cy, rx, ry, r, n = 15) {
  const pts = [];
  // Two slow lobes so the outline has an overall lopsided shape, instead of
  // even fuzz all the way round.
  const a1 = 0.09 + r() * 0.11, p1 = r() * 6.2832;
  const a2 = 0.05 + r() * 0.08, p2 = r() * 6.2832;
  const start = r() * 6.2832;
  for (let i = 0; i < n; i++) {
    const a = start + (i / n) * 6.2832 + (r() - 0.5) * (5.0 / n);  // uneven spacing
    let k = 1 + a1 * Math.sin(a + p1) + a2 * Math.sin(2 * a + p2) + (r() - 0.5) * 0.11;
    if (r() < 0.15) k += 0.15 + r() * 0.22;      // the tear ran out: a spike
    pts.push({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k });
  }
  return pts;
}

/**
 * Subdivide a scrap into a drawable path: each cut bows a little and carries a
 * fine tremble, so the same list of points gives you the fill and the edge line
 * and the two can never disagree.
 */
export function tornPath(pts, r, bow = 0.055) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const px = -dy / len, py = dx / len;
    const bw = (r() - 0.5) * len * bow;
    const segs = Math.max(2, Math.round(len / 13));
    for (let s = 0; s < segs; s++) {
      const t = s / segs;
      const off = Math.sin(Math.PI * t) * bw + (r() - 0.5) * 1.3;
      out.push({ x: a.x + dx * t + px * off, y: a.y + dy * t + py * off });
    }
  }
  return out;
}

function trace(ctx, path) {
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  ctx.closePath();
}

/** The scrap itself, for the mask sheet. Solid: this is what occludes the world. */
export function fillScrap(ctx, path) {
  trace(ctx, path);
  ctx.fill();
}

/**
 * The cut edge, for the ink sheet. Drawn as a line rather than left implicit,
 * because a torn edge that is only a silhouette reads as a clipping mask; a
 * torn edge with a line on it reads as the border of a piece of paper.
 */
export function strokeScrap(ctx, path, lw, r) {
  ctx.lineWidth = lw;
  trace(ctx, path);
  ctx.stroke();
  // one short second cut, somewhere along the edge, gone over again
  const n = path.length;
  const i0 = Math.floor(r() * n), run = Math.floor(n * (0.12 + r() * 0.22));
  ctx.lineWidth = lw * 0.7;
  ctx.beginPath();
  for (let k = 0; k <= run; k++) {
    const p = path[(i0 + k) % n];
    const o = (r() - 0.5) * lw * 1.6;
    if (k === 0) ctx.moveTo(p.x + o, p.y + o); else ctx.lineTo(p.x + o, p.y + o);
  }
  ctx.stroke();
}

/** Bounding box of a set of points, padded. */
export function bounds(groups, pad = 0) {
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  for (const g of groups) for (const p of g) {
    if (p.x < minx) minx = p.x; if (p.x > maxx) maxx = p.x;
    if (p.y < miny) miny = p.y; if (p.y > maxy) maxy = p.y;
  }
  return { minx: minx - pad, miny: miny - pad, maxx: maxx + pad, maxy: maxy + pad };
}

/**
 * A CSS `polygon()` for clipping a DOM panel to a scrap, so the HUD is torn out
 * of the same book as the player and the weapon.
 *
 * This walks a RECTANGLE's perimeter rather than inscribing the ellipse that
 * tornShape() uses. A panel is a panel: inscribing an ellipse in it throws away
 * all four corners and takes the text with them. Here the cut runs along each
 * edge, biting inward by at most `pad` -- so as long as the element's padding
 * clears `pad`, the deepest nick still lands in the margin.
 *
 * Corners get their own treatment, because a torn corner is the single clearest
 * signal that a shape was ripped rather than drawn: some are cut off on the
 * diagonal, some left square.
 */
export function scrapRect(w, h, r, pad = 11) {
  const px = Math.min(pad, w * 0.22), py = Math.min(pad, h * 0.22);
  const pts = [];
  // per-corner: 0 = square, >0 = how far in the diagonal cut starts
  const corner = [0, 1, 2, 3].map(() => (r() < 0.35 ? 0 : (0.5 + r() * 1.7)));
  const edge = (x0, y0, x1, y1, nx, ny, n) => {
    for (let i = 0; i <= n; i++) {
      const t = (i + (i && i < n ? (r() - 0.5) * 0.7 : 0)) / n;
      // mostly a shallow wander; every so often the tear digs in
      let d = 0.10 + r() * 0.45;
      if (r() < 0.22) d = 0.75 + r() * 0.45;
      pts.push([x0 + (x1 - x0) * t + nx * d, y0 + (y1 - y0) * t + ny * d]);
    }
  };
  const c = corner.map((k, i) => [k * px, k * py]);
  edge(c[0][0], 0, w - c[1][0], 0, 0, py, Math.max(4, Math.round(w / 30)));      // top
  edge(w, c[1][1], w, h - c[2][1], -px, 0, Math.max(4, Math.round(h / 30)));     // right
  edge(w - c[2][0], h, c[3][0], h, 0, -py, Math.max(4, Math.round(w / 30)));     // bottom
  edge(0, h - c[3][1], 0, c[0][1], px, 0, Math.max(4, Math.round(h / 30)));      // left
  return pts;
}

/** `polygon()` for clip-path, from a point list in pixels. */
export function toClipPath(pts, w, h) {
  return 'polygon(' + pts.map(([x, y]) =>
    `${(x / w * 100).toFixed(2)}% ${(y / h * 100).toFixed(2)}%`).join(',') + ')';
}

/**
 * The same polygon as a background image, filled with paper and stroked with
 * ink.
 *
 * The cut edge has to be painted INSIDE the clip. The obvious approach --
 * clip-path for the shape and a drop-shadow filter for the line -- cannot work:
 * CSS applies the filter first and then clips its result, so the shadow lands
 * entirely outside the clip region and is thrown away. Stroking the identical
 * polygon means the outer half of the stroke is clipped and the inner half
 * survives as the torn edge.
 */
export function scrapSVG(pts, w, h, paper = '#EDEEE8', ink = '#16181F', lw = 3.2) {
  const d = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(0)} ${h.toFixed(0)}" preserveAspectRatio="none">` +
    `<polygon points="${d}" fill="${paper}" stroke="${ink}" stroke-width="${lw}" stroke-linejoin="round"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
