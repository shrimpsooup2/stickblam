// Tiny WebGL2 + mat4 helpers. Deliberately not a general engine -- just the
// handful of operations this prototype needs.

export function mat4() { return new Float32Array(16); }

export function identity(m) {
  m.fill(0); m[0] = m[5] = m[10] = m[15] = 1; return m;
}

export function perspective(m, fovDeg, aspect, near, far) {
  const f = 1 / Math.tan((fovDeg * Math.PI / 180) / 2);
  m.fill(0);
  m[0] = f / aspect; m[5] = f; m[11] = -1;
  m[10] = (far + near) / (near - far);
  m[14] = (2 * far * near) / (near - far);
  return m;
}

export function lookAt(m, ex, ey, ez, cx, cy, cz, ux, uy, uz) {
  let zx = ex - cx, zy = ey - cy, zz = ez - cz;
  let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
  let xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx;
  l = Math.hypot(xx, xy, xz) || 1; xx /= l; xy /= l; xz /= l;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  m[0] = xx; m[1] = yx; m[2] = zx; m[3] = 0;
  m[4] = xy; m[5] = yy; m[6] = zy; m[7] = 0;
  m[8] = xz; m[9] = yz; m[10] = zz; m[11] = 0;
  m[12] = -(xx * ex + xy * ey + xz * ez);
  m[13] = -(yx * ex + yy * ey + yz * ez);
  m[14] = -(zx * ex + zy * ey + zz * ez);
  m[15] = 1;
  return m;
}

export function multiply(out, a, b) {
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
      out[c * 4 + r] = s;
    }
  }
  return out;
}

export function compile(gl, vsSrc, fsSrc, name = 'shader') {
  const mk = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      const numbered = src.split('\n').map((l, i) => (i + 1) + ': ' + l).join('\n');
      throw new Error(name + ' ' + (type === gl.VERTEX_SHADER ? 'vertex' : 'fragment') +
                      ' failed:\n' + log + '\n' + numbered);
    }
    return sh;
  };
  const p = gl.createProgram();
  gl.attachShader(p, mk(gl.VERTEX_SHADER, vsSrc));
  gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fsSrc));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error(name + ' link failed: ' + gl.getProgramInfoLog(p));

  // Cache uniform locations so draw calls stay cheap.
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    const nm = info.name.replace(/\[0\]$/, '');
    u[nm] = gl.getUniformLocation(p, nm);
  }
  return { program: p, u };
}

export function buffer(gl, data, target = gl.ARRAY_BUFFER, usage = gl.STATIC_DRAW) {
  const b = gl.createBuffer();
  gl.bindBuffer(target, b);
  gl.bufferData(target, data, usage);
  return b;
}

/** Offscreen target: colour + normal/depth (MRT) + a real depth buffer. */
export function makeGBuffer(gl, w, h) {
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

  const tex = (internal, format, type, attach) => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, format, type, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attach, gl.TEXTURE_2D, t, 0);
    return t;
  };

  const color  = tex(gl.RGBA8,  gl.RGBA,    gl.UNSIGNED_BYTE, gl.COLOR_ATTACHMENT0);
  const normal = tex(gl.RGBA16F, gl.RGBA,   gl.HALF_FLOAT,    gl.COLOR_ATTACHMENT1);
  const depth  = tex(gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, gl.DEPTH_ATTACHMENT);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (status !== gl.FRAMEBUFFER_COMPLETE)
    throw new Error('G-buffer incomplete: 0x' + status.toString(16));
  return { fbo, color, normal, depth, w, h };
}
