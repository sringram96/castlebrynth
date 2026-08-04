/**
 * The reference fight's kit — the demo, ported (art. 54, and the board task
 * "7 · Content — the reference fight, re-authored").
 *
 * `reference/castlebrynth-lots-demo.html` fights the Gnawing with six dice,
 * two of them the Sisters and one the Leech, wearing the Rusted Plate and
 * carrying the Ossuary and the Zealot. Nothing here is the skeleton's
 * starting kit — art. 55 keeps that bare. This is the fixture the engine is
 * measured against, and it lives in content because every number in it is
 * tuning.
 */

import type { Goods, Hand } from '../lots/index.js'
import { armorFrom } from '../lots/index.js'
import { PLAIN_POUCH, THE_LEECH, THE_SISTERS } from './dice.js'
import { BASE_ARMOR, LEECH, RUSTED_PLATE, THE_OSSUARY, THE_ZEALOT } from './items.js'

/** The demo's six: a plain bone, the two Sisters, two plain bones, the Leech. */
export const DEMO_HAND: Hand = {
  dice: [
    PLAIN_POUCH.dice[0]!,
    THE_SISTERS[0],
    THE_SISTERS[1],
    PLAIN_POUCH.dice[3]!,
    PLAIN_POUCH.dice[4]!,
    THE_LEECH,
  ],
}

/** The talismans and riders the demo fights with (arts 51, 53). */
export const DEMO_GOODS: Goods = {
  talismans: [THE_OSSUARY, THE_ZEALOT],
  riders: [LEECH],
}

/** art. 47: the demo's blocked 3 is the plate, over a bare body of nothing. */
export const DEMO_ARMOR = armorFrom([RUSTED_PLATE], BASE_ARMOR)

/** The demo's player: twenty-six, same as the skeleton's waking. */
export const DEMO_HEALTH = 26
