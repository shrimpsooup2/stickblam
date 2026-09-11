# The Roster

> Generated from `data/`. Regenerate the analysis with `python3 tools/build_matrix.py`.

**Every weapon has exactly 3 slots.** A weapon's identity is (which 3 slot types) +
(banned tags) + (banned media) + base stats. Because slots are *typed*, the combination
space per weapon is `slot1_parts × slot2_parts × slot3_parts` rather than `parts³` —
which is what makes a full 3-D matrix tractable at all. See [MATRIX.md](MATRIX.md).

---

## Weapons

| Weapon | Role | Slots | Bans | Media it can't carry |
| --- | --- | --- | --- | --- |
| **Biro** | Semi-auto pistol. Starting weapon, all-rounder. | Muzzle · Body · Sight | — | — |
| **Fineliner** | Precision rifle. Draws one long exact line. | Muzzle · Sight · Grip | `SPRAY`, `CHAOS` | Crayon, Charcoal |
| **Brush** | SMG. Fast, sloppy, wide. | Muzzle · Grip · Reservoir | `PRECISION` | Whiteout |
| **Marker** | Shotgun. Bold, short, wide strokes. | Muzzle · Body · Grip | `PRECISION` | Pencil, Highlighter |
| **Spraycan** | Launcher. Arcing blobs, area denial. | Muzzle · Body · Reservoir | `PRECISION`, `PIERCE` | Pencil, Pen |
| **Eraser** | Short cone. Low lethality; strips enemy parts. | Body · Grip · Reservoir | `PROJECTILE`, `PIERCE`, `SPLIT` | Charcoal, Marker |
| **Stapler** | Nailgun. Scarce map-found staples, not ink. | Body · Grip · Reservoir | — | **everything except Staple** |
| **Highlighter** | Support beam. Marks enemies, boosts allied ink gain. | Muzzle · Sight · Reservoir | `PIERCE`, `ARMOR` | Charcoal, Marker, Whiteout |

- **Biro** — damage 26 · rpm 260 · range_m 45 · projectile hitscan  
  *Takes everything. Deliberately the most combinable weapon in the game.*
- **Fineliner** — damage 78 · rpm 48 · range_m 200 · projectile hitscan  
  *A shaky hand ruins a fine line. Bans SPRAY and CHAOS outright.*
- **Brush** — damage 11 · rpm 700 · range_m 22 · projectile hitscan  
  *Cannot mount a scope. No slot for one, and it bans PRECISION anyway.*
- **Marker** — damage 13 · pellets 7 · rpm 75 · range_m 14 · projectile hitscan  
  *Marker-medium parts bleed their tags into adjacent slots. Your parts interact whether you wanted them to or not.*
- **Spraycan** — damage 45 · splash 34 · rpm 55 · range_m 30 · projectile arc  
  *Nothing about this is precise and nothing about it penetrates.*
- **Eraser** — damage 8 · rpm 180 · range_m 7 · projectile cone · strip_chance 0.34  
  *Has no MUZZLE slot because it does not shoot. It un-draws. The comeback tool.*
- **Stapler** — damage 22 · rpm 200 · range_m 28 · projectile ballistic  
  *Only STAPLE-medium parts. Sits entirely outside the ink economy — every part on it has draw 0.*
- **Highlighter** — damage 6 · rpm 600 · range_m 26 · projectile beam · cannot_kill True  
  *Cannot land a killing blow — only brings an enemy to 1 HP.*

---

## Media

`draw` is ink per shot. It is the ongoing cost of *using* a part, separate from the one-time `bound` cost of drawing it.

| Medium | Draw/shot | Character |
| --- | --- | --- |
| **Staple** | 0.0 | Physical. Costs no ink to run. Uses scarce map-found staples. |
| **Highlighter** | 0.3 | Non-lethal. Marks, reveals, tags. |
| **Pencil** | 0.5 | Faint, provisional. Refundable for 70%. Vulnerable to ERASE. |
| **Crayon** | 0.7 | Waxy, childish. Randomised magnitude. Immune to wash. |
| **Pen** | 1.0 | Reliable, permanent. Immune to erasing. 2% blot misfire. |
| **Watercolour** | 2.0 | Spreads and dilutes. Strips enemy PENCIL parts on hit. |
| **Charcoal** | 2.5 | Filthy, high-impact. Residue clouds obscure your vision too. |
| **Marker** | 3.5 | Bold and wasteful. Bleeds its tags into adjacent slots. |
| **Whiteout** | 6.0 | Anti-ink. Burst use only; you cannot sustain this. |

---

## Parts — 37 Scrawls across 5 slot types

### Muzzle — 8 parts

| Part | Medium | Tags | Bound | Draw | Nib | Effect |
| --- | --- | --- | --- | --- | --- | --- |
| **Arrowhead** | Pen | `HOMING` `PROJECTILE` | 34 | 1.0 | 10 | Shots curve toward whatever you were last aiming at. |
| **Blotter Cap** | Marker | `AOE` `PROJECTILE` | 44 | 3.5 | 8 | Shots leave a 2m ink pool for 6s. |
| **Scribble Muzzle** | Charcoal | `SPRAY` `CHAOS` | 26 | 2.5 | 16 | +60% fire rate, spread ×2.4, wobbles as it travels. |
| **Splitter Nib** | Pen | `SPLIT` `PROJECTILE` | 30 | 1.0 | 12 | Shots fork into two. Damage ×0.65 each. |
| **Squiggle Tip** | Crayon | `RICOCHET` `PROJECTILE` | 22 | 0.7 | 14 | Shots bounce twice. Damage ×0.9 per bounce. |
| **Stipple Tip** | Pencil | `SPRAY` `PROJECTILE` | 18 | 0.5 | 20 | One shot becomes 5 dots. Damage ×0.28 each. |
| **The Long Line** | Pen | `PIERCE` | 32 | 1.0 | 10 | Shots draw through up to 3 targets, ×0.8 falloff each. |
| **Whiteout Nozzle** | Whiteout | `ERASE` `PROJECTILE` | 58 | 6.0 | 5 | 34% chance on hit to strip one enemy part. |

<details><summary>How they're drawn</summary>

- **Arrowhead** — a child's arrow, one barb longer than the other
- **Blotter Cap** — a fat felt cap, bleeding at the edges
- **Scribble Muzzle** — a furious black mess where the barrel used to be
- **Splitter Nib** — a nib with a crack down the middle, drawn slightly wrong
- **Squiggle Tip** — a waxy corkscrew scribbled over the barrel
- **Stipple Tip** — dozens of tiny dots, applied with no patience whatsoever
- **The Long Line** — one unbroken stroke someone clearly held their breath for
- **Whiteout Nozzle** — a correction-fluid brush taped over the muzzle

</details>

### Body — 9 parts

| Part | Medium | Tags | Bound | Draw | Nib | Effect |
| --- | --- | --- | --- | --- | --- | --- |
| **Crosshatch Plating** | Charcoal | `ARMOR` | 36 | 2.5 | 14 | −22% damage taken. You render noticeably darker. |
| **Eraser Shavings** | Whiteout | `ERASE` `AOE` | 62 | 6.0 | 5 | Hits shed shavings: 18% strip chance in a 3m radius. |
| **Margin Notes** | Highlighter | `MARK` | 20 | 0.3 | 24 | Enemies you hit are marked for your team for 5s. |
| **Paperclip Chain** | Staple | `PHYSICAL` `MARK` | 24 | 0.0 | — | Hits leave a clipped-on tag. Target marked for your team for 4s. |
| **Second Barrel** | Pen | `SPLIT` | 40 | 1.0 | 10 | A worse copy of the gun on the side. +1 shot at ×0.5 damage. |
| **Smudge Thumb** | Charcoal | `AOE` | 30 | 2.5 | 12 | Melee becomes a 3m smear. 55 damage, knocks back. |
| **Staple Reinforcement** | Staple | `ARMOR` `PHYSICAL` | 28 | 0.0 | — | −15% damage taken, flat. Cannot be erased. |
| **Tally Marks** | Pencil | `DRAIN` | 16 | 0.5 | 22 | Every hit siphons 0.4 pocket ink from the target to you. |
| **Wet Coat** | Watercolour | `AOE` `DRAIN` | 38 | 2.0 | 9 | Enemies hit get blurred vision 1.5s and leak 2 pocket ink. |

<details><summary>How they're drawn</summary>

- **Crosshatch Plating** — dense diagonal hatching, going the wrong way in places
- **Eraser Shavings** — rubber crumbs stuck to the frame with old tape
- **Margin Notes** — annotations down the side of the gun, none of them legible
- **Paperclip Chain** — a chain of paperclips, three of them bent open
- **Second Barrel** — the same gun drawn again, smaller, at a slight angle
- **Smudge Thumb** — a greasy thumbprint pressed into the frame
- **Staple Reinforcement** — eleven staples where three would have done
- **Tally Marks** — four strokes and a diagonal, over and over
- **Wet Coat** — a translucent wash that never fully dried

</details>

### Sight — 6 parts

| Part | Medium | Tags | Bound | Draw | Nib | Effect |
| --- | --- | --- | --- | --- | --- | --- |
| **Bent Ruler** | Pen | `PRECISION` `PIERCE` | 42 | 1.0 | 12 | Perfectly straight shot, no falloff, +0.4s recovery. |
| **Crosshair Doodle** | Crayon | `CHAOS` | 14 | 0.7 | 24 | Crosshair drifts. 12% of shots crit for ×2.2. |
| **Guide Lines** | Pen | `PRECISION` `HOMING` | 26 | 1.0 | 16 | Dotted line predicting target movement 0.6s ahead. Shots follow it. |
| **Highlighter Bead** | Highlighter | `MARK` | 16 | 0.3 | 30 | Anyone you look at for 0.5s is marked for your team. |
| **Squint Lines** | Pencil | `PRECISION` | 18 | 0.5 | 26 | 1.8× zoom, spread ×0.55 while aiming. |
| **X-Ray Sketch** | Pencil | `PRECISION` `MARK` | 34 | 0.5 | 18 | See enemies through erased and thin geometry. |

<details><summary>How they're drawn</summary>

- **Bent Ruler** — a ruler with a visible kink, taped along the barrel
- **Crosshair Doodle** — a wonky X, redrawn three times, all three still visible
- **Guide Lines** — construction lines that were never rubbed out
- **Highlighter Bead** — a blob of fluorescent nothing, in greyscale
- **Squint Lines** — two little speed-lines by the eye, added as an afterthought
- **X-Ray Sketch** — a cutaway diagram someone traced off a book

</details>

### Grip — 7 parts

| Part | Medium | Tags | Bound | Draw | Nib | Effect |
| --- | --- | --- | --- | --- | --- | --- |
| **Chewed End** | Crayon | `CHAOS` | 10 | 0.7 | 26 | All effect magnitudes randomised ×0.6–1.5 per shot. |
| **Flicked Wrist** | Pen | `RICOCHET` | 30 | 1.0 | 12 | Shots curve on release and bounce once off geometry. |
| **Knuckle Grip** | Charcoal | `ARMOR` | 28 | 2.5 | 14 | −70% flinch when hit. −10% damage taken. |
| **Pressure Grip** | Marker | `AOE` | 46 | 3.5 | 7 | Hold to charge: up to ×2.4 damage and a 3m mark. |
| **Rubber Band** | Staple | `PHYSICAL` `ARMOR` | 22 | 0.0 | — | −30% nib re-wet delay. −8% damage taken. |
| **Shaky Hand** | Crayon | `CHAOS` `SPRAY` | 15 | 0.7 | 20 | +45% fire rate, spread ×1.9. Cheap and stupid. |
| **Sticky Tape** | Staple | `PHYSICAL` | 12 | 0.0 | — | −40% recoil. Cannot be erased. |

<details><summary>How they're drawn</summary>

- **Chewed End** — unmistakably been in someone's mouth
- **Flicked Wrist** — a motion arc, drawn with more confidence than skill
- **Knuckle Grip** — a fist that is mostly just a lumpy blob
- **Pressure Grip** — the paper has visibly dented where it was pressed
- **Rubber Band** — a perished band, wrapped twice, going grey
- **Shaky Hand** — the outline drawn four times, none of them matching
- **Sticky Tape** — three strips, one peeling, fingerprints in the adhesive

</details>

### Reservoir — 7 parts

| Part | Medium | Tags | Bound | Draw | Nib | Effect |
| --- | --- | --- | --- | --- | --- | --- |
| **Bottomless Well** | Marker | `DRAIN` | 54 | 3.5 | — | Nibs never empty — every shot draws straight from your pocket. |
| **Capillary Feed** | Pencil | — | 14 | 0.5 | — | Nibs re-wet 55% faster. |
| **Ink Sac** | Pen | — | 20 | 1.0 | — | +60% nib capacity on every part. |
| **Leaky Barrel** | Watercolour | `AOE` `DRAIN` | 32 | 2.0 | 10 | Leaves an ink trail behind you. Costs 0.3 pocket ink/s. |
| **Pressurised Can** | Marker | `SPRAY` `AOE` `CHAOS` | 48 | 3.5 | 6 | Fires in 4-round bursts. +30% damage, draw ×1.4. |
| **Spare Cartridge** | Staple | `PHYSICAL` | 18 | 0.0 | — | +40 staples. Works at zero ink. |
| **Staple Hopper** | Staple | `PHYSICAL` | 22 | 0.0 | — | +90 staples and a faster feed. Works at zero ink. |

<details><summary>How they're drawn</summary>

- **Bottomless Well** — a hole drawn on the side of the gun, in the cartoon sense
- **Capillary Feed** — hair-thin lines running back along the body
- **Ink Sac** — a bulging sac, one seam clearly about to go
- **Leaky Barrel** — a stain spreading down from a crack, still wet
- **Pressurised Can** — a dented aerosol, warning label scribbled out
- **Spare Cartridge** — a cardboard box of staples, gaffer-taped on
- **Staple Hopper** — a takeaway container cable-tied to the frame

</details>
