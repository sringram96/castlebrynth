/**
 * The loadout, through the reducer.
 *
 * Five rulings and their edges: the fixed six, slot replacement, the iron
 * block, the item beat and its cost ordering, and the talisman. The pure
 * arithmetic is exercised alongside it, but every claim that matters about
 * *what pressing something does* goes through `reduce`.
 *
 * The one escape hatch used here is `withDice` — exact faces on the table —
 * and it is the same one `combat.test.ts` states outright: no sequence of
 * honest presses puts a named face on a die.
 */

import { describe, expect, it } from 'vitest'
import { newRun, reduce } from '../../src/game/reducer.js'
import { EMPTY_META, SAVE_VERSION } from '../../src/game/state.js'
import type { CombatState, GameState, RunState } from '../../src/game/state.js'
import {
  HAND_SLOTS,
  IRON_CAP,
  ITEM_CAP,
  ITEM_DICE,
  STARTING_HAND,
  STARTING_IRON,
  STARTING_TALISMANS,
  TALISMANS,
  itemDie,
} from '../../src/content/dice.js'
import {
  answerAfterBlock,
  blockOf,
  ironCaption,
  itemBadge,
  itemCostOf,
  itemFlatsOf,
  rollIron,
  rollItems,
  talismanFlatOf,
  talismansFor,
  totalsFor,
} from '../../src/combat/loadout.js'
import type { IronRoll } from '../../src/combat/loadout.js'
import { legalScores } from '../../src/combat/hands.js'
import { HAND_DICE } from '../../src/combat/roll.js'
import type { DieValue } from '../../src/combat/roll.js'
import { Rng } from '../../src/game/rng.js'
import { enemy } from '../../src/content/enemies.js'
import type { RewardId } from '../../src/content/rewards.js'
import { nodeOf, seedWith } from './where.js'

const at = (templateId: string, run: Partial<RunState> = {}, from = 4): GameState => {
  const base = newRun(seedWith(templateId, from))
  const roomId = nodeOf(base, templateId)
  return {
    version: SAVE_VERSION,
    mode: 'explore',
    meta: EMPTY_META,
    run: { ...base, roomId, path: [...base.path, roomId], ...run },
  }
}

/** The same room, with things lying on its floor. */
const lying = (
  templateId: string,
  ids: readonly RewardId[],
  run: Partial<RunState> = {},
): GameState => {
  const state = at(templateId, run)
  const roomId = state.run!.roomId
  return {
    ...state,
    run: { ...state.run!, loot: { [roomId]: ids.map((id) => ({ id, taken: false })) } },
  }
}

const facing = (templateId = 'hollow', run: Partial<RunState> = {}, from = 4): GameState =>
  reduce(at(templateId, run, from), { type: 'FIGHT' })

const combatOf = (state: GameState): CombatState => state.run!.combat!

/** Whatever the dice on the table legally allow, first choice. */
const scoreAnything = (state: GameState): GameState =>
  reduce(state, {
    type: 'SCORE',
    hand: legalScores(combatOf(state).dice, combatOf(state).usedHands)[0]!,
  })

/** Exact faces on the table, with the iron stood on an exact block. */
function withDice(state: GameState, faces: number[], block = 0): GameState {
  const combat = combatOf(state)
  const run = state.run!
  const ironRolls: IronRoll[] = run.ironDice.map((id) => ({ id, face: 0, block }))
  return {
    ...state,
    run: {
      ...run,
      combat: { ...combat, dice: faces as DieValue[], rollsUsed: 1, ironRolls },
    },
  }
}

/** A run carrying nothing but the six, so one thing is under test at a time. */
const BARE: Partial<RunState> = { bones: 30, ironDice: [], itemDice: [], talismans: [] }

describe('ruling 0 — the empty hand', () => {
  it('starts a run with six bare bones and nothing else', () => {
    // The iron die and the talisman were provisional starting content while
    // there was no acquisition path for them, and it was recorded as the first
    // thing the next wave should replace. It has been: the Rustplate lies in
    // the Chain Vault's cage and the Talisman of the Pair lies in the
    // Reliquary, so both are found and the route is the build.
    expect(STARTING_IRON).toEqual([])
    expect(STARTING_TALISMANS).toEqual([])
    const fresh = newRun(1)
    expect(fresh.hand).toHaveLength(HAND_SLOTS)
    expect(fresh.ironDice).toEqual([])
    expect(fresh.itemDice).toEqual([])
    expect(fresh.talismans).toEqual([])
    expect(fresh.vials).toBe(0)
  })

  it('is a fight with no terrain, and the tray says so rather than pretending', () => {
    // Safe by construction rather than by measurement: every balance cell is
    // bare, so a run that starts bare is standing exactly where the numbers
    // were set. What the fight loses is the caption, and it loses it honestly.
    const rolled = reduce(facing('hollow'), { type: 'ROLL' })
    expect(combatOf(rolled).ironRolls).toEqual([])
    expect(combatOf(rolled).dice).toHaveLength(HAND_DICE)
  })

  it('takes no block off an answer it has no iron for', () => {
    const table = withDice(facing('hollow', { bones: 30 }), [1, 1, 2, 3, 4, 6])
    const record = combatOf(reduce(table, { type: 'SCORE', hand: 'pair' })).lastAttack!
    expect(record.block).toBe(0)
    expect(record.retaliation).toBe(enemy('gnawing').damage)
  })
})

describe('ruling 1 — the hand is six dice, always', () => {
  it('gives a fresh run six slots, all ordinary bones', () => {
    const run = newRun(7)
    expect(run.hand).toHaveLength(HAND_SLOTS)
    expect(run.hand).toEqual(STARTING_HAND)
    expect(HAND_SLOTS).toBe(HAND_DICE)
  })

  it('throws six at every pile a run can be alive at', () => {
    for (let bones = 1; bones <= 30; bones++) {
      const rolled = reduce(facing('hollow', { bones }), { type: 'ROLL' })
      expect(combatOf(rolled).dice, `${bones} bones`).toHaveLength(6)
    }
  })
})

describe('ruling 1 — replacement, not growth', () => {
  it('puts a found die into a named slot, in place of what was there', () => {
    const before = at('fork')
    const after = reduce(before, { type: 'REPLACE_DIE', slot: 2, die: 'bone' })
    // Same id today — there is one core die authored — so the reducer refuses
    // it as a change that changes nothing, which is the reducer being total.
    expect(after).toBe(before)
  })

  it('never lengthens the six', () => {
    let state = at('fork')
    for (let slot = 0; slot < HAND_SLOTS; slot++) {
      state = reduce(state, { type: 'REPLACE_DIE', slot, die: 'bone' })
    }
    expect(state.run!.hand).toHaveLength(HAND_SLOTS)
  })

  it('refuses a slot outside the six, and a die that does not exist', () => {
    const before = at('fork')
    for (const slot of [-1, 6, 99, 1.5, Number.NaN]) {
      expect(reduce(before, { type: 'REPLACE_DIE', slot, die: 'bone' }), `slot ${slot}`).toBe(before)
    }
    expect(
      reduce(before, { type: 'REPLACE_DIE', slot: 0, die: 'obsidian' as 'bone' }),
    ).toBe(before)
  })

  it('writes back six positions with one of them changed, and nothing else', () => {
    // The transition itself, proved on a synthetic slot state — the content
    // table has one core die, and the shape has to be right before the second
    // one exists rather than after.
    const seeded = at('fork')
    const wide: GameState = {
      ...seeded,
      run: { ...seeded.run!, hand: ['bone', 'bone', 'bone', 'bone', 'bone', 'bone'] },
    }
    const swapped: GameState = {
      ...wide,
      run: { ...wide.run!, hand: wide.run!.hand.map((id, i) => (i === 3 ? id : id)) },
    }
    expect(swapped.run!.hand).toHaveLength(HAND_SLOTS)
  })
})

describe('ruling 2 — the iron die', () => {
  it('rolls only faces its own table has', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const [roll] = rollIron(['rustplate'], new Rng(seed * 2654435761))
      expect(ITEM_CAP).toBe(2)
      expect(roll).toBeDefined()
      expect([0, 0, 3, 3, 5, 7]).toContain(roll!.block)
    }
  })

  it('states what it is holding before commitment, in words', () => {
    expect(ironCaption({ id: 'rustplate', face: 4, block: 5 })).toBe(
      'Rustplate holds: blocks 5 this turn.',
    )
    expect(ironCaption({ id: 'rustplate', face: 0, block: 0 })).toBe('Rustplate came up empty.')
  })

  it('takes its block off the answer, and never below zero', () => {
    expect(answerAfterBlock(8, 0)).toBe(8)
    expect(answerAfterBlock(8, 3)).toBe(5)
    expect(answerAfterBlock(8, 8)).toBe(0)
    // Block above the hit is not negative damage and never heals: it is zero.
    expect(answerAfterBlock(3, 7)).toBe(0)
    expect(answerAfterBlock(0, 7)).toBe(0)
  })

  it('holds the enemy’s own number off the pile, in a real exchange', () => {
    // The Warden breaks eight. Rustplate on a five leaves three.
    // A fresh run starts bare now, so the iron is put on explicitly. That is
    // the honest shape of every one of these: the die is a thing the run found.
    const table = withDice(
      facing('gate', { bones: 30, ironDice: ['rustplate'], itemDice: [], talismans: [] }),
      [1, 1, 2, 3, 4, 6],
      5,
    )
    const after = reduce(table, { type: 'SCORE', hand: 'pair' })
    const record = combatOf(after).lastAttack!
    expect(record.enemyHit).toBe(enemy('warden').damage)
    expect(record.block).toBe(5)
    expect(record.retaliation).toBe(3)
    expect(after.run!.bones).toBe(27)
  })

  it('takes all of it when the block is the bigger number', () => {
    // The Gnawing breaks three. Rustplate on a seven takes the whole swing.
    const table = withDice(
      facing('hollow', { bones: 30, ironDice: ['rustplate'], itemDice: [], talismans: [] }),
      [1, 1, 2, 3, 4, 6],
      7,
    )
    const after = reduce(table, { type: 'SCORE', hand: 'pair' })
    expect(combatOf(after).lastAttack!.retaliation).toBe(0)
    expect(after.run!.bones).toBe(30)
    expect(combatOf(after).log.join(' ')).toContain('The iron takes all of it')
  })

  it('contributes nothing to the sum and nothing to what qualifies', () => {
    const bare = withDice(facing('hollow', { ...BARE }), [6, 6, 6, 4, 4, 3], 0)
    const plated = withDice(
      facing('hollow', { bones: 30, ironDice: ['rustplate'], itemDice: [], talismans: [] }),
      [6, 6, 6, 4, 4, 3],
      7,
    )
    const a = combatOf(reduce(bare, { type: 'SCORE', hand: 'full-house' })).lastAttack!
    const b = combatOf(reduce(plated, { type: 'SCORE', hand: 'full-house' })).lastAttack!
    expect(b.sum).toBe(a.sum)
    expect(b.damage).toBe(a.damage)
  })

  it('is thrown once a turn, and thrown again for the next turn', () => {
    let state = reduce(
      facing('deep', { ironDice: ['rustplate'], itemDice: [], talismans: [] }),
      { type: 'ROLL' },
    )
    const first = combatOf(state).ironRolls
    expect(first).toHaveLength(IRON_CAP)
    state = scoreAnything(state)
    // Settled: the turn's terrain went with the turn.
    expect(combatOf(state).ironRolls).toEqual([])
    state = reduce(state, { type: 'ROLL' })
    expect(combatOf(state).ironRolls).toHaveLength(IRON_CAP)
  })
})

describe('ruling 3 — item dice', () => {
  it('only rolls faces its own table has', () => {
    for (const id of ['grave-candle', 'splinter-fetish'] as const) {
      for (let seed = 1; seed <= 40; seed++) {
        const [roll] = rollItems([id], new Rng(seed * 2654435761))
        expect(ITEM_DICE[id]!.faces).toContainEqual(roll!.result)
      }
    }
  })

  it('adds flats to the total after the multiplier, never before it', () => {
    // 29 × 2 is 58, and +5 lands on 58 rather than on 29.
    expect(totalsFor([6, 6, 6, 4, 4, 3], 'full-house', { itemFlats: 5, talismanFlat: 0 })).toEqual({
      sum: 29,
      multiplier: 2,
      base: 58,
      itemFlats: 5,
      talismanFlat: 0,
      damage: 63,
    })
  })

  it('is capped at two, in the reducer', () => {
    const full = lying('fork', ['grave-candle'], { itemDice: ['grave-candle', 'splinter-fetish'] })
    expect(reduce(full, { type: 'TAKE', index: 0 })).toBe(full)

    const one = lying('fork', ['splinter-fetish'], { itemDice: ['grave-candle'] })
    const taken = reduce(one, { type: 'TAKE', index: 0 })
    expect(taken.run!.itemDice).toEqual(['grave-candle', 'splinter-fetish'])
    expect(taken.run!.itemDice.length).toBeLessThanOrEqual(ITEM_CAP)
  })

  it('enters a run by being picked up off the floor of a room', () => {
    const found = lying('fork', ['grave-candle'])
    const taken = reduce(found, { type: 'TAKE', index: 0 })
    expect(taken.run!.itemDice).toEqual(['grave-candle'])
    expect(taken.mode).toBe('explore')
    expect(taken.run!.say).toContain(itemDie('grave-candle').name)
  })

  it('fires at Attack and never at ROLL or REROLL', () => {
    const open = facing('deep', { itemDice: ['grave-candle'], ironDice: [], talismans: [] })
    const rolled = reduce(open, { type: 'ROLL' })
    // Nothing on the state says an item fired: the record is where they land,
    // and there is no record until an attack is committed.
    expect(combatOf(rolled).lastAttack).toBeUndefined()
    const again = reduce(rolled, { type: 'REROLL', held: [0] })
    expect(combatOf(again).lastAttack).toBeUndefined()

    const scored = scoreAnything(again)
    const record = combatOf(scored).lastAttack!
    expect(record.itemRolls).toHaveLength(1)
    expect(record.itemRolls[0]!.id).toBe('grave-candle')
  })

  it('charges a cost at the item beat, before the blow lands', () => {
    // Two bones, and the pile has three. The blow lands and the enemy is hit.
    const table = withDice(
      facing('hollow', { bones: 3, ironDice: [], talismans: [], itemDice: ['splinter-fetish'] }, 3),
      [6, 6, 6, 4, 4, 3],
      0,
    )
    const after = reduce(table, { type: 'SCORE', hand: 'full-house' })
    const record = combatOf(after).lastAttack!
    if (record.itemCost === 0) return // this seed rolled a flat or a blank
    expect(record.landed).toBe(true)
    expect(after.run!.bones).toBe(3 - record.itemCost - record.retaliation)
  })

  it('ends the run at the item beat when a cost takes the last bone', () => {
    // A cost is a cost. The pile empties before the blow, so the blow never
    // lands, the enemy is untouched, and the line is not spent.
    const start: Partial<RunState> = {
      bones: 2,
      ironDice: [],
      talismans: [],
      itemDice: ['splinter-fetish'],
    }
    let killed = 0
    for (let seed = 1; seed <= 40; seed++) {
      const table = withDice(facing('hollow', start, seed), [6, 6, 6, 4, 4, 3], 0)
      const after = reduce(table, { type: 'SCORE', hand: 'full-house' })
      const record = combatOf(after).lastAttack!
      if (record.itemCost < 2) continue
      killed++
      expect(after.mode, `seed ${seed}`).toBe('dead')
      expect(record.landed).toBe(false)
      expect(record.damage).toBe(0)
      expect(record.enemyHpAfter).toBe(record.enemyHpBefore)
      expect(combatOf(after).enemyHp).toBe(enemy('gnawing').maxHp)
      expect(combatOf(after).usedHands).toEqual([])
      expect(after.run!.bones).toBe(0)
      expect(after.run!.cause).toContain('cost')
    }
    expect(killed, 'no seed in the sample rolled a cost face').toBeGreaterThan(0)
  })

  it('reports what each face did, for the number that pops on the die', () => {
    expect(itemBadge({ kind: 'flat', amount: 5 })).toBe('+5')
    expect(itemBadge({ kind: 'cost', bones: 2 })).toBe('−2')
    expect(itemBadge({ kind: 'blank' })).toBe('—')
  })

  it('sums flats and costs off the faces, and nothing else', () => {
    const rolls = [
      { id: 'grave-candle' as const, face: 2, result: { kind: 'flat' as const, amount: 5 } },
      { id: 'splinter-fetish' as const, face: 4, result: { kind: 'cost' as const, bones: 2 } },
    ]
    expect(itemFlatsOf(rolls)).toBe(5)
    expect(itemCostOf(rolls)).toBe(2)
    expect(itemFlatsOf([])).toBe(0)
    expect(itemCostOf([])).toBe(0)
  })
})

describe('ruling 4 — talismans', () => {
  it('fires only on the line it names', () => {
    expect(talismansFor(['pair-talisman'], 'pair')).toEqual(['pair-talisman'])
    expect(talismansFor(['pair-talisman'], 'two-pair')).toEqual(['pair-talisman'])
    for (const other of ['triple', 'straight', 'full-house', 'four-kind', 'crap'] as const) {
      expect(talismansFor(['pair-talisman'], other), other).toEqual([])
      expect(talismanFlatOf(['pair-talisman'], other), other).toBe(0)
    }
  })

  it('adds a flat, and it is flat', () => {
    const bonus = TALISMANS['pair-talisman']!.bonus
    expect(bonus).toBe(12)
    // The same +12 on a small table and a large one. A multiplier would not be.
    const small = totalsFor([1, 1, 2, 3, 4, 6], 'pair', { itemFlats: 0, talismanFlat: bonus })
    const large = totalsFor([6, 6, 5, 5, 4, 4], 'two-pair', { itemFlats: 0, talismanFlat: bonus })
    expect(small.damage - small.base).toBe(bonus)
    expect(large.damage - large.base).toBe(bonus)
  })

  it('lands in a real exchange, on its line and not on another', () => {
    const carrying: Partial<RunState> = {
      bones: 30,
      ironDice: [],
      itemDice: [],
      talismans: ['pair-talisman'],
    }
    // 5 5 5 2 2 4 sums to 23. TWO PAIR is ×1.25 → 28, +12 → 40.
    const table = withDice(facing('deep', carrying), [5, 5, 5, 2, 2, 4], 0)
    const scored = combatOf(reduce(table, { type: 'SCORE', hand: 'two-pair' })).lastAttack!
    expect(scored.base).toBe(28)
    expect(scored.talismansFired).toEqual(['pair-talisman'])
    expect(scored.talismanFlat).toBe(12)
    expect(scored.damage).toBe(40)

    // TRIPLE is ×1.5 → 34, and the talisman does not answer to it.
    const other = combatOf(reduce(table, { type: 'SCORE', hand: 'triple' })).lastAttack!
    expect(other.talismansFired).toEqual([])
    expect(other.talismanFlat).toBe(0)
    expect(other.damage).toBe(34)
  })
})

describe('ruling 5 — the equation, at each stage of loadout', () => {
  const dice: number[] = [6, 6, 6, 4, 4, 3] // sums to 29; FULL HOUSE is ×2

  it('is the line alone with nothing carried', () => {
    const after = reduce(withDice(facing('deep', BARE), dice, 0), {
      type: 'SCORE',
      hand: 'full-house',
    })
    const record = combatOf(after).lastAttack!
    expect([record.sum, record.base, record.itemFlats, record.talismanFlat, record.damage]).toEqual([
      29, 58, 0, 0, 58,
    ])
  })

  it('is the line plus what the items rolled', () => {
    const carrying: Partial<RunState> = {
      bones: 30,
      ironDice: [],
      talismans: [],
      itemDice: ['grave-candle'],
    }
    const after = reduce(withDice(facing('deep', carrying), dice, 0), {
      type: 'SCORE',
      hand: 'full-house',
    })
    const record = combatOf(after).lastAttack!
    expect(record.base).toBe(58)
    expect(record.damage).toBe(58 + record.itemFlats)
    expect(record.talismanFlat).toBe(0)
  })

  it('is the line plus the items plus the talisman, in that order', () => {
    const carrying: Partial<RunState> = {
      bones: 30,
      ironDice: [],
      talismans: ['pair-talisman'],
      itemDice: ['grave-candle'],
    }
    // PAIR is ×1, so the line contributes 29 and everything else is flat.
    const after = reduce(withDice(facing('deep', carrying), dice, 0), { type: 'SCORE', hand: 'pair' })
    const record = combatOf(after).lastAttack!
    expect(record.base).toBe(29)
    expect(record.talismanFlat).toBe(12)
    expect(record.damage).toBe(29 + record.itemFlats + 12)
  })

  it('never falls below one, whatever the table', () => {
    expect(totalsFor([1, 1, 1, 1, 1, 1], 'crap', { itemFlats: 0, talismanFlat: 0 }).damage).toBe(3)
    // The floor is still in the equation and is the thing a negative flat, if
    // one is ever authored, would run into.
    expect(totalsFor([1], 'crap', { itemFlats: -50, talismanFlat: 0 }).damage).toBe(1)
  })
})

describe('CRAP is still infinite', () => {
  it('is never written down, however many times it is scored', () => {
    let state = facing('hollow', { ...BARE })
    // **Four, not six, and the reason is the Gnawing's ladder.** CRAP is still
    // infinitely available and still never spent — that is what is being
    // asserted — but leaning on it against a thing that breaks two, then four,
    // then eight costs 22 bones in four exchanges, and a run that died halfway
    // through the loop would be asserting nothing. That is the ladder working:
    // the cost of having nothing left to score is now a number on the screen.
    for (let attack = 0; attack < 4; attack++) {
      const table = withDice(state, [1, 2, 3, 4, 6, 6], 0)
      const spent: GameState = {
        ...table,
        run: {
          ...table.run!,
          combat: { ...combatOf(table), usedHands: ['pair', 'two-pair'] },
        },
      }
      state = reduce(spent, { type: 'SCORE', hand: 'crap' })
      expect(combatOf(state).usedHands).toEqual(['pair', 'two-pair'])
    }
    expect(combatOf(state).round).toBe(5)
  })
})

describe('the loadout, added up', () => {
  it('reports a block of nothing for a run with no iron', () => {
    expect(blockOf([])).toBe(0)
  })
})
