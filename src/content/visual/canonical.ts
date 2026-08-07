/**
 * The canonical screen — the fixture the art is iterated against.
 *
 * `reference/visual/canonical-screen.png` is the composition and density
 * target: a portrait first-person corridor, the world holding most of the
 * frame, a thing inhabiting the actual room, what you are carrying at the
 * lower edge, and a reliquary of a tray beneath it with the dice in the
 * middle, the body on one side and what you carry on the other.
 *
 * This file is that still, as state. It exists so that laying out a tray or
 * redrawing a horror does not mean playing down three depths first, and so
 * that two people looking at "the canonical screen" are looking at the same
 * pixels — it is deterministic in every particular, including the seed and
 * the faces the dice are showing.
 *
 * **It is development-only.** The harness that loads it is behind
 * `import.meta.env.DEV`, so nothing here is reachable from a built game and
 * none of it is player UI (which would be a debug control wearing an offer's
 * coat, and art. 118 has opinions about those).
 */

import type { SceneArt } from '../../visual/index.js'
import { artFor } from './rooms.js'

export interface CanonicalScreen {
  /** The room the still is composed in. Dressed, so the plates are in it. */
  readonly room: string
  /** The thing in it. It is the room's own, so art. 83 is not being bent. */
  readonly horror: string
  /** How many dice the tray is drawn with, unless the harness says otherwise. */
  readonly dice: number
  /** Where the body stands, so the vitals are not all full and meaningless. */
  readonly health: number
  readonly healthMax: number
  readonly armor: number
  /**
   * The seed. Fixed, because "deterministic" has to include which faces are
   * showing — a fixture whose dice differ between two loads is a fixture two
   * people cannot discuss.
   */
  readonly seed: number
  /** Which turn the still is on, so the intent on the crown is a real one. */
  readonly turn: number
}

export const CANONICAL: CanonicalScreen = {
  // The ossuary's lair: a chamber, lit close, with the Marrow standing in
  // it and a candle guttering at the left wall. It is the room in the
  // shipped content that is nearest the reference's composition.
  room: 'room.lair.choir',
  horror: 'horror.marrow',
  dice: 6,
  health: 38,
  healthMax: 64,
  armor: 2,
  seed: 0x0cab1e,
  turn: 2,
}

/** The still's art: the room's own, so the fixture cannot drift from the game. */
export function canonicalArt(): SceneArt {
  return artFor(CANONICAL.room)
}
