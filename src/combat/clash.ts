/**
 * The smash: two lines meeting, lane by lane, and what it costs.
 *
 * This is the heart of the game and it is deliberately small enough to read in
 * one sitting. Four sentences are the whole rule:
 *
 *   - **higher kills lower**
 *   - **a tie kills both** — unless the enemy holds ties, and one does
 *   - **extras are safe**
 *   - **zero bones ends the run on the lane it happens, and later lanes never
 *     resolve**
 *
 * Nothing here draws a random number. The lines were thrown before this ran,
 * the outcome is a function of two sorted arrays and one content flag, and the
 * record it returns is what the presentation reads beats off. If this file ever
 * needs an `Rng` parameter, something has gone wrong upstream.
 */

import type {
  EnemyBoneInstance,
  LaneOutcome,
  LaneResult,
  RolledBone,
  SmashRecord,
  TieRule,
} from '../game/state.js'
import type { SpecialBoneInstance } from '../content/bones.js'
import { totalBones } from '../content/bones.js'

/** The living things a smash can take from. */
export interface ClashPool {
  readonly commonBones: number
  readonly specials: readonly SpecialBoneInstance[]
  readonly enemyBones: readonly EnemyBoneInstance[]
}

export interface ClashInput {
  readonly pool: ClashPool
  readonly playerLine: readonly RolledBone[]
  readonly enemyLine: readonly RolledBone[]
  readonly tieRule: TieRule
}

export interface ClashResult {
  readonly record: SmashRecord
  readonly pool: ClashPool
}

/** Which side a lane's outcome takes a bone from. */
function playerDies(result: LaneOutcome): boolean {
  return result === 'enemy' || result === 'both' || result === 'warden-hold'
}

function enemyDies(result: LaneOutcome): boolean {
  return result === 'player' || result === 'both'
}

/**
 * One lane, decided.
 *
 * The tie rule is the only branch in the game that depends on *which* enemy is
 * standing there, and it is a single content flag rather than a second hidden
 * subsystem. `warden-holds` is the whole boss: an equal lane kills the
 * player's bone and leaves the enemy's standing.
 */
function decide(player: RolledBone, enemy: RolledBone, tieRule: TieRule): LaneOutcome {
  if (player.value > enemy.value) return 'player'
  if (player.value < enemy.value) return 'enemy'
  return tieRule === 'warden-holds' ? 'warden-hold' : 'both'
}

/**
 * Take one lane's casualties out of a pool.
 *
 * Exported because the presentation replays lanes one at a time and must
 * arrive at exactly the pool the reducer already committed — the pile count on
 * screen after lane two is this function applied twice, not arithmetic the
 * view invented. A dead special is removed **by instance**: never converted to
 * a common bone, never kept alive somewhere else.
 */
export function applyLane(pool: ClashPool, lane: LaneResult): ClashPool {
  let commonBones = pool.commonBones
  let specials = pool.specials
  let enemyBones = pool.enemyBones

  if (lane.player && playerDies(lane.result)) {
    const instanceId = lane.player.specialInstanceId
    if (instanceId !== undefined) specials = specials.filter((s) => s.instanceId !== instanceId)
    else commonBones = Math.max(0, commonBones - 1)
  }
  if (lane.enemy && enemyDies(lane.result)) {
    const boneId = lane.enemy.enemyBoneId
    if (boneId !== undefined) enemyBones = enemyBones.filter((b) => b.boneId !== boneId)
  }
  return { commonBones, specials, enemyBones }
}

/** Every lane in order, applied. The prefix a presented beat is standing on. */
export function applyLanes(pool: ClashPool, lanes: readonly LaneResult[]): ClashPool {
  return lanes.reduce(applyLane, pool)
}

/**
 * Two lines, smashed.
 *
 * Paired lanes resolve left to right — which, after the sort, is highest to
 * lowest. The player total is tested **after every lane**, because a run that
 * reaches zero on lane two does not get to see lane three: the bone that would
 * have fought there is already dead, and a lane resolved out of a pile that no
 * longer exists would be the game paying out a fight the player lost.
 *
 * Extras are recorded rather than dropped. A `safe-player` or `safe-enemy`
 * lane is a visible fact — *these four of its bones never met anything* — and
 * the player chose the width that made it so.
 */
export function resolveSmash(input: ClashInput): ClashResult {
  const { playerLine, enemyLine, tieRule } = input
  const paired = Math.min(playerLine.length, enemyLine.length)

  const lanes: LaneResult[] = []
  let pool = input.pool
  let stoppedAtLane: number | undefined

  for (let lane = 0; lane < paired; lane++) {
    const player = playerLine[lane]!
    const enemy = enemyLine[lane]!
    const result = decide(player, enemy, tieRule)
    const record: LaneResult = { lane, player, enemy, result }
    lanes.push(record)
    pool = applyLane(pool, record)

    // The run can end here, and if it does, nothing further happens. Not a
    // draw, not a mutual wipe, not a lane that would have killed the last
    // enemy bone: it never resolves.
    if (totalBones(pool) === 0) {
      stoppedAtLane = lane
      break
    }
  }

  // The unpaired remainder, when the smash ran to its end. They fought nothing
  // and they cannot die; the record says so out loud so the tray can show it.
  if (stoppedAtLane === undefined) {
    for (let lane = paired; lane < playerLine.length; lane++) {
      lanes.push({ lane, player: playerLine[lane]!, result: 'safe-player' })
    }
    for (let lane = paired; lane < enemyLine.length; lane++) {
      lanes.push({ lane, enemy: enemyLine[lane]!, result: 'safe-enemy' })
    }
  }

  const record: SmashRecord = {
    lanes,
    playerCommonLost: input.pool.commonBones - pool.commonBones,
    playerSpecialsLost: lanes
      .filter((l) => l.player && playerDies(l.result) && l.player.specialInstanceId !== undefined)
      .map((l) => l.player!.specialInstanceId!),
    enemyBonesLost: lanes
      .filter((l) => l.enemy && enemyDies(l.result) && l.enemy.enemyBoneId !== undefined)
      .map((l) => l.enemy!.enemyBoneId!),
    heldTies: lanes.filter((l) => l.result === 'warden-hold').length,
    ...(stoppedAtLane !== undefined ? { stoppedAtLane } : {}),
  }

  return { record, pool }
}

/**
 * The lanes a presented beat has already shown, as a prefix of the record.
 *
 * `count` beats in, the screen is standing on `applyLanes(start, lanes)` for
 * exactly these lanes and no others.
 */
export function lanesUpTo(record: SmashRecord, count: number): readonly LaneResult[] {
  return record.lanes.slice(0, Math.max(0, count))
}

/** Every player bone key the record breaks. What the tray marks. */
export function brokenPlayerKeys(lanes: readonly LaneResult[]): ReadonlySet<string> {
  return new Set(
    lanes.filter((l) => l.player && playerDies(l.result)).map((l) => l.player!.boneKey),
  )
}

/** Every enemy bone id the record breaks. */
export function brokenEnemyKeys(lanes: readonly LaneResult[]): ReadonlySet<string> {
  return new Set(lanes.filter((l) => l.enemy && enemyDies(l.result)).map((l) => l.enemy!.boneKey))
}
