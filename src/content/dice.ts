/**
 * Every die in the game.
 *
 * A die is six faces. A face is a value 1-6 and at most one keyword. There are
 * two keywords and there is no effect algebra: `hurt` costs you health when its
 * face is part of the hand you score, `heal` gives you some. A keyword on a
 * held or unused die does nothing.
 *
 * Every die states its faces, one rule sentence in plain language, and what it
 * is good with. If a die's rule cannot be read off the combat screen it does
 * not ship — which is why the Sister Bone, whose rule needs two dice and a
 * bonus to explain, is not here.
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
  /** The one sentence. Plain mechanical language; no flavour mixed in. */
  readonly rule: string
  /** "GOOD WITH" — one or two scoring hands or build ideas. */
  readonly goodWith: string
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
  rule: 'An ordinary die. One through six, nothing else.',
  goodWith: 'Everything. It is the floor the others are measured against.',
  material: 'bone',
}

const CAREFUL: Die = {
  id: 'careful',
  name: 'Careful Bone',
  faces: [f(3), f(3), f(3), f(4), f(4), f(4)],
  rule: 'Only ever shows 3 or 4.',
  goodWith: 'Triples and Full Houses.',
  flavour: 'Filed flat on two sides by somebody who did not like surprises.',
  material: 'pale',
}

const PUSHER: Die = {
  id: 'pusher',
  name: 'Pusher Bone',
  faces: [hurt(1, 7), f(5), f(5), f(6), f(6), f(6)],
  rule: 'Rolls high. Scoring its marked 1 costs you 7 health.',
  goodWith: 'Triples of 6 — and any hand you can leave the 1 out of.',
  flavour: 'He kept pushing. It kept paying, until it did not.',
  material: 'blood',
}

const RUNNER: Die = {
  id: 'runner',
  name: 'Runner Bone',
  faces: [f(3), f(4), f(5), f(5), f(6), hurt(6, 5)],
  rule: 'Spread from 3 to 6. Scoring its marked 6 costs you 5 health.',
  goodWith: 'Straights.',
  flavour: 'She was always three rooms ahead of the rest of them.',
  material: 'iron',
}

const LEECH: Die = {
  id: 'leech',
  name: 'Leech Bone',
  faces: [f(1), f(2), f(3), f(4), f(5), heal(6, 4)],
  rule: 'Ordinary faces. Scoring its marked 6 heals you 4 health.',
  goodWith: 'Any hand with a 6 in it. It is the only healing in the run.',
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
