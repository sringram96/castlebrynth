/**
 * src/hinge — fight-doors, the advance, death routing, and the fight that
 * survives the lock screen (arts 30, 63, 75).
 *
 * The doorway between the two engines: exploration delivers you to
 * violence, violence returns you to exploration, and the forward-only
 * ratchet governs both.
 *
 * Two laws land here rather than in `src/lots`, because both are about a
 * fight's place in a *run* and not about the duel:
 *
 * - **art. 75** — a half-spent turn survives the lock screen. A fight is
 *   written down as a `FightSave` and read back by replaying its castings
 *   from the run's own seed, so the dice never have to be stored.
 * - **art. 63** — a fled fight *pauses*. Its card stays spent and its
 *   wounds stay open; only a win or a death lets the card refill.
 */

import type { Door } from '../gen/index.js'
import { lotFrom, reseed } from '../gen/index.js'
import type { DieId, Fight, Goods, Horror, Ladder, Lot, Resolution, Turn } from '../lots/index.js'
import {
  cast,
  casting,
  claim,
  keep,
  keptAtRecast,
  openFight,
  openTurn,
  recast,
  refill,
} from '../lots/index.js'
import type { FightPhase, FightSave, InstanceId, Ledgers, Seed } from '../state/index.js'
import { die, fighting, tookIntoRun, wake, wounded } from '../state/index.js'
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

/**
 * What a horror looks like coming at you, as a function of how far in it
 * has come. Content may hand one over (art. 100: a thing meant to be
 * recognised is drawn once, by hand); what it hands over is a `Prop`, so
 * this module still knows nothing about drawings, ramps or schools.
 */
export type ComingCloser = (fight: Fight, closeness: number) => Prop

/**
 * art. 28: the advance is a motion that matters, so it never undoes itself.
 * art. 1: any pulse in presentation is skin — the caller may hand it a
 * closeness of 1 at any moment and the end state is settled and the same.
 *
 * art. 26's first tier is the default body: a mass, deliberately basic and
 * improved over time. A horror that has been drawn brings its own.
 */
export function advance(fight: Fight, closeness = 1, body: ComingCloser = horrorProp): Advance {
  const settled = fight.outcome === 'fighting' ? Math.min(1, Math.max(0, closeness)) : 0
  return { closeness: settled, prop: body(fight, settled) }
}

/**
 * The horror as a mass at the near depth. Deliberately basic: art. 26's
 * first tier is the computed box plus sprites, improved over time, and the
 * hero plate is a later phase.
 *
 * art. 70: a wounded horror stays wounded — the mass thins as its health
 * goes, so the pixels say what the numbers say.
 */
function horrorProp(fight: Fight, closeness: number): Prop {
  const whole = Math.max(0, fight.horrorHealth / Math.max(1, fight.horror.health))
  return {
    name: fight.horror.id,
    z: 1,
    paint(brush: Brush): void {
      const { frame } = brush.view
      const half = frame.width * (0.13 + 0.3 * closeness)
      const top = frame.cy - frame.height * (0.02 + 0.26 * closeness)
      const foot = frame.cy + frame.height * (0.04 + 0.3 * closeness)
      for (let y = top; y < foot; y++) {
        const down = (y - top) / (foot - top)
        // Wider at the shoulders, narrowing at the floor it drags on.
        const reach = half * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, down * 1.15)))
        for (let x = frame.cx - reach; x < frame.cx + reach; x++) {
          const edge = 1 - Math.abs(x - frame.cx) / reach
          // art. 17: the mass is dither, never alpha. A hurt one shows through.
          if (brush.dither(x, y, 2 + edge * (4 + 12 * whole))) brush.px('#050506', x, y)
          else if (brush.dither(x + 2, y, edge * 3 * whole)) brush.px('#0d0c10', x, y)
        }
      }
      if (closeness < 0.35) return
      // Detail hoarded at the eyes; the rest is mass, dark and quiet (art. 26).
      const eye = frame.height * 0.05 + (foot - top) * 0.16
      const wide = half * 0.36
      const mark = Math.max(1, Math.round(frame.width / 120))
      brush.rect('#d8d0c0', frame.cx - wide, top + eye, mark, mark)
      brush.rect('#d8d0c0', frame.cx + wide, top + eye, mark, mark)
      brush.rect('#3a2b22', frame.cx - wide - mark, top + eye + mark, mark * 3, mark)
      brush.rect('#3a2b22', frame.cx + wide - mark, top + eye + mark, mark * 3, mark)
    },
  }
}

// ── art. 75: the fight, written down ───────────────────────────────────

/**
 * art. 36: the lot a casting is thrown with derives from the run's seed, the
 * step in the chain, the turn number and which casting it is — nothing else.
 *
 * Per *casting* and not per turn, deliberately. The shell is stateless
 * between paints, so it cannot hold a half-spent generator; giving each
 * casting its own lot means the first casting and the second are each a pure
 * function of where you are, which is what lets art. 75 replay a turn
 * instead of storing its dice.
 *
 * It is also why running cannot reroll a fight: the same turn, thrown again,
 * throws the same way (art. 63).
 */
export function turnLot(
  seed: Seed,
  step: number,
  turnNumber: number,
  castingNumber: number,
): Lot {
  const from =
    (seed as number) + step * 1009 + turnNumber * 31 + castingNumber * 7919
  return lotFrom(reseed(from as unknown as Seed))
}

/** The lots of one turn, so a caller need not remember the arithmetic. */
export type Lots = (castingNumber: number) => Lot

export function turnLots(seed: Seed, step: number, turnNumber: number): Lots {
  return (castingNumber) => turnLot(seed, step, turnNumber, castingNumber)
}

/** A fight, the thumb's place in it, and whether the thing has come close. */
export interface Standing {
  readonly fight: Fight
  readonly phase: FightPhase
  readonly selected: readonly DieId[]
  readonly advanced: boolean
}

/**
 * art. 75: everything the fight cannot derive, written small. The dice are
 * not in here — `turnLot` makes them derivable — but the keep set that
 * produced them is, because it is what the thumb did.
 */
export function saveFight(
  fight: Fight,
  at: InstanceId,
  phase: FightPhase,
  selected: readonly DieId[],
  advanced: boolean,
  engaged: boolean,
): FightSave {
  const turn = fight.turn
  return {
    horror: fight.horror.id,
    at,
    horrorHealth: fight.horrorHealth,
    yourHealth: fight.yourHealth,
    turnNumber: fight.turnNumber,
    kept: keptAtRecast(turn),
    castingsSpent: turn.castings.length,
    // art. 65: what the last intent took off this turn, and what is still
    // running in you. Neither derives from the seed, so both are written.
    bound: turn.bound,
    bleed: fight.bleed,
    card: turn.card,
    claims: turn.claims.map((made) => ({
      line: made.line,
      dice: made.dice.map((landed) => landed.die),
    })),
    phase,
    selected,
    advanced,
    engaged,
  }
}

/**
 * The other half of art. 75: the fight, read back. The castings are replayed
 * from the same lot rather than restored from bytes, so the faces are the
 * faces they were; the claims are re-made, so the card lands as spent.
 *
 * The event log does not survive. It is a transcript of what was said, and
 * the word band has already said it — nothing reads it back.
 */
export function restoreFight(
  save: FightSave,
  ledgers: Ledgers,
  horror: Horror,
  ladder: Ladder,
  goods: Goods,
  lots: Lots,
): Standing {
  const run = ledgers.run
  if (run === null) throw new Error('no run to restore a fight into')

  // The card as this turn opened: claiming spends, so unspending the claims
  // this turn made gives it back (art. 63).
  let opening = save.card
  for (const made of save.claims) opening = refill(opening, made.line)

  const intent = horror.intentFor(save.turnNumber)
  // art. 65: the turn re-opens as short as it was. The bound set is replayed
  // before the cast, so the dice that land are the dice that landed.
  let turn: Turn = openTurn(run.hand, intent, opening, save.bound)
  if (save.castingsSpent >= 1) turn = cast(turn, lots(1))
  if (save.castingsSpent >= 2) turn = recast(keep(turn, save.kept), lots(2))
  else if (save.castingsSpent === 1) turn = keep(turn, save.kept)
  for (const made of save.claims) turn = claim(turn, made.dice, made.line, ladder, goods)

  const opened = openFight(horror, run.hand, save.yourHealth, run.armor, goods)
  const fight: Fight = {
    ...opened,
    horrorHealth: save.horrorHealth,
    yourHealth: save.yourHealth,
    yourHealthMax: run.healthMax,
    turnNumber: save.turnNumber,
    card: turn.card,
    // art. 65: a bleed outlasts a turn and outlasts a lock screen. It has
    // already ticked for this turn — the tick happens where the turn opens
    // (`advanceFight`) — so what is restored is what is left of it.
    bleed: save.bleed,
    turn,
    events: [],
  }
  // A selection may only hold dice that are actually on the table (art. 45).
  const laid = new Set<string>(casting(turn).map((landed) => landed.die))
  return {
    fight,
    phase: save.phase,
    selected: save.selected.filter((held) => laid.has(held)),
    advanced: save.advanced,
  }
}

/** art. 36: every mutation persists, and a fight mutates every tap. */
export function keepFight(ledgers: Ledgers, save: FightSave): Ledgers {
  const run = ledgers.run
  if (run === null) return ledgers
  return { ...ledgers, run: fighting(run, save) }
}

/**
 * Which paused fight belongs to this room, if any (art. 63) — by instance,
 * because art. 82 lets a run deal the same room twice and a fight you backed
 * out of down there is not waiting for you up here.
 */
export function pausedAt(ledgers: Ledgers, at: InstanceId): FightSave | null {
  const save = ledgers.run?.fight ?? null
  return save !== null && save.at === at ? save : null
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
 * reseed, and you wake at the Crossing (arts 11, 32). The paused fight burns
 * with the run, which is the only other way a card ever refills (art. 63).
 */
export function routeDeath(ledgers: Ledgers, cause: string): Ledgers {
  const run = ledgers.run
  if (run === null) throw new Error('no run to burn')
  return wake(die(ledgers, cause), reseed(run.seed))
}

/**
 * What the fight did to you, carried back into the run. A fight is the room
 * with the thing come close (art. 30), so nothing else about the run moves.
 *
 * art. 63: winning is one of the two things that refills a card, and it does
 * it by letting the fight go — the run stops holding it.
 */
export function carryOut(ledgers: Ledgers, fight: Fight): Ledgers {
  const run = ledgers.run
  if (run === null) return ledgers
  const free = fighting(wounded(run, fight.yourHealth), null)
  // arts 55, 60: a good found in the room this fight stood in waited for the
  // fight to end rather than re-arming you inside it (`tookIntoRun`). The
  // fight has ended, so it lands now instead of at the next waking.
  return { ...ledgers, run: tookIntoRun(free, ledgers.permanent) }
}

/**
 * art. 63, as ruled: a fled fight **pauses**. The card stays as spent as you
 * left it, the horror stays as wounded as you left it, and the turn stays
 * where your thumb was — re-entering the door resumes, it does not restart.
 *
 * The skeleton's discard is repealed. It was an acceptable shortcut while
 * nothing could be carried out of a fight; it becomes an exploit the moment
 * anything can, because a full card is worth more than the health that
 * running costs.
 */
export function routeFlight(ledgers: Ledgers, save: FightSave): Ledgers {
  const run = ledgers.run
  if (run === null) return ledgers
  return { ...ledgers, run: fighting(wounded(run, save.yourHealth), save) }
}

/** Which room the fight was fought at the door of (art. 30: it never moves). */
export function roomOf(ledgers: Ledgers): InstanceId | null {
  return ledgers.run?.at.instance ?? null
}

/** The lot a fight is thrown with, so the caller need not invent one. */
export type FightLot = Lot
