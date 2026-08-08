/**
 * The tray: the painted reliquary and everything the thumb does.
 *
 * The frame is one authored picture and is `pointer-events: none`. Every
 * control on top of it is a real button placed in the tray's own fractions.
 *
 * Four regions never change meaning, in any mode:
 *   the orb        your health
 *   the crown      the six dice, and nothing else
 *   the right bays the relics you are carrying
 *   the three beds MENU · primary · secondary
 *
 * The well is the stage: the score formula in a fight, the room's line out of
 * one. A secondary action that does not exist is **absent**, never disabled.
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
import { VERBS, WELL_IDLE } from '../content/text.js'
import { die as dieById } from '../content/dice.js'
import { faceOf } from '../combat/dice.js'
import { preview } from '../combat/scoring.js'
import { selectionOf } from '../combat/resolve.js'
import { relic as relicById } from '../content/relics.js'
import { enemy as enemyById } from '../content/enemies.js'
import { room as roomById } from '../content/rooms.js'
import type { GameState } from '../game/state.js'
import { button, dieButton, el, place, relicButton, seat, seatBed } from './components.js'

export interface TrayHandlers {
  readonly onDie: (slot: number) => void
  /** A close look at one die. What a crown tap means when nothing is in play. */
  readonly onInspectDie: (dieId: string) => void
  /** A close look at one carried relic. */
  readonly onInspectRelic: (relicId: string) => void
  readonly onMenu: () => void
  readonly onFight: () => void
  readonly onRoll: () => void
  readonly onReroll: () => void
  readonly onScore: () => void
  readonly onGo: (to: string) => void
}

export interface Tray {
  readonly root: HTMLElement
  readonly orb: HTMLElement
  readonly orbText: HTMLElement
  readonly crown: HTMLElement
  readonly well: HTMLElement
  readonly relics: HTMLElement
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

  const orbText = el('div', 'orb-text')
  orbText.id = 'hp'
  place(orbText, ORB_TEXT)

  const crown = el('div', 'crown')
  crown.id = 'crown'

  const well = el('div', 'well')
  well.id = 'well'
  place(well, WELL)

  const relics = el('div', 'relic-row')
  relics.id = 'relics'

  const beds = el('div', 'beds')
  beds.id = 'beds'

  root.append(orb, orbText, crown, well, relics, beds)
  return { root, orb, orbText, crown, well, relics, beds }
}

export function renderTray(tray: Tray, state: GameState, on: TrayHandlers): void {
  const run = state.run
  tray.root.hidden = !(run && (state.mode === 'explore' || state.mode === 'combat'))
  if (!run || tray.root.hidden) return

  renderHealth(tray, run.hp, run.maxHp)
  renderCrown(tray, state, on)
  renderRelics(tray, run.relics, on)
  renderWell(tray, state, on)
  renderBeds(tray, state, on)
}

function renderHealth(tray: Tray, hp: number, maxHp: number): void {
  const fill = tray.orb.querySelector<HTMLElement>('.orb-fill')
  if (fill) fill.style.height = `${Math.max(0, (hp / maxHp) * 100)}%`
  tray.orbText.textContent = `${hp}`
  tray.orbText.dataset['hp'] = String(hp)
  tray.orbText.dataset['maxHp'] = String(maxHp)
  tray.orb.dataset['low'] = hp <= maxHp * 0.3 ? 'yes' : 'no'
}

/**
 * The crown.
 *
 * The count is `run.dice.length` in explore and `combat.roll.length` in a
 * fight, and both of those are the hand. No layout decides how many dice
 * exist; the crown draws what it is given and would draw five if the hand were
 * five.
 */
function renderCrown(tray: Tray, state: GameState, on: TrayHandlers): void {
  const run = state.run!
  const combat = run.combat
  tray.crown.replaceChildren()

  const showing =
    state.mode === 'combat' && combat && combat.roll.length > 0
      ? combat.roll.map((d) => ({
          slot: d.slot,
          dieId: d.dieId,
          face: faceOf(d),
          selected: combat.selected.includes(d.slot),
        }))
      : run.dice.map((dieId, slot) => ({
          slot,
          dieId,
          // Out of a roll the crown shows each die's last face, so the
          // loadout reads as itself rather than as a frozen throw.
          face: dieById(dieId).faces[5],
          selected: false,
        }))

  tray.crown.dataset['count'] = String(showing.length)
  // Dice are choosable only when there is a throw on the table. Exploring, and
  // in a fight before its roll, a tap has nothing to choose — so it inspects
  // that die instead of dispatching a SELECT the reducer would discard.
  const inPlay = state.mode === 'combat' && (combat?.roll.length ?? 0) > 0

  showing.forEach((d, index) => {
    const centre = DIE_CENTRES[index] ?? DIE_CENTRES[DIE_CENTRES.length - 1]!
    const view = { ...d, inPlay }
    const b = dieButton(view, () => (inPlay ? on.onDie(d.slot) : on.onInspectDie(d.dieId)))
    seat(b, centre, DIE_PITCH)
    if (!inPlay) b.dataset['idle'] = 'yes'
    tray.crown.append(b)
  })
}

/**
 * The three bays on the right.
 *
 * A carried relic is visible here, in acquisition order, without opening
 * anything — which is the whole point of the bays. Pressing one inspects it
 * and moves no state. There are three bays and no scrolling: a fourth relic
 * lives in MENU, and the third bay says how many are behind it.
 */
function renderRelics(tray: Tray, ids: readonly string[], on: TrayHandlers): void {
  tray.relics.replaceChildren()
  tray.relics.dataset['count'] = String(ids.length)
  const shown = ids.slice(0, RELIC_CENTRES.length)
  shown.forEach((id, index) => {
    const b = relicButton(relicById(id), () => on.onInspectRelic(id))
    seat(b, RELIC_CENTRES[index]!, RELIC_PITCH)
    const hidden = index === shown.length - 1 ? ids.length - shown.length : 0
    if (hidden > 0) b.append(el('span', 'relic-more', `+${hidden}`))
    tray.relics.append(b)
  })
}

/** The stage. One reading at a time, and it is always the important one. */
function renderWell(tray: Tray, state: GameState, on: TrayHandlers): void {
  const run = state.run!
  tray.well.replaceChildren()

  if (state.mode === 'combat' && run.combat) {
    const combat = run.combat
    if (combat.phase === 'intent') {
      tray.well.append(el('p', 'well-line', combat.log.at(-1) ?? WELL_IDLE))
      return
    }
    if (combat.selected.length === 0) {
      tray.well.append(el('p', 'well-line', WELL_IDLE))
      return
    }
    const p = preview(selectionOf(combat), run.relics, combat.spentHands)
    const box = el('div', 'score')
    box.id = 'score'
    box.dataset['damage'] = String(p.damage)
    box.dataset['hand'] = p.hand.name

    box.append(el('span', 'score-hand', p.hand.label))
    const sum = el('span', 'score-formula')
    sum.append(
      el('b', 'term term-sum', String(p.sum)),
      el('i', 'op', '×'),
      el('b', 'term term-mult', String(p.multiplier)),
    )
    for (const bonus of p.bonuses) {
      sum.append(el('i', 'op', '+'), el('b', 'term term-relic', String(bonus.amount)))
    }
    sum.append(el('i', 'op', '='), el('b', 'term term-damage', String(p.damage)))
    box.append(sum)

    // Every extra number in the formula is then named. A row of unexplained
    // `+8 +12` is not a preview, it is a puzzle — and the player is being
    // asked to commit to it.
    for (const bonus of p.bonuses) {
      const line = el('p', 'score-credit', `${bonus.label} +${bonus.amount}`)
      if (bonus.relicId) line.dataset['relicId'] = bonus.relicId
      box.append(line)
    }

    // What SCORE will do to *you*, with the verb. `−7 HP` next to a red die is
    // a number; "Lose 7 HP" is the consequence.
    if (p.cost > 0) box.append(el('p', 'score-toll toll-hurt', `Lose ${p.cost} HP`))
    for (const gain of p.heals) {
      const literal = gain.label === 'Green face' ? `Heal ${gain.amount} HP` : `${gain.label} heals ${gain.amount} HP`
      const line = el('p', 'score-toll toll-heal', literal)
      if (gain.relicId) line.dataset['relicId'] = gain.relicId
      box.append(line)
    }
    tray.well.append(box)
    return
  }

  // Out of a fight the well carries the decision, not the prose. What was
  // looked at is already in the word band over the world; repeating it here
  // would spend the one region that can make a fork legible.
  const here = roomById(run.roomId)

  if (here.enemy && !run.cleared.includes(run.roomId)) {
    const e = enemyById(here.enemy)
    const box = el('div', 'brief')
    box.append(el('span', 'brief-name', e.name))
    box.append(el('p', 'well-line', e.tell))
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
 * Left is MENU, always, in both modes. Centre is the primary action.
 * Right is the secondary, and is simply not rendered when there is not one —
 * a greyed button that explains nothing is the defect this replaces.
 */
function renderBeds(tray: Tray, state: GameState, on: TrayHandlers): void {
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
      describe: 'Open dice, relics, and scoring reference',
      onPress: on.onMenu,
      className: 'act act-side',
    }),
  )

  if (state.mode === 'combat' && run.combat) {
    const combat = run.combat
    if (combat.phase === 'intent') {
      bed(1, button({ act: 'roll', label: VERBS.roll, onPress: on.onRoll, className: 'act act-primary' }))
      return
    }
    const canScore = combat.selected.length > 0
    bed(
      1,
      button({
        act: 'score',
        label: VERBS.score,
        describe: canScore ? 'Commit the previewed hand' : 'Choose dice to score',
        onPress: on.onScore,
        className: `act act-primary${canScore ? '' : ' act-waiting'}`,
      }),
    )
    if (combat.phase === 'rolled') {
      bed(
        2,
        button({
          act: 'reroll',
          label: VERBS.reroll,
          describe: 'Throw every die you have not chosen',
          onPress: on.onReroll,
          className: 'act act-side',
        }),
      )
    }
    return
  }

  // Exploring. The room's enemy, if it is still up, is the only way on.
  const here = roomById(run.roomId)
  if (here.enemy && !run.cleared.includes(run.roomId)) {
    bed(1, button({ act: 'fight', label: VERBS.fight, onPress: on.onFight, className: 'act act-primary' }))
    return
  }

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
