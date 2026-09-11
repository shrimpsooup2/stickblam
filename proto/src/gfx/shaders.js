// All GLSL in one place. The look is built from three ideas in
// docs/VISUAL_DIRECTION.md: two-tone toon ramp, screen-space cross-hatching for
// shadow, and paper grain that lives in SCREEN space so the whole frame reads as
// one sheet rather than as textured 3D.

const HEAD = `#version 300 es
precision highp float;
`;

// ---------------------------------------------------------------- geometry --
export const BOX_VS = HEAD + `
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec3 iCenter;
layout(location=3) in vec3 iSize;
layout(location=4) in vec2 iTone;      // x = base tone, y = surface style

uniform mat4 uViewProj;

out vec3 vWorld;
out vec3 vNormal;
out float vTone;
out float vStyle;

void main(){
  vec3 world = iCenter + aPos * iSize;
  vWorld  = world;
  vNormal = aNormal;
  vTone   = iTone.x;
  vStyle  = iTone.y;
  gl_Position = uViewProj * vec4(world, 1.0);
}`;

export const BOX_FS = HEAD + `
in vec3 vWorld;
in vec3 vNormal;
in float vTone;
in float vStyle;

layout(location=0) out vec4 oColor;
layout(location=1) out vec4 oNormalDepth;

uniform vec3  uLightDir;
uniform float uFar;
uniform vec3  uCamPos;

// Hand-drawn rule: nothing is perfectly straight. Nudge the ruled-paper lines
// with a slow wobble so they read as drawn rather than printed.
float wobble(float x){
  return sin(x * 1.7) * 0.012 + sin(x * 5.3 + 1.7) * 0.005;
}

float ruled(vec2 p){
  // blue ruled lines every 0.5m, a red margin line every 16m
  float y = p.y + wobble(p.x);
  float line = smoothstep(0.028, 0.0, abs(fract(y * 2.0) - 0.5) / 2.0);
  float x = p.x + wobble(p.y);
  float margin = smoothstep(0.05, 0.0, abs(fract(x / 16.0) - 0.5) * 16.0 - 0.06);
  return max(line * 0.55, margin * 0.85);
}

void main(){
  vec3 n = normalize(vNormal);
  float ndl = dot(n, normalize(uLightDir));

  // two-tone ramp -- no gradient, ever
  float band = ndl > 0.15 ? 1.0 : 0.62;
  float tone = vTone * band;

  // ruled paper on up-facing surfaces
  if (vStyle > 0.5 && n.y > 0.5) {
    float r = ruled(vWorld.xz);
    tone = mix(tone, tone * 0.74, r);
  }
  // faint grid on walls so motion is readable against them
  if (vStyle > 1.5) {
    vec2 g = abs(fract(vWorld.xy * 0.5) - 0.5);
    float grid = smoothstep(0.47, 0.5, max(g.x, g.y));
    tone = mix(tone, tone * 0.88, grid);
  }

  oColor = vec4(vec3(tone), 1.0);
  float dist = length(vWorld - uCamPos) / uFar;
  oNormalDepth = vec4(n * 0.5 + 0.5, dist);
}`;

// -------------------------------------------------------------- billboards --
export const SPRITE_VS = HEAD + `
layout(location=0) in vec2 aCorner;     // -0.5..0.5 quad
layout(location=1) in vec4 iPos;        // xyz = world foot position, w = height
layout(location=2) in vec4 iUV;         // atlas rect: x,y,w,h
layout(location=3) in vec4 iParams;     // x = width scale (flip/thin), y = ink, z = lean, w = roll

uniform mat4 uViewProj;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uCamPos;

out vec2 vUV;
out float vInk;
out float vDist;

void main(){
  float h = iPos.w;
  float w = h * 0.62 * iParams.x;
  // roll the quad about its own centre, so a ball visibly tumbles
  vec2 c = vec2(aCorner.x, aCorner.y);
  float rs = sin(iParams.w), rc = cos(iParams.w);
  vec2 rr = vec2(c.x * rc - c.y * rs, c.x * rs + c.y * rc);
  vec3 world = iPos.xyz
             + uRight * (rr.x * w)
             + uUp    * ((rr.y + 0.5) * h);
  world.x += iParams.z * (aCorner.y + 0.5);
  vUV  = vec2(iUV.x + (aCorner.x + 0.5) * iUV.z, iUV.y + (0.5 - aCorner.y) * iUV.w);
  vInk = iParams.y;
  vDist = length(world - uCamPos);
  gl_Position = uViewProj * vec4(world, 1.0);
}`;

export const SPRITE_FS = HEAD + `
in vec2 vUV;
in float vInk;
in float vDist;
layout(location=0) out vec4 oColor;
layout(location=1) out vec4 oNormalDepth;

uniform sampler2D uAtlas;
uniform vec2 uAtlasTexel;

void main(){
  // A negative LOD bias plus an alpha re-sharpen keeps the linework present at
  // range. Without it a stickman dissolves past ~15m: the mip chain averages a
  // 2px stroke toward transparent and the alpha test then removes it entirely.
  // Ink bleeds on paper. Dilating the strokes with distance keeps a stickman
  // legible once it is only ~20px tall, where a sub-pixel line would otherwise
  // average into nothing. This is the Phase 0 readability gate.
  float bleed = clamp(vDist / 22.0, 0.0, 1.0);
  vec2 e = uAtlasTexel * (1.0 + bleed * 3.0);
  float a4 = texture(uAtlas, vUV, -0.65).a;
  a4 = max(a4, texture(uAtlas, vUV + vec2( e.x, 0.0), -0.65).a);
  a4 = max(a4, texture(uAtlas, vUV + vec2(-e.x, 0.0), -0.65).a);
  a4 = max(a4, texture(uAtlas, vUV + vec2(0.0,  e.y), -0.65).a);
  a4 = max(a4, texture(uAtlas, vUV + vec2(0.0, -e.y), -0.65).a);
  float a = smoothstep(0.10, 0.42, mix(texture(uAtlas, vUV, -0.65).a, a4, bleed));
  if (a < 0.30) discard;
  // Ink is the only true black in the world; a loaded player renders darker.
  float tone = mix(0.30, 0.02, vInk);
  tone = mix(0.86, tone, a);        // soften only the true stroke edges
  oColor = vec4(vec3(tone), 1.0);
  oNormalDepth = vec4(0.5, 0.5, 1.0, gl_FragCoord.z * 0.999);
}`;

// ------------------------------------------------------------------- lines --
export const LINE_VS = HEAD + `
layout(location=0) in vec3 aPos;
layout(location=1) in float aInk;
uniform mat4 uViewProj;
out float vInk;
void main(){ vInk = aInk; gl_Position = uViewProj * vec4(aPos, 1.0); }`;

export const LINE_FS = HEAD + `
in float vInk;
layout(location=0) out vec4 oColor;
layout(location=1) out vec4 oNormalDepth;
void main(){
  oColor = vec4(vec3(0.04), vInk);
  oNormalDepth = vec4(0.5, 0.5, 1.0, gl_FragCoord.z);
}`;

// ------------------------------------------------------------- viewmodel ----
// A screen-space quad drawn into the g-buffer, so the grain, hatching and
// outline passes treat the weapon as part of the same sheet of paper.
export const VM_VS = HEAD + `
layout(location=0) in vec2 aCorner;
uniform vec4 uRect;      // cx, cy, halfW, halfH in NDC
uniform float uRot;
uniform vec2 uCell;      // atlas cell origin + size in UV (x, width)
uniform float uAspect;
out vec2 vUV;
void main(){
  vec2 p = aCorner * uRect.zw;
  float c = cos(uRot), s = sin(uRot);
  p = vec2(p.x * c - p.y * s * uAspect, p.x * s / uAspect + p.y * c);
  vUV = vec2(uCell.x + (aCorner.x + 0.5) * uCell.y, 0.5 - aCorner.y);
  gl_Position = vec4(uRect.xy + p, 0.0, 1.0);
}`;

export const VM_FS = HEAD + `
in vec2 vUV;
layout(location=0) out vec4 oColor;
layout(location=1) out vec4 oNormalDepth;
uniform sampler2D uGun;
void main(){
  float a = smoothstep(0.34, 0.56, texture(uGun, vUV).a);
  if (a < 0.35) discard;
  oColor = vec4(vec3(mix(0.75, 0.05, a)), 1.0);
  oNormalDepth = vec4(0.5, 0.5, 1.0, 0.00015);   // nearest depth: never outlined against the world
}`;

// -------------------------------------------------------------------- post --
export const POST_VS = HEAD + `
layout(location=0) in vec2 aPos;
out vec2 vUV;
void main(){ vUV = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

export const POST_FS = HEAD + `
in vec2 vUV;
out vec4 oColor;

uniform sampler2D uColor;
uniform sampler2D uNormalDepth;
uniform vec2  uTexel;
uniform float uTime;
uniform float uBoil;        // quantised time: the grain redraws at 8fps, not 60
uniform float uHatch;
uniform float uGrain;
uniform float uOutline;

float hash(vec2 p){
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

// Screen-space cross-hatching. Shadow is drawn with a pen, never with a gradient.
float hatch(vec2 frag, float tone){
  float h = 0.0;
  float a = frag.x + frag.y;
  float b = frag.x - frag.y;
  if (tone < 0.72) h = max(h, step(0.62, fract(a * 0.13)));
  if (tone < 0.50) h = max(h, step(0.62, fract(b * 0.13)));
  if (tone < 0.33) h = max(h, step(0.62, fract(a * 0.26 + 0.37)));
  return h;
}

void main(){
  vec3 col = texture(uColor, vUV).rgb;
  vec4 nd  = texture(uNormalDepth, vUV);

  // --- outline ---
  // Depth must be compared RELATIVELY. An absolute threshold fires on every
  // distant surface seen at a grazing angle, which floods the frame with edges.
  float e = 0.0;
  vec3  n0 = nd.xyz * 2.0 - 1.0;    // decode: the buffer stores n*0.5+0.5
  float d0 = nd.w;
  bool sky = d0 > 0.985;
  for (int i = 0; i < 4; i++) {
    vec2 o = (i == 0) ? vec2(1.0, 0.0) : (i == 1) ? vec2(-1.0, 0.0)
           : (i == 2) ? vec2(0.0, 1.0) : vec2(0.0, -1.0);
    // jitter the sample so the outline wobbles like a drawn line
    vec2 j = o * uTexel * (1.0 + 0.5 * hash(floor(gl_FragCoord.xy * 0.5) + uBoil));
    vec4 sm = texture(uNormalDepth, vUV + j);
    float rel = abs(sm.w - d0) / max(d0, 0.004);
    e = max(e, rel * 3.2);
    e = max(e, (1.0 - dot(sm.xyz * 2.0 - 1.0, n0)) * 2.2);
  }
  e = smoothstep(0.42, 0.9, clamp(e, 0.0, 1.0)) * uOutline;
  if (sky) e = 0.0;

  float tone = col.r;
  float h = hatch(gl_FragCoord.xy, tone) * uHatch;
  tone = mix(tone, tone * 0.58, h * (1.0 - smoothstep(0.55, 0.92, tone)));

  // ink is the only true black: outlines go almost all the way down
  tone = mix(tone, 0.04, e);

  // --- paper ---
  // Grain is a SURFACE, not noise: coarse cells, tiny amplitude. At per-pixel
  // scale and high amplitude it reads as television static, not as paper.
  float g = hash(floor(gl_FragCoord.xy / 3.0) + uBoil * 3.0);
  tone *= 1.0 - uGrain * (g - 0.5) * 0.075;
  float fibre = hash(vec2(floor(gl_FragCoord.y / 5.0), floor(uBoil * 0.5)));
  tone *= 1.0 - uGrain * 0.035 * fibre;

  // a few long creases, fixed to the page rather than the frame
  float crease = smoothstep(0.994, 1.0, sin(vUV.x * 7.3 + 1.2) * sin(vUV.y * 3.1));
  tone *= 1.0 - crease * 0.10;

  // very slight corner soiling -- nothing in this world is new
  vec2 c = (vUV - 0.5) * 2.0;
  tone *= 1.0 - 0.09 * dot(c, c) * 0.5;

  oColor = vec4(vec3(clamp(tone, 0.0, 1.0)), 1.0);
}`;
