import type { Good, Rider, RiderId, Talisman, TalismanId, Wearable, WearableId } from '../lots/index.js'
import { LEECH_RIDER, THE_LEECH, THE_SISTERS } from './dice.js'
import { TRAVELER_DICE, TRAVELER_RIDERS } from './travelers.js'
import { ROLLING_GOODS } from './trinkets.js'

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
 *
 * **Placed at last** (card 90). It has been a fixture with nowhere to be
 * found since the demo, and the wave that put five levels into the drops is
 * the wave that has no excuse left for leaving it out. What it pays is the
 * shape itself: it fires only on a turn where **every** die of the hand
 * landed inside a claim, which is a turn a player has to build rather than
 * be dealt, so it is a power with a condition instead of a power with a
 * tax. That is why the dull that every ladder talisman owes (art. 54) is
 * not asked of the shape species — the condition *is* the declaration, and
 * `test/goods.test.ts` says which species owes which.
 *
 * **Audited by the mend, 2026-08-07** — it was the one shipped good with no
 * number beside it, which made it the strongest thing in the game *and* the
 * only unexamined one. 3000 fights per cell, bare six-bone hand, greedy
 * thumb:
 *
 * | | bare | + the Zealot | + the Ossuary |
 * | --- | --- | --- | --- |
 * | the Gnawing | 0.576 | 0.848 (**+0.272**) | 0.799 (+0.223) |
 * | the Warden | 0.138 | 0.421 (**+0.283**) | 0.454 (+0.316) |
 *
 * **The finding is that it is not an outlier.** It sits inside the band the
 * Ossuary already set — under it against the keeper, a little over it
 * against the ordinary teeth — and the Ossuary is a shipped, declared,
 * bare-powered talisman that nobody has argued with. So art. 54 is answered
 * the way this comment always claimed it was: the condition prices it, and
 * the table is the proof rather than the claim. What would have been a
 * finding is a good half again the size of everything else in its species,
 * and that is not what is there.
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
 * list: it is already the top of the ladder, and a hand shortened by a wound
 * cannot make one anyway (arts 46, 55).
 *
 * **And it dulls the quad now** (card 90). It was the one ladder talisman in
 * the game and it paid nothing, which was survivable while it was the only
 * one and is not survivable beside five more: art. 54 asks every power to
 * pay, and a level that only ever gives is a level nobody has to think
 * about. What it gives up is the shape that is furthest from *in order* —
 * four of one face — so the price says the same thing the power does.
 */
export const THE_CORD: Talisman = {
  id: talisman('talisman.cord'),
  species: 'ladder',
  ladder: { tiers: 1, lines: ['run-3', 'run-4', 'run-5'], dulls: ['quad'] },
}

/**
 * **The levels** (card 90, art. 53's ladder species).
 *
 * A level is a talisman that raises **one line's** multiplier by one and
 * lowers another's by one. Both halves are the article: the lift is the
 * power and the dull is what art. 54 charges for it, and together they are
 * the only version of a level that changes a *decision*. A global ×1.30 was
 * measured first and rejected — it climbed past every band the arithmetic
 * pass had just set, and, worse, it changed nothing about what a player
 * wanted out of a roll. A per-line level changes what dice you want, which
 * is the whole test (card 82).
 *
 * Six of them ship, counting the Cord: the sets (the whetstone, the notched
 * stick), the composites (the widow's ring), the runs (the surveyor's chain
 * and the Cord), and the floor (the beggar's bowl). Every one of them lifts
 * a line some *other* one of them dulls, so a pouch with several in it is a
 * pouch with a shape rather than a pouch with a bigger number.
 *
 * What each is worth is measured and published (DESIGN.md, the levels
 * wave): between two and four points of win rate against the ordinary
 * Gnawing, against a traveler's bone's nine. Half a die, and findable.
 */

/** art. 53: how far one line may ever be lifted, however many agree. */
export const LEVEL_CAP = 2

/**
 * **The whetstone** — the quad scores a tier higher, and the pair a tier
 * lower. One edge, sharpened past what the rest of the blade is worth.
 */
export const THE_WHETSTONE: Talisman = {
  id: talisman('talisman.whetstone'),
  species: 'ladder',
  ladder: { tiers: 1, lines: ['quad'], dulls: ['pair'] },
}

/**
 * **The surveyor's chain** — the short runs score a tier higher and the two
 * pair a tier lower. It is the second run-leveler on purpose: six dice made
 * the straight *possible* at about a roll in seventy, and one talisman
 * pointed at runs makes chasing one an accident rather than a build. Two of
 * them stack to the cap on the run of 3 and the run of 4 (`LEVEL_CAP`),
 * which is the first place in the game where the cap is a thing a player
 * can actually reach.
 */
export const THE_CHAIN: Talisman = {
  id: talisman('talisman.chain'),
  species: 'ladder',
  ladder: { tiers: 1, lines: ['run-3', 'run-4'], dulls: ['two-pair'] },
}

/**
 * **The widow's ring** — the full house scores a tier higher and the triple
 * a tier lower. The composite over the part of it, which is exactly the
 * decision art. 64 says the card is built around.
 */
export const THE_RING: Talisman = {
  id: talisman('talisman.ring'),
  species: 'ladder',
  ladder: { tiers: 1, lines: ['full-house'], dulls: ['triple'] },
}

/**
 * **The beggar's bowl** — ANY DICE scores a tier higher and the quint a tier
 * lower. It is the biggest single level in the game and the cheapest-looking
 * one: art. 46's floor is claimed more often than any other line, so
 * doubling it is worth more than lifting anything at the top, and what it
 * gives up is the line a hand almost never makes. That asymmetry is the
 * measurement talking and it is published rather than hidden.
 */
export const THE_BOWL: Talisman = {
  id: talisman('talisman.bowl'),
  species: 'ladder',
  ladder: { tiers: 1, lines: ['any-dice'], dulls: ['quint'] },
}

/**
 * **The notched stick** — two pair and three pairs score a tier higher, the
 * run of 4 a tier lower. Everything twice, and nothing in order: the
 * chain's opposite, and the pair of them in one pouch cancel to almost
 * nothing, which is the clearest thing the wave can say about why levels
 * are per-line.
 */
export const THE_NOTCHED_STICK: Talisman = {
  id: talisman('talisman.notch'),
  species: 'ladder',
  ladder: { tiers: 1, lines: ['two-pair', 'three-pairs'], dulls: ['run-4'] },
}

/** Every level that ships, for the audit and for the table (card 90). */
export const LEVELS: readonly Talisman[] = [
  THE_CORD,
  THE_WHETSTONE,
  THE_CHAIN,
  THE_RING,
  THE_BOWL,
  THE_NOTCHED_STICK,
]

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
 * THE_ZEALOT was absent too, and for a different reason: nothing in the
 * labyrinth placed it. Card 90 places it, so it is here — and the rule that
 * kept it out is the one worth keeping, because a good that no room and no
 * socket can hand over is a good no test ever priced in play. THE_OSSUARY
 * was in the same position until card 88 put it under the covered font's
 * cloth.
 */
export const CATALOG_GOODS: readonly Good[] = [
  ...TRAVELER_DICE,
  THE_SISTERS[0],
  THE_SISTERS[1],
  THE_LEECH,
  // card 90: the levels, placed through the ordinary drops like anything
  // else. THE_CORD is one of them and has been placed since the travelers.
  ...LEVELS,
  // card 88: placed, in the covered font, as one half of its fork.
  THE_OSSUARY,
  // card 90: placed at last, and the only shape talisman in the game.
  THE_ZEALOT,
  RUSTED_PLATE,
  // card 93: the rolling goods, held to the same audit and the same origin
  // sentence as everything else that reaches a player.
  ...ROLLING_GOODS,
]
