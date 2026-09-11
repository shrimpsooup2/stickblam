import { createBuilder, drawMarkers, TONE, STYLE, M } from './builder.js';

/**
 * FOOLSCAP -- open, flat, almost no verticality. The control map.
 *
 * Flow: three lanes running A to B. The centre lane is a 70m sightline across an
 * open plinth; the side lanes are 25m stretches broken by cover. Rotations happen
 * behind each mural, so a team that loses centre can still reach both flanks.
 *
 * The movement idea: this is the map where your tricks mostly do not save you.
 * The plinth is deliberately 2.2m -- under the 2.6m glide floor -- so you cannot
 * bail off it, only walk down. Exactly two places on the map (the pencil stacks)
 * are tall enough to glide from, and both are dead ends you have to climb. Going
 * up is a decision with one slow, visible way back down.
 *
 * Crumple matters here more than anywhere: cover is chest height, so rolling puts
 * you under every sightline on the map at 9.6 m/s.
 */
export default {
  id: 'foolscap',
  name: 'Foolscap',
  kind: 'Open arena',
  blurb: 'Flat, symmetric, three lanes. The base shooter with nowhere to hide.',
  size: [84, 84],
  build() {
    const b = createBuilder('Foolscap');
    b.ground(0, 0, 84, 84);
    b.pageEdge(0, 0, 84, 84);

    // ---- one half, then mirrored ----
    b.mural(0, 0, -34);
    b.spawn(0, 0, 0.1, -39, 0);

    // spawn apron: a low lip so you are not shot the instant you appear
    b.wall(-9, -36, 12, 0.8, 1.4);
    b.wall(9, -36, 12, 0.8, 1.4);

    // side lanes: staggered chest-high cover, offset so the two lanes never
    // present the same rhythm
    for (let i = 0; i < 4; i++) {
      const z = -26 + i * 7;
      b.wall(-24 + (i % 2) * 3, z, 7, 1.0, 1.2);
      b.wall(24 - (i % 2) * 3, z + 3, 6, 1.0, 1.2);
    }

    // the pencil stacks: the only glide platforms on the map, one per flank
    for (const sx of [-1, 1]) {
      const x = sx * 27;
      b.tower(x, -14, 5.5, 5.5, 9.0, TONE.dark, sx < 0 ? 'x+' : 'x-');
      b.parapet(x, 9.36, -14, 6.3, 6.3, 0.8);
      b.stairs(x, 0, -19, 'z', 12, 0.75, 1.1, 4.0);
      b.label(x, 10.4, -14, '9m — glide off', 'note');
      b.card(x, 9.0, -14);            // the reward for climbing is a card, not a gun nest
    }

    // loose crumpled-paper cover, asymmetric within the symmetric lanes
    for (const [x, z, sz] of [[-13, -20, 2.6], [12, -24, 2.0], [-6, -12, 1.8], [16, -11, 2.4]]) {
      b.kerb(x, z, sz, sz, 0.16);
      b.box(x, sz / 2 + 0.16, z, sz, sz, sz, TONE.light);
    }
    b.card(-19, 0, -22);

    b.mirrorZ();

    // ---- centre, built after the mirror so it is not duplicated ----
    b.kerb(0, 0, 14, 14, 0.3);
    b.box(0, 1.1, 0, 14, 2.2, 14, TONE.block, STYLE.grid);
    b.plat(0, 2.2, 0, 14.6, 14.6, TONE.light);
    b.stairs(-7, 0, 0, 'x', 5, 0.44, 1.0, 8.0);
    b.stairs(7, 0, 0, 'x', 5, 0.44, -1.0, 8.0);
    b.wall(0, -5.5, 9, 0.8, 1.1, TONE.wall);
    b.wall(0, 5.5, 9, 0.8, 1.1, TONE.wall);
    b.inkwell(0, 2.2, 0);
    b.label(0, 5.4, 0, 'THE PLINTH', 'station');
    b.label(0, 4.2, 0, '2.2m — too low to glide off', 'note');

    drawMarkers(b);
    return b;
  },
};
