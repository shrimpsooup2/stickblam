# The 3-D Matrix

Every weapon has **3 slots**, so a build is a point in a three-dimensional space:

```
        (weapon, slot1_part, slot2_part, slot3_part)
```

The important structural fact: **the axes are not "all parts."** Slots are *typed*,
so axis 1 is only the parts that fit slot type 1, and so on. A naive parts³ matrix
would be 37³ = 50,653 cells per weapon and unauthorable. Typed axes plus an
`empty` option on each give **4,934 cells across all 8 weapons** — small enough to
generate exhaustively, browse, and balance against.

Nothing in this matrix is hand-authored. It's computed from `data/` by
`tools/build_matrix.py`, which implements the resolver spec in
[PARTS.md §4](PARTS.md). Regenerate any time the data changes:

```bash
python3 tools/build_matrix.py           # analysis to stdout
python3 tools/build_matrix.py --write   # + build/matrix.json and build/matrix.csv
```

---

## Current state

| | Cells | Share |
| --- | --- | --- |
| **Blocked** | 2,401 | 48.7% |
| **Bleed** | 198 | 4.0% |
| **Plain** | 902 | 18.3% |
| **Combo** | 1,348 | 27.3% |
| **Masterpiece** | 85 | 1.7% |

**2,533 legal builds.** Of those, 64.4% produce a named interaction and 35.6% are
Plain. Every one of the 22 Combos, 6 Bleeds and 10 Masterpieces is reachable by at
least one legal build.

### Per weapon

| Weapon | Slots | Cells | Blocked | Bleed | Plain | Combo | M'piece |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Biro | Muz/Bod/Sig | 630 | 0 | 49 | 180 | 380 | 21 |
| Fineliner | Muz/Sig/Gri | 504 | 324 | 26 | 65 | 88 | 1 |
| Brush | Muz/Gri/Res | 576 | 64 | 11 | 238 | 246 | 17 |
| Marker | Muz/Bod/Gri | 720 | 208 | 24 | 141 | 325 | 22 |
| Spraycan | Muz/Bod/Res | 720 | 480 | 24 | 53 | 151 | 12 |
| Eraser | Bod/Gri/Res | 640 | 388 | 29 | 119 | 96 | 8 |
| Stapler | Bod/Gri/Res | 640 | 613 | 5 | 9 | 11 | 2 |
| Highlighter | Muz/Sig/Res | 504 | 324 | 30 | 97 | 51 | 2 |

---

## Read the right number

**"48.7% of the matrix is Blocked" is not a player-facing statistic.** With three
slots, per-part block rates compound: if 30% of parts are illegal on a weapon, then
only 0.7³ ≈ 34% of full builds are legal, and the matrix looks catastrophic while
the game feels fine.

The number a player actually experiences is: *I picked up a card — does it fit my
gun?* That's the per-part rate.

| Weapon | Cards that fit | |
| --- | --- | --- |
| Biro | 23/23 | 100% |
| Brush | 21/22 | 95.5% |
| Marker | 21/24 | 87.5% |
| Fineliner | 14/21 | 66.7% |
| Spraycan | 16/24 | 66.7% |
| Eraser | 14/23 | 60.9% |
| Highlighter | 14/21 | 66.7% |
| Stapler | 6/23 | 26.1% |

Two-thirds is a healthy floor. The Stapler at 26% is deliberate — it takes only
Staple-medium parts, so it has just **27 legal builds in total.** That's its
identity: the weapon with almost no build depth, which is exactly what you want
available to a player holding nothing.

---

## Does thirst actually scale with power?

The claim in [INK_ECONOMY.md §4](INK_ECONOMY.md) is that we balance a strong combo
by making it *drink*, not by making it weak. That's testable:

| Tier | Builds | Mean thirst | Max |
| --- | --- | --- | --- |
| Bleed | 136 | 3.18 | 13.20 |
| Plain | 337 | 3.48 | 9.50 |
| Combo | 1,058 | 6.30 | 19.38 |
| Masterpiece | 85 | 8.42 | 19.50 |

Power costs roughly **2.4× more per shot** than Plain. The lever works.

### What the matrix caught: cheap Masterpieces

The multiplier alone was not enough. A `Debt Collector` assembled from Pencil +
Highlighter + Pen came out at **2.7 ink/shot** — cheaper than most Plain builds and
sustainable for an entire match, which defeats the whole "burst power, not
sustained power" principle.

Fix: a **thirst floor per tier** (Combo 3.0, Masterpiece 6.0) on top of the
multiplier. The floor sets the minimum cost of running an interaction *at all*,
regardless of what it happens to be drawn with. Cheapest Masterpiece is now 6.0.

---

## Masterpiece reach

Which weapons can touch the ceiling of the system:

| Weapon | Reachable Masterpieces |
| --- | --- |
| **Biro** | Bulldozer, Debt Collector, Final Draft, Human Shield, Scribble Storm, The Critic |
| **Marker** | Bulldozer, Eraser Shavings, Flood, Human Shield, Scribble Storm |
| **Brush** | Bulldozer, Flood, Human Shield, Masterpiece, Scribble Storm |
| **Spraycan** | Eraser Shavings, Flood, Human Shield |
| **Eraser** | Eraser Shavings, Flood, Sandwich Board |
| **Highlighter** | Debt Collector |
| **Stapler** | Sandwich Board |
| **Fineliner** | Bulldozer |

The Biro reaching six is correct — it's the all-rounder that bans nothing. The
Fineliner and Stapler reaching one each is a **live balance question**, not a
settled decision: a weapon that can never realistically hit the system's ceiling
may feel like a downgrade regardless of raw stats.

---

## Four problems the matrix found

None of these were visible from reading the design docs. This is the argument for
generating the matrix rather than hand-authoring one.

1. **Two Masterpieces were structurally unreachable.** `The Critic`
   (Erase + Homing + Split) and `Masterpiece` (Chaos ×3) had no legal build in the
   entire space, because those tags weren't distributed across enough *slot types*
   for any single weapon to host all three. Fixed by moving `HOMING` onto a Sight
   part and `CHAOS` onto a Reservoir part.

   **The general rule this exposes:** a Masterpiece is only reachable if its three
   tags live on three *different slot types* that some weapon actually has. Tag
   distribution across slots is a real constraint, and it is invisible without
   generating the space.

2. **`PROJECTILE` was flooding the results.** It sits on almost every Muzzle part,
   so any rule keyed on it fired constantly — `Leech Line` alone appeared in 243
   builds. Resolved by declaring `PROJECTILE` a **structural tag**: it exists so
   weapons can ban it (the Eraser does), and carries no interaction rules at all.
   The same logic retired the `Physical + Projectile` bleed, which was hitting 16%
   of all legal builds.

3. **Media whitelists were far too narrow.** The first pass gave each weapon an
   `allowed_media` list, which blocked 56% of the matrix and left the Stapler with
   12 legal builds. Inverted to short `banned_media` blacklists — which is what our
   own "ban lists stay short" guardrail said to do in the first place.

4. **Cheap Masterpieces.** See above. The thirst floor.

---

## Open questions

1. **Is 35.6% Plain too high or too low?** Every Plain build is one where the
   compatibility system did nothing — the player just stacked stats. Too few and
   there's no baseline to contrast combos against; too many and the gimmick feels
   absent. No idea what the right number is until someone plays it.
2. **Should the Fineliner reach more than one Masterpiece?** It bans `SPRAY` and
   `CHAOS`, which are exactly the tags that feed most triples. Either accept it as a
   deliberately simple precision weapon, or add a Masterpiece built from
   precision-flavoured tags.
3. **22 Combos may be too many to learn.** [PARTS.md §7](PARTS.md) caps the shipped
   list for legibility. The matrix says they're all reachable; it says nothing about
   whether anyone can remember them.
4. **The matrix models Generation-1 cards only.** Degraded photocopies add `CHAOS`
   to any part ([PARTS.md §5](PARTS.md)), which opens combinations this space
   doesn't contain — including `Masterpiece` (Chaos ×3) on weapons that otherwise
   can't host it. Worth extending the generator to model generations.
