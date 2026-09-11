/**
 * The strip: a map that only knows what you saw.
 *
 * A run is a reel, and a reel deserves a filmstrip. This derives one from
 * settled state and **adds nothing to the save**: `run.path` is the frames,
 * `run.map` is what led out of each of them, and the join between a node and
 * the place it stands in is `roomAt` exactly as it is everywhere else.
 *
 * ## Ahead is void
 *
 * The strip shows what was seen and nothing else. No sockets for rooms not
 * reached, no count of what is left, no silhouette of the plan — *we hide
 * places, never rules*, and what is down the other road is the one thing a run
 * is allowed not to know. What it *may* show is a road whose mouth the player
 * has already stood in front of and read: a junction that has been walked out
 * of knows which ways it offered, and the label on an untaken mouth is the
 * label that was on the hotspot.
 *
 * That is why a mouth is only derived for a frame the run has **left**. The
 * room being stood in has its ways out in the picture, where they are pressed;
 * printing them in the strip as well would be the overlay telling the player
 * where they are about to be able to go.
 */

import type { Territory } from '../content/roomTypes.js'
import { nodeAt, roomAt } from './map.js'
import type { RunState } from './state.js'

/** A way out of a visited room that this run did not take. */
export interface StripMouth {
  /** The label that was on its hotspot. Two words or fewer. */
  readonly label: string
  /** The node it leads to. Carried for the DOM, never rendered as a name. */
  readonly to: string
}

/** One frame of the strip: a room this run has stood in. */
export interface StripFrame {
  readonly nodeId: string
  /** The authored place's name. You have stood in it; it is not hidden. */
  readonly name: string
  readonly territory: Territory
  readonly depth: number
  /** Where the run is now. Exactly one frame carries it. */
  readonly current: boolean
  /** The roads out of here that this run did not take. Empty for most rooms. */
  readonly mouths: readonly StripMouth[]
}

/**
 * Every room the run has stood in, in the order it stood in them.
 *
 * Oldest first — the view puts the most recent at the bottom, which is the
 * direction a descent runs.
 */
export function stripOf(run: RunState): readonly StripFrame[] {
  const path = run.path.length > 0 ? run.path : [run.roomId]
  return path.map((nodeId, index) => {
    const node = run.map.nodes[nodeId]
    const next = path[index + 1]
    const place = node ? roomAt(run, nodeId) : undefined
    return {
      nodeId,
      name: place?.name ?? '',
      territory: node?.territory ?? 'threshold',
      depth: node?.depth ?? index,
      current: nodeId === run.roomId && index === path.length - 1,
      // A frame the run has not left yet shows no mouths: its ways out are in
      // the picture, under the thumb, and the strip is a record rather than a
      // plan. See the note at the top of this file.
      mouths:
        next === undefined
          ? []
          : (node?.exits ?? [])
              .filter((exit) => exit.to !== next)
              .map((exit) => ({ label: exit.label, to: exit.to })),
    }
  })
}

/** Which territory a node of this run is in. */
export function territoryAt(run: RunState, nodeId: string = run.roomId): Territory {
  return nodeAt(run.map, nodeId).territory
}

/**
 * Whether the room the run is standing in is its **first** in this territory.
 *
 * Derived from the path and nothing else, which is the whole reason a title
 * card needs no state: the run walked threshold → ossuary → chapel, and the
 * first ossuary node in `path` is the one the card belonged to. A descent that
 * comes back up into the threshold at the gate does not get the card twice —
 * first is first.
 */
export function firstEntryToTerritory(run: RunState): boolean {
  const here = run.roomId
  const territory = territoryAt(run, here)
  const first = run.path.find((nodeId) => run.map.nodes[nodeId]?.territory === territory)
  return first === undefined ? true : first === here
}
