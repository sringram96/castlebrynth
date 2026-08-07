import { describe, expect, it } from 'vitest'

import {
  BARE_BODY,
  CATALOG,
  END_LINES,
  GNAWING_ESCALATION,
  GNAWING_HEALTH,
  HORRORS,
  LOOKS,
  NOTICES,
  ROOM_BOOK,
  HAND_SIZE,
  PLAIN_POUCH,
  THE_CAREFUL,
  THE_GNAWING,
  THE_KINDLED,
  THE_MARROW,
  THE_PUSHER,
  THE_RUNNER,
  THE_SILT_MOTHER,
  THE_WARDEN,
  RUSTED_PLATE,
  VERBS,
  WARDEN,
  WARDEN_DOWN,
  WARDEN_ESCALATION,
  WARDEN_HEALTH,
  WARDEN_KEEPER,
  WARDEN_KEY_ITEM,
  WARDEN_SCRIPT,
  advanceBodyOf,
  encounterOfHorror,
  endLineOf,
  horrorById,
  horrorIn,
  horrorOf,
  horrorMarkIn,
  horrorStanding,
  keeperAwake,
  keeperStanding,
  lintVoice,
} from '../src/content/index.js'
import type { Horror } from '../src/lots/index.js'
import {
  advanceFight,
  cast,
  decide,
  withTurn,
} from '../src/lots/index.js'
import {
  advance,
  carryOut,
  openFightDoor,
  pausedAt,
  routeDeath,
  routeFlight,
  saveFight,
  turnLots,
} from '../src/hinge/index.js'
import { didHere, finish, hasMet, meet } from '../src/state/index.js'
import { claimGreedily, keepSensibly, winRateOf } from './policy.js'
import { playDepth } from './depth.js'
import { assembleHand } from '../src/lots/index.js'
import { recast } from '../src/lots/index.js'
import type { Act, Bands } from '../src/descent/index.js'
import {
  actsIn,
  afforded,
  canOpen,
  chooseDoor,
  enterRoom,
  look,
  lockActFor,
  mayLeave,
  opens,
  looking,
  sceneKey,
  sceneStateOf,
  stranded,
  summoned,
  tappablesIn,
  turnedHere,
} from '../src/descent/index.js'
import { act } from '../src/descent/index.js'
import type { Chain, ChainNode } from '../src/gen/index.js'
import { hereIn } from '../src/gen/index.js'
import type { Ledgers } from '../src/state/index.js'
import { movedTo } from '../src/state/index.js'
import { DEALER, alwaysLeft, coinFlip, lookAround, opened, runOf, takeable } from './drift.js'
import { fightSummoned, wayOn } from '../src/shell/strip.js'
import { walkDepth } from './screen.js'

/**
 * **The key is turned** (card 67, arts 68, 70, 82, 97).
 *
 * The defect: the iron key opened the Warden's door by sitting in the
 * inventory. art. 80 constructs the whole depth around placing that key, and
 * the payoff was a passive check — looking is free and commitment is drama,
 * and a lock that opens itself is neither.
 *
 * What this file holds is the ceremony, in the order a thumb meets it: the
 * lock answers either way; only carrying does it summon a verb; the press
 * writes a deed; the deed is what the door reads. And the control the card
 * asked for: with the gate taken away nothing is stranded, so the gate is
 * doing the work rather than describing what would happen anyway.
 */

/** A run walked all the way down to the hall, by whatever road works. */
function atTheDoor(
  seed = 1,
  carrying: Parameters<typeof opened>[1] = {},
): { ledgers: Ledgers; chain: Chain; node: ChainNode } {
  let { ledgers, chain } = opened(seed, carrying)
  for (;;) {
    const node = hereIn(chain)
    if (node === null) throw new Error(`seed ${seed} dealt no room`)
    // art. 68: a thumb looks at everything, here as everywhere. It stops
    // short of *pressing* in the hall — the press is what these tests are
    // about, so the walk delivers a run standing in front of an untouched
    // lock with the key on it.
    ledgers = lookAround(ledgers, node)
    if (node.room === WARDEN) return { ledgers, chain, node }
    for (const one of takeable(ledgers, node)) ledgers = act(ledgers, one)
    const door = node.doors[0]
    if (door === undefined || door.ends === true) throw new Error(`seed ${seed} never arrived`)
    const walked = chooseDoor(ledgers, chain, ROOM_BOOK, door, DEALER)
    ledgers = walked.ledgers
    chain = walked.chain
  }
}

/** The same, with the run *standing* in the hall, as the shell stands in one. */
function inTheHall(
  seed = 1,
  carrying: Parameters<typeof opened>[1] = {},
): { ledgers: Ledgers; chain: Chain; node: ChainNode } {
  const found = atTheDoor(seed, carrying)
  return {
    ...found,
    ledgers: {
      ...found.ledgers,
      run: movedTo(found.ledgers.run!, {
        room: found.node.room,
        instance: found.node.instance,
        step: found.node.step,
        beat: 0,
      }),
    },
  }
}

/** The run with everything looked at *except* the lock, and nothing turned. */
function unlooked(ledgers: Ledgers, node: ChainNode): Ledgers {
  return {
    ...ledgers,
    run: {
      ...ledgers.run!,
      looked: ledgers.run!.looked.filter((key) => !key.endsWith('|warden.lock')),
      did: ledgers.run!.did.filter((key) => !key.endsWith('|act.unlock')),
    },
  }
}

const verbsOn = (bands: Bands): readonly string[] =>
  bands.tray.flatMap((offer) => (offer.kind === 'act' ? [offer.act.verb] : []))

const unlockOf = (node: ChainNode): Act =>
  actsIn(ROOM_BOOK, node).find((one) => one.id === 'act.unlock')!

describe('card 67 — the lock answers before anything is offered (arts 68–69)', () => {
  it('names what it wants when nothing on you fits', () => {
    const { ledgers, chain, node } = inTheHall()
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    const lock = bands.tappables.find((one) => one.id === 'warden.lock')!
    // art. 69: looking is free and always answers, carrying or not.
    expect(look(ROOM_BOOK, bands, lock, []).text).toBe(LOOKS['warden.lock'])
    expect(look(ROOM_BOOK, bands, lock, []).text.length).toBeGreaterThan(0)
  })

  it('names what fits when the key is on you, and it is a different sentence', () => {
    const { ledgers, chain, node } = inTheHall()
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    const lock = bands.tappables.find((one) => one.id === 'warden.lock')!
    const answer = look(ROOM_BOOK, bands, lock, [WARDEN_KEY_ITEM]).text
    expect(answer).toBe(LOOKS['warden.lock.fits'])
    expect(answer).not.toBe(LOOKS['warden.lock'])
  })

  it('leaves every other answer alone, whatever is in the pocket', () => {
    const { ledgers, chain, node } = inTheHall()
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    for (const target of bands.tappables) {
      if (target.id === 'warden.lock') continue
      expect(look(ROOM_BOOK, bands, target, [WARDEN_KEY_ITEM]).text, target.id).toBe(
        look(ROOM_BOOK, bands, target, []).text,
      )
    }
  })
})

describe('card 67 — Unlock is summoned, and only then (art. 68)', () => {
  it('is not on the strip before the lock has been looked at', () => {
    const { ledgers, chain, node } = inTheHall()
    const blind = unlooked(ledgers, node)
    expect(canOpen(blind, node.doors[0]!)).toBe(true)
    const bands = enterRoom(blind, chain, ROOM_BOOK, node.instance)
    expect(verbsOn(bands)).not.toContain(VERBS['act.unlock'])
    expect(summoned(blind.run, node.instance, unlockOf(node))).toBe(false)
  })

  /**
   * arts 7, 68: "only then, **and only carrying**". A verb you cannot press
   * is the same defect as a verb you have not earned, so it gets the same
   * answer — it is not there. What the player gets instead is the lock,
   * which says what it wants.
   */
  it('is not on the strip without the key, however hard the lock is looked at', () => {
    const { ledgers, chain, node } = inTheHall()
    const empty: Ledgers = {
      ...ledgers,
      run: { ...ledgers.run!, carried: [] },
    }
    const bands = enterRoom(empty, chain, ROOM_BOOK, node.instance)
    expect(summoned(empty.run, node.instance, unlockOf(node))).toBe(true)
    expect(afforded(empty.run, unlockOf(node))).toBe(false)
    expect(verbsOn(bands)).not.toContain(VERBS['act.unlock'])
  })

  it('is on the strip once both are true', () => {
    const { ledgers, chain, node } = inTheHall()
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    expect(verbsOn(bands)).toContain(VERBS['act.unlock'])
  })

  it('persists for the instance — leave and come back and it is still there', () => {
    const { ledgers, chain, node } = inTheHall()
    // art. 70: looking is written down, so the summons survives a repaint,
    // a reload, and anything else that rebuilds the bands from the ledger.
    const again = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    const third = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    expect(verbsOn(again)).toEqual(verbsOn(third))
    expect(verbsOn(again)).toContain(VERBS['act.unlock'])
  })
})

describe('card 67 — the press writes a deed, and the deed is what the door reads', () => {
  it('opens nothing by existing: the key alone leaves the door shut', () => {
    const { ledgers, node } = inTheHall()
    const door = node.doors[0]!
    expect(door.demands.length).toBeGreaterThan(0)
    // The key is on you — art. 80 saw to that — and the door still does not
    // give. That one line is the whole of what this card changed.
    expect(canOpen(ledgers, door)).toBe(true)
    expect(turnedHere(ledgers, ROOM_BOOK, node, door)).toBe(false)
    expect(opens(ledgers, ROOM_BOOK, node, door)).toBe(false)
    expect(mayLeave(ledgers, ROOM_BOOK, node, door)).toBe(false)
  })

  it('turns it on the press, and the door gives afterwards', () => {
    const { ledgers, node } = inTheHall()
    const door = node.doors[0]!
    const turned = act(ledgers, unlockOf(node))
    expect(turned.run!.did).toContain(`${node.instance}|act.unlock`)
    expect(turnedHere(turned, ROOM_BOOK, node, door)).toBe(true)
    expect(opens(turned, ROOM_BOOK, node, door)).toBe(true)
    expect(mayLeave(turned, ROOM_BOOK, node, door)).toBe(true)
  })

  it('changes the lock’s pixels, and the frame cached behind them (art. 70)', () => {
    const { ledgers, node } = inTheHall()
    const before = sceneStateOf(ledgers, ROOM_BOOK, node)
    expect(before.doors[0]!.locked).toBe(true)
    expect(before.doors[0]!.turned).toBe(false)

    const after = sceneStateOf(act(ledgers, unlockOf(node)), ROOM_BOOK, node)
    // It still wears a lock — a lock that vanishes is a lock that was never
    // there — and the lock is open.
    expect(after.doors[0]!.locked).toBe(true)
    expect(after.doors[0]!.turned).toBe(true)
    // And the room is a different room to the frame cache, or the pixels
    // would never be recast (art. 70's own bug, in the shell).
    expect(sceneKey(after)).not.toBe(sceneKey(before))
  })

  it('answers with the turning, in words the act authored for itself', () => {
    expect(NOTICES['answer.act.unlock']).toBeDefined()
    expect((NOTICES['answer.act.unlock'] ?? '').length).toBeGreaterThan(0)
  })

  it('writes the deed against the instance, never against the template (art. 82)', () => {
    const { ledgers, node } = inTheHall()
    const turned = act(ledgers, unlockOf(node))
    const elsewhere: ChainNode = { ...node, instance: `${node.room}#99` as typeof node.instance }
    expect(turnedHere(turned, ROOM_BOOK, node, node.doors[0]!)).toBe(true)
    expect(turnedHere(turned, ROOM_BOOK, elsewhere, elsewhere.doors[0]!)).toBe(false)
  })

  it('refuses the walk itself, not only the verb that would have started it', () => {
    const { ledgers, chain, node } = inTheHall()
    // The belt to the suspender: the tray offers no verb, and the engine
    // would refuse one anyway.
    expect(() => chooseDoor(ledgers, chain, ROOM_BOOK, node.doors[0]!, DEALER)).toThrow(
      /lock has not been turned/,
    )
  })
})

describe('card 67 — the gate is doing the work (the control)', () => {
  /**
   * The control the card asked for. Take the deed-gate away and the same
   * run walks straight through — so the gate is what stops it, and not some
   * other refusal that happens to be standing in the same place. And with
   * the gate on, the run is still never *stranded*: what it needs is a
   * press, and the press is available.
   */
  it('walks through the moment the gate is removed, and is refused with it', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { ledgers, node } = inTheHall(seed)
      const door = node.doors[0]!
      expect(opens(ledgers, ROOM_BOOK, node, door), `seed ${seed} gated`).toBe(false)
      // The control: a door that demands nothing is the door this one was
      // before the card, and it opens on the key alone.
      const ungated = { ...door, demands: [] }
      expect(opens(ledgers, ROOM_BOOK, node, ungated), `seed ${seed} ungated`).toBe(true)
    }
  })

  it('strands nobody: the run always holds the key and the press is offered', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { ledgers, chain, node } = inTheHall(seed)
      // art. 80 put the key in the path, so the hall is never a dead end —
      // and `stranded` agrees, which is what keeps the End run valve off
      // the strip in the one room it would be most alarming in.
      expect(canOpen(ledgers, node.doors[0]!), `seed ${seed}`).toBe(true)
      expect(stranded(ledgers, ROOM_BOOK, node), `seed ${seed}`).toBe(false)
      const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
      expect(verbsOn(bands), `seed ${seed}`).toContain(VERBS['act.unlock'])
    }
  })

  it('is stranded, and says so, when the key is genuinely not on you', () => {
    const { ledgers, node } = inTheHall()
    const empty: Ledgers = { ...ledgers, run: { ...ledgers.run!, carried: [] } }
    expect(stranded(empty, ROOM_BOOK, node)).toBe(true)
    expect(NOTICES['door.locked']).toBeDefined()
  })
})

// ── The Warden (card 31, art. 37 as amended 2026-08-06) ────────────────

/** The beat, driven through the same calls the shell makes, in order. */
function theBeat(seed = 1) {
  const { ledgers, chain, node } = inTheHall(seed)
  const door = node.doors[0]!
  const turned = act(ledgers, unlockOf(node))
  const keeper = horrorIn(node)!
  return { ledgers, chain, node, door, turned, keeper }
}

/** One fight, played to whatever end, the way `test/depth.ts` plays one. */
function fightThrough(ledgers: Ledgers, node: ChainNode, door: typeof node.doors[number], keeper: Horror) {
  let fight = openFightDoor(ledgers, { door, horror: keeper })
  let guard = 0
  while (fight.outcome === 'fighting' && guard++ < 300) {
    const lots = turnLots(ledgers.run!.seed, node.step, fight.turnNumber)
    const turn = claimGreedily(recast(keepSensibly(cast(fight.turn, lots(1))), lots(2)))
    fight = advanceFight(withTurn(fight, turn), decide(turn, 'end-turn', fight.armor))
  }
  return fight
}

describe('card 31 — the Warden is the keeper the door was built for', () => {
  it('does not exist until the key turns: an empty hall, and a lock (the straw default)', () => {
    const { ledgers, chain, node } = inTheHall()
    // Nothing stands in the hall's sockets — it deals none — and the only
    // thing the room offers is the lock and the door (arts 37, 104).
    expect(node.fills).toEqual([])
    expect(horrorOf(node.fills)).toBeNull()
    const bands = enterRoom(ledgers, chain, ROOM_BOOK, node.instance)
    expect(bands.tappables.map((one) => one.id).sort()).toEqual(['warden.door', 'warden.lock'])
    // And nobody has met it, because there has been nothing to meet.
    expect(hasMet(ledgers.permanent, WARDEN_KEEPER)).toBe(false)
  })

  it('stands in no socket, is dealt by nothing, and is unique by construction', () => {
    // art. 83's machinery never sees it: it is in no catalog, at no weight,
    // in no region, and there is one hall.
    expect(CATALOG.encounters.some((one) => one.horror === 'horror.warden')).toBe(false)
    expect(CATALOG.encounters.some((one) => one.id === WARDEN_KEEPER)).toBe(false)
    for (let seed = 1; seed <= 30; seed++) {
      const halls = runOf(seed, alwaysLeft).nodes.filter((one) => one.type === 'warden')
      expect(halls.length, `seed ${seed}`).toBeLessThanOrEqual(1)
    }
    // And the room the engine asks is the room, not its sockets.
    expect(horrorIn({ type: 'warden', fills: [] })?.id).toBe(THE_WARDEN.id)
    expect(horrorIn({ type: 'passage', fills: [] })).toBeNull()
  })

  it('wakes on the turn of the key, and the hall answers in one line', () => {
    const { turned, node, door, keeper } = theBeat()
    expect(turnedHere(turned, ROOM_BOOK, node, door)).toBe(true)
    expect(keeper.id).toBe(THE_WARDEN.id)
    const said = NOTICES['warden.wakes'] ?? ''
    expect(said.length).toBeGreaterThan(0)
    // The hall's line is a shell notice in the repealed register, like the
    // rest of them: the mind wave declared that tranche a placeholder rather
    // than rewriting screens nobody has ruled a voice for.
    expect(lintVoice(said, 'placeholder')).toEqual([])
  })

  it('arrives at the near depth, in a body of its own (arts 30, 100)', () => {
    const { turned, node, door, keeper } = theBeat()
    const fight = openFightDoor(turned, { door, horror: keeper })
    const drawn = advanceBodyOf(keeper.id)
    expect(drawn).not.toBeNull()
    // art. 28: the advance never undoes itself, and art. 1 lets the caller
    // hand it a settled 1 at any moment.
    const staged = advance(fight, 1, (_, close) => drawn!(close))
    expect(staged.closeness).toBe(1)
    expect(typeof staged.prop.paint).toBe('function')
    // It comes down the hall: nearer at the lens than at the far wall.
    expect(drawn!(1).z).toBeLessThan(drawn!(0).z)
    // **And it is no longer the only one** (card 78). This used to assert
    // that every other horror kept the hinge's default mass, which was true
    // and was the defect: art. 119 §3 gave the blow a flash and a lunge, and
    // both were landing on a shape with no silhouette to move. Every horror
    // the depth deals now comes at you as itself.
    for (const horror of HORRORS) {
      expect(advanceBodyOf(horror.id), horror.id).not.toBeNull()
    }
    // A horror content has not drawn is still honestly nothing, so the
    // hinge's mass stays reachable rather than becoming unreachable code.
    expect(advanceBodyOf('horror.nobody-has-drawn-this')).toBeNull()
  })

  it('sets the depth’s exam: every effect kind the depth has to teach', () => {
    const kinds = new Set(
      WARDEN_SCRIPT.flatMap((one) => (one.effect === undefined ? [] : [one.effect.kind as string])),
    )
    expect([...kinds].sort()).toEqual(['bind', 'bleed', 'corrode', 'curse', 'hunger', 'seal'])
    // Above the Gnawing's, and steeper.
    expect(WARDEN_HEALTH).toBeGreaterThan(GNAWING_HEALTH)
    expect(WARDEN_ESCALATION).toBeGreaterThan(GNAWING_ESCALATION)
  })

  it('is met by fighting it, and the meeting is knowledge (art. 84)', () => {
    const { turned } = theBeat()
    const who = encounterOfHorror('horror.warden')!
    expect(who).toBe(WARDEN_KEEPER)
    const met = { ...turned, permanent: meet(turned.permanent, who) }
    expect(hasMet(met.permanent, WARDEN_KEEPER)).toBe(true)
    // And it survives the death it probably caused (arts 11, 84).
    expect(hasMet(routeDeath(met, endLineOf('horror.warden')).permanent, WARDEN_KEEPER)).toBe(true)
  })

  it('writes its own line when it wins, and it is not the door’s line', () => {
    expect(endLineOf('horror.warden')).toBe('end.warden.keeper')
    expect(END_LINES['end.warden.keeper']).toBeDefined()
    expect(END_LINES['end.warden.keeper']).not.toBe(END_LINES['end.warden'])
  })

  it('pauses like any door-fight when you run, and the key stays turned (arts 41, 63)', () => {
    const { turned, node, door, keeper } = theBeat()
    const fight = openFightDoor(turned, { door, horror: keeper })
    const played = withTurn(fight, cast(fight.turn, turnLots(turned.run!.seed, node.step, 1)(1)))
    const fled = advanceFight(played, decide(played.turn, 'flee', played.armor))
    expect(fled.outcome).toBe('fled')

    const away = routeFlight(turned, saveFight(fled, node.instance, 'pre', [], true, false))
    // The deed stands: running is a retreat from the keeper, not from the
    // lock, and the lock does not shut behind you.
    expect(turnedHere(away, ROOM_BOOK, node, door)).toBe(true)
    expect(opens(away, ROOM_BOOK, node, door)).toBe(true)
    // And the fight is where you left it, so coming back resumes (art. 63).
    const held = pausedAt(away, node.instance)
    expect(held).not.toBeNull()
    expect(held!.horror).toBe(THE_WARDEN.id)
    expect(horrorById(held!.horror)).not.toBeNull()
  })

  /**
   * art. 71: no press may lie about where it takes you, and the last door
   * means three different journeys across one run. The shell reads this
   * predicate for the word it puts on the strip, so the three states are
   * asserted here rather than reimplemented there.
   */
  it('is a fight while it stands, and a way down only once it is not', () => {
    const { ledgers, node } = inTheHall()
    const door = node.doors[0]!
    const deeds = (held: Ledgers) => sceneStateOf(held, ROOM_BOOK, node).done

    // Locked: the hall is empty, and there is nothing to press but the lock.
    expect(keeperStanding(door, node, false, deeds(ledgers))).toBe(false)

    // Turned: the keeper is up, and the door is a fight-door.
    const turned = act(ledgers, unlockOf(node))
    expect(keeperStanding(door, node, true, deeds(turned))).toBe(true)

    // Run out of it and come back: the deed stands, so it is still a fight.
    // This is the one that matters — the door would otherwise have offered
    // Descend to somebody who fled, which is a press that lies.
    const away = routeFlight(turned, saveFight(
      openFightDoor(turned, { door, horror: horrorIn(node)! }),
      node.instance,
      'pre',
      [],
      true,
      false,
    ))
    expect(keeperStanding(door, node, true, deeds(away))).toBe(true)

    // Down: and only now is it a way on.
    const beaten = { ...turned, run: didHere(turned.run!, node.instance, WARDEN_DOWN) }
    expect(keeperStanding(door, node, true, deeds(beaten))).toBe(false)

    // And no ordinary door is ever any of this.
    for (const other of runOf(1, alwaysLeft).nodes.flatMap((one) => one.doors)) {
      if (other.ends === true) continue
      expect(keeperStanding(other, node, true, deeds(turned))).toBe(false)
    }
  })

  it('gives the depth up only when it goes down (the whole beat, headless)', () => {
    // A hand that can actually do it: art. 86's answer to the bottom of a
    // depth is who you have found, and this is a run that found two.
    const carrying = { dice: [THE_PUSHER, THE_RUNNER], worn: [RUSTED_PLATE] }
    let won: Ledgers | null = null
    for (let seed = 1; seed <= 20 && won === null; seed++) {
      const { ledgers, chain, node } = inTheHall(seed, carrying)
      const door = node.doors[0]!
      // 1. The key turns. 2. The keeper is standing.
      let after = act(ledgers, unlockOf(node))
      const keeper = horrorIn(node)!
      // 3. The fight opens, and it is the room with the thing come close.
      const fight = fightThrough(after, node, door, keeper)
      if (fight.outcome !== 'won') continue
      after = carryOut(after, fight)
      // 4. Beating it writes the deed, and the door is a way down at last.
      after = { ...after, run: didHere(after.run!, node.instance, WARDEN_DOWN) }
      expect(after.run!.did).toContain(`${node.instance}|${WARDEN_DOWN}`)
      expect(opens(after, ROOM_BOOK, node, door)).toBe(true)
      // 5. And the run finishes as it always did — one line, a fresh waking.
      const finished = finish(after, 'end.warden')
      expect(finished.bookOfEnds.at(-1)).toMatchObject({ cause: 'end.warden' })
      won = after
      void chain
    }
    expect(won, 'no taught run in twenty beat the keeper').not.toBeNull()
  })
})

describe('card 31 — tuned so a taught run with a build wins', () => {
  /**
   * The bar the card set, measured the same way everything else is
   * (`test/depth.ts`, the whole-depth model). A **taught** run is what
   * art. 86 says a build is — who you have found — so it is two travelers'
   * bones and the plate off a third.
   */
  const RUNS = 300
  const TAUGHT = { dice: [THE_PUSHER, THE_RUNNER], worn: [RUSTED_PLATE] }

  const walked = (carrying: Parameters<typeof playDepth>[2]) => {
    let reached = 0
    let finished = 0
    for (let seed = 1; seed <= RUNS; seed++) {
      const played = playDepth(seed, coinFlip(seed), carrying)
      if (played.reachedTheDoor) reached++
      if (played.outcome === 'finished') finished++
    }
    return { reached: reached / RUNS, finished: finished / RUNS }
  }

  /**
   * **Re-baselined by the levels wave** (card 89). The card's bar was *a
   * taught run gets to the bottom nearly always and beats the keeper about
   * half of those*, and the arithmetic pass moved both halves: the road is
   * harder, so a taught run reaches the door about one time in two rather
   * than three in four, and the keeper is harder, so it takes the depth
   * about one time in ten rather than one in two.
   *
   * The band kept here is the part of the card that is not a number: **it
   * is a wall for a first waking and a gate for a build**, and the distance
   * between those two is the whole of what death-as-progression means. The
   * measured numbers, and where they miss the wave's own targets, are in
   * DESIGN.md rather than in an assertion, because a target that is missed
   * on purpose belongs in a sentence somebody reads.
   */
  it('lets a taught run take the depth, and a bare one hardly ever', () => {
    const taught = walked(TAUGHT)
    const bare = walked({})
    // A keeper a taught run never beats is a wall; one it always beats is a
    // door with extra steps.
    expect(taught.reached).toBeGreaterThan(0.3)
    expect(taught.finished).toBeGreaterThan(0.03)
    expect(taught.finished).toBeLessThan(0.5)
    // And the build is the difference, by a wide margin, on both counts.
    expect(taught.reached).toBeGreaterThan(bare.reached * 1.5)
    expect(taught.finished).toBeGreaterThan(bare.finished * 3)
  })

  it('leaves a first waking able to do it, and not expecting to', () => {
    const bare = walked({})
    // art. 55: the start is bare, and the bottom of a depth is what that
    // costs. Rare — and *how* rare is measured and reported rather than
    // asserted, because the number is a product of a road and a wall the
    // wave moved deliberately.
    expect(bare.finished).toBeLessThan(0.05)
    // And the difference is the build, not the road: a bare run still gets
    // to the door often enough for the deposit to happen (arts 11, 60).
    expect(bare.reached).toBeGreaterThan(0.1)
  })

  /**
   * art. 33: **and the loop still closes on a bare hand.** It is a rare
   * enough event that a three-hundred-seed sample can miss it, so it is
   * asked of a sample big enough to see it rather than folded into a band
   * that would then be a coin toss.
   */
  it('is winnable from a first waking, over enough seeds to see it (art. 33)', () => {
    let finished = 0
    for (let seed = 1; seed <= 1500 && finished === 0; seed++) {
      if (playDepth(seed, coinFlip(seed)).outcome === 'finished') finished++
    }
    expect(finished).toBeGreaterThan(0)
  })

  it('is the hardest thing in the depth, at every hand it is measured with', () => {
    // Otherwise it is a boss in name only (art. 37 as amended).
    for (const [hand, armor] of [
      [assembleHand(PLAIN_POUCH, HAND_SIZE), BARE_BODY.armor],
      [assembleHand({ dice: [...PLAIN_POUCH.dice, THE_CAREFUL] }, HAND_SIZE), BARE_BODY.armor],
      [assembleHand({ dice: [...PLAIN_POUCH.dice, THE_CAREFUL] }, HAND_SIZE), RUSTED_PLATE.armor],
    ] as const) {
      const keeper = winRateOf(THE_WARDEN, hand, armor, 200)
      for (const other of [THE_GNAWING, THE_MARROW, THE_SILT_MOTHER, THE_KINDLED]) {
        expect(keeper, `${other.id} vs the keeper`).toBeLessThan(
          winRateOf(other, hand, armor, 200),
        )
      }
    }
  })
})

describe('card 67 — it generalises: every lock is a deed-gated door', () => {
  it('gives every locked door in the catalog something authored to turn it', () => {
    // A lock with nothing to turn it never opens, deliberately — so content
    // may not ship one. This is what stops a future lock from quietly
    // regressing to the passive check this card removed.
    for (let seed = 1; seed <= 60; seed++) {
      let { ledgers, chain } = opened(seed)
      for (;;) {
        const node = hereIn(chain)
        if (node === null) break
        for (const door of node.doors) {
          if (door.demands.length === 0) continue
          expect(lockActFor(ROOM_BOOK, node, door), `${node.room as string}/${door.at}`).not.toBeNull()
        }
        ledgers = lookAround(ledgers, node)
        for (const one of takeable(ledgers, node)) ledgers = act(ledgers, one)
        const door = node.doors[0]
        if (door === undefined || door.ends === true) break
        const walked = chooseDoor(ledgers, chain, ROOM_BOOK, door, DEALER)
        ledgers = walked.ledgers
        chain = walked.chain
      }
    }
  })

  it('leaves every unlocked door exactly as it was', () => {
    // The gate is about locks and nothing else: an ordinary door needs no
    // deed, asks for none, and is unchanged by all of this.
    for (const seed of [3, 11, 29]) {
      let { ledgers, chain } = opened(seed)
      for (;;) {
        const node = hereIn(chain)
        if (node === null) break
        for (const door of node.doors) {
          if (door.demands.length > 0) continue
          expect(opens(ledgers, ROOM_BOOK, node, door), `${node.room as string}/${door.at}`).toBe(
            true,
          )
        }
        ledgers = lookAround(ledgers, node)
        for (const one of takeable(ledgers, node)) ledgers = act(ledgers, one)
        const door = node.doors[0]
        if (door === undefined || door.ends === true) break
        const walked = chooseDoor(ledgers, chain, ROOM_BOOK, door, DEALER)
        ledgers = walked.ledgers
        chain = walked.chain
      }
    }
  })
})

/**
 * **The fled keeper has a body** (the mend, wave 2, arts 37, 68, 118).
 *
 * Card 95 made every fight in the game begin by tapping the horror, and left
 * one exception standing. The keeper stands in no socket (art. 37), so a
 * player who ran out of its fight came back to a hall with *nothing in it* —
 * and the only way back in was the door's own Fight verb. That was the last
 * door-fight in a game that had abolished them, and it was reachable exactly
 * one way: by fleeing.
 *
 * Art. 37 is untouched — the keeper is still dealt by nothing, still in no
 * socket, and still not in the hall at all until the key turns. What it has
 * now is the one thing card 95 asks of a horror: a place to stand in the room
 * and be looked at.
 */
describe('the mend — the fled keeper is a thing in the hall', () => {
  const deeds = (held: Ledgers, node: ChainNode) => sceneStateOf(held, ROOM_BOOK, node).done

  it('puts nothing in the hall before the key turns', () => {
    const { ledgers, node } = inTheHall()
    const done = deeds(ledgers, node)
    expect(keeperAwake(done)).toBe(false)
    expect(horrorMarkIn(node, done)).toBeNull()
    expect(horrorStanding(node, done)).toBe(false)
    expect(tappablesIn(ROOM_BOOK, node, done).map((one) => one.id)).not.toContain('warden.keeper')
  })

  it('stands it in the hall on the turn of the key, with a body and a noun', () => {
    const { ledgers, node } = inTheHall()
    const turned = act(ledgers, unlockOf(node))
    const done = deeds(turned, node)
    expect(keeperAwake(done)).toBe(true)
    expect(horrorStanding(node, done)).toBe(true)
    expect(horrorMarkIn(node, done)).toBe('warden.keeper')
    const there = tappablesIn(ROOM_BOOK, node, done).find((one) => one.id === 'warden.keeper')
    expect(there).toBeDefined()
    // art. 69: it answers, and art. 111: it names itself first.
    expect(LOOKS['warden.keeper'] ?? '').not.toBe('')
    expect(there!.noun).toBe('the keeper')
  })

  /**
   * The article this closes. While the keeper stands the hall is `guarded`
   * like any other room with teeth in it: no door gives, and what the player
   * gets instead is the door's answer saying why (art. 118's second clause).
   */
  it('offers no door verb at all while it stands, and Descend once it is down', () => {
    const { ledgers, node } = inTheHall()
    const door = node.doors[0]!
    const turned = act(ledgers, unlockOf(node))
    expect(wayOn(turned, ROOM_BOOK, node, door, horrorStanding(node, deeds(turned, node)))).toBeNull()

    const beaten = { ...turned, run: didHere(turned.run!, node.instance, WARDEN_DOWN) }
    expect(horrorStanding(node, deeds(beaten, node))).toBe(false)
    expect(wayOn(beaten, ROOM_BOOK, node, door, horrorStanding(node, deeds(beaten, node)))).toBe(
      'descend',
    )
  })

  /**
   * **The case that was broken.** Run out of the keeper's fight, come back to
   * the hall: the thing is standing there, looking at it summons the verb,
   * and the verb is the horror's rather than the door's.
   */
  it('is re-entered by tapping it after a flight, never by a door', () => {
    const { turned, node, door, keeper } = theBeat()
    const away = routeFlight(
      turned,
      saveFight(openFightDoor(turned, { door, horror: keeper }), node.instance, 'pre', [], true, false),
    )
    const done = deeds(away, node)
    const mark = horrorMarkIn(node, done)
    expect(mark).toBe('warden.keeper')

    // art. 68: not until it has been looked at, and then yes.
    expect(fightSummoned(away, node, mark, horrorStanding(node, done))).toBe(false)
    const seen = looking(away, tappablesIn(ROOM_BOOK, node, done).find((one) => one.id === mark)!)
    expect(fightSummoned(seen, node, mark, horrorStanding(node, deeds(seen, node)))).toBe(true)

    // And the door still gives nothing — the fight is about the thing.
    expect(wayOn(seen, ROOM_BOOK, node, door, horrorStanding(node, deeds(seen, node)))).toBeNull()
  })

  /**
   * The proof rather than the consequence: `WayOn` has no `fight` member any
   * more, so the type could not express a door-fight if somebody wanted one.
   * This walks every door of every room a depth can deal and asserts it.
   */
  it('leaves no door in the catalog able to say Fight', () => {
    for (const seed of [1, 2, 3, 5, 8, 13]) {
      const walked = walkDepth(seed)
      expect(walked.outcome, `seed ${seed}`).not.toBe('stuck')
      expect(walked.held, `seed ${seed}`).toEqual([])
    }
  })
})
