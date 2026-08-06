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
Owns theme, story, voice, and the look. The voice is one frightened man's
mind: he thinks, or he writes it down, and nobody narrates him.
Law: rules/voice.md, rules/the-room.md (arts 13–30, 93–112),
rules/the-thumb.md (arts 66–76, 90–92, 116).
Test: `reference/castlebrynth-wake-v3.html` and the hero-density image.
Never: explanation, comfort, early spoilers, out-of-register art, a
sentence he would not think.

### mechanics — "does it hold?"
Owns state, persistence, generation wiring, rendering correctness, the
engine/content boundary.
Law: rules/the-world.md (arts 9–11, 36), the-room.md (arts 14–25, and the
graphics amendment's geometry — arts 96, 102, 109–110).
Test: kill the process anywhere; restart; nothing is lost.
Never: unresumable state, a hardcoded pixel, content logic in the engine.

## The law
`.claude/rules/` holds 120 numbered articles, cited in tasks as "art. N".
Two are spent: art. 12 is repealed (there are no classes, ever) and
art. 47's BRACE is repealed. The rest:
- **the-world.md** — time, touch, structure, the chain, room grammar, the
  drift (arts 77–85): regions, the forced lock, lazy dealing,
  just-in-time keys, template and instance, binding and scope — and the
  fork (art. 89): a floor socket where taking one good forfeits the other
- **the-room.md** — parallax law, scale, the look, the screen — and the
  graphics amendment (arts 93–112), which says what may stand in the box:
  a room as six parts and a school (93); the ramp and the one dither, both
  shipped (94–95); shape above proportion, tube / chamber / junction (96);
  a door as a hole and not a thing (97); the three tiers, where a grammar
  without a gradient is wallpaper (98–99); objects drawn as ramp indices,
  fields scattered, masses as geometry the rays hit (100–103); one hero
  per room and things that keep their distance (104–105); motion as a
  spent capital — loops, one-shots, the blink, one clock, one cached base
  frame (106–110); an answer that names the thing (111); and a third of
  the frame dark (112) — as amended the same day by the look wave, which
  lifts the gradient ban inside a ramp (17), deepens the ramp to sixty-four
  hue-shifted steps (94), blends the lights and dithers only the darks (95),
  adds the open shape (96), gives things a text alphabet (100), and makes a
  light a station and a colour whose region is known by it, with the rim
  derived and nothing hand-shaded (113–115)
- **the-lots.md** — the dice: turn, duel, the card, collection, armor, and
  the travelers (arts 86–88): the start is six plain bones and a full
  hand, only a special die is ever discovered, every one of those
  belonged to somebody, and an item's origin explains its rules in one
  sentence or the item does not ship — and the beat law (art. 119): a
  fight event resolves in beats, each saying one thing; the outcome is
  computed before the first frame and the beats only reveal it; nothing
  is decided during an animation, a rider gets its own beat, and the
  room holds still except for the blow that lands on you
- **the-thumb.md** — the interaction model: registers; the tray as a
  rail and panels (art. 67, amended); look-then-take, where an act about
  a thing does not exist until the thing has been tapped and the summons
  persists per instance (art. 68, strengthened); dice states; the
  interaction budget — and panels & focus (arts 90–92): tabs are taps
  and are labels rather than controls, panel focus is state moved only
  by declared events, and the map tab is a disabled socket with no
  pixels behind it; and settings (art. 116): a setting may change how the
  game is presented and may never change what is true, preferences are
  permanent state, and reduced motion is the test of whether art. 107's
  settled states were honest
- **voice.md** — every player-facing string, in his voice: the thought
  (first person, live) or the scrawl (second person, written down), never
  a narrator. Amended by the mind wave, 2026-08-06.

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
