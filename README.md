# STICKBLAM

A first-person multiplayer shooter where everyone is a badly drawn stickman, the
world is a black-and-white sketch, and **ink is the only thing worth killing for.**

You kill someone, you get their ink. You spend ink drawing new parts onto your
gun — but only parts you've found the instructions for. Those parts react with
each other: some combine into something better than either, some bleed together
into a mess, some simply won't go on your weapon.

And every part you draw **burns ink every time you pull the trigger.** Your build
is your magazine. There is no point at which you are finished and can sit on what
you've got, because using it spends it.

---

## The one-paragraph pitch

Stickblam is a fast, low-TTK arena shooter built around a single loop: **kill →
ink → draw → burn it → go hunting again.** Your weapon starts as a bare ballpoint
pen. Over a match you scrawl attachments onto it — a splitter nib, a homing
arrowhead, a smear of correction fluid — and those scrawls interact in ways you
discover rather than memorize. But they drink ink as you fire, and the fancier
your build the thirstier it is, so getting ahead makes you *hungrier*, not safer.
Ink is your team's score too, so every point you spend on yourself is a point you
didn't put toward winning. And because ink is the only true black in a world of
greys, a rich player is literally the darkest, most visible thing on the map.

## Design pillars

1. **Ink is capability, ammunition, score, and bounty at once.** Never let any one
   of the four go quiet. Every decision about ink should hurt a little.
2. **The build is drawn, so it is visible.** You can read a player's threat level
   off their silhouette and their gun. No hidden loadouts.
3. **Poorly drawn on purpose.** Wobbling lines, inconsistent proportions, visible
   eraser marks. The game should look like a bored teenager made it in a margin.
4. **Combinations are discovered, not looked up.** The part system should reward
   experimenting in a live match, not reading a wiki first.
5. **Nothing is perfect, straight, clean, or new.** Every line is drawn by a
   shaky hand, every surface has been handled, every animation is a cheap
   flipbook.
6. **Short fights, fast respawns, high ink velocity.** The economy only sings if
   it turns over constantly.

## Documents

| Doc | What's in it |
| --- | --- |
| [docs/DESIGN.md](docs/DESIGN.md) | Core game: combat, movement, weapons, world, modes |
| [docs/INK_ECONOMY.md](docs/INK_ECONOMY.md) | The gimmick — ink as ammo, states of ink, drops, banking, and the variations we're weighing |
| [docs/PARTS.md](docs/PARTS.md) | The Scrawl system: tags, Instruction cards, compatibility rules, combo tables |
| [docs/VISUAL_DIRECTION.md](docs/VISUAL_DIRECTION.md) | Art direction — hand-drawn wrongness, choppy animation, monochrome rules |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Tech stack, milestones, riskiest assumptions, open questions |

## Status

Pre-production. Nothing is built. Everything in these docs is a proposal, and the
open-questions sections are the point — read those first if you want to argue.
