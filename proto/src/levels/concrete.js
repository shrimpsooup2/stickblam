// THE SLAB -- imported from a mesh, not hand-laid.
//
// "Brutalist Concrete Map (Free Retro Prop)" by TRYFIELD, CC-BY-4.0.
// Full credit in docs/MAPS.md; the source archive is ArenaMap-Desk.zip.
//
// The geometry in data/concrete.js is generated (tools/import_gltf.mjs): the
// mesh is voxelised, its hollows filled, and the voxels merged into boxes,
// because the solver collides against axis-aligned boxes and nothing else.
// Everything in THIS file is authored on top of that -- ground, tone, spawns,
// and the labels that tell you what you are looking at. The import gives you a
// massing; it does not give you a map.

import { createBuilder, drawMarkers, TONE, STYLE } from './builder.js';
import { BOXES, EXTENT, SCALE, VOXEL } from './data/concrete.js';

const [W, H, D] = EXTENT;

export default {
  id: 'concrete',
  name: 'The Slab',
  kind: 'Imported massing',
  blurb: 'A brutalist model, voxelised and stood on a floor. Cover and rooftops, ' +
         'not a designed arena -- yet.',
  size: [Math.round(W + 24), Math.round(D + 24)],
  build() {
    const b = createBuilder('concrete');

    // A floor, which the model does not have: it is a diorama of blocks hanging
    // in space. Everything else is massing sitting on this.
    b.ground(0, 0, W + 26, D + 26);

    // Tone by height, so the terraces separate instead of reading as one lump.
    // The bands are the palette's, not a gradient -- see VISUAL_DIRECTION.md.
    const band = (top) => {
      if (top < 1.6) return [TONE.light, STYLE.plain];
      if (top < 5.0) return [TONE.block, STYLE.plain];
      if (top < 9.0) return [TONE.wall, STYLE.grid];
      return [TONE.dark, STYLE.grid];
    };
    for (const [x, y, z, sx, sy, sz] of BOXES) {
      const [tone, style] = band(y + sy / 2);
      b.box(x, y, z, sx, sy, sz, tone, style, 'concrete');
    }

    // Spawns at opposite corners of the open ground, facing in.
    b.spawn(0, -W / 2 - 7, 0.1, 0, Math.PI * 0.5);
    b.spawn(1,  W / 2 + 7, 0.1, 0, Math.PI * 1.5);
    b.label(0, 3.2, 0, 'THE SLAB', 'station');
    b.label(0, 1.4, -D / 2 + 3,
            `imported: ${BOXES.length} boxes at ${VOXEL}m, model scaled ${SCALE}x`, 'note');

    drawMarkers(b);
    return b;
  },
};
