# Visual Direction

> **The direction, in one line:** nothing in this game is perfect, straight,
> clean, or new.

Everything below is that sentence turned into rules someone can actually execute.

---

## 1. The trap: imperfection must be authored, not randomised

The cheap version of this brief is a wobble shader over clean geometry, plus some
noise. It is very tempting and it will look exactly like what it is — a filter.

The difference is **intent**. Hand-drawn wrongness is consistent with a particular
hand that has particular habits: the same artist always overshoots corners the
same way, always makes circles slightly egg-shaped in the same direction. Random
jitter has no habits, so it reads as digital noise or a screen effect, and the eye
sorts it out in about four seconds.

**The rule: wrongness is baked in at author time, never applied at runtime.**

### A pipeline that makes that affordable

| Layer | Technique | Cost |
| --- | --- | --- |
| **Geometry** | Model everything deliberately crooked. Don't snap to grid. Walls lean a degree or two, corners don't quite meet, "parallel" lines converge slightly. | Nearly free — it's just *not* doing the tidying step. |
| **Outlines** | Stroke with a hand-drawn brush stamp along the edge, not a uniform-width line. Pressure varies; strokes taper and swell. | One-time shader cost. |
| **Characters & decals** | Genuinely hand-drawn, multiple variants of everything. | Expensive, but only for the things the eye actually studies. |

Spend the hand-drawing budget on characters, weapons, Instruction cards and
decals. Let deliberately-bad modelling and a good outline shader carry the
environment.

---

## 2. Rules for wrongness

- **No straight lines anywhere.** Every "straight" edge has a slight bow. Freehand,
  not ruled — *except* the ruled lines of the paper itself, which are the one
  machine-made thing in the world and should read as such.
- **Corners overshoot or undershoot.** Where two lines meet they either cross past
  each other or leave a gap. Never a clean mitre.
- **No perfect circles.** Every circle is one shaky stroke, slightly egg-shaped,
  and doesn't quite close.
- **Line weight varies along every stroke.** Uniform-width lines are the single
  biggest tell of a digital drawing.
- **Nothing is aligned or centred** — the HUD included. Interface elements sit
  slightly crooked, drawn in the margin, with corrections and crossings-out.
- **Repetition is never identical.** Ten crates are ten *different drawings* of a
  crate. This is the expensive rule and it's the one that sells the whole thing;
  three variants and a random pick gets most of the way there.
- **Everything shows its construction.** Guide lines that were never erased. Sketch
  strokes under the final line. Visible eraser smudge where something moved.

### Nothing is new

The page has been used before this match started. Bake in:

creases and fold lines · dog-eared corners · coffee rings · fingerprints and
smudges · ghost marks from earlier drawings that were erased but never fully
went away · bleed-through from whatever is drawn on the other side of the page ·
tape holding a tear together · a doodle in the margin that has nothing to do with
anything

The ghost marks matter mechanically as well as aesthetically — erased regions are
already a gameplay element, so a world that visibly remembers being erased teaches
the mechanic for free.

### Things to never do

Gradients. Bloom. Lens flare. Perfectly round particles. Uniform outlines. Motion
blur. Anything that looks like it was rendered rather than drawn. Drop shadows
that imply a light source the drawing doesn't have — shadow is **cross-hatching**,
always.

---

## 3. Monochrome, and the one exception

**The environment lives in the 15–85% grey band. Pure black is reserved for ink.**

This is the most important rule in the project because it's also a game mechanic.
A player running six scrawls is the highest-contrast object on screen — the
snowball paints a target on itself with no UI element at all.

It does triple duty:

| Darkness reads as | Because |
| --- | --- |
| **Wealth** | Ink invested in parts is literal black on the weapon. |
| **Readiness** | A full nib is jet black; a spent one is a grey ghost outline. |
| **Threat** | Both of the above at once, legible across a map. |

Fallback if playtests show enemy/ally separation is impossible without hue:
reserve a single accent value for enemy outlines. Try very hard not to need it.

Shadow is screen-space **cross-hatching** at fixed density, so it reads as pen
strokes rather than a texture. Paper grain stays in **screen space**, not on
surfaces — the whole frame sits on one sheet. That single choice is what makes it
feel like a drawing rather than a cel-shaded 3D game.

---

## 4. The stickman

**Paper Mario flat.** A genuine 2D drawing standing up in a 3D world, with real
physicality as a paper object — not a sprite-shaped hole in the rendering.

- **Billboards by default** so it stays readable at range and hitboxes stay honest.
- **Turning is a flip, not a rotation.** Changing facing compresses the sprite to
  nothing and pops it out mirrored, over 2–3 frames. A card turning over, never a
  smooth Y-axis spin.
- **Thinness is a verb you spend**, not a passive exploit. Edge-On, Paper Glide and
  Ball are in [DESIGN.md §2](DESIGN.md). Each is a costly action — the flatness is
  always something the player *did*, never something that happened to them.
- **A glide landing is a face-plant.** The stickman arrives flat on the page and
  peels itself up over about a second. Draw the recovery, don't skip it: it is the
  price of the only stable shooting platform in the game.

### Animation: choppy on purpose

Target is genuinely cheap flipbook animation, not smooth animation at a lower
framerate.

- **8fps base, on a 60fps simulation.** Lower than the classic 12 — this should
  feel like a flipbook, not like limited TV animation.
- **Irregular holds.** Some poses held 2 frames, some 5. Even spacing reads as
  deliberate; uneven spacing reads as hand-made.
- **Very few unique frames.** A 3-frame run cycle. A 2-frame idle. A 1-frame jump
  that never changes no matter how long you're airborne.
- **No interpolation, ever.** Poses pop. Nothing tweens, eases, or blends.
- **A hold is still redrawn.** This is the crucial one: a 5-frame hold is *five
  different drawings of the same pose*, not one drawing shown five times. The
  lines boil even when nothing is moving, because the whole world is being
  re-drawn constantly by whoever is drawing it.
- **Proportions drift between frames.** Heads change size. Limb lengths vary. A
  hand occasionally has six fingers. Don't correct it.

That last cluster — boil plus drift plus irregular holds — is roughly 80% of the
entire look, and it costs almost nothing compared to modelling and shading work.

---

## 5. Weapons and depletion

Weapons are drawing implements, and the parts scrawled onto them are the primary
readable state in the game.

- **Parts fade as their nibs empty.** Full = dense black. Draining = thinning, more
  gaps in the stroke. Dry = a faint ghost outline that's still visibly *there*.
- **This replaces the ammo HUD entirely.** The gun is the counter, in first person
  and in third.
- **Combos visibly braid.** Two parts in a Combo grow connecting strokes between
  them; a Masterpiece adds a scribble halo the whole lobby can see.
- **A combo breaking is loud.** When a part dries and drops a Combo, the connecting
  strokes snap and the halo dies with a sound. Loss should never be silent —
  see [PARTS.md §7](PARTS.md).

---

## 6. Instruction cards

Scruffy how-to-draw leaflets: three panels, where panel one is a circle, panel two
is two circles, and panel three is a fully-rendered part with no explanation of
how you got there. Everybody has seen this card.

**Generation degradation is a gift to this art direction.** A Gen-1 card is crisp;
a Gen-4 is barely-legible grey mush. The mechanic *is* the aesthetic:

| Gen | Looks like |
| --- | --- |
| 1 | Crisp original. Sharp blacks, clean paper. |
| 2 | Slightly soft. One panel smudged by a thumb. |
| 3 | Grainy, contrast blown, the third panel largely guesswork. |
| 4+ | Grey mush. Toner streaks. You can tell what it *was*. |

A player should be able to tell a card's generation at a glance, from across a
room, before picking it up. If they can't, the degradation mechanic will read as
the game cheating rather than as a choice they made.

---

## 7. The Hand

Someone is drawing this. Never fully seen, occasionally implied: a pencil crossing
the sky during an event, the page turning between rounds, an eraser descending on
a region of the map. The Hand is audible before it's visible — pencil scratch from
off-screen.

Use sparingly. It's a punctuation mark, not a character.

---

## 8. Audio, briefly

Monochrome visuals mean audio carries more than usual. Weapons sound like
implements on paper: pen scratch, marker squeak, the dry hiss of a spraycan, the
rubber drag of an eraser. Ink pickup is a wet, satisfying *blot*. Death is paper
crumpling. Every combo gets a distinct sting — a teaching tool as much as a
reward.
