# Castlebrynth

A portrait pixel-horror roguelike: descend through hand-authored rooms, fight
grotesque things by rolling six dice, collect strange dice and relics, and
decide how far to push before the dungeon kills you.

## Read these first

Four documents, about twenty minutes in total, and they are the whole contract.

- **`docs/PRODUCT.md`** — what the game is, what the slice contains, what is
  deliberately parked.
- **`docs/COMBAT.md`** — the turn, the ladder, the damage formula, the
  invariants.
- **`docs/ART_DIRECTION.md`** — the layers, the sizes, the pipeline, the
  content validation.
- **`docs/CONTRIBUTING.md`** — how to work here, and the input contract.

`archive/` holds the pre-reset design stack — 128 numbered articles, a 234 KB
chronicle, four specialist agent roles. It is **history and binds nothing.** No
active code may import from it, and no change needs to cite it.

## Commands

```
npm install
npm run dev            # vite, http://127.0.0.1:5173
npm run build          # typecheck + bundle
npm test               # unit tests
npm run test:browser   # Playwright, Chromium at 390x844
npm run art            # rebuild public/assets from the masters
npm run balance        # deterministic fight simulation
```

`npm run test:browser` needs a Chromium. `npx playwright install chromium`, or
set `CHROMIUM_PATH` to one already on the machine.

## Layout

```
src/
  main.ts        boot and mount, and nothing else
  app/           the root controller and the one dispatcher
  game/          GameState, the reducer, saves, dev fixtures
  combat/        dice, scoring, resolution
  exploration/   (folded into game/reducer while the slice is this small)
  content/       dice, relics, enemies, rooms, copy, tray geometry
  render/        the fixed-order compositor, the asset manifest, animation
  ui/            views and components
test/
  unit/          pure functions and invariants
  browser/       Playwright journeys — these decide completion
  balance/       policies, simulation, the report
tools/           the art pipeline and a screenshot helper
```

Game logic never imports from `ui/` or `render/`. The reducer is the only thing
that produces a `GameState`.

## The rules that matter

- **A green unit suite is not completion.** The journey passes in a browser, or
  it is not done.
- **Every verb is a real `<button>`. All art is `pointer-events: none`.** Touch
  targets are at least 44 px.
- **An unavailable action is hidden, never shown disabled** as the only
  explanation of what to do.
- **Game state is pure data.** Rendering decides nothing; animation reveals an
  outcome the reducer already computed.
- **Enemy art is a build requirement.** A missing enemy asset fails the tests,
  not the player.
- **Prefer deleting an obsolete abstraction to adapting it.** Git remembers.
- **No new gameplay noun** — collectible species, status family, screen mode,
  UI panel — without a product decision.

## Dev fixtures

Any mode is reachable from a URL, which is what keeps the ends of the game
testable: `?room=gate&hp=1&mode=combat`, `?mode=dead`, `?dice=pusher,leech`.
See `src/game/fixture.ts`.
