# Stickblam — Core Design

> Companion docs: [INK_ECONOMY.md](INK_ECONOMY.md) (the gimmick), [PARTS.md](PARTS.md)
> (the compatibility system), [ROADMAP.md](ROADMAP.md) (build order).

---

## 1. The fiction

Someone is drawing this. There is a Hand — never fully seen, occasionally
implied. A pencil crosses the sky during a round transition. The page turns
between matches. When you die you are scribbled out, and when you respawn a line
redraws you from the feet up.

You are not a soldier. You are a doodle in the margin of someone's homework, and
you are fighting other doodles over the contents of one ink bottle.

This fiction does real work: it justifies the art, it justifies ink as a
universal currency, and it gives us a free vocabulary for every system in the
game (erasing, smudging, drying, page-turning, signing your work).

---

## 2. The player character

**Flat.** Stickmen are genuinely two-dimensional — a drawing on an invisible
plane, not a 3D model. This is the character's core mechanical identity, not just
a look.

### The flatness question (decide early, it's load-bearing)

| Option | How it works | Pro | Con |
| --- | --- | --- | --- |
| **A. Full billboard** | Sprite always faces the viewer. Everyone sees your front. | Perfectly consistent hitboxes. Reads clearly at range. Cheap. | Wastes the premise. Flatness becomes decoration. |
| **B. True cutout** | Sprite has a real world-space facing. Edge-on you're a 1px line. | Enormous gimmick value. Strafing is a defensive act. | Hitreg nightmare, feels unfair, encourages degenerate sideways-shuffling. |
| **C. Billboard + Edge-On (recommended)** | Sprite billboards for readability, but a dedicated action turns you sideways. | Keeps readability; makes flatness an active verb you spend, not a passive exploit. | One more button. Needs tuning so it isn't a free dodge. |

**Recommendation: C.** Billboarding is the default so the game is legible, and
flatness becomes a *cost-bearing ability*:

- **Edge-On** (hold): you rotate to face-perpendicular. Your hitbox collapses to a
  sliver. You cannot shoot, and you move at 60% speed. It's a commitment, not a
  twitch dodge.
- **Flatten** (hold, against a wall): you press yourself onto the surface and
  become part of the level's artwork. You are still shootable, but you read as
  graffiti. Stealth for people with nerve.
- **Paper Glide** (hold jump while falling): flat things catch air. Slow, drifting
  descent with lateral control. Makes verticality generous and floaty.
- **Crumple** (crouch-slide): ball up and roll. Fast, low, can't shoot, can't turn
  sharply.

Together these give the stickman a movement identity that no other shooter has,
and all four are direct consequences of "you are a piece of paper."

### Animation: the boil

Everything the player does is animated at **12fps on a 60fps sim**, with line
"boil" — every frame the linework redraws slightly differently. Two or three
alternating versions of each pose, cycled. This single technique is 80% of the
"hand-drawn" read and costs almost nothing.

Proportions should be inconsistent between frames. Heads change size. A hand
occasionally has six fingers. Lean into it.

### Health

Stickmen are fragile: **100 HP, no regen, no shields.** Target TTK is
**0.4–1.2s** depending on weapon. Fast kills are not a stylistic choice here,
they're an economic requirement — see [INK_ECONOMY.md §6](INK_ECONOMY.md).

Damage is visual: you accumulate scribbles, tears and eraser-holes on your
sprite as you take hits. At low HP you are visibly falling apart, which is
information the enemy gets for free. That's intentional — it turns the last 20 HP
into a chase.

---

## 3. The world

**Black, white, and the greys in between — and ink is the only true black.**

This is the most important art rule in the project, because it's also a game
mechanic. The environment lives in the 15–85% grey band. Pure black is reserved
for ink: spilled ink, ink puddles, ink parts on weapons, and heavily-inked
players. Consequence: **wealth is visible.** A player running six scrawls is the
highest-contrast object on screen. The snowball paints a target on itself without
a single UI element.

### Rendering approach

- Hard two-tone toon shading, no gradients. Light or unlit, nothing between.
- Shadow is **cross-hatching**, screen-space, at a fixed density so it reads as
  pen strokes rather than a texture.
- Heavy, wobbling outlines on every silhouette, thickness varying along the
  stroke like a real pen.
- **Paper grain stays in screen space**, not on surfaces. The whole frame sits on
  the same sheet. This is what makes it feel like a drawing rather than a
  cel-shaded 3D game.
- Round transitions are a **page turn**.

### Level vocabulary

Maps are pages. Build geometry out of things that belong on paper:

- Ruled lines and graph squares as floor grids (also: free distance estimation for
  snipers, which is a nice gift to the Fineliner).
- Spiral binding as cover and as climbable ladders.
- The **margin** — a red vertical line that marks a no-build zone or an objective lane.
- **Coffee rings**: slippery, damage-over-time, wash ink off your parts.
- **Folded corners**: geometry that flips, opening and closing routes on a timer.
- **Whiteout patches**: walls that weren't there in the original drawing.
- **Erased regions**: partially rubbed-out walls. Semi-transparent *and* penetrable
  — you can shoot through them and dimly see through them. Erasure creates
  permanent tactical change to a map, which matters because players can erase too.
- **The page edge**: the out-of-bounds. Fall off the paper and you're gone.

### Destructible / alterable geometry

Ink and erasure both mark the map, and marks persist for the round:

- Ink spills pool on the floor. Walking through them makes you leave **footprints**
  that fade over ~8 seconds — a free tracking system for anyone who finds them.
- Ink on your screen from a near miss (splatter) partially blinds you for ~1.5s.
- Erasure carves holes. A player with the right build can open a new sightline
  through a wall and it stays open.

This gives a match an arc: the page starts crisp and ends filthy.

---

## 4. Weapons

Every weapon is a drawing implement. You are not shooting bullets at each other;
you are *drawing on each other*. Damage is ink on the page.

Each weapon defines: its **slot layout**, its **banned tags**, and its **allowed
media**. Those three fields are what make "some parts can't go on certain
weapons" a data problem rather than a special-case problem. Details in
[PARTS.md](PARTS.md).

### Launch roster (8)

| Weapon | Role | Slots | Notable restriction |
| --- | --- | --- | --- |
| **Biro** | Semi-auto pistol. The all-rounder, starting weapon. | 4 (Muzzle, Body, Sight, Grip) | None. Takes everything. Deliberately the most combinable weapon. |
| **Fineliner** | Precision rifle / sniper. Draws one long exact line. | 3 (Muzzle, Sight, Stock) | Bans `SPRAY`, `CHAOS`. A shaky hand ruins a fine line. |
| **Brush** | SMG. Fast, sloppy, wide. | 4 (Muzzle, Body, Grip, Reservoir) | Bans `PRECISION`. Cannot mount a scope. |
| **Marker** | Shotgun. Bold, short, wide strokes. | 3 (Muzzle, Body, Grip) | Marker ink **bleeds into adjacent slots** — your parts interact whether you wanted them to or not. |
| **Spraycan** | Launcher. Arcing blobs, area denial. | 3 (Nozzle, Body, Reservoir) | Bans `PRECISION`, `PIERCE`. |
| **Eraser** | Short-range cone. Low lethality; **strips enemy parts.** | 2 (Body, Grip) | Bans all `PROJECTILE` tags. It doesn't shoot, it un-draws. |
| **Stapler** | Nailgun. Physical ammo, not ink. | 3 (Body, Magazine, Grip) | Bans **every ink medium**. Only accepts `PHYSICAL` parts. The weapon you use when you're broke. |
| **Highlighter** | Support beam. Marks enemies, boosts allied ink gain. | 3 (Muzzle, Body, Sight) | Cannot deal killing damage. Can only bring an enemy to 1 HP. |

The Eraser and the Stapler exist specifically to be the awkward ones. The Eraser
is the comeback tool — a broke player can mug a rich one without out-gunning
them. The Stapler is the ink-independent option, so there is always *something*
useful to do with zero ink.

### Weapon acquisition

Weapons are **found on the map**, not bought. You spawn with a Biro. Better
implements sit on pedestals and in contested spots, on a respawn timer. Switching
weapons **does not** carry your parts over — your scrawls are drawn on *that gun*.
Picking up a Fineliner when you've got a fully-built Biro is a genuine sacrifice.

> **Variation worth testing:** a `Trace` action that transfers parts to a new
> weapon at ~50% ink loss, taking 4 seconds. Softens the sacrifice; may make
> weapon pickups feel less momentous. Prototype both.

---

## 5. Combat feel

- **No ADS on most weapons.** Hipfire with tight, honest spread. Scopes exist only
  on weapons that accept `PRECISION` sights.
- **Hitscan for Fineliner and Biro; projectiles for everything else.** Projectiles
  should be big, slow, visible blobs of ink — readable, dodgeable, and they leave
  marks.
- **Every shot draws.** A shot that misses still puts a line or splat on the
  geometry behind the target. After a firefight you can read what happened off the
  walls.
- **No hitmarkers.** You know you hit because the enemy visibly got scribbled on.
- **Killcam shows the killer's full build**, part by part, with the combos
  highlighted. This is the primary teaching tool for the part system — see
  [PARTS.md §6](PARTS.md).

---

## 6. Modes

### Mural (flagship)

Two teams, one enormous blank wall on each side. **Depositing ink at your mural
fills in your team's drawing. First team to complete the mural wins.**

This is the flagship because it puts the game's central tension in the objective
itself: *every point of ink you spend on your gun is a point not in the mural.*
Building makes you more likely to win fights and less likely to win the match.
Then when you die, your invested ink drops for the enemy to carry to *their*
mural. The greedy player is literally funding the other team's artwork.

The mural also solves spectacle: the win condition is a picture that visibly
draws itself over the course of the match, so at any moment you can glance at the
wall and know the score. No HUD needed.

### Scrawl (team deathmatch)

The on-ramp. Kills score points. Ink still flows and builds still matter, but
there's no deposit decision — you spend everything on yourself. Simple, teaches
the part system, has none of the strategic depth. Ship it first, keep it forever,
don't pretend it's the good mode.

### Blot (free-for-all)

Every-player-for-themselves. The bounty dynamic is strongest here because there's
no team Well to bank into — everything you carry drops when you die. Chaotic,
snowbally, great for six players and a voice call.

### Ideas parked for later

- **Margin** — zone control, where zones are sections of the page.
- **Flipbook** — rounds on the same map, and the map's damage persists between
  them. By round 5 the page is a ruin.
- **The Critic** — asymmetric. One player is the Eraser, hugely powerful, and
  everyone else has to bank enough ink before getting rubbed out.

---

## 7. Match shape

- **Player count:** 8–12 (4v4 to 6v6). Small enough that individual builds are
  legible, big enough that ink flows.
- **Match length:** 8–12 minutes. Long enough to reach a 4-part build from
  nothing; short enough that a bad economy start isn't a 25-minute sentence.
- **Respawn:** 3 seconds, fixed. Not scaled by deaths — punishing a losing player
  with longer respawns in an economy game is a death spiral.
- **Build arc:** a competent player should reach 2 parts by ~90 seconds and a
  3-part Masterpiece by mid-match. If Masterpieces are routinely unreachable, the
  ceiling of the system never gets seen; if they're reachable in 60 seconds,
  there's no journey.

---

## 8. Audio

Monochrome visuals mean audio does a lot of load-bearing work.

- Weapons sound like **implements on paper**: pen scratch, marker squeak, the dry
  hiss of a spraycan, the rubber drag of an eraser.
- **Every combo has a distinct sting** when it first activates. This is a teaching
  tool as much as a reward.
- Ink pickup: a wet, satisfying *blot*.
- Death: paper crumpling.
- The Hand is audible before it's visible — pencil scratch from off-screen during
  events.
