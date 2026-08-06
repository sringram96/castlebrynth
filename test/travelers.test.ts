import { describe, expect, it } from 'vitest'

import {
  ALL_RIDERS,
  BARE_BODY,
  CATALOG,
  CATALOG_GOODS,
  HAND_SIZE,
  LADDER,
  LEAVES_A_GOOD,
  ORIGINS,
  PLAIN_BONE,
  PLAIN_POUCH,
  ROOM_BOOK,
  THE_CAREFUL,
  THE_ORPHAN,
  THE_PUSH,
  THE_PUSHER,
  THE_RUNNER,
  TRAVELER_DICE,
  VERBS,
  everyString,
  leftBy,
  lintVoice,
  originOf,
  saysDie,
  saysGood,
  takeActId,
} from '../src/content/index.js'
import { actsIn } from '../src/descent/index.js'
import { encounterOf } from '../src/gen/index.js'
import type { Die, Goods, Rider } from '../src/lots/index.js'
import { audit, claim, decide, ridersFired, woundedBy } from '../src/lots/index.js'
import { collect, firstPermanent, tookIntoRun, wake } from '../src/state/index.js'
import { everyDie, turnOf } from './helpers.js'

/**
 * The travelers (arts 86–87).
 *
 * Every die past the bare five belonged to somebody, a die's shape is how
 * its owner died, and an item's origin explains its rules in one sentence or
 * the item does not ship. The last of those is an acceptance test, so it is
 * written here as one.
 */

const GOODS: Goods = { talismans: [], riders: ALL_RIDERS }
const isDie = (good: { readonly id: string }): boolean => 'faces' in good

describe('art. 86 — the dice belonged to somebody', () => {
  it('ships three travelers, each leaving exactly one die', () => {
    const dead = LEAVES_A_GOOD.filter((who) => (who as string).startsWith('enc.traveler.'))
    expect(dead).toHaveLength(3)
    for (const who of dead) {
      const left = leftBy(who)
      expect(left, who as string).toHaveLength(1)
      expect(TRAVELER_DICE.map((die) => die.id)).toContain(left[0]!.id)
    }
  })

  it('registers each of them on both of art. 83’s axes, rare and unique per run', () => {
    for (const who of LEAVES_A_GOOD) {
      const one = encounterOf(CATALOG, who)
      expect(one, who as string).not.toBeNull()
      expect(one!.kind, who as string).toBe('boon')
      // A good is once per run: there is one of each of these in the world.
      expect(one!.scope, who as string).toBe('unique')
      expect(one!.binding, who as string).toBe('floating')
    }
  })

  /**
   * The distributions, read as deaths. Each of these is the sentence made
   * arithmetic — if one of them drifts, the origin stops being true and
   * art. 87 stops being satisfied.
   */
  it('shapes each die like the death it came from', () => {
    const values = (die: Die): readonly number[] => die.faces.map((face) => face.value)
    // The one who kept pushing: high, and one throw that did not pay.
    expect(values(THE_PUSHER)).toEqual([1, 5, 5, 6, 6, 6])
    // The one who was careful: no ceiling, no floor, and dead anyway. Card
    // 89 tightened it to the same twenty-one squeezed onto two faces, which
    // is a shape saying the same sentence louder.
    expect(values(THE_CAREFUL)).toEqual([3, 3, 3, 4, 4, 4])
    expect(values(THE_CAREFUL)).not.toContain(6)
    expect(values(THE_CAREFUL)).not.toContain(1)
    // The one who ran: strong, and it bites where it is strong. **One** of
    // the sixes bites (card 89) — two of them made the only two faces worth
    // reaching for both unreachable, which is not a decision.
    expect(values(THE_RUNNER)).toEqual([3, 4, 5, 5, 6, 6])
    const bites = THE_RUNNER.faces.filter((face) => face.rider !== undefined)
    expect(bites.map((face) => face.value)).toEqual([6])
  })

  it('keeps every face inside 1–6 whatever the body (art. 50)', () => {
    for (const good of CATALOG_GOODS) {
      if (!isDie(good)) continue
      const die = good as Die
      expect(die.faces, die.id as string).toHaveLength(die.body)
      for (const face of die.faces) {
        expect(face.value, die.id as string).toBeGreaterThanOrEqual(1)
        expect(face.value, die.id as string).toBeLessThanOrEqual(6)
      }
    }
  })
})

describe('art. 54 — every power pays, and the audit is what says so', () => {
  it('prices every good in the catalog against the plain bone', () => {
    for (const good of CATALOG_GOODS) {
      if (!isDie(good)) continue
      const report = audit(good as Die, PLAIN_BONE, ALL_RIDERS)
      // The one line of the audit that is a verdict: over budget only with a
      // cost face on the die's own faces.
      expect(report.paid, good.id as string).toBe(true)
      if (report.overBudget) expect(report.cost, good.id as string).toBeGreaterThan(0)
    }
  })

  it('fails a die that beats the plain bone for nothing — so the audit bites', () => {
    // art. 87 refuses the Orphan: over budget, no cost face, and nobody it
    // came off. It ships nowhere, and it is here to prove the check works.
    const orphan = audit(THE_ORPHAN, PLAIN_BONE, ALL_RIDERS)
    expect(orphan.overBudget).toBe(true)
    expect(orphan.cost).toBe(0)
    expect(orphan.paid).toBe(false)
    expect(CATALOG_GOODS.map((good) => good.id)).not.toContain(THE_ORPHAN.id)
  })

  it('charges a cost face only when its face is spent in a claim (art. 51)', () => {
    const dice = [THE_PUSHER, ...PLAIN_POUCH.dice.slice(0, 5)]
    // The 1 kept and unused: it fires nothing, because nothing was claimed
    // with it. Carrying the die is free.
    const idle = turnOf([1, 2, 3, 4, 5, 6], { dice })
    expect(woundedBy(ridersFired(idle.claims, ALL_RIDERS))).toBe(0)
    expect(decide(idle, 'end-turn', 0, GOODS).hurt).toBe(0)

    // The same 1, spent inside a run of 3: the price lands.
    const spent = claim(idle, everyDie(idle).slice(0, 3), 'run-3', LADDER, GOODS)
    const priced = decide(spent, 'end-turn', 0, GOODS)
    const push = ALL_RIDERS.find((rider: Rider) => rider.id === 'rider.push')!
    expect(push.onUse).toEqual({ kind: 'wound', amount: THE_PUSH.onUse.amount })
    expect(priced.hurt).toBe(THE_PUSH.onUse.amount)
  })

  it('does not let armor eat a cost face — it did not come from the horror (art. 47)', () => {
    const dice = [THE_PUSHER, ...PLAIN_POUCH.dice.slice(0, 5)]
    const turn = turnOf([1, 2, 3, 4, 5, 6], { dice })
    const spent = claim(turn, everyDie(turn).slice(0, 3), 'run-3', LADDER, GOODS)
    expect(decide(spent, 'end-turn', 99, GOODS).hurt).toBe(THE_PUSH.onUse.amount)
  })
})

describe('art. 87 — the item law is an acceptance test', () => {
  it('gives every shipped good one sentence of origin', () => {
    for (const good of CATALOG_GOODS) {
      const origin = originOf(good)
      expect(origin, good.id as string).not.toBe('')
      // One sentence, and one candle of it.
      expect(origin.split(/\s+/).length, good.id as string).toBeLessThanOrEqual(45)
    }
  })

  it('holds every origin to rules/voice.md, like any other prose', () => {
    // art. 87's sentences are prose in the repealed register still — card 28
    // rewrites them into his voice with the rest of the fight and Book
    // prose — so they answer to the rules that survived the mind wave.
    for (const [id, said] of Object.entries(ORIGINS)) {
      expect(lintVoice(said, 'placeholder'), id).toEqual([])
    }
    // And they are in the inventory the lint walks, so none can go unseen.
    const seen = everyString().map((one) => one.text)
    for (const said of Object.values(ORIGINS)) expect(seen).toContain(said)
  })

  it('writes no origin for a plain bone — nobody died for those', () => {
    for (const bone of PLAIN_POUCH.dice) expect(originOf(bone)).toBe('')
    expect(originOf(THE_ORPHAN)).toBe('')
  })

  it('says the numbers and the sentence in the same answer (arts 54, 68, 87)', () => {
    const said = saysDie(THE_PUSHER)
    // The declared distribution…
    expect(said).toContain('1 5 5 6 6 6')
    // …and where the distribution comes from.
    expect(said).toContain(ORIGINS['bone.pusher'])
  })

  it('answers the same way for a talisman or a wearable (art. 68)', () => {
    for (const good of CATALOG_GOODS) {
      if (isDie(good)) continue
      expect(saysGood(good), good.id as string).toContain(originOf(good))
    }
  })
})

describe('arts 56, 86 — the first die you collect is a dead traveler’s', () => {
  it('names no signature at a first waking, and six bones in the pouch', () => {
    const permanent = firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
    expect(permanent.signature).toBeNull()
    expect(permanent.pouch.dice).toHaveLength(HAND_SIZE)
  })

  it('makes the first traveler’s bone the signature, and only the first', () => {
    const bare = firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
    const first = collect(bare, THE_PUSHER)
    expect(first.signature).toBe(THE_PUSHER.id)
    expect(first.pouch.dice).toHaveLength(HAND_SIZE + 1)
    const second = collect(first, THE_RUNNER)
    expect(second.signature).toBe(THE_PUSHER.id)
    expect(second.pouch.dice).toHaveLength(HAND_SIZE + 2)
  })

  it('presses one authored plain verb to take a bone (arts 66, 68)', () => {
    for (const who of LEAVES_A_GOOD) {
      const id = takeActId(who)
      const said = VERBS[id]
      expect(said, id).toBeDefined()
      expect(said!.trim().split(/\s+/).length, id).toBeLessThanOrEqual(2)
      expect(said!, id).toMatch(/^[A-Z]/)
    }
  })

  /**
   * art. 55 as amended 2026-08-06: the hand is full at the waking, so a bone
   * taken mid-descent has nowhere to go but the pouch, and art. 60 settles
   * the rest at the next waking. The hand you went down with is the hand you
   * come back up with, which is what art. 75's replay rests on.
   *
   * The slot-filling clause of `tookIntoRun` is not dead — a mercy that grows
   * the hand past the pouch opens a slot mid-run, and it is what closes it —
   * it is simply no longer what a first waking is about.
   */
  it('leaves the hand alone when a bone is taken, and never overfills it', () => {
    const bare = wake(firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY), 1 as never)
    expect(bare.run!.hand.dice).toHaveLength(HAND_SIZE)

    const first = tookIntoRun(bare.run!, collect(bare.permanent, THE_PUSHER))
    expect(first.hand.dice).toHaveLength(HAND_SIZE)
    // The six you woke with keep their places, so a fight in flight can
    // still replay itself off the same identities (art. 75).
    expect(first.hand.dice).toEqual(bare.run!.hand.dice)

    // A second bone likewise: the pouch takes it, the hand does not.
    const full = collect(collect(bare.permanent, THE_PUSHER), THE_RUNNER)
    expect(full.pouch.dice).toHaveLength(HAND_SIZE + 2)
    expect(tookIntoRun(first, full).hand.dice).toHaveLength(HAND_SIZE)
  })

  /** …and the clause that is still load-bearing: a hand grown past its pouch. */
  it('fills a slot a mercy opened, the moment a bone is taken (arts 56, 60)', () => {
    const grown = { ...firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY), handSize: HAND_SIZE + 1 }
    const bare = wake(grown, 1 as never)
    expect(bare.run!.hand.dice).toHaveLength(HAND_SIZE)

    const first = tookIntoRun(bare.run!, collect(bare.permanent, THE_PUSHER))
    expect(first.hand.dice).toHaveLength(HAND_SIZE + 1)
    expect(first.hand.dice.at(-1)).toBe(THE_PUSHER)
    expect(first.hand.dice.slice(0, HAND_SIZE)).toEqual(bare.run!.hand.dice)
  })

  it('never lets a bone hold a door — a traveler is optional treasure (art. 4)', () => {
    const node = {
      instance: 'x#0' as never,
      room: 'room.trove.alcove' as never,
      type: 'trove' as const,
      step: 1,
      region: null,
      doors: [],
      fills: [{ socket: 'socket.floor' as never, encounter: 'enc.traveler.pusher' as never }],
      announces: null,
    }
    for (const one of actsIn(ROOM_BOOK, node)) expect(one.required, one.id).toBe(false)
  })
})
