/**
 * The layer order — art. 127.
 *
 * Before this file, z-order was an implicit property of the sequence a
 * caller happened to paint in: `renderRoom` painted props far to near
 * (art. 19), `overpaint` laid the advance and the stir on top of that, and
 * the shell laid the marks, the crown and the sheet over the canvas in DOM
 * order. Three different statements of "what is in front of what", none of
 * them written down, and nothing that could be tested.
 *
 * art. 127 makes the order one declared list. Everything composited into a
 * frame names a band on it, and the compositor sorts by band and then by
 * declaration order — so a plate cannot be in front of the thing it is
 * behind by accident, and a new kind of thing has to *say* where it goes.
 *
 * The bands below 10 are the world's and are painted into the frame by
 * `compositor.ts`. Ten and eleven are the HUD's and are DOM: the tray, the
 * marks, the crown, the pops. They are named here anyway, because the point
 * of the article is that there is one order and not two — a band that lives
 * in the DOM is still a band, and saying so is what stops a twelfth place
 * for things from being invented under it.
 */

export const Layer = {
  /** Backing black. Nothing authored lives here; it is what a frame starts as. */
  Void: 0,
  /** The computed box: surfaces, thresholds, mass, contour (arts 15, 93). */
  Room: 1,
  /** Authored material laid over a school's own surfaces (art. 126). */
  Material: 2,
  /** Architecture standing on or against the walls (art. 99). */
  Architecture: 3,
  /** Things at depth, behind whatever the room is about. */
  Distant: 4,
  /** art. 104: the one thing. A room has at most one of these. */
  Hero: 5,
  /** Objects nearer the camera than the hero (art. 105). */
  Foreground: 6,
  /** arts 107, 127: the small moving parts, repainted alone. */
  Patch: 7,
  /** Fields on the air — motes, dust, rain (art. 101). */
  Atmosphere: 8,
  /** What you are carrying, at the bottom edge of the world (art. 126). */
  FirstPerson: 9,
  /** DOM: the tray, the marks, the crown (arts 29, 67). */
  Hud: 10,
  /** DOM: the pops, the shake, the flash (art. 119). */
  Feedback: 11,
} as const

export type VisualLayer = (typeof Layer)[keyof typeof Layer]

/** Every band, in the order they are painted. The list *is* the order. */
export const LAYER_ORDER: readonly VisualLayer[] = [
  Layer.Void,
  Layer.Room,
  Layer.Material,
  Layer.Architecture,
  Layer.Distant,
  Layer.Hero,
  Layer.Foreground,
  Layer.Patch,
  Layer.Atmosphere,
  Layer.FirstPerson,
  Layer.Hud,
  Layer.Feedback,
]

/**
 * The bands the compositor paints into the world frame. Past this, a band is
 * the DOM's and the compositor never sees it.
 */
export const LAST_WORLD_LAYER: VisualLayer = Layer.FirstPerson

/** Whether a band is painted into the frame rather than laid over it in DOM. */
export function inTheWorld(layer: VisualLayer): boolean {
  return layer <= LAST_WORLD_LAYER
}

/** The names, for a test's failure message and for nothing else. */
export const LAYER_NAMES: Readonly<Record<VisualLayer, string>> = {
  [Layer.Void]: 'void',
  [Layer.Room]: 'room',
  [Layer.Material]: 'material',
  [Layer.Architecture]: 'architecture',
  [Layer.Distant]: 'distant',
  [Layer.Hero]: 'hero',
  [Layer.Foreground]: 'foreground',
  [Layer.Patch]: 'patch',
  [Layer.Atmosphere]: 'atmosphere',
  [Layer.FirstPerson]: 'first-person',
  [Layer.Hud]: 'hud',
  [Layer.Feedback]: 'feedback',
}
