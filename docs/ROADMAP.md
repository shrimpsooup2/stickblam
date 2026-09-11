# Roadmap, Tech, and Risks

---

## 1. Riskiest assumptions, in order

Build order is driven by risk, not by feature list. These are the things that,
if wrong, invalidate the design. Test them in this order.

1. **Does ink-as-ammo pressure players outward, or just starve them?**
   The whole economy now rests on it: parts burn ink per shot, so nobody can build
   a good gun and turtle. The failure mode is a match where players spend most of
   their time unable to run their build, watching a fun system they can't afford.
   *Tested in Phase 2 alongside the loop. Measure: what fraction of shots fired are
   fired with a full build vs. a dry one? Below ~50% and the rates are wrong.*

2. **Is building mid-match fun, or does it break combat flow?**
   The 2-second vulnerable draw animation is the tensest moment on paper and could
   be the most hated thing in the game. If stopping to build feels bad, the whole
   gimmick needs restructuring (build-at-stations-only, or instant builds).
   *Tested in Phase 2. Cheapest possible version: one gun, one part, two players.*

3. **Is the compatibility system legible under combat pressure?**
   Biggest long-term risk. A system players experience as randomness is worse than
   no system. *Tested in Phase 3 with six parts and three combos — if three combos
   already feel like noise, forty will be catastrophic.*

4. **Does the snowball ruin matches — or is it now over-corrected?**
   There are three independent brakes on getting ahead: the bounty, visible wealth,
   and thirst. That may be one too many. *Tested in Phase 2: track ink-share over
   match time, but also ask the leading player whether winning felt good. A game
   that punishes doing well is its own failure.*

5. **Do flat stickmen read at combat range?**
   A 2D sprite in a 3D space can become an unreadable smudge at 40 metres, and our
   whole art direction is low-contrast greys. *Tested in Phase 0 — it's the
   cheapest test and it gates the art direction.*

6. **Is a monochrome shooter actually playable?**
   Enemy/ally/pickup/hazard separation with no hue is hard. We're betting on the
   ink-is-the-only-black rule to carry it. *Tested in Phase 0. Have a fallback: a
   single accent value reserved for enemies.*

---

## 2. Tech stack

### Recommendation: Godot 4

| | Why |
| --- | --- |
| **Rendering** | Good enough 3D, and trivially easy 2D-sprites-in-3D-space, which is our entire character pipeline. Custom shaders for toon/hatching/paper grain are straightforward. |
| **Netcode** | Built-in high-level multiplayer + ENet. Good enough for 12-player arena at our scope; can drop to raw packets where needed. |
| **Cost** | Free, no revenue share, no licence surprises on a hobby project. |
| **Iteration** | Fast enough to test the Phase 0/1 questions in days rather than weeks. |

**Alternatives considered:**

- **Unity + Fishnet/Mirror** — best-documented netcode path and the largest hiring
  pool. Fine choice; pick it if anyone on the team already knows it. Licensing
  history is the main reason it isn't the default recommendation.
- **Unreal** — netcode is genuinely excellent out of the box, but it's heavyweight
  for a game whose entire asset budget is wobbly line drawings, and the toon
  pipeline would be fighting the engine's strengths.
- **Three.js + Colyseus/geckos.io** — "click a link to play" is a real advantage for
  a party shooter, and our art direction is nearly free to render in a browser. But
  authoritative netcode, anti-cheat and input latency are all hand-rolled. Consider
  only if browser-instant-play is a hard product requirement.

**Decision needed before Phase 1.** Phase 0 is cheap enough to throw away, so
don't let the stack question block starting.

### Netcode shape (whatever the engine)

- **Server-authoritative.** The ink economy is the entire game; a client-authored
  ink total is an invitation.
- **Client-side prediction + server reconciliation** for movement and firing.
- **Lag compensation / rewind** on hitscan. With a 0.4s TTK, unfavourable trades
  are felt immediately.
- **Builds sync as an 8-byte hash**, not a part list. The resolver is deterministic
  on both ends (see [PARTS.md §4](PARTS.md)), so the hash is enough to reconstruct
  and render a full build. This keeps killcams and enemy-build display cheap.
- **Ink transactions are server-only and logged.** Every grant, spend, drop and
  deposit goes through one function. When the economy misbehaves in playtests —
  and it will — you want a readable ledger, not scattered `+= 25` calls.

### Art pipeline

- Characters: **2D sprite sheets**, hand-drawn, 2–3 alternating frames per pose for
  the boil. Deliberately inconsistent. The "poorly drawn" look is only cheap if we
  genuinely commit to it — a polished imitation of bad drawing costs more than bad
  drawing.
- Environment: low-poly geometry, all character from shaders. Model a crate, let the
  toon + outline + hatching pass make it a *drawing* of a crate.
- Three shaders carry the whole look: **toon ramp** (2-band), **outline**
  (view-space, variable width), **screen-space hatching + paper grain**. Build
  these in Phase 0 — they define whether the game is worth making.

---

## 3. Milestones

### Phase 0 — Does it look right? *(~1–2 weeks, single player, throwaway)*

- One grey box room, toon + outline + hatching + paper-grain shaders.
- One flat stickman sprite with boil animation, billboarding.
- Walk, look, jump. One hitscan gun that draws lines on walls.
- **Gate:** stand at 40m, look at a stickman. Can you read it? Is it charming or is
  it mush? Screenshot it and show someone who isn't on the project.

### Phase 1 — Two players shooting *(~3–4 weeks)*

- Stack decision locked. Server-authoritative movement + firing, prediction,
  rewind hitscan.
- 2–8 players, one map, one weapon, respawns, a scoreboard.
- Ink transaction ledger scaffolded (granting nothing yet).
- **Gate:** the shooting feels good with 80ms of simulated latency. Nothing about
  ink matters yet — if the base shooter isn't fun, no economy saves it.

### Phase 2 — The loop *(~4 weeks)* ← the real test

- Kills grant ink. Death drops Blots and fills the Well.
- **Ink is ammo:** per-part nibs, Draw rates, auto re-wetting from the pocket, and
  the free-firing bare weapon. This is the core of the phase.
- **One** weapon, **three** parts, no compatibility rules at all — just stacking.
- The 2-second vulnerable draw animation.
- Telemetry: ink-share over time, builds-per-player-per-match, time-to-first-part,
  and **fraction of shots fired with a full build**.
- **Gate:** answers risks #1, #2 and #4. Does the build draining outward-pressure
  players, or just frustrate them? Does stopping to build feel tense-good or
  tense-bad? Does the leader run away with it? Be genuinely willing to restructure.

### Phase 3 — Compatibility *(~4 weeks)*

- Tag system, resolver, the five tiers, build hashing.
- Six parts, three Combos, one Bleed, zero Masterpieces.
- Preview glyphs in the hand. Combo audio stings. Killcam build display.
- **Gate:** answers risk #2. Ask playtesters to explain what their gun does. If
  they can't, stop and fix legibility before adding a single part.

### Phase 4 — Breadth *(~6 weeks)*

- Full 8-weapon roster with slot layouts, ban lists, allowed media.
- Media system with its global rules and per-medium Draw rates (including Marker
  slot-bleed).
- ~30 parts, ~18 Combos, ~6 Bleeds, ~5 Masterpieces.
- **Instruction cards:** map spawns, 4-slot inventory, death drops, Tracing and
  generation degradation.
- Inkwell stations, the Signature. Second map.
- **Gate:** a full match is legible, and **two scarcities don't deadlock**. If
  players routinely sit on ink they can't spend and cards they can't afford, make
  cards more generous before anything else.

### Phase 5 — Mural *(~4 weeks)*

- Mural mode with deposit-vs-build tension. Closed Bottle economy variant.
- The mural as a self-drawing scoreboard.
- Deficit stipend tuning.
- **Gate:** does anyone ever choose to deposit instead of build? If the answer is
  "only when they've got nothing to buy," the mode's central trade has failed and
  needs stronger incentives.

### Phase 6 — Everything else

Erasable geometry persistence, Flipbook mode, the Compendium, the Hand as an
ambient presence, page-turn transitions, map damage accumulation, the full audio
pass, all the movement verbs (Edge-On, Flatten, Paper Glide, Crumple) tuned
properly.

---

## 4. What to explicitly *not* build yet

- Progression, unlocks, cosmetics, battle pass. Every one of these is a distraction
  from finding out whether the core loop works.
- Matchmaking, ranked, anti-cheat. Playtest with friends over direct connect for
  as long as possible.
- More than two maps before Phase 4.
- Any weapon beyond the Biro before Phase 4. The temptation to build the fun
  roster early is strong and it will hide problems in the economy.

---

## 5. Repo structure (proposed)

```
stickblam/
  docs/            design documents (this folder)
  data/            parts, weapons, combos, tuning — as data files, not code
    parts/
    weapons/
    tables/        interaction + masterpiece tables
    cards/         Instruction spawn tables, rarity, generation curves
    tuning.yaml    every economy number in one place
  src/
    net/           transport, replication, prediction, reconciliation
    econ/          ink ledger, drops, Well, nib drain  — server-only
    build/         tag resolver, build hashing
    combat/        weapons, projectiles, damage
    player/        movement verbs, flatness states
    render/        shaders, boil animation
  assets/
  tools/           table validators, balance sims
```

**`data/tuning.yaml` holding every economy number in one file is not a nicety.**
We are going to retune this constantly, ideally without recompiling, ideally
mid-playtest.

**`tools/` should include a balance sim early** — a headless model of the ink
economy where you can run 10,000 matches and watch the leader's ink-share curve.
Cheaper than a playtest for answering "does this snowball."

---

## 6. Immediate next steps

1. **Argue with the open questions** in each doc. They're the parts most likely to
   be wrong, and they're cheap to change now.
2. **Lock the stack** (Godot 4 unless someone has a strong Unity preference).
3. **Start Phase 0.** The shader test is a few days and it determines whether this
   game is worth making. Nothing else should start before we've looked at a
   stickman standing in a hatched grey room and felt something.
