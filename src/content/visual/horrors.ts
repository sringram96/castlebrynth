/**
 * What a horror is made of — arts 30, 83, 121.
 *
 * **art. 83 is why this is its own file.** A horror floats into a room's
 * socket; a room never speaks for what fills it. So a room's art may not
 * carry a horror's plate any more than a room's prose may carry a horror's
 * words — the encounter brings its own, and one drawing serves every room
 * the thing is ever dealt into.
 *
 * **art. 30 is why it interpolates.** There is no battle screen: a fight is
 * the room with the thing come close, so a plated horror is the same plate
 * at two sizes with the advance moving between them. It fills more of the
 * lens as it arrives and it is the same object throughout — which is the
 * whole of what "no battle screen" has to mean once the horror is authored
 * rather than massed.
 *
 * A horror with no plate here is a horror the hinge draws as it always did
 * (`horrorProp`, and the authored bodies in `src/content/plates/bestiary.ts`).
 * That is art. 26's two tiers, unchanged: the mass is the floor, the plate is
 * the hero moment, and the game does not stop working between them.
 */

import type { PlacedPlate } from '../../visual/index.js'
import { Layer } from '../../visual/index.js'

/**
 * A horror's plate, and how much of the lens it takes at either end of the
 * advance.
 *
 * Everything is a fraction of the frame rather than a world coordinate, for
 * the reason `horrorProp` already worked that way: the thing comes *at* you,
 * past where the box has any depth left to describe, so its size is a fact
 * about the lens and not about a z. Art. 22 is served either way — these are
 * ratios, and nothing here is a device pixel.
 */
export interface HorrorPlate {
  readonly asset: string
  /** Width as a fraction of the frame, standing off and arrived. */
  readonly far: number
  readonly near: number
  /** Where its feet land, as a fraction of frame height, standing off and arrived. */
  readonly footFar: number
  readonly footNear: number
}

const PLATED: Readonly<Record<string, HorrorPlate>> = {
  /**
   * The Marrow. Standing off, it is a shape at the end of the ossuary's
   * choir; arrived, it is most of the lens and its skull is above the
   * horizon, which is the reference's whole composition — the thing is
   * taller than you and you are looking up at it.
   */
  'horror.marrow': {
    asset: 'horror.marrow',
    far: 0.2,
    near: 0.66,
    footFar: 0.62,
    footNear: 1.02,
  },
}

/** The plate for a horror, or null for one the hinge still masses. */
export function horrorPlateFor(horror: string): HorrorPlate | null {
  return PLATED[horror] ?? null
}

/**
 * art. 30: the plate, at this much of the advance.
 *
 * `closeness` is the hinge's own — nought standing off, one arrived, and
 * past one is art. 119's telegraph swell, which is a thing filling more of
 * the lens and needs no special case here. The foot goes *past* the bottom
 * of the frame when it arrives: a thing at the near depth is cut off by the
 * lens, and a horror politely standing inside the frame is a horror that has
 * not really come close.
 */
export function horrorPlateAt(plate: HorrorPlate, closeness: number): PlacedPlate {
  const t = Math.max(0, closeness)
  const lerp = (from: number, to: number): number => from + (to - from) * t
  return {
    asset: plate.asset,
    layer: Layer.Hero,
    anchor: {
      space: 'frame',
      x: 0.5,
      y: lerp(plate.footFar, plate.footNear),
      origin: 'bottom-center',
      width: lerp(plate.far, plate.near),
    },
  }
}
