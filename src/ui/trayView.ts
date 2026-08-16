/**
 * The tray: the painted reliquary and everything the thumb does.
 *
 * The frame is one authored picture and is `pointer-events: none`. Every
 * control on top of it is a real button placed in the tray's own fractions.
 *
 * The geometry is unchanged and the meaning of two regions is not:
 *
 *   the orb        the pile — how many bones are alive
 *   the crown      the attack: up to six bones, held or thrown
 *   the well       the scorecard, and the hands that can be scored right now
 *   the right bays the satchel: the Vial
 *   the three beds MENU · ROLL or REROLL · a second route out of a room
 *
 * A secondary action that does not exist is **absent**, never disabled. The
 * one verb in the middle bed is whichever throw is left; scoring is not a verb
 * in a bed, because *which hand* is the decision and a bed cannot carry it.
 */

import {
  ACTION_BEDS,
  DIE_CENTRES,
  DIE_PITCH,
  ORB,
  ORB_TEXT,
  RELIC_CENTRES,
  RELIC_PITCH,
  WELL,
} from '../content/tray.js'
import { ATTACK_LINE, VERBS, WELL_IDLE } from '../content/text.js'
import { BONE_CEILING, roomToRecover } from '../content/bones.js'
import {
  HAND_DEFINITIONS,
  CRAP_MULTIPLIER,
  CRAP_NAME,
  legalScores,
  matchingHands,
  scoreDice,
  scoreName,
} from '../combat/hands.js'
import type { ScoreId } from '../combat/hands.js'
import { MAX_ROLLS, activeDice } from '../combat/roll.js'
import type { DieValue } from '../combat/roll.js'
import { enemy as enemyById } from '../content/enemies.js'
import { roomAt } from '../game/map.js'
import { exitsOpen, stateOf } from '../content/interactions.js'
import type { CombatState, GameState, RunState } from '../game/state.js'
import { button, dieButton, dieFace, el, place, seat, seatBed } from './components.js'

/**
 * Which dice the player is holding, and for which throw.
 *
 * Presentation-local and deliberately not in `GameState`: lighting a die is a
 * thought, not a move, and it reaches the reducer once, whole, on the REROLL
 * that acts on it. A reload may forget which dice were highlighted; it must
 * not forget the faces, and it must not grant another throw.
 */
export interface HoldDraft {
  readonly indices: readonly number[]
}

export interface TrayHandlers {
  readonly onMenu: () => void
  readonly onFight: () => void
  /** Throw the bones the pile can put up. The first press of an attack. */
  readonly onRoll: () => void
  /** Throw the unheld ones again. */
  readonly onReroll: () => void
  /** Hold this die, or let it go. Draft only; nothing is committed. */
  readonly onHold: (index: number) => void
  /** Commit the dice as one hand. The attack, in one press. */
  readonly onScore: (hand: ScoreId) => void
  readonly onDrink: () => void
  /** A close look at one satchel utility. No state change. */
  readonly onInspectReward: (id: string) => void
  readonly onGo: (to: string) => void
}

/** What the tray needs to know that is not in the save. */
export interface TrayView {
  readonly held: HoldDraft
}

export interface Tray {
  readonly root: HTMLElement
  readonly orb: HTMLElement
  readonly orbText: HTMLElement
  readonly crown: HTMLElement
  readonly well: HTMLElement
  readonly satchel: HTMLElement
  readonly beds: HTMLElement
}

export function mountTray(root: HTMLElement, frameSrc: string): Tray {
  root.replaceChildren()

  const frame = el('img', 'tray-frame')
  frame.id = 'tray-frame'
  frame.src = frameSrc
  frame.alt = ''
  root.append(frame)

  const orb = el('div', 'orb')
  orb.id = 'orb'
  place(orb, ORB)
  const orbFill = el('i', 'orb-fill')
  orb.append(orbFill)

  const orbText = el('div', 'pile-count')
  orbText.id = 'pile'
  place(orbText, ORB_TEXT)

  const crown = el('div', 'crown')
  crown.id = 'crown'

  const well = el('div', 'well')
  well.id = 'well'
  place(well, WELL)

  const satchel = el('div', 'satchel')
  satchel.id = 'satchel'

  const beds = el('div', 'beds')
  beds.id = 'beds'

  root.append(orb, orbText, crown, well, satchel, beds)
  return { root, orb, orbText, crown, well, satchel, beds }
}

export function renderTray(tray: Tray, state: GameState, view: TrayView, on: TrayHandlers): void {
  const run = state.run
  tray.root.hidden = !(run && (state.mode === 'explore' || state.mode === 'combat'))
  if (!run || tray.root.hidden) return

  const combat = state.mode === 'combat' ? run.combat : undefined
  renderPile(tray, run)
  renderAttack(tray, run, combat, view, on)
  renderSatchel(tray, run, combat, on)
  renderWell(tray, state, combat, on)
  renderBeds(tray, state, combat, view, on)
}

/**
 * The pile.
 *
 * A count, and a level that reads as a heap rather than as a fluid. Nothing
 * here divides by a maximum-life field, because there is not one: the fill is
 * against the ceiling, which is a content constant and the same number the
 * Font and a Vial measure against.
 */
function renderPile(tray: Tray, run: RunState): void {
  const bones = run.bones
  const fill = tray.orb.querySelector<HTMLElement>('.orb-fill')
  if (fill) fill.style.height = `${Math.max(0, Math.min(1, bones / BONE_CEILING)) * 100}%`
  tray.orbText.textContent = `${bones}`
  tray.orbText.dataset['bones'] = String(bones)
  tray.orbText.setAttribute('aria-label', `${bones} living bones`)
  // Six is the line the dice game itself crosses: below it an attack stops
  // rolling a full hand and the good shapes start dropping out of reach.
  tray.orb.dataset['low'] = bones <= 6 ? 'yes' : 'no'
}

/** Whether an attack still has a throw left in it. */
function canReroll(combat: CombatState): boolean {
  return combat.dice.length > 0 && combat.rollsUsed >= 1 && combat.rollsUsed < MAX_ROLLS
}

/**
 * The crown: the attack.
 *
 * Three different things, and each of them is the truth of where the attack
 * stands. Before the first throw it shows *how many bones this attack has* —
 * `min(6, bones)` backs, no faces, because no face has been decided and
 * showing one would be the view inventing a number the reducer has not drawn.
 * With a throw still in hand every die is a real HOLD button. With none left
 * they are faces and nothing else, because there is nothing to do with them.
 *
 * Out of a fight it is empty: the pile is the loadout now, and six sockets
 * pretending to be a hand would be furniture left standing.
 */
function renderAttack(
  tray: Tray,
  run: RunState,
  combat: CombatState | undefined,
  view: TrayView,
  on: TrayHandlers,
): void {
  tray.crown.replaceChildren()

  if (!combat || combat.defeated) {
    tray.crown.dataset['count'] = '0'
    delete tray.crown.dataset['rolls']
    return
  }

  tray.crown.dataset['rolls'] = String(combat.rollsUsed)

  const seatDie = (node: HTMLElement, index: number): void => {
    const centre = DIE_CENTRES[index] ?? DIE_CENTRES[DIE_CENTRES.length - 1]!
    seat(node, centre, DIE_PITCH)
    tray.crown.append(node)
  }

  // Nothing thrown yet: the shape of the attack, and how wide the pile lets it
  // be. These are not controls — there is nothing to hold — so they are not
  // buttons.
  if (combat.dice.length === 0) {
    const width = activeDice(run.bones)
    tray.crown.dataset['count'] = String(width)
    for (let index = 0; index < width; index++) {
      const node = el('div', 'bone')
      node.dataset['index'] = String(index)
      node.dataset['held'] = 'no'
      node.setAttribute('role', 'img')
      node.setAttribute('aria-label', `Bone ${index + 1}, not thrown yet`)
      node.append(el('span', 'bone-face bone-back'))
      seatDie(node, index)
    }
    return
  }

  tray.crown.dataset['count'] = String(combat.dice.length)
  const holding = canReroll(combat)
  const held = new Set(view.held.indices)

  combat.dice.forEach((value: DieValue, index) => {
    const isHeld = held.has(index)
    if (!holding) {
      const node = el('div', 'bone')
      node.dataset['index'] = String(index)
      node.dataset['value'] = String(value)
      node.dataset['held'] = 'no'
      node.setAttribute('role', 'img')
      node.setAttribute('aria-label', `Die ${index + 1}, showing ${value}`)
      node.append(dieFace(value))
      seatDie(node, index)
      return
    }
    const b = dieButton(
      { index, value, held: isHeld },
      { act: 'hold', onPress: () => on.onHold(index) },
    )
    seatDie(b, index)
  })
}

/**
 * The bays on the right: the satchel.
 *
 * One thing in it, and it sits in the bay it has always sat in. The other two
 * recesses are left showing rather than the control being re-centred on the
 * plate: the recesses are part of the picture, and sliding a control around to
 * hide that the Pouch is gone would be the tray pretending its own geometry
 * changed.
 */
function renderSatchel(
  tray: Tray,
  run: RunState,
  combat: CombatState | undefined,
  on: TrayHandlers,
): void {
  tray.satchel.replaceChildren()

  const canDrink = run.vials > 0 && roomToRecover(run) > 0 && (!combat || !combat.defeated)
  const b = button({
    act: canDrink ? 'drink' : 'inspect-reward',
    label: '',
    describe: canDrink
      ? `Drink a Vial: 5 bones back, up to ${BONE_CEILING}`
      : `Vials: ${run.vials}. Inspect`,
    onPress: canDrink ? on.onDrink : () => on.onInspectReward('vial'),
    className: 'satchel-slot',
  })
  b.dataset['slotId'] = 'vial'
  b.dataset['live'] = canDrink ? 'yes' : 'no'
  b.append(el('span', 'satchel-label', 'VIAL'))
  const badge = el('b', 'satchel-count', String(run.vials))
  badge.dataset['count'] = String(run.vials)
  b.append(badge)
  seat(b, RELIC_CENTRES[0]!, RELIC_PITCH)
  tray.satchel.append(b)
}

/** How a multiplier prints on the scorecard. `×2`, `×1.25`, `×0.5`. */
function showMultiplier(multiplier: number): string {
  return `×${multiplier}`
}

/**
 * The scorecard.
 *
 * Every named hand, its multiplier, and whether it has been spent — all eight
 * of them, all the time, because *what is left* is the decision the fight is
 * made of and a card that only listed what qualifies would hide it.
 *
 * Three states and no fourth:
 *
 *   **used**       spent this fight. Non-interactive text with a struck look.
 *   **legal**      unspent and matched by the dice on the table. A real button.
 *   otherwise      unspent and not matched. Non-interactive text.
 *
 * Nothing here is a disabled button. A hand you cannot score right now is
 * information; a greyed control that explains nothing is the defect this
 * replaces.
 */
function renderScorecard(
  host: HTMLElement,
  combat: CombatState,
  on: TrayHandlers,
): void {
  const card = el('div', 'scorecard')
  card.id = 'scorecard'
  const used = new Set(combat.usedHands)
  const matched = new Set(matchingHands(combat.dice))
  const legal = new Set(legalScores(combat.dice, combat.usedHands))

  for (const hand of HAND_DEFINITIONS) {
    const isUsed = used.has(hand.id)
    const isLegal = legal.has(hand.id)
    const entry = isLegal
      ? button({
          act: 'score',
          label: '',
          describe: `Score ${hand.name}, ${showMultiplier(hand.multiplier)} — ${
            scoreDice(combat.dice, hand.id).damage
          }`,
          onPress: () => on.onScore(hand.id),
          className: 'score-entry',
        })
      : el('span', 'score-entry')
    entry.dataset['hand'] = hand.id
    entry.dataset['used'] = isUsed ? 'yes' : 'no'
    entry.dataset['legal'] = isLegal ? 'yes' : 'no'
    if (matched.has(hand.id) && !isUsed) entry.dataset['matched'] = 'yes'
    entry.append(el('b', 'score-name', hand.name))
    entry.append(el('i', 'score-mult', showMultiplier(hand.multiplier)))
    card.append(entry)
  }

  // The fallback, and only when it is the answer. It is not a category, it is
  // never spent, and it is here rather than in the eight because putting it in
  // the grid would make it look like something that can run out.
  if (legal.has('crap')) {
    const b = button({
      act: 'score',
      label: '',
      describe: `Score ${CRAP_NAME}, ${showMultiplier(CRAP_MULTIPLIER)} — ${
        scoreDice(combat.dice, 'crap').damage
      }`,
      onPress: () => on.onScore('crap'),
      className: 'score-entry score-crap',
    })
    b.dataset['hand'] = 'crap'
    b.dataset['legal'] = 'yes'
    b.append(el('b', 'score-name', CRAP_NAME))
    b.append(el('i', 'score-mult', showMultiplier(CRAP_MULTIPLIER)))
    card.append(b)
  }

  host.append(card)
}

/** Which line the well carries, from the position the dice describe. */
function attackLine(combat: CombatState): string {
  if (combat.dice.length === 0) return ATTACK_LINE.waiting
  return canReroll(combat) ? ATTACK_LINE.open : ATTACK_LINE.last
}

/** The stage. One reading at a time, and it is always the important one. */
function renderWell(
  tray: Tray,
  state: GameState,
  combat: CombatState | undefined,
  on: TrayHandlers,
): void {
  const run = state.run!
  tray.well.replaceChildren()

  if (combat) {
    // It is finished. What the well carries now is the last beat of the fight
    // rather than an instruction for a press that can no longer happen.
    if (combat.defeated) {
      tray.well.append(el('p', 'well-line', combat.log.at(-1) ?? WELL_IDLE))
      return
    }

    const box = el('div', 'attack-read')
    box.id = 'attack-read'
    box.dataset['dice'] = String(combat.dice.length)
    box.dataset['rollsUsed'] = String(combat.rollsUsed)

    // What the dice are worth before the multiplier, so the two halves of the
    // decision — the total and the shape — are both readable at once.
    if (combat.dice.length > 0) {
      const sum = combat.dice.reduce((total: number, die: DieValue) => total + die, 0)
      const total = el('p', 'attack-sum', `${sum}`)
      total.id = 'attack-sum'
      total.dataset['sum'] = String(sum)
      total.setAttribute('aria-label', `The bones on the table add to ${sum}`)
      box.append(total)
    }

    renderScorecard(box, combat, on)
    box.append(el('p', 'well-line', attackLine(combat)))
    tray.well.append(box)
    return
  }

  // Out of a fight the well carries the decision, not the prose. What was
  // looked at is already in the word band over the world; repeating it here
  // would spend the one region that can make a fork legible.
  const here = roomAt(run)

  if (here.enemy && !run.cleared.includes(run.roomId)) {
    const e = enemyById(here.enemy)
    const box = el('div', 'brief')
    box.append(el('span', 'brief-name', e.name))
    box.append(el('p', 'well-line', e.tell))
    if (e.rule) box.append(el('p', 'well-rule', e.rule))
    tray.well.append(box)
    return
  }

  // A room whose ritual is unresolved reads exactly as a room whose enemy is
  // still up: the thing in the middle of it, named, and what it will do.
  if (here.ritual && run.ritual?.roomId !== run.roomId) {
    const box = el('div', 'brief')
    box.append(el('span', 'brief-name', here.ritual.name))
    box.append(el('p', 'well-line', here.ritual.prompt))
    tray.well.append(box)
    return
  }

  // A shut room says what it is waiting for, exactly as an unresolved font
  // does — the exits are not offered, so the well has to carry the reason.
  if (!exitsOpen(stateOf(run.rooms, run.roomId, here.id))) {
    const box = el('div', 'brief')
    box.append(el('span', 'brief-name', here.name))
    box.append(el('p', 'well-line', run.say))
    tray.well.append(box)
    return
  }

  // Each way on, and what it smells like. This is the whole of the fork.
  const routes = el('div', 'routes')
  for (const exit of here.exits) {
    const line = el('p', 'route')
    line.append(el('b', 'route-label', exit.label))
    line.append(document.createTextNode(` ${exit.sense}`))
    routes.append(line)
  }
  if (here.exits.length === 0) routes.append(el('p', 'well-line', run.say))
  tray.well.append(routes)
}

/**
 * The three beds.
 *
 * Left is MENU, always, in both modes. Centre is whichever throw is left.
 * Right is the secondary, and is simply not rendered when there is not one — a
 * greyed button that explains nothing is the defect this replaces.
 *
 * There is no verb for scoring. Which hand to spend *is* the decision, so the
 * choice itself is the commitment and it lives on the scorecard where the
 * multipliers are.
 */
function renderBeds(
  tray: Tray,
  state: GameState,
  combat: CombatState | undefined,
  view: TrayView,
  on: TrayHandlers,
): void {
  const run = state.run!
  tray.beds.replaceChildren()

  const bed = (index: number, node: HTMLElement): void => {
    seatBed(node, ACTION_BEDS[index]!)
    tray.beds.append(node)
  }

  bed(
    0,
    button({
      act: 'menu',
      label: VERBS.menu,
      describe: 'Open the pile, the satchel and the rules',
      onPress: on.onMenu,
      className: 'act act-side',
    }),
  )

  if (combat) {
    // While the thing is dying there is no move to make, so none is offered —
    // not greyed out, not shown waiting: absent. The reducer refuses all of
    // them anyway; this is the half of that rule the player can see.
    if (combat.defeated) return

    if (combat.dice.length === 0) {
      const width = activeDice(run.bones)
      if (width === 0) return
      bed(
        1,
        button({
          act: 'roll',
          label: VERBS.roll,
          describe: `Throw ${width} ${width === 1 ? 'bone' : 'bones'}`,
          onPress: on.onRoll,
          className: 'act act-primary',
        }),
      )
      return
    }

    // A throw in which nothing moves is not a throw, so it is not offered.
    const free = combat.dice.length - new Set(view.held.indices).size
    if (canReroll(combat) && free > 0) {
      bed(
        1,
        button({
          act: 'reroll',
          label: VERBS.reroll,
          describe: `Throw ${free} ${free === 1 ? 'bone' : 'bones'} again`,
          onPress: on.onReroll,
          className: 'act act-primary',
        }),
      )
    }
    return
  }

  // Exploring. The room's enemy, if it is still up, is the only way on — and
  // only while there is something left to throw. An empty pile is not a fight
  // the reducer will open, so it is not a press the tray offers.
  const here = roomAt(run)
  if (here.enemy && !run.cleared.includes(run.roomId)) {
    if (run.bones > 0) {
      bed(1, button({ act: 'fight', label: VERBS.fight, onPress: on.onFight, className: 'act act-primary' }))
    }
    return
  }

  // The same for a font that has not been used. There is no way on yet — the
  // reducer will not grant one — so no way on is offered.
  if (here.ritual && run.ritual?.roomId !== run.roomId) return

  // And the same again for a room whose machinery is still shut. The gate is
  // not down as a matter of styling: the reducer rejects `GO` while it is, so
  // offering the press would be offering a button that does nothing. One
  // statement — `exitsOpen` — answers for both of them.
  if (!exitsOpen(stateOf(run.rooms, run.roomId, here.id))) return

  // The map's exits, resolved through `roomAt`. The view renders what the
  // reducer would accept and never constructs a destination of its own — a
  // `to` here is a node id the map already holds.
  const exits = here.exits
  if (exits[0]) {
    const b = button({
      act: 'go',
      label: exits[0].label,
      describe: `${exits[0].label} — ${exits[0].sense}`,
      onPress: () => on.onGo(exits[0]!.to),
      className: 'act act-primary',
    })
    b.dataset['to'] = exits[0].to
    bed(1, b)
  }
  if (exits[1]) {
    const b = button({
      act: 'go',
      label: exits[1].label,
      describe: `${exits[1].label} — ${exits[1].sense}`,
      onPress: () => on.onGo(exits[1]!.to),
      className: 'act act-side',
    })
    b.dataset['to'] = exits[1].to
    bed(2, b)
  }
}

/**
 * The face a bone shows while it is in the air.
 *
 * Cosmetic only, and deterministic by construction: the position and the step
 * choose which face flickers past, so a bone in flight cannot show a value the
 * run did not produce and a replay cannot differ. `step === undefined` puts
 * back the exact face node the reducer chose.
 */
const settledFace = new WeakMap<HTMLElement, HTMLElement>()

export function paintTumble(bone: HTMLElement, step: number | undefined): void {
  const current = bone.querySelector<HTMLElement>('.bone-face')
  if (!current) return

  if (step === undefined) {
    const settled = settledFace.get(bone)
    if (settled && settled !== current) current.replaceWith(settled)
    settledFace.delete(bone)
    return
  }

  if (!settledFace.has(bone)) settledFace.set(bone, current)
  const index = Number(bone.dataset['index']) || 0
  const face = (((index * 2 + step * 3 + 1) % 6) + 1) as DieValue
  current.replaceWith(dieFace(face))
}

/** Every score the player may press right now. Read by the browser journey. */
export function scoresOnOffer(combat: CombatState): readonly ScoreId[] {
  return legalScores(combat.dice, combat.usedHands)
}

/** What a score is called. Re-exported so views ask one module. */
export { scoreName }
