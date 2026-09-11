import desk from './desk.js';
import foolscap from './foolscap.js';
import margins from './margins.js';
import spiral from './spiral.js';
import fold from './fold.js';
import { buildTestbed } from './testbed.js';

const testbed = {
  id: 'testbed', name: 'Movement Gym', kind: 'Test',
  blurb: 'Stations for each verb, plus the readability range.',
  size: [220, 220],
  build: buildTestbed,
};

export const MAPS = [desk, testbed, foolscap, margins, spiral, fold];
export function mapById(id) { return MAPS.find((m) => m.id === id) || MAPS[0]; }
