// THE DRAWER -- imported, and unlike The Slab this one was built as a map.
//
// "LOWPOLY | FPS | TDM | GAME | MAP by ResoForge" by Space_One, CC-BY-4.0.
// Full credit in docs/MAPS.md; source geometry in assets/arena-drawer/.
//
// It arrives with a floor, two storeys and interiors that are actually rooms,
// so the import leaves them alone: the ground-fill pass that The Slab needed is
// off here, because welding every column to the floor would brick up the ground
// storey. Geometry in data/drawer.js is generated; spawns and labels are not.

import { createBuilder, drawMarkers, TONE, STYLE } from './builder.js';
import { BOXES, EXTENT, SCALE, VOXEL } from './data/drawer.js';

const [W, H, D] = EXTENT;

export default {
  id: 'drawer',
  name: 'The Drawer',
  kind: 'Imported arena',
  blurb: 'Two storeys, long axis, interiors you can fight through. Built as a ' +
         'deathmatch map before it was ever a drawing.',
  size: [Math.round(W + 16), Math.round(D + 16)],
  build() {
    const b = createBuilder('drawer');

    // A margin of floor around the model, so falling off the edge is a drop
    // onto paper rather than out of the world.
    b.ground(0, 0, W + 18, D + 18);

    // Tone by height: ground storey light, upper storey a step darker, roofs
    // darker again. Light overall -- the shader drops unlit faces a long way on
    // its own, and authoring dark on top of that buries the whole map.
    const band = (top) => (top < 3.0 ? TONE.floor : top < 7.5 ? TONE.light : TONE.block);
    for (const [x, y, z, sx, sy, sz] of BOXES)
      b.box(x, y, z, sx, sy, sz, band(y + sy / 2), STYLE.plain, 'map');

    // Opposite ends of the long axis, which is how the model is laid out.
    // Both picked by probing the geometry for ground-level standing room with
    // headroom and six metres of elbow space, rather than by eye -- the first
    // guess put you on the apron facing the back of an end wall.
    b.spawn(0,  1.5, 0.6, -22.5, 0);
    b.spawn(1, -2.5, 0.6,  19.5, Math.PI);
    b.label(0, 4.0, 0, 'THE DRAWER', 'station');
    b.label(0, 1.6, -D / 2 + 2,
            `imported: ${BOXES.length} boxes at ${VOXEL}m, model scaled ${SCALE}x`, 'note');

    drawMarkers(b);
    return b;
  },
};
