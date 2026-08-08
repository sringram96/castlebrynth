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
  never roll dice.
- **Every interactive change needs a mobile browser test.**
- **Every content item must be understandable from the shipped UI.** Comments
  and docs are not player explanation.
- **If a playtest says the game is broken while tests are green, the tests are
  wrong.** Fix the suite, then the bug.

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
  game/          GameState, the reducer, new runs, saves
  combat/        dice, scoring, resolution, enemy intent
  exploration/   moving, looking, rewards
  content/       dice, relics, enemies, rooms, the run graph, copy, assets
  render/        the fixed-order compositor and asset loading
  ui/            views and components
test/
  unit/          pure functions and invariants
  browser/       Playwright journeys
  balance/       simulation policies and the report
```

Game logic never imports from `ui/` or `render/`. The dispatcher is the only
thing that turns a press into a state change.

## Pull requests

- Build and typecheck green.
- Unit tests green.
- The relevant Playwright journey green.
- No new dependency on `archive/`.
- No unexplained increase in player-facing nouns or in runtime asset payload.
