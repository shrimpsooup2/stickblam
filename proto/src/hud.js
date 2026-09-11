import { T, STANCE_NAME } from './sim/constants.js';
import { BINDINGS } from './input.js';

// Live-tunable ranges. A movement prototype is only useful if you can change the
// feel without a rebuild, so every constant that affects feel is a slider.
const RANGES = {
  gravity: [4, 50], maxSpeed: [2, 20], accel: [5, 200], friction: [0, 20],
  stopSpeed: [0, 8], airAccel: [0, 60], airWishSpeed: [0.1, 8], airControl: [0, 2],
  jumpVel: [2, 16], coyoteTime: [0, 0.4], jumpBuffer: [0, 0.4], stepHeight: [0, 1],
  edgeEnterTime: [0.01, 0.6], edgeSpeedMult: [0.1, 1], edgeDepth: [0.01, 0.4],
  flattenSpeed: [0, 1.5], flattenReach: [0.1, 2], flattenMaxTime: [0, 15],
  glideGravityMult: [0.02, 1], glideMaxFall: [0.5, 20], glideAirControl: [0.5, 6],
  crumpleEnterSpeed: [0, 12], crumpleBoost: [0, 10], crumpleMaxSpeed: [4, 30],
  crumpleFriction: [0, 10], crumpleAccel: [0, 40], crumpleHeightMult: [0.2, 1],
  crumpleExitSpeed: [0, 10], height: [1, 2.6], halfWidth: [0.15, 0.8],
  lookSensitivity: [0.0004, 0.008], fov: [60, 120],
};
const GROUPS = [
  ['Ground',  ['maxSpeed', 'accel', 'friction', 'stopSpeed']],
  ['Air',     ['gravity', 'airAccel', 'airWishSpeed', 'airControl']],
  ['Jump',    ['jumpVel', 'coyoteTime', 'jumpBuffer', 'stepHeight']],
  ['Edge-On', ['edgeEnterTime', 'edgeSpeedMult', 'edgeDepth']],
  ['Flatten', ['flattenSpeed', 'flattenReach', 'flattenMaxTime']],
  ['Glide',   ['glideGravityMult', 'glideMaxFall', 'glideAirControl']],
  ['Crumple', ['crumpleEnterSpeed', 'crumpleBoost', 'crumpleMaxSpeed', 'crumpleFriction', 'crumpleAccel', 'crumpleHeightMult']],
  ['Body',    ['height', 'halfWidth', 'fov', 'lookSensitivity']],
];

export function createHud(root, post) {
  const defaults = { ...T };

  root.innerHTML = `
    <div id="readout"></div>
    <div id="crosshair"></div>
    <div id="labels"></div>
    <div id="panel">
      <div class="phead"><b>STICKBLAM</b> <span>movement testbed</span></div>
      <div id="keys"></div>
      <div id="sliders"></div>
      <div class="prow"><button id="reset">reset tuning</button><button id="copy">copy values</button></div>
      <div id="copied"></div>
    </div>
    <div id="hint">click to capture the mouse &nbsp;·&nbsp; <b>H</b> panel &nbsp;·&nbsp; <b>V</b> third person</div>`;

  root.querySelector('#keys').innerHTML = BINDINGS
    .map(([k, d]) => `<div class="kb"><kbd>${k}</kbd><span>${d}</span></div>`).join('');

  const sliders = root.querySelector('#sliders');
  const inputs = {};
  const postKeys = { outline: [0, 2], hatch: [0, 2], grain: [0, 2] };

  const addSlider = (obj, key, lo, hi) => {
    const row = document.createElement('label');
    row.className = 'srow';
    const step = (hi - lo) / 200;
    row.innerHTML = `<span class="sname">${key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
      <input type="range" id="s-${key}" min="${lo}" max="${hi}" step="${step}" value="${obj[key]}">
      <output id="o-${key}">${(+obj[key]).toFixed(3)}</output>`;
    sliders.appendChild(row);
    const inp = row.querySelector('input'), out = row.querySelector('output');
    inp.addEventListener('input', () => {
      obj[key] = parseFloat(inp.value);
      out.textContent = obj[key].toFixed(3);
    });
    inputs[key] = { inp, out, obj };
  };

  for (const [title, keys] of GROUPS) {
    const h = document.createElement('div');
    h.className = 'sgroup'; h.textContent = title;
    sliders.appendChild(h);
    for (const k of keys) if (RANGES[k]) addSlider(T, k, RANGES[k][0], RANGES[k][1]);
  }
  const ph = document.createElement('div');
  ph.className = 'sgroup'; ph.textContent = 'Look';
  sliders.appendChild(ph);
  for (const k in postKeys) addSlider(post, k, postKeys[k][0], postKeys[k][1]);

  root.querySelector('#reset').addEventListener('click', () => {
    Object.assign(T, defaults);
    for (const k in inputs) {
      const { inp, out, obj } = inputs[k];
      if (obj === T) { inp.value = T[k]; out.textContent = (+T[k]).toFixed(3); }
    }
  });
  root.querySelector('#copy').addEventListener('click', () => {
    const txt = Object.keys(defaults)
      .map(k => `  ${k}: ${typeof T[k] === 'number' ? (+T[k]).toFixed(4).replace(/0+$/, '0') : T[k]},`)
      .join('\n');
    navigator.clipboard?.writeText('export const T = {\n' + txt + '\n};');
    const c = root.querySelector('#copied');
    c.textContent = 'tuning copied to clipboard';
    setTimeout(() => { c.textContent = ''; }, 1800);
  });

  const readout = root.querySelector('#readout');
  const labelWrap = root.querySelector('#labels');
  const panel = root.querySelector('#panel');
  const labelEls = [];

  function setLabels(labels) {
    labelWrap.innerHTML = '';
    labelEls.length = 0;
    for (const l of labels) {
      const el = document.createElement('div');
      el.className = 'wlabel ' + (l.kind || '');
      el.textContent = l.text;
      labelWrap.appendChild(el);
      labelEls.push({ el, l });
    }
  }

  function updateLabels(project, W, H) {
    for (const { el, l } of labelEls) {
      const p = project(l.x, l.y, l.z);
      if (!p || p.z > 1 || p.z < -1) { el.style.display = 'none'; continue; }
      const d = p.dist;
      if (d > 95) { el.style.display = 'none'; continue; }
      el.style.display = 'block';
      el.style.transform = `translate(-50%,-50%) translate(${p.x}px,${p.y}px)`;
      el.style.opacity = String(Math.max(0.12, Math.min(1, 1.6 - d / 70)));
    }
  }

  function update(p, sim, fps, extra) {
    readout.innerHTML = `
      <div class="rrow"><b>${STANCE_NAME[p.stance]}</b>${p.crumpled ? ' · rolling' : ''}${p.gliding ? ' · gliding' : ''}</div>
      <div class="rgrid">
        <span>speed</span><em>${p.speed.toFixed(2)}</em>
        <span>vert</span><em>${p.vel.y.toFixed(2)}</em>
        <span>height</span><em>${p.height.toFixed(2)}</em>
        <span>hurtbox</span><em>${extra.hurt.toFixed(3)}</em>
        <span>ground</span><em>${p.grounded ? 'yes' : 'no'}</em>
        <span>pos</span><em>${p.pos.x.toFixed(1)}, ${p.pos.y.toFixed(1)}, ${p.pos.z.toFixed(1)}</em>
        <span>apex</span><em>${extra.apex.toFixed(2)}</em>
        <span>tick</span><em>${sim.tick}</em>
        <span>fps</span><em>${fps.toFixed(0)}</em>
      </div>`;
  }

  const togglePanel = () => panel.classList.toggle('hidden');
  return { update, setLabels, updateLabels, togglePanel,
           hideHint: () => root.querySelector('#hint').classList.add('gone') };
}
