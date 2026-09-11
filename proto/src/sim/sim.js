import { TICK } from './constants.js';
import { stepPlayer } from './player.js';

/**
 * Fixed-timestep driver.
 *
 * The simulation advances in whole TICKs regardless of frame rate, and the
 * renderer interpolates between the last two states. This is not just for
 * smoothness -- a deterministic fixed step is the prerequisite for the
 * server-authoritative netcode in Phase 1, so the prototype is built that way
 * from the start rather than retrofitted.
 */
export function makeSim(world, player) {
  return {
    world, player,
    acc: 0, tick: 0,
    prev: { x: player.pos.x, y: player.pos.y, z: player.pos.z, h: player.height },
    curr: { x: player.pos.x, y: player.pos.y, z: player.pos.z, h: player.height },
    alpha: 0,
    lastResult: null,
  };
}

export function advance(sim, dt, input) {
  // Clamp so a tab-out or a breakpoint can't spiral into hundreds of catch-up
  // ticks; better to lose time than to freeze.
  sim.acc += Math.min(dt, 0.25);
  let steps = 0;
  while (sim.acc >= TICK && steps < 12) {
    sim.prev.x = sim.player.pos.x;
    sim.prev.y = sim.player.pos.y;
    sim.prev.z = sim.player.pos.z;
    sim.prev.h = sim.player.height;
    sim.lastResult = stepPlayer(sim.player, input, sim.world, TICK);
    sim.acc -= TICK; sim.tick++; steps++;
  }
  sim.curr.x = sim.player.pos.x;
  sim.curr.y = sim.player.pos.y;
  sim.curr.z = sim.player.pos.z;
  sim.curr.h = sim.player.height;
  sim.alpha = sim.acc / TICK;
  return steps;
}

/** Interpolated render position. */
export function renderPos(sim, out) {
  const a = sim.alpha;
  out.x = sim.prev.x + (sim.curr.x - sim.prev.x) * a;
  out.y = sim.prev.y + (sim.curr.y - sim.prev.y) * a;
  out.z = sim.prev.z + (sim.curr.z - sim.prev.z) * a;
  out.h = sim.prev.h + (sim.curr.h - sim.prev.h) * a;
  return out;
}
