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
  /** Visible before a press that breaks bones. Outcomes still belong to the reducer. */
  readonly cost?: number
}

/** One art plate that is currently up, as `<art>.<frame>`. */
export interface Plate {
  readonly id: string
  readonly art: string
  readonly frame: string
  /**
   * Where the object is standing, when that is not the frame it is drawn at.
   *
   * The two are the same thing whenever a room's art was delivered a plate per
   * position — the Font's basin is drawn at the face it landed on — and then
   * this is absent. The Reliquary is the other case: it was delivered **one
   * portrait per object**, so a lit brazier and a dead one are the same plate,
   * and what tells them apart is a treatment the stylesheet puts on it.
   *
   * So this is a fact about state, not a decision about pixels. It is written
   * to the element as `data-look`, nothing here knows what CSS does with it,
   * and a room that never sets it looks exactly as it did before.
   */
  readonly look?: string
}

/**
 * One object moving, for as long as the move takes.
 *
 * The other half of `beatsFor`, for objects that were delivered one plate
 * rather than a family. A beat is *this drawing, now*; a move is **this object
 * is doing this, for this long** — and what "doing this" looks like is a named
 * animation in the stylesheet, because a chest taking a knock from the
 * mechanism under it is a shove of a plate that has already been painted
 * rather than three more paintings of it.
 *
 * The bell was the other example here until its swing was painted. When the
 * plates for a move arrive, the move becomes beats and this loses an entry —
 * which is the direction this file is meant to travel.
 *
 * It obeys every rule a beat does. It is read off the two settled states the
 * reducer already produced, it contains no logic and no randomness, it reveals
 * a fact that is in the save before it is scheduled, and with motion off it
 * simply never runs — the room lands on the same picture either way.
 */
export interface Move {
  readonly id: string
  /** The stylesheet's name for it. Written to the element as `data-move`. */
  readonly move: string
  /** How long it runs, so the sequence knows when the room is settled. */
  readonly ms: number
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
export function initialRoomState(templateId: string): RoomInteractionState | undefined {
  if (templateId === 'reliquary') {
    return { templateId, bellRung: false, brazier: 'lit', lever: 'up', chest: 'closed' }
  }
  if (templateId === 'chain-vault') {
    return { templateId, chain: 'off', cage: 'raised', pressurePlate: 'off', lever: 'up', gate: 'closed' }
  }
  if (templateId === 'offertory') {
    return { templateId, candles: 'lit', paid: false, recess: 'shut' }
  }
  return undefined
}

/**
 * The room's settled position: what was saved, or how the room opens.
 *
 * Two ids, and they are not the same question. `nodeId` says **which room** —
 * it is the key a save is written under, so two uses of one template never
 * share a chest. `templateId` says **what kind of room it is**, which is the
 * only thing an opening position can be a function of.
 */
export function stateOf(
  rooms: Readonly<Record<string, RoomInteractionState>> | undefined,
  nodeId: string,
  templateId: string,
): RoomInteractionState | undefined {
  return rooms?.[nodeId] ?? initialRoomState(templateId)
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
  if (state.templateId === 'offertory') {
    // Paid. The slot is full, the recess is open and the way on is open with
    // it: there is nothing left in the room to work, and what is left in it is
    // a thing lying in a hole.
    if (state.paid) return undefined
    switch (id) {
      case 'offertory-candles':
        return state.candles === 'lit'
          ? { label: 'PUT OUT', describe: 'Put out the candles' }
          : { label: 'LIGHT', describe: 'Light the candles' }
      case 'offertory-altar':
        // The price is on the button before it charges. Two bones, in words,
        // in the accessible name, and again in the well — the same contract
        // every carried thing in the game is held to. The carving has to have
        // been read first, and reading it takes putting the light out: the
        // slot's own carving catches what is left, exactly as the Reliquary's
        // handle does.
        return state.candles === 'out'
          ? { label: 'OFFER', describe: 'Two bones into the slot. That is what it says it costs.', cost: 2 }
          : undefined
      case 'offertory-recess':
        // The greedy press, and it is a real press with a real cost. It moves
        // nothing, and it can be made as many times as there is blood for it.
        return { label: 'PRY', describe: 'Force the stone lid. Lose 1 bone.', cost: 1 }
      default:
        return undefined
    }
  }

  if (state.templateId === 'reliquary') {
    switch (id) {
      case 'reliquary-bell':
        // Once. It has already answered; a second ring is a press that means
        // nothing, so it is not offered.
        return state.bellRung ? undefined : { label: 'RING', describe: 'Ring the ritual bell' }
      case 'reliquary-brazier':
        return state.brazier === 'lit'
          ? { label: 'PUT OUT', describe: 'Put out the candles' }
          : { label: 'LIGHT', describe: 'Light the candles' }
      case 'reliquary-lever':
        // The condition *is* the puzzle, so it is never shown half-met. Until
        // the bell has rung and the flame is out, the altar is a thing you can
        // look at and read the three marks cut beside its handle.
        return state.bellRung && state.brazier === 'out' && state.chest === 'closed'
          ? { label: 'PULL', describe: 'Pull the handle under the basin' }
          : undefined
      // There is no `reliquary-chest` case, and its absence is the ruling: the
      // chest is a container, not a button that pays out. What opening it does
      // is put **a thing in the room**, and taking that thing is a press on the
      // thing rather than on the furniture around it.
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
      return state.cage === 'raised'
        ? { label: 'PULL', describe: 'Pull the iron lever. The unweighted gate costs 1 bone.', cost: 1 }
        : { label: 'PULL', describe: 'Pull the iron lever' }
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
  if (state.templateId === 'reliquary') return true
  // The Offertory is a toll, so the way out is what the toll buys.
  if (state.templateId === 'offertory') return state.paid
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
  // The Offertory borrows the Reliquary's three portraits — an altar, a candle
  // stand and a chest standing in for the wall recess — over the Choir's
  // backdrop. **Nothing was painted for it**, and the borrowing is recorded
  // under `## HUMAN ART REQUIRED`: the objects are in the right places because
  // those are the places their plates were staged at, not because a room was
  // drawn around them.
  if (state.templateId === 'offertory') {
    return [
      { id: 'offertory-altar', art: 'altar', frame: 'still', look: state.paid ? 'down' : 'up' },
      { id: 'offertory-candles', art: 'brazier', frame: 'lit', look: state.candles },
      { id: 'offertory-recess', art: 'chest', frame: 'closed', look: state.recess === 'open' ? 'open' : 'closed' },
    ]
  }

  if (state.templateId === 'reliquary') {
    // Four objects, four portraits, and the order is back to front: the altar
    // is the hero on the floor, the bell hangs over it, and the candles and the
    // chest sit low on either side. None of them overlaps another, so the order
    // is composition rather than occlusion — but it is stated, because the
    // midground paints in the order it is given.
    //
    // Three of the frames below are the one plate that exists for that object,
    // and their position is in `look` — which is why putting the flame out and
    // opening the chest leave the object **on screen** instead of asking for a
    // plate nobody painted and vanishing. The bell is the exception and the
    // shape the other three are waiting for: it has plates of its own, so its
    // settled frame is `idle` and the swing between them is `beatsFor`.
    return [
      { id: 'reliquary-altar', art: 'altar', frame: 'still', look: state.lever },
      { id: 'reliquary-bell', art: 'bell', frame: 'idle', look: state.bellRung ? 'rung' : 'still' },
      { id: 'reliquary-brazier', art: 'brazier', frame: 'lit', look: state.brazier },
      { id: 'reliquary-chest', art: 'chest', frame: 'closed', look: state.chest },
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

  // The bell is the Reliquary's one family, and ringing it is the one thing in
  // that room that is authored rather than treated: four plates of a bell
  // part-way over, registered to each other on the bar, and then the bell
  // hanging again. The swing decays — the plates are 15°, 15° back, 7° and 4°
  // — and the last beat is `idle`, which is also what a reload lands on, so
  // settling early and never seeing it lose nothing but the middle.
  //
  // Eighty milliseconds a frame, which is the 380ms the CSS rotation took plus
  // the one beat that puts the bell back.
  if (before.templateId === 'reliquary' && after.templateId === 'reliquary') {
    if (!before.bellRung && after.bellRung) {
      at('reliquary-bell', 'bell', 'ring-1', 0)
      at('reliquary-bell', 'bell', 'ring-2', 80)
      at('reliquary-bell', 'bell', 'ring-3', 160)
      at('reliquary-bell', 'bell', 'ring-4', 240)
      at('reliquary-bell', 'bell', 'idle', 320)
    }
    // The altar and the chest are still portraits, and the shock that runs
    // between them is still a move. See `movesFor`.
    return beats
  }

  // The Offertory's plates are portraits, so it has no beats and its two moves
  // — the altar taking the offering, the lid grinding back — are in `movesFor`.
  if (before.templateId !== 'chain-vault' || after.templateId !== 'chain-vault') return beats

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
    // taken the bone for it — and the lever is up again because nothing was
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

/**
 * What is moving, and for how long.
 *
 * The same contract as `beatsFor` and read off the same two settled states: an
 * object moves because the save already says it moved, never because a press
 * was made. A room whose art is a family of positions wants beats; a room whose
 * art is one portrait per object wants these.
 *
 * The Reliquary is **both** since the swing was painted. The bell is a family
 * now and it rings in `beatsFor`, on plates a painter drew. What is left here
 * is the two objects still delivered as portraits: the chest is knocked by the
 * mechanism under it, and the altar takes the shock of the mechanism it
 * contains — which is the whole of what "something moves inside the altar" can
 * be shown as, until a lever is painted.
 *
 * Putting the flame out is deliberately not here. It is not a movement, it is a
 * change of what the object *is*: the plate goes cold and stays cold, `look`
 * carries it, and the stylesheet crosses between them. A move would have to end.
 */
export function movesFor(
  before: RoomInteractionState,
  after: RoomInteractionState,
  id: string,
): readonly Move[] {
  if (before.templateId === 'offertory' && after.templateId === 'offertory') {
    const moves: Move[] = []
    if (!before.paid && after.paid) {
      moves.push({ id: 'offertory-altar', move: 'work', ms: 240 })
      moves.push({ id: 'offertory-recess', move: 'knock', ms: 330 })
    } else if (id === 'offertory-recess') {
      // It was pried at and it did not move. The knock *is* the answer, and it
      // is the same drawing the recess makes when it opens — which is the
      // point: the room looks for a moment as though it worked.
      moves.push({ id: 'offertory-recess', move: 'knock', ms: 330 })
    }
    return moves
  }
  if (before.templateId !== 'reliquary' || after.templateId !== 'reliquary') return []
  const moves: Move[] = []
  if (before.lever !== after.lever) {
    moves.push({ id: 'reliquary-altar', move: 'work', ms: 240 })
    moves.push({ id: 'reliquary-chest', move: 'knock', ms: 330 })
  }
  return moves
}

/** How long a transition runs, so the caller knows when the room is settled. */
export function beatsDuration(beats: readonly Beat[]): number {
  return beats.reduce((last, b) => Math.max(last, b.at), 0)
}

/** The same question for the objects that move rather than change drawing. */
export function movesDuration(moves: readonly Move[]): number {
  return moves.reduce((last, m) => Math.max(last, m.ms), 0)
}
