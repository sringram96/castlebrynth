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
  game/          GameState, the reducer, new runs, saves
  combat/        fielding, throwing, sorting, the smash
  exploration/   moving, looking, rewards
  content/       bones, rewards, enemies, rooms, the run graph, copy, assets
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
- No unexplained increase in player-facing nouns.
- Runtime asset payload **reported** in the description when it moves — the
  number is evidence for a reader, not a gate for a build.
