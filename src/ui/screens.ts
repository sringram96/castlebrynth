/**
 * The four full screens: title, reward, death, and getting out.
 *
 * Each one has exactly one required forward route and that route is a large,
 * always-present button. Nothing here depends on prose advancing, on a tab
 * being found, or on an animation finishing.
 */

import {
  COMPLETE_LINE,
  DEATH_LINE,
  REWARD_PROMPT,
  TITLE_LINE,
  TITLE_STALE,
  VERBS,
} from '../content/text.js'
import { isDieId, die as dieById } from '../content/dice.js'
import { relic as relicById } from '../content/relics.js'
import { HANDS, LADDER } from '../combat/scoring.js'
import { roomArt, url } from '../render/assets.js'
import type { GameState } from '../game/state.js'
import { button, dieCard, el, relicCard } from './components.js'

export interface ScreenHandlers {
  readonly onStart: () => void
  readonly onContinue: () => void
  readonly onTitle: () => void
  readonly onTake: (id: string) => void
}

export function renderScreen(
  host: HTMLElement,
  state: GameState,
  on: ScreenHandlers,
  discarded?: string,
): void {
  const showing = state.mode === 'title' || state.mode === 'reward' || state.mode === 'dead' || state.mode === 'complete'
  host.hidden = !showing
  host.replaceChildren()
  if (!showing) return
  host.dataset['screen'] = state.mode

  switch (state.mode) {
    case 'title':
      host.append(title(state, on, discarded))
      return
    case 'reward':
      host.append(reward(state, on))
      return
    case 'dead':
      host.append(dead(state, on))
      return
    case 'complete':
      host.append(complete(state, on))
      return
    default:
      return
  }
}

function backdrop(art: string): HTMLElement {
  const img = el('img', 'screen-art')
  img.src = url(roomArt(art))
  img.alt = ''
  return img
}

function title(state: GameState, on: ScreenHandlers, discarded?: string): HTMLElement {
  const box = el('section', 'screen screen-title')
  box.append(backdrop('threshold'))

  const panel = el('div', 'screen-panel')
  panel.append(el('h1', 'game-title', 'CASTLEBRYNTH'))
  panel.append(el('p', 'screen-line', discarded ? TITLE_STALE : TITLE_LINE))

  const acts = el('div', 'screen-acts')
  // The door only offers what is true: CONTINUE exists when there is a run to
  // continue, and not otherwise.
  if (state.run && state.resume) {
    acts.append(
      button({
        act: 'continue',
        label: VERBS.continue,
        describe: 'Back to where the run stood',
        onPress: on.onContinue,
        className: 'act act-big',
      }),
    )
  }
  acts.append(
    button({
      act: 'start',
      label: VERBS.descend,
      describe: 'Begin a new descent',
      onPress: on.onStart,
      className: 'act act-big act-primary',
    }),
  )
  panel.append(acts)

  if (state.meta.runs > 0) {
    panel.append(
      el('p', 'screen-note', `${state.meta.runs} descents · ${state.meta.wins} ways out`),
    )
  }
  box.append(panel)
  return box
}

function offerCard(id: string, on: ScreenHandlers): HTMLElement {
  const wrap = el('div', 'offer')
  wrap.dataset['offerId'] = id
  wrap.append(isDieId(id) ? dieCard(dieById(id)) : relicCard(relicById(id)))
  const b = button({
    act: 'take',
    label: VERBS.take,
    describe: `Take the ${isDieId(id) ? dieById(id).name : relicById(id).name}`,
    onPress: () => on.onTake(id),
    className: 'act act-take',
  })
  b.dataset['takeId'] = id
  wrap.append(b)
  return wrap
}

function reward(state: GameState, on: ScreenHandlers): HTMLElement {
  const box = el('section', 'screen screen-reward')
  const panel = el('div', 'screen-panel screen-scroll')
  panel.append(el('h2', 'screen-head', 'IT LEFT SOMETHING'))
  panel.append(el('p', 'screen-line', REWARD_PROMPT))
  const list = el('div', 'offers')
  list.id = 'offers'
  for (const id of state.run?.offer ?? []) list.append(offerCard(id, on))
  panel.append(list)
  box.append(panel)
  return box
}

function dead(state: GameState, on: ScreenHandlers): HTMLElement {
  const box = el('section', 'screen screen-dead')
  const panel = el('div', 'screen-panel')
  panel.append(el('h2', 'screen-head', 'YOU DID NOT COME BACK'))
  panel.append(el('p', 'screen-line', DEATH_LINE))
  if (state.run?.cause) panel.append(el('p', 'screen-cause', state.run.cause))

  const run = state.run
  if (run) {
    const carried = [...run.dice.filter((d) => d !== 'plain'), ...run.relics]
    panel.append(
      el(
        'p',
        'screen-note',
        carried.length > 0
          ? `Carried: ${carried
              .map((id) => (isDieId(id) ? dieById(id).name : relicById(id).name))
              .join(' · ')}`
          : 'Carried nothing but the six bones.',
      ),
    )
  }

  // One press. It builds the new run synchronously and enters the first room;
  // it does not reload, and it does not depend on an animation being over.
  const acts = el('div', 'screen-acts')
  acts.append(
    button({
      act: 'start',
      label: VERBS.again,
      describe: 'Start a new run',
      onPress: on.onStart,
      className: 'act act-big act-primary',
    }),
  )
  acts.append(
    button({
      act: 'title',
      label: VERBS.title,
      onPress: on.onTitle,
      className: 'act act-big',
    }),
  )
  panel.append(acts)
  box.append(panel)
  return box
}

function complete(state: GameState, on: ScreenHandlers): HTMLElement {
  const box = el('section', 'screen screen-complete')
  box.append(backdrop('brazier'))
  const panel = el('div', 'screen-panel')
  panel.append(el('h2', 'screen-head', 'OUT'))
  panel.append(el('p', 'screen-line', COMPLETE_LINE))
  const run = state.run
  if (run) {
    panel.append(el('p', 'screen-note', `${run.hp} health left · ${run.path.length} rooms`))
  }
  const acts = el('div', 'screen-acts')
  acts.append(
    button({
      act: 'start',
      label: VERBS.descend,
      describe: 'Descend again',
      onPress: on.onStart,
      className: 'act act-big act-primary',
    }),
  )
  acts.append(button({ act: 'title', label: VERBS.title, onPress: on.onTitle, className: 'act act-big' }))
  panel.append(acts)
  box.append(panel)
  return box
}

/** The loadout overlay, behind INSPECT. Every die and relic, in full. */
export function renderInspect(host: HTMLElement, state: GameState, onClose: () => void): void {
  host.replaceChildren()
  const run = state.run
  if (!run) return
  const panel = el('div', 'screen-panel screen-scroll')
  panel.append(el('h2', 'screen-head', 'WHAT I AM CARRYING'))

  // Grouped, because six cards for five identical bones pushes everything
  // worth reading — the special die, the ladder — below the fold.
  const counted = new Map<string, number>()
  for (const id of run.dice) counted.set(id, (counted.get(id) ?? 0) + 1)

  const dice = el('div', 'offers')
  for (const [id, n] of counted) {
    const card = dieCard(dieById(id))
    if (n > 1) card.querySelector('.card-name')?.append(el('span', 'card-count', `×${n}`))
    dice.append(card)
  }
  panel.append(dice)

  if (run.relics.length > 0) {
    panel.append(el('h2', 'screen-head', 'RELICS'))
    const relics = el('div', 'offers')
    for (const id of run.relics) relics.append(relicCard(relicById(id)))
    panel.append(relics)
  }

  // The ladder, in the order it is worth learning. A player who cannot name
  // the hand they just scored cannot plan the next one, and the ladder is the
  // one piece of the game that is not visible on the combat screen.
  panel.append(el('h2', 'screen-head', 'HANDS'))
  const ladder = el('table', 'ladder')
  for (const name of LADDER) {
    const hand = HANDS[name]
    const row = el('tr', 'ladder-row')
    row.dataset['hand'] = name
    row.append(el('td', 'ladder-name', hand.label))
    row.append(el('td', 'ladder-need', hand.requirement))
    row.append(el('td', 'ladder-mult', `×${hand.multiplier}`))
    ladder.append(row)
  }
  panel.append(ladder)
  panel.append(el('p', 'card-good', 'DAMAGE · the dice you chose, added up, times the hand'))

  panel.append(
    button({ act: 'close', label: VERBS.close, onPress: onClose, className: 'act act-big act-primary' }),
  )
  host.append(panel)
}
