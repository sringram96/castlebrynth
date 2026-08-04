import type { Talisman, TalismanId, Wearable, WearableId } from '../lots/index.js'

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
}

/**
 * art. 53, shape species: it reads the whole turn — every die of the hand
 * spent in some claim, and the turn's attack doubles.
 */
export const THE_ZEALOT: Talisman = {
  id: talisman('talisman.zealot'),
  species: 'shape',
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
