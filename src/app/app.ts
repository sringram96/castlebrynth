/**
 * The root controller.
 *
 * It owns exactly four things: the current state, the dispatcher, when to
 * repaint, and the presentation of a change that has already happened. It
 * computes no outcome — `reduce` does that — and it draws no pixel; the views
 * do.
 *
 * There is one dispatcher and one path from a press to a state change, which
 * is the whole answer to the class of bug this reset exists to fix.
 *
 * ## Motion is downstream of the reducer, always
 *
 * A press reduces, persists, and *then* plays. The authoritative state is
 * already saved before the first frame of any sequence, so a reload mid-throw
 * lands on the settled truth and a replay of the same seed is identical. What
 * a sequence may do is hold the *previous* state on screen for a few hundred
 * milliseconds — see `presenting` — because a SCORE whose next turn paints
 * over it instantly is a score the player never saw.
 */

import { enemy, intentAt, stanceAt } from '../content/enemies.js'
import type { Reach, Stance } from '../content/enemies.js'
import { idleFrameMs, idlePose, intentPose } from '../content/enemyPresentation.js'
import { defeatOf, defeatStance } from '../content/defeat.js'
import type { DefeatFrame } from '../content/defeat.js'
import { preview } from '../combat/scoring.js'
import { selectionOf } from '../combat/resolve.js'
import { reduce } from '../game/reducer.js'
import type { Action } from '../game/reducer.js'
import { save } from '../game/save.js'
import type { CombatState, GameState } from '../game/state.js'
import { room as roomById } from '../content/rooms.js'
import { mountWorld, placeEnemy, showProp, showProps } from '../render/compositor.js'
import type { World } from '../render/compositor.js'
import { RoomAmbience } from '../render/ambience.js'
import {
  beatsDuration,
  beatsFor,
  movesDuration,
  movesFor,
  platesFor,
  stateOf,
} from '../content/interactions.js'
import { TRAY_ART, enemyArt, enemyPose, isScenePlate, propArt, url } from '../render/assets.js'
import { mountTray, paintTumble, renderTray } from '../ui/trayView.js'
import type { Tray } from '../ui/trayView.js'
import { renderWorld } from '../ui/worldView.js'
import { renderOverlay, renderScreen } from '../ui/screens.js'
import type { Overlay } from '../ui/screens.js'
import {
  Sequence,
  confirm,
  enemyAdvance,
  enemyContact,
  enemyHit,
  fireFace,
  orbChange,
  pulseRelic,
  reducedMotion,
  shake,
  tumble,
  tumbleDuration,
  weaponThrust,
} from '../render/animation.js'

/**
 * The beats of a score, in milliseconds from the press.
 *
 * They are named because the order is the point: you chose these dice, they
 * made this hand, this relic added to it, this red face cost you that, the
 * blow landed, and only then did the thing hit back. A player who watches this
 * once should be able to describe what they did.
 */
const SCORE = {
  chosen: 0,
  relics: 190,
  faces: 330,
  /** The arm draws back. One frame of anticipation and no more. */
  wind: 395,
  /** And goes in. Forty-five milliseconds of travel, so it reads as violence. */
  thrust: 440,
  /** Full extension. The blade arrives, the flesh blows white, the number. */
  landed: 480,
  rest: 580,
  answer: 720,
  next: 950,
} as const

/**
 * The extra beats of a horror that has a drawing of what it is doing.
 *
 * They sit *inside* the score above and add nothing to it: the turn is still
 * 950 ms long, the blow still lands at 720, and the damage was decided before
 * any of this was scheduled. All that happens is that the plate on screen for
 * the middle of the turn is the one the encounter authored for the intent that
 * actually resolved.
 *
 * The order is the point, as it is everywhere else in this file. It draws
 * itself up at `taken` — 170 ms of a thing about to do something, which is what
 * makes the blow at `SCORE.answer` read as *its* blow rather than as the health
 * bar moving. `again` is not a beat: it is the same picture put back, because
 * the paint at `SCORE.answer` reads the plate off state and state does not know
 * a pose is up. `settled` returns it to the plate its health says it stands in,
 * with 70 ms to spare before the next turn takes the screen.
 */
const POSE = {
  taken: 650,
  again: SCORE.answer,
  settled: 880,
} as const

/**
 * The extra beats of a thing coming one reach nearer.
 *
 * They start after the strike has been allowed to read: an advance that
 * happens on the same frame as the impact is an advance nobody saw, because
 * the eye is on the white flesh and the number. The uncomfortable pause
 * between `SCORE.rest` and `gather` is the point of the whole encounter.
 */
const APPROACH = {
  gather: 700,
  /** The hard cut. No tween, no interpolation — the next authored picture. */
  arrive: 772,
  next: 1000,
} as const

/**
 * And of it arriving.
 *
 * Longer, uglier and much larger than an advance, because the difference
 * between *it is closer* and *it is on me* is the only thing this fight has to
 * say. Three discrete enlargements, held.
 */
const CONTACT = {
  hold: 700,
  ladder: [790, 880, 960],
  landed: 1050,
  next: 1500,
} as const

/**
 * The beats of the font, in milliseconds from the press.
 *
 * The die is already cast. It was cast in the reducer, in the same tick as the
 * press, and it is in the save before the first frame below runs — so every
 * one of these is a reveal. Settling early, reloading in the middle, or
 * turning motion off all land on the same face and the same health.
 *
 * The order is the point, as it is in a score: the thing comes out of the
 * blood, it turns, it stops, *then* the body answers, and only then is there a
 * way on. Reading the health before the die has stopped would be reading the
 * answer over the top of the question.
 */
const RITUAL = {
  emerge: 80,
  /** Cosmetic faces on the way. See `RITUAL_FLICKER`. */
  faces: [180, 250, 320, 390],
  /** It stops. This frame, and every frame after it, is the reducer's. */
  landed: 500,
  orb: 650,
  said: 850,
  next: 1000,
} as const

/**
 * The faces that flicker past on the way to the real one.
 *
 * A fixed list, exactly as the crown's tumble uses a counter rather than a
 * generator. Nothing in a sequence may draw a number: if this were random the
 * animation would be producing values the run did not, and a replay of the
 * same seed would differ on screen.
 */
const RITUAL_FLICKER: readonly number[] = [2, 5, 1, 4]

/**
 * The authored impact plate for a fight, when there is one it can be used in.
 *
 * A source swap changes no placement, so a bright plate can only stand in for
 * a pose whose box it shares — which for this encounter means the reach it was
 * painted at, and no other. Anywhere else the sprite's own brightness makes
 * the frame instead, and the difference is exactly what the plate buys.
 */
function brightPlate(combat: CombatState): string | undefined {
  const art = enemy(combat.enemyId).art
  const lit = enemyPose(art, 'hit')
  if (!lit) return undefined
  const standing = enemyArt(art, combat.approach)
  return lit.width === standing.width && lit.height === standing.height ? url(lit) : undefined
}

export interface AppOptions {
  readonly root: HTMLElement
  readonly initial: GameState
  readonly discarded?: string | undefined
  /** Off in tests, so a journey never waits on a transition. */
  readonly persist?: boolean
  /**
   * Whether presentation takes time.
   *
   * On by default. A browser journey that cares about flow rather than feel
   * turns it off and every sequence resolves in the same tick — which is the
   * same path `prefers-reduced-motion` takes, so the reduced-motion promise is
   * exercised by most of the suite rather than by one test.
   */
  readonly motion?: boolean
}

export class App {
  private state: GameState
  private readonly world: World
  private readonly ambience: RoomAmbience
  private readonly tray: Tray
  private readonly screen: HTMLElement
  private readonly overlay: HTMLElement
  private readonly discarded: string | undefined
  private readonly persist: boolean
  private readonly motion: boolean
  /**
   * What the overlay is showing, if anything.
   *
   * Presentation only, and deliberately not in `GameState`: opening the menu
   * or looking closely at a die is not a move, does not survive a reload, and
   * must never be something a save can be stuck inside.
   */
  private opened: Overlay | undefined
  /**
   * A state to paint *instead of* the settled one, while a sequence runs.
   *
   * Never saved, never reduced, and never anything but a frame of a transition
   * between two real states. It is how the crown can still hold the hand you
   * scored while `this.state` is already the next turn.
   */
  private presenting: GameState | undefined
  private sequence: Sequence | undefined
  /**
   * The idle loop: which enemy it is running for, its clock, and which plate.
   *
   * All three are presentation and all three are deliberately here rather than
   * in `GameState`. A horror breathing is not a fact about a run: it survives
   * nothing, it decides nothing, and a save that carried a frame index would
   * give a reload an animation clock to recover — which is exactly the class of
   * thing `combat.defeated` is written as a flag to avoid.
   *
   * `enemyIdling` is what makes the loop idempotent. `render` runs it on every
   * paint and a sequence paints several times, so a loop that restarted per
   * paint would never reach its second frame.
   */
  private enemyIdling: string | undefined
  private enemyIdleTimer: number | undefined
  private enemyIdleFrame = 0

  constructor(options: AppOptions) {
    this.state = options.initial
    this.discarded = options.discarded
    this.persist = options.persist ?? true
    this.motion = options.motion ?? true

    const root = options.root
    root.replaceChildren()

    const worldRoot = document.createElement('div')
    worldRoot.id = 'world'
    const trayRoot = document.createElement('div')
    trayRoot.id = 'tray'
    this.screen = document.createElement('div')
    this.screen.id = 'screen'
    this.overlay = document.createElement('div')
    this.overlay.id = 'overlay'
    this.overlay.hidden = true

    root.append(worldRoot, trayRoot, this.screen, this.overlay)

    this.world = mountWorld(worldRoot)
    this.ambience = new RoomAmbience(this.world)
    this.tray = mountTray(trayRoot, url(TRAY_ART))
    this.render()
    // A boot that lands inside a death drives it to its end rather than
    // sitting in it. Nothing but a fixture can arrive here that way today; the
    // check costs two lines and removes the whole class of stuck screen.
    this.resumeDefeat()
  }

  /** The one way a press becomes a state change. */
  dispatch = (action: Action): void => {
    // A press always arrives at a settled screen. Nothing is ever locked out
    // waiting for a transition — an impatient thumb finishes it instead.
    this.settle()

    const before = this.state
    const next = reduce(before, action)
    if (next === before) return
    this.state = next
    if (this.persist) save(next)
    this.play(before, next, action)
  }

  get current(): GameState {
    return this.state
  }

  /** Whether a transition is on screen. Tests read it; nothing else does. */
  get animating(): boolean {
    return this.presenting !== undefined
  }

  /** End any running sequence at once, and land on the settled state. */
  settle(): void {
    if (!this.sequence) return
    const running = this.sequence
    this.sequence = undefined
    running.settle()
  }

  // ── presentation ─────────────────────────────────────────────────────

  private get animated(): boolean {
    return this.motion && !reducedMotion()
  }

  private start(): Sequence {
    const sequence = new Sequence(this.animated)
    this.sequence = sequence
    return sequence
  }

  private play(before: GameState, after: GameState, action: Action): void {
    switch (action.type) {
      case 'ROLL':
        return this.playThrow(after, after.run!.combat!.roll.map((d) => d.slot))
      case 'REROLL': {
        // Only what was thrown. If all six tumble, the player cannot see what
        // holding accomplished, which is the whole decision of the phase.
        const held = new Set(before.run!.combat!.selected)
        return this.playThrow(after, after.run!.combat!.roll.map((d) => d.slot).filter((s) => !held.has(s)))
      }
      case 'SCORE':
        return this.playScore(before, after)
      case 'RITUAL_ROLL':
        return this.playRitual(before, after)
      case 'INTERACT':
        return this.playInteract(before, after, action.interactionId)
      default:
        this.render()
        // CONTINUE back into a fight that was killed and then reloaded lands
        // here. The reducer already granted the kill; all that is left is the
        // last picture of it and the press that finishes the win.
        this.resumeDefeat()
    }
  }

  /**
   * The font, as a thing that happens rather than a number that changes.
   *
   * Built the same way a score is: from the state *before* the press, with one
   * fact put right at a time, and the settled state painted last. The frames
   * are pushed straight at the compositor after each paint — the paint reads
   * the frame off state, and during the sequence the state does not yet say
   * the room has been used, so the two would otherwise disagree. Every one of
   * them is a picture of an answer that is already saved.
   */
  private playRitual(before: GameState, after: GameState): void {
    const run = before.run!
    const ritual = after.run!.ritual!
    const family = roomById(run.roomId).ritual!.art
    const healed = ritual.healed
    const settled = after.run!.hp

    // A frame, if it was ever painted. A room whose plates have not landed
    // plays the same sequence with nothing in the midground, and the outcome
    // is identical: the health moves and the band says what happened.
    const show = (frame: string | number): void => {
      const art = propArt(family, String(frame))
      if (art) showProp(this.world, url(art))
    }

    // Hold the room as it was — old health, empty band, and the button still
    // there for the thumb that presses twice.
    this.presenting = { ...before, run: { ...run, say: '' } }
    this.render()

    if (!this.animated) {
      this.presenting = undefined
      this.render()
      return
    }

    const sequence = this.start()
    sequence.at(RITUAL.emerge, () => show('emerge'))
    RITUAL.faces.forEach((at, index) => sequence.at(at, () => show(RITUAL_FLICKER[index]!)))
    sequence.at(RITUAL.landed, () => show(ritual.roll))

    // The body answers. The orb is driven from the presented state, so the
    // fill and the number move together and both are the reducer's.
    sequence.at(RITUAL.orb, () => {
      this.presenting = { ...before, run: { ...run, hp: settled, say: '' } }
      this.render()
      show(ritual.roll)
      orbChange(this.tray.orb, healed)
    })

    sequence.at(RITUAL.said, () => {
      this.presenting = { ...before, run: { ...run, hp: settled, say: after.run!.say } }
      this.render()
      show(ritual.roll)
    })

    // And only now the settled truth, which is the first frame in which the
    // way on exists. The face stays: it is painted from `run.ritual`, so it is
    // still there on the next visit and after a reload.
    sequence.at(RITUAL.next, () => this.finish())
  }

  /**
   * An object in the room, moving to where it already is.
   *
   * The same shape as every other sequence in this file, and the same promise:
   * the reducer decided the whole outcome, `dispatch` saved it, and every frame
   * below is a picture of something already true. The chest is open in the save
   * before the stone is shown grinding; the six health are gone before the
   * lever is shown snapping back. Settling early — an impatient second tap,
   * reduced motion, a test — runs the remainder at once and lands on exactly
   * the same room.
   *
   * The plates are pushed straight at the compositor after each paint, the way
   * the font's and the Gnawing's death are, and for the same reason: a paint
   * reads the frame off state, and state during a transition already says the
   * settled thing. Without this the first paint would show the finished room
   * and the beats would play backwards out of it.
   *
   * Two kinds of thing are scheduled here, because the two rooms were delivered
   * differently. A **beat** swaps one drawing for another, which is what a room
   * painted as a family of positions wants. A **move** names something the
   * stylesheet does to a plate that is already up, which is what a room painted
   * as one portrait per object wants — a bell hanging on a chain swings, and it
   * swings on the plate it was delivered as. Neither decides anything: both are
   * read off the two settled states, and the room lands on the same picture
   * with every one of them skipped.
   */
  private playInteract(before: GameState, after: GameState, id: string): void {
    const was = stateOf(before.run!.rooms, before.run!.roomId)
    const now = stateOf(after.run!.rooms, after.run!.roomId)

    // Health is the vault's other answer, and the only part of an interaction
    // that is not a picture of a prop. Read off the two states, never computed.
    const lost = before.run!.hp - after.run!.hp

    this.presenting = { ...before, run: { ...before.run!, say: '' } }
    this.render()

    if (!this.animated || !was || !now) {
      this.presenting = undefined
      this.render()
      if (lost > 0) {
        orbChange(this.tray.orb, -lost)
        shake(this.world, lost)
      }
      return
    }

    const beats = beatsFor(was, now, id)
    const moves = movesFor(was, now, id)
    const frames = new Map<string, string>()
    const moving = new Map(moves.map((m) => [m.id, m.move]))
    // Which of the two settled rooms the plates are drawn from. It is the one
    // before the press until the word band says otherwise, which is the same
    // instant the rest of the screen changes over.
    let room = was
    const show = (): void => {
      // Everything the settled room shows, with the transition's frames laid
      // over the top of it — so an object that is not moving keeps its plate
      // while its neighbour swings.
      showProps(
        this.world,
        platesFor(room)
          .map((p) => ({ plate: p, art: propArt(p.art, frames.get(p.id) ?? p.frame) }))
          .filter(
            (x): x is { plate: typeof x.plate; art: NonNullable<typeof x.art> } =>
              x.art !== undefined,
          )
          .map(({ plate, art }) => ({
            id: plate.id,
            src: url(art),
            ...(plate.look !== undefined ? { look: plate.look } : {}),
            ...(moving.has(plate.id) ? { move: moving.get(plate.id)! } : {}),
          })),
      )
    }

    const sequence = this.start()
    // The moves start on the frame of the press, before any beat: the bell is
    // already swinging while the word band is still empty.
    show()
    for (const move of moves) {
      sequence.at(move.ms, () => {
        // Taken off again the moment it is over, so the next press can play it.
        moving.delete(move.id)
        show()
      })
    }
    for (const beat of beats) {
      sequence.at(beat.at, () => {
        frames.set(beat.id, beat.frame)
        show()
      })
    }

    // The body answers on the frame the mechanism bites, not at the end. A
    // shake that arrives after the lever is already back up is a shake nobody
    // connects to anything.
    if (lost > 0) {
      sequence.at(90, () => {
        this.presenting = { ...before, run: { ...before.run!, hp: after.run!.hp, say: '' } }
        this.render()
        show()
        orbChange(this.tray.orb, -lost)
        shake(this.world, lost)
      })
    }

    // The word band, once the thing it describes has happened — whichever of
    // the two kinds of thing this room does.
    const said = Math.max(beatsDuration(beats), movesDuration(moves)) + 80
    sequence.at(said, () => {
      this.presenting = { ...before, run: { ...after.run!, say: after.run!.say } }
      room = now
      this.render()
      show()
    })
    // And the settled truth, which is the first frame in which a newly opened
    // gate offers a way on.
    sequence.at(said + 150, () => this.finish())
  }

  private playThrow(after: GameState, slots: readonly number[]): void {
    // The dice are already showing the reducer's faces; the tumble is played
    // over the truth rather than towards it.
    this.render()
    if (!this.animated) return
    const dice = slots
      .map((slot) => this.tray.crown.querySelector<HTMLElement>(`.die[data-slot="${slot}"]`))
      .filter((node): node is HTMLElement => node !== null)
    if (dice.length === 0) return

    const sequence = this.start()
    tumble(sequence, { dice, paint: paintTumble })
    sequence.at(tumbleDuration(dice.length), () => {
      this.sequence = undefined
    })
  }

  /**
   * The score, as a chain of events rather than a change of numbers.
   *
   * The reducer has already produced the next turn — `phase: 'intent'`, an
   * empty table — and rendering it now would erase the hand before anyone saw
   * it land. So the frames below are built *from the state before the press*,
   * with one number advanced at a time, and the settled state is painted last.
   * No frame is ever saved, and none of them is consulted by anything.
   */
  private playScore(before: GameState, after: GameState): void {
    const run = before.run!
    const combat = run.combat!
    // The same call the well made for the preview, so what is revealed is
    // exactly what the player was shown before they committed.
    const p = preview(selectionOf(combat), run.relics, combat.spentHands)

    // What it is doing *this* turn, read before the next turn exists. `after`
    // already holds the following intent, and the following intent is a
    // different picture — for the Warden, the difference between RAISE and the
    // JUDGE it announces is the difference between the two drawings there are.
    const acting = intentAt(combat.enemyId, combat.turn)

    const enemyAfter = Math.max(0, combat.enemyHp - p.damage)
    const dealt = combat.enemyHp - enemyAfter
    const faceDelta = p.heal - p.cost
    const afterFaces = Math.max(0, Math.min(run.maxHp, run.hp + faceDelta))
    const answer = Math.max(0, afterFaces - (after.run?.hp ?? afterFaces))

    // Where the thing ended up, read off the two authoritative states and
    // nowhere else. The sequence below has no say in any of it: if the reducer
    // did not move it, nothing here can, and if the reducer says it arrived,
    // the player is already dead whether or not a single frame plays.
    const settledCombat = after.run?.combat
    // It died, and the reducer is holding the fight open on that. Nothing here
    // decided it and nothing here can undo it: the room is already un-cleared,
    // the offer is already undrawn, and the only thing left to do is show it.
    const defeated = settledCombat?.defeated === true
    const advancedTo =
      combat.approach !== undefined &&
      settledCombat?.approach !== undefined &&
      settledCombat.approach !== combat.approach
        ? settledCombat.approach
        : undefined
    const reached = settledCombat?.reached === true

    const frame = (patch: Partial<CombatState>, hp = run.hp): GameState => ({
      ...before,
      run: { ...run, hp, combat: { ...combat, ...patch } },
    })

    this.presenting = before
    this.render()
    if (!this.animated) {
      this.presenting = undefined
      this.render()
      if (dealt > 0) enemyHit(this.world, dealt)
      if (answer > 0) shake(this.world, answer)
      // A death is a sequence like every other one here: with motion off it
      // resolves in the same tick, and the win screen arrives exactly where it
      // arrived before any of this existed.
      if (defeated) this.dispatch({ type: 'DEFEAT_DONE' })
      return
    }

    const sequence = this.start()

    sequence.at(SCORE.chosen, () => {
      confirm(
        combat.selected
          .map((slot) => this.tray.crown.querySelector<HTMLElement>(`.die[data-slot="${slot}"]`))
          .filter((node): node is HTMLElement => node !== null),
      )
      this.tray.well.querySelector('.score-hand')?.classList.add('score-confirm')
    })

    // Only the relics that actually contributed, in their own bays, as their
    // term is read out.
    sequence.at(SCORE.relics, () => {
      for (const id of p.firedRelics) pulseRelic(this.tray.relics, id)
    })

    // A red or green face fires on the die that carries it, not in a log line
    // the player has to go looking for afterwards.
    sequence.at(SCORE.faces, () => {
      if (faceDelta === 0 && p.cost === 0) return
      for (const slot of combat.selected) {
        const die = this.tray.crown.querySelector<HTMLElement>(`.die[data-slot="${slot}"]`)
        if (die?.querySelector('.mark')) fireFace(die)
      }
      orbChange(this.tray.orb, faceDelta)
    })

    // The arm. Back, then in — and a hand that lands on nothing is a hand that
    // did not swing, so a score that deals no damage never plays the strike.
    if (dealt > 0) {
      sequence.at(SCORE.wind, () => weaponThrust(this.world, 'wind'))
      sequence.at(SCORE.thrust, () => weaponThrust(this.world, 'thrust'))
      sequence.at(SCORE.rest, () => weaponThrust(this.world, 'rest'))
    }

    sequence.at(SCORE.landed, () => {
      this.presenting = frame({ enemyHp: enemyAfter }, afterFaces)
      this.render()
      // Exactly at full extension: the flesh goes white, the number rises and
      // the frame kicks, all on the same frame. Damage of zero gets none of
      // it — a convincing hit for a hand that did nothing is a lie.
      if (dealt > 0) enemyHit(this.world, dealt, brightPlate(combat))
    })

    sequence.at(SCORE.answer, () => {
      if (answer <= 0) return
      this.presenting = frame({ enemyHp: enemyAfter }, after.run?.hp ?? afterFaces)
      this.render()
      shake(this.world, answer)
    })

    // A death outranks both of the beats below it, and cannot collide with
    // either: a dead thing never takes a step, so `resolve` returns the reach
    // it died at and never `reached`.
    if (defeated) return this.playDefeat(sequence, frame, combat, afterFaces, settledCombat!.log)
    if (reached) return this.playContact(sequence, frame, enemyAfter, afterFaces)
    if (advancedTo) return this.playAdvance(sequence, frame, enemyAfter, afterFaces, advancedTo)

    // It survived, so it gets to be seen doing the thing it just did. Only
    // here: a dead horror does not take its turn, and a thing that closed the
    // distance is already being shown doing that instead.
    this.playPose(sequence, combat.enemyId, acting.verb)

    // It survived, it is a thing that closes, and it did not get anywhere. A
    // stretch of hall takes more than one score to cover, so this is what most
    // of them look like: it hauls, and it is still where it was. Without the
    // beat the turn reads as the thing ignoring you.
    if (combat.approach !== undefined && settledCombat?.approach !== undefined) {
      sequence.at(APPROACH.gather, () => enemyAdvance(this.world, 'gather'))
      sequence.at(APPROACH.arrive, () => enemyAdvance(this.world, 'arrive'))
    }

    // Only now does the next turn — or the reward, or the death screen — take
    // the screen. A terminal screen that arrives before its own blow lands is
    // the fight ending without the player seeing how, so the last beat is the
    // same length whether or not the enemy got to answer.
    sequence.at(SCORE.next, () => this.finish())
  }

  /**
   * It survived, so it comes one reach nearer.
   *
   * Three beats and a hard cut in the middle. Nothing is interpolated between
   * the two authored compositions, and nothing here chooses the destination —
   * `to` came out of the reducer before the first of these was scheduled.
   */
  private playAdvance(
    sequence: Sequence,
    frame: (patch: Partial<CombatState>, hp?: number) => GameState,
    enemyHp: number,
    hp: number,
    to: Reach,
  ): void {
    sequence.at(APPROACH.gather, () => enemyAdvance(this.world, 'gather'))
    sequence.at(APPROACH.arrive, () => {
      this.presenting = frame({ enemyHp, approach: to }, hp)
      this.render()
      enemyAdvance(this.world, 'arrive')
    })
    sequence.at(APPROACH.next, () => this.finish())
  }

  /**
   * It was already at `close`, and it survived.
   *
   * The largest motion in the encounter, and the only one that leaves the
   * established composition. It reveals a death the reducer committed before
   * any of this was scheduled — settling it early lands on exactly the same
   * screen, which is the promise the whole file is built around.
   */
  private playContact(
    sequence: Sequence,
    frame: (patch: Partial<CombatState>, hp?: number) => GameState,
    enemyHp: number,
    hp: number,
  ): void {
    // It holds still first. The stillness is what makes the next 260 ms read.
    sequence.at(CONTACT.hold, () => enemyAdvance(this.world, 'gather'))
    CONTACT.ladder.forEach((at, step) => {
      sequence.at(at, () => {
        this.presenting = frame({ enemyHp }, hp)
        this.render()
        enemyContact(this.world, step + 1)
        shake(this.world, step + 1)
      })
    })
    sequence.at(CONTACT.landed, () => {
      this.presenting = frame({ enemyHp, reached: true }, hp)
      this.render()
    })
    sequence.at(CONTACT.next, () => this.finish())
  }

  /**
   * It stops.
   *
   * The one sequence in the file that ends with a dispatch rather than with
   * `finish`, because the state it is revealing is not the settled one yet:
   * the reducer parked the fight on `combat.defeated` and is waiting to be
   * told the picture has been shown. Every frame below is a picture of a kill
   * that was decided and saved before the first of them was scheduled, and
   * settling early — an impatient thumb, reduced motion, a test — runs the
   * whole remainder at once and lands on the same win.
   *
   * The frames themselves are pushed at the compositor after each paint, the
   * same way the font's are: the paint places the enemy from state, and state
   * during a death says only *it is dead*, not which frame of dying is up.
   */
  private playDefeat(
    sequence: Sequence,
    frame: (patch: Partial<CombatState>, hp?: number) => GameState,
    combat: CombatState,
    hp: number,
    log: readonly string[],
  ): void {
    const death = defeatOf(combat.enemyId)
    if (!death) return void sequence.at(SCORE.next, () => this.finish())

    // Where it was standing when it died. Every frame is placed relative to
    // this, so a horror killed at the end of the hall collapses there.
    const base = stanceAt(combat.enemyId, combat.approach)

    let at = SCORE.landed + death.still
    death.frames.forEach((f, step) => {
      sequence.at(at, () => {
        // The fight, held at the instant of the kill: no health left on it, no
        // verbs on the tray, and the beats of the hand that did it. One flag
        // does the first two — see `trayView.ts`. The log has to be carried
        // across explicitly, because every other frame of a score is built
        // from the turn *before* the press and this one is not: it is the
        // only frame of a fight whose last line is already the last line.
        this.presenting = frame({ enemyHp: 0, defeated: true, log }, hp)
        this.render()
        this.paintDefeat(combat, base, f, step)
        // One kick, on the frame it gives out, and nothing after it. The rest
        // of the sequence is a thing going still, and a camera that keeps
        // moving through it is a camera arguing with the picture.
        if (step === 0) shake(this.world, 1)
      })
      at += f.hold
    })

    // The hold ends and the win is asked for. Exactly once, from here, and
    // only ever from here.
    sequence.at(at, () => {
      this.finish()
      this.dispatch({ type: 'DEFEAT_DONE' })
    })
  }

  /**
   * A reload that landed in the middle of a death.
   *
   * The kill is in the save — it was committed by the SCORE that caused it —
   * so there is nothing to recompute and nothing to replay. It snaps to the
   * settled frame, holds it long enough to be seen, and finishes the win. The
   * player loses the collapse and gets the corpse, which is the right half of
   * the sequence to keep: the half that is a fact about the run.
   *
   * A horror with no authored death cannot be here at all — the reducer never
   * parks one — but a save written by a build that had one and a build that
   * does not could be, so it resolves rather than waits.
   */
  private resumeDefeat(): void {
    const combat = this.state.run?.combat
    if (this.state.mode !== 'combat' || !combat?.defeated) return

    const death = defeatOf(combat.enemyId)
    const last = death?.frames[death.frames.length - 1]
    if (!death || !last) return void this.dispatch({ type: 'DEFEAT_DONE' })

    this.paintDefeat(combat, stanceAt(combat.enemyId, combat.approach), last, death.frames.length - 1)
    const sequence = this.start()
    sequence.at(last.hold, () => {
      this.sequence = undefined
      this.dispatch({ type: 'DEFEAT_DONE' })
    })
  }

  /**
   * One frame of a death, straight at the compositor.
   *
   * The plate is the frame's own if it has been authored, the bright impact
   * plate when the frame asks to be lit and one fits the pose it is standing
   * in — the same guard and the same reason as `brightPlate` — and otherwise
   * the plate it died standing in. The box comes from `defeatStance`, so this
   * is a placement rather than a transform and the sprite lands where the
   * content said rather than wherever a scale happened to leave it.
   */
  private paintDefeat(combat: CombatState, base: Stance, f: DefeatFrame, step: number): void {
    const art = enemy(combat.enemyId).art
    const plate = f.pose ? enemyPose(art, f.pose) : undefined
    const src = plate
      ? url(plate)
      : ((f.lit ? brightPlate(combat) : undefined) ?? url(enemyArt(art, combat.approach)))
    placeEnemy(this.world, src, {
      ...defeatStance(base, f),
      ...(combat.approach ? { reach: combat.approach } : {}),
      // A death painted on whole-scene plates is placed by the frame, exactly
      // as the standing pose is. `defeatStance` still runs and still has to be
      // the identity for it — see the Warden's entry in `content/defeat.ts`.
      ...(isScenePlate(plate ?? enemyArt(art, combat.approach)) ? { scene: true } : {}),
      defeat: { step, dim: f.dim },
    })
  }

  // ── the idle loop ────────────────────────────────────────────────────

  /**
   * Keep a standing horror breathing, or stop it.
   *
   * Run from `render`, off the **settled** state rather than the presented one,
   * and idempotent for the same enemy — the same contract `RoomAmbience.show`
   * has, for the same reason: a sequence paints several times and a loop torn
   * down and rebuilt on each of them would never advance.
   *
   * It stops on everything that means there is nothing standing there: the room
   * changed, the fight was won, the thing died, motion is off. And it starts
   * only for a horror whose idle plates have actually been painted, so an enemy
   * with no family is still, exactly as it was before this existed.
   */
  private idle(): void {
    const run = this.state.run
    const here = run && this.state.mode !== 'title' ? roomById(run.roomId) : undefined
    const standing =
      run && here?.enemy && !run.cleared.includes(run.roomId) && !run.combat?.defeated
        ? here.enemy
        : undefined
    // Reduced motion gets the settled plate and no loop at all. It is not a
    // shorter loop or a slower one: the first plate of the band is the whole
    // picture, and everything the fight can say is said without it moving.
    const every = standing && this.animated ? idleFrameMs(standing) : undefined
    if (!standing || every === undefined) return this.stopIdle()
    if (this.enemyIdling === standing) return
    this.stopIdle()
    this.enemyIdling = standing
    this.enemyIdleTimer = window.setInterval(() => this.stepIdle(standing), every)
  }

  private stopIdle(): void {
    if (this.enemyIdleTimer !== undefined) window.clearInterval(this.enemyIdleTimer)
    this.enemyIdleTimer = undefined
    this.enemyIdling = undefined
    this.enemyIdleFrame = 0
  }

  /**
   * One beat of it. A hard swap, and nothing else.
   *
   * No tween and no crossfade: two authored drawings of a thing standing still,
   * cut between. The discontinuity is the whole effect — a fade would make it a
   * UI element that happens to be shaped like a corpse.
   *
   * A running sequence owns the picture, so the tick paints nothing while one
   * is up and puts the counter back to the plate that sequence's own paints
   * land on. That is the whole of "stop when a sequence begins, resume when it
   * ends": there is no start, no stop, and no state to get out of step.
   */
  private stepIdle(enemyId: string): void {
    if (this.sequence && !this.sequence.finished) {
      this.enemyIdleFrame = 0
      return
    }
    this.enemyIdleFrame += 1
    const pose = idlePose(enemyId, ...this.enemyHealth(enemyId), this.enemyIdleFrame)
    if (pose) this.showPose(enemyId, pose)
  }

  /**
   * How hurt a horror is, as the two numbers a band is computed from.
   *
   * Off the presented state, so a beat that is holding the previous turn on
   * screen asks about the health that turn showed. Before a fight opens there
   * is no combat in state and the answer is the enemy's own full health, which
   * is what a thing waiting at its door is standing there with.
   */
  private enemyHealth(enemyId: string): [number, number] {
    const combat = (this.presenting ?? this.state).run?.combat
    if (combat?.enemyId === enemyId) return [combat.enemyHp, combat.enemyMaxHp]
    const e = enemy(enemyId)
    return [e.hp, e.hp]
  }

  /**
   * Put one named plate of a horror on screen, where it already is.
   *
   * Straight at the compositor, the way the font's frames and a death's frames
   * go, and for the same reason: a paint reads the plate off state, and state
   * says nothing about which drawing of a thing is up. The placement is the one
   * the settled paint would have used — a pose swap is a change of source and
   * never a change of box.
   */
  private showPose(enemyId: string, pose: string): void {
    const state = this.presenting ?? this.state
    const combat = state.run?.combat?.enemyId === enemyId ? state.run.combat : undefined
    const art = enemyArt(enemy(enemyId).art, pose)
    const stance = stanceAt(enemyId, combat?.approach)
    placeEnemy(this.world, url(art), {
      width: stance.width,
      foot: stance.foot,
      ...(stance.at !== undefined ? { at: stance.at } : {}),
      ...(combat?.approach ? { reach: combat.approach } : {}),
      ...(isScenePlate(art) ? { scene: true } : {}),
      ...(combat?.reached ? { contact: true } : {}),
    })
  }

  /**
   * The picture of the intent that just resolved, inside the turn that ran it.
   *
   * Three beats and no fourth. It is scheduled from the verb the reducer
   * *acted on* — captured before the next turn replaced it — because that is
   * the only thing that can be right: RAISE deals nothing and still has a
   * drawing, so damage cannot say which pose this is, and the next intent is a
   * different turn's business.
   *
   * Nothing here is allowed to matter. Every beat is a source swap on a
   * scene-registered plate, the health and the damage were settled before the
   * first of them, and a turn played with motion off skips all three and ends
   * on precisely the same state.
   */
  private playPose(sequence: Sequence, enemyId: string, verb: string): void {
    const pose = intentPose(enemyId, verb)
    if (!pose) return
    sequence.at(POSE.taken, () => this.showPose(enemyId, pose))
    // Put it back after the blow's own paint, which restored the plate state
    // says it stands in. Cheaper and steadier than teaching `render` about a
    // transient pose, and it cannot outlive the beat below it.
    sequence.at(POSE.again, () => this.showPose(enemyId, pose))
    sequence.at(POSE.settled, () => {
      const idle = idlePose(enemyId, ...this.enemyHealth(enemyId))
      if (idle) this.showPose(enemyId, idle)
    })
  }

  /** Drop the transition and paint the settled truth. Always the last beat. */
  private finish(): void {
    this.presenting = undefined
    this.sequence = undefined
    weaponThrust(this.world, 'rest')
    this.render()
  }

  // ── painting ─────────────────────────────────────────────────────────

  private render(): void {
    const state = this.presenting ?? this.state
    const on = {
      onLook: (detailId: string) => this.dispatch({ type: 'LOOK', detailId }),
      onIntent: () => {
        const combat = this.state.run?.combat
        if (combat) this.say(intentAt(combat.enemyId, combat.turn).explain)
      },
      onRitual: () => this.dispatch({ type: 'RITUAL_ROLL' }),
      onInteract: (interactionId: string) => this.dispatch({ type: 'INTERACT', interactionId }),
    }
    renderWorld(this.world, state, on)

    // The room keeps breathing under all of it. Idempotent for the same room,
    // so the loops are not restarted by the several paints a sequence makes —
    // and torn down the moment the room changes, so nothing is left guttering
    // behind the next one.
    this.ambience.show(state.run && state.mode !== 'title' ? state.run.roomId : undefined)

    renderTray(this.tray, state, {
      // One mark. Choosing a die keeps it across the reroll and puts it in the
      // hand you score, because that is the one thing a tap on a die means.
      onDie: (slot) => this.dispatch({ type: 'SELECT', slot }),
      onInspectDie: (id) => this.open({ kind: 'die', id }),
      onInspectRelic: (id) => this.open({ kind: 'relic', id }),
      onMenu: () => this.open({ kind: 'menu' }),
      onFight: () => this.dispatch({ type: 'FIGHT' }),
      onRoll: () => this.dispatch({ type: 'ROLL' }),
      onReroll: () => this.dispatch({ type: 'REROLL' }),
      onScore: () => this.dispatch({ type: 'SCORE' }),
      onGo: (to) => this.dispatch({ type: 'GO', to }),
    })

    renderScreen(
      this.screen,
      state,
      {
        onStart: () => this.dispatch({ type: 'START_RUN' }),
        onContinue: () => this.dispatch({ type: 'CONTINUE' }),
        onTitle: () => this.dispatch({ type: 'TITLE' }),
        onTake: (id) => this.dispatch({ type: 'TAKE', id }),
      },
      this.discarded,
    )

    if (this.opened) renderOverlay(this.overlay, this.opened, state, () => this.close())

    // And the horror keeps breathing under all of it, on the same terms the
    // room's ambience does: idempotent for the same enemy, torn down the moment
    // there is nothing standing there.
    this.idle()
  }

  private open(view: Overlay): void {
    this.opened = view
    this.overlay.hidden = false
    renderOverlay(this.overlay, view, this.state, () => this.close())
  }

  private close(): void {
    this.opened = undefined
    this.overlay.hidden = true
    this.overlay.replaceChildren()
    delete this.overlay.dataset['overlay']
  }

  private say(line: string): void {
    const node = this.world.hud.querySelector<HTMLElement>('#say')
    if (!node) return
    node.textContent = line
    node.hidden = false
  }
}
