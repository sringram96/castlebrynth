/**
 * **A shell without a DOM** (the answer wave, card 74).
 *
 * The playtest of 2026-08-06 found twenty-eight things and the suite caught
 * none of them, and the reason is one sentence: *every existing test asks the
 * engine a question, and every finding was about the screen.* The engine was
 * right about the mercy, about the door, about the act — what was wrong was
 * what got offered and what got said, and both of those lived inside
 * `main.ts` beside the code that builds a `<button>`.
 *
 * So this is the shell's state machine with the painting taken out. It makes
 * exactly the calls `src/main.ts` makes, in the order it makes them, through
 * the same pure functions — `wayOn` and `offeredActs` for the strip,
 * `bandLine` for the word band, `saysAct` and `saysExchange` and `saysIntent`
 * for what they say. Nothing here reimplements a decision; if it did, it
 * would be a second model and the tests built on it would be testing
 * themselves.
 *
 * What it buys is the two guarantees the report asked for by name: **no dead
 * press**, and **every press says what it did** — asked of a whole depth,
 * every room, every verb, in CI.
 *
 * **What it cannot see, stated plainly.** It holds the shell's *decisions*,
 * because those are shared code — delete art. 118's filter and every test
 * here that depends on it goes red. It only *mirrors* the shell's
 * **sequencing**: the order `main.ts` calls those functions in, and which
 * results it assigns to the band. Cut `band = answered(saysExchange(...))`
 * out of `endTurn` and this harness would not notice, because it makes that
 * call itself. Closing that needs `main.ts` under a DOM, which is a card of
 * its own; until then the sequencing is what still needs a human with a
 * phone, and DESIGN.md says so.
 */

import {
  NOTICES,
  ROOM_BOOK,
  horrorIn,
  horrorOf,
  keeperStanding,
  saysAct,
  saysDoor,
  saysExchange,
  saysIntent,
} from '../src/content/index.js'
import type { Act, Tappable } from '../src/descent/index.js'
import {
  act,
  actsIn,
  chooseDoor,
  enterRoom,
  heldBack,
  look,
  looking,
  priceAt,
  sceneStateOf,
  tappablesIn,
  turnedHere,
  withholding,
} from '../src/descent/index.js'
import type { Bands } from '../src/descent/index.js'
import type { Chain, ChainNode, Door } from '../src/gen/index.js'
import { hereIn } from '../src/gen/index.js'
import { carryOut, openFightDoor, turnLots } from '../src/hinge/index.js'
import type { Fight, Goods } from '../src/lots/index.js'
import { advanceFight, cast, decide, recast, withTurn } from '../src/lots/index.js'
import type { Held } from '../src/shell/band.js'
import { HUSHED, answered, bandLine, noticed } from '../src/shell/band.js'
import { offeredActs, wayOn } from '../src/shell/strip.js'
import type { WayOn } from '../src/shell/strip.js'
import type { Ledgers } from '../src/state/index.js'
import { knownMarks } from '../src/state/index.js'
import { DEALER, greet, opened } from './drift.js'
import { claimGreedily, keepSensibly } from './policy.js'

const NO_GOODS: Goods = { talismans: [], riders: [] }

/** What a press did, in the terms the guarantees are stated in. */
export interface Press {
  readonly verb: string
  /** Whether the ledgers moved. art. 118: a press that does not is a defect. */
  readonly moved: boolean
  /** The word band before and after. card 69: a press answers. */
  readonly before: string
  readonly after: string
}

export interface Shell {
  readonly ledgers: Ledgers
  readonly chain: Chain
  readonly fight: Fight | null
  node(): ChainNode
  /** The word band, resolved exactly as `say()` resolves it (card 69). */
  said(): string
  /** art. 6: everything on the frame that answers. */
  things(): readonly Tappable[]
  /** art. 68: a tap answers and summons. Returns what it answered with. */
  tap(target: Tappable): string
  /** art. 67: the acts the strip is holding right now. */
  strip(): readonly Act[]
  /** art. 66: press one, and say what it did. */
  press(one: Act): Press
  /** art. 118: the door's verb, or nothing at all. */
  way(door: Door): WayOn | null
  /** arts 31, 69 (card 49): what tapping this door answers with. */
  sense(door: Door): string
  /** Walk through it (art. 79: the room behind it is dealt now). */
  walk(door: Door): void
  /** art. 30: the door is the fight. */
  enter(door: Door): void
  /** One turn, played the way `test/policy.ts` plays. Returns what it said. */
  turn(): Press
}

export function shellAt(seed: number): Shell {
  let { ledgers, chain } = opened(seed)
  ledgers = greet(ledgers, chain)
  let bands: Bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.instance)
  let band: Held = HUSHED
  let fight: Fight | null = null

  const node = (): ChainNode => {
    const here = hereIn(chain)
    if (here === null) throw new Error(`seed ${seed}: no room dealt`)
    return here
  }

  /**
   * `wordOf()`: what the moment says on its own. A room's candle, or — while
   * a fight is on — the intent, which is the ambient the exchange displaces.
   */
  const ambient = (): string =>
    fight === null ? (bands.word?.text ?? '') : saysIntent(fight.turn.intent)

  const reread = (): void => {
    bands = enterRoom(ledgers, chain, ROOM_BOOK, ledgers.run!.at.instance)
  }

  const keeperUp = (door: Door): boolean =>
    keeperStanding(
      door,
      node(),
      turnedHere(ledgers, ROOM_BOOK, node(), door),
      sceneStateOf(ledgers, ROOM_BOOK, node()).done,
    )

  const shell: Shell = {
    get ledgers() {
      return ledgers
    },
    get chain() {
      return chain
    },
    get fight() {
      return fight
    },
    node,
    said: () => bandLine(band, ambient()),
    things: () => tappablesIn(ROOM_BOOK, node()),
    tap(target) {
      // `markFor`: the look, the pocket, and art. 118's third question.
      const said = look(
        ROOM_BOOK,
        bands,
        target,
        ledgers.run?.carried ?? [],
        withholding(ledgers, ROOM_BOOK, node(), target.id),
        // art. 120: and the price, which the tap that summons the verb is
        // the tap that says.
        priceAt(ledgers, ROOM_BOOK, node(), target.id),
        // arts 10, 84: and what he still knows.
        knownMarks(ledgers.permanent),
      ).text
      band = noticed(said)
      ledgers = looking(ledgers, target)
      reread()
      return shell.said()
    },
    strip: () => offeredActs(ledgers, ROOM_BOOK, node()),
    press(one) {
      // `doAct`, minus the paint and minus the Warden's wake — a fight the
      // press starts is `enter`'s business and is driven by the caller.
      const before = shell.said()
      const was = ledgers
      // arts 84, 89: the room's acts go with the press, so a fork's
      // forfeiture can write the flag that lives on the act it closed.
      ledgers = act(ledgers, one, actsIn(ROOM_BOOK, node()))
      reread()
      band = answered(saysAct(one.id))
      return { verb: one.verb, moved: ledgers !== was, before, after: shell.said() }
    },
    way: (door) => wayOn(ledgers, ROOM_BOOK, node(), door, keeperUp(door)),
    // `doorMark`: the sense first, because it is what the door is, and
    // art. 118's stop after it, because it is what he is doing about it.
    sense: (door) =>
      [
        saysDoor(door, node().instance),
        ...(heldBack(ledgers, ROOM_BOOK, node()).length > 0
          ? [NOTICES['door.held'] ?? '']
          : []),
      ]
        .filter((said) => said !== '')
        .join(' '),
    walk(door) {
      const walked = chooseDoor(ledgers, chain, ROOM_BOOK, door, DEALER)
      ledgers = walked.ledgers
      chain = walked.chain
      reread()
      band = HUSHED
      ledgers = greet(ledgers, chain)
    },
    enter(door) {
      const horror = horrorIn(node()) ?? horrorOf(node().fills)
      if (horror === null) throw new Error(`${node().instance} has no horror behind its door`)
      fight = openFightDoor(ledgers, { door, horror }, NO_GOODS)
      band = HUSHED
    },
    turn() {
      const now = fight
      if (now === null) throw new Error('no fight to take a turn in')
      const before = shell.said()
      const lots = turnLots(ledgers.run!.seed, node().step, now.turnNumber)
      const played = claimGreedily(recast(keepSensibly(cast(now.turn, lots(1))), lots(2)))
      const resolution = decide(played, 'end-turn', now.armor, NO_GOODS)
      // `endTurn`: the exchange lands on the band before the turn settles.
      band = answered(saysExchange(resolution))
      const after = shell.said()
      fight = advanceFight(withTurn(now, played), resolution)
      if (fight.outcome !== 'fighting') {
        ledgers = carryOut(ledgers, fight)
        reread()
      }
      return { verb: 'Attack', moved: true, before, after }
    },
  }
  return shell
}

/** How a walked depth ended, and everything it pressed on the way. */
export interface Walked {
  readonly outcome: 'finished' | 'died' | 'stuck'
  readonly rooms: number
  readonly presses: readonly Press[]
  /** Every room where the strip offered no way on at all (art. 118). */
  readonly held: readonly string[]
}

/**
 * A whole depth, walked the way a thumb walks it: look at everything, press
 * everything the strip offers, then take the way on. It is deliberately
 * greedy — the guarantees are about *every* offered verb, so the walk has to
 * press every offered verb.
 */
export function walkDepth(seed: number): Walked {
  const shell = shellAt(seed)
  const presses: Press[] = []
  const held: string[] = []

  for (let room = 0; room < shell.chain.length + 4; room++) {
    const node = shell.node()
    // art. 68: looking is what summons, and a thumb looks before it takes.
    for (const target of shell.things()) shell.tap(target)
    // Every verb the strip is holding, pressed. art. 82 stops it repeating.
    for (let guard = 0; guard < 8; guard++) {
      const one = shell.strip()[0]
      if (one === undefined) break
      presses.push(shell.press(one))
    }

    // art. 118: the way on, or nothing — and nothing must mean the room is
    // genuinely finished with, never that the player is stuck in it.
    const ways = node.doors.map((door) => ({ door, way: shell.way(door) }))
    const open = ways.find((one) => one.way !== null)
    if (open === undefined) {
      held.push(node.instance as string)
      return { outcome: 'stuck', rooms: room, presses, held }
    }

    if (open.way === 'fight') {
      shell.enter(open.door)
      for (let n = 0; n < 300 && shell.fight?.outcome === 'fighting'; n++) {
        presses.push(shell.turn())
      }
      if (shell.fight?.outcome !== 'won') return { outcome: 'died', rooms: room, presses, held }
      // Winning opens the door; the last door ends the depth instead.
      if (open.door.ends === true) return { outcome: 'finished', rooms: room, presses, held }
      shell.walk(open.door)
      continue
    }
    if (open.way === 'descend') return { outcome: 'finished', rooms: room, presses, held }
    shell.walk(open.door)
  }
  return { outcome: 'stuck', rooms: shell.chain.length, presses, held }
}

/** Whether this room is holding the run back for something (art. 3). */
export function owing(shell: Shell): boolean {
  return heldBack(shell.ledgers, ROOM_BOOK, shell.node()).length > 0
}
