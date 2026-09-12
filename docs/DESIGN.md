# Stickblam — Core Design

> Companion docs: [INK_ECONOMY.md](INK_ECONOMY.md) (the gimmick), [PARTS.md](PARTS.md)
> (parts, Instructions, compatibility), [VISUAL_DIRECTION.md](VISUAL_DIRECTION.md)
> (art direction), [ROADMAP.md](ROADMAP.md) (build order).

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

### Flatness — decided

**Paper Mario flat.** A genuine 2D drawing standing up in a 3D world, with real
physicality as a paper object.

- **Billboards by default**, so the game stays readable at range and hitboxes stay
  honest. A true world-space cutout — invisible edge-on — was considered and
  rejected: it makes hit registration miserable and rewards degenerate sideways
  shuffling.
- **Turning is a flip, not a rotation** — the sprite compresses to nothing and pops
  out mirrored over 2–3 frames, like a card turning over.
- **Thinness is a verb you spend.** Flatness is never a passive exploit; it's
  always something the player deliberately did, at a cost.

| Verb | Input | Effect |
| --- | --- | --- |
| **Edge-On** | hold | Turn a full 90°. Hitbox collapses to a sliver, speed drops 45%. Snaps round in 0.14s but comes back over 0.55s, **and you cannot fire for a second after releasing** — so tapping it is never free. |
| **Paper Glide** | tap, in air | A *committed deployment*, not a hold. Needs 2.6m of air beneath you — more than a jump can buy. Once open it cannot be cancelled: you descend at 1.55 m/s, slow enough to aim and shoot, and you always land flat and spend ~1s getting up. |
| **Ball** | hold crouch | Roll. Almost no friction, so you keep going long after you stop steering; you can barely turn, you bounce on landing, and **you can still shoot.** Fits under things a standing stickman cannot. |

**Flatten (pressing yourself onto a wall) is cut.** It was a free wall-hang with no
real cost, and it competed with Edge-On for the same "become thin" idea without
adding a distinct decision. Edge-On now carries that role alone, and carries a
price for it.

The glide is the clearest expression of the whole design: it buys you the only
stable shooting platform in the game and charges you total commitment for it. You
cannot change your mind, you cannot speed up, everyone can see you, and you are
helpless for a second when you land.

Together these give the stickman a movement identity no other shooter has, and all
three are direct consequences of "you are a piece of paper."

### Animation: choppy on purpose

**8fps on a 60fps sim, with irregular holds.** This should feel like a flipbook,
not like smooth animation running slowly. Very few unique frames — a 3-frame run
cycle, a 2-frame idle, a 1-frame jump that never changes however long you're
airborne. Nothing interpolates; poses pop.

The crucial part: **a hold is still redrawn.** A 5-frame hold is five different
drawings of the same pose, not one drawing shown five times. Lines boil even when
nothing moves, because the whole world is being continuously re-drawn by whoever
is drawing it. Proportions drift between frames — heads change size, a hand
occasionally has six fingers. Don't correct it.

Full spec in [VISUAL_DIRECTION.md §4](VISUAL_DIRECTION.md).

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
mechanic. The environment lives in the 15–85% grey band; pure black is reserved
for ink. Consequence: **wealth and readiness are both visible.** A player running
six full scrawls is the highest-contrast object on screen, and a player whose nibs
have run dry has visibly faded. The snowball paints a target on itself, and the
ammo counter is the gun.

Rendering approach, the rules for hand-drawn wrongness, and the full art direction
are in **[VISUAL_DIRECTION.md](VISUAL_DIRECTION.md)**. The short version: nothing
in this game is perfect, straight, clean, or new.

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
- **Card spawns**: Instructions (see [PARTS.md §5](PARTS.md)) appear at rotating
  fixed points. These are contested ground that has nothing to do with kills, which
  gives the map a second flow independent of the fighting — and gives a losing team
  somewhere to go that isn't a gunfight they'll lose.

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

**The bare implement always fires free.** Parts drink ink per shot; the weapon
underneath does not. This is a hard floor, not a tuning number — a player with
nothing must never be unable to shoot, or the match death-spirals the moment
someone falls behind. Run completely dry and you're back to a bare Biro: a
functional if unexciting gun. The pen still works; the attachments just ran out.

### Launch roster (8)

| Weapon | Role | Slots | Notable restriction |
| --- | --- | --- | --- |
| **Biro** | Semi-auto pistol. The all-rounder, starting weapon. | 4 (Muzzle, Body, Sight, Grip) | None. Takes everything. Deliberately the most combinable weapon. |
| **Fineliner** | Precision rifle / sniper. Draws one long exact line. | 3 (Muzzle, Sight, Stock) | Bans `SPRAY`, `CHAOS`. A shaky hand ruins a fine line. |
| **Brush** | SMG. Fast, sloppy, wide. | 4 (Muzzle, Body, Grip, Reservoir) | Bans `PRECISION`. Cannot mount a scope. |
| **Marker** | Shotgun. Bold, short, wide strokes. | 3 (Muzzle, Body, Grip) | Marker ink **bleeds into adjacent slots** — your parts interact whether you wanted them to or not. |
| **Spraycan** | Launcher. Arcing blobs, area denial. | 3 (Nozzle, Body, Reservoir) | Bans `PRECISION`, `PIERCE`. |
| **Eraser** | Short-range cone. Low lethality; **strips enemy parts.** | 2 (Body, Grip) | Bans all `PROJECTILE` tags. It doesn't shoot, it un-draws. |
| **Stapler** | Nailgun. Fires scarce map-found staples, not ink. | 3 (Body, Magazine, Grip) | Bans **every ink medium**. Only accepts `PHYSICAL` parts. Sits entirely outside the ink economy. |
| **Highlighter** | Support beam. Marks enemies, boosts allied ink gain. | 3 (Muzzle, Body, Sight) | Cannot deal killing damage. Can only bring an enemy to 1 HP. |

Each weapon is modelled from what it is LIKE to hold, not from a shared gun
template: barrel width, how far it reaches, what is on the end, and how far off
vertical it sits in the fist. A biro is carried across you; a spraycan is held
nearly upright, because that is the only way a can works. `proto/src/gfx/
viewmodel.js` is that list as data, and `proto/tools/weapons.html` is a contact
sheet of every cell — which is how you catch two implements that have quietly
become the same rectangle in a fist.

The Eraser and the Stapler exist specifically to be the awkward ones. The Eraser
is the comeback tool — a broke player can mug a rich one without out-gunning them,
and it strips dry parts first. The Stapler is the genuinely ink-independent
option: its ammo is a physical pickup, so a player with zero ink and zero cards
still has a real weapon to fight over.

### Weapon acquisition

Weapons are **found on the map**, not bought. You spawn with a Biro. Better
implements sit on pedestals and in contested spots, on a respawn timer. Switching
weapons **does not** carry your parts over — your scrawls are drawn on *that gun*.
Picking up a Fineliner when you've got a fully-built Biro is a genuine sacrifice.

Your **Instructions** do carry over, though — the card is knowledge, not a
drawing on a specific gun. So swapping weapons costs you your built parts but not
your ability to rebuild, which keeps a weapon pickup exciting rather than
punishing. (`Trace` is a separate action for copying cards, not for moving parts —
see [PARTS.md §5](PARTS.md).)

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
- **No ammo counter.** Parts fade toward ghost outlines as their nibs empty, so
  your remaining uptime is legible off the weapon itself — and off the enemy's.
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
Since ink is also ammunition, depositing now **literally disarms you** — you walk
away from the wall with drier nibs than you arrived with. A team that is winning
the mural is a team fighting dry, which is a rubber band built into the objective.
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

Monochrome visuals mean audio carries more than usual — weapons sound like
implements on paper, every combo gets a distinct sting, death is paper crumpling.
Details in [VISUAL_DIRECTION.md §8](VISUAL_DIRECTION.md).
