/**
 * Fixtures the lots tests share. Nothing here is content: the values are
 * chosen to make a shape, not to be fair.
 */

import type {
  Card,
  Die,
  DieId,
  Hand,
  Intent,
  Landed,
  Turn,
  Value,
} from '../src/lots/index.js'
import { freshCard } from '../src/lots/index.js'
import type { Seed } from '../src/state/index.js'

export const seedOf = (n: number): Seed => n as unknown as Seed

export const PLAIN_FACES = [1, 2, 3, 4, 5, 6].map((v) => ({ value: v as Value }))

export function bone(n: number): Die {
  return { id: `bone.${n}` as DieId, body: 6, faces: PLAIN_FACES }
}

export function handOf(size = 6): Hand {
  return { dice: Array.from({ length: size }, (_, i) => bone(i)) }
}

export const SWIPE: Intent = { verb: 'SWIPE', amount: 8 }

/**
 * A turn with the dice already lying the way the test wants them. Where a
 * real turn casts, this one simply declares — the roll is `turn.ts`'s job
 * and is tested there.
 */
export function turnOf(
  values: readonly number[],
  options: {
    readonly intent?: Intent
    readonly card?: Card
    readonly dice?: readonly Die[]
    /** art. 65: dice a bind has taken off this turn, if the test wants any. */
    readonly bound?: readonly DieId[]
  } = {},
): Turn {
  const dice = options.dice ?? values.map((_, i) => bone(i))
  const landed: Landed[] = values.map((value, i) => {
    const die = dice[i]
    if (die === undefined) throw new Error('a value with no die behind it')
    const face = die.faces.find((f) => f.value === value) ?? { value: value as Value }
    return die.bond === undefined
      ? { die: die.id, face, kept: false }
      : { die: die.id, face, kept: false, bond: die.bond }
  })
  return {
    intent: options.intent ?? SWIPE,
    hand: { dice },
    castings: [landed],
    castingsAllowed: 2,
    claims: [],
    card: options.card ?? freshCard(),
    // art. 65: nothing bound. A turn that wants a short hand declares one.
    bound: options.bound ?? [],
  }
}

export const idsOf = (turn: Turn, ...at: number[]): readonly DieId[] =>
  at.map((i) => {
    const die = turn.hand.dice[i]
    if (die === undefined) throw new Error(`no die at ${i}`)
    return die.id
  })

export const everyDie = (turn: Turn): readonly DieId[] => turn.hand.dice.map((d) => d.id)
