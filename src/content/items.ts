import type { Good, Rider, RiderId, Talisman, TalismanId, Wearable, WearableId } from '../lots/index.js'
import { LEECH_RIDER, THE_LEECH, THE_SISTERS } from './dice.js'
import { TRAVELER_DICE, TRAVELER_RIDERS } from './travelers.js'

/**
 * The goods: talismans and wearables, as typed data (arts 49, 53, 47).
 *
 * These five are the demo's fixtures (`reference/castlebrynth-lots-demo.html`)
 * — the Sisters and the Leech live on dice, in `dice.ts`; the two talismans
 * and the plate live here. Every number is tuning; every power is declared
 * (art. 54).
 *
 * art. 55: the start is bare. None of these ship in the first pouch; they are
 * discovered in the labyrinth or bought.
 */

const talisman = (s: string): TalismanId => s as TalismanId
const wearable = (s: string): WearableId => s as WearableId

/**
 * art. 53, value species: every 6 counts double when a claim's sum is added.
 * The engine reads the species; the doubling is the talisman's own tuning.
 */
export const THE_OSSUARY: Talisman = {
  id: talisman('talisman.ossuary'),
  species: 'value',
  value: { of: 6, times: 2 },
}

/**
 * art. 53, shape species: it reads the whole turn — every die of the hand
 * spent in some claim, and the turn's attack doubles.
 */
export const THE_ZEALOT: Talisman = {
  id: talisman('talisman.zealot'),
  species: 'shape',
  shape: { everyDie: true, times: 2 },
}

/**
 * art. 53, ladder species: a claimed line scores a tier higher, and the
 * lines it reads are the ones that go in order. A run of 3 scores ×3, a run
 * of 4 ×4, a run of 5 ×5.
 *
 * art. 87: the luck someone brought. It is a knotted cord, and its owner
 * counted the way down with it — so what it lifts is the shape that has to
 * be in order, and nothing else. The straight is deliberately not in the
 * list: it is already the top of the ladder, and a hand of five cannot make
 * one anyway (art. 55).
 */
export const THE_CORD: Talisman = {
  id: talisman('talisman.cord'),
  species: 'ladder',
  ladder: { tiers: 1, lines: ['run-3', 'run-4', 'run-5'] },
}

/**
 * art. 51: the Leech's rider, declared. It fires only when the marked face
 * is spent in a claim; kept or unused, the six does nothing. The die is in
 * `dice.ts`; what the rider *does* is a number, so it is here.
 */
export const LEECH: Rider = {
  id: LEECH_RIDER as RiderId,
  onUse: { kind: 'heal', amount: 2 },
}

/**
 * art. 47: armor blocks its value from every attack, automatically. A
 * corroding intent ignores it, and says so (art. 65).
 */
export const RUSTED_PLATE: Wearable = {
  id: wearable('wearable.rusted-plate'),
  armor: 3,
}

/**
 * art. 55: base armor before anything is worn. Zero is the straw the bare
 * start implies; the demo's blocked 3 comes from the plate, not the body.
 */
export const BASE_ARMOR = 0

/** Every rider the labyrinth can fire, for the hand's company (art. 51). */
export const ALL_RIDERS: readonly Rider[] = [LEECH, ...TRAVELER_RIDERS]

/**
 * arts 54, 87: every good that ships, in one list, so the audit is a list
 * nothing can quietly fall off. A die that reaches a player and is not in
 * here is a die no test ever priced — and that, not the die, is the bug.
 *
 * THE_ORPHAN is deliberately absent. It is over budget with no cost face and
 * no owner, so art. 87 refuses it: it survives as the fixture that proves
 * the audit bites, and it is placed nowhere in the labyrinth.
 *
 * THE_ZEALOT is absent too, and for a different reason: nothing in the
 * labyrinth places it. It is a demo fixture (`reference.ts`) and this list
 * is what *ships*, so a good that no room and no socket can ever hand over
 * does not belong in it. THE_OSSUARY was in the same position until card 88
 * put it under the covered font's cloth.
 */
export const CATALOG_GOODS: readonly Good[] = [
  ...TRAVELER_DICE,
  THE_SISTERS[0],
  THE_SISTERS[1],
  THE_LEECH,
  THE_CORD,
  // card 88: placed, in the covered font, as one half of its fork.
  THE_OSSUARY,
  RUSTED_PLATE,
]
