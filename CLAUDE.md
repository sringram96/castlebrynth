# Contributing to Castlebrynth
A first-person, forward-only descent in the browser: computed parallax
rooms, blind chains, poker-dice duels, death as the progression system.
Users: README.md. The shape and current cut: DESIGN.md. The fantasy:
`reference/GAME.md`. The law: `.claude/rules/` — 115 numbered articles,
cited as "art. N". Where a rule conflicts with GAME.md, the rule wins.

## Get it running
Install: npm install
Run:     npm run dev
Test:    npm test

## Layout
- src/state   — the two ledgers; rituals; persistence; exact resume
- src/gen     — the seeded chain; grammar rules; winnability proof
- src/room    — the computed-box renderer (GRID dial)
- src/descent — candles, taps, acts, doors
- src/lots    — the dice engine
- src/hinge   — fight-doors, the advance, death routing
- src/content — all rooms, horrors, dice, prose, as typed data

## Conventions
- TypeScript strict. No framework. No new dependency without a Blocked
  question first.
- Engine is generic, content is data: tuning numbers and player-facing
  prose live in src/content only.
- Two-ledger discipline: run and permanent state never mix except through
  the named rituals in src/state (art. 11).
- Nothing may assume a device pixel or the number 240 outside render
  config (arts 22–23).
- Every player-facing string obeys rules/voice.md: it is the protagonist
  thinking or the protagonist writing, never a narrator. Content review is
  voice review, and `test/content.voice.test.ts` is the review.

## Agents
See AGENTS.md. Four agents, by concern: **arithmetic** (is it fair?),
**engagement** (is it fun?), **design** (is it ours?), **mechanics**
(does it hold?). Their files are in `.claude/agents/`. Any non-trivial
change should survive all four; if two disagree, that's a Blocked
question for the human, not a compromise to invent.

`.claude/skills/` is empty on purpose. A skill is hired, not
scaffolded — when the same procedure has been re-explained enough times
that its absence is the recurring bug, propose it.

## How work happens
Tasks live on the Asana board "castlebrynth". Pick up only tasks in
To Do (our Ready) whose dependencies are all complete. Move it to
In Progress. One branch per task.

A task ends exactly one of two ways:
- A pull request — link it in a task comment, move the task to Review.
- Blocked — write the question as a task comment, move the task to
  Blocked.

Don't take work the task didn't ask for. Tasks are written to need no
context beyond themselves plus this repo; if one turns out to need some,
that's a Blocked question, not a guess.
