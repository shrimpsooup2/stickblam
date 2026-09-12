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

### Proportions

**Reference: [`reference/stickman-proportions.png`](reference/stickman-proportions.png).**
The construction is specific and the numbers matter more than they look like they
should:

| | |
| --- | --- |
| **Head** | ~27% of total height, and **wider than tall** (about 1.2 : 1). It is the single biggest shape in the figure, so the head's outline *is* the silhouette. |
| **Neck** | None. |
| **Shoulders** | None. Arms, spine and head all meet at **one node** directly under the skull. |
| **Limbs** | Single long strokes with a gentle bow. A slight kink partway, never a hard elbow or knee. |
| **Line weight** | Thin, against that big head. The contrast between a heavy skull and spindly limbs is most of the character. |

Heads are lumpy, not round. Build them from a few slow harmonics rather than
per-point noise — noise on a circle still reads as a circle, where three low
frequencies give you an actual potato. Leave the loop slightly open.

**Arms cannot be raised much past horizontal.** They start under the skull, and
their bow is perpendicular to the stroke, so a raised arm arcs straight through
the head. Pose the arms out rather than up.

### Warping

One construction, stretched and squashed per pose, rather than a different figure
drawn for each. Gliding is the same stickman pulled flat and wide; the crumple is
the same stickman crushed down. The reference sheet shows this directly — the
right-hand figure is the left-hand figure stretched along its own axis.

Apply the warp **once**, at placement. Baking it into the limb lengths as well
squares it, which silently stretched the jump 25% too tall and crushed the glide
to a third of its size. Fit and centre the finished skeleton in its cell
afterwards, so a pose can warp as far as it likes without sliding off the edge.

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

---

## 9. Why the world looked like SketchUp, and what fixed it

The first pass at the world was cel shading plus a screen-space outline. That is
not a drawing. It is a render with a dark rim on it, and everyone can tell.
Four separate things gave it away, and each needed a different fix.

### Gradients

A renderer shades a face with a continuous ramp. A drawing has a handful of
values with borders between them: paper, a light wash, a grey, a hatched grey, a
dark. So the post pass **quantises** every tone into a five-value palette. This
is the single change that stops a frame reading as a 3D viewport, because it
converts a *shaded* face into a *filled* one.

Quantising has a failure mode worth naming: adding noise to the tone before
quantising, to rough up the step, also punches holes through the middle of any
face whose value happens to sit on a threshold — a wall at point-blank range
breaks into grey islands. The perturbation has to be **gated on the local
gradient** (`fwidth`). Where the tone is flat there is no border to tear, so the
gate closes and the fill stays a fill; where a real ramp crosses a threshold the
gate opens and the step comes out ragged.

### Uniform lines

A post-process outline can only darken pixels where a discontinuity already
exists. It is therefore always one width, always exactly on the silhouette, and
always closed. A pen is none of those things. So every box edge is drawn as a
**real screen-space ribbon** that:

- runs past the corner, or stops short of it, independently at each end;
- varies in weight edge to edge and along its own length;
- bows, with a *smooth* tremor — sampling a hash per segment kinks the
  centreline, and a line made of kinks reads as hairy scribble rather than as a
  confident stroke that happens not to be straight;
- skips where the nib runs dry, and pools where it stops;
- gets a second or third pass at random, offset, for the gone-over-twice look;
- is re-placed in **world space** every boil tick, so the drawing never sits
  exactly on the shape it describes.

Ink obeys aerial perspective like everything else, and strokes fade out by their
**screen** length — nobody draws a line shorter than the nib. That second rule is
what lets a 46-step spiral stair resolve into a shape at range instead of a mat
of overlapping scribble. It is the same simplification a person makes by hand.

### Hatching that is really a texture

Hatching reads as pen or as fabric depending on two things. **Duty cycle**: a
hatch line is thin, with plenty of paper showing between strokes; fat strokes at
a low duty cross into each other and the face turns into chain-link. And
**direction**: two layers at similar spacing crossing each other make a regular
diamond grid. So darker tones get a second run in the *same* direction, spacing
is jittered per stroke, strokes end, and hatching is reserved for genuinely dark
faces — a mid grey is left as a flat fill, the way it would be on paper.

### Crisp silhouettes

Even with all the linework wobbling, the *fills* still met the page along a
mathematically exact polygon edge. The whole frame is displaced by a couple of
pixels of slow noise, re-rolled on the boil tick, which puts every edge in the
picture slightly out of true and ties the frame to one sheet of paper.

### The rule underneath all four

Repetition is the tell. Ruled floor lines, evenly spaced hatching, constant line
weight, a tiled grid on a wall — each of these is a *machine* signature, and a
single one of them will sink an otherwise hand-made frame. Anything that repeats
needs per-instance weight, per-instance spacing, and gaps.

---

## 10. Scraps: everything flat is on a piece of paper

The world is drawn on a page. Anything FLAT in it — the players, the weapon in
your hands, every panel of the HUD — is drawn on a **scrap**: a piece torn out
of a book, or cut round with no patience. This is a single rule with three
consequences worth stating, because it settles a lot of smaller questions.

**A scrap is a polygon, not a blob.** A dozen or so vertices, long straightish
cuts between them, and the odd spike where the tear ran away from whoever was
doing it. Take a rounded rectangle and perturb its edge with noise and you get
something organic; nobody looks at that and thinks *ripped*. Corners matter
most: a corner cut off on the diagonal is the single clearest signal that a
shape was torn rather than drawn. `gfx/paper.js` is the one generator, and the
HUD clips its panels with the same function the renderer cuts sprites with.

**A scrap occludes.** It is a real piece of paper, so it has a front and it
hides what is behind it. That is what finally made players read at range: a
white silhouette carries much further than five thin strokes do, and it gives
the linework something to be drawn *on*.

**Value order.** The bare page is the only true white in the frame (1.0) and ink
the only true black. Every surface in the world tops out at 0.925, and a scrap
sits at 0.945 — brighter than anything in the world, darker than the sky. A
player therefore pops out of the background and can never be mistaken for a hole
in it.

### Two sheets, not one

A scrap needs two things per cell: where the paper is, and where the ink is.
They cannot share one RGBA texture. Filtering a single sheet drags the
transparent surround into the paper colour, and every torn edge comes back with
a grey halo welded to it. So the atlas generators emit an **ink** canvas and a
**mask** canvas, both alpha-only, and the shader reads the mask to decide what
exists and the ink to decide what is drawn on it.

### One buffer, one meaning

Related, and the more expensive lesson: the g-buffer's depth channel has to mean
the same thing for every pass that writes it. The boxes wrote linear `d / far`;
the sprites wrote `gl_FragCoord.z`, which is ~0.99 for anything past a couple of
metres. Nothing went wrong while the only consumer was an outline detector doing
relative comparisons. The moment the post pass started treating far depth as
*bare page*, every player in the world was flood-filled white — and the fault
looked exactly like a texture-binding bug, three passes away from the actual
cause.

### Shading belongs to the object, not to the screen

Hatching used to be one global screen-space pattern: every surface in the world
carried the identical texture, and the world slid underneath it whenever the
camera moved. Both of those are unnerving, and for the same reason — the marks
belonged to the screen rather than to the thing being drawn.

So the pattern is now laid out around each object's own position on the page,
which makes it travel with the object, and its angle, spacing and even whether
it hatches at all vary per object AND per face. Somebody shading a drawing does
not use one stroke direction for every plane in the picture, and does not shade
every object by the same amount. About a fifth of faces are left bare.
