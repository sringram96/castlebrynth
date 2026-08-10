# CONTRIBUTING.md

## Before you change behaviour

Read `PRODUCT.md`, `COMBAT.md` and `ART_DIRECTION.md`. Together they are under
twenty minutes. They are the whole contract — there is no constitution, no
article numbers, and no chronicle you have to have read.

`archive/` holds the pre-reset design stack. It is history. It binds nothing,
and no active code may import from it.

## Commands

```
npm install
npm run dev          # vite, http://localhost:5173
npm run build        # typecheck + bundle
npm test             # unit tests (vitest)
npm run test:browser # Playwright, Chromium at 390x844
npm run art          # rebuild public/assets from the masters
npm run balance      # deterministic fight simulation
```

## The rules

- **Work one end-to-end player story at a time.** A story is not complete
  until its browser test passes. A green unit suite is not completion.
- **Prefer deleting an obsolete abstraction to adapting it.** When you are
  unsure whether to keep something, delete it. Git remembers.
- **Do not add a generic system for one content instance.** Author the
  instance. Generalise after three real cases.
- **No new gameplay noun** — collectible species, status family, screen mode,
  UI panel — without a product decision.
- **Game state is pure data. Rendering never decides outcomes.**
- **Animations reveal committed outcomes.** They never contain game logic and
  never throw a bone.
- **Every interactive change needs a mobile browser test.**
- **Every content item must be understandable from the shipped UI.** Comments
  and docs are not player explanation.
- **If a playtest says the game is broken while tests are green, the tests are
  wrong.** Fix the suite, then the bug.

### And, since the War of Bones

- **No hit points, under any name.** Not `hp`, not a compatibility field, not a
  bone counter that behaves like a health bar. Life is a pile of objects and
  what happens to it is that objects break.
- **No damage number.** A lane is won by breaking one of its bones, and that
  bone is on screen breaking. There is no figure to raise off the enemy.
- **One player throw.** No HOLD, no general REROLL. A Charm is the only rethrow
  in the game and it is once per fight.
- **No manual lane order.** Both lines sort themselves, and the sort is a rule
  that lives in `combat/line.ts` — not in DOM order, and not in array order.
- **Art completeness is a feature-completion gate.** Every enemy has a visible
  end; a bone family ships whole or not at all.
- **Asset bytes are reported, not capped.** There is no global payload ceiling
  and one is not to be reintroduced under another name. See
  `docs/ART_DIRECTION.md`.

## The input contract

The bugs this reset exists to fix were interaction bugs, so these are hard
rules and `test/browser/tray.spec.ts` enforces them.

- Every visible verb is a real `<button>`.
- Decorative art is `pointer-events: none`. Always. Including the tray frame.
- Only one layer owns pointer events in a zone.
- Hit targets are at least 44 CSS px in their smallest dimension, even when
  the sprite is smaller.
- No long press, hover, or hidden gesture.
- An unavailable action is **hidden**, never shown disabled as the only
  explanation of what to do.
- Every screen has an explicit forward route. No state relies on advancing
  prose to reveal the only button.

## Layout

```
src/
  main.ts        boot and mount, and nothing else
  app/           root controller, mode router, action dispatcher
  game/          GameState, the reducer, new runs, saves,
                 the dungeon director and the map it makes
  combat/        fielding, throwing, sorting, the smash
  exploration/   moving, looking, rewards
  content/       bones, rewards, enemies, room templates, run plans, copy, assets
  render/        the fixed-order compositor and asset loading
  ui/            views and components
test/
  unit/          pure functions and invariants
  browser/       Playwright journeys
  balance/       simulation policies and the report
```

Game logic never imports from `ui/` or `render/`. The dispatcher is the only
thing that turns a press into a state change.

## Rooms, and where they lead

Two things that used to be one, and keeping them apart is load-bearing:

- **`content/rooms.ts` is a library of places.** A `RoomTemplate` owns what
  happens inside a room — its art, its arrival line, its details, its font, its
  worked objects — and **names no destination whatsoever**. There is no `to`
  and no way to write one.
- **The generated `RunMap` owns where a place leads.** `game/runGenerator.ts`
  builds an abstract `RunPlan` first — ten dramatic moments, in
  `content/runPlans.ts`, naming no room — and then fills each moment with an
  authored template through `content/roomResolver.ts`.

Three consequences worth stating, because breaking any of them is subtle:

1. **A node id is not a template id.** `run.roomId`, `run.cleared`, `run.path`
   and the keys of `run.rooms` are all *nodes* of the generated map. The same
   template used twice in one descent is two rooms with two chests. Anything
   that reads a room out of state goes through `roomAt(run)` in `game/map.ts`,
   which is the one place the two ever meet.
2. **The map is generated once.** `START_RUN` builds it and stores it in
   `RunState`. Nothing regenerates it — not a render, a navigation, a reload, a
   CONTINUE or a fixture. Same law as a ritual's roll: record the result, never
   recompute the event.
3. **Art constrains generation.** A template declares a `composition` and, if a
   fight can happen in it, the `encounterTags` its picture can carry; an enemy
   declares the tags it needs. A fight may never be placed in art that cannot
   hold it, and `validateRunMap` fails the run rather than shipping it.

Adding a room is adding a template. Changing the shape of a descent is editing
a plan. Neither requires touching the other, and that is the test.

## Pull requests

- Build and typecheck green.
- Unit tests green.
- The relevant Playwright journey green.
- No new dependency on `archive/`.
- No unexplained increase in player-facing nouns.
- Runtime asset payload **reported** in the description when it moves — the
  number is evidence for a reader, not a gate for a build. There is no global
  art payload ceiling; art is validated, never budgeted — see
  `docs/ART_DIRECTION.md`.
