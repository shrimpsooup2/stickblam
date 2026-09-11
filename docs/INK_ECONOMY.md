# The Ink Economy

This is the game. Everything else is delivery mechanism.

---

## 1. The central claim

**Ink is three things at once, and that's the whole design:**

1. **Power** — spend it on your weapon and you win more fights.
2. **Score** — deposit it and your team moves toward winning the match.
3. **Bounty** — hold it or wear it, and you are worth more to the person who
   kills you.

Any ink decision should force a trade against all three. If we ever tune our way
into a state where one of those three goes quiet — where banking is obviously
correct, or building is obviously correct, or dying is cheap — the gimmick is
dead and we're just playing a worse Quake.

**The self-balancing property:** the richer you get, the bigger the prize on your
head. That's the natural rubber band, and it's free — we don't have to bolt on
comeback mechanics if this relationship stays tight. Our job in tuning is mostly
keeping it tight.

---

## 2. States of ink

Ink is not one resource. It's one substance in four states, and the states are
where all the interesting rules live.

### Wet Ink (carried)

Loose ink in your pocket. Spendable instantly, anywhere.

- **Evaporates.** After a 10-second grace period, carried ink dries off at ~1.5%
  per second. This is the anti-hoarding lever and the single most important
  number in the game. Sitting on a pile is not a strategy; it's a slow leak.
- **On death:** goes to your team's Well (see below). Not to your killer.
- Displayed as a visible ink level in a little bottle on the HUD, and — crucially —
  as **wetness on your sprite**: a carrying player drips.

### Dry Ink (invested in parts)

Ink you've spent drawing a scrawl onto your weapon. This is your power.

- Takes **2 seconds to draw** (see §4), during which you're vulnerable.
- **On death: 60% drops as Blots on the ground. 40% is lost to the page.**
  The 40% is a deliberate economic leak — without a sink, total match ink inflates
  forever and late-game becomes noise. See §7.

### Blots (ground pickups)

The physical splatter dropped by a dying player's parts. Anyone can grab them.

- **Fresh Blots are worth more.** A Blot is worth 100% for 4 seconds, then decays
  to 50% over the next 8, then dries out entirely. This makes pushing into your
  own kill a risk/reward decision instead of a free reward.
- The killer gets a **1-second head start** — Blots are locked to the killer
  briefly, then open to everyone. Rewards the kill without guaranteeing the loot.
- Blots are the only pure-black objects on the floor. They are *loud*. Two players
  will see the same pile from across the map.

### The Well (team reserve)

Your team's shared pool. Fed by every teammate who dies carrying wet ink.

- **Respawning players draw a stipend** from the Well — the Well is what keeps a
  wiped team from being permanently broke.
- Can also be **deposited into deliberately** at Well stations on the map. This is
  how you turn a big carry into something that survives your death.
- In **Mural** mode the Well and the mural are the same thing: depositing *is*
  scoring.

> The asymmetry here is the good bit. **Your unspent ink is inherited by your
> team. Your invested ink is looted by your enemy.** Banking is generous, building
> is selfish and risky. That single rule makes a support/banker playstyle real
> without designing a support class.

---

## 3. Where ink comes from

| Source | Amount | Notes |
| --- | --- | --- |
| **Kill** | 25 base | Plus the victim's dropped Blots, which are usually the bigger number. |
| **Assist** | 8 | Generous on purpose. Ink velocity matters more than credit accuracy. |
| **Passive trickle** | 1 / 4s | The floor. Guarantees a player with zero kills eventually gets *something*. |
| **Respawn stipend** | 15 + Well draw | Well draw scales with team deficit — see §5. |
| **Objective** | mode-specific | Mural has ink-bearing pickups; Margin pays for zone hold. |
| **Absorbing spills** | 3–8 | Environmental ink pools can be soaked up. Slow, exposes you. |

**The floor matters more than the ceiling.** A player who is losing badly must
still be able to afford *one* part. A zero-ink player has no access to the game's
best system, and a player locked out of the fun system quits.

---

## 4. Spending: how you actually draw a part

You hold a small **hand of Scrawls** — three drafted part offers, shown in the
margin of the HUD. You did not choose them from a catalogue; they were dealt to
you. Rerolling a slot costs ink.

**Why a drafted hand instead of a shop:** a shop produces a solved meta within a
week — everyone runs the same four parts and the compatibility system becomes
homework. A dealt hand produces the thing we actually want: *"I've got a Homing
Arrowhead and a Splitter Nib and a Fineliner, what happens?"* It also makes the
incompatibility rules feel like a puzzle instead of a wall, because being dealt a
part your weapon rejects is a fact about this life, not a permanent restriction.

**Drawing takes time and it hurts.** Committing a part plays a 2-second animation
where you are stationary, sketching on your gun, weapon lowered. You are a sitting
duck. This is the moment of maximum tension in the loop: you just won a fight, you
have wet ink evaporating in your pocket, and cashing it in means standing still in
a place where someone just died.

**Where you can draw:**

- **Anywhere**, at full cost, with the 2-second vulnerability.
- **At an Inkwell station**, at a ~20% discount, with a faster draw, and with access
  to a rarer reroll pool. Stations are fixed map locations, so they create flow
  and contested ground.

### The Signature

Once per life you may **sign** one part: it costs double, but it survives your
death and is redrawn on your next weapon of the same type.

This exists to give players a through-line. Without it, a match is a string of
unrelated lives; with it, you have *your build*, the thing you're known for. It
also creates a lovely tell — signed parts are drawn with a flourish and visibly
different, so the enemy knows this is someone's pet build.

---

## 5. Death: the exact split

You die carrying 40 wet ink, with 3 parts totalling 90 dry ink.

```
Wet Ink (40)  ──────────────────► Your team's Well              (40)
Dry Ink (90)  ──┬── 60% ────────► Blots on the ground           (54)
                └── 40% ────────► Lost to the page  [SINK]      (36)
```

Your killer stands over 54 ink in a pile, decaying. They have four seconds to
decide whether to grab it and stand still drawing, or to keep moving.

### Respawn stipend

`stipend = 15 + min(WellBalance, 10 + deficitBonus)`

where `deficitBonus` scales with how far your team is behind. A stomped team
respawns with meaningfully more ink than a winning one. This is the rubber band
of last resort — it should be gentle enough that nobody feels handed a win, and
present enough that a 0–12 team can still buy a part.

---

## 6. Velocity is the whole thing

An economy game with a slow economy is just a worse shooter with a menu. **The
single biggest failure mode for Stickblam is a match where the ink never moves.**

Everything about combat is tuned in service of ink velocity:

- **TTK 0.4–1.2s.** Fast fights mean frequent deaths mean constant ink transfer.
- **3-second respawns.** Get back in.
- **100 HP, no regen.** No standing behind a wall waiting. Disengaging costs you.
- **Generous assists.** Ink should flow to more players, more often.
- **Small maps.** Contact should happen within ~10 seconds of spawning.

If playtests show a match where the average player makes fewer than ~4 build
decisions, the tuning is wrong, not the players.

---

## 7. Failure modes (name them now, watch for them forever)

| Failure | What it looks like | Lever |
| --- | --- | --- |
| **Rich get richer** | One player hits 5 parts at minute 3 and the match is over. | Blot decay, Eraser weapons, visible-wealth targeting, rising cost per part, deficit stipend. |
| **Hoarding stalemate** | Nobody builds because banking is safer. The best system in the game goes unused. | Wet ink evaporation. Tune the drip rate up until building is correct. |
| **Analysis paralysis** | Players stop moving to read part descriptions. Flow dies. | 3-card hand only. Big icons. Preview tier as a single glyph. No text walls. |
| **Combo soup** | So many interactions nobody learns any of them; results feel random. | Hard-cap the shipped combo list. Audio stings. Killcam teaching. See [PARTS.md §6](PARTS.md). |
| **Dead economy** | Low kill rate, no ink, the gimmick never activates. | Passive trickle, raise base kill value, shrink maps. |
| **Inflation** | Late match everyone has everything; builds stop mattering. | The 40% death sink. Tune it up if late game goes mushy. |

---

## 8. Variations we should actually prototype

The above is a *default*, not a decision. These are the live alternatives, and
several of them are good enough that they might be the real game.

### 8.1 Closed Bottle (conserved ink) — strongest alternative

Instead of generating ink on kills, **the match starts with a fixed total ink
supply** — one bottle, split between the teams. Kills don't create ink, they
*transfer* it. The only leak is the death sink.

- **Why it's good:** ink becomes zero-sum and instantly legible. Two big gauges,
  one per team. Every fight is visibly a transfer of a shared, finite thing. It
  makes "the enemy is rich" a fact you can read off the HUD, not infer.
- **Why it's risky:** a team that falls behind has *less ink to fight with*, which
  is the opposite of a rubber band. Needs a strong counter-lever (the deficit
  stipend must come from somewhere — probably the sink, recycled).
- **Verdict:** this is the *Mural* mode variant. Open Tap for casual modes, Closed
  Bottle for the competitive one. Prototype it in Phase 5.

### 8.2 Where does dropped part-ink go?

| Option | Effect |
| --- | --- |
| Ground Blots, open to all *(default)* | Contested. Creates fights over corpses. Lower snowball. |
| Straight to the killer | Immediate, satisfying, much higher snowball. |
| Ground Blots, killer-locked for 1s *(recommended)* | Rewards the kill, still contestable. Best of both. |
| Split: half to killer, half to ground | Muddier to read. Probably not worth the complexity. |

### 8.3 Does invested ink decay while you're alive? (The Smudge)

Default: **no** — parts are permanent until death. Clean, predictable, lets you
feel good about a build.

Alternatives, in increasing aggression:

- **Smudge on damage.** Taking hits smears your parts; enough damage strips one.
  Thematically perfect, and it means a player who is winning fights *stays* rich
  while a player who is barely surviving bleeds power. Rewards dominance — which
  might be exactly backwards.
- **Smudge on use.** Every shot wears the drawing. Heavy shooters degrade. Creates
  a lovely "my gun is falling apart mid-fight" moment but punishes aggression,
  which fights our velocity goal.
- **Timed dry-out.** All parts decay on a clock. Maximum pressure, maximum stress,
  probably exhausting.
- **Environmental only *(recommended middle ground)*.** Parts are permanent, but
  rain events, coffee rings and Watercolor weapons cause smudging. Keeps the
  flavor, keeps it situational, keeps it a place the *map* pushes on your build.

### 8.4 Does unspent ink really go to your team?

The default (unspent → your team's Well) makes banking generous. Alternatives:

- **Unspent goes to the killer's team.** Punishes hoarding from both directions.
  Much harsher, better for a hardcore mode.
- **Unspent is simply destroyed.** Brutal, simple, maximizes the "spend it now"
  pressure. Worth a mode.
- **Personal ledger inside the team Well.** You get back what *you* banked when you
  respawn. Fixes the free-rider problem but adds bookkeeping and weakens the
  team-generosity read. Probably too fiddly.

### 8.5 Fixed slots vs. unlimited stacking

Default: fixed slots per weapon (2–4). Predictable, readable, caps complexity, and
makes the 3-part Masterpiece a real achievement.

Alternative: **unlimited parts with a rising cost curve** (part *n* costs
`base * 1.6^n`). Lets a dominant player express, self-caps economically, and
produces incredible late-match monstrosities. But it wrecks readability and makes
the compatibility resolver's combinatorics explode. Park it as a party-mode toy.

### 8.6 What if ink were also ammo?

A **Bottomless Well** reservoir part gives infinite magazine capacity but each
shot costs 1 wet ink. Suddenly spraying is literally spending your build budget,
and a player with a full pocket is loaded in both senses.

We should ship this as a *part*, not a global rule — it's a fantastic build
decision and a terrible universal mechanic.

### 8.7 Can you steal ink without killing?

The **Eraser** already strips parts (dropping their Blots) without a kill. Worth
considering more of this class:

- A melee **pickpocket** that takes wet ink on a back-hit.
- A **Highlighter** mark that makes a target drop extra on their next death,
  turning a support player into a bounty-setter.

This class of tool is the main structural answer to snowballing, and it deserves
more than one entry. A player with no kills should have *some* way to participate
in the economy.

---

## 9. Open questions

1. **Is the 2-second draw vulnerability fun or infuriating?** It's the tensest
   moment in the design on paper. It could also be the thing everyone hates.
   Prototype it before anything else in Phase 2.
2. **Should you see enemy builds before you fight them?** Visible-wealth targeting
   says yes at a glance (how dark they are). Should the detail be readable too — a
   scoped look showing exact parts? Leaning yes: hidden information in a system
   this complex just feels like ambush.
3. **Does the Well need a visible balance?** A shared team number invites blame.
   Maybe show only a fill level, no digits.
4. **What happens to Blots nobody picks up?** They should dry into permanent map
   stains, so the page records where people died. Free environmental storytelling,
   and possibly a tactical read.
5. **Is Mural's core trade too punishing for the good player?** The best fragger
   generates the most ink but is also most tempted to spend it on themselves. If
   the optimal play is "never build, always deposit," Mural has eaten its own
   gimmick. Watch this number closely.
