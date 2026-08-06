/**
 * card 86 — **the price of an act** (art. 120), and card 87 — **the refused
 * ledger** (art. 84 as extended).
 *
 * No article anywhere gave an act a price: art. 5 says tapping never harms,
 * art. 7 gates outcomes, and GAME.md's promise of acts *"with gates and
 * consequences"* was never ratified. So curiosity was not dangerous; it was
 * merely slow. Art. 120 is the Descent's art. 42 — the Lots promise the
 * intent before you commit, and this promises the cost — and the whole of it
 * is testable, because every clause is a fact about the catalog or about a
 * walk.
 *
 * The return bar is the strict one and it is asked of every priced act in
 * the catalog rather than of the three that ship: *lose four health and
 * receive ordinary loot* does not ship, and the test is what says so.
 */

import { describe, expect, it } from 'vitest'

import {
  CATALOG,
  CLUES,
  ECHOES,
  EVERY_REFUSAL,
  ENCOUNTERS,
  KNOWS,
  LOOKS,
  REFUSALS,
  ROOMS,
  ROOM_BOOK,
  VERBS,
  encounterWords,
  marked,
} from '../src/content/index.js'
import type { Act, Payload } from '../src/descent/index.js'
import {
  act,
  actsIn,
  chooseDoor,
  enterRoom,
  look,
  offering,
  priceAt,
  priceOf,
  refusalsIn,
  withholding,
} from '../src/descent/index.js'
import type { Chain, ChainNode } from '../src/gen/index.js'
import { hereIn } from '../src/gen/index.js'
import type { WorldMark } from '../src/room/index.js'
import type { Ledgers } from '../src/state/index.js'
import {
  MIGRATIONS,
  VAULT_VERSION,
  browserVault,
  die,
  hasDeclined,
  knownMarks,
  load,
  save,
  wake,
} from '../src/state/index.js'
import { DEALER, coinFlip, lookAround, opened, runOf, takeable, walkTo } from './drift.js'

const NOWHERE: WorldMark = { X: 0, Y: 0, z: 1, width: 1, height: 1 }

/** Every act the catalog can ever put on a strip, authored or socketed. */
function everyAct(): readonly Act[] {
  const seen = new Map<string, Act>()
  for (const room of ROOMS) for (const one of room.acts) seen.set(one.id, one)
  for (const who of ENCOUNTERS) {
    for (const one of encounterWords(who.id, NOWHERE).acts) seen.set(one.id, one)
  }
  return [...seen.values()]
}

const priced = (): readonly Act[] => everyAct().filter((one) => one.price !== undefined)

const BAR: readonly Payload[] = ['knowledge', 'leverage', 'relationship', 'change', 'object']

describe('art. 120 — an act may carry a declared price', () => {
  it('ships the three verbs GAME.md named, and each is summoned by looking', () => {
    const ids = priced().map((one) => one.id)
    expect(ids).toContain('act.peer')
    expect(ids).toContain('act.listen')
    expect(ids).toContain('act.reach')
    for (const one of priced()) {
      // art. 68: an act about a thing does not exist until the thing has been
      // tapped — and a priced act must be one, because the tap is where the
      // price is said and a priced act about nothing could not say it.
      expect(one.about, one.id).toBeDefined()
      // art. 66: a control is a plain imperative, two words or fewer.
      expect(VERBS[one.id], one.id).toBeDefined()
      expect(VERBS[one.id]!.split(/\s+/).length, one.id).toBeLessThanOrEqual(2)
    }
  })

  it('declares a price that costs something (art. 120)', () => {
    for (const one of priced()) {
      expect(one.price!.health, one.id).toBeGreaterThan(0)
    }
  })

  /**
   * **The return bar, and it is strict.** Every priced act returns at least
   * one of knowledge, leverage, a relationship, a permanent change or an
   * exceptional object — and it is not enough to *claim* one: a `knowledge`
   * claim with no clue behind it is a failing test rather than a
   * disappointment.
   */
  it('returns a payload from the bar, and actually pays it', () => {
    for (const one of priced()) {
      expect(one.pays ?? [], one.id).not.toHaveLength(0)
      for (const paid of one.pays!) expect(BAR, one.id).toContain(paid)
      if (one.pays!.includes('knowledge')) {
        expect((one.learns ?? []).length, `${one.id} claims knowledge`).toBeGreaterThan(0)
      }
      if (one.pays!.includes('object')) {
        expect((one.takes ?? []).length, `${one.id} claims an object`).toBeGreaterThan(0)
      }
      if (one.pays!.includes('change')) {
        expect(one.heals, `${one.id} claims a permanent change`).toBeDefined()
      }
      if (one.pays!.includes('relationship')) {
        expect(one.remembers, `${one.id} claims a relationship`).toBeDefined()
      }
    }
  })

  /**
   * art. 88's knowledge goods are the cheapest legal payload and should be
   * the most common one — an act that sharpens a question is worth more than
   * one that answers it. Asked of the priced acts as a whole rather than of
   * each, because that is the shape of the claim.
   */
  it('pays in knowledge more often than in anything else', () => {
    const paid = priced().flatMap((one) => one.pays ?? [])
    const knowledge = paid.filter((one) => one === 'knowledge').length
    expect(knowledge * 2, 'knowledge should be the common payload').toBeGreaterThan(paid.length)
  })

  /**
   * **Every clue a priced act pays out changes what two or three later taps
   * answer** (art. 88). A clue that changed nothing would be a stat block
   * with no stat in it, and the article's whole argument for the payload is
   * that it earns its place by changing an answer.
   */
  it('makes every clue change what at least two later taps answer (art. 88)', () => {
    for (const clue of Object.values(CLUES)) {
      const lands = Object.entries(KNOWS).filter(([, marks]) =>
        marks.includes(clue.id as string),
      )
      const known = lands.filter(([target]) => LOOKS[`${target}.knows`] !== undefined)
      // A priced thing's own answer moves to `.kept` once the act is
      // withheld (art. 118), so its second answer is authored there instead.
      const kept = lands.filter(([target]) => LOOKS[`${target}.kept`] !== undefined)
      expect(known.length + kept.length, clue.id as string).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('art. 120 — and the price is visible before the press', () => {
  /**
   * **The look is where the price is said**, because art. 68 abolished the
   * inspect button and art. 66 gives the verb two words. The tap that
   * summons the verb is the tap that quotes the number, so there is no order
   * of presses in which the verb arrives first.
   */
  it('authors a priced answer for every thing a priced act is about', () => {
    for (const one of priced()) {
      const said = LOOKS[`${one.about!}.price`]
      expect(said, `${one.about!} does not say what ${one.id} costs`).toBeDefined()
      // And it says the number rather than gesturing at one.
      expect(said!, one.about!).toContain('{n}')
    }
  })

  it('quotes the number the press will actually charge, in the room', () => {
    const at = pricedRoom()
    expect(at, 'no seed walked into a priced room').not.toBeNull()
    const { ledgers, chain, node } = at!
    const one = actsIn(ROOM_BOOK, node).find((held) => held.price !== undefined)!
    const price = priceAt(ledgers, ROOM_BOOK, node, one.about!)
    expect(price).toBe(one.price!.health)

    const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    const target = bands.tappables.find((held) => held.id === one.about)!
    const said = look(
      ROOM_BOOK,
      bands,
      target,
      ledgers.run!.carried,
      withholding(ledgers, ROOM_BOOK, node, target.id),
      price,
      knownMarks(ledgers.permanent),
    ).text
    // The number is in the sentence, and the token is not.
    expect(said).toContain(String(price))
    expect(said).not.toContain('{n}')

    // And pressing it charges exactly that.
    const before = ledgers.run!.health
    const after = act(ledgers, one, actsIn(ROOM_BOOK, node))
    expect(after.run!.health).toBe(before - price)
  })

  /**
   * **A price is never the run.** A press made out of curiosity may cost a
   * player something and may not cost them everything: a run ends to a
   * horror, to the Warden or to a door, and never to a question.
   */
  it('never takes the last of the body, however small the body is', () => {
    const { ledgers, chain } = opened(4)
    const one = priced().reduce((most, held) =>
      held.price!.health > most.price!.health ? held : most,
    )
    for (const health of [1, 2, 3]) {
      const hurt: Ledgers = { ...ledgers, run: { ...ledgers.run!, health } }
      expect(priceOf(hurt, one), `at ${health}`).toBeLessThanOrEqual(health - 1)
      const paid = act(hurt, one)
      expect(paid.run!.health, `at ${health}`).toBeGreaterThan(0)
    }
    expect(chain.nodes.length).toBeGreaterThan(0)
  })
})

describe('art. 3 — nothing required sits behind a priced act', () => {
  it('declares no priced act required, and gives no priced act an item', () => {
    for (const one of priced()) {
      expect(one.required, one.id).toBe(false)
      // `gives` is the run's pocket and is what a lock demands (art. 80).
      expect(one.gives, one.id).toEqual([])
      expect(one.unlocks, one.id).toBeUndefined()
    }
  })

  /**
   * **Walk every seed and prove it.** The claim art. 3 makes is about runs
   * and not about fields: a run must never be forced through a room whose
   * only way on is behind a press it declined to make.
   *
   * So every room of every one of two hundred runs is asked whether what
   * holds its doors is priced. `heldBack` is the only thing in the game that
   * holds a door for something in the room, and it reads `required` — which
   * the field test above already pins to false for a priced act. This is the
   * same claim asked of the arrangement, where a future content mistake
   * would actually strand somebody.
   */
  it('never holds a door for a priced act, over two hundred runs', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const chain = runOf(seed, coinFlip(seed))
      for (const node of chain.nodes) {
        for (const one of actsIn(ROOM_BOOK, node)) {
          if (one.price === undefined) continue
          expect(one.required, `seed ${seed}: ${node.room as string} / ${one.id}`).toBe(false)
        }
      }
    }
  })

  /**
   * And the depth's locks are satisfied by encounters the dealer places
   * (art. 80), never by anything a price stands in front of — asked of the
   * catalog, so a future lock cannot quietly be put behind a question.
   */
  it('grants nothing a lock demands from behind a price (art. 80)', () => {
    const demanded = new Set(
      CATALOG.depths.flatMap((plan) =>
        plan.locks.flatMap((lock) => lock.demands.map((key) => key as string)),
      ),
    )
    expect(demanded.size).toBeGreaterThan(0)
    for (const one of priced()) {
      for (const item of one.gives) expect(demanded.has(item as string), one.id).toBe(false)
    }
  })
})

describe('art. 118 — and a priced act whose payload is spent is absent', () => {
  /**
   * Card 70's rule composes with art. 120, and the descent wave found the
   * case that makes it bite: `collect` and `learn` are both idempotent by
   * id, so a second press spends a deed, charges a price and changes
   * nothing — which is the dead press art. 118 exists to end.
   */
  it('stops offering a priced act once its knowledge is on the ledger', () => {
    const found = pricedRoom()
    expect(found, 'no seed walked into a priced room').not.toBeNull()
    const { chain, node } = found!
    let { ledgers } = found!
    const one = actsIn(ROOM_BOOK, node).find((held) => held.price !== undefined)!
    expect(offering(ledgers, ROOM_BOOK, node).map((held) => held.id)).toContain(one.id)

    // Knowing it already — as a second run would, because knowledge survives
    // death (arts 10–11) — takes the verb off the strip entirely.
    const known: Ledgers = {
      ...ledgers,
      permanent: { ...ledgers.permanent, known: [...one.learns!] },
    }
    expect(offering(known, ROOM_BOOK, node).map((held) => held.id)).not.toContain(one.id)
    // art. 118's second clause: and the thing's look says why.
    expect(withholding(known, ROOM_BOOK, node, one.about!)).toBe(true)
    expect(LOOKS[`${one.about!}.kept`], one.about!).toBeDefined()
    ledgers = known
    expect(chain.nodes.length).toBeGreaterThan(0)
  })
})

describe('art. 5 — a look never costs', () => {
  /**
   * **art. 5 under test for the first time.** The world never punishes
   * touch; it sometimes stops offering. Every tappable of every room of a
   * whole depth is looked at, twice, and nothing about the run moves.
   *
   * The one thing that does move is `looked`, and that is art. 68 rather
   * than a cost: the summons is *knowledge*, it is what makes the verb
   * exist, and a game that forgot it would be a game where looking achieved
   * nothing. Everything a player could lose — health, what is carried, what
   * has been done, what has been opened, and the whole permanent ledger —
   * is asserted untouched.
   */
  it('leaves everything but the summons untouched, over a whole depth', () => {
    for (let seed = 1; seed <= 40; seed++) {
      let { ledgers, chain } = opened(seed)
      for (let room = 0; room < chain.length; room++) {
        const node = hereIn(chain)
        if (node === null) break
        const before = ledgers
        const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
        // Twice: a second look at the same thing must be as free as the first.
        for (let pass = 0; pass < 2; pass++) {
          for (const target of bands.tappables) {
            const said = look(
              ROOM_BOOK,
              bands,
              target,
              ledgers.run!.carried,
              withholding(ledgers, ROOM_BOOK, node, target.id),
              priceAt(ledgers, ROOM_BOOK, node, target.id),
              knownMarks(ledgers.permanent),
            ).text
            // art. 69: and it answered, which is the other half of free.
            expect(said.length, `seed ${seed}: ${target.id}`).toBeGreaterThan(0)
          }
        }
        const run = ledgers.run!
        expect(run.health, `seed ${seed} health`).toBe(before.run!.health)
        expect(run.carried, `seed ${seed} carried`).toEqual(before.run!.carried)
        expect(run.did, `seed ${seed} did`).toEqual(before.run!.did)
        expect(run.opened, `seed ${seed} opened`).toEqual(before.run!.opened)
        expect(ledgers.permanent, `seed ${seed} permanent`).toBe(before.permanent)

        // Move on, taking nothing, so the next room is looked at cold.
        const door = node.doors[0]
        if (door === undefined || door.ends === true) break
        ledgers = lookAround(ledgers, node)
        for (const one of takeable(ledgers, node).filter((held) => held.required)) {
          ledgers = act(ledgers, one, actsIn(ROOM_BOOK, node))
        }
        const walked = chooseDoor(ledgers, chain, ROOM_BOOK, door, DEALER)
        ledgers = walked.ledgers
        chain = walked.chain
      }
    }
  })
})

describe('art. 84 — and some of what you refuse is remembered', () => {
  it('caps the vocabulary at a set a person could hold in their head', () => {
    expect(EVERY_REFUSAL.length).toBeGreaterThanOrEqual(8)
    expect(EVERY_REFUSAL.length).toBeLessThanOrEqual(12)
    expect(new Set(EVERY_REFUSAL).size).toBe(EVERY_REFUSAL.length)
  })

  /**
   * **Each flag lands in two or three later moments.** That is the whole
   * design: a small reusable set, never hundreds of one-off branches
   * authored for a line each — which is the failure mode card 87 exists to
   * avoid.
   */
  it('lands every flag in two or three later moments, and no more', () => {
    for (const flag of EVERY_REFUSAL) {
      const lands = Object.entries(ECHOES)
        .filter(([, marks]) => marks.includes(flag))
        .filter(
          ([target]) =>
            LOOKS[`${target}.again`] !== undefined ||
            // arts 87, 88: a mark may land on a good's origin sentence rather
            // than on a look, and that is the same moment reached a second way.
            target.endsWith('.origin'),
        )
        .map(([target]) => moment(target))
      const moments = new Set(lands)
      expect(moments.size, `${flag} lands nowhere`).toBeGreaterThanOrEqual(1)
      expect(moments.size, `${flag} lands in too many moments`).toBeLessThanOrEqual(3)
    }
  })

  it('shares one flag across the acts that mean the same refusal', () => {
    const byFlag = new Map<string, string[]>()
    for (const one of everyAct()) {
      if (one.refused === undefined) continue
      byFlag.set(one.refused, [...(byFlag.get(one.refused) ?? []), one.id])
    }
    // The travelers are the case the whole cap rests on: three bodies, one
    // flag, because walking past a body is the same thing whichever it is.
    expect(byFlag.get(REFUSALS.bone)?.length).toBeGreaterThanOrEqual(3)
    expect(byFlag.get(REFUSALS.pair)?.length).toBe(2)
  })

  /**
   * **Walking out is the moment a refusal becomes one.** Forward is forever
   * (art. 9), so the door closing behind you is exactly what makes leaving a
   * decision rather than a delay.
   */
  it('writes a flag when a run walks out of a room leaving something', () => {
    // A good on the floor, because that is a thing a run can always take —
    // a mercy at full health is not offered at all (art. 118) and so cannot
    // be refused, which is what the filter in `refusalsIn` is for.
    const found = firstRoomWhere((node) =>
      actsIn(ROOM_BOOK, node).some(
        (one) => one.refused !== undefined && (one.takes ?? []).length > 0,
      ),
    )
    expect(found, 'no seed walked into a room with anything to refuse').not.toBeNull()
    const { ledgers, chain, node } = found!
    const owed = refusalsIn(ledgers, ROOM_BOOK, node)
    expect(owed.length).toBeGreaterThan(0)
    const door = node.doors.find((one) => one.ends !== true)!
    const walked = chooseDoor(ledgers, chain, ROOM_BOOK, door, DEALER)
    for (const flag of owed) {
      expect(hasDeclined(walked.ledgers.permanent, flag), flag).toBe(true)
    }
    // And leaving this room wrote *only* what this room was owed — earlier
    // rooms on the walk have their own flags and they are not this test's.
    const before = new Set(ledgers.permanent.declined)
    const added = walked.ledgers.permanent.declined.filter((flag) => !before.has(flag))
    expect(added.every((flag) => owed.includes(flag))).toBe(true)
  })

  it('writes nothing when the run took everything the room offered', () => {
    // A fork is excluded, and by its own article: taking one half forfeits
    // the other, so a fork *always* writes one refusal and cannot be a room
    // where everything was taken (art. 89, and the test at the foot of this
    // file).
    const found = firstRoomWhere(
      (node) =>
        actsIn(ROOM_BOOK, node).some(
          (one) =>
            one.refused !== undefined &&
            one.forfeits === undefined &&
            (one.takes ?? []).length > 0,
        ) && actsIn(ROOM_BOOK, node).every((one) => one.forfeits === undefined),
    )
    expect(found).not.toBeNull()
    let { ledgers } = found!
    const { chain, node } = found!
    for (const one of actsIn(ROOM_BOOK, node)) {
      if (one.refused === undefined) continue
      ledgers = act(ledgers, one, actsIn(ROOM_BOOK, node))
    }
    const door = node.doors.find((one) => one.ends !== true)!
    const before = ledgers.permanent.declined.length
    const walked = chooseDoor(ledgers, chain, ROOM_BOOK, door, DEALER)
    expect(walked.ledgers.permanent.declined.length).toBe(before)
  })

  /**
   * art. 11: the run burns and the permanent survives, so a refusal is not
   * amnestied by a death — and art. 36 says boot restores exactly, so it is
   * not amnestied by a reload either.
   */
  it('survives a death and a reload', () => {
    const { ledgers } = opened(6)
    const marked: Ledgers = {
      ...ledgers,
      permanent: { ...ledgers.permanent, declined: [REFUSALS.bone, REFUSALS.pair] },
    }
    const dead = die(marked, 'end.gnawing')
    expect(hasDeclined(dead, REFUSALS.bone)).toBe(true)
    expect(hasDeclined(dead, REFUSALS.pair)).toBe(true)

    const woken = wake(dead, ledgers.run!.seed)
    expect(woken.permanent.declined).toEqual([REFUSALS.bone, REFUSALS.pair])

    const vault = browserVault(fakeStorage())
    save(woken, vault)
    expect(load(vault)!.permanent.declined).toEqual([REFUSALS.bone, REFUSALS.pair])
  })

  it('fills the field for a vault written before this wave, losing no descent', () => {
    expect(VAULT_VERSION).toBe(11)
    const rung = MIGRATIONS.find((one) => one.from === 10)!
    const before = {
      version: 10,
      ledgers: { run: { at: { beat: 3 } }, permanent: { met: ['enc.gnawing'] } },
    }
    const after = rung.up(before as never) as {
      ledgers: { run: unknown; permanent: { declined: unknown[] } }
    }
    expect(after.ledgers.permanent.declined).toEqual([])
    // Nothing about the arrangement moves: the run is where it was.
    expect(after.ledgers.run).toEqual({ at: { beat: 3 } })
  })
})

describe('art. 89 — the fork writes exactly one refusal', () => {
  /**
   * A fork is two goods where taking one forfeits the other, and art. 89
   * already produces a refusal every time one is resolved. It must write
   * **one** — the half that was left — and never both, because the half you
   * took is not a thing you turned down.
   */
  it('writes the flag of the half left behind, and only that', () => {
    const at = coveredFont()
    expect(at, 'no seed dealt the covered font').not.toBeNull()
    const { chain, node } = at!
    let { ledgers } = at!
    const among = actsIn(ROOM_BOOK, node)
    const stone = among.find((one) => one.id === 'act.font.stone')!
    const lip = among.find((one) => one.id === 'act.font.marks')!
    expect(stone.forfeits).toContain(lip.id)
    expect(lip.forfeits).toContain(stone.id)

    ledgers = act(ledgers, stone, among)
    // The take landed…
    expect(ledgers.permanent.keepsakes.map((one) => one.id)).toContain('talisman.ossuary')
    // …and exactly one refusal is written, in the same breath.
    expect(ledgers.permanent.declined).toEqual([REFUSALS.cloth])
    // …and the forfeited half is no longer on the strip (arts 70, 118).
    expect(offering(ledgers, ROOM_BOOK, node).map((one) => one.id)).not.toContain(lip.id)
    // …and it shows in pixels rather than only in prose (art. 70).
    const shut = ROOMS.find((one) => (one.id as string) === 'room.trove.covered-font')!
    const before = shut.scene(sceneOf(node, [])).props
    const after = shut.scene(sceneOf(node, [stone.id])).props
    expect(after).not.toBe(before)
    expect(chain.nodes.length).toBeGreaterThan(0)
  })

  it("lands the fork's refusal where a later tap can find it (art. 84)", () => {
    const remembered = [REFUSALS.cloth]
    expect(marked(ECHOES, 'font.basin', remembered)).toBe(true)
    expect(LOOKS['font.basin.again']).toBeDefined()
    expect(LOOKS['font.basin.again']).not.toBe(LOOKS['font.basin'])
  })
})

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Which *moment* a look target is, for the cap above.
 *
 * The three travelers are three ids for one moment — a body on a floor, and
 * a run is dealt at most one of them — and the three bones they leave are
 * one moment likewise, reached through art. 87's origin sentence rather than
 * through a look. Counting ids instead of moments would make the design look
 * like seven branches when it is three, which is exactly the impression the
 * cap exists to keep honest.
 */
function moment(target: string): string {
  return target
    .replace(/^traveler\.[a-z]+\.thing$/, 'a body on a floor')
    .replace(/^bone\.(pusher|careful|runner)\.origin$/, 'a bone in the hand')
    .replace(/^sister\.(elder|younger)\.thing$/, 'half of a pair')
}

/** The first run at or after seed 1 that walks into a room with a price in it. */
function pricedRoom(): { ledgers: Ledgers; chain: Chain; node: ChainNode } | null {
  return firstRoomWhere((node) => actsIn(ROOM_BOOK, node).some((one) => one.price !== undefined))
}

/** A seed sweep, because which rooms a run meets is the drift's business. */
function firstRoomWhere(
  wanted: (node: ChainNode) => boolean,
): { ledgers: Ledgers; chain: Chain; node: ChainNode } | null {
  for (let seed = 1; seed < 400; seed++) {
    const at = walkTo(seed, wanted)
    if (at !== null) return at
  }
  return null
}

function sceneOf(node: ChainNode, done: readonly string[]) {
  return {
    room: node.room,
    instance: node.instance,
    done,
    opened: [],
    doors: node.doors.map((door) => ({
      at: door.at,
      open: false,
      locked: false,
      turned: false,
      ends: door.ends === true,
    })),
    horror: null,
    fills: node.fills,
  }
}

/** The first seed at or after `from` whose run walks into the covered font. */
function coveredFont(): { ledgers: Ledgers; chain: Chain; node: ChainNode } | null {
  return firstRoomWhere((node) => (node.room as string) === 'room.trove.covered-font')
}

/** A localStorage stand-in, so the vault can be written and read back. */
function fakeStorage(): Storage {
  const held = new Map<string, string>()
  return {
    get length() {
      return held.size
    },
    clear: () => held.clear(),
    getItem: (key: string) => held.get(key) ?? null,
    key: (n: number) => [...held.keys()][n] ?? null,
    removeItem: (key: string) => void held.delete(key),
    setItem: (key: string, value: string) => void held.set(key, value),
  } as Storage
}
