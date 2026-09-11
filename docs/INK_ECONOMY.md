# The Ink Economy

This is the game. Everything else is delivery mechanism.

---

## 1. The central claim

**Ink is four things at once, and that's the whole design:**

1. **Capability** — spend it drawing a part, and your weapon does something new.
2. **Uptime** — that part burns ink every time you pull the trigger. Your build
   is your magazine.
3. **Score** — deposit it and your team moves toward winning the match.
4. **Bounty** — hold it or wear it, and you are worth more to whoever kills you.

Any ink decision should trade against all four. If we ever tune our way into a
state where one goes quiet, the gimmick is dead and we're playing a worse Quake.

### Two things this buys us

**The build is consumable, so nobody can turtle.** A player who assembles a great
weapon and then plays cautiously to protect it discovers that playing at all
spends it. There is no state in which you are finished. The cautious player and
the casual player are pushed back into the economy by the same pressure as
everyone else — not by a nag, but by an empty gun.

**Power raises your metabolism.** Expensive, exotic parts are *thirsty* parts
(§4). So the better your build, the faster you burn through ink, and the harder
you have to hunt to keep it running. The strongest player in the match is the
hungriest one.

That last property is a second, independent brake on snowballing, layered on top
of the bounty. A rich player is now (a) more visible, since ink is the only true
black, (b) worth more when killed, and (c) burning ink faster than anyone else.

> **Watch for over-correction.** Three independent brakes is a lot. If playtests
> show that winning fights stops feeling good — that getting ahead is purely a
> tax — the answer is to *loosen* something, probably the rising per-part cost
> curve in [PARTS.md §7](PARTS.md). Being good should still be fun.

---

## 2. How ink moves through a player

```
  kills, Blots, trickle
            │
            ▼
     ┌─────────────┐        draw a part          ┌──────────┐
     │   POCKET    │ ──────────────────────────► │  BOUND   │ ──► Blots on death
     │             │                              └──────────┘
     │ build budget│        auto-feed             ┌──────────┐
     │      +      │ ──────────────────────────► │   NIB    │ ──► fired away, gone
     │ ammo reserve│                              └──────────┘
     │             │        deposit               ┌──────────┐
     └─────────────┘ ──────────────────────────► │ THE WELL │ ──► score / respawns
                                                  └──────────┘
```

**Three sinks, one pocket.** That's the decision the whole game generates: the 40
ink you're carrying is simultaneously a new part, ammunition for the parts you
already have, and points on the mural. You cannot have all three.

Note that the first sink is *gated* and the other two are not. You can always
shoot and always deposit; you can only draw a part you hold the Instruction for
(§6). So a player sitting on ink with no usable card has a genuinely different
problem from one sitting on ink with three.

---

## 3. The five states of ink

### Pocket Ink (carried)

Loose ink. Your build budget *and* your ammo reserve — the same pool, competing
with itself.

- **No evaporation.** (Cut — see §8.1. Ammo drain does this job better.)
- **On death:** goes to your team's Well, not to your killer.
- Visible as wetness on your sprite: a carrying player drips.

### Nib Ink (loaded, per part)

**Each part holds its own small reservoir** — roughly 8–15 shots' worth. Not one
shared gun pool; each scrawl drinks separately.

- Firing drains the nib at that part's **Draw** rate (§4).
- **A dry nib means that part stops working** — the rest of the gun keeps firing.
- Between bursts the nib **re-wets automatically** from your Pocket: ~1 second
  delay after your last shot, then a few seconds to fill. No reload button.
- With an empty Pocket, nothing re-wets. That part stays dead until you find ink.

Per-part nibs rather than a shared pool is the single most important choice in
this system, because it means **your build decomposes in a specific order under
sustained fire.** The expensive exotic part dies first. Your Masterpiece collapses
to a Combo, then to Plain, then to a bare pen — and you feel it happen mid-fight,
with a visible tell on the weapon. It also creates an in-combat resource decision
the old design completely lacked: *do I fire the expensive combo now, or conserve
it and win this with the cheap parts?*

### Bound Ink (invested in the part's existence)

What it cost to draw the part in the first place. This is the part's *structure*,
separate from the ink loaded in its nib.

- Drawing takes **2 seconds** stationary, weapon lowered.
- **Refilling is not redrawing.** Once a part exists, keeping it fed costs only
  nib ink, which is much cheaper than the Bound cost. The barrier is acquiring a
  part; the ongoing cost is upkeep.
- **On death: 60% drops as Blots. 40% is lost to the page** — a deliberate leak,
  without which total match ink inflates forever.

### Blots (ground pickups)

Splatter dropped by a dying player's parts.

- **Fresh Blots are worth more:** 100% for 4s, decaying to 50% over the next 8s,
  then dry. Pushing into your own kill is a risk, not a free reward.
- The killer gets a **1-second lock** before they open to everyone.
- The only pure-black objects on the floor. Two players see the same pile from
  across the map.

### The Well (team reserve)

Fed by teammates who die carrying Pocket ink; respawning players draw a stipend
scaling with team deficit. In **Mural** mode the Well and the objective are the
same thing — depositing *is* scoring.

> The asymmetry still holds: **your unspent ink is inherited by your team, your
> invested ink is looted by your enemy.** Banking is generous, building is selfish
> and risky.

---

## 4. Draw — thirst as the balance lever

Every part carries a **Draw** rating: ink consumed per shot, roughly 0.5–6.

This is the most valuable thing the ammo system gives us, and it deserves to be
stated as a rule:

> **You do not balance a powerful combo by making it weak. You balance it by
> making it thirsty.**

A Masterpiece can stay spectacular — it just can't stay *on*. Burst power instead
of sustained power. This preserves the fantasy while limiting uptime, which is
strictly better than nerfing damage numbers until the exciting thing is boring.

Draw maps cleanly onto the media system, which was already doing personality work
and now does economy work too:

| Medium | Draw / shot | Why it fits |
| --- | --- | --- |
| **Highlighter** | 0.3 | Marks, doesn't damage. Barely uses anything. |
| **Pencil** | 0.5 | Graphite. Cheap to run, weak effects, cheap to replace. |
| **Crayon** | 0.7 | Waxy, doesn't flow. Cheap and chaotic. |
| **Pen** | 1.0 | The baseline. Reliable in every sense. |
| **Watercolour** | 2.0 | Spreads wide, drinks accordingly. |
| **Charcoal** | 2.5 | Filthy and heavy-handed. Highest raw damage, high cost. |
| **Marker** | 3.5 | Bold, wasteful, bleeds everywhere. The fiction and the cost finally match. |
| **Whiteout** | 6.0 | Rare and extreme. Burst use only — you cannot run this. |

**Combos multiply thirst.** A Combo applies roughly ×1.25 to its constituent
parts' Draw; a Masterpiece ×1.5. The better the interaction, the faster it drinks.

### The floor: a bare weapon always fires free

**The underlying implement never costs ink.** Parts drink; the pen itself doesn't.

This is a hard safety property, not a tuning number. A player with nothing must
never be unable to shoot, or the game death-spirals the moment someone falls
behind. When you're completely dry you aren't helpless — you're back to a bare
Biro, which is a functional if unexciting gun. That is the floor, and it maps
perfectly onto the fiction: the pen still works, the fancy attachments just ran
out of ink.

The **Stapler** sharpens into its proper role here: it fires physical staples, so
it doesn't touch the ink economy at all. Its ammo is scarce and found on the map.
It is genuinely the weapon for a player with nothing, which is what we always
wanted it to be.

### Dry parts

A part whose nib is empty goes **dormant, not destroyed** — it stays drawn on
your gun as a faint ghost outline and works again the moment you feed it.

The teeth: **a part left completely dry for 20 seconds smudges off permanently**
and drops nothing. You can't stockpile parts you have no intention of running,
and an Eraser hit strips dry parts first.

---

## 5. Where ink comes from

| Source | Amount | Notes |
| --- | --- | --- |
| **Kill** | 25 base | Plus the victim's Blots, usually the bigger number. |
| **Assist** | 8 | Generous on purpose. Velocity matters more than credit accuracy. |
| **Passive trickle** | 1 / 4s | The floor. Guarantees a player with zero kills eventually affords *something*. |
| **Respawn stipend** | 15 + Well draw | Scales with team deficit. |
| **Objective** | mode-specific | Mural has ink-bearing pickups; Margin pays for zone hold. |
| **Absorbing spills** | 3–8 | Environmental pools can be soaked up. Slow, exposes you. |

**The floor matters more than the ceiling**, and it matters more now than it did
before the ammo change — a player who can't afford ammunition is locked out of the
best system in the game, and a locked-out player quits.

---

## 6. Spending: drawing a part

**You cannot draw whatever you like. You draw what you have the instructions for.**

Parts are gated by **Instructions** — physical "how to draw" cards found on the
map and dropped by the dead. Ink is the material; the Instruction is the recipe.
Two separate scarcities, two separate things worth fighting over. Full system in
[PARTS.md §5](PARTS.md).

This replaces the dealt-hand draft the earlier revision proposed, and it's better
on every axis: a card is a physical object you pick up, fight over, carry, trade
and lose, rather than a menu that reshuffles. It also answers a question the old
design handwaved — *how does your stickman know how to draw a Homing Arrowhead?* —
with "he's holding a leaflet that shows him."

Drawing is 2 seconds stationary with the weapon lowered. This is still the tensest
moment in the loop, and the ammo change sharpens it: you just won a fight, and the
ink in your pocket is simultaneously the new part you want, the ammunition your
existing parts need, and points you could be banking.

**The Signature.** Once per life you may sign one part: double cost, but it
survives death and is redrawn on your next weapon of the same type. Gives players
a through-line and a recognisable identity. Signed parts are drawn with a
flourish, so the enemy knows this is someone's pet build.

---

## 7. Death: the exact split

You die with 40 Pocket, three parts totalling 90 Bound, and partially-full nibs.

```
Pocket (40)  ──────────────────► Your team's Well            (40)
Nib          ──────────────────► Gone. It was already spent.  (—)
Bound (90)   ──┬── 60% ────────► Blots on the ground          (54)
               └── 40% ────────► Lost to the page  [SINK]     (36)
```

Your killer stands over 54 ink in a decaying pile with four seconds to decide
whether to grab it and stand still drawing — while their own nibs are running dry
from the fight they just won.

**Respawn stipend:** `15 + min(WellBalance, 10 + deficitBonus)`. Gentle enough
that nobody feels handed a win, present enough that a 0–12 team can still shoot.

---

## 8. Velocity is still the whole thing

Fast TTK (0.4–1.2s), 3-second respawns, 100 HP with no regen, generous assists,
small maps. An economy game with a slow economy is a worse shooter with a menu.

The ammo change helps here too: it converts every firefight into ink *consumption*,
so the total ink in a match circulates rather than accumulating. Ink now has a
metabolism, not just a balance.

---

## 9. Failure modes

| Failure | What it looks like | Lever |
| --- | --- | --- |
| **Dry and helpless** *(new, top risk)* | Players spend most of the match unable to run their build. The fun system is visible but unaffordable. | Raise nib capacity, lower Draw rates, raise the passive trickle. The bare-weapon floor must always feel playable. |
| **Metabolism trap** *(new)* | Getting ahead is purely a tax; winning stops feeling good. | Loosen the per-part cost curve. Three snowball brakes may be one too many. |
| **Rich get richer** | One player hits five parts at minute three and the match is over. | Blot decay, Erasers, visible wealth, thirst, deficit stipend. |
| **Analysis paralysis** | Players stop moving to read part descriptions. | Three-card hand. Big icons. Tier preview as one glyph. |
| **Combo soup** | Too many interactions; results feel random. | Hard-cap the shipped list. Audio stings. Teach through the killcam. |
| **Dead economy** | Low kill rate, no ink, the gimmick never activates. | Passive trickle, raise base kill value, shrink maps. |
| **Inflation** | Late match everyone has everything. | The 40% death sink. Tune it up if the late game goes mushy. |

*Removed: **Hoarding stalemate**. Ammo drain solved it — see below.*

---

## 10. Variations

### 10.1 Evaporation is cut — and that's a win

The old design had Pocket ink evaporating at ~1.5%/s purely to stop players
sitting on a pile. Ammo drain makes that redundant: holding ink while your
Splitter Nib is dry is self-evidently stupid, so no artificial timer is needed.

**Replacing a nag with a need is strictly better design**, and deleting a mechanic
is always a win. Reversible if needed: if a pure "courier" build — run bare, bank
everything, never fight — turns out to be degenerate in Mural, bring evaporation
back. My read is that it won't be: a courier is fast, poor, and loses every fight
they're caught in. That's a real role, not an exploit.

### 10.2 Per-part nibs vs. one shared gun pool

Default is per-part (§3). A shared pool is simpler to build and understand, but it
loses the graceful-decomposition drama and turns running dry into a binary
gun-works / gun-doesn't. **Build per-part.** If it proves unreadable in Phase 2,
a shared pool is the fallback.

### 10.3 Do dry parts die?

Default: dormant, with a 20-second permanent-smudge timer. Alternatives worth a
mode: parts destroyed instantly when dry (brutal, very high churn), or parts that
never die at all (late game becomes purely about uptime — arguably a legitimate
and interesting shape, worth testing before dismissing).

### 10.4 Closed Bottle (conserved ink)

The match starts with a fixed total supply; kills *transfer* ink rather than
create it. Zero-sum and instantly legible — two gauges, one per team. Ammo drain
makes this much more interesting than it was, because consumption now genuinely
removes ink from the match: the bottle *empties* as the match goes on, and both
teams get poorer and more desperate. That's a fantastic arc.

**Risk:** a losing team has less ink to fight with, which is the opposite of a
rubber band. Needs the sink recycled into the deficit stipend. Ship it as the
**Mural** variant, prototype in Phase 5.

### 10.5 The Smudge

Largely absorbed into the ammo system — smudge-on-use is now the *core* mechanic
rather than a variation. What remains worth testing is environmental smudging:
rain, coffee rings, and Watercolour weapons that damage parts directly rather than
draining them. Keeps the map pushing on your build.

### 10.6 Unspent ink to the killer's team

Harsher: punishes hoarding from both directions. A hardcore mode, not the default.

### 10.7 Unlimited slots with a rising cost curve

Part *n* costs base × 1.6ⁿ. Self-caps economically, produces incredible late-match
monstrosities, wrecks readability. Now also self-caps on *thirst*, which is a
better limiter than cost. Park it as a party toy — but it's more viable than it
was.

---

## 11. Open questions

1. **Does the build decomposing mid-fight read, or does it just feel like the game
   breaking?** Losing your combo at the worst moment could be great drama or
   pure frustration. The visual tell has to be unmissable — see
   [VISUAL_DIRECTION.md](VISUAL_DIRECTION.md) on parts fading as they deplete.
2. **Is the 2-second draw vulnerability fun or infuriating?** Unchanged, still the
   first thing to prototype.
3. **Do players understand that the bare gun is free?** If it isn't obvious, they
   will panic-hoard and play scared. It may need to be taught explicitly.
4. **Is Mural's trade now too punishing?** Depositing literally disarms you — a much
   sharper decision than before. That's probably good, but a team winning the mural
   is a team fighting dry, which is a rubber band *inside the objective*. Watch
   whether it's too strong.
5. **What happens to Blots nobody picks up?** They should dry into permanent map
   stains, so the page records where people died.
