/**
 * The four full screens: title, reward, death, and getting out — and the
 * overlays behind MENU, the Pouch and a close look at one thing.
 *
 * Each screen has exactly one required forward route and that route is a
 * large, always-present button. Nothing here depends on prose advancing, on a
 * tab being found, or on an animation finishing.
 */

import {
  COMPLETE_LINE,
  DEATH_LINE,
  REWARD_PROMPT,
  TITLE_LINE,
  TITLE_STALE,
  VERBS,
  WAR_OF_BONES,
} from '../content/text.js'
import { BONE_CEILING, specialBone, totalBones } from '../content/bones.js'
import type { BoneProfileId, SpecialBoneInstance } from '../content/bones.js'
import { REWARDS, reward as rewardById } from '../content/rewards.js'
import type { RewardId } from '../content/rewards.js'
import { enemy as enemyById } from '../content/enemies.js'
import { carriedNames } from '../game/reducer.js'
import { roomArt, url } from '../render/assets.js'
import type { GameState } from '../game/state.js'
import { boneCard, boneFace, button, commonCard, el, pouchRow, rewardCard } from './components.js'

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
 * SKIP is a real button and it is not an afterthought: taking a named bone is
 * a **physical change to the army** — at the ceiling it turns one of your
 * common bones into something else — and a screen with no way out would be the
 * game making that change for you.
 */
function reward(state: GameState, on: ScreenHandlers): HTMLElement {
  const box = el('section', 'screen screen-reward')
  const panel = el('div', 'screen-panel screen-scroll')
  panel.append(el('h2', 'screen-head', 'IT LEFT SOMETHING'))
  panel.append(el('p', 'screen-line', REWARD_PROMPT))

  const run = state.run
  if (run && totalBones(run) >= BONE_CEILING && run.commonBones > 0) {
    panel.append(
      el(
        'p',
        'screen-note',
        `The pile is full at ${BONE_CEILING}. A bone taken now replaces a common one.`,
      ),
    )
  }

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
    summary.append(el('p', 'screen-note', `${totalBones(run)} bones left`))
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
      el('p', 'screen-note', `${totalBones(run)} bones left · ${run.path.length} rooms`),
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
 * `menu` is the army, the satchel and the rules — the global thing the
 * bottom-left bed opens. `pouch` is the named bones, and is the one overlay
 * that can *change* something: during `thrown` each row carries a field
 * control, and those presses edit the draft rather than the save. The other
 * two are an **inspection**: one bone, or one utility, because that is the
 * only thing the word inspect is allowed to mean.
 */
export type Overlay =
  | { readonly kind: 'menu' }
  | { readonly kind: 'pouch' }
  | { readonly kind: 'bone'; readonly profile: BoneProfileId; readonly specialId?: string }
  | { readonly kind: 'reward'; readonly id: RewardId }

/** What the pouch needs in order to be more than a list. */
export interface PouchHandlers {
  /** Whether a bone may be put in the line right now. */
  readonly fieldable: (instance: SpecialBoneInstance) => boolean
  readonly fielded: (instance: SpecialBoneInstance) => boolean
  readonly onToggle: (instance: SpecialBoneInstance) => void
}

export function renderOverlay(
  host: HTMLElement,
  view: Overlay,
  state: GameState,
  onClose: () => void,
  pouch?: PouchHandlers,
): void {
  host.replaceChildren()
  host.dataset['overlay'] = view.kind
  const panel =
    view.kind === 'menu'
      ? menuPanel(state)
      : view.kind === 'pouch'
        ? pouchPanel(state, pouch)
        : focusPanel(view)
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
function focusPanel(view: Overlay & { kind: 'bone' | 'reward' }): HTMLElement {
  const panel = el('div', 'screen-panel screen-focus')
  if (view.kind === 'reward') {
    panel.dataset['focus'] = view.id
    panel.append(rewardCard(rewardById(view.id)))
    return panel
  }
  panel.dataset['focus'] = view.specialId ?? view.profile
  panel.append(view.specialId ? boneCard(specialBone(view.specialId)) : commonCard(1))
  return panel
}

/**
 * The pouch: every named bone the run is carrying, and its six faces.
 *
 * It does not contain common bones. The pile count covers those, and a list of
 * twenty-six identical rows would bury the two that matter.
 */
function pouchPanel(state: GameState, pouch?: PouchHandlers): HTMLElement | null {
  const run = state.run
  if (!run) return null
  const panel = el('div', 'screen-panel screen-scroll')
  panel.dataset['pouch'] = String(run.specials.length)
  panel.append(el('h2', 'screen-head', 'POUCH'))

  if (run.specials.length === 0) {
    panel.append(
      el('p', 'screen-line', 'No named bones yet. The pile is common bone, all the way down.'),
    )
    return panel
  }

  const rows = el('div', 'pouch-rows')
  rows.id = 'pouch-rows'
  for (const instance of run.specials) {
    rows.append(
      pouchRow(instance, {
        fieldable: pouch?.fieldable(instance) ?? false,
        fielded: pouch?.fielded(instance) ?? false,
        onPress: () => pouch?.onToggle(instance),
      }),
    )
  }
  panel.append(rows)
  return panel
}

/** MENU: the army, the satchel and the four lines the game runs on. */
function menuPanel(state: GameState): HTMLElement | null {
  const run = state.run
  if (!run) return null
  const panel = el('div', 'screen-panel screen-scroll')
  panel.append(el('h2', 'screen-head', 'MENU'))

  panel.append(el('h2', 'screen-head', 'ARMY'))
  const army = el('p', 'army-total', `${totalBones(run)} BONES`)
  army.id = 'army-total'
  army.dataset['bones'] = String(totalBones(run))
  panel.append(army)

  const bones = el('div', 'offers')
  if (run.commonBones > 0) bones.append(commonCard(run.commonBones))
  // Grouped in the copy, because two Cinderbones are two rows of identical
  // text — and *not* grouped in identity, which is what the pouch is for.
  const counted = new Map<string, number>()
  for (const s of run.specials) counted.set(s.specialId, (counted.get(s.specialId) ?? 0) + 1)
  for (const [id, n] of counted) bones.append(boneCard(specialBone(id), n))
  panel.append(bones)

  panel.append(el('h2', 'screen-head', 'SATCHEL'))
  if (run.vials > 0 || run.charms > 0) {
    const satchel = el('div', 'offers')
    if (run.vials > 0) satchel.append(rewardCard(REWARDS.vial, run.vials))
    if (run.charms > 0) satchel.append(rewardCard(REWARDS.charm, run.charms))
    panel.append(satchel)
  } else {
    panel.append(
      el('p', 'screen-line', 'Empty. Vials and Charms sit in the bays on the right of the tray.'),
    )
  }

  // The whole game, in four lines. It is short enough to be worth reading and
  // it is the only piece of the rules that is not visible on the fight screen.
  panel.append(el('h2', 'screen-head', 'WAR OF BONES'))
  const rules = el('ul', 'rules')
  rules.id = 'rules'
  for (const line of WAR_OF_BONES) rules.append(el('li', 'rule-line', line))
  panel.append(rules)

  // A boss rule belongs to its fight, not to the global card. It is printed
  // here only while standing in front of the thing it applies to.
  const combat = run.combat
  const rule = combat ? enemyById(combat.enemyId).rule : undefined
  if (rule) {
    const note = el('p', 'rule-encounter', rule)
    note.id = 'rule-encounter'
    panel.append(note)
  }

  // The faces, so a seven and an eight are legible somewhere that is not a
  // fight in progress.
  const faces = el('div', 'face-key')
  for (const value of [1, 2, 3, 4, 5, 6, 7, 8]) {
    faces.append(boneFace(value > 6 ? 'heavy' : 'common', value))
  }
  panel.append(faces)
  return panel
}
