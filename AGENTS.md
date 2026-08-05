# Agents & domains

Four agents, split by concern rather than by directory — one session
usually touches several folders, but it always answers to the same four
questions. Every agent file lives in `.claude/agents/`.

## The four

### arithmetic — "is it fair?"
Owns the numbers: dice math, the ladder, the card, armor, power budgets,
generator winnability, declared odds.
Law: rules/the-lots.md (arts 41–65), the-world.md (art. 33).
Test: `reference/castlebrynth-lots-demo.html` (playable spec; fixture re-authoring on the board).
Never: hidden math, an unpaid power, a silently changed probability.

### engagement — "is it fun?"
Owns pacing, tension, the reason to open the app again.
Law: rules/the-world.md (arts 1–11, 31–39), the-lots.md (arts 41–42).
Test: a first run dies interestingly; a taught run wins in ten minutes.
Never: filler, grind, a punished tap, one optimal play.

### design — "is it ours?"
Owns theme, story, voice, and the look.
Law: rules/voice.md, rules/the-room.md (arts 13–30), rules/the-thumb.md
(arts 66–76).
Test: `reference/castlebrynth-wake-v3.html` and the hero-density image.
Never: explanation, comfort, early spoilers, out-of-register art.

### mechanics — "does it hold?"
Owns state, persistence, generation wiring, rendering correctness, the
engine/content boundary.
Law: rules/the-world.md (arts 9–11, 36), the-room.md (arts 14–25).
Test: kill the process anywhere; restart; nothing is lost.
Never: unresumable state, a hardcoded pixel, content logic in the engine.

## The law
`.claude/rules/` holds 85 numbered articles, cited in tasks as "art. N":
- **the-world.md** — time, touch, structure, the chain, room grammar, and
  the drift (arts 77–85): regions, the forced lock, lazy dealing,
  just-in-time keys, template and instance, binding and scope
- **the-room.md** — parallax law, scale, the look, the screen
- **the-lots.md** — the dice: turn, duel, the card, collection, armor
- **the-thumb.md** — the interaction model: registers, the tray,
  look-then-take, dice states, the interaction budget
- **voice.md** — every player-facing string

Statuses: SETTLED binds. STANDING is inherited from GAME.md, unamended.
DEFAULT binds until deliberately revisited. PARKED is not law — build
nothing that assumes it. Where a rule conflicts with GAME.md, the rule
wins.

## How work happens
Tasks live on the Asana board "castlebrynth". Take only tasks whose
dependencies are complete; one branch per task. A task ends as a PR
(linked in a comment) or as Blocked (the question written as a comment).
Don't take work the task didn't ask for — if a task needs context it
doesn't carry, that's a Blocked question, not a guess.

Every non-trivial change should be able to survive all four agents. If
two of them disagree, that's a Blocked question for the human, not a
compromise to invent.
