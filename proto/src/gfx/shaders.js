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
uniform vec2 uScreen;

out vec3 vWorld;
out vec3 vNormal;
out float vTone;
out float vStyle;
out float vBase;
out float vSeed;
out vec2 vAnchor;

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
  // Where this object sits on the page. Shading is laid out relative to THIS,
  // not to the screen, so the hatching travels with the object instead of the
  // object sliding underneath a fixed screen pattern.
  vec4 cc = uViewProj * vec4(iCenter, 1.0);
  vAnchor = cc.w > 0.001 ? (cc.xy / cc.w * 0.5 + 0.5) * uScreen : vec2(0.0);
  gl_Position = uViewProj * vec4(world, 1.0);
}`;

export const BOX_FS = HEAD + `
in vec3 vWorld;
in vec3 vNormal;
in float vTone;
in float vStyle;
in float vBase;
in float vSeed;
in vec2 vAnchor;

layout(location=0) out vec4 oColor;
layout(location=1) out vec4 oNormalDepth;

uniform vec3  uLightDir;
uniform float uFar;
uniform vec3  uCamPos;
uniform float uHatch;

float h11(float n){ return fract(sin(n * 78.233) * 43758.5453); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(41.7, 289.1))) * 43758.5453); }

float vn(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = h21(i), b = h21(i + vec2(1,0));
  float c = h21(i + vec2(0,1)), d = h21(i + vec2(1,1));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// The drawn palette. A render shades a face with a continuous ramp; a drawing
// has a handful of values with borders between them. Nothing here reaches
// white -- the bare page is the only true white in the world, the same way ink
// is the only true black.
float quantise(float t){
  if (t > 0.905) return 0.925;
  if (t > 0.760) return 0.870;
  if (t > 0.590) return 0.745;
  if (t > 0.420) return 0.555;
  return 0.350;
}

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

// One run of parallel strokes. Thin, with paper showing between them -- fat
// strokes at a low duty cycle cross into each other and the face turns into
// chain-link rather than shading.
float strokes(vec2 p, float dens, float seedOff){
  float wob = sin(p.y * 0.041 + seedOff) * 2.6 + sin(p.y * 0.013 + 1.7) * 4.2;
  float a = (p.x + wob) * dens;
  float i = floor(a);
  float j = fract(a) + (h21(vec2(i, seedOff)) - 0.5) * 0.36;
  return step(0.79, j) * step(0.14, h21(vec2(i, floor(p.y / 33.0) + seedOff)));
}

void main(){
  vec3 n = normalize(vNormal);
  float ndl = dot(n, normalize(uLightDir));

  // Flat fills only. The reference leaves lit faces empty and hatches the
  // shadowed one, so lit sits near paper and shade drops into the hatch range.
  float band = ndl > 0.15 ? 1.0 : (n.y < -0.5 ? 0.50 : 0.66);
  float tone = mix(0.96, vTone, 0.50) * band;
  tone *= 0.93 + 0.14 * vSeed;               // per-shape unevenness

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
  float d = length(vWorld - uCamPos);
  float haze = 1.0 - exp(-d * 0.0082);
  tone = mix(tone, 0.93, haze * 0.66);

  // --- flatten ---
  // The roughening exists to TEAR A BORDER, not to add noise. Added
  // unconditionally it punches through the middle of any face whose tone lands
  // on a threshold, and a wall at point-blank range breaks into grey islands.
  // Gating it on the local gradient is the fix: flat tone, no border to tear.
  float rough = (vn(gl_FragCoord.xy / 17.0) - 0.5) * 0.038
              + (vn(gl_FragCoord.xy /  5.5) - 0.5) * 0.024;
  float gate = clamp(fwidth(tone) * 2600.0, 0.0, 1.0);
  tone = quantise(clamp(tone + rough * gate, 0.0, 1.0));

  // --- shading, per object and per face ---
  // Hatching used to be one global screen-space pattern: every surface in the
  // world carried the identical texture, and the world slid underneath it when
  // the camera moved. Both are unnerving, and for the same reason -- the marks
  // belong to the screen rather than to the thing being drawn.
  //
  // So the pattern is laid out around this object's own position on the page,
  // which makes it travel with the object, and its angle, spacing and even
  // whether it hatches at all vary per object AND per face. Somebody shading a
  // drawing does not use one stroke direction for every plane in the picture,
  // and does not shade every object the same amount.
  float faceId = abs(n.x) > 0.5 ? 0.0 : (abs(n.y) > 0.5 ? 1.0 : 2.0);
  float fs   = fract(vSeed * 13.73 + faceId * 0.41);
  float ang  = (fs - 0.5) * 2.3;
  float dens = 0.085 + 0.05 * fract(vSeed * 3.17 + faceId * 0.7);
  float mode = fract(vSeed * 7.31 + faceId * 0.23);

  vec2 hp = gl_FragCoord.xy - vAnchor;
  vec2 h1 = vec2(hp.x * cos(ang) - hp.y * sin(ang), hp.x * sin(ang) + hp.y * cos(ang));

  float h = 0.0;
  if (mode > 0.20) {                                   // a fifth of faces stay bare
    if (tone < 0.65) h = max(h, strokes(h1, dens, fs * 17.0));
    if (tone < 0.45) {
      if (mode > 0.68) {                               // crossed, on some faces only
        float a2 = ang + 1.15;
        vec2 h2 = vec2(hp.x * cos(a2) - hp.y * sin(a2), hp.x * sin(a2) + hp.y * cos(a2));
        h = max(h, strokes(h2, dens * 0.9, fs * 31.0 + 5.0));
      } else {                                         // or gone over again, same way
        h = max(h, strokes(h1 + vec2(0.5 / dens, 0.0), dens, fs * 23.0 + 9.0));
      }
    }
  }
  tone = mix(tone, tone * 0.50, h * uHatch);

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

uniform sampler2D uAtlas;   // ink coverage, in alpha
uniform sampler2D uMask;    // the scrap's silhouette, in alpha
uniform vec2 uAtlasTexel;
uniform float uFar;

void main(){
  // The scrap decides what exists. Two sheets rather than one RGBA sheet,
  // because filtering a single sheet drags the transparent surround into the
  // paper colour and every torn edge comes back with a grey halo on it.
  float m = texture(uMask, vUV, -0.5).a;
  if (m < 0.45) discard;

  // A negative LOD bias plus an alpha re-sharpen keeps the linework present at
  // range: the mip chain averages a 2px stroke toward nothing and the figure
  // dissolves past ~15m. Ink bleeds on paper, so dilating the strokes with
  // distance is both the fix and the right look.
  float bleed = clamp(vDist / 22.0, 0.0, 1.0);
  vec2 e = uAtlasTexel * (1.0 + bleed * 3.0);
  float a4 = texture(uAtlas, vUV, -0.65).a;
  a4 = max(a4, texture(uAtlas, vUV + vec2( e.x, 0.0), -0.65).a);
  a4 = max(a4, texture(uAtlas, vUV + vec2(-e.x, 0.0), -0.65).a);
  a4 = max(a4, texture(uAtlas, vUV + vec2(0.0,  e.y), -0.65).a);
  a4 = max(a4, texture(uAtlas, vUV + vec2(0.0, -e.y), -0.65).a);
  float a = smoothstep(0.10, 0.42, mix(texture(uAtlas, vUV, -0.65).a, a4, bleed));

  // Ink is the only true black in the world; a loaded player renders darker.
  float ink = mix(0.30, 0.02, vInk);
  // A scrap is brighter than anything in the world (max 0.925) and darker than
  // the bare page (1.0). That ordering is what makes a player pop out of the
  // background without ever being mistaken for sky.
  float tone = mix(0.945, ink, a);          // paper first, ink on top of it
  // the cut edge catches a little shade, so a scrap reads as a thing with a
  // thickness rather than as a hole in the frame
  tone *= 1.0 - (1.0 - smoothstep(0.45, 0.72, m)) * 0.22;
  float haze = 1.0 - exp(-vDist * 0.0082);
  tone = mix(tone, 0.93, haze * 0.44);      // less than the world: stay readable
  oColor = vec4(vec3(tone), 1.0);
  // LINEAR depth, the same convention the boxes write. gl_FragCoord.z is not
  // that: it is ~0.99 for anything past a couple of metres, so the moment the
  // post pass started treating far depth as bare page, every player in the
  // world was flood-filled white. One buffer, one meaning.
  oNormalDepth = vec4(0.5, 0.5, 1.0, vDist / uFar);
}`;

// ------------------------------------------------------------------- lines --
export const LINE_VS = HEAD + `
layout(location=0) in vec3 aPos;
layout(location=1) in float aInk;
uniform mat4 uViewProj;
uniform vec3 uCamPos;
uniform float uFar;
out float vInk;
out float vDepth;
void main(){
  vInk = aInk;
  vDepth = length(aPos - uCamPos) / uFar;
  gl_Position = uViewProj * vec4(aPos, 1.0);
}`;

export const LINE_FS = HEAD + `
in float vInk;
in float vDepth;
layout(location=0) out vec4 oColor;
layout(location=1) out vec4 oNormalDepth;
void main(){
  oColor = vec4(vec3(0.04), vInk);
  oNormalDepth = vec4(0.5, 0.5, 1.0, vDepth);
}`;

// ------------------------------------------------------------- viewmodel ----
// A screen-space quad drawn into the g-buffer, so the grain, hatching and
// outline passes treat the weapon as part of the same sheet of paper.
export const VM_VS = HEAD + `
layout(location=0) in vec2 aCorner;
uniform vec4 uRect;      // cx, cy, halfW, halfH in NDC
uniform float uRot;
uniform vec4 uCell;      // atlas cell rect in UV: x, y, w, h
uniform float uAspect;
out vec2 vUV;
void main(){
  vec2 p = aCorner * uRect.zw;
  float c = cos(uRot), s = sin(uRot);
  p = vec2(p.x * c - p.y * s * uAspect, p.x * s / uAspect + p.y * c);
  vUV = vec2(uCell.x + (aCorner.x + 0.5) * uCell.z,
             uCell.y + (0.5 - aCorner.y) * uCell.w);
  gl_Position = vec4(uRect.xy + p, 0.0, 1.0);
}`;

export const VM_FS = HEAD + `
in vec2 vUV;
layout(location=0) out vec4 oColor;
layout(location=1) out vec4 oNormalDepth;
uniform sampler2D uGun;
uniform sampler2D uGunMask;
void main(){
  // Same two-sheet arrangement as the players: the weapon is a drawing on a
  // scrap, and the scrap is what occludes the world behind it.
  float m = texture(uGunMask, vUV).a;
  if (m < 0.45) discard;
  float a = smoothstep(0.30, 0.58, texture(uGun, vUV).a);
  float tone = mix(0.945, 0.05, a);
  tone *= 1.0 - (1.0 - smoothstep(0.45, 0.72, m)) * 0.25;
  oColor = vec4(vec3(tone), 1.0);
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

void main(){
  // Everything else wobbles the LINES, but the fills still met the page along a
  // mathematically exact silhouette -- and a perfectly crisp polygon edge is a
  // render no matter what is drawn on top of it. Displacing the whole frame by
  // a couple of pixels of slow noise puts every edge slightly out of true and
  // ties the frame to one sheet of paper.
  vec2 warp = vec2(vnoise(gl_FragCoord.xy / 29.0 + uBoil * 3.1) - 0.5,
                   vnoise(gl_FragCoord.xy / 29.0 + 11.0 + uBoil * 3.1) - 0.5) * uWarp;
  vec2 uv = vUV + warp * uTexel;
  vec3 col = texture(uColor, uv).rgb;
  vec4 nd  = texture(uNormalDepth, uv);

  float d0 = nd.w;
  // --- the sky is the bare page ---
  // Grain, blotching, creases and vignette on empty sky give it a surface, and
  // a surface reads as something you could walk into. Nothing is drawn there,
  // so nothing is drawn there: flat, unshaded, and the only true white in the
  // frame, which is what makes it unmistakably NOT a wall.
  if (d0 > 0.985) { oColor = vec4(1.0); return; }

  vec3  n0 = nd.xyz * 2.0 - 1.0;    // decode: the buffer stores n*0.5+0.5
  // --- outline ---
  // Depth must be compared RELATIVELY. An absolute threshold fires on every
  // distant surface seen at a grazing angle, which floods the frame with edges.
  // This only catches what the ink pass cannot: geometry too small to stroke.
  float e = 0.0;
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

  // ink is the only true black: outlines go almost all the way down
  float tone = mix(col.r, 0.05, e);

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
