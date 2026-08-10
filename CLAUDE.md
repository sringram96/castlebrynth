# Castlebrynth

A portrait pixel-horror roguelike: descend through hand-authored rooms carrying
a pile of thirty bones, fight grotesque things by choosing how many of those
bones to risk against the line they have already thrown, collect strange named
bones, and decide how far to push before the dungeon kills you.

## Read these first

Four documents, about twenty minutes in total, and they are the whole contract.

- **`docs/PRODUCT.md`** — what the game is, what the slice contains, what is
  deliberately parked.
- **`docs/COMBAT.md`** — the round, the smash, the bones, the invariants.
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
  game/          GameState, the reducer, saves, dev fixtures,
                 the dungeon director, the generated map
  combat/        fielding, throwing, sorting, the smash
  exploration/   (folded into game/reducer while the slice is this small)
  content/       bones, rewards, enemies, room templates, run plans,
                 copy, tray geometry
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
- **A room template names no destination.** `content/rooms.ts` owns what
  happens in a place; the generated `RunMap` owns where it leads. A room
  instance is a map node, never a template id — `roomAt(run)` is the only join.
- **No new gameplay noun** — collectible species, status family, screen mode,
  UI panel — without a product decision.
- **No hit points and no damage number, under any name.** Life is a pile of
  objects; what happens to it is that objects break. A bone counter that
  behaves like a health bar is the game this replaced, wearing its coat.
- **Asset bytes are reported, never capped.** There is no global runtime-art
  payload ceiling. Loading is staged instead — see `src/render/loader.ts`.

## No art in the polish sweep

While `POLISH_PROGRESS.md` is open, **no coding agent may author, generate,
redraw, repaint, trace, recolour, crop, upscale or otherwise modify any visual
asset** — no PNG, SVG, sprite sheet, icon, particle texture or CSS-drawn
pixel-art stand-in, and no "temporary" or "placeholder" graphic. Existing art
may be measured, positioned, clipped, transformed and animated; its pixels may
not be touched. A change that genuinely needs a new asset stops and records a
`## HUMAN ART REQUIRED` entry in `POLISH_PROGRESS.md` instead, and every task
that does not need it continues.

## Dev fixtures

Any mode is reachable from a URL, which is what keeps the ends of the game
testable: `?room=gate&bones=1&mode=combat`, `?mode=dead`,
`?specials=cinderbone,knuckle`, `?phase=smashed`. `?room=` names an
authored template and stands you in the first room of the run that used it;
`?node=n8` names one exact room.
See `src/game/fixture.ts`.
