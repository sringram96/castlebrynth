/**
 * src/hinge — fight-doors, the advance, death routing (art. 30).
 *
 * The doorway between the two engines: exploration delivers you to
 * violence, violence returns you to exploration, and the forward-only
 * ratchet governs both.
 *
 * art. 30 is honoured minimally this tranche: there is no battle screen,
 * the fight is the room with the thing come close, and `advance` hands back
 * a prop the same renderer paints into the same box. Staging the approach
 * is a motion, and motions that matter come later.
 */

import type { Door } from '../gen/index.js'
import { reseed } from '../gen/index.js'
import type { Fight, Goods, Horror, Lot, Resolution } from '../lots/index.js'
import { openFight } from '../lots/index.js'
import type { Ledgers, RoomId } from '../state/index.js'
import { die, wake, wounded } from '../state/index.js'
import type { Brush, Prop } from '../room/index.js'

/** A door that is a fight. Opening it does not change rooms. */
export interface FightDoor {
  readonly door: Door
  readonly horror: Horror
}

/**
 * art. 30: there is no battle screen. A fight is the room with the thing
 * come close — the horror advances to the near depth and fills the lens,
 * the tray turns to combat, and the word keeps narrating.
 */
export interface Advance {
  /** The horror as a prop at the near depth, painted into the same room. */
  readonly prop: Prop
  /** How far in it has come, 0 at the mouth and 1 at the lens. */
  readonly closeness: number
}

/**
 * art. 63: a fight-door opens on a fresh card. The run's own health and
 * armor come with you; nothing about the room changes.
 */
export function openFightDoor(
  ledgers: Ledgers,
  door: FightDoor,
  goods: Goods = { talismans: [], riders: [] },
): Fight {
  const run = ledgers.run
  if (run === null) throw new Error('no run to fight with')
  return openFight(door.horror, run.hand, run.health, run.armor, goods)
}

/** The advance is a motion that matters, so it never undoes itself (art. 28). */
export function advance(fight: Fight): Advance {
  // It comes the whole way at once this tranche: the approach is a motion,
  // and motions are the design pass's, not the skeleton's.
  const closeness = fight.outcome === 'fighting' ? 1 : 0
  return { closeness, prop: horrorProp(fight, closeness) }
}

/**
 * The horror as a mass at the near depth. Deliberately basic: art. 26's
 * first tier is the computed box plus sprites, improved over time, and the
 * hero plate is a later phase.
 */
function horrorProp(fight: Fight, closeness: number): Prop {
  const wounded = Math.max(0, fight.horrorHealth / Math.max(1, fight.horror.health))
  return {
    name: fight.horror.id,
    z: 1,
    paint(brush: Brush): void {
      const { frame } = brush.view
      const half = frame.width * (0.18 + 0.22 * closeness)
      const top = frame.cy - frame.height * 0.22 * closeness
      const foot = frame.cy + frame.height * 0.3 * closeness
      for (let y = top; y < foot; y++) {
        for (let x = frame.cx - half; x < frame.cx + half; x++) {
          const edge = 1 - Math.abs(x - frame.cx) / half
          if (brush.dither(x, y, edge * 12 * wounded + 2)) brush.px('#050506', x, y)
        }
      }
      // Two marks where the eyes are. The rest is mass, dark and quiet.
      const eye = frame.height * 0.06
      brush.rect('#d8d0c0', frame.cx - half * 0.34, top + eye, 2, 2)
      brush.rect('#d8d0c0', frame.cx + half * 0.34, top + eye, 2, 2)
    },
  }
}

/** Where a resolved turn sends the player: on, out, or to the Crossing. */
export type Exit = 'fight-continues' | 'room-continues' | 'death' | 'fled'

export function routeTurn(fight: Fight, resolution: Resolution): Exit {
  if (resolution.fled || fight.outcome === 'fled') return 'fled'
  switch (fight.outcome) {
    case 'won':
      return 'room-continues'
    case 'lost':
      return 'death'
    default:
      return 'fight-continues'
  }
}

/**
 * Death: the run burns, one line goes into the Book of Ends, the doors
 * reseed, and you wake at the Crossing (arts 11, 32).
 */
export function routeDeath(ledgers: Ledgers, cause: string): Ledgers {
  const run = ledgers.run
  if (run === null) throw new Error('no run to burn')
  return wake(die(ledgers, cause), reseed(run.seed))
}

/**
 * What the fight did to you, carried back into the run. A fight is the room
 * with the thing come close (art. 30), so nothing else about the run moves.
 */
export function carryOut(ledgers: Ledgers, fight: Fight): Ledgers {
  const run = ledgers.run
  if (run === null) return ledgers
  return { ...ledgers, run: wounded(run, fight.yourHealth) }
}

/**
 * A fled fight is discarded and the room is where you still are. Re-entering
 * the door starts the fight fresh, card and wounds and all.
 *
 * This is the skeleton's simplification, ruled on 2026-08-04. The real
 * ruling — a fled fight pauses, its card and its wounds persisting — is
 * deferred, and the debt is written down in DESIGN.md.
 */
export function routeFlight(ledgers: Ledgers): Ledgers {
  return ledgers
}

/** Which room the fight was fought at the door of (art. 30: it never moves). */
export function roomOf(ledgers: Ledgers): RoomId | null {
  return ledgers.run?.at.room ?? null
}

/** The lot a fight is thrown with, so the caller need not invent one. */
export type FightLot = Lot
