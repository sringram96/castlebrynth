/**
 * Fixtures the lots tests share. Nothing here is content: the values are
 * chosen to make a shape, not to be fair.
 */

import type {
  Card,
  Die,
  DieId,
  Face,
  Hand,
  Intent,
  Landed,
  Turn,
  Value,
} from '../src/lots/index.js'
import { freshCard } from '../src/lots/index.js'
import { CROSSING, FULL_DEPTH, WARDEN } from '../src/content/index.js'
import type { Seed } from '../src/state/index.js'

export const seedOf = (n: number): Seed => n as unknown as Seed

/**
 * **The depth the generator actually generates.**
 *
 * The jungle-hell proof slice took depth one, because a proof nobody plays is
 * not one — a fresh run walks the five authored rooms. The drift, the forced
 * lock, the Warden and the key it needs all still live on `FULL_DEPTH`, and
 * every test below that is about *the dealer* rather than about the slice
 * asks for this depth by name rather than by the literal it used to be.
 *
 * It is a named constant and not a `2` for the obvious reason: the next time
 * a depth is added or renumbered, the tests that mean "the generated one"
 * should not have to be found by grep.
 */
export const GENERATED = FULL_DEPTH.depth

/**
 * Every room the generated depth can deal: its regions, its neutral pool, and
 * the two anchors art. 37 fixes at either end.
 *
 * It exists so that an invariant about *the dealer* can be asked of the rooms
 * the dealer actually deals. The proof slice's five rooms are in the same
 * catalog — they must be, or the route could not name them — but they are a
 * fixed route with declared sockets, no lock, no drift and no mercies, so a
 * promise the generated depth makes is not automatically a promise about
 * them. Scoping the question is not weakening it: it is asking it where the
 * article it comes from applies.
 */
export const DEALT_BY_FULL_DEPTH: ReadonlySet<string> = new Set<string>([
  ...FULL_DEPTH.regions.flatMap((one) => one.rooms as readonly string[]),
  ...(FULL_DEPTH.neutral as readonly string[]),
  CROSSING as string,
  WARDEN as string,
])

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
    /**
     * The exact face each die landed on, where a value is not enough to
     * name one. A die may carry the same value twice with a rider on only
     * one of them (`THE_RUNNER`), and *which of the two sixes came up* is
     * the whole question a rider test is asking — looking the face up by
     * value would silently pick the quiet one and pass by testing nothing.
     */
    readonly showing?: readonly Face[]
  } = {},
): Turn {
  const dice = options.dice ?? values.map((_, i) => bone(i))
  const landed: Landed[] = values.map((value, i) => {
    const die = dice[i]
    if (die === undefined) throw new Error('a value with no die behind it')
    const face =
      options.showing?.[i] ?? die.faces.find((f) => f.value === value) ?? { value: value as Value }
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
