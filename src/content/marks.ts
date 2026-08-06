/**
 * **What he still knows** — the clues and the refusals, as data (arts 10,
 * 84, 88, 119).
 *
 * Two vocabularies, one shape. A **clue** is what a priced act pays out in:
 * it keys on a thing and never on a place, so it survives death and the
 * reseed (art. 34), and it earns its place by changing what a tap answers
 * (art. 88). A **refusal** is what the labyrinth writes down when a run
 * walks out of a room leaving something it was offered (art. 84 as
 * extended).
 *
 * **The cap is the design.** Nine refusal flags, and no more without a
 * ruling: a flag lands in two or three later moments, and the failure mode
 * this whole card exists to avoid is hundreds of one-off branches authored
 * for a line each. So the flags are *kinds* of refusal and never particular
 * acts — three travelers share one flag, because walking past a body is the
 * same thing whichever body it is, and what the second one says is that you
 * have done this before.
 *
 * Nothing that deals, rolls or scores may read anything in this file. A mark
 * reaches the player through what a tap answers and through what an origin
 * sentence says (arts 87–88), and through nothing else — a refusal that
 * changed the weights would be a difficulty dial the player never asked for
 * (art. 116's reasoning, applied to memory).
 */

import type { Clue, ClueId, RoomId } from '../state/index.js'

const clue = (id: string, about: string): Clue => ({
  id: id as ClueId,
  about: about as RoomId,
})

/**
 * arts 88, 119: what the three priced acts pay out in. Each is pure
 * knowledge — no stat, no item — and each earns its keep by changing what
 * two or three later taps answer, which is the article's own acceptance
 * test rather than a claim about it.
 */
export const CLUES = {
  /** What the sump's grate is over, learned by putting a head through it. */
  drop: clue('clue.the-drop', 'room.trove.sump'),
  /** Where the kiln's mouth actually goes, learned by reaching into it. */
  flue: clue('clue.the-flue', 'room.lair.kiln'),
  /** Six, and then a seventh. Learned at the covered font and true elsewhere. */
  seven: clue('clue.the-seventh', 'room.trove.covered-font'),
  /**
   * arts 88, 89: what is cut into the inside of the covered font's lip. It is
   * the knowledge half of that room's fork — a good with no stat at all,
   * earning its place by changing what two later taps answer, which is the
   * whole of what art. 88 asks of one.
   */
  tally: clue('clue.the-count', 'room.trove.covered-font'),
} as const

export const EVERY_CLUE: readonly Clue[] = Object.values(CLUES)

/**
 * art. 84 (extended): the whole refusal vocabulary. Nine flags, shared
 * across every act that means the same refusal.
 */
export const REFUSALS = {
  /** A traveler's bone, left in the hand it was in. */
  bone: 'refused.bone',
  /** One of two who went down together, left where the other could not be. */
  pair: 'refused.pair',
  /** Somebody's luck, left lying (art. 53). */
  luck: 'refused.luck',
  /** What somebody wore, left on them. */
  iron: 'refused.iron',
  /** A bone with a stain on it, and the habit that went with it. */
  stain: 'refused.stain',
  /** A basin not drunk from (art. 40, the place). */
  breath: 'refused.breath',
  /** Hands held open and not taken (art. 40, the being). */
  hands: 'refused.hands',
  /** A question with a price on it, walked past (art. 119). */
  question: 'refused.question',
  /** The half of the covered font's fork that stayed under the cloth. */
  cloth: 'refused.cloth',
} as const

export const EVERY_REFUSAL: readonly string[] = Object.values(REFUSALS)

/**
 * **Where a mark lands.** A thing named here answers a second way once one
 * of its marks is on the ledger, under the key `<thing>.knows` for a clue
 * and `<thing>.again` for a refusal.
 *
 * They are two suffixes rather than one because they are two different
 * sentences: knowing something changes what he can say about a thing, and
 * having walked past one changes what he can say about himself. Collapsing
 * them would have meant one line that had to be true of both, which is a
 * line that is true of neither.
 */
export const KNOWS: Readonly<Record<string, readonly string[]>> = {
  // The drop, and the other two places the depth loses things into.
  'sump.grate': [CLUES.drop.id as string],
  'buried.sand': [CLUES.drop.id as string],
  'crossing.grate': [CLUES.drop.id as string],
  // The flue, and the other thing in the depth that was burnt somewhere else.
  'kiln.mouth': [CLUES.flue.id as string],
  'pyre.timber': [CLUES.flue.id as string],
  // Six, and then a seventh. Learned under a cloth and worth having in front
  // of any standing water, which is the whole argument for art. 88's payload.
  'font.cloth': [CLUES.seven.id as string],
  'cistern.water': [CLUES.seven.id as string],
  'drip.water': [CLUES.seven.id as string],
  // What is cut inside the lip, and the two other places in the depth where
  // somebody was keeping count of something.
  'tally.marks': [CLUES.tally.id as string],
  'crossing.bones': [CLUES.tally.id as string],
}

export const ECHOES: Readonly<Record<string, readonly string[]>> = {
  // The bone, in three hands and against one wall. The Crossing's traveler is
  // the room's own scenery (art. 83 untouched), and it is where the refusal
  // lands hardest: he checks every one, and one of them he did not.
  'traveler.pusher.thing': [REFUSALS.bone],
  'traveler.careful.thing': [REFUSALS.bone],
  'traveler.runner.thing': [REFUSALS.bone],
  'crossing.traveler': [REFUSALS.bone],
  // art. 52: the halves are banded apart, so leaving one is leaving both.
  'sister.elder.thing': [REFUSALS.pair],
  'sister.younger.thing': [REFUSALS.pair],
  'bonefield.bone': [REFUSALS.pair],
  // The cord, and the other thing down here somebody kept count with.
  'cord.thing': [REFUSALS.luck],
  'tally.marks': [REFUSALS.luck],
  // The plate, and the door it would have been worth wearing to.
  'plate.thing': [REFUSALS.iron],
  'warden.door': [REFUSALS.iron],
  // art. 40's two tiers, each remembered by the other's furniture.
  'basin.water': [REFUSALS.breath],
  'font.step': [REFUSALS.breath],
  'mender.figure': [REFUSALS.hands],
  // The stain, and the thing in the depth that took a little at a time.
  'leech.thing': [REFUSALS.stain],
  'crawl.legs': [REFUSALS.stain],
  // art. 119: a question walked past. It lands on the three things that ask
  // one, so the second one he meets knows he has done this before.
  'sump.grate': [REFUSALS.question],
  'kiln.mouth': [REFUSALS.question],
  'font.cloth': [REFUSALS.question],
  // art. 89: the half that stayed under the cloth. It lands on the basin
  // rather than on the cloth, because the cloth is where the question was
  // asked and the basin is where the thing he left is.
  'font.basin': [REFUSALS.cloth],
  'cistern.cage': [REFUSALS.cloth],
  /**
   * art. 87 (card 87): **and a good's origin sentence says it too.** The die
   * you refused turns up in another traveler's hand, and the sentence
   * changes to say so rather than the die changing — the `.origin` suffix
   * keeps that in the same one map, so there is one answer to *where does a
   * mark land* and not two.
   */
  'bone.pusher.origin': [REFUSALS.bone],
  'bone.careful.origin': [REFUSALS.bone],
  'bone.runner.origin': [REFUSALS.bone],
  'talisman.cord.origin': [REFUSALS.luck],
}

/** Whether any of a thing's marks of this kind are on the ledger. */
export function marked(
  where: Readonly<Record<string, readonly string[]>>,
  target: string,
  remembered: readonly string[],
): boolean {
  const wanted = where[target]
  if (wanted === undefined) return false
  return wanted.some((mark) => remembered.includes(mark))
}
