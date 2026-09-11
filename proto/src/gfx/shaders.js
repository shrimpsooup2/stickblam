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
out float vBase;
out float vSeed;

void main(){
  vec3 world = iCenter + aPos * iSize;
  vWorld  = world;
  vNormal = aNormal;
  vTone   = iTone.x;
  vStyle  = iTone.y;
  vBase   = iCenter.y - iSize.y * 0.5;
  // Identical boxes must not fill with an identical value. One drawing is not
  // a tiling: the wash is uneven from shape to shape.
  vSeed   = fract(sin(dot(iCenter, vec3(12.98, 78.23, 37.72))) * 43758.5453);
  gl_Position = uViewProj * vec4(world, 1.0);
}`;

export const BOX_FS = HEAD + `
in vec3 vWorld;
in vec3 vNormal;
in float vTone;
in float vStyle;
in float vBase;
in float vSeed;

layout(location=0) out vec4 oColor;
layout(location=1) out vec4 oNormalDepth;

uniform vec3  uLightDir;
uniform float uFar;
uniform vec3  uCamPos;

float h11(float n){ return fract(sin(n * 78.233) * 43758.5453); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(41.7, 289.1))) * 43758.5453); }

// Repeated lines are the fastest way to look like a CAD texture. Every line
// here bows on its own, carries its own weight, and drops segments where the
// nib skipped -- so a floor reads as ruled paper somebody drew on, not as a
// tiled bitmap.
float drawnLines(vec2 p, float spacing, float seedOff){
  float bow = sin(p.x * 0.27 + seedOff) * 0.19 + sin(p.x * 0.83 + 2.1) * 0.06;
  float y   = (p.y + bow) / spacing;
  float idx = floor(y);
  float f   = fract(y) - 0.5;
  float weight = 0.45 + 0.55 * h11(idx * 3.7 + seedOff);
  float gap    = step(0.22, h21(vec2(idx, floor(p.x / spacing * 0.55))));
  return smoothstep(0.10, 0.02, abs(f)) * weight * gap;
}

void main(){
  vec3 n = normalize(vNormal);
  float ndl = dot(n, normalize(uLightDir));

  // Flat fills only. The reference leaves lit faces empty and hatches the
  // shadowed one, so lit sits near paper and shade drops into the hatch range.
  float band = ndl > 0.15 ? 1.0 : (n.y < -0.5 ? 0.50 : 0.66);
  // Pulling every surface this hard toward paper left the whole frame inside a
  // single palette step: a white ground, white faces, and the linework doing
  // all the work. A drawing still has values -- keep real separation between
  // the authored tones and let the haze close it with distance instead.
  float tone = mix(0.96, vTone, 0.50) * band;
  tone *= 0.95 + 0.10 * vSeed;               // per-shape unevenness

  // Surface marks, projected onto whichever face this actually is -- the old
  // version used world xy on every wall, which slid sideways on half of them.
  vec2 face = abs(n.y) > 0.5 ? vWorld.xz : (abs(n.x) > 0.5 ? vWorld.zy : vWorld.xy);
  if (vStyle > 0.5 && n.y > 0.5)
    tone = mix(tone, tone * 0.66, drawnLines(face, 2.8, vSeed * 9.0));
  if (vStyle > 1.5)
    tone = mix(tone, tone * 0.88, drawnLines(face.yx, 2.6, 4.0 + vSeed * 9.0) * 0.7);

  // --- grounding: ink pools where a surface meets whatever it stands on ---
  // Without this every box floats, because a monochrome world gives the eye no
  // contact cue at all.
  float above = vWorld.y - vBase;
  float pool = (1.0 - smoothstep(0.0, 0.95, above)) * (1.0 - abs(n.y));
  tone *= 1.0 - pool * 0.30;

  // --- aerial perspective ---
  // The single biggest depth cue available here. Distant geometry washes toward
  // the paper tone, exactly the way a pencil drawing lightens with distance.
  // The post pass quantises this ramp, so it steps rather than gradients.
  float d = length(vWorld - uCamPos);
  float haze = 1.0 - exp(-d * 0.0082);
  tone = mix(tone, 0.93, haze * 0.66);

  oColor = vec4(vec3(tone), 1.0);
  oNormalDepth = vec4(n * 0.5 + 0.5, d / uFar);
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
  float haze = 1.0 - exp(-vDist * 0.0082);
  tone = mix(tone, 0.93, haze * 0.44);   // less than the world: keep players readable
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

// --------------------------------------------------------------- ink edges --
// Every box edge drawn as a real screen-space ribbon. A post-process outline
// can only darken pixels where a discontinuity already exists, so it is always
// one uniform width, always exactly on the silhouette, and always closed --
// which is precisely what makes a frame read as a 3D model with a filter on it.
// A pen does none of those things: it runs past corners, misses them, varies in
// weight, bows, skips, and pools where it stops. All of that lives here.
export const EDGE_VS = HEAD + `
layout(location=0) in vec2 aCorner;    // x: 0|1 along the edge, y: -1|+1 across
layout(location=1) in vec3 iA;
layout(location=2) in vec3 iB;
layout(location=3) in vec2 iMeta;      // x = seed, y = stroke index

uniform mat4 uViewProj;
uniform vec2 uScreen;
uniform float uWidth;
uniform float uOvershoot;
uniform float uWobble;
uniform float uBoil;

out float vAcross;
out float vAlong;
out float vSeed;
out float vWeight;
out float vFade;

float hash(float n){ return fract(sin(n * 78.233) * 43758.5453); }

void main(){
  float seed = iMeta.x + iMeta.y * 131.0;
  float boil = floor(uBoil);

  // The hand re-places the line every boil tick, in WORLD space: the drawing
  // never sits exactly on the shape it describes. This is the difference
  // between a sketch of a box and a box with its wireframe turned on.
  vec3 slip = vec3(hash(seed + boil * 3.0),
                   hash(seed + boil * 3.0 + 41.0),
                   hash(seed + boil * 3.0 + 83.0)) - 0.5;
  vec3 a = iA + slip * 0.05;
  vec3 b = iB - slip.zxy * 0.05;

  vec4 ca = uViewProj * vec4(a, 1.0);
  vec4 cb = uViewProj * vec4(b, 1.0);
  // an edge crossing behind the eye would flip; nudge it in front instead
  if (ca.w < 0.01) ca = mix(ca, cb, (0.01 - ca.w) / (cb.w - ca.w));
  if (cb.w < 0.01) cb = mix(cb, ca, (0.01 - cb.w) / (ca.w - cb.w));

  vec2 sa = ca.xy / ca.w * uScreen * 0.5;
  vec2 sb = cb.xy / cb.w * uScreen * 0.5;
  vec2 dir = sb - sa;
  float len = max(length(dir), 0.0001);
  dir /= len;
  vec2 perp = vec2(-dir.y, dir.x);

  float t = aCorner.x;
  vec4 clip = mix(ca, cb, t);

  // A drawing thins and lightens with distance. A constant pixel width is the
  // clearest single tell of a shader outline rather than a pen.
  float att = clamp(14.0 / (7.0 + clip.w), 0.62, 1.25);

  float r1 = hash(seed + 1.0), r2 = hash(seed + 2.0);
  // each end runs past the corner, or stops short of it, independently
  float over0 = uOvershoot * (1.7 * hash(seed + boil * 7.0 +  5.0) - 0.38);
  float over1 = uOvershoot * (1.7 * hash(seed + boil * 7.0 + 19.0) - 0.38);

  // One slow arc over the whole stroke, plus a small tremor. The tremor has to
  // be SMOOTH: sampling a hash per segment kinks the centreline, and a line
  // made of kinks reads as hairy scribble rather than as a confident stroke
  // that happens not to be straight.
  float ph     = seed + boil * 5.0;
  float bow    = sin(t * 3.14159) * (hash(ph) - 0.5) * uWobble * 3.2;
  float tremor = (sin(t * 9.4 + ph) * 0.55 + sin(t * 21.7 + ph * 1.7) * 0.25)
               * uWobble * 0.7;

  // thickest through the middle, thinning as the nib lifts
  float taper = 0.60 + 0.40 * sin(3.14159 * clamp(t, 0.0, 1.0));
  float w = uWidth * att * (0.80 + 0.60 * r1) * taper;
  float bias = 0.0;
  if (iMeta.y > 0.5) { w *= 0.48; bias = (r2 - 0.5) * uWidth * att * 2.4; }

  vec2 px = mix(sa, sb, t)
          + perp * (aCorner.y * w * 0.5 + bow + tremor + bias)
          + dir * (t > 0.5 ? over1 : -over0) * att;

  gl_Position = vec4(px / (uScreen * 0.5) * clip.w, clip.z - 0.0009 * clip.w, clip.w);
  vAcross = aCorner.y;
  vAlong  = t;
  vSeed   = seed + boil * 13.0;
  vWeight = (iMeta.y > 0.5) ? 0.50 : 1.0;

  // Ink obeys aerial perspective like everything else. Full-black strokes at
  // any range fight the haze and pile every distant box into one mat of
  // overlapping lines -- which is the wireframe look, not a drawing. The
  // re-drawn passes fade out much sooner: somebody going over their linework
  // does it on the thing in front of them, not on the far side of the map.
  vFade = 1.0 - smoothstep(14.0, 85.0, clip.w) * 0.78;
  if (iMeta.y > 0.5) vFade *= 1.0 - smoothstep(7.0, 26.0, clip.w) * 0.92;
  // Nobody draws a line shorter than the nib. Fading strokes out by their
  // SCREEN length -- not their world length -- is what lets a 46-step spiral
  // stair resolve into a shape at range instead of a mat of overlapping
  // scribble. It is the same simplification a person makes by hand.
  vFade *= smoothstep(5.0, 26.0, len);
}`;

export const EDGE_FS = HEAD + `
in float vAcross;
in float vAlong;
in float vSeed;
in float vWeight;
in float vFade;
layout(location=0) out vec4 oColor;
layout(location=1) out vec4 oNormalDepth;
uniform float uInk;
float hash(float n){ return fract(sin(n * 78.233) * 43758.5453); }
void main(){
  float d = abs(vAcross);
  // a nib leaves a hard core with a narrow fringe, not an airbrushed band
  float a = 1.0 - smoothstep(0.80, 1.0, d);
  // pressure varies along the stroke and the nib runs dry in places
  float seg   = floor(vAlong * 7.0);
  float press = 0.74 + 0.26 * (0.5 + 0.5 * sin(vAlong * 7.3 + vSeed));
  float dry   = step(0.035, hash(vSeed + seg * 3.1 + 17.0));
  // ink pools where the pen lands and where it stops
  float pool  = smoothstep(0.22, 0.0, min(vAlong, 1.0 - vAlong));
  a = a * press * dry * vWeight;
  a = clamp(a + pool * 0.45 * (1.0 - d * 0.6), 0.0, 1.0) * uInk * vFade;
  if (a < 0.035) discard;
  oColor = vec4(vec3(0.05), a);
  oNormalDepth = vec4(0.5, 0.5, 1.0, gl_FragCoord.z);
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
uniform float uWarp;

float hash(vec2 p){
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1,0));
  float c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// The drawn palette. A render has a continuous ramp; a drawing has a handful of
// values with ragged borders between them. Quantising is what turns a SHADED
// face into a FILLED one, and it is the single change that stops the frame
// reading as a 3D viewport.
float quantise(float t){
  if (t > 0.905) return 0.955;   // paper: left empty
  if (t > 0.760) return 0.885;   // a light wash
  if (t > 0.590) return 0.755;   // hatched once
  if (t > 0.420) return 0.560;   // hatched twice
  return 0.355;                  // hatched three times
}

// Screen-space hatching. Shadow is drawn with a pen, never with a gradient.
//
// Two things decide whether this reads as pen or as a texture. The duty cycle:
// a hatch line is thin, with plenty of paper showing between strokes. And the
// DIRECTION: two layers at similar spacing crossing each other make a regular
// diamond grid, which is chain-link, not shading. So darker tones get a second
// run in the SAME direction rather than a crossing one, the spacing is jittered
// per stroke, and hatching is reserved for genuinely dark faces -- a mid grey
// is left as a flat fill, the way it would be on paper.
float hatch(vec2 frag, float tone){
  float h = 0.0;
  float wob = sin(frag.y * 0.041) * 2.6 + sin(frag.y * 0.013 + 1.7) * 4.2;
  float a = (frag.x + wob + frag.y * 0.55) * 0.105;

  float ia = floor(a);
  float ja = fract(a) + (hash(vec2(ia, 3.0)) - 0.5) * 0.36;
  if (tone < 0.65)
    h = max(h, step(0.80, ja) * step(0.14, hash(vec2(ia, floor(frag.y / 34.0)))));

  float ib = floor(a + 0.5);
  float jb = fract(a + 0.5) + (hash(vec2(ib, 9.0)) - 0.5) * 0.36;
  if (tone < 0.45)
    h = max(h, step(0.82, jb) * step(0.14, hash(vec2(ib, floor(frag.y / 29.0)))));

  return h;
}

void main(){
  // Everything above wobbles the LINES, but the fills still met the page along
  // a mathematically exact silhouette -- and a perfectly crisp polygon edge is
  // a render no matter what is drawn on top of it. Displacing the whole frame
  // by a couple of pixels of slow noise puts every edge in the picture, fills
  // included, slightly out of true, and ties the frame to one sheet of paper.
  vec2 warp = vec2(vnoise(gl_FragCoord.xy / 29.0 + uBoil * 3.1) - 0.5,
                   vnoise(gl_FragCoord.xy / 29.0 + 11.0 + uBoil * 3.1) - 0.5) * uWarp;
  vec2 uv = vUV + warp * uTexel;
  vec3 col = texture(uColor, uv).rgb;
  vec4 nd  = texture(uNormalDepth, uv);

  // --- outline ---
  // Depth must be compared RELATIVELY. An absolute threshold fires on every
  // distant surface seen at a grazing angle, which floods the frame with edges.
  // This only catches what the ink pass cannot: geometry too small to stroke.
  float e = 0.0;
  vec3  n0 = nd.xyz * 2.0 - 1.0;    // decode: the buffer stores n*0.5+0.5
  float d0 = nd.w;
  bool sky = d0 > 0.985;
  for (int i = 0; i < 4; i++) {
    vec2 o = (i == 0) ? vec2(1.0, 0.0) : (i == 1) ? vec2(-1.0, 0.0)
           : (i == 2) ? vec2(0.0, 1.0) : vec2(0.0, -1.0);
    // jitter the sample so the outline wobbles like a drawn line
    vec2 j = o * uTexel * (1.0 + 0.5 * hash(floor(gl_FragCoord.xy * 0.5) + uBoil));
    vec4 sm = texture(uNormalDepth, uv + j);
    float rel = abs(sm.w - d0) / max(d0, 0.004);
    e = max(e, rel * 3.2);
    e = max(e, (1.0 - dot(sm.xyz * 2.0 - 1.0, n0)) * 2.2);
  }
  e = smoothstep(0.42, 0.9, clamp(e, 0.0, 1.0));
  // break it into strokes: an unbroken 1px rim is the look we are getting away
  // from, so the leftover outline is dashed rather than continuous
  e *= step(0.30, hash(floor(gl_FragCoord.xy / 3.0) + uBoil * 2.0)) * uOutline;
  e *= 1.0 - smoothstep(0.22, 0.80, d0);
  if (sky) e = 0.0;

  float tone = col.r;

  // --- flatten ---
  // Ink and the fringe around it stay continuous; everything above 0.34 snaps
  // to the palette, along a border roughened by paper tooth so the step is a
  // torn edge rather than a contour line.
  // The sky is bare page and must stay bare page. Quantising it put a flat
  // 0.93 field right on a palette threshold, so the roughening flipped it back
  // and forth across the step and the whole upper frame broke into white
  // islands -- damp-paper blotching at a scale nobody would ever draw.
  if (tone > 0.34 && !sky) {
    // The roughening must be LOW frequency. High-frequency noise on a shallow
    // ramp does not tear the border, it dithers it -- the step dissolves into a
    // 100px speckle field and the frame reads as dirt. Big slow wobbles give an
    // edge that wanders like a wash line instead.
    // Amplitude has to stay well under the smallest gap in the palette (0.070).
    // Above that the noise stops tearing the border and starts punching holes
    // through the middle of a fill, which reads as bleach stains.
    // The roughening exists to TEAR A BORDER, not to add noise. Added
    // unconditionally it also punches through the middle of any face whose tone
    // happens to land on a threshold, and a big wall at point-blank range
    // breaks into grey islands -- which is worse than the smooth ramp it
    // replaced. Gating it on the local gradient is the fix: where the tone is
    // flat there is no border to tear, so the perturbation goes to zero and the
    // fill stays a fill. Where a real ramp crosses a threshold the gate opens
    // and the step comes out ragged.
    float rough = (vnoise(gl_FragCoord.xy / 17.0) - 0.5) * 0.038
                + (vnoise(gl_FragCoord.xy /  5.5) - 0.5) * 0.024;
    float gate = clamp(fwidth(tone) * 2600.0, 0.0, 1.0);
    tone = quantise(clamp(tone + rough * gate, 0.0, 1.0));
  }

  float h = hatch(gl_FragCoord.xy, tone) * uHatch;
  tone = mix(tone, tone * 0.50, h);

  // ink is the only true black: outlines go almost all the way down
  tone = mix(tone, 0.05, e);

  // --- paper ---
  // Grain is a SURFACE, not noise: coarse cells, tiny amplitude. At per-pixel
  // scale and high amplitude it reads as television static. The blotches are
  // what keep a flat fill from being a flat fill.
  float blotch = vnoise(gl_FragCoord.xy / 90.0) * 0.6 + vnoise(gl_FragCoord.xy / 210.0) * 0.4;
  tone *= 1.0 - uGrain * (blotch - 0.5) * 0.040;
  float g = hash(floor(gl_FragCoord.xy / 3.0) + uBoil * 3.0);
  tone *= 1.0 - uGrain * (g - 0.5) * 0.055;
  float fibre = hash(vec2(floor(gl_FragCoord.y / 5.0), floor(uBoil * 0.5)));
  tone *= 1.0 - uGrain * 0.025 * fibre;

  // a few long creases, fixed to the page rather than the frame
  float crease = smoothstep(0.994, 1.0, sin(vUV.x * 7.3 + 1.2) * sin(vUV.y * 3.1));
  tone *= 1.0 - crease * 0.10;

  // very slight corner soiling -- nothing in this world is new
  vec2 c = (vUV - 0.5) * 2.0;
  tone *= 1.0 - 0.09 * dot(c, c) * 0.5;

  oColor = vec4(vec3(clamp(tone, 0.0, 1.0)), 1.0);
}`;
