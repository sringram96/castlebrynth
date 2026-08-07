/**
 * The company a die keeps: riders, bonds, talismans, wearables (arts 49–56).
 *
 * The engine holds the sockets; the goods themselves are content. Nothing
 * here knows that a six is worth twelve to the Ossuary or that the Leech
 * heals two — it only reads what the item declares (art. 54).
 */

import type {
  Armor,
  Claim,
  Die,
  DieId,
  Rider,
  Talisman,
  Wearable,
} from './types.js'

/**
 * art. 47 (amended): armor is a body stat, granted by items and mercies,
 * automatically blocking its value from every attack. `base` is the bare
 * body — content declares it (`BASE_ARMOR`), and art. 55 makes it nothing.
 */
export function armorFrom(worn: readonly Wearable[], base: Armor = 0): Armor {
  return worn.reduce((total, wearable) => total + wearable.armor, base)
}

/**
 * art. 51: a rider fires only when its face is spent in a claimed combo.
 * Kept or unused faces fire nothing; passive faces are banned.
 */
export function ridersFired(
  claimed: readonly Claim[],
  riders: readonly Rider[],
): readonly Rider[] {
  const book = new Map<string, Rider>(riders.map((rider) => [rider.id, rider]))
  const fired: Rider[] = []
  for (const claim of claimed) {
    for (const landed of claim.dice) {
      const id = landed.face.rider
      if (id === undefined) continue
      const rider = book.get(id)
      if (rider !== undefined) fired.push(rider)
    }
  }
  return fired
}

/** What the fired riders heal, summed (art. 51). */
export function healedBy(fired: readonly Rider[]): number {
  return fired.reduce((total, rider) => total + (rider.onUse.kind === 'heal' ? rider.onUse.amount : 0), 0)
}

/**
 * art. 86: and what the cost faces took, summed on the same beat. A cost
 * face is a rider like any other — it fires only when its face is spent in a
 * claim — so this reads the same fired list `healedBy` does.
 */
export function woundedBy(fired: readonly Rider[]): number {
  return fired.reduce(
    (total, rider) => total + (rider.onUse.kind === 'wound' ? rider.onUse.amount : 0),
    0,
  )
}

/**
 * art. 53, the shape species: a talisman that reads the whole turn rather
 * than one claim. The ruling of 2026-08-04: shape triggers apply last, on
 * the turn's total, and multiple triggers each read the turn independently.
 */
export function shapeTriggers(
  talismans: readonly Talisman[],
  everyDieClaimed: boolean,
): readonly Talisman[] {
  return talismans.filter(
    (talisman) =>
      talisman.species === 'shape' &&
      talisman.shape !== undefined &&
      (!talisman.shape.everyDie || everyDieClaimed),
  )
}


// ── The audit ──────────────────────────────────────────────────────────

/**
 * art. 54: every power pays. Every die is audited against the plain bone's
 * power budget — this reports the comparison rather than judging it, because
 * what a power costs is content's to declare and arithmetic's to rule on.
 */
export interface Audit {
  readonly die: DieId
  /** The sum of the die's faces. */
  readonly values: number
  /** The same sum for the plain bone it is measured against. */
  readonly plainValues: number
  /** art. 51: how many faces carry a rider — each is a power. */
  readonly riders: number
  /** art. 52: a bond is a power too, paid for by carrying both halves. */
  readonly bonded: boolean
  /** True when the die out-values the plain bone and owes a declared cost. */
  readonly overBudget: boolean
  /**
   * arts 54, 86: what the die's cost faces charge, summed — the declared
   * price of the power above. Zero on a die that carries none.
   */
  readonly cost: number
  /** art. 54: how many faces the price is spread across. */
  readonly costFaces: number
  /**
   * art. 54: every power pays. A die may out-value the plain bone only if it
   * charges for it somewhere on its own faces. This is the one line of the
   * audit that is a verdict rather than a measurement, and it is the one the
   * catalog is held to.
   */
  readonly paid: boolean
}

/**
 * art. 54: every power pays. The riders are handed in because a face names
 * its rider and the rider declares the number (art. 51) — a die alone cannot
 * say what it costs, and an audit that guessed would be exactly the hidden
 * math art. 54 exists to forbid.
 */
export function audit(die: Die, plain: Die, riders: readonly Rider[] = []): Audit {
  const sum = (of: Die): number => of.faces.reduce((total, face) => total + face.value, 0)
  const book = new Map<string, Rider>(riders.map((rider) => [rider.id, rider]))
  const values = sum(die)
  const plainValues = sum(plain)
  const carried = die.faces.filter((face) => face.rider !== undefined)
  const costing = carried.filter((face) => book.get(face.rider!)?.onUse.kind === 'wound')
  const cost = costing.reduce((total, face) => {
    const onUse = book.get(face.rider!)?.onUse
    return total + (onUse !== undefined && onUse.kind === 'wound' ? onUse.amount : 0)
  }, 0)
  const overBudget = values > plainValues
  return {
    die: die.id,
    values,
    plainValues,
    riders: carried.length,
    bonded: die.bond !== undefined,
    overBudget,
    cost,
    costFaces: costing.length,
    paid: !overBudget || cost > 0,
  }
}
