import { createBuilder, drawMarkers, TONE, STYLE, M } from './builder.js';

/**
 * THE DESK -- hand-designed, not generated.
 *
 * The earlier maps were procedural: a 4x4 grid, or three parallel lanes with
 * regularly spaced cover. They had no rooms, no loops, no chokepoints and no
 * landmarks, which is why they read as geometry rather than as places. This one
 * is built to the things competitive FPS layouts actually do:
 *
 *   DISTINCT ROOMS   Five spaces, each a different shape, height and size, each
 *                    with one landmark you can call out. The desk theme does the
 *                    heavy lifting: a mug is round, a book stack is stepped, a
 *                    lamp overhangs, a drawer is sunken. You always know where
 *                    you are.
 *   THREE LOOPS      Overlapping circular routes, not parallel lanes. You can
 *                    always come back round on someone.
 *   THREE CHOKES     One per lane, on three different sides and heights, so no
 *                    single position covers more than one.
 *   COVER WITH A JOB Every piece breaks a specific sightline rather than being
 *                    spaced evenly.
 *
 * Dimensions follow Source conventions: corridors 4-6m, doorways ~1.4 x 2.6m,
 * chest cover 1.2m, rooms 12-20m across.
 *
 *        z-24  [============ THE SHELF (sniper lane) ============]
 *        z-12      (MUG)          shelf gate         (LAMP)
 *        z 0    A ......... THE STACK (high ground) ......... B
 *        z+14      (DRAWER, sunken)  mouth   (THE CLUTTER)
 */
export default {
  id: 'desk',
  name: 'The Desk',
  kind: 'Three-lane arena',
  blurb: 'Five named rooms, three overlapping loops, one choke per lane. Hand-laid.',
  size: [80, 58],
  build() {
    const b = createBuilder('The Desk');

    // Ground is built around the drawer, because the solver cannot subtract --
    // the pit is the absence of floor, not a hole cut in it.
    b.pit(4, 15, 17, 11, 3.2, 82, 60);
    b.pageEdge(0, 0, 82, 60);

    // ---------------------------------------------------------------- SPAWNS --
    b.spawn(0, -35, 0.1, 0, Math.PI * 0.5);
    b.spawn(1, 35, 0.1, 0, Math.PI * 1.5);
    b.mural(0, -37, 0, 0);
    b.mural(1, 37, 0, 0);
    for (const sx of [-1, 1]) {
      b.wall(sx * 31, -6, 0.8, 9, 2.2);          // spawn apron, so you are not
      b.wall(sx * 31, 6, 0.8, 9, 2.2);           // shot the instant you appear
      b.tower(sx * 33, -17, 7, 7, 6.5, TONE.dark, sx < 0 ? 'x+' : 'x-');
      b.tower(sx * 33, 17, 7, 7, 5.5, TONE.dark, sx < 0 ? 'x+' : 'x-');
    }

    // ------------------------------------------------------------- THE MUG ---
    // Round room, A-side anchor. Two openings on opposite sides so it is a route,
    // not a dead end. The inner ring walkway is 2.4m -- under the glide floor.
    b.ring(-18, -13, 8.5, 5.5, 12, [1, 2, 7, 8]);
    b.kerb(-18, -13, 17, 17, 0.26);
    b.plat(-18, 2.4, -13, 6.5, 6.5, TONE.light);         // the island inside
    b.box(-18, 1.2, -13, 6.5, 2.4, 6.5, TONE.block, STYLE.grid);
    b.stairs(-18, 0, -17.5, 'z', 6, 0.4, 1.0, 3.0);
    b.inkwell(-18, 2.4, -13);
    b.label(-18, 7.4, -13, 'THE MUG', 'station');

    // ----------------------------------------------------------- THE SHELF ---
    // The long lane. A raised ledge runs its whole length -- the sniper position,
    // reachable only from the two ends, so taking it commits you.
    b.ledge(-6, 2.8, -24.5, 46, 4.5);
    b.wall(0, -27.5, 78, 1.2, 3.2, TONE.wall);
    b.stairs(-29.5, 0, -24.5, 'x', 7, 0.42, 1.0, 4.0);
    b.stairs(19, 0, -24.5, 'x', 7, 0.42, -1.0, 4.0);
    b.label(-6, 6.2, -24.5, 'THE SHELF', 'station');
    b.card(-6, 2.8, -24.5);

    // CHOKE 1: the shelf gate. Narrow, at the far end of the long lane.
    b.gate(17.5, -21, 'z', 13, 2.8);
    b.label(17.5, 5.6, -21, 'shelf gate', 'note');

    // ----------------------------------------------------------- THE STACK ---
    // Centre high ground: three stepped tiers of books to 5.4m, so it is above
    // the glide floor and you can bail off it. Approachable from four sides but
    // each approach is a stair you can be shot on.
    const TIER = [[18, 18, 1.8], [13, 13, 3.6], [8.5, 8.5, 5.4]];
    TIER.forEach(([sx, sz, h], i) => {
      b.box(0, h / 2, 0, sx, h, sz, 0.60 + i * 0.05, STYLE.grid);
      b.box(0, h + 0.14, 0, sx + 0.6, 0.28, sz + 0.6, TONE.dark, STYLE.plain);
    });
    b.stairs(-9, 0, 0, 'x', 5, 0.38, 1.1, 5.0);
    b.stairs(9, 0, 0, 'x', 5, 0.38, -1.1, 5.0);
    b.stairs(0, 1.8, -6.5, 'z', 5, 0.38, 1.1, 4.0);
    b.stairs(0, 1.8, 6.5, 'z', 5, 0.38, -1.1, 4.0);
    b.card(0, 5.4, 0);
    b.label(0, 8.4, 0, 'THE STACK', 'station');
    b.label(0, 7.2, 0, '5.4m — high ground, and you can glide off it', 'note');

    // ---------------------------------------------------------- THE DRAWER ---
    // Sunken, 3.2m down. The fastest rotation and the worst place to be caught:
    // everything above can see in, and there are only two ways out.
    b.stairs(-6, -3.2, 15, 'x', 9, 0.38, 1.0, 4.0);
    b.stairs(13.5, -3.2, 15, 'x', 9, 0.38, -1.0, 4.0);
    b.wall(4, 10.5, 9, 0.8, 1.2);
    b.box(1, -2.2, 15, 2.4, 2.0, 2.4, TONE.light);
    b.box(8, -2.4, 17, 2.0, 1.6, 2.0, TONE.light);
    b.inkwell(4, -3.2, 15);
    b.label(4, 2.2, 15, 'THE DRAWER', 'station');

    // CHOKE 2: the drawer mouth, the only low-lane way through to B.
    b.gate(15.5, 15, 'x', 12, 3.0, 4.0);
    b.label(15.5, 5.0, 15, 'drawer mouth', 'note');

    // ------------------------------------------------------------ THE LAMP ---
    // B-side anchor. A wide shade at 8m gives hard overhead cover -- the only
    // place on the map you cannot be seen from the Stack.
    b.box(20, 4.2, -12, 2.4, 8.4, 2.4, TONE.dark, STYLE.plain);
    b.box(20, 8.7, -12, 13, 0.9, 13, TONE.block, STYLE.plain);
    for (const [ox, oz] of [[-5.2, -5.2], [5.2, -5.2], [-5.2, 5.2], [5.2, 5.2]])
      b.box(20 + ox, 4.2, -12 + oz, 0.5, 8.4, 0.5, TONE.dark);
    b.wall(20, -18, 11, 0.8, 1.2);
    b.wall(26, -12, 0.8, 9, 1.2);
    b.card(20, 0, -12);
    b.label(20, 11.2, -12, 'THE LAMP', 'station');
    b.label(20, 1.6, -12, 'roofed — the Stack cannot see you here', 'note');

    // --------------------------------------------------------- THE CLUTTER ---
    // Dense small cover, close quarters. The B-side mirror of the Mug, but open
    // and chaotic where the Mug is enclosed and ordered.
    const CLUT = [[20, 20, 2.2], [25, 15, 1.4], [16, 22, 1.8], [27, 23, 2.6],
                  [22, 26, 1.2], [30, 18, 1.6], [17, 27, 2.0]];
    for (const [x, z, h] of CLUT) {
      b.kerb(x, z, h * 1.1, h * 1.1, 0.14);
      b.box(x, h / 2 + 0.14, z, h * 1.1, h, h * 1.1, TONE.light);
    }
    b.label(23, 4.6, 21, 'THE CLUTTER', 'station');

    // CHOKE 3: the pencil pot gap, the mid-to-north link on the B side.
    b.gate(11, -9, 'x', 11, 3.2, 4.2);
    b.label(11, 5.2, -9, 'pot gap', 'note');

    // cover that breaks specific sightlines, rather than spaced evenly
    b.wall(-9, -8, 0.9, 7, 1.2);        // Mug exit vs Stack west stair
    b.wall(-26, 9, 8, 0.9, 1.2);        // Spawn A vs the drawer stairs
    b.wall(29, -4, 0.9, 8, 1.2);        // Spawn B vs the pot gap
    b.wall(-14, 20, 9, 0.9, 1.2);       // drawer west approach
    b.card(-30, 0, 12);
    b.card(30, 0, -20);

    drawMarkers(b);
    return b;
  },
};
