/**
 * The choosing — which dice come down (arts 60, 124).
 *
 * **It is a screen, not a panel**, for the reason the threshold is: there is
 * nowhere else to be until it is answered.
 *
 * The two decisions this screen makes are here rather than in `main.ts`, for
 * the reason `strip.ts` exists — a question the harness cannot ask is a
 * question CI cannot answer. Nothing here paints, and nothing here holds
 * state: both functions are pure questions about a pouch as it stands.
 */

import type { Die, DieId } from '../../lots/index.js'
import { dieLabel, originOf } from '../../content/index.js'

/** One row of the spare list: a die, and how many of it the row stands for. */
export interface Stack {
  readonly die: Die
  readonly count: number
}

/**
 * art. 124: **identical spares stack; a thing with an origin never does.**
 *
 * Six bare bones are not six decisions, and a screen that draws them as six
 * rows is the spreadsheet this article exists to prevent. A special die
 * stands alone however many of it there are, because each one *is* somebody:
 * art. 86 makes a die's shape how its owner died and art. 87 gives every
 * good that ships one sentence of origin.
 *
 * **`originOf` is the test rather than a flag**, and that is the load-bearing
 * choice here. It is already what makes a good an individual, so a good given
 * an origin tomorrow stops stacking without anybody remembering to come back
 * and say so — and a plain bone, which came off nobody, has none.
 *
 * Order is the pouch's, and the die kept for each stack is the first of it,
 * so a swap out of a stack takes the one nearest the hand.
 */
export function stacked(dice: readonly Die[]): readonly Stack[] {
  const out: Stack[] = []
  const at = new Map<string, number>()
  for (const die of dice) {
    const key = originOf(die) === '' ? stackKey(die) : null
    const seen = key === null ? undefined : at.get(key)
    if (seen === undefined) {
      if (key !== null) at.set(key, out.length)
      out.push({ die, count: 1 })
    } else {
      out[seen] = { die: out[seen]!.die, count: out[seen]!.count + 1 }
    }
  }
  return out
}

/**
 * What makes two anonymous dice the same thing to a player: the name they
 * answer to and the faces they show. Not the id — the ids are `bone.1`
 * through `bone.6` and no two of them are equal, which is exactly the
 * distinction this article says is not a decision.
 */
function stackKey(die: Die): string {
  return `${dieLabel(die)}|${die.faces.map((face) => face.value).join(',')}`
}

/**
 * art. 124: **the hand after a swap, in order.** The marked die is replaced
 * where it stands, so a swap moves one thing and disturbs nothing else —
 * which is what makes the order the interface rather than a side effect of
 * it (art. 60: the pouch is ordered and the hand is its first `handSize`).
 *
 * A swap with either half unmarked is not a swap, and the hand comes back
 * unchanged. The screen never offers the verb in that state (art. 118), so
 * this is the guard behind the guard rather than a second statement of it.
 */
export function swapped(
  hand: readonly Die[],
  leaving: DieId | null,
  entering: DieId | null,
): readonly DieId[] {
  const ids = hand.map((die) => die.id)
  if (leaving === null || entering === null) return ids
  // Taking a die that is already in the hand would drop a slot: `chooseHand`
  // de-duplicates, so the hand would come back one short and fill itself from
  // the spares. Nothing can mark a hand die as entering, and this is why.
  if (ids.includes(entering)) return ids
  return ids.map((id) => (id === leaving ? entering : id))
}
