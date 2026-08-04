/**
 * The turn (arts 41–44). A first casting, keep any dice, exactly one second
 * casting of the rest. Nothing here scores: claiming is `combos.ts`.
 *
 * The intent is settled before a single die is thrown (art. 42), so
 * `openTurn` takes no source of chance at all — keeping is planning, and a
 * plan needs something to read.
 */

import type { Card, Casting, Die, DieId, Face, Hand, Intent, Landed, Lot, Pouch, Turn } from './types.js'

/** art. 43: two castings are free. A third is merchandise, never a default. */
export const CASTINGS_ALLOWED = 2

/** art. 60: the hand is assembled from the pouch, and its size is a stat. */
export function assembleHand(pouch: Pouch, size: number): Hand {
  return { dice: pouch.dice.slice(0, Math.max(0, size)) }
}

/** What a die's faces declare, for the inspect screen (art. 54). */
export function inspect(die: Die): readonly Face[] {
  return die.faces
}

/** One die, thrown. art. 50: whatever the body, the face declares a value. */
export function throwDie(die: Die, lot: Lot): Face {
  const roll = Math.floor(lot.next() * die.faces.length)
  const face = die.faces[Math.min(die.faces.length - 1, Math.max(0, roll))]
  if (face === undefined) throw new Error(`a die with no faces: ${die.id}`)
  return face
}

/**
 * art. 42: the intent is visible from the top of the turn, before the first
 * casting. Nothing has been thrown yet — `cast` does that.
 */
export function openTurn(hand: Hand, intent: Intent, card: Card): Turn {
  return {
    intent,
    hand,
    castings: [],
    castingsAllowed: CASTINGS_ALLOWED,
    claims: [],
    card,
  }
}

/** The dice as they lie: the latest casting, or nothing thrown yet. */
export function casting(turn: Turn): Casting {
  return turn.castings[turn.castings.length - 1] ?? []
}

/** art. 41: the first casting. */
export function cast(turn: Turn, lot: Lot): Turn {
  if (turn.castings.length > 0) throw new Error('the dice are already cast')
  const landed: Landed[] = turn.hand.dice.map((die) => land(die, throwDie(die, lot)))
  return { ...turn, castings: [landed] }
}

/** art. 52: a die lands carrying its bond, so a claim can read it. */
function land(die: Die, face: Face): Landed {
  return die.bond === undefined
    ? { die: die.id, face, kept: false }
    : { die: die.id, face, kept: false, bond: die.bond }
}

/**
 * art. 41: *keep* is mid-turn holding, between the two castings. The set
 * given is the set held: naming no dice releases them all.
 */
export function keep(turn: Turn, dice: readonly DieId[]): Turn {
  if (turn.castings.length === 0) throw new Error('nothing is cast to keep')
  const held = new Set<string>(dice)
  const next = casting(turn).map((landed) => ({ ...landed, kept: held.has(landed.die) }))
  return { ...turn, castings: [...turn.castings.slice(0, -1), next] }
}

/**
 * art. 41: exactly one second casting of the rest. A kept die keeps its
 * face; everything else is thrown again.
 *
 * art. 72: **keep-marks are mortal.** The instant the second casting lands,
 * every keep-mark clears. After the recast the hand is statistically a fresh
 * hand, so which dice survived the first casting has stopped being
 * information, and showing it is noise. The mark dies here rather than in
 * the tray, because a tray that has to remember not to draw something is a
 * tray that will one day draw it.
 *
 * The first casting keeps its marks, and nothing player-facing reads them:
 * they are what a resume replays the turn from (art. 75).
 */
export function recast(turn: Turn, lot: Lot): Turn {
  if (turn.castings.length === 0) throw new Error('nothing is cast to recast')
  if (turn.castings.length >= turn.castingsAllowed) {
    throw new Error(`art. 41: ${turn.castingsAllowed} castings, and no more`)
  }
  if (turn.claims.length > 0) throw new Error('the turn is already claiming')
  const byId = new Map(turn.hand.dice.map((die) => [die.id as string, die] as const))
  const next = casting(turn).map((landed) => {
    if (landed.kept) return { ...landed, kept: false }
    const die = byId.get(landed.die)
    if (die === undefined) throw new Error(`a die that is not in the hand: ${landed.die}`)
    return land(die, throwDie(die, lot))
  })
  return { ...turn, castings: [...turn.castings, next] }
}

/** Which dice the first casting was told to hold — what a resume replays. */
export function keptAtRecast(turn: Turn): readonly DieId[] {
  return (turn.castings[0] ?? [])
    .filter((landed) => landed.kept)
    .map((landed) => landed.die)
}

/** How many castings this turn has left before art. 41 shuts it. */
export function castingsLeft(turn: Turn): number {
  return Math.max(0, turn.castingsAllowed - turn.castings.length)
}
