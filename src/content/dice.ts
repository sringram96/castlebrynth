/**
 * Every die in the game.
 *
 * A die is six faces. A face is a value 1-6 and at most one keyword. There are
 * two keywords and there is no effect algebra: `hurt` costs you health when its
 * face is part of the hand you score, `heal` gives you some. A keyword on a
 * held or unused die does nothing.
 *
 * ## The copy law
 *
 * A die's card has to answer five questions, in this order, without the player
 * inferring anything:
 *
 *   1. what values can this die roll?
 *   2. does one face have a special effect?
 *   3. exactly when does that effect happen?
 *   4. what does the effect do?
 *   5. what kind of hand does this die make easier?
 *
 * `rule` answers 1-4 and `helpsWith` answers 5. The player-facing words for a
 * keyword face are **red face** and **green face**, because that is what is
 * painted on it; "marked" is a word only this file uses. And every rule that
 * has a condition names it in full — *included in the hand you SCORE* — because
 * a die whose cost you can dodge by not choosing it is a different die from one
 * whose cost you cannot, and the player cannot see which this is by guessing.
 *
 * If a die's rule cannot be read off the combat screen it does not ship — which
 * is why the Sister Bone, whose rule needs two dice and a bonus to explain, is
 * not here.
 */

export type Value = 1 | 2 | 3 | 4 | 5 | 6

export interface FaceEffect {
  readonly kind: 'hurt' | 'heal'
  readonly amount: number
}

export interface Face {
  readonly value: Value
  /** At most one keyword, and only these two exist. */
  readonly effect?: FaceEffect
}

export type Faces = readonly [Face, Face, Face, Face, Face, Face]

export interface Die {
  readonly id: string
  readonly name: string
  readonly faces: Faces
  /** What it rolls, and what its special face does and when. No flavour. */
  readonly rule: string
  /** "HELPS WITH" — which hands this die makes easier, and why. */
  readonly helpsWith: string
  /** Optional flavour, shown below a divider and never mixed into the rule. */
  readonly flavour?: string
  /** So the three kinds of die are told apart at a glance. */
  readonly material: 'bone' | 'pale' | 'iron' | 'ash' | 'blood'
}

const f = (value: Value): Face => ({ value })
const hurt = (value: Value, amount: number): Face => ({
  value,
  effect: { kind: 'hurt', amount },
})
const heal = (value: Value, amount: number): Face => ({
  value,
  effect: { kind: 'heal', amount },
})

const PLAIN: Die = {
  id: 'plain',
  name: 'Plain Bone',
  faces: [f(1), f(2), f(3), f(4), f(5), f(6)],
  rule: 'Faces: 1, 2, 3, 4, 5, 6. No special effect.',
  helpsWith: 'Any hand.',
  material: 'bone',
}

const CAREFUL: Die = {
  id: 'careful',
  name: 'Careful Bone',
  faces: [f(3), f(3), f(3), f(4), f(4), f(4)],
  rule: 'This die can only roll 3 or 4: three faces of each.',
  helpsWith: 'Triples and Full Houses, because repeated numbers are easier to make.',
  flavour: 'Filed flat on two sides by somebody who did not like surprises.',
  material: 'pale',
}

const PUSHER: Die = {
  id: 'pusher',
  name: 'Pusher Bone',
  faces: [hurt(1, 7), f(5), f(5), f(6), f(6), f(6)],
  rule: 'This die usually rolls 5 or 6. If its red 1 is included in the hand you SCORE, you lose 7 HP.',
  helpsWith: 'High totals and Triples of 6. Leave the red 1 out when you can.',
  flavour: 'He kept pushing. It kept paying, until it did not.',
  material: 'blood',
}

const RUNNER: Die = {
  id: 'runner',
  name: 'Runner Bone',
  // Two sixes, and only one of them is red. The card shows both, and the rule
  // says so, because "its marked 6" would describe a die that has one.
  faces: [f(3), f(4), f(5), f(5), f(6), hurt(6, 5)],
  rule: 'This die rolls 3–6. One of its 6 faces is red; if that red 6 is included in the hand you SCORE, you lose 5 HP.',
  helpsWith: 'Straights and high totals.',
  flavour: 'She was always three rooms ahead of the rest of them.',
  material: 'iron',
}

const LEECH: Die = {
  id: 'leech',
  name: 'Leech Bone',
  faces: [f(1), f(2), f(3), f(4), f(5), heal(6, 4)],
  rule: 'This die rolls 1–6, and its 6 is green. If that green 6 is included in the hand you SCORE, heal 4 HP.',
  helpsWith: 'Any hand that can include the green 6.',
  flavour: 'It drinks first and gives some back. Some.',
  material: 'ash',
}

export const DICE: Readonly<Record<string, Die>> = {
  plain: PLAIN,
  careful: CAREFUL,
  pusher: PUSHER,
  runner: RUNNER,
  leech: LEECH,
}

/** Six dice means six dice. Everywhere. */
export const HAND_SIZE = 6

/** The waking loadout. A plain bone is the body you start in, not a find. */
export const STARTING_DICE: readonly string[] = Array.from({ length: HAND_SIZE }, () => 'plain')

/** What the labyrinth can hand you. Only a special die is ever a find. */
export const LOOT_DICE: readonly string[] = ['careful', 'pusher', 'runner', 'leech']

export function die(id: string): Die {
  const found = DICE[id]
  if (!found) throw new Error(`no such die: ${id}`)
  return found
}

/** Whether a loot id names a die or a relic. The two nouns, told apart. */
export function isDieId(id: string): boolean {
  return id in DICE
}
