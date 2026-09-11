# STICKBLAM

A first-person multiplayer shooter where everyone is a badly drawn stickman, the
world is a black-and-white sketch, and **ink is the only thing worth killing for.**

You kill someone, you get their ink. You spend ink drawing new parts onto your
gun. Parts react with each other — some combine into something better than
either, some bleed together into a mess, some simply won't go on your weapon.
Whatever you've drawn is worth *more* to the person who kills you than it was to
you.

---

## The one-paragraph pitch

Stickblam is a fast, low-TTK arena shooter built around a single loop: **kill →
ink → draw → become a bigger target.** Your weapon starts as a bare ballpoint
pen. Over a match you scrawl attachments onto it — a splitter nib, a homing
arrowhead, a smear of correction fluid — and those scrawls interact in ways you
discover rather than memorize. Ink is also your team's score, so every point you
spend on yourself is a point you didn't put toward winning. And because ink is
the only true black in a world of greys, a rich player is literally the darkest,
most visible thing on the map.

## Design pillars

1. **Ink is power, score, and bounty at the same time.** Never let any one of
   those three go quiet. Every decision about ink should hurt a little.
2. **The build is drawn, so it is visible.** You can read a player's threat level
   off their silhouette and their gun. No hidden loadouts.
3. **Poorly drawn on purpose.** Wobbling lines, inconsistent proportions, visible
   eraser marks. The game should look like a bored teenager made it in a margin.
4. **Combinations are discovered, not looked up.** The part system should reward
   experimenting in a live match, not reading a wiki first.
5. **Short fights, fast respawns, high ink velocity.** The economy only sings if
   it turns over constantly.

## Documents

| Doc | What's in it |
| --- | --- |
| [docs/DESIGN.md](docs/DESIGN.md) | Core game: combat, movement, weapons, world, modes |
| [docs/INK_ECONOMY.md](docs/INK_ECONOMY.md) | The gimmick in detail — states of ink, drops, banking, and the variations we're weighing |
| [docs/PARTS.md](docs/PARTS.md) | The Scrawl system: tags, compatibility rules, part library, combo tables |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Tech stack, milestones, riskiest assumptions, open questions |

## Status

Pre-production. Nothing is built. Everything in these docs is a proposal, and the
open-questions sections are the point — read those first if you want to argue.
