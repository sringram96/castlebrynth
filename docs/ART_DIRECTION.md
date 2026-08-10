# ART_DIRECTION.md

The look, the layers, and the pipeline. Read time: five minutes.

## The promise

Dense, deliberate pixel-horror composition. Places that feel authored rather
than procedurally decorated. Grotesque silhouettes that are memorable objects
in the world, not decoration behind a combat UI.

The north star is `docs/art-reference/visual/canonical-screen.png`. The three
`territory-*.png` beside it name the territory, and the enemy sprites the game
ships are cut out of them.

**Art is not phase 2.** The game is partly an art experience; the systems are
in service of it.

## The layers

One fixed compositor. The order is an enum and cannot be varied at runtime, so
there is no path where a backdrop ends up above an enemy.

| # | Layer | What it holds |
| --- | --- | --- |
| 0 | `backdrop` | the opaque room image |
| 1 | `midground` | the room's **props**: every object that is pressed |
| 2 | `enemy` | **mandatory in combat** |
| 3 | `foreground` | the player's own arm, and occluders |
| 4 | `fx` | break flash, shake, dust, vignette |
| 5 | `hud` | the word band, the intent, the tray — never world art |

## Sizes

- Scene: **480 × 720**, portrait, `object-fit: cover` into the world zone.
- Enemy sprites: at most 480 wide, binary alpha, trimmed to their silhouette —
  **unless the encounter is a family of poses**, in which case every plate is
  the whole 480 × 720 scene and nothing is trimmed. A trimmed sprite is
  registered by its own silhouette, which is fine for a thing with one; the
  Warden has ten and they differ enormously, so trimming each and sizing each
  to one CSS width would change the figure's size every time its pose changed.
  Whole frames cost bytes and buy registration. `isScenePlate` in
  `src/render/assets.ts` is how the compositor tells the two apart, and it asks
  the art rather than content.
- **There is no runtime payload budget.** There was one — 4 MB, then 4.5, then
  5.6 — and every raise came with an argument about whether a backdrop or a
  pose family was worth its bytes. That argument had the priorities backwards.

  The order is: **authored state coverage first, delivery architecture second,
  byte minimisation third.** A single global number made the first of those
  compete with itself, so that a fifth authored pose for an enemy nobody had
  reached yet was a cost to the title screen.

  What replaced it is architecture, not a bigger number. `src/render/loader.ts`
  decodes what the screen needs and prefetches what the screen after it will
  need, so a family costs the fight that uses it. Bytes are **measured and
  reported** — `npm run art` prints them, and `test/unit/assets.test.ts` prints
  them per family — and never capped. The gates that replaced the cap are
  behavioural and live in `test/browser/loading.spec.ts`:

  - the title renders without decoding every file;
  - a room decodes its own art, and the room ahead is fetched while the player
    is still reading this one;
  - no broken image is ever on screen, and no sequence begins by fetching its
    own first frame;
  - repeat visits reuse what was decoded;
  - no input is lost to loading.

  Do not reintroduce a total-MB ceiling under another name, and do not compress
  or delete authored pose coverage to hit an arbitrary total. A room or an
  encounter is never rejected for having more frames than its neighbours, and
  the generated map may not decline an authored place because of what it
  weighs — `validateRunMap` asks whether the art can hold the fight, never what
  the art costs.

Masters (1024×1536, 2–4 MB each) live in `docs/art-reference/masters/` and are
never served.

## The pipeline

`npm run art` reads masters and writes `public/assets/`. It is deterministic:
same masters in, same bytes out.

Backdrops are cover-cropped, box-resampled and posterised. Enemies are cut out
of the scene they were painted into with a radial luminance key grown from
hand-placed seeds inside the figure, then closed, hole-filled, pruned of
islands, trimmed and edge-darkened. The matte is not perfect and does not need
to be: every backdrop it composites over is near black where the figure's edge
falls, so what survives of the original surround reads as the thing's own
shadow.

Seeds and thresholds are in `tools/art.mjs` and were set by eye against the
output. That is the only honest way to set them.

**Authored sets do not need any of that.** A set drawn for the game arrives as
the corridor with nothing in it, plus each subject alone on a flat black field
at the same frame and the same pixel size. Then the key is one threshold, a
morphological close to seal the dark seams that run out to the frame's edge, a
hole fill and a speck prune — no seeds, no radial threshold, nothing set by
eye. `docs/art-reference/masters/crawling-one/BRIEF.md` is the contract, and
the Crawling One is the set built that way.

Poses are named `<art>.<pose>` in the manifest. A thing that closes carries one
per reach plus one for the instant it is struck; because a source swap changes
no placement, an impact plate is only shown where its box matches the plate it
replaces.

**Props are the same idea with the opposite constraint.** A room's focal object
— the font's chalice is the first — is keyed `<art>.<frame>` and every frame is
a **whole scene plate** at 480 × 720 rather than a trimmed sprite. The
midground cover-fits them exactly as the backdrop is cover-fitted, so the
object sits where it was painted at every viewport with no coordinate anywhere.
That is what lets eight frames pass through one element during a throw without
the object moving by a pixel; a trimmed plate is registered by its own
silhouette, and a bone climbing out of a basin changes that silhouette every
frame.

A room may hold **several** props, and then each is its own plate on the same
layer and each can change while the others hold still. They arrive in one of two
shapes and the pipeline supports both: **registered**, every frame painted where
the object stands on the background's own canvas, which is what a family that
moves must be; or a **portrait plus a stance**, the object centred in its own
frame with its place in the room declared once in `tools/art.mjs`, which is what
an object painted once may be. The Reliquary's altar, bell, candle stand and
chest are the second kind. Placement is the pipeline's job in both; the pixels
are the painter's, and no code may touch them.

When an object has one authored plate and more than one position — a candle
stand that is lit and also out — the position is carried as `look` on the plate
and the difference is a **treatment in the stylesheet**, never an invented
drawing. It is a stand-in, it is recorded under `## HUMAN ART REQUIRED`, and it
comes out the day the plate lands.

## Content validation

Enemy art is a **content requirement, not a fallback**. An enemy without a
loaded hero asset is not a plainer fight, it is an absent opponent — which is
the exact defect this reset exists to fix.

- Every enemy in the roster must have an asset on disk. Missing art fails
  `npm test`, not the player.
- Every room must have a backdrop.
- The enemy silhouette must cover a minimum fraction of the combat viewport.
  Checked in the browser, not just in the model.

Scenery may degrade. The opponent may not.

## Motion budget

Idle motion is tiny and high-impact: a slow enemy breath, a candle flicker,
a vignette pulse. Combat impact is one bone breaking in its lane, a one-frame
brighten on the body, and a screen shake.

**There is no damage number, because there is no damage.** What happened when
you won a lane is that one of its bones broke, and that bone is on screen, in
its lane, breaking. A figure rising off the enemy would be arithmetic drawn
over the top of a physical fact. The only number combat ever raises is the
pile's own delta — a count of objects — over the orb that holds them.

Animation reveals an outcome that is already committed. **No animation
contains game logic**, and no roll or branch happens inside a timeline. With
`prefers-reduced-motion`, everything resolves instantly to its settled state
and nothing is lost.

## Acceptance

- At 390×844, every combat screenshot shows the enemy without tapping.
- Each room in the slice is distinguishable as a thumbnail.
- No gameplay text sits on a busy focal region without a scrim.
- Enemy line, player line, special sigils, casualty state and the living-bone
  count are readable at arm's length. Both lines are on the plate, in column —
  lane N against lane N is the whole smash rule, so the column has to read as
  a pairing before anything animates.
- **A seven and an eight are readable without a tooltip.** No die anybody has
  held has those faces, so there is no pattern to recognise: they print their
  numeral over the pips, and the numeral is the truth.
- A broken bone is not conveyed by colour alone. It darkens, it drops, and it
  carries a fracture across it.
- Every enemy has a visible end. An army that empties and then simply stops
  being drawn is a fight that ended without the player seeing it end.
