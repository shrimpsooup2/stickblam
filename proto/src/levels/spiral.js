import { createBuilder, drawMarkers, TONE, STYLE, M } from './builder.js';

/**
 * SPIRAL BINDING -- the wire binding of the notebook, turned into a map.
 *
 * The vertical axis IS the lane structure. One central column with a helical
 * stair, four satellite towers at the corners, and an open ground ring.
 *
 * The whole map exists to put a real price on height. Climbing the helix is slow
 * and you are exposed on every turn; holding the top is genuinely strong. But the
 * murals are at GROUND level, so the high ground scores nothing. To win you have
 * to come down, and coming down from 34m is a 22-second glide at 1.55 m/s in
 * which everyone can see you and you cannot change your mind.
 *
 * The counterplay to a held top is not climbing into it -- it is gliding across
 * from a satellite at the same height, which is why the satellites are staggered
 * (12/18/24/30m) and each bridges to a different level of the core.
 */
export default {
  id: 'spiral',
  name: 'Spiral Binding',
  kind: 'Vertical tower',
  blurb: 'A 34m core with a helical stair. Height is power; the murals are on the floor.',
  size: [72, 72],
  build() {
    const b = createBuilder('Spiral Binding');
    b.ground(0, 0, 76, 76);
    b.pageEdge(0, 0, 76, 76);
    b.kerb(0, 0, 11, 11, 0.4);

    const TOP = 34;

    // ---- the core: solid column plus the wire winding up it ----
    b.box(0, TOP / 2, 0, 9, TOP, 9, TONE.dark, STYLE.grid, 'core');
    b.helix(0, 0, 8.2, 3.2, TOP, 62, 2.6, TONE.light);

    // landings every ~8m, wide enough to fight on
    const LEVELS = [8.5, 17, 25.5, TOP];
    LEVELS.forEach((y, i) => {
      const a = i * 1.9;
      const lx = Math.sin(a) * 9.5, lz = Math.cos(a) * 9.5;
      b.plat(lx, y, lz, 9, 9, TONE.light);
      b.box(lx, y - 0.45, lz, 9.4, 0.6, 9.4, TONE.dark, STYLE.plain);   // underside
      b.parapet(lx, y, lz, 9, 9, 0.8);
      b.label(Math.sin(a) * 9.5, y + 1.6, Math.cos(a) * 9.5, Math.round(y) + 'm', 'note');
    });
    b.plat(0, TOP, 0, 11, 11, TONE.accent);
    b.parapet(0, TOP, 0, 11, 11, 0.9);
    b.label(0, TOP + 3.2, 0, 'THE CROWN', 'station');
    b.label(0, TOP + 1.8, 0, 'scores nothing — you have to come down', 'note');
    b.card(0, TOP, 0);

    // ---- satellites: staggered heights, each bridging a different core level ----
    const SAT = [
      [-26, -26, 12], [26, -26, 18], [26, 26, 24], [-26, 26, 30],
    ];
    SAT.forEach(([x, z, h], i) => {
      b.tower(x, z, 9, 9, h, TONE.block, z < 0 ? 'z+' : 'z-');
      b.parapet(x, h + 0.36, z, 9.8, 9.8, 0.8);
      b.stairs(x, 0, z + (z < 0 ? -6.5 : 6.5), 'z', Math.ceil(h / 0.8), 0.8, 1.1, 3.0, TONE.light);
      b.label(x, h + 1.6, z, h + 'm', 'note');
      b.card(x, h, z);
      // a bridge partway toward the core, stopping short: the last stretch is a glide
      const d = Math.hypot(x, z), ux = x / d, uz = z / d;
      b.plat(x - ux * 9, h, z - uz * 9, 3.0, 3.0, TONE.accent);
      b.legs(x - ux * 9, h - 0.3, z - uz * 9, 3.0, 3.0);   // the stub is held up
      b.label(x - ux * 11, h + 1.4, z - uz * 11, 'glide gap', 'note');
    });

    // ---- ground ring: cover, and the only place that scores ----
    for (let i = 0; i < 10; i++) {
      const a = i * 0.628;
      b.wall(Math.sin(a) * 19, Math.cos(a) * 19, 6, 1.0, 1.3);
    }
    b.inkwell(-14, 0, 14);
    b.inkwell(14, 0, -14);

    b.mural(0, 0, 0, -33);
    b.mural(1, 0, 0, 33);
    b.spawn(0, 0, 0.1, -36, 0);
    b.spawn(1, 0, 0.1, 36, Math.PI);

    drawMarkers(b);
    return b;
  },
};
