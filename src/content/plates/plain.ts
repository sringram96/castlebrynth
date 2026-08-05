/**
 * An ordinary room: the computed box, its masonry, and whatever stands in
 * it.
 *
 * art. 26's first tier — the computed box plus sprites, deliberately basic
 * now and improved over time. What makes one room not another is authorial
 * and lives with the scene (art. 21): its school, its three numbers, and its
 * own props. The engine only computes; this decides.
 */

import type { Mass, Prop, RoomShape, Scene, View } from '../../room/index.js'
import type { School } from '../palettes.js'
import { lookOf } from '../palettes.js'
import { RENDER } from '../render.js'
import { masonry } from './wake.js'

/** What a room puts in front of the player, given the view it is seen from. */
export type Dressing = (view: View) => readonly Prop[]

/** A room with nothing standing in it. */
export const BARE: Dressing = () => []

export function plainScene(
  id: string,
  school: School,
  shape: RoomShape,
  dressing: Dressing = BARE,
  /** art. 102: what lies on this room's floor, if anything lies on it. */
  mass?: Mass,
): Scene {
  return {
    id,
    shape,
    look: lookOf(school),
    ...(mass === undefined ? {} : { mass }),
    surfaces: masonry(school, shape, RENDER.eye),
    // art. 19: painted near over far, so the list is declared far to near.
    props: (view) => [...dressing(view)].sort((one, other) => other.z - one.z),
  }
}
