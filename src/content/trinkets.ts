import type { Amend, Trinket, TrinketId } from '../lots/index.js'

/**
 * **The rolling goods** (card 93, art. 53's talisman acting at score time).
 *
 * A trinket with faces. It is carried outside the hand, takes no slot of it,
 * enters no combo, and when you attack it lands and amends what the line came
 * to. You cannot score a seven-run — but you can score a pair and have the
 * thing throw a +2.
 *
 * **This file is the mechanic.** The engine holds a socket that is a no-op
 * when empty (`src/lots/rolling.ts`), so deleting this file deletes the
 * species: no dead branch in the fight, no empty row on screen, no orphan
 * test. That is the point of it — zero rolling goods is the normal state of
 * the game, the waking hand carries none, and most runs carry none for most
 * of their length.
 *
 * **Every face is tuning and every face is declared** (arts 54, 57). What is
 * *not* tuning is the shape the wave measured and fixed: at least two nulls
 * and one cost face on every one of them. The nulls are the feature — they
 * are what keeps a rolling good from being flat power, and a thing that fires
 * every turn is a number on the body, which is a wearable (art. 47) and not a
 * thing that rolls. `test/rolling.faces.test.ts` is where the bar is kept.
 *
 * **art. 87 holds:** the origin explains the rules in one sentence, or the
 * good does not ship. Both sentences are in `prose.ts` beside every other
 * good's, and both are the same shape as a die's: the faces are how their
 * owner played, and the cost face is the mistake that killed them (art. 86).
 *
 * **What each is worth, measured** (3,000 fights against the ordinary
 * Gnawing, marginal win rate at a weak hand / the returning hand):
 *
 * | good          | weak   | returning |
 * | ------------- | ------ | --------- |
 * | the tin saint | +0.095 | +0.026    |
 * | the sliver    | +0.086 | +0.048    |
 * | both, at the cap | +0.157 | +0.086 |
 *
 * Which is the armour band — the Rusted Plate measured +0.094/+0.044 and a
 * good traveler's bone +0.141/+0.000 — and each of them is a third of what an
 * unwhiffed multiplier face measured (+0.254). Two at the cap sit where a good
 * bone sits, which is what a pair of rare finds should be worth. The numbers
 * are the report's (`test/report.ts`, the rolling rows) and are published in
 * DESIGN.md; nothing in this file is a band and no band moved to make room for
 * it.
 */

const trinket = (id: string): TrinketId => id as TrinketId

/**
 * card 93: **how many rolling goods may be carried at once.**
 *
 * Two, and it is the number the wave measured as most likely to break things:
 * three took a weak hand from 0.412 to **0.825**, which is not a tuned version
 * of the same game. The cap is a guard rather than a wall — exactly two ship,
 * so nothing in the shipped catalog can reach past it — and it is handed to
 * the engine on the company (`Goods.trinketCap`) so that it cannot be lost by
 * a caller assembling one without thinking about it.
 */
export const ROLLING_CAP = 2

/** A face that did not fire. Two of them on every rolling good, at least. */
const NOTHING: Amend = { kind: 'null' }

/**
 * **The tin saint** — somebody who lived by not being hit.
 *
 * Three faces turn a blow aside — twice six, once ten, which is most of any
 * blow in the depth; two do nothing at all; and the sixth is the mistake, which
 * is trusting it. It is the wave's answer to *what is a rolling good that is
 * not a wearable* — the Rusted Plate blocks three from every attack for ever,
 * and this blocks twice that or nothing, which is a different question rather
 * than a better answer. It is worth most to a body with no armour on it and
 * least to one already plated, and that is the whole shape of it.
 *
 * And it blocks through a corroding intent, because corrosion eats a body stat
 * (art. 47) and a face that came up at score time is not one. That is declared
 * on inspect like every other number (art. 54).
 */
export const THE_TIN_SAINT: Trinket = {
  id: trinket('trinket.tin-saint'),
  rolls: [
    { kind: 'block', amount: 6 },
    { kind: 'block', amount: 6 },
    { kind: 'block', amount: 10 },
    NOTHING,
    NOTHING,
    { kind: 'cost', amount: 4 },
  ],
}

/**
 * **The sliver** — somebody who sharpened one trick until it cut.
 *
 * Two faces pay **for each die in the claim**, which is the interesting kind:
 * it pays a pair twice and a full house five times, so it is the only good in
 * the game whose worth rises as the hand improves without a number on it
 * changing. One face is the plain cut, flat. Two do nothing. And the sixth is
 * a chip of flint in a closing hand, which is how its owner died.
 */
export const THE_SLIVER: Trinket = {
  id: trinket('trinket.sliver'),
  rolls: [
    { kind: 'per', amount: 2 },
    { kind: 'per', amount: 3 },
    { kind: 'add', amount: 6 },
    NOTHING,
    NOTHING,
    { kind: 'cost', amount: 5 },
  ],
}

/**
 * Every rolling good that ships, for the audit and for the table.
 *
 * Two. A third was considered and is not here: art. 87 asks an origin that
 * explains the rules in one sentence, and a third whose sentence was *another
 * one of those* would be a fourth face on one of these rather than a good.
 * Emptying this list empties the mechanic, which is the boundary the wave set.
 */
export const ROLLING_GOODS: readonly Trinket[] = [THE_TIN_SAINT, THE_SLIVER]
