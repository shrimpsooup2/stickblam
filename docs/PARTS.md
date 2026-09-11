# Scrawls — Parts, Media, and Compatibility

A **Scrawl** is a part you draw onto your weapon with ink. This document specifies
how they're described, how they interact, and what the launch library looks like.

---

## 1. The authoring problem (read this first)

The naive version of "some parts combine, some conflict" is a hand-written
compatibility matrix. With 40 parts that's 780 pairs and 9,880 triples. Nobody
can author that, nobody can balance it, and nobody can remember it.

**The fix: parts don't interact — tags do.**

Every Scrawl carries a small set of mechanical **tags**. Interaction rules are
written against *tags*, not part IDs. One rule — `SPLIT + HOMING → Flock` — covers
every splitter part combined with every homing part, forever, including ones we
add next year. Authoring cost goes from quadratic to linear, and the system stays
learnable because players learn ~12 tags, not 40 parts.

This is the single most important architectural decision in the project.

---

## 2. Anatomy of a Scrawl

```yaml
id: splitter_nib
name: "Splitter Nib"
slot: MUZZLE
medium: PEN
tags: [SPLIT, PROJECTILE]
cost: 30
effect:
  projectile_count: +1
  damage_mult: 0.65
art: "a nib with a crack down the middle, drawn slightly wrong"
```

### Slot

Where on the weapon it goes. `MUZZLE · BODY · SIGHT · GRIP · STOCK · MAGAZINE ·
RESERVOIR · NOZZLE`. Each weapon exposes a specific set — see
[DESIGN.md §4](DESIGN.md).

### Medium

What it's drawn with. Medium is the *personality* layer — it gives every part a
global character before its specific effect, and it's the main axis of visual
distinction. Since the world is monochrome, **media are distinguished by line
quality and texture, not colour.**

| Medium | Cost | Character | Global rule |
| --- | --- | --- | --- |
| **Pencil** | Cheap | Precise, faint, provisional | Weaker effects, but **refundable** — erase your own pencil part for 70% back. Vulnerable to enemy `ERASE`. |
| **Pen** | Standard | Reliable, permanent | Immune to `ERASE`. Rarely *blots* — a 2% chance a shot misfires into a splatter. |
| **Marker** | High | Bold, loud, uncontained | **Bleeds into adjacent slots.** Marker parts force interactions with their neighbours whether you wanted them or not. |
| **Charcoal** | Mid | Filthy, high-impact | Highest raw damage. Leaves residue clouds that obscure vision — including yours. |
| **Crayon** | Cheapest | Waxy, childish, chaotic | Effects have a randomised magnitude. Immune to water/wash effects. |
| **Watercolour** | Mid | Spreading, diluting | Area effects, low direct damage. **Washes other ink** — strips enemy Pencil parts on hit. |
| **Whiteout** | Rare | Anti-ink | Erases. Can remove enemy parts, carve level geometry, and (on some parts) erase *your own hitbox* briefly. |
| **Highlighter** | Cheap | Non-lethal, informational | Cannot add damage. Marks, reveals, tags. Support-only. |

Weapons declare `allowed_media`. The **Stapler** allows none of them — it takes
only `PHYSICAL` parts, which is how we get a weapon that is genuinely
incompatible with most of the library.

### Tags

The mechanical verbs. These are what rules are written against. Launch set,
deliberately small:

`SPLIT` `HOMING` `RICOCHET` `PIERCE` `SPRAY` `AOE` `ERASE` `PRECISION` `ARMOR`
`CHAOS` `PHYSICAL` `MARK` `DRAIN` `PROJECTILE`

**Fourteen tags. Hold this line.** Every tag we add multiplies the interaction
surface and the player's memory burden. New parts should reuse existing tags
almost always.

---

## 3. The five interaction tiers

When parts sit on a weapon together, each pair (and each triple) resolves to one
of five outcomes. Crucially, **conflict is usually not a wall — it's a worse
result.** "You can't do that" is a boring answer; "you can do that and it comes
out ugly" is funny, teachable, and occasionally viable.

| Tier | In-game name | What happens | UI glyph |
| --- | --- | --- | --- |
| 0 | **Blocked** | Physically cannot be drawn. Wrong slot, banned tag, or banned medium. | ✗ (greyed out) |
| 1 | **Bleed** | It installs, but the inks run together. Both parts get worse, and a comedic side-effect appears. | two lines running into each other |
| 2 | **Plain** | No interaction. The parts stack their stats and mind their own business. | a clean straight line |
| 3 | **Combo** | Named emergent effect. Usually better than the sum. | two lines braided |
| 4 | **Masterpiece** | Three parts resolve into one named effect that overrides the constituent pairs. | a small flourish / signature |

Only Blocked is a hard no, and Blocked is always a *structural* fact (slot,
weapon ban, medium ban) — never a taste judgement. That distinction keeps the
rules predictable: if two parts both fit, they'll always *do* something.

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
     look up key in INTERACTION_TABLE -> COMBO(id) | BLEED(severity) | PLAIN
     (first match wins; table is ordered by specificity)

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

6. HASH -> 8-byte build signature for network sync + killcam display
```

**Ordering note:** parts are stored in slot order, so `(a,b)` and `(b,a)` can't
produce different builds. Tag pairs are sorted before lookup. Determinism is
non-negotiable.

---

## 5. The tables

### 5.1 Combos (pairs) — the launch set

Target: **~24 shipped pairs.** More than that and nobody learns them.

| Tags | Name | Effect |
| --- | --- | --- |
| `SPLIT + HOMING` | **Flock** | Each fork independently seeks. Terrifying, low per-hit damage. |
| `SPLIT + SPLIT` | **Fractal** | Forks fork. Exponential count, tiny damage each. A cloud of dots. |
| `SPLIT + PIERCE` | **Rake** | Fires a parallel comb of lines that all penetrate. |
| `PIERCE + RICOCHET` | **Cat's Cradle** | The line bounces *and* continues, stitching a room together. |
| `PIERCE + ERASE` | **Redaction** | Erases a tunnel clean through level geometry. Permanently changes the map. |
| `SPRAY + AOE` | **Wash** | Wide short-range zone paint. Denies a corridor. |
| `SPRAY + CHAOS` | **Scribble** | Wild inaccuracy, doubled fire rate. Deeply stupid, occasionally correct. |
| `AOE + DRAIN` | **Siphon Pool** | Ink pools you create drain wet ink from enemies standing in them. |
| `ARMOR + CHAOS` | **Crumple Guard** | Damage taken is randomised 0.3×–1.7×. Gambling with your life. |
| `MARK + HOMING` | **Guided Hand** | Your shots seek anything you've marked, through anything. |
| `MARK + DRAIN` | **Bounty** | Marked enemies drop +50% Blots on death. The support player's jackpot. |
| `ERASE + AOE` | **Rub Out** | A wide erase cone. Strips parts off everyone in front of you. |
| `ERASE + PRECISION` | **Surgical Erasure** | Strips one *specific* chosen part instead of a random one. |
| `PRECISION + PIERCE` | **Ruled Line** | Perfectly straight infinite-range hitscan, heavy damage, long recovery. |
| `RICOCHET + AOE` | **Splatterball** | Bouncing blob that splashes on every bounce. |
| `HOMING + PHYSICAL` | **Bent Staple** | Staples curve. Ink-free tracking for the broke player. |
| `ARMOR + PHYSICAL` | **Stapled Plating** | Flat damage reduction, cannot be erased. |
| `CHAOS + CHAOS` | **Total Nonsense** | Every shot picks a random other combo's behaviour for that shot. |

*(Six more slots reserved for playtest discoveries. Don't fill them from a
spreadsheet — fill them from things players tried.)*

### 5.2 Bleeds (pairs that fight) — the funny failures

| Tags | Name | What goes wrong |
| --- | --- | --- |
| `HOMING + RICOCHET` | **Indecision** | Both want to steer. Shots wander, curve back, occasionally hit you. |
| `PRECISION + SPRAY` | **Shaky Hand** | The scope is drawn on a gun that can't hold still. Zoomed *and* inaccurate. |
| `AOE + PIERCE` | **Thin Blast** | The blast wants to spread, the pierce wants a line. Both get weaker. |
| `ERASE + ARMOR` | **Self-Erasing** | Your eraser eats your own plating. Armour decays while you shoot. |
| `WHITEOUT medium + any PENCIL part` | **Overpainted** | The whiteout covers your own pencil part. It stops working until you redraw it. |
| `WATERCOLOUR + CHARCOAL` | **Mud** | Everything goes grey and smeary. Both effects at 60%, and your own vision fogs. |

Bleeds should be **funny first, punishing second.** A player who makes a Bleed
should laugh, not rage-quit. Tune the penalties shallow (≈20–30%) and make the
side effect loud.

### 5.3 Masterpieces (triples)

Target: **~8 shipped.** These are the ceiling of the system and should be rare
enough that seeing one is an event.

| Tags | Name | Effect |
| --- | --- | --- |
| `SPLIT + HOMING + ERASE` | **The Critic** | Seeking forks, each strips one part from whoever it hits. The anti-snowball nuke. |
| `PIERCE + PRECISION + MARK` | **Final Draft** | One shot per magazine. Hitscan, infinite range, marks on kill, enormous damage. |
| `SPRAY + AOE + DRAIN` | **Flood** | Paint an area that drains ink from every enemy in it into your pocket. |
| `RICOCHET + SPLIT + CHAOS` | **Scribble Storm** | The room fills with bouncing forking nonsense for 3 seconds. |
| `ARMOR + PHYSICAL + MARK` | **Sandwich Board** | Heavy armour; everyone who shoots you is marked for your team. |
| `AOE + ERASE + RICOCHET` | **Eraser Shavings** | Bouncing erase blobs that also chew holes in the level. Map vandalism as a playstyle. |
| `HOMING + MARK + DRAIN` | **Debt Collector** | Marked enemies leak ink to you continuously; your shots find them anywhere. |
| `CHAOS + CHAOS + CHAOS` | **Masterpiece** | Nobody knows. Rerolls its entire behaviour every 5 seconds. Literally named *Masterpiece*, sarcastically. |

---

## 6. Making it legible (the #1 risk)

A combinatorial system players can't read is indistinguishable from randomness.
Everything below is non-optional.

**Before you commit:**
- The hand shows each Scrawl as a **big hand-drawn icon**, not a text block.
- Hovering a Scrawl previews its result tier against your current build as a
  single glyph (✗ / running lines / clean line / braid / flourish). You can see
  "this will Bleed" before you spend.
- The preview names the combo if there is one. Discovery is about *what it does*,
  not *whether something happens*.

**When it fires:**
- **Every combo has a unique audio sting** on first activation each life.
- Every combo visibly changes the weapon's drawing and its muzzle mark. A Flock
  build *looks* like a Flock build from across the map.
- Masterpieces give the player a visible scribble-halo. Everyone in the match
  should know someone just hit one.

**After you die:**
- **The killcam shows the killer's full build**, part by part, with combos
  highlighted and named. This is the main teaching channel — most players will
  learn the system by being killed by it, which is thematically correct.

**Compendium:** a persistent, cross-match record of combos you've personally
discovered. Undiscovered entries show as blank spaces with a question mark. This
turns the combinatorics into a collection, which is the difference between
"confusing" and "a thing to chase."

---

## 7. Balance guardrails

- **Cost scales with part count.** Part *n* on a weapon costs `base × (1 + 0.25n)`.
  Natural soft cap without a hard rule.
- **No combo may exceed ~1.6× the DPS of a bare weapon.** Combos should change
  *how* you kill, not just how fast. The moment a combo is strictly a damage
  multiplier, the draft becomes a slot machine for one card.
- **Every Masterpiece needs a counter that a broke player can access.** Usually the
  Eraser. If a Masterpiece has no answer available to someone with 30 ink, it's
  not shippable.
- **Bleed penalties stay under 30%.** They're jokes, not traps.
- **Ban lists stay short.** A weapon banning more than 3 tags feels arbitrary
  rather than characterful.

---

## 8. Open questions

1. **Does Marker's slot-bleed create more interesting decisions or just
   frustration?** It's the most novel rule here and also the most likely to feel
   like the game cheating. Prototype on the Marker shotgun only; expand only if it
   lands.
2. **Should Blocked parts be visible in your hand at all?** Showing them teaches
   the rules; hiding them reduces dead draws. Leaning toward showing them greyed
   out with the reason, because "the Fineliner won't take a Scribble Muzzle" is
   information worth having.
3. **Are 14 tags too many or too few?** Too few and every combo feels the same;
   too many and nothing is learnable. 14 is a guess. Expect to cut to 11.
4. **Should Masterpieces be craftable on purpose, or only stumbled into?** If the
   draft can be steered toward a specific triple, the best players will always run
   the same one. Some deliberate friction in the draft may be healthy.
5. **What happens when a combo's constituent part is erased mid-fight?** The combo
   should visibly *break* — a snap sound, the halo dying — rather than silently
   downgrading. Make loss loud.
