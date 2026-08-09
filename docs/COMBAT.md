# COMBAT.md

The whole of the fight. Read time: five minutes.

## The turn

Five steps, three model phases.

```
intent ──ROLL──▶ rolled ──REROLL──▶ rerolled
   ▲               │                    │
   │             SCORE                SCORE
   └────── enemy responds ◀────────────┘
```

`intent` — the enemy's next blow is on screen before you touch anything.
`rolled` — all six dice thrown. Tap dice to hold. Reroll is available.
`rerolled` — the unheld dice have been thrown once more. No further reroll.

Holding is not a phase: it is the set of held dice, legal in both `rolled` and
`rerolled`, and reversible by tapping again. Scoring is not a phase either: it
is the transition that ends the turn.

## Scoring

Select any dice. The game names the best hand that selection **exactly** forms
and previews the damage. There is no invalid selection — a selection that
forms nothing is `ANY`, which always scores.

| Hand | Requirement | × |
| --- | --- | --- |
| Any | 1–6 dice forming no better hand | 1 |
| Pair | 2 equal | 2 |
| Triple | 3 equal | 3 |
| Straight 3 | 3 consecutive values | 3 |
| Full House | 3 equal + 2 equal | 5 |
| Quad | 4 equal | 6 |
| Straight 5 | 5 consecutive values | 6 |

```
damage = sum(selected values) × multiplier + relic bonuses
```

The formula is shown in the tray before you commit, with every term visible:
`TRIPLE · 15 × 3 = 45`. Relic bonuses appear as their own term and the relic
pulses. Face costs appear as `−7 HP` next to the die that carries them.

**Hands are reusable every turn.** There is no card, no exhaustion, no line
that gets spent. A long fight is repetitive before it is empty, and that is
the trade the blueprint chose.

## What happens on SCORE

The order is fixed and the whole outcome is computed before a frame is drawn.

1. Damage lands on the enemy.
2. Marked faces in the selection resolve: hurt costs you HP, heal gives it.
3. If the enemy is at 0, the fight is won and nothing else happens. **A dead
   enemy never acts.** If its death has been authored — `content/defeat.ts` —
   the fight does not close here: it parks on `combat.defeated`, and see
   *Deaths that are watched* below.
4. Otherwise the enemy performs its declared intent. Armor (a relic effect)
   subtracts flat.
5. An enemy that closes takes one step in — or arrives, and arriving is the
   run. See below.
6. If you are at 0, you are dead.
7. The next intent is chosen and the turn returns to `intent`.

## Deaths that are watched

A horror with an entry in `content/defeat.ts` does not vanish on the frame its
last point of health leaves. The SCORE that kills it sets `combat.defeated`
and stops there: health is settled, but the room is **not** cleared, no reward
is drawn and no screen changes. The fight now has no move in it — ROLL,
REROLL, SELECT and SCORE are all refused, and the tray offers nothing but
MENU — and exactly one way out, `DEFEAT_DONE`, which grants the same win the
killing press used to grant in one step.

The sequence that plays over it is presentation and decides nothing: the kill
was reduced and saved before its first frame, so settling it early — an
impatient thumb, `prefers-reduced-motion`, a test with `motion=0` — lands on
the identical win. A reload inside the death snaps to the final frame and
finishes; `?dying=1` is the fixture that stands there.

A horror with **no** entry wins on the killing press, exactly as before. That
fallback is deliberate: a defeat sequence is authored art, and an enemy
without one must not be held on a blank screen waiting for it.

## Things that close the distance

One enemy rule, and one enemy has it. Instead of standing at a fixed range and
trading, the thing crawls at you: it holds one of three **reaches** — `far`,
`mid`, `close` — and covers a stretch of hall every `every` scores it
survives. There is nothing past `close`, so a thing at `close` that runs out
of stretch arrives, and that ends the run outright.

```
        ┌── holds ──┐        ┌── holds ──┐        ┌── holds ──┐
far ────┴──────▶ mid┴──────────────▶ close┴──────────────▶ dead
 └──────────── score, killed: it never moves ─────────────┘
```

So the fight is a count as well as a health bar: **`every × 3` attacks, and
the last had better kill it.** The count is never printed. The picture is the
count — it is unmistakably larger each time it lands — and the intents say in
words which turn is which, because the turn it holds and the turn it arrives
are not the same turn and a script that could not tell them apart would be
lying on the one that matters.

Two levers, and they are not the same lever. **Health** decides how long the
fight *is*. **`every`** decides how long the fight *may be* before the thing
arrives. Raising one without the other either makes the deadline irrelevant or
makes it the only thing that matters.

- The reach lives in `CombatState.approach` and only the reducer moves it. A
  reload paints the reach the save records, so the composition on screen can
  never disagree with how many attacks are left.
- Arriving sets `CombatState.reached` and is terminal. It is not a large blow
  that happens to equal your health; nothing subtracts.
- **A dead enemy never advances**, which is the only reason killing it at
  `close` is survivable.
- Such an enemy deals no damage on the way in. It cannot reach you from down
  the hall; what kills you is that it stops being down the hall.

## Enemies

Each enemy is HP, an attack script, at most one special rule, art, and a
reward table. The script is a fixed cycle, so the intent is always knowable
and never random.

| Enemy | HP | Teaches | Special |
| --- | --- | --- | --- |
| The Gnawing | see `content/enemies.ts` | make a combination and hit it, before it arrives | it closes the distance; contact ends the run |
| The Marrow | ” | the telegraph | one blow in its cycle is announced a turn early and hits harder |
| The Warden | ” | both, together | the telegraph, plus a heavier floor |

No enemy in the slice applies a status to you. Nothing seals, curses, binds,
bleeds, corrodes or drains.

## Dice

Six, always. A die is six faces; a face is a value 1–6 and at most one
keyword. Two keywords exist:

- **hurt N** — if this face is in the hand you score, you lose N HP.
- **heal N** — if this face is in the hand you score, you gain N HP.

A keyword only fires when its face is part of the scored selection. Held dice
and unused dice do nothing.

Every die states its faces, its one rule sentence, and what it is good with.
If a die's rule cannot be read off the combat screen, the die does not ship.

## Relics

A relic is a passive rule outside the hand: one icon, one trigger, one effect,
one sentence. They are read at scoring time and never mutate state that other
relics read, so their order does not matter.

## Invariants

Enforced by `test/unit/` and, where they are visible, by `test/browser/`.

- Roll count equals active hand count. Always six in the slice.
- Reroll preserves held dice exactly, and rerolls every unheld die once.
- A selection never contains a duplicate slot.
- Hand recognition labels every supported pattern and invents none.
- The previewed damage equals the committed damage for the same settled state.
- An enemy at 0 HP cannot act, which includes taking a step.
- An enemy that closes covers exactly one stretch of hall per `every` scores
  it survives, never skips a reach, and never moves twice for one score.
- It declares one intent per turn of the whole walk, so the turn it holds and
  the turn it arrives never read the same.
- Reaching 0 HP always sets `mode: 'dead'`.
- A new run starts with six dice and no combat state.
- Every face keyword used in content has a visible descriptor in the UI.
