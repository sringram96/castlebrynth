/**
 * What a room's objects are doing, and what may be done to them.
 *
 * One file, and it is the only place these rooms' rules are written down. The
 * reducer asks it *may this press happen*; the view asks it *what verb is on
 * this object, and is there one at all*; the compositor asks it *which frame is
 * up*; the sequence asks it *what changed between these two states*. Four
 * questions, four functions, one table each.
 *
 * The split that matters is the one this file exists to keep:
 *
 *   - **it decides nothing.** Every function is total and pure over a state the
 *     reducer already produced. `legal` says whether an action applies; it does
 *     not apply it. `platesFor` says which picture goes with a state; it cannot
 *     reach a state.
 *   - **it owns no state.** Nothing here is stored. `initialRoomState` is
 *     content — the position a room's objects start in — not a value a new run
 *     writes out, which is why an untouched room has no entry in `run.rooms`
 *     and a save carries only rooms that were actually worked.
 *
 * That is what keeps `reduce()` the only producer of a `GameState` while the
 * rules themselves stay in content, where a room's behaviour is legible beside
 * the room's copy rather than spread through a switch.
 */

import type { RoomInteractionState } from '../game/state.js'

/** What the player is offered on an object, or nothing because it is not. */
export interface InteractionAction {
  /** Two words or fewer — it goes on a button. */
  readonly label: string
  readonly describe: string
}

/** One art plate that is currently up, as `<art>.<frame>`. */
export interface Plate {
  readonly id: string
  readonly art: string
  readonly frame: string
}

/** One beat of a transition: put this frame up at this many ms from the press. */
export interface Beat {
  readonly id: string
  readonly art: string
  readonly frame: string
  readonly at: number
}

/**
 * Where a room's objects stand before anything has happened to them.
 *
 * Content, not a constructor. A room with no entry in `run.rooms` *is* this
 * state — `stateOf` falls back to it — so a fresh run writes nothing, a save
 * carries only rooms that were touched, and there is exactly one statement
 * anywhere of how a room opens.
 */
export function initialRoomState(roomId: string): RoomInteractionState | undefined {
  if (roomId === 'reliquary') {
    return { roomId, bellRung: false, brazier: 'lit', lever: 'up', chest: 'closed', claimed: false }
  }
  if (roomId === 'chain-vault') {
    return { roomId, chain: 'off', cage: 'raised', pressurePlate: 'off', lever: 'up', gate: 'closed' }
  }
  return undefined
}

/** The room's settled position: what was saved, or how the room opens. */
export function stateOf(
  rooms: Readonly<Record<string, RoomInteractionState>> | undefined,
  roomId: string,
): RoomInteractionState | undefined {
  return rooms?.[roomId] ?? initialRoomState(roomId)
}

/**
 * The verb currently on an object, or nothing because there is not one.
 *
 * `undefined` is the whole point of the return type. `CONTRIBUTING.md`'s input
 * contract is that an unavailable action is **hidden, never shown disabled** —
 * a greyed PULL is the interface refusing to say what it wants — so the view
 * renders a button only where this answers, and the reducer rejects anything
 * this does not. One table, both jobs, and they cannot drift apart.
 */
export function actionFor(state: RoomInteractionState, id: string): InteractionAction | undefined {
  if (state.roomId === 'reliquary') {
    switch (id) {
      case 'reliquary-bell':
        // Once. It has already answered; a second ring is a press that means
        // nothing, so it is not offered.
        return state.bellRung ? undefined : { label: 'RING', describe: 'Ring the ritual bell' }
      case 'reliquary-brazier':
        return state.brazier === 'lit'
          ? { label: 'PUT OUT', describe: 'Extinguish the brazier' }
          : { label: 'LIGHT', describe: 'Light the brazier' }
      case 'reliquary-lever':
        // The condition *is* the puzzle, so it is never shown half-met. Until
        // the bell has rung and the flame is out, the lever is a thing you can
        // look at and read the three cuts beside.
        return state.bellRung && state.brazier === 'out' && state.chest === 'closed'
          ? { label: 'PULL', describe: 'Pull the skull lever' }
          : undefined
      case 'reliquary-chest':
        return state.chest === 'open' && !state.claimed
          ? { label: 'TAKE', describe: 'Take what is inside the reliquary' }
          : undefined
      default:
        return undefined
    }
  }

  // The vault. Once the gate is up the machinery is spent: both controls go,
  // and the only thing left in the room is the way on.
  if (state.gate === 'open') return undefined
  switch (id) {
    case 'vault-chain':
      return state.cage === 'raised'
        ? { label: 'LOWER', describe: 'Lower the hanging cage' }
        : { label: 'RAISE', describe: 'Raise the hanging cage' }
    case 'vault-lever':
      return { label: 'PULL', describe: 'Pull the iron lever' }
    default:
      return undefined
  }
}

/** Whether a press is one the room currently offers. The reducer's guard. */
export function legal(state: RoomInteractionState, id: string): boolean {
  return actionFor(state, id) !== undefined
}

/**
 * Whether the room lets you leave.
 *
 * One statement, read by the reducer's `GO` and by the view that draws the
 * exits, so "the gate is shut" cannot be true in state and false on screen.
 * The reducer's copy is the authoritative one; the view's is what keeps a
 * button that would be rejected from ever being drawn.
 */
export function exitsOpen(state: RoomInteractionState | undefined): boolean {
  if (!state) return true
  // The Reliquary is optional in the strongest sense: its puzzle has no bearing
  // on the way out at all.
  if (state.roomId === 'reliquary') return true
  return state.gate === 'open'
}

/**
 * Every plate that is up, for a settled room.
 *
 * Derived wholly from state and in a fixed order, so the midground is a pure
 * function of the save. Nothing here remembers a frame: reloading into a room
 * mid-puzzle paints the same pictures as never having left it, which is the
 * property `## 16 settled rendering` is asking for.
 */
export function platesFor(state: RoomInteractionState): readonly Plate[] {
  if (state.roomId === 'reliquary') {
    return [
      { id: 'reliquary-bell', art: 'bell', frame: state.bellRung ? 'settle' : 'idle' },
      { id: 'reliquary-brazier', art: 'brazier', frame: state.brazier },
      { id: 'reliquary-lever', art: 'lever', frame: state.lever },
      { id: 'reliquary-chest', art: 'chest', frame: state.chest },
    ]
  }
  return [
    { id: 'vault-panel', art: 'panel', frame: 'still' },
    { id: 'vault-chain', art: 'chain', frame: state.chain },
    { id: 'vault-cage', art: 'cage', frame: state.cage },
    { id: 'vault-plate', art: 'plate', frame: state.pressurePlate },
    { id: 'vault-lever', art: 'lever', frame: state.lever },
    { id: 'vault-gate', art: 'gate', frame: state.gate },
  ]
}

/**
 * The in-between frames, and when each goes up.
 *
 * Read off the two settled states the reducer already produced — never off the
 * action, and never off anything this file could decide. A beat is a picture of
 * a fact that is in the save before the first of them is scheduled, which is
 * why settling early, reloading, or turning motion off all land on `platesFor`
 * of the same state and lose nothing but the middle.
 *
 * The numbers are here rather than in `app/app.ts` for the reason `defeat.ts`
 * holds a death's: how long a thing takes to fall over is a property of the
 * thing, and the sequence's job is to run a list, not to author one.
 */
export function beatsFor(
  before: RoomInteractionState,
  after: RoomInteractionState,
  id: string,
): readonly Beat[] {
  const beats: Beat[] = []
  const at = (id: string, art: string, frame: string, ms: number): void => {
    beats.push({ id, art, frame, at: ms })
  }

  if (before.roomId === 'reliquary' && after.roomId === 'reliquary') {
    if (!before.bellRung && after.bellRung) {
      at('reliquary-bell', 'bell', 'ring-1', 0)
      at('reliquary-bell', 'bell', 'ring-2', 90)
      at('reliquary-bell', 'bell', 'settle', 190)
    }
    if (before.brazier !== after.brazier) {
      if (after.brazier === 'out') {
        at('reliquary-brazier', 'brazier', 'dim', 90)
        at('reliquary-brazier', 'brazier', 'out', 260)
      } else {
        at('reliquary-brazier', 'brazier', 'igniting', 90)
        at('reliquary-brazier', 'brazier', 'lit', 260)
      }
    }
    if (before.lever !== after.lever) {
      at('reliquary-lever', 'lever', 'pulling', 0)
      at('reliquary-lever', 'lever', 'down', 150)
      // The chest is already open in state; this is only the stone moving.
      at('reliquary-chest', 'chest', 'opening', 150)
      at('reliquary-chest', 'chest', 'open', 330)
    }
    return beats
  }

  if (before.roomId !== 'chain-vault' || after.roomId !== 'chain-vault') return beats

  if (before.cage !== after.cage) {
    const lowering = after.cage === 'lowered'
    at('vault-chain', 'chain', 'pulling', 0)
    at('vault-chain', 'chain', after.chain, 300)
    if (lowering) {
      at('vault-cage', 'cage', 'lowering-1', 90)
      at('vault-cage', 'cage', 'lowering-2', 220)
      at('vault-cage', 'cage', 'lowered', 340)
      at('vault-plate', 'plate', 'on', 380)
    } else {
      at('vault-cage', 'cage', 'lowering-2', 90)
      at('vault-cage', 'cage', 'lowering-1', 220)
      at('vault-cage', 'cage', 'raised', 340)
      at('vault-plate', 'plate', 'off', 120)
    }
  }

  if (before.lever !== after.lever) {
    at('vault-lever', 'lever', 'pull-1', 0)
    at('vault-lever', 'lever', 'pull-2', 110)
    at('vault-lever', 'lever', 'down', 220)
  } else if (id === 'vault-lever') {
    // It moved and came back. The pull happened — the reducer has already
    // taken the health for it — and the lever is up again because nothing was
    // holding the plate. Two frames, and the second one is where it started:
    // the snap back is the feedback, and it has to be quicker than the pull
    // that earned it or it reads as a second deliberate press.
    at('vault-lever', 'lever', 'pull-1', 0)
    at('vault-lever', 'lever', 'up', 150)
  }

  if (before.gate !== after.gate) {
    at('vault-gate', 'gate', 'opening-1', 260)
    at('vault-gate', 'gate', 'opening-2', 400)
    at('vault-gate', 'gate', 'open', 540)
  }

  return beats
}

/** How long a transition runs, so the caller knows when the room is settled. */
export function beatsDuration(beats: readonly Beat[]): number {
  return beats.reduce((last, b) => Math.max(last, b.at), 0)
}
