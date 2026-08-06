/**
 * A fight fought all the way through the beats (art. 119 §4).
 *
 * `test/screen.ts` is the shell's state machine with the painting taken out;
 * this is the shell's **fight loop** with the painting taken out and the
 * *timeline left in*. It makes the same calls `src/main.ts` makes, in the
 * order it makes them, through the same `playBeats` — so the claim it is
 * built to test is a real one: a scripted fight played with motion and
 * without it ends on the same body, the same Book line and the same bytes.
 *
 * The clock is driven rather than waited on. What art. 116 is about is
 * whether the two readings agree, not how long one of them takes, and a test
 * that actually slept would be measuring the machine it ran on.
 */

import {
  ALL_RIDERS,
  BARE_BODY,
  CASCADE,
  HAND_SIZE,
  PLAIN_POUCH,
  THE_GNAWING,
  endLineOf,
} from '../src/content/index.js'
import { routeDeath, turnLots } from '../src/hinge/index.js'
import type { Beat, Fight, Frame, Goods, Outcome } from '../src/lots/index.js'
import {
  advanceFight,
  cascadeBeats,
  cast,
  casting,
  decide,
  openFight,
  recast,
  rollBeats,
  withTurn,
} from '../src/lots/index.js'
import type { Clock } from '../src/shell/beats.js'
import { playBeats } from '../src/shell/beats.js'
import type { Ledgers, Seed, Vault } from '../src/state/index.js'
import { exported, firstPermanent, save, wake } from '../src/state/index.js'
import { claimGreedily, keepSensibly } from './policy.js'

const GOODS: Goods = { talismans: [], riders: ALL_RIDERS }

/** A clock whose waiting is drained by the caller, never by the wall. */
function drivenClock(): Clock & { drain(): void } {
  let next: (() => void) | null = null
  let handle = 0
  return {
    after(_ms, run) {
      next = run
      return (handle += 1)
    },
    cancel() {
      next = null
    },
    drain() {
      for (let guard = 0; guard < 20_000; guard++) {
        const run = next
        if (run === null) return
        next = null
        run()
      }
      throw new Error('a timeline that never settles')
    },
  }
}

function memoryVault(): Vault {
  const written = new Map<string, string>()
  return {
    read: (key) => written.get(key) ?? null,
    forget: (key) => void written.delete(key),
    write: (key, value) => void written.set(key, value),
  }
}

export interface Fought {
  readonly outcome: Outcome
  readonly yourHealth: number
  readonly horrorHealth: number
  readonly turns: number
  /** art. 11: the line the Book takes, if the fight finished the run. */
  readonly bookLine: string | null
  /** The whole snapshot, as text. Two readings must write the same bytes. */
  readonly vault: string | null
  /** Every beat that was shown, in order — the script as it was read out. */
  readonly beats: readonly Beat[]
}

/**
 * One whole fight against the Gnawing, played the way the shell plays it:
 * roll (beats), recast (beats), attack (beats), and again until it ends.
 */
export function scriptedFight(seed: number, options: { readonly still: boolean }): Fought {
  const permanent = firstPermanent(PLAIN_POUCH, HAND_SIZE, BARE_BODY)
  let ledgers: Ledgers = wake(permanent, seed as unknown as Seed)
  const run = ledgers.run!
  const clock = drivenClock()
  const beats: Beat[] = []

  const play = (frames: readonly Frame[]): void => {
    const player = playBeats(frames, {
      clock,
      still: options.still,
      show: (frame) => void beats.push(frame.beat),
      lands: () => {},
    })
    clock.drain()
    if (player.running) throw new Error('a timeline the clock could not finish')
  }

  let fight: Fight = openFight(THE_GNAWING, run.hand, run.health, run.armor, GOODS)
  let turns = 0
  for (; turns < 400 && fight.outcome === 'fighting'; turns++) {
    const lots = turnLots(run.seed, run.at.step, fight.turnNumber)

    // Roll: every die is in the air, and they land staggered (§1).
    const rolled = withTurn(fight, cast(fight.turn, lots(1)))
    play(rollBeats(rolled, new Set<string>(), CASCADE))

    // Keep, then recast — and only what was not kept re-tumbles (§1). The
    // held set is read off the turn *before* the recast, because the recast
    // is what clears the keep-marks (art. 72), exactly as the shell does.
    const kept = keepSensibly(rolled.turn)
    const held = new Set<string>(
      casting(kept)
        .filter((landed) => landed.kept)
        .map((landed) => landed.die as string),
    )
    const thrown = withTurn(rolled, recast(kept, lots(2)))
    play(rollBeats(thrown, held, CASCADE))

    // Attack: the engine is asked here, before the first frame (art. 119),
    // and everything after it is the script being read out.
    const played = withTurn(thrown, claimGreedily(thrown.turn))
    const resolution = decide(played.turn, 'end-turn', played.armor, GOODS)
    const after = advanceFight(played, resolution)
    play(cascadeBeats(played, after, resolution, GOODS, CASCADE))
    fight = after
  }

  // The run's own ending, so the Book line and the bytes are real ones.
  let bookLine: string | null = null
  if (fight.outcome === 'lost') {
    bookLine = endLineOf(fight.horror.id)
    // art. 11: the run burns, the line goes into the Book, the doors reseed.
    ledgers = routeDeath(ledgers, bookLine)
  }
  const vault = memoryVault()
  save(ledgers, vault)

  return {
    outcome: fight.outcome,
    yourHealth: fight.yourHealth,
    horrorHealth: fight.horrorHealth,
    turns,
    bookLine,
    vault: exported(vault),
    beats,
  }
}
