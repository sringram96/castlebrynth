/**
 * The crooked bones: the dice, the picker, and the one rule each monster has.
 *
 * Three things are being held to, and they are the three laws the wave is made
 * of:
 *
 *   - **a core die is its faces and nothing else.** No rule field, no trigger,
 *     no face outside one to six. That is what keeps `hands.ts`, the sum, the
 *     strips and the solver working unchanged however many are authored.
 *   - **the hand is six, and nothing sits outside it.** Taking a die means
 *     giving one up, in the same press: one transition that charges, swaps and
 *     claims, and a cancel that charges nothing.
 *   - **a monster's break is a ladder, and `breakFor` is the only authority on
 *     it.** The number on the tray and the number that takes your bones come out
 *     of the same function or they will disagree.
 */

import { describe, expect, it } from 'vitest'

import {
  BARGAIN_POOL,
  CARVER_POOL,
  CORE_DICE,
  CROOKED_DICE,
  DIE_PRICE,
  HAND_SLOTS,
  TREASURE_DIE,
  coreDie,
} from '../../src/content/dice.js'
import type { CoreDieId } from '../../src/content/dice.js'
import { ENEMIES, STAGES, breakFor, stageForRound } from '../../src/content/enemies.js'
import { ladderChips, stripFor } from '../../src/content/faces.js'
import { BONE_CEILING } from '../../src/content/bones.js'
import { matchingHands, sumOf } from '../../src/combat/hands.js'
import type { DieValue } from '../../src/combat/roll.js'
import { roomAt } from '../../src/game/map.js'
import type { DieOffer } from '../../src/game/map.js'
import { canClaim, claimedIn, diceOnOffer, newRun, refusalForDie, reduce } from '../../src/game/reducer.js'
import { EMPTY_META, SAVE_VERSION } from '../../src/game/state.js'
import type { GameState } from '../../src/game/state.js'
import { seedWith } from './where.js'

// ── the table ──────────────────────────────────────────────────────────

describe('a core die is its faces and nothing else', () => {
  it('gives every core die six faces, each an integer one to six', () => {
    // The whole reason a crooked die needs no code anywhere: every face is an
    // ordinary d6 value, so the sum, the shapes, the strips and the solver all
    // work on it unchanged. A seventh face or a zero would be a new mechanic
    // smuggled in as content.
    for (const die of Object.values(CORE_DICE)) {
      expect(die.faces, `${die.name}`).toHaveLength(6)
      for (const face of die.faces) {
        expect(Number.isInteger(face), `${die.name} has a fractional face`).toBe(true)
        expect(face, `${die.name}`).toBeGreaterThanOrEqual(1)
        expect(face, `${die.name}`).toBeLessThanOrEqual(6)
      }
    }
  })

  it('gives no core die a rule of any kind', () => {
    // Asserted as an **absence**, over the real objects, because the absence is
    // the law. A die that grew a `rule`, a `trigger` or an `effect` would be a
    // die with an exception in it, and there is no exception anywhere in
    // `hands.ts` for one to hook into.
    const allowed = new Set(['id', 'name', 'short', 'faces', 'flavour'])
    for (const die of Object.values(CORE_DICE)) {
      for (const key of Object.keys(die)) expect([...allowed], `${die.id}.${key}`).toContain(key)
      expect((die as unknown as Record<string, unknown>)['rule'], `${die.id} has a rule`).toBeUndefined()
    }
  })

  it('gives every core die a strip and a word to wear', () => {
    for (const die of Object.values(CORE_DICE)) {
      expect(stripFor(die.id)).toHaveLength(6)
      expect(die.short.length, `${die.name} has no short name`).toBeGreaterThan(0)
      expect(die.short.length, `${die.name}'s short name is not short`).toBeLessThanOrEqual(8)
      expect(die.flavour.length, `${die.name} says nothing`).toBeGreaterThan(10)
    }
  })

  it('keeps the Hand of Saint Orrin out of every pool it could be sold from', () => {
    // Treasure only. Its price is the road to it, and a pool it could leak into
    // would make the road optional.
    expect(CARVER_POOL).not.toContain(TREASURE_DIE)
    expect(BARGAIN_POOL).not.toContain(TREASURE_DIE)
    expect(CROOKED_DICE).not.toContain(TREASURE_DIE)
    // And the plain bone is not for sale either: it is the floor a run starts on.
    expect(CARVER_POOL).not.toContain('bone')
    expect(CROOKED_DICE.length).toBeGreaterThan(3)
  })

  it('is derived from the table, so a die authored later is in the pools', () => {
    const expected = (Object.keys(CORE_DICE) as CoreDieId[]).filter(
      (id) => id !== 'bone' && id !== TREASURE_DIE,
    )
    expect([...CROOKED_DICE]).toEqual(expected)
    expect(CARVER_POOL).toEqual(CROOKED_DICE)
    expect(BARGAIN_POOL).toEqual(CROOKED_DICE)
  })

  it('changes what a throw comes up with, and never what a throw means', () => {
    // A crooked die is a distribution, and this is the assertion that says so:
    // every face of every one of them makes the same shapes and adds the same way
    // as a plain bone showing the same number. There is no per-die arithmetic
    // anywhere for this to be false of.
    for (const die of Object.values(CORE_DICE)) {
      for (const face of die.faces) {
        const table: DieValue[] = [face, face, face, 2, 3, 4]
        const plain: DieValue[] = [face, face, face, 2, 3, 4]
        expect(matchingHands(table)).toEqual(matchingHands(plain))
        expect(sumOf(table)).toBe(sumOf(plain))
      }
    }
  })

  it('prices a crooked die at the one number, wherever it is standing', () => {
    // The Carver's table and a chained alcove are the same transaction seen
    // twice, so they read the same constant. Two prices would be two rules.
    expect(DIE_PRICE).toBeGreaterThan(0)
    expect(DIE_PRICE).toBeLessThan(BONE_CEILING)
  })
})

// ── the picker ─────────────────────────────────────────────────────────

/** Standing in a room the director put core dice in. */
function standingWhereDiceAre(templateId: string, bones = BONE_CEILING): GameState {
  const run = newRun(seedWith(templateId, 1))
  const node = Object.values(run.map.nodes).find(
    (n) => n.templateId === templateId && (n.dice?.length ?? 0) > 0,
  )
  if (!node) throw new Error(`no ${templateId} in this run has a die in it`)
  const stood = { ...run, roomId: node.id, bones, path: [...run.path, node.id] }
  return { version: SAVE_VERSION, mode: 'explore', meta: EMPTY_META, run: stood }
}

const offerIn = (state: GameState, index = 0): DieOffer => roomAt(state.run!).dice[index]!

describe('the picker: one press, and the hand is still six', () => {
  it('charges, swaps and claims in one transition', () => {
    const here = standingWhereDiceAre('carver')
    const offer = offerIn(here)
    const before = here.run!.bones
    const after = reduce(here, { type: 'CLAIM_DIE', index: 0, slot: 2 })

    // The price. It is charged here and nowhere else — there is no state in which
    // the run has paid and not been given the die.
    expect(after.run!.bones).toBe(before - offer.price!)
    // The swap. Six slots in, six slots out, with one of them changed.
    expect(after.run!.hand).toHaveLength(HAND_SLOTS)
    expect(after.run!.hand[2]).toBe(offer.die)
    expect(after.run!.hand.filter((_, i) => i !== 2)).toEqual(
      here.run!.hand.filter((_, i) => i !== 2),
    )
    // And the seat is empty. Not removed — marked, exactly as loot is, because
    // the draw happened once and a record that deleted itself would leave nothing
    // to stop a second claim.
    expect(claimedIn(after.run!)).toEqual([0])
    expect(diceOnOffer(after.run!).map((d) => d.index)).not.toContain(0)
    // The line owns the discarded die, once.
    expect(after.run!.say).toContain(coreDie(offer.die).name)
    expect(after.run!.say).toContain('I put the old one down')
    // And the ledger remembers what the run actually took.
    expect(after.meta.seenRewards).toContain(offer.die)
  })

  it('cancels for nothing: no charge, no swap, and the die still on its seat', () => {
    // Cancel is **not a transition**. The picker is presentation-local — opening
    // it reduces nothing — so what this asserts is the only thing there is to
    // assert: the state a cancelled picker leaves behind is the state it opened
    // over, down to identity.
    const here = standingWhereDiceAre('carver')
    expect(here.run!.bones).toBe(BONE_CEILING)
    expect(claimedIn(here.run!)).toEqual([])
    expect(diceOnOffer(here.run!)).toHaveLength(roomAt(here.run!).dice.length)
    // A reload mid-picker is the same thing by construction: there is nothing in
    // the save that could hold a half-made decision.
    expect(JSON.stringify(here.run!)).not.toContain('picker')
  })

  it('leaves both dice on the table when only one is bought', () => {
    const here = standingWhereDiceAre('carver')
    expect(roomAt(here.run!).dice).toHaveLength(2)
    const one = reduce(here, { type: 'CLAIM_DIE', index: 0, slot: 0 })
    expect(diceOnOffer(one.run!).map((d) => d.index)).toEqual([1])
    // And the second is still buyable, at its own price.
    const both = reduce(one, { type: 'CLAIM_DIE', index: 1, slot: 1 })
    expect(both.run!.bones).toBe(BONE_CEILING - 2 * DIE_PRICE)
    expect(diceOnOffer(both.run!)).toEqual([])
  })

  it('refuses a second claim on the same seat', () => {
    const here = standingWhereDiceAre('carver')
    const once = reduce(here, { type: 'CLAIM_DIE', index: 0, slot: 0 })
    expect(reduce(once, { type: 'CLAIM_DIE', index: 0, slot: 1 })).toBe(once)
  })

  it('refuses a slot that is not one of the six', () => {
    const here = standingWhereDiceAre('carver')
    for (const slot of [-1, HAND_SLOTS, 1.5, 99]) {
      expect(reduce(here, { type: 'CLAIM_DIE', index: 0, slot })).toBe(here)
    }
    expect(reduce(here, { type: 'CLAIM_DIE', index: 9, slot: 0 })).toBe(here)
  })

  it('never lets a price be the last of the pile', () => {
    // **A bargain is never lethal.** The press is hidden rather than greyed and
    // the reducer refuses it as well, because the view's claim that a press is
    // legal is not what makes it legal.
    const offer = offerIn(standingWhereDiceAre('carver'))
    const price = offer.price!
    for (const bones of [1, price - 1, price]) {
      const thin = standingWhereDiceAre('carver', bones)
      expect(canClaim(thin.run!, offer), `at ${bones} bones`).toBe(false)
      expect(refusalForDie(thin.run!, offer)).toBeDefined()
      expect(reduce(thin, { type: 'CLAIM_DIE', index: 0, slot: 0 })).toBe(thin)
    }
    // One bone over the price is a trade. It leaves the run alive, which is the
    // whole of the rule.
    const just = standingWhereDiceAre('carver', price + 1)
    expect(canClaim(just.run!, offer)).toBe(true)
    const bought = reduce(just, { type: 'CLAIM_DIE', index: 0, slot: 0 })
    expect(bought.run!.bones).toBe(1)
    expect(bought.mode).toBe('explore')
  })

  it('says the refusal in his own words, at exactly the price', () => {
    const offer = offerIn(standingWhereDiceAre('carver'))
    const broke = standingWhereDiceAre('carver', offer.price!)
    expect(refusalForDie(broke.run!, offer)).toBe('It wants three. I have three. No.')
  })

  it('asks nothing for the treasure, and takes it at one bone', () => {
    const here = standingWhereDiceAre('niche', 1)
    const treasure = roomAt(here.run!).dice.find((d) => d.kind === 'treasure')
    if (!treasure) return
    expect(treasure.price).toBeUndefined()
    expect(canClaim(here.run!, treasure)).toBe(true)
  })

  it('is the only way a core die is ever swapped in a room', () => {
    // LOOK at a die commits nothing. It is the same contract a found thing is
    // under, and it is what makes the price a decision rather than a surprise.
    const here = standingWhereDiceAre('carver')
    const looked = reduce(here, { type: 'LOOK', detailId: 'die:0' })
    expect(looked.run!.bones).toBe(here.run!.bones)
    expect(looked.run!.hand).toEqual(here.run!.hand)
    expect(claimedIn(looked.run!)).toEqual([])
    expect(looked.run!.say).toContain(coreDie(offerIn(here).die).name)
    // And the price is in the line, before any press.
    expect(looked.run!.say).toMatch(/Three of my bones\./)
  })

  it('refuses a claim from anywhere but a room', () => {
    const here = standingWhereDiceAre('carver')
    for (const mode of ['title', 'combat', 'dead', 'complete'] as const) {
      expect(reduce({ ...here, mode }, { type: 'CLAIM_DIE', index: 0, slot: 0 }).run!.hand).toEqual(
        here.run!.hand,
      )
    }
  })
})

describe('a carving says a thing exists and never where', () => {
  it('answers a LOOK with the line the plan cut, and commits nothing', () => {
    const run = newRun(1)
    const node = Object.values(run.map.nodes).find((n) => (n.carvings?.length ?? 0) > 0)!
    const stood: GameState = {
      version: SAVE_VERSION,
      mode: 'explore',
      meta: EMPTY_META,
      run: { ...run, roomId: node.id, path: [...run.path, node.id] },
    }
    const looked = reduce(stood, { type: 'LOOK', detailId: 'carving' })
    expect(looked.run!.say).toBe(node.carvings![0])
    expect(looked.run!.looked).toContain('carving')
    expect(looked.run!.bones).toBe(stood.run!.bones)
    // It names no room, no node and no direction. *We hide places, never rules.*
    for (const id of Object.keys(run.map.nodes)) expect(looked.run!.say).not.toContain(id)
  })
})

// ── one rule each ──────────────────────────────────────────────────────

describe('breakFor is the one authority on what a thing breaks', () => {
  it('climbs the Gnawing as it closes, one rung per stage', () => {
    const gnawing = ENEMIES.gnawing!
    const wanted = [2, 4, 8]
    STAGES.forEach((stage, index) => {
      // The round the picture is at that stage, derived the same way the picture
      // derives it — so the number and the drawing cannot disagree.
      const round = index + 1
      expect(stageForRound('gnawing', round)).toBe(stage)
      expect(breakFor(gnawing, { round, enemyHp: 70 })).toBe(wanted[index])
    })
    // And it stays at the top rung: there is no fourth drawing and no fourth rung.
    for (const round of [3, 4, 9, 50]) {
      expect(breakFor(gnawing, { round, enemyHp: 70 })).toBe(8)
    }
  })

  it('steps the Marrow down as it is worn away', () => {
    const marrow = ENEMIES.marrow!
    const bands: readonly [number, number][] = [
      [120, 5],
      [100, 5],
      [81, 5],
      [80, 4],
      [60, 4],
      [41, 4],
      [40, 3],
      [10, 3],
      [1, 3],
    ]
    for (const [enemyHp, breaks] of bands) {
      expect(breakFor(marrow, { round: 1, enemyHp }), `at ${enemyHp}`).toBe(breaks)
      // And the round it is on makes no difference: this ladder reads its wounds.
      expect(breakFor(marrow, { round: 9, enemyHp })).toBe(breaks)
    }
  })

  it('reads the line just scored for the Warden, and only that line', () => {
    const warden = ENEMIES.warden!
    const at = { round: 1, enemyHp: 180 }
    expect(breakFor(warden, at)).toBe(8)
    expect(breakFor(warden, at, 'crap')).toBe(12)
    for (const line of ['pair', 'two-pair', 'triple', 'straight', 'full-house', 'four-kind'] as const) {
      expect(breakFor(warden, at, line), line).toBe(8)
    }
    // Its health and its round change nothing. A rule is one rule.
    for (const enemyHp of [180, 90, 1]) {
      for (const round of [1, 2, 7]) {
        expect(breakFor(warden, { round, enemyHp })).toBe(8)
        expect(breakFor(warden, { round, enemyHp }, 'crap')).toBe(12)
      }
    }
  })

  it('never answers less than one, or more than its own top rung', () => {
    for (const e of Object.values(ENEMIES)) {
      const top = Math.max(...e.breakRule!.rungs.map((r) => r.breaks))
      for (const round of [1, 2, 3, 12]) {
        for (const enemyHp of [e.maxHp, Math.floor(e.maxHp / 2), 1]) {
          for (const line of [undefined, 'crap', 'pair'] as const) {
            const broke = breakFor(e, { round, enemyHp }, line)
            expect(broke, `${e.name}`).toBeGreaterThan(0)
            expect(broke, `${e.name}`).toBeLessThanOrEqual(top)
          }
        }
      }
    }
  })

  it('prints every rung as a chip, and nowhere twice', () => {
    for (const e of Object.values(ENEMIES)) {
      const chips = ladderChips(e.id)
      expect(chips).toHaveLength(e.breakRule!.rungs.length)
      for (const chip of chips) expect(chip.kind).toBe('rung')
      // The numbers live in the rule and are read out of it. A ladder written
      // twice is a ladder that will disagree with itself.
      e.breakRule!.rungs.forEach((rung, index) => {
        expect(chips[index]!.text).toContain(String(rung.breaks))
      })
    }
  })

  it('gives every authored enemy exactly one rule', () => {
    // Three monsters, three questions — *hurry*, *keep at it*, *do not run out of
    // lines* — and not one new noun between them.
    const kinds = Object.values(ENEMIES).map((e) => e.breakRule!.kind)
    expect(kinds).toHaveLength(3)
    expect(new Set(kinds).size).toBe(3)
    for (const e of Object.values(ENEMIES)) {
      expect(e.breakRule!.rungs.length, `${e.name}`).toBeGreaterThan(1)
      expect(e.rule, `${e.name} prints no rule`).toBeDefined()
    }
  })
})
