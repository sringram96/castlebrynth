# Contributing to Castlebrynth
A first-person, forward-only descent in the browser: computed parallax
rooms, blind chains, poker-dice duels, death as the progression system.

Four documents, and each answers one question:

- **README.md** — how do I play it and run it? (users)
- **DESIGN.md** — what is the game right now? The spec: components, key
  decisions, the cut, and a Status of one screen — what runs, what is
  green, what is owed. **Nothing chronological lives there.**
- **CHRONICLE.md** — how did it get here? Every wave journal, newest
  first, append-only. History, and it binds nothing.
- **`.claude/rules/`** — the law: 128 numbered articles, cited as
  "art. N". Start at `journey.md`: it is the five modes, the one
  question each asks, and the table of every mechanic with its mode, its
  ledger and its articles.

The fantasy is `reference/GAME.md`. Where a rule conflicts with GAME.md,
the rule wins.

## Get it running
Install: npm install
Run:     npm run dev
Test:    npm test

## Layout
- src/state   — the two ledgers; rituals; persistence; exact resume
- src/gen     — the seeded chain; grammar rules; winnability proof
- src/room    — the computed-box renderer (GRID dial)
- src/visual  — the compositor above it: layers, plates, patches
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
  config (arts 22–23), and nothing outside `src/content` may assume the
  hand is six (art. 128).
- Perspective is computed; appearance may be authored (art. 126). `src/room`
  owns every spatial fact; `src/visual` lays authored plates over the frame
  it produces, in the order art. 127 declares. Assets are data: only
  `src/content/visual/assets.ts` knows a filename.
- Every player-facing string obeys rules/voice.md: it is the protagonist
  thinking or the protagonist writing, never a narrator. Content review is
  voice review, and `test/content.voice.test.ts` is the review.

## Agents
See AGENTS.md. Four agents, by concern: **arithmetic** (is it fair?),
**engagement** (is it fun?), **design** (is it ours?), **mechanics**
(does it hold?). Their files are in `.claude/agents/`. Any non-trivial
change should survive all four; if two disagree, that's a Blocked
question for the human, not a compromise to invent.

A skill is hired, not scaffolded — when the same procedure has been
re-explained enough times that its absence is the recurring bug, propose
it. One is hired: `.claude/skills/phone-pass/`, because three waves in a
row closed with "the hand pass is still owed."

## The standing rules
Adopted by the mend, 2026-08-07. Five, and they are kept forever.

1. **Green means served.** The deploy verdict is the served commit hash
   and nothing else. A step that cries wolf is a step nobody reads.
2. **Status is one screen.** History goes to `CHRONICLE.md` the day it
   becomes history.
3. **No mechanic without its row** (art. 122). Mode + ledger + articles
   in `journey.md`, or it does not ship.
4. **Every wave ends in a hand.** The phone pass is the last section of
   every wave's chronicle entry — performed, or declared not done and
   why.
5. **The fantasy table never goes stale.** A wave that ships a beat of
   `reference/GAME.md`'s opening marks its carrier in DESIGN.md; a wave
   that cannot, says undelivered.

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
