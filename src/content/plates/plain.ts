/**
 * A room with nothing standing in it — the computed box and its masonry,
 * and no props at all.
 *
 * The skeleton's ordinary rooms are exactly art. 26's first tier: the
 * computed box plus sprites, deliberately basic now and improved over time.
 * There are no sprites yet, so what is left is honest — three authored
 * numbers, a palette school, and the same world-space masonry the wake is
 * cut from.
 */

import type { RoomShape, Scene } from '../../room/index.js'
import type { School } from '../palettes.js'
import { roomPalette } from '../palettes.js'
import { RENDER } from '../render.js'
import { masonry } from './wake.js'

export function plainScene(id: string, school: School, shape: RoomShape): Scene {
  return {
    id,
    shape,
    palette: roomPalette(school),
    surfaces: masonry(school, shape, RENDER.eye),
    props: () => [],
  }
}
