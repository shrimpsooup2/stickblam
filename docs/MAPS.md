# Maps

Five blockouts in `proto/src/levels/`. Press **M** in the prototype to cycle them.

Everything here is axis-aligned boxes, because that is what the collision solver
handles. Geometry is data — `builder.js` gives the vocabulary, each map is one
file that calls it.

---

## 1. What the movement demands of a map

Map design is downstream of the movement numbers, so `builder.js` imports them
rather than hardcoding anything. A tuning change shows up here as a geometry
review, not as a silent break.

| Number | Value | What it means for geometry |
| --- | --- | --- |
| Run speed | **7.6 m/s** | One second of travel is 7.6m. Budget distances in seconds, not metres. |
| Jump apex | **1.26m** | Anything taller than this needs stairs. A 1.3m ledge is a wall. |
| Step height | **0.38m** | Free to walk up. Terraces below this read as flat ground. |
| Eye height | **1.62m** | **Cover at 1.2m** lets a standing player shoot over but blocks a crumpled one. This is the single most useful number on the list. |
| Crumple fit | **0.83m** | A gap this tall is a crumple-only route. Nobody walks through it. |
| Glide floor | **2.60m** | Below this clearance the glide will not deploy. **Height under 2.6m is not "high ground" — it is just a step.** |
| Glide descent | **1.55 m/s, 5.2 m/s lateral** | From 12m you cross ~40m. From 34m you cross ~115m and are visible for 22 seconds. |

### Three rules that fell out of those numbers

1. **Height must be either under 2.6m or properly tall.** In between is the worst
   of both: too tall to jump, not tall enough to escape from. Every raised
   position on every map is deliberately one side of that line.
2. **Cover comes in exactly two heights.** 1.2m (shoot over, crumple under) and
   full walls. A 1.7m wall is a bad object — it blocks the shot *and* the roll,
   which means it only ever removes options.
3. **A glide has to land somewhere worth landing.** 22 seconds of slow descent is
   a huge commitment, so the thing you glide *to* must be a real position, not
   just floor you could have walked to.

---

## 2. Making a blockout read in 3D

The first pass of these maps was designed and reviewed entirely in plan. They
worked as diagrams and fell apart at eye level, which is exactly the failure mode
plan-view review produces. Standing in them, four things were wrong:

| Problem | Why it broke the space |
| --- | --- |
| **Nothing was grounded** | Every box met the floor with no contact, so all of it floated. |
| **No depth cue at all** | A box at 10m and one at 60m rendered identically. In a monochrome world there is no colour perspective to fall back on, so depth simply did not exist. |
| **Buildings were bare boxes** | A box is a wall, not a building. A "street" was two grey slabs with a gap. |
| **No boundary, no floor treatment** | Ground ran past the play space into nothing, and streets had no pavement — just a gap between walls. |

### What fixed it

**Aerial perspective, first.** Distant geometry now washes toward the paper tone.
This was the single biggest win by a wide margin — without it no amount of
geometry helps, because nothing tells the eye what is far away. Outlines fade
with the geometry they wrap, and sprites haze less than the world so players stay
readable at range.

**Ink pooling at contact.** Surfaces darken where they meet whatever they stand
on. Thematically it is ink settling at the bottom of a stroke; functionally it is
the contact shadow that stops everything floating.

**Hatching marks shadow, not every surface.** The thresholds were set so wide that
every mid-tone wall came out as texture rather than form. Unlit faces also sat too
dark, pushing them further into the hatch range.

**An architectural vocabulary in `builder.js`** — the parts that make a volume
read as a place rather than a collision volume:

| Helper | What it is for |
| --- | --- |
| `kerb` | A plinth under a structure so it sits *on* the ground. |
| `tower` | Plinth, floor bands every 3.4m, window ledges, door canopy, overhanging roofline. The floor bands make height countable and the roofline stops a box reading as infinite. |
| `shell` | A hollow building: four walls, a doorway, a walkable roof. Somewhere to be *inside* — which is most of what makes a city a city. |
| `legs` | Pillars under raised platforms. Nothing floats. |
| `parapet` | A low wall round a roof edge, so you can see where the roof stops. |
| `pavement` | A raised kerbed strip round a block. A street needs a floor, not just a gap. |
| `pageEdge` | A darker rim and nothing beyond it. |

**Still missing:** interior detail in the shells, any overhead cover, and props at
human scale beyond door canopies. The spaces are coherent now; they are not yet
furnished.

---

## 3. Why the first four maps were bad

Worth writing down, because the diagnosis was not the one I expected. After the 3D
coherence pass they still read poorly, and detail was not the problem. Measured
against what competitive FPS layouts actually do:

| Principle | The first four maps |
| --- | --- |
| **Distinct rooms with landmarks** | Everything looked identical. A 4×4 grid of similar buildings, or an open plane with evenly spaced cover. Nothing to navigate by or call out. |
| **Three overlapping loops** | Margins is a *grid* — so many routes that none of them mean anything. Foolscap is three *parallel lanes*, which never reconnect, so there are no loops at all. |
| **3–4 chokepoints, one per lane** | Essentially none. Nothing anywhere constricts. |
| **Cover controlling specific sightlines** | Regularly spaced decoration. Placed by loop counter, not against any particular line. |

**They were procedurally generated rather than designed.** Every one was built
from a `for` loop, and a `for` loop cannot produce a memorable room.

Reference metrics checked out, for what it is worth — eye height 1.62m against
Source's 64 units (1.63m), jump 1.26m against 54 units (1.37m), streets 7m against
the usual 3–6m corridors. Scale was never the issue.

### The Desk

Built to fix exactly those four things, by hand rather than by loop:

- **Six rooms, each a different shape, size and height**, each with one landmark.
  The desk theme does the work: a mug is round, a book stack is stepped, a lamp
  overhangs, a drawer is sunken, clutter is chaotic. You always know where you are.
- **Three overlapping loops** rather than parallel lanes.
- **Three chokes on three different sides and heights** — the shelf gate, the
  drawer mouth, the pot gap — so no single position covers more than one.
- **Cover placed against named sightlines.** Each piece in the final block of the
  file exists to break one specific line, and says which in a comment.

The Lamp is the piece I like most: a wide shade at 8m makes the only spot on the
map the centre high ground cannot see into, which gives the losing side somewhere
to reset that is not a spawn.

**The other four maps have not had this treatment.** The Desk is the pattern; they
need rebuilding to it, or discarding.

---

## 4. Shared flow vocabulary

- **Lane** — a route from one spawn toward the other. Every map has at least three
  so no single hold wins.
- **Layer** — a parallel network at a different height or clearance. Layers are
  connected *sparsely*; that is what makes choosing one a commitment.
- **Rotation** — a lateral route between lanes, deliberately placed behind each
  team's own half so losing a lane is recoverable.
- **Scoring floor** — every mural sits at ground level on every map. High ground
  is powerful and scores nothing, so you always have to come down.

That last rule is the one doing the most work. [INK_ECONOMY.md](INK_ECONOMY.md)
makes depositing a disarming commitment; putting the murals on the floor means
height and scoring are in permanent tension.

---

## 5. The maps

| | Type | Size | Spawn → spawn | Tallest | Identity |
| --- | --- | --- | --- | --- | --- |
| **The Desk** | Three-lane arena | 80 × 58 | 70m / 9.2s | 8.7m | Hand-laid. Six rooms, three loops, three chokes. |
| **Foolscap** | Open arena | 84 × 84 | 78m / 10.3s | 9.9m | The base shooter, almost no tricks |
| **The Margins** | City / corridor | 96 × 96 | 124m / 16.4s | 16.0m | Three layers, dense grid |
| **Spiral Binding** | Vertical tower | 72 × 72 | 72m / 9.5s | 34.9m | Height is power and scores nothing |
| **The Fold** | Terraced valley | 104 × 68 | 100m / 13.2s | 12.9m | One enormous sightline |
| Movement Gym | Test | — | — | — | Stations per verb |

### Foolscap — open arena

Three lanes across a flat sheet. Centre is a 2.2m plinth with an inkwell; the
side lanes are 25m runs broken by staggered chest-high cover. Rotations pass
behind each mural.

**The plinth is 2.2m on purpose** — under the glide floor. You can hold it, but
you can only ever walk down off it. The only two glide platforms on the map are
the 9m pencil stacks on each flank, both dead ends you have to climb, each
holding a card so going up has a reason beyond sightlines.

**Where the verbs pay:** crumple, more than anywhere else. All cover is 1.2m, so
rolling puts you under every sightline on the map at 9.6 m/s. Edge-On is for
crossing the 70m centre lane. Glide is nearly absent, which is the point.

**Risk:** it may simply be boring. It is the control map — if Foolscap is not fun,
the shooting is not fun, and no amount of geometry elsewhere will hide that.

### The Margins — city / corridor

A 4×4 grid of 14m blocks with 7m streets, on three layers:

- **Roof** (7–16m) — six plank bridges, sparsely connected. Glide is the only fast
  way down. Cards spawn here, forcing someone up where they can be seen.
- **Street** — a full grid. Many routes, 10–25m sightlines, constant corners. The
  default layer and the close-range weapons' home.
- **Crawl** — four buildings are stilted with 0.83m clearance underneath. Crumple
  cuts diagonally across the grid, and you can still shoot from in there.

**Flow:** the grid is too dense to choke, so pressure comes from *which layer you
picked*. Roofs get above a held street; crawls get behind one. The counter to
each is knowing which one they chose.

**Risk:** the crawlspaces might be oppressive — a low, fast, shootable player who
is hard to hit is exactly the frustrating case. Watch whether crawl routes need a
noise tell.

### Spiral Binding — vertical tower

A 34m core with a helical stair, four satellites staggered at 12/18/24/30m, and an
open ground ring. The vertical axis *is* the lane structure.

The map exists to price height honestly. Climbing is slow and exposed; holding
the Crown is genuinely strong; and the murals are on the floor, so the Crown
scores nothing. Leaving it is a 22-second glide in full view with no way to
change your mind.

**The counterplay to a held top is not climbing into it** — it is gliding across
from a satellite at matching height, which is why the satellites are staggered
and each bridges to a different level of the core. Every satellite bridge stops
short of the core: the last stretch is a glide gap, so arriving is always a
commitment.

**Risk:** the helix could be a death funnel. If attacking upward proves hopeless
even with satellite glides, the core needs a second ascent — probably an interior
shaft.

### The Fold — terraced valley

A creased page: four 3m terraces down each side into a valley floor, with fold
ridges cutting the valley into four rooms.

The crease is the longest sightline in the game (~90m) and the fastest route
between murals. Crossing it is the whole decision. The ridges mean the
full-length shot is only available from the very ends.

The top terrace is 12m — enough to glide clean across the valley, which is the
flanking move, and costs you the entire descent in the open.

**A limitation, stated plainly:** this map wants slopes and cannot have them. The
solver is axis-aligned boxes with no ramp support, and more importantly the sim
has **no slope acceleration** — so a "roll downhill to build speed" map would not
work even with ramp collision. Terraces do work, because landing preserves
horizontal speed and a crumpled player bounces, so rolling off a 3m lip and
carrying that speed onward is real. Gaining speed from gradient is not.

**This is the strongest argument for adding ramp support**, and The Fold is the
map that would benefit most. Until then it reads as terraces, which is a fine
second choice and arguably more on-theme for a folded page.

---

## 6. Open questions

1. **Are these too big?** Sized for 8–12 players at 7.6 m/s. Margins at 16.4s
   spawn-to-spawn is the outlier — about 8s to first contact, which is on the slow
   side for a map with this much lateral routing.
2. **Does the scoring-floor rule hold up?** It is applied to all four maps without
   ever being tested. If holding height and ignoring the mural turns out to be
   winning play, the rule is decorative and the murals need moving.
3. **Card spawns on roofs — generous enough?** [PARTS.md §9](PARTS.md) warns that
   two scarcities can deadlock. If the only cards are on the most dangerous layer,
   a losing team gets locked out of the part system entirely. Probably needs
   ground-level cards as well.
4. **No map yet uses Edge-On as a designed-for verb.** It is useful on long lanes
   incidentally, but nothing is built around "turn sideways to survive this
   crossing." A map with deliberate slot-gaps and firing lines might be the fifth.
5. **Nothing is tested at all.** These are blockouts. Every claim above is a
   prediction.
