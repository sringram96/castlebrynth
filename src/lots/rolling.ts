/**
 * The rolling goods (card 93, art. 53).
 *
 * **One hook in the scoring path, and a no-op when empty.**
 *
 *     claim resolved  →  amend(claim, rolls)  →  final
 *
 * A rolling good is carried outside the hand, takes no slot of it, enters no
 * combo, and rolls once when the turn is attacked — after the line's tier and
 * sum have settled. The line resolves untouched; the goods amend the result.
 * You cannot score a seven-run, but you can score a pair and have the trinket
 * throw a +2.
 *
 * **There is no new press.** art. 41's three presses stand exactly as they
 * are: this resolves inside Attack, as a beat in art. 119's cascade. An
 * optional *throw* press was measured at bite costs from 6 to 30 and
 * always-throwing dominated every time — the upside compounds, because ending
 * a fight sooner removes every future incoming turn, while a health cost is a
 * flat subtraction. A press you always press is what art. 41's amendment
 * repealed multi-claim for.
 *
 * **The flexibility law, and it is the whole engineering claim of the wave.**
 * Carrying none draws no randomness. Not *draws and discards* — that would
 * silently change every fight for every player carrying nothing, which is
 * almost every player almost all of the time. So every function here answers
 * before it looks at a lot, and `test/rolling.seam.test.ts` holds a whole
 * transcript of the pre-wave build to prove it.
 */

import { claimedDice } from './card.js'
import type { Amend, Goods, Lot, Rolled, Trinket, Turn } from './types.js'

/**
 * card 93: **the rolling goods actually in play**, which is the carried list
 * cut to the cap.
 *
 * The cut is here rather than at the shell for the reason art. 53's level cap
 * is on the company: a guard a caller has to remember is a guard a caller
 * will one day forget. A company with no cap declared is uncapped, and every
 * fixture that carries none satisfies any cap there is.
 */
export function carriedTrinkets(goods: Goods): readonly Trinket[] {
  const held = goods.trinkets ?? []
  if (held.length === 0) return []
  const cap = goods.trinketCap
  return cap === undefined ? held : held.slice(0, Math.max(0, cap))
}

/**
 * card 93: **the goods roll, once, at Attack.**
 *
 * Three gates, in this order, and each of them is load-bearing:
 *
 * 1. **nothing carried, nothing drawn.** The lot is not touched, so a
 *    zero-trinket run's stream is byte-identical to the build before this
 *    wave. This is the flexibility test in its hardest form and it is why the
 *    check is first.
 * 2. **no claim, no roll.** They amend *what the line came to*, and a turn
 *    with no line has nothing for them to amend — so a turn of armour and
 *    patience (art. 46) is not a turn a carried thing bites you on, and `per`
 *    never has to answer what it multiplies against nothing.
 * 3. **a carried good with no lot refuses loudly.** Returning an empty roll
 *    would disable the mechanic silently for whoever forgot the argument,
 *    which is the one failure a wave whose whole claim is *it changes nothing
 *    when absent* cannot afford to make quietly.
 *
 * One roll per turn, and they do not reroll: art. 41's second casting is the
 * hand's, and it does not touch these.
 */
export function rollAmends(turn: Turn, goods: Goods, lot?: Lot): readonly Rolled[] {
  const held = carriedTrinkets(goods)
  if (held.length === 0) return []
  if (turn.claims.length === 0) return []
  if (lot === undefined) throw new Error('a rolling good with nothing to roll it')
  const spent = claimedDice(turn).size
  return held.map((trinket) => {
    const face = faceOf(trinket, lot)
    return { trinket: trinket.id, face, amount: worthOf(face, spent) }
  })
}

/**
 * One trinket, thrown. The same arithmetic `throwDie` uses on a die body
 * (art. 50's shape freedom, applied to a thing whose faces are effects), so a
 * trinket of any number of faces is thrown the same way.
 */
function faceOf(trinket: Trinket, lot: Lot): Amend {
  const faces = trinket.rolls
  const roll = Math.floor(lot.next() * faces.length)
  const face = faces[Math.min(faces.length - 1, Math.max(0, roll))]
  if (face === undefined) throw new Error(`a rolling good with no faces: ${trinket.id as string}`)
  return face
}

/**
 * What a face came to on a turn that spent `spent` dice in claims.
 *
 * `per` is the only kind that reads the turn, and reading the *claimed* dice
 * rather than the hand is what makes it the kind whose worth rises as the hand
 * improves: a full house pays it five times and a pair pays it twice, so a
 * better hand is worth more to it without the number on it changing.
 */
export function worthOf(face: Amend, spent: number): number {
  switch (face.kind) {
    case 'per':
      return Math.max(0, face.amount) * Math.max(0, spent)
    case 'block':
    case 'add':
    case 'cost':
      return Math.max(0, face.amount)
    case 'null':
      return 0
  }
}

/** What the roll adds to the attack — the `add` and `per` faces, summed. */
export function addedBy(amends: readonly Rolled[]): number {
  return amends.reduce(
    (total, one) => total + (one.face.kind === 'add' || one.face.kind === 'per' ? one.amount : 0),
    0,
  )
}

/**
 * What the roll turns aside from the incoming hit — the `block` faces, summed.
 *
 * It is **not** armor and it is deliberately not folded into it (art. 47):
 * armor is a body stat that a corroding intent can eat, and this is a thing
 * that happened at score time. So a corroded turn still blocks whatever the
 * trinket blocked, which is what makes a rolling good a different answer from
 * a wearable rather than a worse one, and it is declared on the face like
 * every other number (art. 54).
 */
export function turnedBy(amends: readonly Rolled[]): number {
  return amends.reduce((total, one) => total + (one.face.kind === 'block' ? one.amount : 0), 0)
}

/**
 * What the roll took out of you — the `cost` faces, summed.
 *
 * It joins art. 86's cost faces in `hurt` rather than standing beside them,
 * because it is the same thing: a price the player chose by carrying the good,
 * charged where the riders are charged. That is also what makes the death read
 * like any other death — the Book keys on `cost` and needs to learn nothing
 * new (`endLineFor`).
 *
 * **The bite is the price of carrying the thing, not a per-turn gamble**, so
 * content keeps it survivable: art. 5's world never punishes touch, and
 * art. 120's return bar says a price may take from the body and never take the
 * last of it. A run ends to a horror, to the Warden, or to a door.
 */
export function bittenBy(amends: readonly Rolled[]): number {
  return amends.reduce((total, one) => total + (one.face.kind === 'cost' ? one.amount : 0), 0)
}

/** Whether a face did anything at all — what art. 119 gives a beat to. */
export function didFire(one: Rolled): boolean {
  return one.face.kind !== 'null'
}

// ── The audit (art. 54) ────────────────────────────────────────────────

/**
 * art. 54: every power pays, and for a rolling good the payment is on its own
 * faces — the nulls that keep it from being flat power, and the cost face that
 * charges for the rest.
 *
 * Like `audit` on a die, this reports rather than judges, except for the one
 * line that is a verdict. `test/rolling.faces.test.ts` holds the shipped catalog to
 * it, so a trinket that gives without whiffing cannot reach a player.
 */
export interface TrinketAudit {
  readonly trinket: Trinket['id']
  readonly faces: number
  readonly nulls: number
  readonly costFaces: number
  /** What the cost faces charge, summed — the declared price of the rest. */
  readonly cost: number
  /**
   * The verdict: two nulls and a cost face, which is the wave's own bar. A
   * good that fires every turn is a number on the body, and a number on the
   * body is a wearable (art. 47) rather than a thing that rolls.
   */
  readonly paid: boolean
}

export function auditTrinket(trinket: Trinket): TrinketAudit {
  const nulls = trinket.rolls.filter((face) => face.kind === 'null').length
  const costing = trinket.rolls.filter((face) => face.kind === 'cost')
  const cost = costing.reduce((total, face) => total + worthOf(face, 1), 0)
  return {
    trinket: trinket.id,
    faces: trinket.rolls.length,
    nulls,
    costFaces: costing.length,
    cost,
    paid: nulls >= 2 && costing.length >= 1,
  }
}
