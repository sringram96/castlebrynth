/**
 * The card and the claims (arts 45, 63–65).
 *
 * Every line of the ladder is claimable once per fight; the card refills
 * between fights, never within one. An empty card leaves only armor and
 * flight — the card is the fight's fuse, made of your own spending.
 */

import { assemble, cursedValue, shapesOf } from './combos.js'
import { casting } from './turn.js'
import type {
  Card,
  Casting,
  Claim,
  DieId,
  Goods,
  Intent,
  Ladder,
  Landed,
  Line,
  Turn,
} from './types.js'
import { LINES } from './types.js'

/** art. 63: the card refills between fights, never within one. */
export function freshCard(): Card {
  return Object.fromEntries(LINES.map((line) => [line, false])) as Card
}

export function spend(card: Card, line: Line): Card {
  return { ...card, [line]: true }
}

/** The undo half of `spend`, for a claim disbanded before the turn ends. */
export function refill(card: Card, line: Line): Card {
  return { ...card, [line]: false }
}

/** art. 63: what is left to spend — the fight's fuse, seen at a glance. */
export function unspent(card: Card): readonly Line[] {
  return LINES.filter((line) => !card[line])
}

/** art. 65: which lines this turn's intent has sealed shut. */
export function sealed(intent: Intent): readonly Line[] {
  const effect = intent.effect
  return effect !== undefined && effect.kind === 'seal' ? effect.lines : []
}

/** Which dice are already spoken for by a claim this turn (art. 45). */
export function claimedDice(turn: Turn): ReadonlySet<string> {
  const spent = new Set<string>()
  for (const claim of turn.claims) for (const landed of claim.dice) spent.add(landed.die)
  return spent
}

/** art. 45: dice that fit nothing go unused and do nothing. */
export function unused(turn: Turn): Casting {
  const spent = claimedDice(turn)
  return casting(turn).filter((landed) => !spent.has(landed.die))
}

/**
 * The dice named, as they lie — and only those still free. A die already
 * spent in a claim cannot be spent in a second one (art. 45).
 */
export function selection(turn: Turn, dice: readonly DieId[]): readonly Landed[] {
  const wanted = new Set<string>(dice)
  const spent = claimedDice(turn)
  return casting(turn).filter((landed) => wanted.has(landed.die) && !spent.has(landed.die))
}

/**
 * art. 63: which lines this selection could claim — unspent, unsealed, and
 * matching the shape the dice make. art. 64: a composite offers one line, not
 * the simple lines it contains.
 */
export function claimable(turn: Turn, dice: readonly DieId[], ladder: Ladder): readonly Line[] {
  // The ladder is asked for and not read: what a selection *is* is law, and
  // what it is *worth* is tuning (art. 48). The parameter keeps the caller
  // honest — nothing may offer a line the authored ladder does not carry.
  void ladder
  const chosen = selection(turn, dice)
  if (chosen.length === 0) return []
  const shut = new Set<Line>(sealed(turn.intent))
  return shapesOf(chosen.map((landed) => landed.face.value)).filter(
    (line) => !turn.card[line] && !shut.has(line),
  )
}

/**
 * art. 63 / art. 65: **what shape these dice actually make, and what is
 * holding it shut.**
 *
 * `claimable` answers what may be claimed; this answers the other half —
 * when a selection *is* a line of the ladder and that line is not on offer,
 * which of the two things took it. `null` when the selection makes no line
 * above the floor, or when the line it makes is claimable after all.
 *
 * It exists because art. 72's DEFAULT ("a selection that fits nothing says
 * why") had no way to tell the two silences apart. A selection down to the
 * floor because the dice make nothing and a selection down to the floor
 * because the horror sealed the line it makes are the same picture and
 * completely different facts, and the tray was calling both of them *the
 * best these make* — which is true of the first and a lie about the second.
 * This is art. 118's second clause applied to a line instead of a verb: what
 * withholds it is said, and it is said where the thumb already is.
 */
export function withheld(turn: Turn, dice: readonly DieId[]): { line: Line; why: 'spent' | 'sealed' } | null {
  const chosen = selection(turn, dice)
  if (chosen.length === 0) return null
  const line = shapesOf(chosen.map((landed) => landed.face.value)).find(
    (made) => made !== 'any-dice',
  )
  if (line === undefined) return null
  // The seal is named first: it is this turn's doing and it lifts next turn,
  // where a spent line is gone for the rest of the fight. When both hold, the
  // one the player can still do something about is the one worth saying.
  if (sealed(turn.intent).includes(line)) return { line, why: 'sealed' }
  return turn.card[line] ? { line, why: 'spent' } : null
}

/**
 * art. 72 (DEFAULT): claim offers match the exact selection, and a selection
 * that fits nothing says why. This is the "says why" half's predicate — true
 * when there are dice on the table and no combo is on offer for them.
 *
 * ANY DICE is the deliberate floor (art. 46), not a combo, so a selection
 * down to the floor still fits nothing. That distinction is the whole point:
 * a hand of six holding a full house offers ANY DICE on all six and FULL
 * HOUSE only on the exact five, and without this the thumb is told nothing
 * at all — the first playtest read that silence as a full house it could
 * not claim.
 */
export function fitsNothing(turn: Turn, dice: readonly DieId[], ladder: Ladder): boolean {
  if (selection(turn, dice).length === 0) return false
  return claimable(turn, dice, ladder).every((line) => line === 'any-dice')
}

/**
 * art. 63: claiming spends the line for the rest of the fight. art. 45: the
 * dice go with it, and cannot be spent in a second claim this turn.
 */
export function claim(
  turn: Turn,
  dice: readonly DieId[],
  line: Line,
  ladder: Ladder,
  goods: Goods = { talismans: [], riders: [] },
): Turn {
  if (!claimable(turn, dice, ladder).includes(line)) {
    throw new Error(`art. 63: ${line} is not claimable by that selection`)
  }
  const chosen = selection(turn, dice)
  const made = assemble(line, chosen, ladder, cursedValue(turn.intent), goods)
  return { ...turn, claims: [...turn.claims, made], card: spend(turn.card, line) }
}

/** Undo, before the turn ends: the dice come home and the line refills. */
export function disband(turn: Turn, line: Line): Turn {
  const held = turn.claims.find((made) => made.line === line)
  if (held === undefined) throw new Error(`no claim on ${line} to disband`)
  return {
    ...turn,
    claims: turn.claims.filter((made) => made !== held),
    card: refill(turn.card, line),
  }
}

/** The claims this turn holds, in claiming order. */
export function claims(turn: Turn): readonly Claim[] {
  return turn.claims
}
