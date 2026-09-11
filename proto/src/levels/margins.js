import { createBuilder, drawMarkers, TONE, STYLE, M } from './builder.js';

/**
 * THE MARGINS -- a city scrawled down the side of the page.
 *
 * Three parallel networks, deliberately with different connectivity:
 *
 *   ROOF    few links, high commitment. Glide is the only fast way down, and it
 *           is slow and visible, so taking the roof is a bet on the next 8s.
 *   STREET  a full grid. Many routes, short sightlines (10-25m), constant
 *           corners. This is the default layer and the Marker/Brush home.
 *   CRAWL   four stilted buildings with 0.83m clearance underneath. Crumple-only
 *           diagonals that cut the grid, and you can still shoot from in there.
 *
 * Flow: because the street grid is dense, no single choke can be held. Pressure
 * has to come from choosing a layer -- roofs to get above a held street, crawls
 * to get behind one. The counter to each is knowing which one they picked, which
 * is why the card spawns are on roofs: they force someone up where they show.
 */
export default {
  id: 'margins',
  name: 'The Margins',
  kind: 'City / corridor',
  blurb: 'Dense block grid on three layers — roofs, streets, and crumple crawlspaces.',
  size: [96, 96],
  build() {
    const b = createBuilder('The Margins');
    b.ground(0, 0, 96, 96);
    b.pageEdge(0, 0, 96, 96);

    const GRID = [-31.5, -10.5, 10.5, 31.5];   // 14m blocks, 7m streets
    const H = [
      [13, 8, 15, 9],
      [7, 16, 10, 13],
      [11, 9, 14, 8],
      [9, 14, 7, 12],
    ];
    // four stilted blocks: the crawl network, chosen to make diagonals
    const STILT = new Set(['1,1', '2,2', '0,3', '3,0']);
    // six hollow blocks: a city needs somewhere to be *inside*
    const SHELL = new Set(['0,1', '1,2', '2,0', '3,2', '1,0', '2,3']);
    const DOOR = ['z-', 'z+', 'x-', 'x+'];

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const x = GRID[i], z = GRID[j], h = H[i][j];
        const key = i + ',' + j;
        const tone = 0.52 + ((i + j) % 3) * 0.07;
        b.pavement(x, z, 14, 14, 2.6);
        if (STILT.has(key)) {
          // floats on a crawlspace: standing height is blocked, crumple is not.
          // Corner posts only -- legs through the middle would close the route.
          b.box(x, M.crouchFit + (h - M.crouchFit) / 2, z, 14, h - M.crouchFit, 14, tone, STYLE.grid);
          for (const sx of [-1, 1]) for (const sz of [-1, 1])
            b.box(x + sx * 6.4, M.crouchFit / 2, z + sz * 6.4, 0.7, M.crouchFit, 0.7, TONE.dark);
          b.box(x, h + 0.18, z, 14.8, 0.34, 14.8, TONE.dark, STYLE.plain);
          b.label(x, 1.5, z, 'crawl', 'note');
        } else if (SHELL.has(key)) {
          b.shell(x, z, 14, 14, h, DOOR[(i + j) % 4], tone);
        } else {
          b.tower(x, z, 14, 14, h, tone, DOOR[(i * 2 + j) % 4]);
        }
        // awnings over the pavement, to break the long grid sightlines
        if ((i + j) % 2 === 0) b.wall(x, z + 8.6, 6, 0.6, 1.2);
      }
    }

    // roof access: stair towers against four buildings, one per quadrant
    const ACCESS = [[0, 0], [3, 0], [0, 3], [3, 3]];
    for (const [i, j] of ACCESS) {
      const x = GRID[i], z = GRID[j], h = H[i][j];
      const dir = i < 2 ? -1 : 1;
      b.stairs(x + dir * 8.5, 0, z - 6, 'z', Math.ceil(h / 0.7), 0.7, 1.0, 3.2, TONE.light);
      b.label(x + dir * 8.5, h + 1.4, z, Math.round(h) + 'm', 'note');
    }

    // plank bridges between roofs -- narrow, and the only roof-to-roof links
    const bridge = (i1, j1, i2, j2) => {
      const y = Math.min(H[i1][j1], H[i2][j2]);
      const x = (GRID[i1] + GRID[i2]) / 2, z = (GRID[j1] + GRID[j2]) / 2;
      const along = i1 === i2 ? 'z' : 'x';
      const bw = along === 'x' ? 9 : 2.2, bd = along === 'x' ? 2.2 : 9;
      b.plat(x, y, z, bw, bd, TONE.accent);
      // handrails: a plank at 13m with no edge is unreadable to walk
      if (along === 'x') {
        b.box(x, y + 0.45, z - bd / 2, bw, 0.9, 0.16, TONE.dark);
        b.box(x, y + 0.45, z + bd / 2, bw, 0.9, 0.16, TONE.dark);
      } else {
        b.box(x - bw / 2, y + 0.45, z, 0.16, 0.9, bd, TONE.dark);
        b.box(x + bw / 2, y + 0.45, z, 0.16, 0.9, bd, TONE.dark);
      }
    };
    bridge(0, 0, 1, 0); bridge(1, 1, 1, 2); bridge(2, 2, 3, 2);
    bridge(0, 2, 0, 3); bridge(2, 0, 3, 0); bridge(1, 3, 2, 3);

    // cards live on roofs: the risky layer has to be worth visiting
    b.card(GRID[0], H[0][0], GRID[0]);
    b.card(GRID[3], H[3][3], GRID[3]);
    b.card(GRID[1], H[1][2], GRID[2]);
    b.card(GRID[2], H[2][1], GRID[1]);

    // inkwells at two street intersections, out on opposite flanks
    b.inkwell(-21, 0, 21);
    b.inkwell(21, 0, -21);

    // murals in opposite corners, at street level -- roofs never score
    b.mural(0, -42, 0, -42);
    b.mural(1, 42, 0, 42);
    b.spawn(0, -44, 0.1, -44, Math.PI * 0.25);
    b.spawn(1, 44, 0.1, 44, Math.PI * 1.25);

    b.label(0, 20, 0, 'THE MARGINS', 'station');
    drawMarkers(b);
    return b;
  },
};
