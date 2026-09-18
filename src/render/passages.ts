/**
 * What is standing in the way, drawn.
 *
 * `worldView` seats the ways a room *has*; this draws the ways it has not. A
 * maze room is four compass seats and a run rarely gets four exits, so the
 * difference between a wall and a shut road used to be invisible: the view
 * drew a hotspot or it drew nothing, and nothing looked like masonry.
 *
 * Two pictures answer it, both delivered as paintings rather than invented
 * here — rubble for an opening that has fallen in, a gate for one that is shut
 * against you — and one room answers it with a repaint of itself, because its
 * arch is most of its frame. See `content/passages.ts` for the openings and
 * `render/assets.ts` for the plates.
 *
 * **It decides nothing.** Every state below is read off the settled run the
 * reducer already produced, through the same two functions the view and the
 * reducer's GO guard use — `exitsAvailable` and `exitUnlocked` — so a barrier
 * cannot disagree with whether the press works. It is a picture of a rule that
 * is already true.
 */

import { HALL_ART_ID, PASSAGE_SEATS } from '../content/passages.js'
import type { PassageSeat, PassageState } from '../content/passages.js'
import { DIRECTIONS } from '../content/areas.js'
import { exitUnlocked, exitsAvailable, roomAt } from '../game/map.js'
import type { GameState } from '../game/state.js'
import type { Direction } from '../content/areas.js'
import { HALL_ART, PASSAGE_ART, url } from './assets.js'
import type { Asset } from './assets.js'
import type { World } from './compositor.js'

export interface SeatedPassage extends PassageSeat {
  readonly state: PassageState
}

/**
 * Every painted opening in the room the run is standing in, and its state.
 *
 * Empty for anything that is not a maze: the authored fixtures seat their ways
 * out on painted features rather than on compass seats, so an opening there is
 * a door somebody drew open and a plate over it would be a lie.
 */
export function passagesIn(state: GameState): readonly SeatedPassage[] {
  const run = state.run
  if (!run || run.map.layout !== 'maze') return []
  const here = roomAt(run)
  const seats = PASSAGE_SEATS[here.art] ?? []
  const available = exitsAvailable(run, here)
  return seats.map((seat) => {
    const exit = here.exits.find((e) => e.direction === seat.direction)
    const state: PassageState = !exit
      ? 'sealed'
      : !available
        ? 'guarded'
        : exitUnlocked(run, exit)
          ? 'open'
          : 'locked'
    return { ...seat, state }
  })
}

/**
 * The backdrop the hall wears when its way on is shut, if it is.
 *
 * `undefined` for every other room and for a hall you can walk out of, which
 * is what keeps this one exception from becoming a second backdrop system.
 */
export function hallBackdrop(state: GameState): Asset | undefined {
  const run = state.run
  if (!run || run.map.layout !== 'maze' || roomAt(run).art !== HALL_ART_ID) return undefined
  const north = passagesIn(state).find((seat) => seat.direction === 'north')
  if (!north || north.state === 'open') return undefined
  return north.state === 'sealed' ? HALL_ART.sealed : HALL_ART.locked
}

/**
 * Lay the barriers into the picture.
 *
 * One element per shut opening, positioned in the scene's own fractions the
 * way every seated thing in this game is, and rebuilt on every paint — there
 * is no state here to go stale, because what is shut is a function of the run.
 *
 * The plane is inside the midground and under the props, so a barrier is
 * behind whatever the room is holding and in front of the painting. It takes
 * no pointer events: the *press* on a locked way is the hotspot `worldView`
 * seats, and this is the picture behind it.
 */
export function showPassages(world: World, state: GameState): void {
  world.passages.replaceChildren()
  const hall = hallBackdrop(state)
  // The hall carries its north way in its own backdrop, so a plate over it
  // would be a second gate on top of the painted one.
  const carried = hall ? 'north' : undefined
  for (const seat of passagesIn(state)) {
    if (seat.state === 'open') continue
    if (seat.direction === carried) {
      world.backdrop.dataset['passage'] = seat.direction
      world.backdrop.dataset['state'] = seat.state
      continue
    }
    const plate = document.createElement('img')
    plate.className = 'passage-barrier'
    plate.alt = ''
    plate.dataset['passage'] = seat.direction
    plate.dataset['state'] = seat.state
    plate.src = url(seat.state === 'sealed' ? PASSAGE_ART.rubble : PASSAGE_ART.locked)
    plate.style.left = `${seat.x * 100}%`
    plate.style.top = `${seat.y * 100}%`
    plate.style.width = `${seat.width * 100}%`
    plate.style.height = `${seat.height * 100}%`
    world.passages.append(plate)
  }
  if (!carried) {
    delete world.backdrop.dataset['passage']
    delete world.backdrop.dataset['state']
  }
}

/**
 * Where a shut way's own verb belongs: on the thing that is shutting it.
 *
 * `undefined` when nothing is drawn in that direction, and then the exit keeps
 * the compass seat it has always had. A direction is not a thing and does not
 * want a place in the painting; a gate is, and does.
 */
export function barrierSeat(
  state: GameState,
  direction: Direction | undefined,
): { readonly x: number; readonly y: number } | undefined {
  if (!direction) return undefined
  // The hall wears its shut way as its whole backdrop, and the door fills the
  // frame, so its seat is the painted door's own middle rather than the
  // opening the plain hall has there.
  const seat = passagesIn(state).find((s) => s.direction === direction && s.state !== 'open')
  if (!seat) return undefined
  return hallBackdrop(state) ? HALL_LOCK_SEAT : { x: seat.x, y: seat.y }
}

/**
 * Where the press sits on the hall's repaint.
 *
 * The collapsed and gated halls are paintings of a door that fills most of the
 * frame, so the seat is read off them rather than off the arch the open hall
 * has: the padlock is a third of the way down, dead centre.
 */
const HALL_LOCK_SEAT = { x: 0.5, y: 0.33 }

/** Every direction, for a content check that no seat names one twice. */
export const SEATABLE = DIRECTIONS
