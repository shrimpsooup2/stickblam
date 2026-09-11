# Stickblam — movement prototype

Phase 0/1 of [docs/ROADMAP.md](../docs/ROADMAP.md): the feel test. One room, the
four flatness verbs, and an environment built to measure them.

```bash
python3 -m http.server 8000 --directory proto   # then open localhost:8000
node proto/src/sim/selftest.mjs                 # 37 headless physics checks
```

## Why it is built this way

**`src/sim/` is engine-agnostic and deterministic.** No DOM, no GL, no `Math.random`
in the step path. It advances in whole fixed ticks (1/120s) and the renderer
interpolates between the last two states.

That is not for smoothness — it is because
[ROADMAP Phase 1](../docs/ROADMAP.md) needs server-authoritative netcode, and a
deterministic fixed step is the prerequisite. Building it that way now costs
nothing; retrofitting it later costs everything. `selftest.mjs` asserts that
identical inputs produce bit-identical state.

**No dependencies.** The renderer is ~600 lines of WebGL2. Three.js was the
obvious choice, but the look needed here — two-tone toon ramp, screen-space
cross-hatching, paper grain in screen space, depth+normal outlines — is mostly
fighting a general-purpose material system, and a zero-dependency page has no CDN
to fail.

## Layout

| | |
| --- | --- |
| `src/sim/constants.js` | Every tuning number. The panel edits this live. |
| `src/sim/aabb.js` | Per-axis AABB collision, step-up, wall probe |
| `src/sim/player.js` | Movement model + the four verbs |
| `src/sim/sim.js` | Fixed-timestep driver + render interpolation |
| `src/gfx/sprites.js` | Procedural stickmen — skeleton anchors, regenerated linework |
| `src/gfx/shaders.js` | All GLSL |
| `src/levels/testbed.js` | The test environment |

## The stickmen

The skeleton is a set of **anchor points the pen must pass through**. The strokes
between them are regenerated from scratch at the boil rate (8fps), so the pose
stays on-model while the drawing of it is never the same twice. A stickman
standing still is being re-drawn eight times a second, not shown one picture
repeatedly.

Inside `penStroke`, the perpendicular offset is forced to zero *at* each anchor
and bows freely between them — the line always crosses the points that define the
pose but takes a different route there every time.

## What the testbed measures

| Station | Question |
| --- | --- |
| **Readability range** | Dummies at 10–50m. The Phase 0 gate: can you read a stickman at 40m? |
| **Jump gym** | Ledges either side of the real apex (1.26m), so the ceiling is obvious in play |
| **Stairs** | Does step-up feel like walking, or like bumping? |
| **Glide tower** | 26m drop with range pads at 9/18/27/36m. Can you actually aim on the way down? |
| **Roll tunnel** | A ceiling only a ball fits under |
| **Roll course** | A long run with a kink — does momentum carry the way a ball should? |

## Controls

`WASD` move · `Space` jump · `F` (or Space in air) deploy glide · `Shift` hold to
roll · `Q` Edge-On · right mouse scope · left mouse fire · `V` third person ·
`R` respawn · `H` panel

The crosshair carries the weapon state: it spreads with movement, tightens when
scoped, and greys out whenever you cannot fire.

## Movement model

Quake-family `accelerate`/`friction`, so air control and strafe acceleration fall
out of the wish-speed cap rather than needing a special case. Coyote time, jump
buffering, auto-hop and step-up are all on by default and all tunable.

The four verbs and their tuning live in `constants.js`; the design rationale is in
[docs/DESIGN.md §2](../docs/DESIGN.md).
