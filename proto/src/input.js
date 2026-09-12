// Keyboard + pointer-lock mouse, flattened to the engine-agnostic shape the sim
// expects. Nothing below sim/ knows a browser exists.

export const BINDINGS = [
  ['W A S D', 'move'],
  ['Space', 'jump'],
  ['F  /  Space in air', 'deploy Paper Glide — needs height, cannot be cancelled'],
  ['Shift (hold)', 'Crumple — roll, keep momentum, can still shoot'],
  ['Q', 'Edge-On — 90°, slow return, no firing for 1s after'],
  ['Right mouse', 'scope'],
  ['Left mouse', 'fire'],
  ['V', 'first / third person'],
  ['M', 'next map'],
  ['1 … 8  /  wheel', 'pick a weapon'],
  ['R', 'respawn'],
  ['H', 'show / hide panel'],
];

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    fwd: 0, right: 0, jump: false, crouch: false, edge: false, glide: false,
    scoped: false, dx: 0, dy: 0, locked: false, shoot: false,
  };
  const once = { view: false, respawn: false, panel: false, map: false, weapon: 0, cycle: 0 };

  const down = (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'KeyV') once.view = true;
    if (e.code === 'KeyR') once.respawn = true;
    if (e.code === 'KeyH') once.panel = true;
    if (e.code === 'KeyM') once.map = true;
    if (/^Digit[1-8]$/.test(e.code)) once.weapon = +e.code.slice(5);
    if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Tab'].includes(e.code)) e.preventDefault();
  };
  const up = (e) => keys.delete(e.code);

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousedown', (e) => {
    if (!state.locked) { canvas.requestPointerLock(); return; }
    if (e.button === 0) keys.add('MouseL');
    if (e.button === 2) keys.add('MouseR');
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) keys.delete('MouseL');
    if (e.button === 2) keys.delete('MouseR');
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('wheel', (e) => {
    if (!state.locked) return;
    e.preventDefault();
    once.cycle += e.deltaY > 0 ? 1 : -1;
  }, { passive: false });

  document.addEventListener('pointerlockchange', () => {
    state.locked = document.pointerLockElement === canvas;
    if (!state.locked) keys.clear();
  });
  document.addEventListener('mousemove', (e) => {
    if (!state.locked) return;
    state.dx += e.movementX;
    state.dy += e.movementY;
  });

  function sample() {
    state.fwd   = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
    state.right = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    state.jump   = keys.has('Space');
    state.crouch = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('ControlLeft');
    state.edge   = keys.has('KeyQ');
    state.glide  = keys.has('KeyF') || keys.has('Space');
    state.scoped = keys.has('MouseR');
    state.shoot  = keys.has('MouseL');
    return state;
  }
  // Numeric slots reset to 0, boolean latches to false -- so `weapon` and
  // `cycle` come back as numbers and the rest come back as flags.
  function consume(name) {
    const v = once[name];
    once[name] = typeof v === 'number' ? 0 : false;
    return v;
  }
  function consumeMouse() { const d = { dx: state.dx, dy: state.dy }; state.dx = 0; state.dy = 0; return d; }
  function firing() { return state.shoot && state.locked; }

  return { sample, consume, consumeMouse, firing, state };
}
