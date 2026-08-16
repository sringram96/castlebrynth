/**
 * The four full screens: title, reward, death, and getting out — and the
 * overlays behind MENU and a close look at one thing.
 *
 * Each screen has exactly one required forward route and that route is a
 * large, always-present button. Nothing here depends on prose advancing, on a
 * tab being found, or on an animation finishing.
 */

import {
  COMPLETE_LINE,
  DEATH_LINE,
  HOW_A_FIGHT_GOES,
  REWARD_PROMPT,
  TITLE_LINE,
  TITLE_STALE,
  VERBS,
} from '../content/text.js'
import { CRAP_MULTIPLIER, CRAP_NAME, HAND_DEFINITIONS } from '../combat/hands.js'
import { REWARDS, reward as rewardById } from '../content/rewards.js'
import type { RewardId } from '../content/rewards.js'
import { enemy as enemyById } from '../content/enemies.js'
import { carriedNames } from '../game/reducer.js'
import { roomArt, url } from '../render/assets.js'
import type { GameState } from '../game/state.js'
import { button, el, rewardCard } from './components.js'

export interface ScreenHandlers {
  readonly onStart: () => void
  readonly onContinue: () => void
  readonly onTitle: () => void
  readonly onTake: (id: RewardId) => void
  readonly onSkip: () => void
}

export function renderScreen(
  host: HTMLElement,
  state: GameState,
  on: ScreenHandlers,
  discarded?: string,
): void {
  const showing =
    state.mode === 'title' || state.mode === 'reward' || state.mode === 'dead' || state.mode === 'complete'
  host.hidden = !showing
  host.replaceChildren()
  if (!showing) {
    // Clear the name too. A hidden screen that still says it is the reward
    // screen is a lie anything reading the DOM will believe.
    delete host.dataset['screen']
    return
  }
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

function offerCard(id: RewardId, on: ScreenHandlers): HTMLElement {
  const wrap = el('div', 'offer')
  wrap.dataset['offerId'] = id
  wrap.append(rewardCard(rewardById(id)))
  const b = button({
    act: 'take',
    label: VERBS.take,
    describe: `Take the ${rewardById(id).name}`,
    onPress: () => on.onTake(id),
    className: 'act act-take',
  })
  b.dataset['takeId'] = id
  wrap.append(b)
  return wrap
}

/**
 * The reward screen.
 *
 * SKIP is a real button and it is not an afterthought: a reward screen may
 * never force a change on the run, and a screen with no way out would be the
 * game making the choice for you.
 */
function reward(state: GameState, on: ScreenHandlers): HTMLElement {
  const box = el('section', 'screen screen-reward')
  const panel = el('div', 'screen-panel screen-scroll')
  panel.append(el('h2', 'screen-head', 'IT LEFT SOMETHING'))
  panel.append(el('p', 'screen-line', REWARD_PROMPT))

  const run = state.run
  const list = el('div', 'offers')
  list.id = 'offers'
  for (const id of run?.offer ?? []) list.append(offerCard(id, on))
  panel.append(list)

  panel.append(
    button({
      act: 'skip',
      label: VERBS.skip,
      describe: 'Leave it where it fell',
      onPress: on.onSkip,
      className: 'act act-big',
    }),
  )
  box.append(panel)
  return box
}

function dead(state: GameState, on: ScreenHandlers): HTMLElement {
  const box = el('section', 'screen screen-dead')
  const panel = el('div', 'screen-panel')
  panel.append(el('h2', 'screen-head', 'YOU DID NOT COME BACK'))
  panel.append(el('p', 'screen-line', DEATH_LINE))
  if (state.run?.cause) panel.append(el('p', 'screen-cause', state.run.cause))

  // The run, in three facts. Not a graveyard and not a ledger — what is left,
  // what was still being carried, and how far down it got.
  const run = state.run
  if (run) {
    const summary = el('div', 'run-summary')
    summary.id = 'run-summary'
    summary.append(el('p', 'screen-note', `${run.bones} bones left`))
    const carried = carriedNames(run)
    if (carried.length > 0) summary.append(el('p', 'screen-note', `Carried: ${carried.join(' · ')}`))
    summary.append(
      el('p', 'screen-note', `${run.path.length} ${run.path.length === 1 ? 'room' : 'rooms'} down`),
    )
    panel.append(summary)
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
    panel.append(
      el('p', 'screen-note', `${run.bones} bones left · ${run.path.length} rooms`),
    )
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

/**
 * What the overlay is showing.
 *
 * `menu` is the pile, the satchel and the rules — the global thing the
 * bottom-left bed opens, and the place the full scorecard is printed at a size
 * a person can read. `reward` is an **inspection**: one carried thing, because
 * that is the only thing the word inspect is allowed to mean.
 *
 * Neither of them can change anything. The Pouch could, and it is gone with
 * the fielding decision it existed to carry — the choice inside a fight is
 * which hand to score, and that is made on the tray where the dice are.
 */
export type Overlay =
  | { readonly kind: 'menu' }
  | { readonly kind: 'reward'; readonly id: RewardId }

export function renderOverlay(
  host: HTMLElement,
  view: Overlay,
  state: GameState,
  onClose: () => void,
): void {
  host.replaceChildren()
  host.dataset['overlay'] = view.kind
  const panel = view.kind === 'menu' ? menuPanel(state) : focusPanel(view)
  if (!panel) return
  panel.append(
    button({ act: 'close', label: VERBS.close, onPress: onClose, className: 'act act-big act-primary' }),
  )
  host.append(panel)
}

/**
 * A close look at one thing.
 *
 * It is the same card the reward screen and the menu show, on its own, so a
 * player never has to reconcile two descriptions of one object.
 */
function focusPanel(view: Overlay & { kind: 'reward' }): HTMLElement {
  const panel = el('div', 'screen-panel screen-focus')
  panel.dataset['focus'] = view.id
  panel.append(rewardCard(rewardById(view.id)))
  return panel
}

/**
 * The scorecard, printed at a size that can be read.
 *
 * The tray's copy is compact by necessity — it has an eighth of the screen and
 * it is showing eight entries and a row of live buttons at once. This is the
 * same table with room to breathe, and it is the only other place the
 * multipliers are stated, so the two cannot drift: both read
 * `HAND_DEFINITIONS`.
 */
function scorecardTable(state: GameState): HTMLElement {
  const used = new Set(state.run?.combat?.usedHands ?? [])
  const table = el('div', 'hand-table')
  table.id = 'hand-table'
  for (const hand of HAND_DEFINITIONS) {
    const row = el('div', 'hand-row')
    row.dataset['hand'] = hand.id
    row.dataset['used'] = used.has(hand.id) ? 'yes' : 'no'
    row.append(el('b', 'hand-name', hand.name))
    row.append(el('i', 'hand-mult', `×${hand.multiplier}`))
    row.append(el('span', 'hand-rule', hand.rule))
    table.append(row)
  }
  const crap = el('div', 'hand-row hand-crap')
  crap.dataset['hand'] = 'crap'
  crap.dataset['used'] = 'no'
  crap.append(el('b', 'hand-name', CRAP_NAME))
  crap.append(el('i', 'hand-mult', `×${CRAP_MULTIPLIER}`))
  crap.append(el('span', 'hand-rule', 'Nothing else fits. Always there, never spent.'))
  table.append(crap)
  return table
}

/** MENU: the pile, the satchel, the rules, and the scorecard. */
function menuPanel(state: GameState): HTMLElement | null {
  const run = state.run
  if (!run) return null
  const panel = el('div', 'screen-panel screen-scroll')
  panel.append(el('h2', 'screen-head', 'MENU'))

  panel.append(el('h2', 'screen-head', 'THE PILE'))
  const pile = el('p', 'pile-total', `${run.bones} BONES`)
  pile.id = 'pile-total'
  pile.dataset['bones'] = String(run.bones)
  panel.append(pile)
  panel.append(
    el(
      'p',
      'screen-line',
      `An attack throws ${Math.min(6, run.bones)} of them. Thirty is as many as I can carry.`,
    ),
  )

  panel.append(el('h2', 'screen-head', 'SATCHEL'))
  if (run.vials > 0) {
    const satchel = el('div', 'offers')
    satchel.append(rewardCard(REWARDS.vial, run.vials))
    panel.append(satchel)
  } else {
    panel.append(el('p', 'screen-line', 'Empty. A Vial sits in the bay on the right of the tray.'))
  }

  // The whole fight, in five lines. It is short enough to be worth reading and
  // it is the only piece of the rules that is not visible on the fight screen.
  panel.append(el('h2', 'screen-head', 'A FIGHT'))
  const rules = el('ul', 'rules')
  rules.id = 'rules'
  for (const line of HOW_A_FIGHT_GOES) rules.append(el('li', 'rule-line', line))
  panel.append(rules)

  panel.append(el('h2', 'screen-head', 'HANDS'))
  panel.append(scorecardTable(state))

  // An encounter's rule belongs to its fight, not to the global card. It is
  // printed here only while standing in front of the thing it applies to.
  const combat = run.combat
  const rule = combat ? enemyById(combat.enemyId).rule : undefined
  if (rule) {
    const note = el('p', 'rule-encounter', rule)
    note.id = 'rule-encounter'
    panel.append(note)
  }
  return panel
}
