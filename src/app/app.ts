/**
 * The root controller.
 *
 * It owns exactly five things: the current state, the dispatcher, when to
 * repaint, the presentation of a change that has already happened, and the one
 * piece of *draft* the player is editing before they throw again — which dice
 * are held. It computes no outcome — `reduce` does that — it evaluates no
 * hand, it calculates no damage, and it draws no pixel; the views do.
 *
 * There is one dispatcher and one path from a press to a state change, which
 * is the whole answer to the class of bug this reset exists to fix.
 *
 * ## Motion is downstream of the reducer, always
 *
 * A press reduces, persists, and *then* plays. The authoritative state is
 * already saved before the first frame of any sequence, so a reload mid-attack
 * lands on the settled truth and a replay of the same seed is identical. What
 * a sequence may do is hold the *previous* state on screen for a few hundred
 * milliseconds — see `presenting` — because an attack whose next round paints
 * over it instantly is an attack the player never saw.
 *
 * ## The hold is not state
 *
 * Lighting a die changes nothing a save can hold. It is a thought in progress,
 * and it reaches the reducer once, whole, on the `REROLL` that acts on it. A
 * reload before that press loses the thought and nothing else — it does not
 * lose the faces, and it does not grant another throw.
 */

import { enemy, stageForRound, stanceAt } from '../content/enemies.js'
import type { Stance } from '../content/enemies.js'
import { attackPose, idleFrameMs, idlePose } from '../content/enemyPresentation.js'
import { defeatOf, defeatStance } from '../content/defeat.js'
import type { DefeatFrame } from '../content/defeat.js'
import type { RewardId } from '../content/rewards.js'
import type { ScoreId } from '../combat/hands.js'
import { reduce } from '../game/reducer.js'
import type { Action } from '../game/reducer.js'
import { save } from '../game/save.js'
import type { CombatState, GameState } from '../game/state.js'
import { roomAt } from '../game/map.js'
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
import { AssetLoader, criticalAssetsForState, likelyNextAssets } from '../render/loader.js'
import { mountTray, paintTumble, renderTray } from '../ui/trayView.js'
import type { HoldDraft, Tray } from '../ui/trayView.js'
import { renderWorld } from '../ui/worldView.js'
import { renderOverlay, renderScreen } from '../ui/screens.js'
import type { Overlay } from '../ui/screens.js'
import {
  Sequence,
  enemyAdvance,
  enemyHit,
  pileChange,
  reducedMotion,
  shake,
  tumble,
  tumbleDuration,
  weaponThrust,
} from '../render/animation.js'

/**
 * The beats of an attack, in milliseconds from the press.
 *
 * The whole exchange was settled by the reducer before a frame of this ran —
 * the hand, the sum, the multiplier, the damage, the retaliation and the pile
 * are all on `lastAttack` — so every one of these is a reveal:
 *
 *   read      a held frame with the dice still on the table
 *   thrust    the arm goes in
 *   hit       its total falls
 *   answer    it breaks bones of yours, and the pile catches up
 *   said      the beats of the exchange, in the word band
 *
 * `read` is the beat that keeps this legible rather than fast. Without it the
 * dice and the consequence arrive together and the player watches an outcome
 * without ever having seen the hand that caused it.
 */
const ATTACK = {
  read: 260,
  wind: 40,
  thrust: 150,
  hit: 190,
  rest: 320,
  answer: 480,
  said: 720,
  next: 900,
} as const

/**
 * The beats of the font, in milliseconds from the press.
 *
 * The die is already cast. It was cast in the reducer, in the same tick as the
 * press, and it is in the save before the first frame below runs — so every
 * one of these is a reveal. Settling early, reloading in the middle, or
 * turning motion off all land on the same face and the same pile.
 */
const RITUAL = {
  emerge: 80,
  /** Cosmetic faces on the way. See `RITUAL_FLICKER`. */
  faces: [180, 250, 320, 390],
  /** It stops. This frame, and every frame after it, is the reducer's. */
  landed: 500,
  pile: 650,
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
 * a pose whose box it shares — which for this encounter means the stage it was
 * painted at, and no other. Anywhere else the sprite's own brightness makes
 * the frame instead, and the difference is exactly what the plate buys.
 */
function brightPlate(combat: CombatState): string | undefined {
  const art = enemy(combat.enemyId).art
  const lit = enemyPose(art, 'hit')
  if (!lit) return undefined
  const standing = enemyArt(art, stageForRound(combat.enemyId, combat.round))
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
  /** Injected so a test can watch what was asked for and when. */
  readonly loader?: AssetLoader
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
  readonly assets: AssetLoader
  /**
   * What the overlay is showing, if anything.
   *
   * Presentation only, and deliberately not in `GameState`: opening the menu
   * or looking closely at a Vial is not a move, does not survive a reload, and
   * must never be something a save can be stuck inside.
   */
  private opened: Overlay | undefined
  /**
   * A state to paint *instead of* the settled one, while a sequence runs.
   *
   * Never saved, never reduced, and never anything but a frame of a transition
   * between two real states. It is how the crown can still hold the dice you
   * scored while `this.state` is already the next attack.
   */
  private presenting: GameState | undefined
  private sequence: Sequence | undefined
  /**
   * Which dice are held, and which attack that is for.
   *
   * Keyed by fight and round, so a new attack, a reload and a settled SCORE
   * all produce an empty one. Holds persist *across* a reroll inside the same
   * attack, which is what a thumb expects: a six kept through the second throw
   * is still kept going into the third.
   */
  private held: HoldDraft = { indices: [] }
  private heldFor: string | undefined
  /**
   * The idle loop: which enemy it is running for, its clock, and which plate.
   *
   * All three are presentation and all three are deliberately here rather than
   * in `GameState`. A horror breathing is not a fact about a run: it survives
   * nothing, it decides nothing, and a save that carried a frame index would
   * give a reload an animation clock to recover.
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
    this.assets = options.loader ?? new AssetLoader()

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

  // ── the hold ─────────────────────────────────────────────────────────

  /**
   * The hold for the attack in front of us, rebuilt if it is not there.
   *
   * Keyed by fight and round. Indices that no longer exist are dropped rather
   * than trusted — a narrower roll after a wound cannot carry a stale
   * position — and the reducer canonicalises the list again on the way in,
   * because the view is not what makes a reroll legal.
   */
  private currentHeld(state: GameState): HoldDraft {
    const combat = state.run?.combat
    if (!combat) return this.held
    const key = `${combat.enemyId}:${combat.round}`
    if (this.heldFor !== key) {
      this.heldFor = key
      this.held = { indices: [] }
    }
    const indices = this.held.indices.filter((i) => i < combat.dice.length)
    if (indices.length !== this.held.indices.length) this.held = { indices }
    return this.held
  }

  /**
   * Keep this die, or let it go.
   *
   * The decision inside an attack, and the only one the crown carries. It
   * changes nothing a save can hold: it is read by the next REROLL and by
   * nothing else.
   */
  private toggleHold(index: number): void {
    const combat = this.state.run?.combat
    if (!combat || combat.dice.length === 0 || combat.rollsUsed >= 3) return
    if (index < 0 || index >= combat.dice.length) return
    const has = this.held.indices.includes(index)
    this.held = {
      indices: has
        ? this.held.indices.filter((i) => i !== index)
        : [...this.held.indices, index].sort((a, b) => a - b),
    }
    this.render()
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
    this.stage(after)

    switch (action.type) {
      case 'ROLL':
        return this.playThrow(after, undefined)
      case 'REROLL':
        return this.playThrow(after, action.held)
      case 'SCORE':
        return this.playAttack(before, after)
      case 'DRINK':
        return this.playDrink(before, after)
      case 'RITUAL_ROLL':
        return this.playRitual(before, after)
      case 'INTERACT':
        return this.playInteract(before, after, action.interactionId)
      default:
        this.render()
        // CONTINUE back into a fight that was won and then reloaded lands
        // here. The reducer already granted the kill; all that is left is the
        // last picture of it and the press that finishes the win.
        this.resumeDefeat()
    }
  }

  /**
   * Ask for the art the next screen needs, and the art after that.
   *
   * Called on every state change rather than at boot. Nothing here blocks:
   * `AssetLoader` caches promises, so a room walked into twice is decoded
   * once, and the room ahead is being fetched while the player is still
   * reading the one they are in.
   */
  private stage(state: GameState): void {
    void this.assets.loadAll(criticalAssetsForState(state))
    void this.assets.loadAll(likelyNextAssets(state))
  }

  /**
   * Bones turning over.
   *
   * The faces are already in the save — ROLL and REROLL both drew them in the
   * same tick as the press — so the tumble is played *over* the truth rather
   * than towards it. Nothing below can disagree with what has already landed,
   * and no number is generated here.
   *
   * On a reroll only the bones that actually moved tumble. A held six sitting
   * perfectly still while five others turn over is the whole reason holding
   * reads as a physical act rather than as a checkbox.
   */
  private playThrow(after: GameState, held: readonly number[] | undefined): void {
    this.render()
    if (!this.animated) return

    const keep = new Set(held ?? [])
    const bones = [...this.tray.crown.querySelectorAll<HTMLElement>('.bone')].filter(
      (bone) => !keep.has(Number(bone.dataset['index'])),
    )
    if (bones.length === 0) return void this.finish()

    this.presenting = after
    const sequence = this.start()
    tumble(sequence, { bones, paint: paintTumble })
    sequence.at(tumbleDuration(bones.length) + 60, () => this.finish())
  }

  /**
   * The attack, and everything it costs, as one movement.
   *
   * The reducer has already scored, hit, and been answered: `lastAttack` holds
   * every number below and is in the save before a frame of this runs. What
   * plays here is that record, in order — the dice stay on the table, the arm
   * goes in, its total falls, and then the pile pays for having left it
   * standing.
   */
  private playAttack(before: GameState, after: GameState): void {
    const run = before.run!
    const combat = run.combat!
    const settled = after.run?.combat
    const record = settled?.lastAttack
    if (!settled || !record) return void this.finish()

    const defeated = settled.defeated === true
    const dead = after.mode === 'dead'
    const pose = attackPose(combat.enemyId, record)

    // One frame of the exchange: the dice still on the table, with the enemy
    // and the pile put right one at a time. `hp`/`bones` are the two facts
    // that move, and both come off the record.
    const frame = (hp: number, bones: number): GameState => ({
      ...before,
      run: {
        ...run,
        bones,
        say: '',
        combat: { ...combat, enemyHp: hp, lastAttack: record, log: [] },
      },
    })

    this.presenting = frame(record.enemyHpBefore, record.bonesBefore)
    this.render()

    if (!this.animated) {
      this.presenting = undefined
      this.render()
      enemyHit(this.world, record.damage)
      if (record.retaliation > 0) shake(this.world, record.retaliation)
      // A death is a sequence like every other one here: with motion off it
      // resolves in the same tick, and the win screen arrives exactly where it
      // arrived before any of this existed.
      if (defeated) this.dispatch({ type: 'DEFEAT_DONE' })
      return
    }

    const sequence = this.start()

    // The arm draws back and goes in. It swings once, for the whole attack,
    // because the attack is one movement.
    sequence.at(ATTACK.read + ATTACK.wind, () => weaponThrust(this.world, 'wind'))
    sequence.at(ATTACK.read + ATTACK.thrust, () => weaponThrust(this.world, 'thrust'))
    sequence.at(ATTACK.rest, () => weaponThrust(this.world, 'rest'))

    // It takes the hit. Its total falls to what the reducer already wrote.
    sequence.at(ATTACK.hit, () => {
      this.presenting = frame(record.enemyHpAfter, record.bonesBefore)
      this.render()
      enemyHit(this.world, record.damage, brightPlate(combat))
    })

    // And it answers, if there is anything left of it to answer with.
    sequence.at(ATTACK.answer, () => {
      this.presenting = frame(record.enemyHpAfter, record.bonesAfter)
      this.render()
      if (record.retaliation > 0) {
        pileChange(this.tray.orb, -record.retaliation)
        shake(this.world, record.retaliation)
      }
      if (pose && !defeated) this.showPose(combat.enemyId, pose)
    })

    sequence.at(ATTACK.said, () => {
      // The settled exchange, said out loud — and deliberately not the room's
      // line. A win writes the cleared room's arrival into `say`, and while
      // the fight is still on the plate that band belongs to the attack, so
      // blanking `say` lets it fall through to `combat.log`.
      this.presenting = { ...before, run: { ...after.run!, say: '', combat: settled } }
      this.render()
      if (pose && !defeated) this.showPose(combat.enemyId, pose)
    })

    // A death outranks the beats below it. The run ended on this exchange, and
    // no further picture of the fight belongs on the screen.
    if (dead) return void sequence.at(ATTACK.next, () => this.finish())
    if (defeated) return this.playDefeat(sequence, ATTACK.said, combat, after)

    sequence.at(ATTACK.next, () => this.finish())
  }

  /**
   * A Vial, drunk.
   *
   * The smallest sequence in the file, and it is here for one reason: the pile
   * moving with no beat at all reads as a repaint rather than as something the
   * player did.
   */
  private playDrink(before: GameState, after: GameState): void {
    const gained = (after.run?.bones ?? 0) - (before.run?.bones ?? 0)
    this.render()
    if (gained > 0) pileChange(this.tray.orb, gained)
  }

  /**
   * The font, as a thing that happens rather than a number that changes.
   *
   * Built the same way an attack is: from the state *before* the press, with
   * one fact put right at a time, and the settled state painted last. The
   * frames are pushed straight at the compositor after each paint — the paint
   * reads the frame off state, and during the sequence the state does not yet
   * say the room has been used, so the two would otherwise disagree. Every one
   * of them is a picture of an answer that is already saved.
   */
  private playRitual(before: GameState, after: GameState): void {
    const run = before.run!
    const ritual = after.run!.ritual!
    const family = roomAt(run).ritual!.art
    const restored = ritual.restored

    // A frame, if it was ever painted. A room whose plates have not landed
    // plays the same sequence with nothing in the midground, and the outcome
    // is identical: the pile moves and the band says what happened.
    const show = (frame: string | number): void => {
      const art = propArt(family, String(frame))
      if (art) showProp(this.world, url(art))
    }

    // Hold the room as it was — old pile, empty band, and the button still
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

    // The pile answers. It is driven from the presented state, so the fill and
    // the number move together and both are the reducer's.
    sequence.at(RITUAL.pile, () => {
      this.presenting = { ...before, run: { ...run, bones: after.run!.bones, say: '' } }
      this.render()
      show(ritual.roll)
      pileChange(this.tray.orb, restored)
    })

    sequence.at(RITUAL.said, () => {
      this.presenting = {
        ...before,
        run: { ...run, bones: after.run!.bones, say: after.run!.say },
      }
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
   * before the stone is shown grinding; the bone is gone before the lever is
   * shown snapping back. Settling early — an impatient second tap, reduced
   * motion, a test — runs the remainder at once and lands on the same room.
   */
  private playInteract(before: GameState, after: GameState, id: string): void {
    const template = roomAt(before.run!).id
    const was = stateOf(before.run!.rooms, before.run!.roomId, template)
    const now = stateOf(after.run!.rooms, after.run!.roomId, template)

    // The pile is the vault's other answer, and the only part of an
    // interaction that is not a picture of a prop. Read off the two states.
    const lost = before.run!.bones - after.run!.bones

    this.presenting = { ...before, run: { ...before.run!, say: '' } }
    this.render()

    if (!this.animated || !was || !now) {
      this.presenting = undefined
      this.render()
      if (lost > 0) {
        pileChange(this.tray.orb, -lost)
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
    show()
    for (const move of moves) {
      sequence.at(move.ms, () => {
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

    // The body answers on the frame the mechanism bites, not at the end.
    if (lost > 0) {
      sequence.at(90, () => {
        this.presenting = {
          ...before,
          run: { ...before.run!, bones: after.run!.bones, say: '' },
        }
        this.render()
        show()
        pileChange(this.tray.orb, -lost)
        shake(this.world, lost)
      })
    }

    const said = Math.max(beatsDuration(beats), movesDuration(moves)) + 80
    sequence.at(said, () => {
      this.presenting = { ...before, run: { ...after.run!, say: after.run!.say } }
      room = now
      this.render()
      show()
    })
    sequence.at(said + 150, () => this.finish())
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
   */
  private playDefeat(
    sequence: Sequence,
    from: number,
    combat: CombatState,
    after: GameState,
  ): void {
    const death = defeatOf(combat.enemyId)
    if (!death) {
      return void sequence.at(from + ATTACK.next, () => {
        this.finish()
        this.dispatch({ type: 'DEFEAT_DONE' })
      })
    }

    // Where it was standing when it died. Every frame is placed relative to
    // this, so a horror killed at the end of the hall collapses there.
    const base = stanceAt(combat.enemyId, stageForRound(combat.enemyId, combat.round))
    const settled = after.run!

    let at = from + death.still
    death.frames.forEach((f, step) => {
      sequence.at(at, () => {
        // The fight, held at the instant of the kill: nothing standing, no
        // verbs on the tray, and the beats of the attack that did it. One flag
        // does the first two — see `trayView.ts`.
        this.presenting = {
          ...after,
          run: { ...settled, combat: { ...settled.combat!, defeated: true } },
        }
        this.render()
        this.paintDefeat(combat, base, f, step)
        // One kick, on the frame it gives out, and nothing after it.
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
   * settled frame, holds it long enough to be seen, and finishes the win.
   */
  private resumeDefeat(): void {
    const combat = this.state.run?.combat
    if (this.state.mode !== 'combat' || !combat?.defeated) return

    const death = defeatOf(combat.enemyId)
    const last = death?.frames[death.frames.length - 1]
    if (!death || !last) return void this.dispatch({ type: 'DEFEAT_DONE' })

    const base = stanceAt(combat.enemyId, stageForRound(combat.enemyId, combat.round))
    this.paintDefeat(combat, base, last, death.frames.length - 1)
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
   * in, and otherwise the plate it died standing in.
   */
  private paintDefeat(combat: CombatState, base: Stance, f: DefeatFrame, step: number): void {
    const art = enemy(combat.enemyId).art
    const stage = stageForRound(combat.enemyId, combat.round)
    const plate = f.pose ? enemyPose(art, f.pose) : undefined
    const src = plate
      ? url(plate)
      : ((f.lit ? brightPlate(combat) : undefined) ?? url(enemyArt(art, stage)))
    placeEnemy(this.world, src, {
      ...defeatStance(base, f),
      ...(stage ? { reach: stage } : {}),
      ...(isScenePlate(plate ?? enemyArt(art, stage)) ? { scene: true } : {}),
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
   */
  private idle(): void {
    const run = this.state.run
    const here = run && this.state.mode !== 'title' ? roomAt(run) : undefined
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
   * A running sequence owns the picture, so the tick paints nothing while one
   * is up and puts the counter back to the plate that sequence's own paints
   * land on.
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
   * How much of a horror is left, as the two numbers a band wants.
   *
   * Off the presented state, so a beat holding the previous frame on screen
   * asks about the total that frame showed. Before a fight opens there is no
   * combat in state and the answer is its whole health, which is what a thing
   * waiting at its door is standing there with.
   */
  private enemyHealth(enemyId: string): [number, number] {
    const combat = (this.presenting ?? this.state).run?.combat
    if (combat?.enemyId === enemyId) return [combat.enemyHp, combat.enemyMaxHp]
    const max = enemy(enemyId).maxHp
    return [max, max]
  }

  /**
   * Put one named plate of a horror on screen, where it already is.
   *
   * Straight at the compositor, the way the font's frames and a death's frames
   * go, and for the same reason: a paint reads the plate off state, and state
   * says nothing about which drawing of a thing is up.
   */
  private showPose(enemyId: string, pose: string): void {
    const state = this.presenting ?? this.state
    const combat = state.run?.combat?.enemyId === enemyId ? state.run.combat : undefined
    const art = enemyArt(enemy(enemyId).art, pose)
    const stage = stageForRound(enemyId, combat?.round ?? 1)
    const stance = stanceAt(enemyId, stage)
    placeEnemy(this.world, url(art), {
      width: stance.width,
      foot: stance.foot,
      ...(stance.at !== undefined ? { at: stance.at } : {}),
      ...(stage ? { reach: stage } : {}),
      ...(isScenePlate(art) ? { scene: true } : {}),
    })
  }

  /** Drop the transition and paint the settled truth. Always the last beat. */
  private finish(): void {
    this.presenting = undefined
    this.sequence = undefined
    weaponThrust(this.world, 'rest')
    enemyAdvance(this.world, 'arrive')
    this.render()
  }

  // ── painting ─────────────────────────────────────────────────────────

  private render(): void {
    const state = this.presenting ?? this.state
    const run = state.run
    renderWorld(this.world, state, {
      onLook: (detailId: string) => this.dispatch({ type: 'LOOK', detailId }),
      onRule: () => {
        const combat = this.state.run?.combat
        if (combat) this.say(enemy(combat.enemyId).rule ?? enemy(combat.enemyId).tell)
      },
      onRitual: () => this.dispatch({ type: 'RITUAL_ROLL' }),
      onInteract: (interactionId: string) => this.dispatch({ type: 'INTERACT', interactionId }),
    })

    // The room keeps breathing under all of it. Idempotent for the same room,
    // so the loops are not restarted by the several paints a sequence makes —
    // and torn down the moment the room changes, so nothing is left guttering
    // behind the next one.
    //
    // Keyed by the authored template, because a room's mood is a property of
    // the place rather than of which instance of it the run is standing in.
    this.ambience.show(run && state.mode !== 'title' ? roomAt(run).id : undefined)

    renderTray(
      this.tray,
      state,
      { held: this.currentHeld(state) },
      {
        onMenu: () => this.open({ kind: 'menu' }),
        onFight: () => this.dispatch({ type: 'FIGHT' }),
        onRoll: () => this.dispatch({ type: 'ROLL' }),
        onReroll: () => this.dispatch({ type: 'REROLL', held: this.held.indices }),
        onHold: (index: number) => this.toggleHold(index),
        onScore: (hand: ScoreId) => this.dispatch({ type: 'SCORE', hand }),
        onDrink: () => this.dispatch({ type: 'DRINK' }),
        onInspectReward: (id) => this.open({ kind: 'reward', id: id as RewardId }),
        onGo: (to) => this.dispatch({ type: 'GO', to }),
      },
    )

    renderScreen(
      this.screen,
      state,
      {
        onStart: () => this.dispatch({ type: 'START_RUN' }),
        onContinue: () => this.dispatch({ type: 'CONTINUE' }),
        onTitle: () => this.dispatch({ type: 'TITLE' }),
        onTake: (id) => this.dispatch({ type: 'TAKE', id }),
        onSkip: () => this.dispatch({ type: 'SKIP' }),
      },
      this.discarded,
    )

    if (this.opened) this.paintOverlay(this.opened, state)

    // And the horror keeps breathing under all of it, on the same terms the
    // room's ambience does.
    this.idle()
  }

  private paintOverlay(view: Overlay, state: GameState): void {
    renderOverlay(this.overlay, view, state, () => this.close())
  }

  private open(view: Overlay): void {
    this.opened = view
    this.overlay.hidden = false
    this.paintOverlay(view, this.presenting ?? this.state)
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
