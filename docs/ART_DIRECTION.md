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
| 1 | `midground` | the room's **prop**: the one object that is pressed |
| 2 | `enemy` | **mandatory in combat** |
| 3 | `foreground` | the player's own arm, and occluders |
| 4 | `fx` | hit flash, shake, damage numbers, vignette |
| 5 | `hud` | the word band, the intent, the tray — never world art |

## Sizes

- Scene: **480 × 720**, portrait, `object-fit: cover` into the world zone.
- Enemy sprites: at most 480 wide, binary alpha, trimmed to their silhouette.
- Runtime payload budget: **4.5 MB**. It is measured by
  `test/unit/assets.test.ts` and printed by `npm run art`. It was 4 MB for nine
  rooms; the Reliquary and the Chain Vault cost 512 KB of backdrop between them
  and there is no posterisation of two dark, gradient-heavy plates that reaches
  4 MB without banding them visibly. The comment on the test carries the
  measured before and after. **Raising it again is a product decision**, and
  the headroom is deliberately smaller than one backdrop so that it has to be.

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
silhouette, and a die climbing out of a basin changes that silhouette every
frame.

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
a vignette pulse. Combat impact is sprite translation, a one-frame brighten,
a screen shake and a damage number.

Animation reveals an outcome that is already committed. **No animation
contains game logic**, and no roll or branch happens inside a timeline. With
`prefers-reduced-motion`, everything resolves instantly to its settled state
and nothing is lost.

## Acceptance

- At 390×844, every combat screenshot shows the enemy without tapping.
- Each room in the slice is distinguishable as a thumbnail.
- No gameplay text sits on a busy focal region without a scrim.
- Dice, face marks, selected state, held state and the damage preview are
  readable at arm's length.
