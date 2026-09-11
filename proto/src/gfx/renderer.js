import * as G from './gl.js';
import * as S from './shaders.js';
import { makeAtlas, BOIL_FPS } from './sprites.js';

const CUBE = (() => {
  // 6 faces, position + normal
  const f = [
    [[ 0, 0, 1], [[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]],
    [[ 0, 0,-1], [[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]],
    [[ 1, 0, 0], [[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]]],
    [[-1, 0, 0], [[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]]],
    [[ 0, 1, 0], [[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]]],
    [[ 0,-1, 0], [[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]],
  ];
  const out = [];
  for (const [n, q] of f) {
    for (const i of [0, 1, 2, 0, 2, 3]) out.push(...q[i], ...n);
  }
  return new Float32Array(out);
})();

export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (!gl) throw new Error('WebGL2 is required and is not available in this browser.');
  if (!gl.getExtension('EXT_color_buffer_float'))
    throw new Error('EXT_color_buffer_float is required.');

  const boxProg    = G.compile(gl, S.BOX_VS, S.BOX_FS, 'box');
  const spriteProg = G.compile(gl, S.SPRITE_VS, S.SPRITE_FS, 'sprite');
  const lineProg   = G.compile(gl, S.LINE_VS, S.LINE_FS, 'line');
  const postProg   = G.compile(gl, S.POST_VS, S.POST_FS, 'post');

  // ---- box geometry + instances ----
  const cubeVBO = G.buffer(gl, CUBE);
  const boxInst = gl.createBuffer();
  const boxVAO = gl.createVertexArray();
  gl.bindVertexArray(boxVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVBO);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
  gl.bindBuffer(gl.ARRAY_BUFFER, boxInst);
  for (const [loc, size, off] of [[2, 3, 0], [3, 3, 12], [4, 2, 24]]) {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 32, off);
    gl.vertexAttribDivisor(loc, 1);
  }

  // ---- sprite quad + instances ----
  const quadVBO = G.buffer(gl, new Float32Array([-.5,-.5, .5,-.5, .5,.5, -.5,-.5, .5,.5, -.5,.5]));
  const sprInst = gl.createBuffer();
  const sprVAO = gl.createVertexArray();
  gl.bindVertexArray(sprVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, sprInst);
  for (const [loc, off] of [[1, 0], [2, 16], [3, 32]]) {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 48, off);
    gl.vertexAttribDivisor(loc, 1);
  }

  // ---- lines ----
  const lineVBO = gl.createBuffer();
  const lineVAO = gl.createVertexArray();
  gl.bindVertexArray(lineVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, lineVBO);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 16, 12);

  // ---- fullscreen triangle ----
  const postVBO = G.buffer(gl, new Float32Array([-1,-1, 3,-1, -1,3]));
  const postVAO = gl.createVertexArray();
  gl.bindVertexArray(postVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, postVBO);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
  gl.bindVertexArray(null);

  // ---- stickman atlas ----
  const atlas = makeAtlas();
  let lastBoil = -1;
  const atlasTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, atlasTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.generateMipmap(gl.TEXTURE_2D);

  const proj = G.mat4(), view = G.mat4(), vp = G.mat4();
  let gbuf = null, W = 0, H = 0;

  function resize(w, h) {
    if (w === W && h === H) return;
    W = w; H = h;
    canvas.width = w; canvas.height = h;
    if (gbuf) {
      gl.deleteFramebuffer(gbuf.fbo);
      gl.deleteTexture(gbuf.color); gl.deleteTexture(gbuf.normal); gl.deleteTexture(gbuf.depth);
    }
    gbuf = G.makeGBuffer(gl, w, h);
  }

  const boxData = new Float32Array(4096 * 8);
  const sprData = new Float32Array(512 * 12);
  const lineData = new Float32Array(8192 * 4);

  function render(scene, look) {
    const { cam, boxes, sprites, lines, post } = scene;

    // Redraw every stickman from its skeleton anchors at the boil rate. 8 canvas
    // regenerations + uploads per second, not 60 -- so the linework is never the
    // same twice and it still costs almost nothing.
    const boil = Math.floor(post.time * BOIL_FPS);
    if (boil !== lastBoil) {
      lastBoil = boil;
      atlas.redraw(boil);
      gl.bindTexture(gl.TEXTURE_2D, atlasTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
      gl.generateMipmap(gl.TEXTURE_2D);
    }
    lastCam.x = cam.x; lastCam.y = cam.y; lastCam.z = cam.z;
    G.perspective(proj, cam.fov, W / H, 0.05, 260);
    G.lookAt(view, cam.x, cam.y, cam.z, cam.tx, cam.ty, cam.tz, 0, 1, 0);
    G.multiply(vp, proj, view);

    gl.bindFramebuffer(gl.FRAMEBUFFER, gbuf.fbo);
    gl.viewport(0, 0, W, H);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.BLEND);
    gl.clearColor(0.93, 0.93, 0.91, 1);
    gl.clearBufferfv(gl.COLOR, 0, [0.93, 0.93, 0.91, 1]);
    gl.clearBufferfv(gl.COLOR, 1, [0.5, 0.5, 1.0, 1.0]);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    // --- boxes ---
    let n = 0;
    for (const b of boxes) {
      if (n >= 4096) break;
      boxData.set(b, n * 8); n++;
    }
    gl.useProgram(boxProg.program);
    gl.uniformMatrix4fv(boxProg.u.uViewProj, false, vp);
    gl.uniform3f(boxProg.u.uLightDir, 0.45, 0.82, 0.35);
    gl.uniform3f(boxProg.u.uCamPos, cam.x, cam.y, cam.z);
    gl.uniform1f(boxProg.u.uFar, 260);
    gl.bindVertexArray(boxVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, boxInst);
    gl.bufferData(gl.ARRAY_BUFFER, boxData.subarray(0, n * 8), gl.DYNAMIC_DRAW);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, n);

    // --- sprites ---
    if (sprites.length) {
      // sprites is a FLAT array of floats (12 per instance), not an array of
      // records -- copy it wholesale rather than element by element.
      const m = Math.min(512, Math.floor(sprites.length / 12));
      for (let i = 0, n2 = m * 12; i < n2; i++) sprData[i] = sprites[i];
      gl.useProgram(spriteProg.program);
      gl.uniformMatrix4fv(spriteProg.u.uViewProj, false, vp);
      gl.uniform3f(spriteProg.u.uRight, look.rx, 0, look.rz);
      gl.uniform3f(spriteProg.u.uUp, 0, 1, 0);
      gl.uniform3f(spriteProg.u.uCamPos, cam.x, cam.y, cam.z);
      gl.uniform2f(spriteProg.u.uAtlasTexel, 1 / atlas.canvas.width, 1 / atlas.canvas.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, atlasTex);
      gl.uniform1i(spriteProg.u.uAtlas, 0);
      gl.bindVertexArray(sprVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER, sprInst);
      gl.bufferData(gl.ARRAY_BUFFER, sprData.subarray(0, m * 12), gl.DYNAMIC_DRAW);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, m);
    }

    // --- ink marks ---
    if (lines.length) {
      let k = 0;
      for (const v of lines) { if (k >= 8192 * 4) break; lineData[k++] = v; }
      gl.useProgram(lineProg.program);
      gl.uniformMatrix4fv(lineProg.u.uViewProj, false, vp);
      gl.bindVertexArray(lineVAO);
      gl.bindBuffer(gl.ARRAY_BUFFER, lineVBO);
      gl.bufferData(gl.ARRAY_BUFFER, lineData.subarray(0, k), gl.DYNAMIC_DRAW);
      gl.drawArrays(gl.LINES, 0, k / 4);
    }

    // --- post ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(postProg.program);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, gbuf.color);
    gl.uniform1i(postProg.u.uColor, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, gbuf.normal);
    gl.uniform1i(postProg.u.uNormalDepth, 1);
    gl.uniform2f(postProg.u.uTexel, 1 / W, 1 / H);
    gl.uniform1f(postProg.u.uTime, post.time);
    gl.uniform1f(postProg.u.uBoil, Math.floor(post.time * BOIL_FPS));
    gl.uniform1f(postProg.u.uHatch, post.hatch);
    gl.uniform1f(postProg.u.uGrain, post.grain);
    gl.uniform1f(postProg.u.uOutline, post.outline);
    gl.bindVertexArray(postVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }

  let lastCam = { x: 0, y: 0, z: 0 };
  function project(x, y, z) {
    const cx = vp[0]*x + vp[4]*y + vp[8]*z + vp[12];
    const cy = vp[1]*x + vp[5]*y + vp[9]*z + vp[13];
    const cz = vp[2]*x + vp[6]*y + vp[10]*z + vp[14];
    const cw = vp[3]*x + vp[7]*y + vp[11]*z + vp[15];
    if (cw <= 0.0001) return null;
    return {
      x: (cx / cw * 0.5 + 0.5) * W,
      y: (-cy / cw * 0.5 + 0.5) * H,
      z: cz / cw,
      dist: Math.hypot(x - lastCam.x, y - lastCam.y, z - lastCam.z),
    };
  }
  return { gl, resize, render, atlas, project, get size() { return { W, H }; } };
}
