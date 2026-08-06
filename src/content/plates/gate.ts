/**
 * The threshold — the front door, as a room.
 *
 * It is the first pixels a new player ever sees, so it is in register
 * (art. 21, `rules/voice.md`): a room, cast the way every other room is
 * cast, with the verbs where verbs go and the word band carrying its line.
 * Not a main menu with a logo over it.
 *
 * It is not in the catalog and the dealer never deals it — you are not in
 * the labyrinth yet, which is the whole of what it has to say. It is the
 * one place in the game where the door in front of you is not blind
 * (art. 31): everybody knows what is behind this one.
 */

import type { RoomShape, Scene } from '../../room/index.js'
import { lookOf } from '../palettes.js'
import { MUTED } from '../palettes.js'
import { RENDER } from '../render.js'
import { crack, layered, pilasters, stringCourse } from './features.js'
import { threshold } from './props.js'
import { masonry } from './wake.js'

/**
 * art. 14: three numbers and a shape. A chamber, because a door is a hole
 * and a hole needs a wall (art. 97) — and this room is *about* its door.
 * Shorter and narrower than the Crossing: you are at the top of it.
 */
const SHAPE: RoomShape = { lens: 90, width: 9.5, ceiling: 6.5, back: 26 }

const FLOOR = -RENDER.eye

/** art. 97: the way down, shut. The one door this room has ever had. */
const DOOR = { X: 0, Y: FLOOR, z: SHAPE.back!, width: 7.4, height: 16 }

/**
 * The room at the top of the stair, and the only scene the shell casts
 * outside a run.
 */
export const GATE: Scene = {
  id: 'gate.threshold',
  shape: SHAPE,
  look: lookOf(MUTED),
  surfaces: masonry(MUTED, SHAPE, RENDER.eye, {
    // art. 99: it was built, and then it was left. The pilasters say the
    // first, the crack says the second, and between them the room reads as
    // a place somebody made rather than a place that happened.
    left: layered(stringCourse(11, 0.9), pilasters(8.5, 2, 2)),
    right: layered(stringCourse(11, 0.9), crack(17, 15, 1, 29)),
    back: stringCourse(11, 0.9),
  }),
  props: () => [threshold(MUTED, DOOR, { open: false, locked: false, warden: false })],
}
