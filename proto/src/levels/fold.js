import { createBuilder, drawMarkers, TONE, STYLE, M } from './builder.js';

/**
 * THE FOLD -- the page creased into a valley.
 *
 * Terraces, not slopes. The collision solver is axis-aligned boxes with no ramp
 * support, so a smooth hillside is not available; more importantly, the sim has
 * no slope acceleration, so a "roll downhill for speed" map would not actually
 * work. Terraced drops do work: landing preserves horizontal speed and a crumpled
 * player bounces, so rolling off a 3m lip and carrying that speed into the next
 * terrace is real. See docs/MAPS.md for the ramp support this wants.
 *
 * Flow: the crease at the bottom is the longest sightline in the game (~90m) and
 * the fastest route. Crossing it is the whole decision. The terraces above are
 * safer and slower, and the fold ridges cut the valley into four rooms so the
 * long shot is only available from the ends.
 *
 * The top terrace is 12m -- enough to glide clean across the valley, which is the
 * flanking move and costs you the entire descent in the open.
 */
export default {
  id: 'fold',
  name: 'The Fold',
  kind: 'Terraced valley',
  blurb: 'A creased page. Long sightlines down the valley, terraced drops either side.',
  size: [104, 68],
  build() {
    const b = createBuilder('The Fold');
    b.ground(0, 0, 108, 72);
    b.pageEdge(0, 0, 108, 72);

    // ---- one side of the valley, then mirrored across z ----
    const TIER = [3.0, 6.0, 9.0, 12.0];
    TIER.forEach((y, i) => {
      const z = -12 - i * 6.5;
      const depth = 6.5;
      b.box(0, y / 2, z, 104, y, depth, 0.62 + i * 0.04, STYLE.plain);
      // a lip at the back of each terrace: cover facing down the valley
      if (i < 3) b.wall(0, z - 2.6, 104, 0.7, y + 1.1, TONE.wall);
    });
    // ways down: a stair at each end and one in the middle, so the terraces are
    // a real route rather than a one-way balcony
    for (const x of [-38, 0, 38]) {
      b.stairs(x, 0, -11, 'z', 16, 0.78, -1.0, 4.0, TONE.light);
    }
    b.card(-30, 12, -31);
    b.card(30, 6, -18);
    b.label(0, 14.4, -31, 'TOP TERRACE — 12m, glides the valley', 'note');

    b.mirrorZ();

    // ---- the crease, built after the mirror ----
    b.label(0, 4.4, 0, 'THE CREASE', 'station');
    b.label(0, 3.2, 0, '90m sightline — the fast way and the stupid way', 'note');

    // fold ridges cut the valley into four rooms, so the full-length shot is
    // only on offer from the very ends
    for (const x of [-26, 0, 26]) {
      b.kerb(x, -6, 3.2, 12, 0.2); b.kerb(x, 6, 3.2, 12, 0.2);
      b.box(x, 1.6, -6, 3.2, 3.2, 12, TONE.block, STYLE.grid);
      b.box(x, 1.6, 6, 3.2, 3.2, 12, TONE.block, STYLE.grid);
      b.box(x, 3.34, -6, 3.9, 0.28, 12.6, TONE.dark, STYLE.plain);
      b.box(x, 3.34, 6, 3.9, 0.28, 12.6, TONE.dark, STYLE.plain);
      b.wall(x, 0, 3.2, 4.0, 1.15);
    }
    b.inkwell(-13, 0, 0);
    b.inkwell(13, 0, 0);

    // murals at the two ends of the crease: scoring means committing to the lane
    b.mural(0, -48, 0, 0);
    b.mural(1, 48, 0, 0);
    b.spawn(0, -50, 0.1, 0, Math.PI * 0.5);
    b.spawn(1, 50, 0.1, 0, Math.PI * 1.5);

    drawMarkers(b);
    return b;
  },
};
