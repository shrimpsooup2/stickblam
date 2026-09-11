// Keyboard + pointer-lock mouse, flattened to the engine-agnostic shape the sim
// expects. Nothing below sim/ knows a browser exists.

export const BINDINGS = [
  ['W A S D', 'move'],
  ['Space', 'jump  ·  hold while falling = Paper Glide'],
  ['Shift', 'crouch  ·  at speed = Crumple roll'],
  ['Q  /  right mouse', 'Edge-On'],
  ['F', 'Flatten (near a wall)'],
  ['V', 'first / third person'],
  ['Left mouse', 'trace a shot'],
  ['R', 'respawn'],
  ['H', 'show / hide panel'],
];

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    fwd: 0, right: 0, jump: false, crouch: false, edge: false, flatten: false,
    dx: 0, dy: 0, locked: false, shoot: false,
  };
  const once = { view: false, respawn: false, panel: false };

  const down = (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'KeyV') once.view = true;
    if (e.code === 'KeyR') once.respawn = true;
    if (e.code === 'KeyH') once.panel = true;
    if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Tab'].includes(e.code)) e.preventDefault();
  };
  const up = (e) => keys.delete(e.code);

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousedown', (e) => {
    if (!state.locked) { canvas.requestPointerLock(); return; }
    if (e.button === 0) state.shoot = true;
    if (e.button === 2) keys.add('MouseR');
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 2) keys.delete('MouseR'); });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

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
    state.jump    = keys.has('Space');
    state.crouch  = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('ControlLeft');
    state.edge    = keys.has('KeyQ') || keys.has('MouseR');
    state.flatten = keys.has('KeyF');
    return state;
  }
  function consume(name) { const v = once[name]; once[name] = false; return v; }
  function consumeMouse() { const d = { dx: state.dx, dy: state.dy }; state.dx = 0; state.dy = 0; return d; }
  function consumeShoot() { const s = state.shoot; state.shoot = false; return s; }

  return { sample, consume, consumeMouse, consumeShoot, state };
}
