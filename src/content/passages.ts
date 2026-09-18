/**
 * Where a shut way is drawn, in each painting that has one.
 *
 * **A room that will not let you through should look like it.** Until now a
 * blocked direction was simply absent — `exitsAvailable` and the reducer's GO
 * guard decided it, the view drew nothing, and a wall the player could not
 * pass looked exactly like a wall that was never a way at all. *We hide
 * places, never rules*, and "there is no road north" and "the road north is
 * gated" are two different rules wearing the same picture.
 *
 * So each backdrop declares the painted openings it has, and what state each
 * one is in decides what is laid over it:
 *
 *   `open`     nothing. The way out is its own hotspot and always was.
 *   `sealed`   no exit in that direction at all — rubble, the arch fallen in.
 *   `locked`   an exit that wants a key — the gate, with the lock's own verb
 *              already seated on it by `worldView`.
 *   `guarded`  an exit the room is holding shut because something is alive in
 *              it. The gate again: the passage is there and something is
 *              standing in it, which is not the same as it having collapsed.
 *
 * ## The boxes
 *
 * Fractions of the 480 x 720 scene: `x` and `y` are the centre of the opening
 * and `width`/`height` are how much of the frame it fills, so the plate is
 * stretched to the painted arch rather than seated by its own silhouette. They
 * are read off each painting by eye, which is the only honest way to set them,
 * and they are per **art** rather than per room — two rooms sharing a backdrop
 * share its arches, because they are the same picture.
 *
 * A painting with no entry here draws no barriers. That is deliberate and it
 * is the honest default: the Reliquary and the Sanctuary are authored fixture
 * rooms whose ways out are seated on painted features rather than compass
 * seats, and a rubble plate dropped on one would be covering a door the
 * painter drew open.
 */

import type { Direction } from './areas.js'

export interface PassageSeat {
  readonly direction: Direction
  /** The centre of the painted opening, in fractions of the scene. */
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

/** What a seat is doing, in the order of how much it stops you. */
export type PassageState = 'open' | 'locked' | 'guarded' | 'sealed'

export const PASSAGE_SEATS: Readonly<Record<string, readonly PassageSeat[]>> = {
  entry: [{ direction: 'north', x: 0.535, y: 0.505, width: 0.13, height: 0.21 }],
  hall: [{ direction: 'north', x: 0.51, y: 0.485, width: 0.13, height: 0.21 }],
  choir: [{ direction: 'north', x: 0.525, y: 0.49, width: 0.15, height: 0.24 }],
  deep: [{ direction: 'north', x: 0.506, y: 0.477, width: 0.2, height: 0.23 }],
  gate: [{ direction: 'north', x: 0.5, y: 0.525, width: 0.36, height: 0.4 }],
  'chain-vault': [
    { direction: 'north', x: 0.665, y: 0.255, width: 0.125, height: 0.19 },
    { direction: 'west', x: 0.267, y: 0.345, width: 0.17, height: 0.19 },
    { direction: 'east', x: 0.6, y: 0.574, width: 0.19, height: 0.22 },
  ],
  'bellworks-hanging': [{ direction: 'north', x: 0.5, y: 0.575, width: 0.24, height: 0.25 }],
  'bellworks-rope': [{ direction: 'north', x: 0.535, y: 0.54, width: 0.22, height: 0.29 }],
  'bellworks-weight': [
    { direction: 'west', x: 0.207, y: 0.505, width: 0.25, height: 0.31 },
    { direction: 'east', x: 0.79, y: 0.562, width: 0.25, height: 0.29 },
  ],
  'bellworks-service': [{ direction: 'north', x: 0.49, y: 0.428, width: 0.24, height: 0.39 }],
  'bellworks-balcony': [{ direction: 'east', x: 0.934, y: 0.498, width: 0.115, height: 0.125 }],
  'bellworks-nest': [{ direction: 'east', x: 0.82, y: 0.39, width: 0.19, height: 0.28 }],
}

/**
 * The one painting whose shut state is a painting rather than a patch.
 *
 * The Remembered Stair's north arch is most of its frame, so a plate laid over
 * it would read as a patch on a wall. Two whole repaints of the room arrived
 * instead — the arch fallen in, and the arch gated — and the backdrop swaps
 * for them. `render/passages.ts` is what chooses; this names the art it
 * applies to, so the rule is one word rather than a string comparison spread
 * through the view.
 */
export const HALL_ART_ID = 'hall'
