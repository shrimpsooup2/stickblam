import { makeWorld, addBox } from '../sim/world.js';
import { T } from '../sim/constants.js';

// A station for each movement verb, plus the readability range that
// docs/ROADMAP.md Phase 0 actually gates on: "stand at 40m and look at a stickman."
//
// tone: 0.15-0.85 grey. Pure black is reserved for ink.
// style: 0 = plain, 1 = ruled paper (floors), 2 = faint grid (walls)

export function buildTestbed() {
  const world = makeWorld();
  const boxes = [];   // renderer instances: cx,cy,cz, sx,sy,sz, tone, style
  const dummies = []; // stickmen to look at
  const labels = [];  // HTML overlay markers

  const solid = (cx, cy, cz, sx, sy, sz, tone = 0.72, style = 0, tag = '') => {
    addBox(world, cx, cy, cz, sx, sy, sz, tag);
    boxes.push([cx, cy, cz, sx, sy, sz, tone, style]);
  };
  const label = (x, y, z, text, kind = '') => labels.push({ x, y, z, text, kind });

  // ---------------------------------------------------------------- ground --
  solid(0, -1, 0, 220, 2, 220, 0.80, 1, 'floor');
  world.spawn = { x: 0, y: 0.05, z: 0 };
  world.spawnYaw = 0;
  label(0, 2.4, 0, 'SPAWN', 'home');

  // ------------------------------------------- NORTH: the readability range --
  // Phase 0 gate. Dummies every 10m with a distance post beside each.
  for (let d = 10; d <= 50; d += 10) {
    dummies.push({ x: -1.2, y: 0, z: d, pose: d % 20 === 0 ? 'idle' : 'run1', seed: d });
    solid(1.6, 0.9, d, 0.18, 1.8, 0.18, 0.42, 0, 'post');
    solid(1.6, 1.85, d, 1.1, 0.1, 0.1, 0.42, 0);
    label(1.6, 2.15, d, d + 'm');
  }
  label(0, 3.4, 26, 'READABILITY RANGE', 'station');
  // a wall behind, so silhouettes are tested against something
  solid(0, 3, 58, 26, 6, 0.6, 0.62, 2, 'backdrop');

  // ------------------------------------------------- EAST: the jump gym -----
  // Heights chosen around the real apex so the ceiling is obvious in play.
  const apex = (T.jumpVel * T.jumpVel) / (2 * T.gravity);
  label(16, 3.6, -10, 'JUMP GYM', 'station');
  const steps = [0.30, 0.38, 0.55, apex * 0.75, apex * 0.98, apex * 1.15];
  steps.forEach((h, i) => {
    const x = 10 + i * 3.0;
    solid(x, h / 2, -10, 2.4, h, 3.0, 0.66, 0);
    label(x, h + 0.7, -10, h.toFixed(2) + 'm');
  });
  label(10 + 3 * 3.0, steps[3] + 1.5, -10, 'apex ' + apex.toFixed(2) + 'm', 'note');

  // gap-jump lane: platforms with widening gaps
  let gx = 10;
  for (let i = 0; i < 5; i++) {
    solid(gx, 0.6, -18, 2.6, 1.2, 2.6, 0.66, 0);
    label(gx, 1.9, -18, (i ? (2.0 + i * 0.9).toFixed(1) + 'm gap' : 'gaps'));
    gx += 2.6 + (2.0 + i * 0.9);
  }

  // stair run, to prove step-up feels like walking rather than bumping
  for (let i = 0; i < 9; i++) {
    const h = (i + 1) * T.stepHeight * 0.78;
    solid(10 + i * 1.1, h / 2, -3, 1.1, h, 3.0, 0.70, 0);
  }
  label(14.4, 3.4, -3, 'STAIRS  (step ' + T.stepHeight.toFixed(2) + 'm)', 'note');

  // ------------------------------------------------ SOUTH: the glide tower --
  label(0, 3.6, -34, 'GLIDE TOWER', 'station');
  const towerH = 26;
  solid(0, towerH / 2, -40, 5, towerH, 5, 0.58, 2, 'tower');
  // a staircase spiralling up it
  for (let i = 0; i < 46; i++) {
    const a = i * 0.42, rr = 4.2;
    solid(Math.sin(a) * rr, i * 0.56 + 0.28, -40 + Math.cos(a) * rr,
          1.5, 0.3, 1.5, 0.64, 0);
  }
  label(0, towerH + 1.5, -40, towerH + 'm drop  ·  F opens the glide');
  label(0, 2.4, -33, 'needs ' + T.glideMinClearance.toFixed(1) + 'm of air below you', 'note');
  // landing pads at increasing distance, to read glide range off the ground
  for (let i = 1; i <= 4; i++) {
    solid(i * 9, 0.06, -40, 5, 0.12, 5, 0.50, 0);
    label(i * 9, 0.9, -40, (i * 9) + 'm out');
  }

  // ----------------------------------------------- WEST: roll stations ------
  label(-16, 3.6, -6, 'ROLL TUNNEL', 'station');
  // a run-up, then a ceiling only a roll fits under
  const ceilY = T.height * T.ballHeightMult + 0.42;
  solid(-20, ceilY + 1.6, 0, 16, 3.2, 7, 0.60, 0, 'tunnel roof');
  solid(-20, 1.0, 4.0, 16, 2.0, 0.5, 0.60, 2);
  solid(-20, 1.0, -4.0, 16, 2.0, 0.5, 0.60, 2);
  label(-20, ceilY + 0.5, 0, 'clearance ' + ceilY.toFixed(2) + 'm');
  label(-11, 2.6, 0, 'hold crouch to fit', 'note');

  // A rolling course: long straight walls with a kink, to feel momentum carry.
  label(-26, 3.8, -28, 'ROLL COURSE', 'station');
  for (let i = 0; i < 8; i++) {
    solid(-34 + i * 0.4, 1.2, -30 - i * 3.2, 0.5, 2.4, 3.2, 0.60, 2);
    solid(-20 - i * 0.4, 1.2, -30 - i * 3.2, 0.5, 2.4, 3.2, 0.60, 2);
  }
  solid(-27, 1.2, -28, 15, 2.4, 0.5, 0.62, 2);
  label(-27, 1.5, -32, 'hold crouch, then let go of the stick', 'note');
  label(-27, 1.2, -52, 'a ball does not stop', 'note');

  // ------------------------------------------------------ sparring dummies --
  dummies.push({ x: 4, y: 0, z: -6, pose: 'idle', seed: 2 });
  dummies.push({ x: -5, y: 0, z: -7, pose: 'idle', seed: 3 });
  dummies.push({ x: 6.5, y: 0, z: 4, pose: 'run0', seed: 4 });

  return { world, boxes, dummies, labels, apex };
}
