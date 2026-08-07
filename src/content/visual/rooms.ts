/**
 * Where the authored plates stand — art. 126, art. 127.
 *
 * A room's *geometry* is `src/content/rooms.ts`: its three numbers, its
 * shape, its school, its features, its props. None of that moves. This file
 * is the layer above it — what a room additionally carries, as placements
 * into the bands art. 127 declares.
 *
 * It is keyed on the room template (art. 34: knowledge attaches to things,
 * not places) and it is a **lookup, not a field**, so a room with no art here
 * is a room that renders exactly as it did before this wave. That is the
 * whole shape of the migration: additive, and reversible by deleting a key.
 */

import type { WorldMark } from '../../room/index.js'
import type { AnimatedPatch, PlacedPlate, SceneArt } from '../../visual/index.js'
import { Layer, NO_ART } from '../../visual/index.js'
import { RENDER } from '../render.js'

/** The floor, in world units. `src/content/rooms.ts`'s own constant. */
const FLOOR = -RENDER.eye

const at = (X: number, z: number, width: number, height: number, Y = FLOOR): WorldMark => ({
  X,
  Y,
  z,
  width,
  height,
})

/**
 * art. 107: **the candle is a loop, and a loop is one of a room's three.**
 * Two authored frames on the world clock, five pixels wide, repainted alone
 * — which is the argument for patches said as a number: the thing that moves
 * is sixty-five pixels, so the room is not recast for it (art. 110).
 *
 * The phase is hashed off the id, so two candles in one room do not gutter
 * together and the same candle guts the same way every time you stand there
 * (art. 109).
 */
const candle = (id: string, mark: WorldMark, every = 3): AnimatedPatch => ({
  id,
  frames: ['patch.candle.a', 'patch.candle.b'],
  every,
  anchor: { space: 'world', at: mark },
  layer: Layer.Patch,
  trigger: 'idle',
})

/**
 * art. 126: **what you are carrying, at the bottom edge of the lens.**
 *
 * It is anchored to the frame and not to the room, so it does not diminish,
 * does not move when the box does, and sits in the same corner on a phone of
 * any height (arts 22, 24). It is the one plate every room gets, because it
 * is not the room's — it is yours, and the reference is emphatic that the
 * first-person presence at the lower edge is most of what makes the frame a
 * place you are standing in rather than a picture you are looking at.
 */
export const LANTERN: PlacedPlate = {
  asset: 'hand.lantern',
  layer: Layer.FirstPerson,
  anchor: { space: 'frame', x: 0.13, y: 1.0, origin: 'bottom-center', width: 0.2 },
}

/**
 * The rooms that have been dressed. Everything absent from this map is a
 * room rendering as it always did (art. 26's first tier, which is a floor
 * and not a failure).
 */
const DRESSED: Readonly<Record<string, SceneArt>> = {
  /**
   * The choir — the ossuary's lair.
   *
   * art. 83: **it carries no horror.** The Marrow floats into this room's
   * socket and could float into another; its plate is the encounter's and
   * lives in `horrors.ts`, exactly as its words live beside it in
   * `encounters.ts`. A room that named its own horror here would be a room
   * speaking for what fills it.
   *
   * art. 104: so the hero band is empty until something stands in it, and
   * what stands in it is the one thing — never two. The room's own authored
   * things (the cage, the faces in the niches) stay props inside the cast.
   */
  'room.lair.choir': {
    foreground: LANTERN,
    patches: [candle('choir.candle.left', at(-10, 14, 1.5, 3.4, FLOOR + 6.5))],
  },

  /**
   * The bonefield — a passage, so it gets material and no hero. The stack
   * stands against the left wall at a depth rather than being painted on
   * it: a raster laid flat on a perspective wall would not shear with the
   * wall, which is the flat-crest defect art. 102 named about masses, one
   * level up.
   */
  'room.passage.bonefield': {
    overlays: [
      {
        asset: 'ossuary.bone-stack',
        layer: Layer.Architecture,
        anchor: { space: 'world', at: at(-6.5, 17, 9, 4.9) },
      },
    ],
    foreground: LANTERN,
    patches: [candle('bonefield.candle', at(7.6, 13, 1.5, 3.4, FLOOR + 5))],
  },
}

/**
 * What a room carries. `NO_ART` for anything undressed, which is most of
 * them and is not a defect.
 */
export function artFor(room: string): SceneArt {
  return DRESSED[room] ?? NO_ART
}

/** Every dressed room, for the manifest test and for the dev harness. */
export const DRESSED_ROOMS: readonly string[] = Object.keys(DRESSED).sort()

/** Every asset any room asks for, so the loader can be handed one list. */
export function assetsWanted(): readonly string[] {
  const wanted = new Set<string>()
  for (const art of Object.values(DRESSED)) {
    for (const one of art.overlays ?? []) wanted.add(one.asset)
    if (art.hero !== undefined) wanted.add(art.hero.asset)
    if (art.foreground !== undefined) wanted.add(art.foreground.asset)
    for (const patch of art.patches ?? []) for (const frame of patch.frames) wanted.add(frame)
  }
  return [...wanted].sort()
}
