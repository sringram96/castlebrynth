# Castlebrynth

A portrait pixel-horror roguelike: descend through hand-authored rooms carrying
a pile of thirty bones, fight grotesque things by throwing six dice and a piece
of iron, holding and rerolling the six into Yahtzee-like hands, and turning the
total through the hand's multiplier into damage — and decide how far to push
before the dungeon kills you.

## Read these first

Four documents, about twenty minutes in total, and they are the whole contract.

- **`docs/PRODUCT.md`** — what the game is, what the slice contains, what is
  deliberately parked.
- **`docs/COMBAT.md`** — the attack, the scorecard, the enemy's two numbers,
  the invariants.
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
  combat/        the dice, the scorecard, and the one damage equation
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
  A template *does* say **where in its picture** each way out stands; the map
  binds its edges to those anchors in declaration order.
- **The run is a forward-only reel.** The map is a DAG and `validateRunMap`
  asserts it. The maze feeling is seeing the mouths of roads you cannot take,
  not walking back up one. Written to be repealed in one line — see
  `cyclesIn` — rather than re-litigated.
- **We hide places, never rules.** A way says what it costs and what it pays
  before the press; a room that charges prints the price on the verb before the
  verb charges; a found thing states its exact mechanic where it lies.
- **Movement is in the picture, and loot happens in the world.** There is no GO
  button in the tray and no reward screen: an open exit is a hotspot on the
  painted feature it passes through, and what a fight pays falls beside the
  body with its own LOOK and its own TAKE. A held exit renders **nothing**.
- **A run starts with six bare bones and nothing else.** Every carried thing is
  found somewhere, and which route a run takes is which build it gets.
- **Every draw is positioned by the node it happens in**, never by how far the
  run walked to get there.
- **No new gameplay noun** — collectible species, status family, screen mode,
  UI panel — without a product decision.
- **The player has no separate HP field: `run.bones` is life.** Enemies
  intentionally *do* have explicit HP and explicit damage, and both are on
  screen before anything is committed — damage as a **printed ladder** with one
  rung live, and `breakFor` in `content/enemies.ts` is the only thing that may
  compute which rung a turn is on. Combat complexity belongs in the six rolled
  dice, the hand they make and the loadout that rolls beside them — not in
  status or attack-script subsystems.
- **A core die is its faces and nothing else.** No rule, no trigger, no keyword,
  and every face an integer 1–6. There are eight of them; nothing outside
  `content/dice.ts` knows how many. A crooked die changes what the throw comes
  up with and never what the throw means.
- **A bargain is a specific die, priced before the press, and never lethal.** The
  hand is six and nothing sits outside it: taking one means giving one up, in the
  same transition. The picker is presentation-local and cancel charges nothing.
- **Bones are health, and only health.** An attack throws **six**, always, at
  thirty bones and at one. `min(6, run.bones)` is repealed: what a wound costs
  is exchanges, not dice, because the run's progression is *replacement* — a
  found die takes one of six slots and never adds a seventh.
- **Armour is a die, never a stat.** The iron die rolls each turn on ROLL,
  cannot be held or rerolled, and blocks what it shows off that turn's answer.
  Never reintroduce an always-on damage-reduction stat under any name.
- **An item die has no press, ever.** It fires automatically at SCORE, as a beat
  in the cascade. A fourth press, or an item reroll, is explicitly rejected.
- **Everything the loadout adds is flat**, and it is added after the multiply.
  Global or compounding multipliers were measured and rejected.
- **Balance never assumes upside.** No gate, target or enemy number may require
  an item die, a talisman or the iron die.
- **One aggregate on screen.** The readout in the well, and nothing else. Every
  other number pops on the thing that made it — no fly-away figures migrating
  into a total, no receipt region.
- **A named hand is spent only when the player scores it.** No scratching, no
  burning, no forced zero. When nothing unspent fits there is CRAP, which is
  weak, reusable, and not a category.
- **Every multiplier lives in `HAND_DEFINITIONS`**, in one place. A multiplier
  written down twice is a multiplier that will disagree with itself.
- **Asset bytes are reported, never capped.** There is no global runtime-art
  payload ceiling. Loading is staged instead — see `src/render/loader.ts`.
- **Combat chrome obeys the art's pixel grid and palette.** A fill is a whole
  number of cells, a drain steps rather than slides, corners are square, and
  colours come from the existing tokens. See `docs/ART_DIRECTION.md`.
- **A frame holds what its composition says it holds.** Two budgets — furniture
  seated into the painting, and hotspots besides the ways out — set by the
  room's `composition`, which *is* the frame class; there is no second field.
  Exits are excluded: they are mandated, not decorative. A breach throws at the
  press of START. A LOOK whose only job is flavour has **no hotspot**, and its
  line folds into the arrival or into the room's one focal LOOK **verbatim** —
  the audit takes presses, never words.
- **Ambient motion moves like a sprite cycle, never like CSS.** Declared in
  content beside the seating it animates, whole pixels and whole quanta, one
  shared 5 Hz ticker, transforms and opacity only. Explore and idle only: never
  in a fight, never under a sequence, never behind an overlay, and **never under
  motion off** — ceremony vanishes whole. At most two sources in a room, the
  territory's counting as one.

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
testable: `?room=gate&bones=4&mode=combat`, `?mode=dead`, `?rolls=1`,
`?dice=6,6,6,4,4,3`, `?used=pair,triple`, `?enemyHp=20`, `?iron=2`,
`?iron=none`, `?items=splinter-fetish`, `?talismans=pair-talisman`,
`?offertory=paid`, `?vault=solved`. `?room=` names an authored template and
stands you in the first room of the run that used it; `?node=a8b` names one
exact room.
`?plan=descent|long-way|tithe` pins which of the three **grammars** a press of
DESCEND builds, by choosing the lowest seed that produces it. It is not a fixture
on its own: the run is still one the game could have dealt.
See `src/game/fixture.ts`.
