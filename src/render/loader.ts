/**
 * Staged asset loading.
 *
 * The game used to decode **every file in the manifest before the title
 * screen**, and that was tolerable only while the whole payload was a couple
 * of megabytes. It is the wrong architecture the moment art coverage stops
 * being rationed by a global byte ceiling: a fifth authored pose for the
 * Marrow should cost the Marrow's fight, not the boot.
 *
 * So loading is staged, and the policy is one sentence: **decode what the
 * screen needs, then decode what the screen after it will need.** Everything
 * else waits until somebody walks towards it.
 *
 * Two properties make that safe rather than merely lazy:
 *
 *   - **promises are cached.** The same file is requested once however many
 *     times it is asked for, so a room visited twice decodes once and a
 *     sequence that asks for its own frames finds them already resolved.
 *   - **nothing blocks a press.** A load is never awaited on the input path.
 *     The one place readiness gates anything is FIGHT — see `encounterReady` —
 *     and that is a *content* requirement rather than a loading one: an
 *     opponent may not appear halfway through its own fight.
 */

import {
  AMBIENT_ART,
  ENEMY_ART,
  HAND_ART,
  PROP_ART,
  ROOM_ART,
  TRAY_ART,
  enemyArt,
  roomArt,
  url,
} from './assets.js'
import type { Asset } from './assets.js'
import { enemy } from '../content/enemies.js'
import { template } from '../content/rooms.js'
import { roomAt } from '../game/map.js'
import type { GameState, RunState } from '../game/state.js'

/**
 * Decodes images, once each, and remembers what it has.
 *
 * `ready` is synchronous and is the only question the rest of the game asks:
 * *can I show this now.* Everything else is fire-and-forget.
 */
export class AssetLoader {
  private readonly pending = new Map<string, Promise<void>>()
  private readonly done = new Set<string>()
  /** Files that failed. Reported once at boot, and never retried in a loop. */
  readonly failures: string[] = []

  load(asset: Asset): Promise<void> {
    const key = asset.file
    const existing = this.pending.get(key)
    if (existing) return existing
    const promise = new Promise<void>((resolve) => {
      if (typeof Image !== 'function') {
        this.done.add(key)
        return resolve()
      }
      const img = new Image()
      img.onload = () => {
        this.done.add(key)
        resolve()
      }
      img.onerror = () => {
        this.failures.push(asset.id)
        // Resolved, not rejected. A missing file is a build fault that is
        // reported loudly at boot; it is not a reason for a sequence awaiting
        // this to hang forever in front of a player.
        resolve()
      }
      img.src = url(asset)
    })
    this.pending.set(key, promise)
    return promise
  }

  loadAll(assets: readonly Asset[]): Promise<void> {
    return Promise.all(assets.map((a) => this.load(a))).then(() => undefined)
  }

  ready(asset: Asset): boolean {
    return this.done.has(asset.file)
  }

  /** What has actually been decoded. Read by the loading tests, nothing else. */
  get decoded(): readonly string[] {
    return [...this.done]
  }

  /** What has been asked for, decoded or not. */
  get requested(): readonly string[] {
    return [...this.pending.keys()]
  }

  allReady(assets: readonly Asset[]): boolean {
    return assets.every((a) => this.ready(a))
  }
}

/**
 * Everything a room's own picture is made of.
 *
 * By **template**, because art is a property of the place rather than of which
 * instance of it a run is standing in: two Reliquaries in one descent are two
 * rooms and one set of plates, decoded once.
 */
export function roomAssets(templateId: string): readonly Asset[] {
  const here = template(templateId)
  const out: Asset[] = [roomArt(here.art)]
  if (here.ritual) {
    for (const [key, asset] of Object.entries(PROP_ART)) {
      if (key.startsWith(`${here.ritual.art}.`)) out.push(asset)
    }
  }
  for (const thing of here.interactables ?? []) {
    for (const [key, asset] of Object.entries(PROP_ART)) {
      if (key.startsWith(`${thing.art}.`)) out.push(asset)
    }
  }
  for (const [key, asset] of Object.entries(AMBIENT_ART)) {
    if (key.startsWith(`${templateId}.`)) out.push(asset)
  }
  return dedupe(out)
}

/**
 * Every plate of one encounter: its stages, its poses, its death.
 *
 * By prefix rather than by an enumerated list, so a pose added to the manifest
 * is loaded by the fight that needs it without a second place to remember.
 */
export function encounterAssets(enemyId: string): readonly Asset[] {
  const art = enemy(enemyId).art
  const out = Object.entries(ENEMY_ART)
    .filter(([key]) => key === art || key.startsWith(`${art}.`))
    .map(([, asset]) => asset)
  return dedupe([...out, ...Object.values(HAND_ART)])
}

/**
 * The plates a fight may not open without.
 *
 * The body it is standing in and the plates the combat sequences reach for.
 * FIGHT is not offered until these are decoded — an opponent that appears
 * three lanes into its own smash is worse than a moment's wait.
 */
export function encounterCriticalAssets(enemyId: string): readonly Asset[] {
  return dedupe([enemyArt(enemy(enemyId).art), ...encounterAssets(enemyId).slice(0, 4)])
}

/**
 * What the state on screen cannot be drawn without.
 *
 * Boot is the title and the tray. A room is its backdrop, its props and the
 * body of whatever is standing in it. Nothing here reaches past the room the
 * player is in.
 */
export function criticalAssetsForState(state: GameState): readonly Asset[] {
  const run = state.run
  if (!run || state.mode === 'title') {
    return dedupe([roomArt('threshold'), TRAY_ART])
  }
  const here = roomAt(run)
  const out: Asset[] = [TRAY_ART, ...roomAssets(here.id)]
  if (here.enemy && !run.cleared.includes(run.roomId)) {
    out.push(...encounterCriticalAssets(here.enemy))
  }
  if (state.mode === 'complete') out.push(roomArt('brazier'))
  return dedupe(out)
}

/**
 * What the player is about to walk into.
 *
 * The rooms directly reachable from here, plus the rest of the encounter
 * family if there is something still standing in this one. Fetched in the
 * background while the room is being read, which is the whole trick: the
 * expensive family arrives during the seconds in which nothing is happening.
 */
export function likelyNextAssets(state: GameState): readonly Asset[] {
  const run = state.run
  if (!run || state.mode === 'title') return dedupe(Object.values(ROOM_ART).slice(0, 2))
  const here = roomAt(run)
  const out: Asset[] = []
  if (here.enemy && !run.cleared.includes(run.roomId)) out.push(...encounterAssets(here.enemy))
  // The map's exits, resolved node by node. A generated descent means the room
  // ahead is not knowable from content — only the run knows where it leads.
  for (const exit of here.exits) {
    const next = nextRoom(run, exit.to)
    if (!next) continue
    out.push(roomArt(next.art))
    if (next.enemy) out.push(enemyArt(enemy(next.enemy).art))
  }
  return dedupe(out)
}

/**
 * The room one exit away, or nothing because the map does not go there.
 *
 * Defensive rather than throwing: prefetching is best-effort, and a missing
 * node is a reason to fetch less art rather than to fail a paint.
 */
function nextRoom(run: RunState, nodeId: string): ReturnType<typeof roomAt> | undefined {
  try {
    return roomAt(run, nodeId)
  } catch {
    return undefined
  }
}

function dedupe(assets: readonly Asset[]): readonly Asset[] {
  const seen = new Set<string>()
  return assets.filter((a) => !seen.has(a.file) && seen.add(a.file))
}
