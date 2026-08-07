import { describe, expect, it } from 'vitest'

import {
  BARE_BODY,
  HAND_SIZE,
  PLAIN_POUCH,
  THE_PUSHER,
  THE_RUNNER,
} from '../src/content/index.js'
import type { DieId } from '../src/lots/index.js'
import type { Vault } from '../src/state/index.js'
import {
  VAULT_KEY,
  chooseHand,
  collect,
  firstPermanent,
  handFrom,
  load,
  mustChoose,
} from '../src/state/index.js'
import {
  orbitPositions,
  selectionComplete,
  toggledSelection,
} from '../src/shell/screens/choosing.js'

const bare = () => firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
const ids = (dice: readonly { readonly id: string }[]): readonly string[] =>
  dice.map((die) => die.id as string)

function memoryVault(value: string): Vault {
  const held = new Map<string, string>([[VAULT_KEY, value]])
  return {
    read: (key) => held.get(key) ?? null,
    write: (key, next) => void held.set(key, next),
    forget: (key) => void held.delete(key),
  }
}

describe('the choosing gate', () => {
  it('does not ask anything of the starting six', () => {
    const permanent = bare()
    expect(permanent.pouch.dice).toHaveLength(6)
    expect(permanent.handSize).toBe(6)
    expect(mustChoose(permanent)).toBe(false)
  })

  it('opens only after the pouch actually contains a seventh die', () => {
    expect(mustChoose(collect(bare(), THE_PUSHER))).toBe(true)
  })

  it('repairs the old five-slot save that made six starting bones look like a choice', () => {
    const legacy = { ...bare(), handSize: 5 }
    const written = JSON.stringify({ version: 12, ledgers: { run: null, permanent: legacy } })
    const restored = load(memoryVault(written))
    expect(restored).not.toBeNull()
    expect(restored!.permanent.handSize).toBe(6)
    expect(mustChoose(restored!.permanent)).toBe(false)
  })
})

describe('the choosing selection', () => {
  it('toggles by identity and never silently replaces a selected die', () => {
    const seven = collect(bare(), THE_PUSHER)
    let selected: readonly DieId[] = []
    for (const die of seven.pouch.dice.slice(0, HAND_SIZE)) {
      selected = toggledSelection(selected, die.id, HAND_SIZE)
    }
    expect(selectionComplete(selected, HAND_SIZE)).toBe(true)

    const full = selected
    selected = toggledSelection(selected, THE_PUSHER.id, HAND_SIZE)
    expect(selected).toEqual(full)

    const removed = full[2]!
    selected = toggledSelection(selected, removed, HAND_SIZE)
    expect(selected).toHaveLength(HAND_SIZE - 1)
    expect(selected).not.toContain(removed)

    selected = toggledSelection(selected, THE_PUSHER.id, HAND_SIZE)
    expect(selectionComplete(selected, HAND_SIZE)).toBe(true)
    expect(selected).toContain(THE_PUSHER.id)
  })

  it('commits exactly the six selected identities and destroys nothing', () => {
    const permanent = collect(collect(bare(), THE_PUSHER), THE_RUNNER)
    const selected = [
      THE_PUSHER.id,
      THE_RUNNER.id,
      ...permanent.pouch.dice.slice(0, 4).map((die) => die.id),
    ] as readonly DieId[]

    expect(selectionComplete(selected, permanent.handSize)).toBe(true)
    const chosen = chooseHand(permanent, selected)
    expect(ids(handFrom(chosen))).toEqual(selected)
    expect(chosen.pouch.dice).toHaveLength(HAND_SIZE + 2)
    expect(new Set(ids(chosen.pouch.dice))).toEqual(new Set(ids(permanent.pouch.dice)))
  })
})

describe('the choosing table', () => {
  for (const count of [1, 7, 8, 12, 13, 18, 24]) {
    it(`gives ${count} owned dice deterministic visible positions`, () => {
      const first = orbitPositions(count)
      const second = orbitPositions(count)
      expect(first).toEqual(second)
      expect(first).toHaveLength(count)
      for (const point of first) {
        expect(point.x).toBeGreaterThan(0.05)
        expect(point.x).toBeLessThan(0.95)
        expect(point.y).toBeGreaterThan(0.10)
        expect(point.y).toBeLessThan(0.84)
      }
      const distinct = new Set(first.map((point) => `${point.x.toFixed(4)}:${point.y.toFixed(4)}`))
      expect(distinct.size).toBe(count)
    })
  }
})
