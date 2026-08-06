/**
 * **The pre-wave transcript** (card 93, the flexibility test).
 *
 * The rolling goods are an add-on, and the whole engineering claim of the
 * wave is that a run carrying none is the run that was already there. That
 * claim is not checkable by reading the diff — it is a claim about a *stream
 * of randomness*, and the only honest way to check it is to write down what
 * the build did before the wave and hold the build after it to the same
 * bytes.
 *
 * So this is a transcript, not a model: two halves, and each is deliberately
 * as dumb as it can be.
 *
 * - **the fights** — one horror, one hand, one seed, every turn's four
 *   numbers in order. If the amend seam draws a single value off a lot it
 *   should not have touched, the very first turn of the very first fight
 *   disagrees and the row says which.
 * - **the depths** — a whole run walked the way `test/depth.ts` walks one,
 *   over enough seeds that a shifted stream cannot hide in the noise: the
 *   outcome, how far it got, what it was holding, and how long each of its
 *   fights ran.
 *
 * `test/fixtures/pre-rolling.json` is this file's output, taken on the commit
 * before the wave and committed beside it. Nothing regenerates it: a fixture
 * you can regenerate on demand is a fixture that agrees with whatever the
 * code currently does, which is the one thing it must not do.
 */

import {
  ALL_RIDERS,
  BARE_BODY,
  HAND_SIZE,
  LEVEL_CAP,
  PLAIN_POUCH,
  THE_CAREFUL,
  THE_GNAWING,
  THE_PUSHER,
  THE_WARDEN,
  RUSTED_PLATE,
} from '../src/content/index.js'
import { lotFrom } from '../src/gen/index.js'
import type { Die, Fight, Goods, Hand, Horror } from '../src/lots/index.js'
import {
  advanceFight,
  assembleHand,
  cast,
  decide,
  openFight,
  recast,
  withTurn,
} from '../src/lots/index.js'
import type { Seed } from '../src/state/index.js'
import { playDepth } from './depth.js'
import { coinFlip } from './drift.js'
import { claimGreedily, keepSensibly } from './policy.js'

/** The company every fight in the transcript is fought with, riders included. */
const COMPANY: Goods = { talismans: [], riders: ALL_RIDERS, levelCap: LEVEL_CAP }

function handWith(...found: readonly Die[]): Hand {
  return assembleHand({ dice: [...found, ...PLAIN_POUCH.dice] }, HAND_SIZE)
}

/** One turn's four numbers, in the order `Resolution` declares them. */
export type TurnRow = readonly [dealt: number, taken: number, hurt: number, blocked: number]

export interface FightTranscript {
  readonly horror: string
  readonly hand: string
  readonly seed: number
  readonly turns: readonly TurnRow[]
  readonly outcome: string
  readonly yourHealth: number
  readonly horrorHealth: number
}

function transcribeFight(
  horror: Horror,
  hand: Hand,
  handLabel: string,
  armor: number,
  seed: number,
): FightTranscript {
  const lot = lotFrom(seed as unknown as Seed)
  let fight: Fight = openFight(
    horror,
    hand,
    BARE_BODY.health,
    armor,
    COMPANY,
    BARE_BODY.health,
  )
  const turns: TurnRow[] = []
  let guard = 0
  while (fight.outcome === 'fighting' && guard++ < 300) {
    const turn = claimGreedily(recast(keepSensibly(cast(fight.turn, lot)), lot), COMPANY)
    const resolution = decide(turn, 'end-turn', fight.armor, COMPANY)
    turns.push([
      resolution.harmDealt,
      resolution.harmTaken,
      resolution.hurt,
      resolution.blocked,
    ])
    fight = advanceFight(withTurn(fight, turn), resolution)
  }
  return {
    horror: horror.id,
    hand: handLabel,
    seed,
    turns,
    outcome: fight.outcome,
    yourHealth: fight.yourHealth,
    horrorHealth: fight.horrorHealth,
  }
}

export interface DepthTranscript {
  readonly seed: number
  readonly outcome: string
  readonly reachedTheDoor: boolean
  readonly step: number
  readonly fights: number
  readonly health: number
  readonly haul: readonly string[]
  readonly turnsPerFight: readonly number[]
}

function transcribeDepth(seed: number): DepthTranscript {
  const played = playDepth(seed, coinFlip(seed))
  return {
    seed,
    outcome: played.outcome,
    reachedTheDoor: played.reachedTheDoor,
    step: played.step,
    fights: played.fights,
    health: played.health,
    haul: [...played.haul.dice, ...played.haul.keepsakes, ...played.haul.worn]
      .map((good) => good.id as string)
      .sort(),
    turnsPerFight: played.turnsPerFight,
  }
}

export interface Transcript {
  readonly fights: readonly FightTranscript[]
  readonly depths: readonly DepthTranscript[]
}

/** The two halves, at the sizes the check runs at. */
export function transcript(fightSeeds = 40, depthSeeds = 150): Transcript {
  const hands: readonly (readonly [string, Hand, number])[] = [
    ['bare', handWith(), BARE_BODY.armor],
    ['found', handWith(THE_CAREFUL), BARE_BODY.armor],
    ['taught', handWith(THE_PUSHER), RUSTED_PLATE.armor],
  ]
  const fights: FightTranscript[] = []
  for (const horror of [THE_GNAWING, THE_WARDEN]) {
    for (const [label, hand, armor] of hands) {
      for (let seed = 0; seed < fightSeeds; seed++) {
        fights.push(transcribeFight(horror, hand, label, armor, seed))
      }
    }
  }
  const depths: DepthTranscript[] = []
  for (let seed = 1; seed <= depthSeeds; seed++) depths.push(transcribeDepth(seed))
  return { fights, depths }
}
