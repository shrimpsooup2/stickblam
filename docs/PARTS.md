# Scrawls — Parts, Instructions, and Compatibility

A **Scrawl** is a part you draw onto your weapon with ink. This document covers
how they're described, how you get the right to draw one, how they interact, and
what the launch library looks like.

---

## 1. The authoring problem (read this first)

The naive version of "some parts combine, some conflict" is a hand-written
compatibility matrix. With 40 parts that's 780 pairs and 9,880 triples. Nobody can
author that, balance it, or remember it.

**The fix: parts don't interact — tags do.**

Every Scrawl carries a small set of mechanical **tags**. Interaction rules are
written against *tags*, not part IDs. One rule — `SPLIT + HOMING → Flock` — covers
every splitter part combined with every homing part, forever, including ones we
add next year. Authoring cost goes from quadratic to linear, and the system stays
learnable because players learn ~14 tags, not 40 parts.

This is the single most important architectural decision in the project.

---

## 2. Anatomy of a Scrawl

```yaml
id: splitter_nib
name: "Splitter Nib"
slot: MUZZLE
medium: PEN
tags: [SPLIT, PROJECTILE]
bound_cost: 30        # ink to draw it (one-time)
draw: 1.0             # ink per shot (ongoing)
nib_capacity: 12      # shots held before it runs dry
effect:
  projectile_count: +1
  damage_mult: 0.65
art: "a nib with a crack down the middle, drawn slightly wrong"
```

Two costs, and they do different jobs. **`bound_cost`** is the barrier to entry —
what it takes to own the part at all. **`draw`** is the upkeep — what it costs to
actually *use* it, every shot, forever. See [INK_ECONOMY.md §4](INK_ECONOMY.md).

### Slot

`MUZZLE · BODY · SIGHT · GRIP · STOCK · MAGAZINE · RESERVOIR · NOZZLE`. Each
weapon exposes a specific set.

### Medium

What it's drawn with — the *personality* layer, and the main axis of visual
distinction. Since the world is monochrome, media are told apart by **line quality
and texture, never colour.**

| Medium | Bound cost | Draw/shot | Global rule |
| --- | --- | --- | --- |
| **Highlighter** | cheap | 0.3 | Cannot add damage. Marks, reveals, tags. Support only. |
| **Pencil** | cheap | 0.5 | Weaker effects, but **refundable** — erase your own for 70% back. Vulnerable to enemy `ERASE`. |
| **Crayon** | cheapest | 0.7 | Randomised effect magnitude. Immune to water and wash effects. |
| **Pen** | standard | 1.0 | Immune to erasing. Rarely *blots* — 2% chance a shot misfires into a splatter. |
| **Watercolour** | mid | 2.0 | Area effects, low direct damage. Washes other ink — strips enemy Pencil parts on hit. |
| **Charcoal** | mid | 2.5 | Highest raw damage. Residue clouds obscure vision, including yours. |
| **Marker** | high | 3.5 | **Bleeds into adjacent slots.** Forces interactions with neighbours whether you wanted them or not. |
| **Whiteout** | rare | 6.0 | Anti-ink. Removes enemy parts, carves geometry, can briefly erase your own hitbox. Burst use only — you cannot sustain this. |

Marker finally earns its cost: bold, wasteful, bleeds everywhere, and drinks like
it. Fiction and economy agree.

Weapons declare `allowed_media`. The **Stapler** allows none of them — it takes
only `PHYSICAL` parts and fires scarce map-found staples, which is how we get a
weapon that sits outside the ink economy entirely.

### Tags

The mechanical verbs — what rules are written against. Launch set:

`SPLIT` `HOMING` `RICOCHET` `PIERCE` `SPRAY` `AOE` `ERASE` `PRECISION` `ARMOR`
`CHAOS` `PHYSICAL` `MARK` `DRAIN` `PROJECTILE`

**Fourteen tags. Hold this line.** Every tag multiplies the interaction surface and
the player's memory burden. New parts should reuse existing tags almost always.

---

## 3. The five interaction tiers

Conflict is usually **not a wall — it's a worse result.** "You can't do that" is a
boring answer; "you can, and it comes out ugly" is funny, teachable, and
occasionally viable.

| Tier | In-game name | What happens | Thirst |
| --- | --- | --- | --- |
| 0 | **Blocked** | Physically cannot be drawn. Wrong slot, banned tag, banned medium. | — |
| 1 | **Bleed** | It installs, but the inks run together. Both parts get worse and a comedic side-effect appears. | ×1.1 |
| 2 | **Plain** | No interaction. The parts stack their stats and mind their own business. | ×1.0 |
| 3 | **Combo** | Named emergent effect, usually better than the sum. | ×1.25 |
| 4 | **Masterpiece** | Three parts resolve into one named effect overriding the constituent pairs. | ×1.5 |

Only Blocked is a hard no, and it's always *structural* (slot, weapon ban, medium
ban) — never a taste judgement. If two parts both fit, they will always *do*
something.

**Better interactions drink more.** That thirst column is the primary balance
lever — see §8.

---

## 4. Resolution algorithm

The resolved build **must be a pure, deterministic function of `(weapon,
ordered_parts[])`**, because client and server both compute it and the result is
network-synced as a short build hash. No randomness at resolve time; randomness
(Crayon, Pen blotting) happens at fire time from a seeded stream.

```
resolve(weapon, parts[]) -> ResolvedBuild

1. STRUCTURE
   for each part:
     if part.slot not in weapon.slots        -> BLOCKED
     if weapon.slots[part.slot] occupied     -> BLOCKED
     if part.tags ∩ weapon.banned_tags ≠ ∅   -> BLOCKED
     if part.medium ∉ weapon.allowed_media   -> BLOCKED

2. ADJACENCY
   for each Marker-medium part:
     copy its tags into adjacent slots as "bled" tags (half weight)

3. PAIRS
   for each unordered pair (a, b) of installed parts:
     key = sorted(a.tags × b.tags)
     look up in INTERACTION_TABLE -> COMBO(id) | BLEED(severity) | PLAIN
     (first match wins; table ordered by specificity)

4. TRIPLES
   for each 3-subset:
     key = sorted(tag-triple)
     look up in MASTERPIECE_TABLE -> MASTERPIECE(id)
     a Masterpiece SUPPRESSES the three pairwise results among its members

5. APPLY  (fixed order, always)
   a. additive stat modifiers      (+damage, +count)
   b. multiplicative modifiers     (×damage, ×firerate)
   c. replacement effects          (combos that change the projectile entirely)
   d. Bleed penalties last         (so Bleed always visibly hurts)

6. THIRST
   for each part: effective_draw = part.draw × (highest tier it participates in)
   (a part in a Masterpiece drinks at ×1.5; an uninvolved part stays ×1.0)

7. HASH -> 8-byte build signature for network sync + killcam display
```

Parts are stored in slot order and tag pairs are sorted before lookup, so `(a,b)`
and `(b,a)` cannot produce different builds. Determinism is non-negotiable.

---

## 5. Instructions — you can't just draw anything

**Parts are gated by a second resource: physical instruction cards.**

An **Instruction** is a scruffy how-to-draw leaflet — a three-panel diagram where
the first panel is a circle, the second panel is two circles, and the third panel
is a fully rendered Homing Arrowhead with no explanation of how you got there.
Everyone has seen this card. It is the correct fiction for this game.

Ink is the *material*. The Instruction is the *recipe*. You need both.

### Why this is better than a draft menu

- It's a **physical object in the world**: found, fought over, carried, traded, lost.
- It creates **map flow** — card spawns are contested ground, independent of kills.
- It makes a build **found rather than rolled**, which is a better story.
- It makes weapon incompatibility *tangible*: holding a great card your gun won't
  take is a real problem with real choices (swap weapons? trade it? drop it?),
  where a greyed-out menu row is just a wall.
- It answers the question the old design ducked — how does your stickman know how
  to draw this? He's holding a leaflet that shows him.

### Rules

- You carry **4 card slots.** Picking up a fifth means dropping something.
- Cards spawn on the map on a rotating timer, and **the dead drop one at random.**
- Drawing a part **consumes** its card.
- **Cards are common; specific cards are rare.** This matters more than any other
  tuning number here — see the warning in §9.

### Generations, and the photocopy problem

This is the good part. Every card has a **generation** number, and you can
**Trace** a card — spend a little ink and ~3 seconds to make a copy.

**Each generation is worse.** A traced card is a copy of a copy: blurrier, with
details lost. The part you draw from it degrades accordingly.

| Gen | Card looks like | Part it produces |
| --- | --- | --- |
| 1 | Crisp original | Full stats |
| 2 | Slightly soft, one panel smudged | −15% effect, −10% bound cost |
| 3 | Grainy, the third panel is guesswork | −30% effect, gains `CHAOS` |
| 4+ | Barely legible grey mush | −50% effect, gains `CHAOS`, halved draw cost |

Consequences worth having:

- **Tracing is how you share.** Copy a card, hand it to a teammate, keep the
  original. Teamplay that isn't shooting.
- **Degraded cards are cheap to run**, so there's a genuine reason to use them —
  a bad copy is not just a worse card, it's a *different kind* of card.
- **A photocopy build is an archetype.** Gen-3+ parts pick up `CHAOS`, and
  `CHAOS + CHAOS` is already a Combo (*Total Nonsense*). A player running nothing
  but bad photocopies is a chaos build that emerged from the economy rather than
  being designed as a class.
- It is **exactly the art direction** — nothing clean, nothing new, everything
  degraded by handling. See [VISUAL_DIRECTION.md](VISUAL_DIRECTION.md).

### Rarity

Two tiers only. **Common** cards (Pencil, Pen, Crayon parts) spawn everywhere.
**Rare** cards (Charcoal, Marker, Watercolour, Whiteout) spawn at contested points
and drop from high-value kills.

There is deliberately **no such thing as a Masterpiece card.** Masterpieces emerge
from tag combinations, so the only way to get one is to hold three specific
Instructions at once, on a weapon that accepts all three, with the ink to draw them
and the thirst budget to run them. That's a real achievement assembled from parts,
not a prize you pick up.

---

## 6. The tables

### 6.1 Combos (pairs) — target ~24 shipped

| Tags | Name | Effect |
| --- | --- | --- |
| `SPLIT + HOMING` | **Flock** | Each fork independently seeks. Terrifying, low per-hit damage. |
| `SPLIT + SPLIT` | **Fractal** | Forks fork. Exponential count, tiny damage each. A cloud of dots. |
| `SPLIT + PIERCE` | **Rake** | A parallel comb of lines that all penetrate. |
| `PIERCE + RICOCHET` | **Cat's Cradle** | The line bounces *and* continues, stitching a room together. |
| `PIERCE + ERASE` | **Redaction** | Erases a tunnel clean through level geometry. Permanently changes the map. |
| `SPRAY + AOE` | **Wash** | Wide short-range zone paint. Denies a corridor. |
| `SPRAY + CHAOS` | **Scribble** | Wild inaccuracy, doubled fire rate. Deeply stupid, occasionally correct. |
| `AOE + DRAIN` | **Siphon Pool** | Your ink pools drain wet ink from enemies standing in them. |
| `ARMOR + CHAOS` | **Crumple Guard** | Damage taken randomised 0.3×–1.7×. Gambling with your life. |
| `MARK + HOMING` | **Guided Hand** | Your shots seek anything you've marked, through anything. |
| `MARK + DRAIN` | **Bounty** | Marked enemies drop +50% Blots on death. The support player's jackpot. |
| `ERASE + AOE` | **Rub Out** | A wide erase cone. Strips parts off everyone in front of you. |
| `ERASE + PRECISION` | **Surgical Erasure** | Strips one *specific* chosen part instead of a random one. |
| `PRECISION + PIERCE` | **Ruled Line** | Perfectly straight infinite-range hitscan. Heavy damage, long recovery. |
| `RICOCHET + AOE` | **Splatterball** | Bouncing blob that splashes on every bounce. |
| `HOMING + PHYSICAL` | **Bent Staple** | Staples curve. Ink-free tracking for the broke player. |
| `ARMOR + PHYSICAL` | **Stapled Plating** | Flat damage reduction, and it cannot be erased. |
| `CHAOS + CHAOS` | **Total Nonsense** | Every shot picks a random other combo's behaviour for that shot. |
| `SPLIT + PROJECTILE` | **Buckshot** | The projectile divides in flight rather than at the muzzle. |
| `DRAIN + PROJECTILE` | **Leech Line** | Every hit siphons a trickle of the target's Pocket ink back to you. |

*Four slots reserved for playtest discoveries. Don't fill them from a spreadsheet
— fill them from things players actually tried.*

### 6.2 Bleeds — the funny failures

| Tags | Name | What goes wrong |
| --- | --- | --- |
| `HOMING + RICOCHET` | **Indecision** | Both want to steer. Shots wander, curve back, occasionally hit you. |
| `PRECISION + SPRAY` | **Shaky Hand** | A scope drawn on a gun that can't hold still. Zoomed *and* inaccurate. |
| `AOE + PIERCE` | **Thin Blast** | The blast wants to spread, the pierce wants a line. Both get weaker. |
| `ERASE + ARMOR` | **Self-Erasing** | Your eraser eats your own plating. Armour decays while you shoot. |
| `CHAOS + PRECISION` | **Wobble** | Precision and chaos cancel. You get neither, and the sight drifts. |
| `MARK + PHYSICAL` | **Blunt Instrument** | Staples won't hold a highlighter mark. It rubs off in seconds. |
| `WHITEOUT medium + PENCIL part` | **Overpainted** | The whiteout covers your own pencil part. It stops working until redrawn. |
| `WATERCOLOUR + CHARCOAL` | **Mud** | Everything goes grey and smeary. Both effects at 60%, and your vision fogs. |

Bleeds are **funny first, punishing second.** Keep penalties shallow (20–30%) and
the side effect loud. A player who makes a Bleed should laugh, not rage-quit.

### 6.3 Masterpieces — target ~8 shipped

| Tags | Name | Effect |
| --- | --- | --- |
| `SPLIT + HOMING + ERASE` | **The Critic** | Seeking forks, each strips one part from whoever it hits. The anti-snowball nuke. |
| `PIERCE + PRECISION + MARK` | **Final Draft** | One shot per magazine. Hitscan, infinite range, marks on kill, enormous damage. |
| `SPRAY + AOE + DRAIN` | **Flood** | Paint an area that drains ink from every enemy in it into your pocket. |
| `RICOCHET + SPLIT + CHAOS` | **Scribble Storm** | The room fills with bouncing forking nonsense for 3 seconds. |
| `ARMOR + PHYSICAL + MARK` | **Sandwich Board** | Heavy armour; everyone who shoots you is marked for your team. |
| `AOE + ERASE + RICOCHET` | **Eraser Shavings** | Bouncing erase blobs that chew holes in the level. Map vandalism as a playstyle. |
| `HOMING + MARK + DRAIN` | **Debt Collector** | Marked enemies leak ink to you continuously; your shots find them anywhere. |
| `CHAOS + CHAOS + CHAOS` | **Masterpiece** | Nobody knows. Rerolls its behaviour every 5 seconds. Named sarcastically. Reachable entirely through bad photocopies. |

---

## 7. Making it legible (the #1 risk)

A combinatorial system players can't read is indistinguishable from randomness.
None of this is optional.

**Before you commit:** Instructions show as big hand-drawn cards, not text blocks.
Holding one up previews its result tier against your current build as a single
glyph (✗ / running lines / clean line / braid / flourish), plus what it does to
your thirst.

**When it fires:** every combo has a unique audio sting on first activation each
life, and visibly changes the weapon's drawing and muzzle mark. A Flock build
*looks* like a Flock build from across the map. Masterpieces give a visible
scribble-halo.

**While it drains:** parts fade toward ghost outlines as their nibs empty, so both
you and your enemy can read ammo state off the weapon itself. **No HUD ammo
counter** — the gun is the counter.

**After you die:** the killcam shows the killer's full build, part by part, combos
named. Most players will learn this system by being killed by it, which is
thematically correct.

**Compendium:** a persistent record of combos you've personally discovered, with
undiscovered entries as blank question-marked spaces. Turns combinatorics into a
collection.

---

## 8. Balance guardrails

- **Thirst is the primary lever.** You do not balance a powerful combo by making it
  weak; you balance it by making it drink. A Masterpiece should stay spectacular
  and simply be unaffordable to run continuously. Burst power, not sustained power.
- **No combo may exceed ~1.6× the DPS of a bare weapon.** Combos change *how* you
  kill, not just how fast. The moment a combo is purely a damage multiplier, cards
  become a slot machine for one prize.
- **Every Masterpiece needs a counter a broke player can reach.** Usually the
  Eraser. If a Masterpiece has no answer available to someone with 30 ink, it isn't
  shippable.
- **The bare weapon always fires free.** Non-negotiable floor — see
  [INK_ECONOMY.md §4](INK_ECONOMY.md).
- **Bleed penalties stay under 30%.** Jokes, not traps.
- **Ban lists stay short.** More than 3 banned tags on a weapon feels arbitrary
  rather than characterful.
- **Bound cost rises per part** (`base × (1 + 0.25n)`) — but consider cutting this.
  Thirst may already be limit enough, and stacking both could over-punish a player
  who is simply doing well.

---

## 9. Open questions

1. **Two scarcities may be one too many.** Ink gates *whether* you can build;
   Instructions gate *what* you can build. If both bind at once, players spend the
   match holding ink they can't spend and cards they can't afford — locked out of
   the best system in the game from two directions. **Cards must be generous.** The
   scarcity should be in *which* card, never in *whether you have one*. Watch this
   above everything else in Phase 4.
2. **Should cards be consumed on use, or learned permanently?** Consumption makes
   them precious and keeps them circulating; permanent learning would make a match
   feel like accumulating a repertoire. Consumption is the default because it keeps
   cards as live map objects, but the alternative is worth one playtest.
3. **Does generation-degradation read, or just feel like being cheated?** A Gen-4
   part that works badly needs to be *visibly* a bad photocopy at the moment you
   pick it up, or players will think the game is broken.
4. **Does the build decomposing mid-fight read as drama or as malfunction?**
   Losing a combo at the worst moment is either the best or the worst thing here.
5. **Does Marker's slot-bleed create decisions or frustration?** Most novel rule in
   the doc, most likely to feel like the game cheating. Prototype on the Marker
   shotgun only.
6. **Are 14 tags too many or too few?** Expect to cut to 11.
