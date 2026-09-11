import * as G from './gl.js';
import * as S from './shaders.js';
import { makeAtlas, BOIL_FPS } from './sprites.js';
import { makeViewmodel } from './viewmodel.js';

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
  const vmProg     = G.compile(gl, S.VM_VS, S.VM_FS, 'viewmodel');
  const edgeProg   = G.compile(gl, S.EDGE_VS, S.EDGE_FS, 'edge');

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

  // ---- ink edges: one instanced ribbon per box edge ----
  const edgeQuad = G.buffer(gl, new Float32Array([0,-1, 1,-1, 1,1, 0,-1, 1,1, 0,1]));
  const edgeInst = gl.createBuffer();
  const edgeVAO = gl.createVertexArray();
  gl.bindVertexArray(edgeVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, edgeQuad);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, edgeInst);
  for (const [loc, size, off] of [[1, 3, 0], [2, 3, 12], [3, 2, 24]]) {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 32, off);
    gl.vertexAttribDivisor(loc, 1);
  }
  let edgeCount = 0;

  /**
   * Build the ink strokes for a set of boxes. Static per map, so this runs once
   * on load rather than per frame.
   *
   * Two separate thresholds, because they answer different questions. minBox
   * throws away objects too small to be worth drawing at all; minEdge only
   * throws away individual edges. Using one number for both was wrong: a 4m
   * platform 0.3m thick kept its top and bottom rectangles and lost all four
   * corner uprights, so it read as two floating outlines instead of a slab.
   */
  function setEdges(boxes, minBox = 0.8, minEdge = 0.2, strokes = 2) {
    const data = [];
    for (const b of boxes) {
      const [cx, cy, cz, sx, sy, sz] = b;
      if (Math.max(sx, sy, sz) < minBox) continue;
      const x0 = cx - sx / 2, x1 = cx + sx / 2;
      const y0 = cy - sy / 2, y1 = cy + sy / 2;
      const z0 = cz - sz / 2, z1 = cz + sz / 2;
      const c = [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],
                 [x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]];
      const E = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],
                 [0,4],[1,5],[2,6],[3,7]];
      for (let e = 0; e < E.length; e++) {
        const A = c[E[e][0]], B = c[E[e][1]];
        if (Math.hypot(B[0]-A[0], B[1]-A[1], B[2]-A[2]) < minEdge) continue;
        const seed = (cx * 7.13 + cy * 3.71 + cz * 11.9 + e * 17.3) % 997;
        // Not every line is gone over the same number of times. A third of them
        // get a third pass, so line weight varies edge to edge and not just
        // along one edge.
        const n = strokes + (((seed * 37) | 0) % 3 === 0 ? 1 : 0);
        for (let s2 = 0; s2 < n; s2++)
          data.push(A[0], A[1], A[2], B[0], B[1], B[2], seed, s2);
      }
    }
    edgeCount = data.length / 8;
    gl.bindBuffer(gl.ARRAY_BUFFER, edgeInst);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    return edgeCount;
  }

  // ---- viewmodel quad (non-instanced) ----
  const vmVAO = gl.createVertexArray();
  gl.bindVertexArray(vmVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadVBO);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);

  // ---- fullscreen triangle ----
  const postVBO = G.buffer(gl, new Float32Array([-1,-1, 3,-1, -1,3]));
  const postVAO = gl.createVertexArray();
  gl.bindVertexArray(postVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, postVBO);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
  gl.bindVertexArray(null);

  // ---- stickman atlas ----
  const atlas = makeAtlas();
  const vm = makeViewmodel();
  let lastBoil = -1;

  // If a hand-drawn sheet is sitting next to the page, it wins. Same grid, any
  // resolution -- the UVs are fractional. Drop a drawn-over copy of the template
  // in as sprites.png and the procedural generator stops running.
  let handDrawn = null;
  const sheet = new Image();
  sheet.onload = () => {
    handDrawn = sheet;
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, sheet);
    gl.generateMipmap(gl.TEXTURE_2D);
  };
  sheet.onerror = () => {};
  sheet.src = 'sprites.png';

  const gunTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, gunTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, vm.canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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
    if (boil !== lastBoil && !handDrawn) {
      lastBoil = boil;
      atlas.redraw(boil);
      gl.bindTexture(gl.TEXTURE_2D, atlasTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, atlas.canvas);
      gl.generateMipmap(gl.TEXTURE_2D);
      vm.redraw(boil);
      gl.bindTexture(gl.TEXTURE_2D, gunTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, vm.canvas);
    } else if (boil !== lastBoil) {
      lastBoil = boil;
      vm.redraw(boil);
      gl.bindTexture(gl.TEXTURE_2D, gunTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, vm.canvas);
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

    // --- ink edges, drawn over the faces they belong to ---
    if (edgeCount && post.ink > 0.01) {
      gl.useProgram(edgeProg.program);
      gl.uniformMatrix4fv(edgeProg.u.uViewProj, false, vp);
      gl.uniform2f(edgeProg.u.uScreen, W, H);
      gl.uniform1f(edgeProg.u.uWidth, post.inkWidth * (H / 700));
      gl.uniform1f(edgeProg.u.uOvershoot, post.inkOvershoot * (H / 700));
      gl.uniform1f(edgeProg.u.uWobble, post.inkWobble * (H / 700));
      gl.uniform1f(edgeProg.u.uBoil, Math.floor(post.time * BOIL_FPS));
      gl.uniform1f(edgeProg.u.uInk, post.ink);
      // Ink LAYS ON the page: alpha-blended, so overlapping strokes darken each
      // other and a fringe sits on top of whatever tone is under it rather than
      // painting a grey halo. Attachment 1 is switched off for the pass so the
      // outline detector cannot see the strokes and draw a second line around
      // each one -- that doubling was most of why the frame looked machined.
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.NONE]);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.bindVertexArray(edgeVAO);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, edgeCount);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    }

    // --- viewmodel, on top of the world but inside the paper ---
    if (scene.vmodel) {
      const v = scene.vmodel;
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(vmProg.program);
      gl.uniform4f(vmProg.u.uRect, v.cx, v.cy, v.hw, v.hh);
      gl.uniform1f(vmProg.u.uRot, v.rot);
      gl.uniform2f(vmProg.u.uCell, v.cell * 0.5, 0.5);
      gl.uniform1f(vmProg.u.uAspect, W / H);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, gunTex);
      gl.uniform1i(vmProg.u.uGun, 0);
      gl.bindVertexArray(vmVAO);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.enable(gl.DEPTH_TEST);
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
    gl.uniform1f(postProg.u.uWarp, post.warp * (H / 700));
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
  return { gl, resize, render, atlas, project, setEdges, get edgeCount() { return edgeCount; },
    get handDrawn() { return !!handDrawn; }, get size() { return { W, H }; } };
}
