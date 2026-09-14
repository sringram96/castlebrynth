/**
 * The tray: the painted reliquary and everything the thumb does.
 *
 * The frame is one authored picture and is `pointer-events: none`. Every
 * control on top of it is a real button placed in the tray's own fractions.
 *
 *   the orb        the pile — how many bones are alive
 *   the crown      the attack: six dice, held or thrown
 *   the rail ends  the iron die (left) and up to two item dice (right)
 *   the well       the running readout, the scorecard, the iron's caption
 *   the right bays the Vial, and the talisman
 *   the three beds MENU · ROLL or REROLL or FIGHT · MAP, out of a fight
 *
 * A secondary action that does not exist is **absent**, never disabled. The
 * one verb in the middle bed is whichever throw is left; scoring is not a verb
 * in a bed, because *which hand* is the decision and a bed cannot carry it.
 *
 * ## The readout, and where a number is allowed to appear
 *
 * There is **one aggregate on screen** — the readout in the well — and it
 * resolves `sum × line` through the cascade to `sum × line + flats = total`.
 * Everything else pops on the thing that made it: a core die's value on the
 * die, an item die's result on the item die, a talisman's flat on the
 * talisman, the loss on the enemy, a cost on the pile. There is no aggregate
 * that numbers migrate to and no receipt anywhere: both were built, both were
 * measured against this, and both lost.
 *
 * The reducer settled every one of those numbers before a frame of the cascade
 * ran. `paintCascade` below is how the app reveals them in order, and it is
 * handed the record — it derives nothing and it decides nothing.
 */

import {
  ACTION_BEDS,
  DIE_CENTRES,
  DIE_PITCH,
  IRON_CENTRES,
  ITEM_CENTRES,
  ORB,
  ORB_TEXT,
  RELIC_CENTRES,
  RELIC_PITCH,
  TALISMAN_BAY,
  VIAL_BAY,
  WELL,
} from '../content/tray.js'
import { ATTACK_LINE, IRON_IDLE, VERBS, WELL_IDLE } from '../content/text.js'
import { BONE_CEILING, roomToRecover } from '../content/bones.js'
import {
  HAND_DEFINITIONS,
  CRAP_MULTIPLIER,
  CRAP_NAME,
  legalScores,
  matchingHands,
  scoreName,
} from '../combat/hands.js'
import type { ScoreId } from '../combat/hands.js'
import {
  blockOf,
  ironBadge,
  ironCaption,
  itemBadge,
  talismanFlatOf,
  totalsFor,
} from '../combat/loadout.js'
import { itemDie, talisman as talismanById } from '../content/dice.js'
import { ladderChips, stripSaid } from '../content/faces.js'
import { HAND_DICE, MAX_ROLLS } from '../combat/roll.js'
import type { DieValue } from '../combat/roll.js'
import { enemy as enemyById } from '../content/enemies.js'
import { roomAt } from '../game/map.js'
import type { AttackRecord, CombatState, GameState, RunState } from '../game/state.js'
import { button, dieButton, dieFace, el, faceStripView, place, seat, seatBed } from './components.js'

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
  /**
   * A close look at one thing in a slot — the iron die, an item die, the
   * talisman. Read-only, always: it opens a card and writes nothing.
   */
  readonly onInspectCarried: (id: string) => void
  /** The strip: where this run has been. Explore only, and read-only. */
  readonly onMap: () => void
}

/** What the tray needs to know that is not in the save. */
export interface TrayView {
  readonly held: HoldDraft
  /**
   * Whether a sequence is on screen.
   *
   * Presentation-local, exactly as the hold is. It exists for one rule: a slot
   * inspection may never interrupt a cascade. While the attack is being
   * revealed the slots are pictures rather than presses — **hidden, not
   * disabled** — and they come back the instant the screen settles.
   */
  readonly busy: boolean
}

export interface Tray {
  readonly root: HTMLElement
  readonly orb: HTMLElement
  readonly orbText: HTMLElement
  readonly crown: HTMLElement
  /** The iron die's end of the rail. Its caption's number pops here. */
  readonly iron: HTMLElement
  /** The item dice's end of the rail. Their results pop here. */
  readonly items: HTMLElement
  readonly well: HTMLElement
  readonly satchel: HTMLElement
  /** The talisman bay. Its flat pops here, on the thing that made it. */
  readonly talismans: HTMLElement
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

  // Separate hosts rather than more children of the crown. The crown is the
  // six the hand is made of, and anything reading `#crown .bone` — the suite
  // does, and so does the throw animation — means those six and nothing else.
  const iron = el('div', 'iron')
  iron.id = 'iron'

  const items = el('div', 'items')
  items.id = 'items'

  const well = el('div', 'well')
  well.id = 'well'
  place(well, WELL)

  const satchel = el('div', 'satchel')
  satchel.id = 'satchel'

  const talismans = el('div', 'talismans')
  talismans.id = 'talismans'

  const beds = el('div', 'beds')
  beds.id = 'beds'

  root.append(orb, orbText, crown, iron, items, well, satchel, talismans, beds)
  return { root, orb, orbText, crown, iron, items, well, satchel, talismans, beds }
}

export function renderTray(tray: Tray, state: GameState, view: TrayView, on: TrayHandlers): void {
  const run = state.run
  tray.root.hidden = !encounterTray(state)
  if (!run) return

  // Keep the pile current for feedback, but remove hidden controls entirely.
  renderPile(tray, run)
  if (tray.root.hidden) {
    for (const host of [tray.crown, tray.iron, tray.items, tray.satchel, tray.talismans, tray.well, tray.beds]) {
      host.replaceChildren()
    }
    return
  }

  const combat = state.mode === 'combat' ? run.combat : undefined
  renderAttack(tray, run, combat, view, on)
  renderIron(tray, run, combat, view, on)
  renderItems(tray, run, combat, view, on)
  renderSatchel(tray, run, combat, on)
  renderTalismans(tray, run, view, on)
  renderWell(tray, state, combat, on)
  renderBeds(tray, state, combat, view, on)
}

/** Show the tray for the encounter briefing, the fight and its finishing beat. */
export function encounterTray(state: GameState): boolean {
  const run = state.run
  if (!run) return false
  if (state.mode === 'combat') return true
  if (state.mode !== 'explore') return false
  return !!roomAt(run).enemy && !run.cleared.includes(run.roomId)
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
  // Six is no longer a line the dice game crosses — it crosses none, because
  // the hand is six dice at thirty bones and six at one. It is still the line
  // where a single exchange with the thing at the door ends the run, which is
  // what the orb is warning about.
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
 * stands. Before the first throw it shows **six** backs, no faces, because no
 * face has been decided and showing one would be the view inventing a number
 * the reducer has not drawn. With a throw still in hand every die is a real
 * HOLD button. With none left they are faces and nothing else, because there
 * is nothing to do with them.
 *
 * Six, always. Nothing here reads the pile: the hand does not narrow with
 * damage any more, and there is no width for a view to compute.
 *
 * Out of a fight it is empty: six sockets pretending to be a hand would be
 * furniture left standing.
 */
function renderAttack(
  tray: Tray,
  _run: RunState,
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
    const width = HAND_DICE
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
 * A slot, as a thing that can be read.
 *
 * **There is still no press that changes anything.** The iron cannot be held,
 * cannot be rerolled and cannot be fired; an item die has no verb, ever. What
 * this adds is the press that was always missing from the other direction: a
 * carried thing whose faces can only be learned by watching them happen is not
 * a stated mechanic, and the talisman bay has answered that with an inspection
 * since it was built. This is the same inspection, on the rail.
 *
 * It is read-only, it opens a card, and mid-cascade it is not offered at all —
 * a slot that swallowed a tap while the attack was resolving would be exactly
 * the interruption the item dice were kept press-free to avoid.
 */
function slotNode(
  className: string,
  id: string,
  describe: string,
  busy: boolean,
  on: () => void,
): HTMLElement {
  if (busy) {
    const node = el('div', className)
    node.setAttribute('role', 'img')
    node.setAttribute('aria-label', describe)
    return node
  }
  const b = button({ act: 'inspect-slot', label: '', describe, onPress: on, className })
  b.dataset['slot'] = id
  return b
}

/**
 * The iron die, at the left end of the rail.
 *
 * There is no press for it in the attack: no hold, no reroll — REROLL leaves it
 * exactly where it is. What it is holding this turn is on it as data and in its
 * accessible name, and stated in words in the caption at the top of the well;
 * pressing it reads its card, and changes nothing.
 *
 * Out of a fight, or before the throw, it shows a back: nothing has been
 * decided, and a face there would be the view claiming a block the reducer has
 * not drawn. It is **on the rail out of a fight too**, exactly as the item
 * dice are — a carried thing the player cannot see between fights is a carried
 * thing they cannot read, and reading it is the one press it has.
 */
function renderIron(
  tray: Tray,
  run: RunState,
  combat: CombatState | undefined,
  view: TrayView,
  on: TrayHandlers,
): void {
  tray.iron.replaceChildren()
  tray.iron.dataset['count'] = String(run.ironDice.length)

  if (run.ironDice.length === 0 || combat?.defeated) return

  run.ironDice.forEach((id, index) => {
    const roll = combat?.ironRolls[index]
    const said = roll ? ironCaption(roll) : IRON_IDLE
    const node = slotNode('iron-die', id, `${said} ${stripSaid(id)}. Inspect`, view.busy, () =>
      on.onInspectCarried(id),
    )
    node.dataset['index'] = String(index)
    node.dataset['ironId'] = id

    if (!roll) {
      node.dataset['thrown'] = 'no'
      node.append(el('span', 'iron-face iron-back'))
    } else {
      node.dataset['thrown'] = 'yes'
      node.dataset['block'] = String(roll.block)
      node.dataset['badge'] = ironBadge(roll)
      node.append(el('span', 'iron-face', String(roll.block)))
    }
    seat(node, IRON_CENTRES[index] ?? IRON_CENTRES[IRON_CENTRES.length - 1]!, DIE_PITCH)
    tray.iron.append(node)
  })
}

/**
 * The item dice, at the right end of the rail.
 *
 * They are on screen from the moment they are carried, and they are never
 * controls: they do not appear at ROLL, they cannot be held, they cannot be
 * rerolled, and there is no press for them anywhere. They show a back until
 * the attack fires them, which is the whole of their interface — an item die
 * is a treat that lands mid-cascade, and the result popping *on the die* is
 * how it lands.
 */
function renderItems(
  tray: Tray,
  run: RunState,
  combat: CombatState | undefined,
  view: TrayView,
  on: TrayHandlers,
): void {
  tray.items.replaceChildren()
  tray.items.dataset['count'] = String(run.itemDice.length)
  if (run.itemDice.length === 0) return

  // The last attack's faces, while they are the truth on screen. The cascade
  // paints its own beats over these; this is what a settled table shows and
  // what a reload lands on.
  const settled = combat && combat.dice.length === 0 ? combat.lastAttack : undefined

  run.itemDice.forEach((id, index) => {
    const die = itemDie(id)
    const fired = settled?.itemRolls[index]
    const said = fired ? `${die.name}: ${itemBadge(fired.result)}` : `${die.name}. ${die.rule}`
    const node = slotNode('item-die', id, `${said} ${stripSaid(id)}. Inspect`, view.busy, () =>
      on.onInspectCarried(id),
    )
    node.dataset['index'] = String(index)
    node.dataset['itemId'] = id
    if (fired) {
      node.dataset['face'] = fired.result.kind
      node.append(el('span', 'item-face', itemBadge(fired.result)))
    } else {
      node.append(el('span', 'item-face item-back'))
    }
    seat(node, ITEM_CENTRES[index] ?? ITEM_CENTRES[ITEM_CENTRES.length - 1]!, DIE_PITCH)
    tray.items.append(node)
  })
}

/**
 * The talisman bay.
 *
 * A real button, because a carried thing whose rule can only be read by losing
 * a fight to it is not a rule — pressing it inspects it and changes nothing.
 * Its flat pops here, on the thing that made it, when its line is scored.
 */
function renderTalismans(tray: Tray, run: RunState, view: TrayView, on: TrayHandlers): void {
  tray.talismans.replaceChildren()
  if (run.talismans.length === 0) return

  const id = run.talismans[0]!
  const t = talismanById(id)
  if (view.busy) {
    // Mid-cascade it is a picture, like every other slot — and it is the one
    // the talisman's own flat pops on, so a press here would land on the
    // number the cascade is in the middle of showing.
    const node = el('div', 'talisman-slot bay-slot')
    node.dataset['talismanId'] = id
    node.setAttribute('role', 'img')
    node.setAttribute('aria-label', `${t.name}. ${t.rule}`)
    node.append(el('span', 'bay-label', 'PAIR'))
    node.append(el('b', 'bay-count', `+${t.bonus}`))
    seat(node, RELIC_CENTRES[TALISMAN_BAY]!, RELIC_PITCH)
    tray.talismans.append(node)
    return
  }
  const b = button({
    act: 'inspect-talisman',
    label: '',
    describe: `${t.name}. ${t.rule}`,
    onPress: () => on.onInspectCarried(id),
    // Not a `.satchel-slot`: the satchel is what can be spent, and a talisman
    // cannot be. It is seated on the same rail and styled the same way, and
    // the two are separately countable.
    className: 'talisman-slot bay-slot',
  })
  b.dataset['talismanId'] = id
  b.append(el('span', 'bay-label', 'PAIR'))
  b.append(el('b', 'bay-count', `+${t.bonus}`))
  seat(b, RELIC_CENTRES[TALISMAN_BAY]!, RELIC_PITCH)
  tray.talismans.append(b)
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
    className: 'bay-slot satchel-slot',
  })
  b.dataset['slotId'] = 'vial'
  b.dataset['live'] = canDrink ? 'yes' : 'no'
  b.append(el('span', 'bay-label satchel-label', 'VIAL'))
  const badge = el('b', 'bay-count satchel-count', String(run.vials))
  badge.dataset['count'] = String(run.vials)
  b.append(badge)
  seat(b, RELIC_CENTRES[VIAL_BAY]!, RELIC_PITCH)
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
  run: RunState,
  combat: CombatState,
  on: TrayHandlers,
): void {
  const card = el('div', 'scorecard')
  card.id = 'scorecard'
  const used = new Set(combat.usedHands)
  const matched = new Set(matchingHands(combat.dice))
  const legal = new Set(legalScores(combat.dice, combat.usedHands))

  /**
   * What a line would do, before the item dice have fired.
   *
   * The talisman is known — it answers to the line, and the line is what is
   * being previewed — so it is in the figure. The item dice are **not**: they
   * have not been thrown, and a preview that included them would be the
   * scorecard promising a number the reducer has not drawn. That asymmetry is
   * the honest one, and it is why an item die reads as upside.
   */
  const previewOf = (hand: ScoreId): number =>
    totalsFor(combat.dice, hand, {
      itemFlats: 0,
      talismanFlat: talismanFlatOf(run.talismans, hand),
    }).damage

  // **Only the lines the dice actually make**, and only the ones still unspent.
  //
  // The card used to print all twelve at every moment, greying out the ones the
  // roll did not contain and striking through the ones already gone. That is a
  // card the player has to *search* on every throw to find the two or three
  // rows that are real, and it forced twelve cells into a recess that could
  // give each one 47 x 21 px — half the touch floor this project sets itself.
  //
  // Counted over all 46 656 rolls, a throw offers **one to five** legal lines
  // and never a sixth, and 82% of throws offer three or fewer. So what is drawn
  // is the live ones, at a size a thumb can hit.
  //
  // What is lost is the at-a-glance view of which categories are gone, and it
  // is genuinely a loss — *what is left* is the decision a long fight is made
  // of. It is not lost from the game: MENU carries the whole table, every hand
  // and every multiplier, at a size worth reading.
  const showing = HAND_DEFINITIONS.filter((hand) => legal.has(hand.id))
  for (const hand of showing) {
    const entry = button({
      act: 'score',
      label: '',
      describe: `Attack with ${hand.name}, ${showMultiplier(hand.multiplier)} — ${previewOf(hand.id)} damage${run.itemDice.length ? ', plus item dice' : ''}. Once per fight`,
      onPress: () => on.onScore(hand.id),
      className: 'score-entry',
    })
    entry.dataset['hand'] = hand.id
    entry.dataset['used'] = used.has(hand.id) ? 'yes' : 'no'
    entry.dataset['legal'] = 'yes'
    if (matched.has(hand.id)) entry.dataset['matched'] = 'yes'
    entry.append(el('b', 'score-name', hand.name))
    entry.append(el('b', 'score-short', hand.short))
    entry.append(el('i', 'score-mult', showMultiplier(hand.multiplier)))
    entry.append(el('span', 'score-damage', `${previewOf(hand.id)}${run.itemDice.length ? '+' : ''} DMG`))
    card.append(entry)
  }

  // The fallback, and only when it is the answer. It is not a category, it is
  // never spent, and it is here rather than in the eight because putting it in
  // the grid would make it look like something that can run out.
  if (legal.has('crap')) {
    const b = button({
      act: 'score',
      label: '',
      describe: `Attack with ${CRAP_NAME}, ${showMultiplier(CRAP_MULTIPLIER)} — ${previewOf('crap')} damage${run.itemDice.length ? ', plus item dice' : ''}. Reusable`,
      onPress: () => on.onScore('crap'),
      className: 'score-entry score-crap',
    })
    b.dataset['hand'] = 'crap'
    b.dataset['legal'] = 'yes'
    b.append(el('b', 'score-name', CRAP_NAME))
    b.append(el('b', 'score-short', CRAP_NAME))
    b.append(el('i', 'score-mult', showMultiplier(CRAP_MULTIPLIER)))
    b.append(el('span', 'score-damage', `${previewOf('crap')}${run.itemDice.length ? '+' : ''} DMG`))
    card.append(b)
  }

  // How many cells the row ended up with, so the stylesheet can pick the label
  // that fits one rather than a script measuring text.
  card.dataset['count'] = String(card.childElementCount)
  // And which lines are gone, as data rather than as a drawn row.
  //
  // The card stopped printing spent hands, which is the point of it — but *what
  // is left* is still the decision a long fight is made of, and the player gets
  // it from MENU, which carries the whole table one press away. This is that
  // same fact, in the form a harness can read, so a policy playing the game
  // through the screen is not made to guess at something the player can check.
  card.dataset['spent'] = combat.usedHands.join(',')
  host.append(card)
}

/** Which line the well carries, from the position the dice describe. */
function attackLine(combat: CombatState): string {
  if (combat.dice.length === 0) return ATTACK_LINE.waiting
  return canReroll(combat) ? ATTACK_LINE.open : ATTACK_LINE.last
}

/**
 * The iron's caption.
 *
 * One line, stating what the iron is holding **before commitment**, in the
 * words `combat/loadout.ts` writes — the same sentence the die's accessible
 * name carries, so the two cannot drift. A run with no iron gets nothing here
 * rather than a line saying it has none: an absent thing is absent.
 */
function ironCaptionLine(run: RunState, combat: CombatState): HTMLElement {
  const line = el('p', 'iron-caption')
  line.id = 'iron-caption'
  if (run.ironDice.length === 0) {
    line.hidden = true
    return line
  }
  const rolls = combat.ironRolls
  const said = rolls.length > 0 ? rolls.map(ironCaption).join(' ') : IRON_IDLE
  line.textContent = said
  line.dataset['block'] = String(blockOf(rolls))
  line.dataset['thrown'] = rolls.length > 0 ? 'yes' : 'no'
  return line
}

/**
 * The readout. The one aggregate on screen.
 *
 * It says the same sentence at every stage of the turn, with more of it filled
 * in: `29`, then `29 × 2`, then `29 × 2 = 58`, then `29 × 2 = 58 +5 +12`, then
 * `= 75`. There is no second total anywhere, no fly-away number migrating into
 * it, and no receipt beside it — the two other versions of this were built and
 * lost, and reintroducing either is a product decision.
 *
 * What it shows here is whatever the **settled** state says. Between a press
 * and the end of the cascade the app paints the beats over it through
 * `paintCascade`, and with motion off there are no beats, so this is what a
 * finished attack lands on and what a reload finds.
 */
function readoutOf(run: RunState, combat: CombatState): HTMLElement {
  const box = el('p', 'readout')
  box.id = 'readout'

  if (combat.dice.length > 0) {
    const sum = combat.dice.reduce((total: number, die: DieValue) => total + die, 0)
    box.dataset['sum'] = String(sum)
    box.dataset['stage'] = 'sum'
    box.textContent = String(sum)
    box.setAttribute('aria-label', `The dice on the table add to ${sum}`)
    return box
  }

  const record = combat.lastAttack
  if (!record) {
    box.dataset['stage'] = 'idle'
    box.textContent = '—'
    box.setAttribute('aria-label', 'Nothing on the table yet')
    return box
  }

  paintRecord(box, run, record, 'total')
  return box
}

/** Which beats of the cascade the readout has resolved through. */
export type CascadeStage = 'sum' | 'line' | 'items' | 'talisman' | 'total'

const STAGE_ORDER: readonly CascadeStage[] = ['sum', 'line', 'items', 'talisman', 'total']

const reached = (stage: CascadeStage, at: CascadeStage): boolean =>
  STAGE_ORDER.indexOf(at) >= STAGE_ORDER.indexOf(stage)

/**
 * Write one stage of the readout, off the record the reducer settled.
 *
 * Nothing is computed here that is not already on the record. The only reason
 * the stages exist is that the cascade is watched in order, and a readout that
 * jumped from `29` to `75` would be hiding the middle of the one thing the
 * player is being shown.
 */
function paintRecord(
  box: HTMLElement,
  run: RunState,
  record: AttackRecord,
  at: CascadeStage,
): void {
  const parts: string[] = [String(record.sum)]
  if (reached('line', at)) parts.push(`× ${showBare(record.multiplier)}`)
  if (reached('line', at) && at !== 'line') parts.push(`= ${record.base}`)
  if (reached('items', at) && record.itemFlats > 0) parts.push(`+${record.itemFlats}`)
  if (reached('talisman', at) && record.talismanFlat > 0) parts.push(`+${record.talismanFlat}`)
  if (reached('total', at) && record.landed && record.damage !== record.base) {
    parts.push(`= ${record.damage}`)
  }

  box.dataset['sum'] = String(record.sum)
  box.dataset['stage'] = at
  box.dataset['mult'] = String(record.multiplier)
  box.dataset['base'] = String(record.base)
  if (reached('total', at)) box.dataset['total'] = String(record.damage)
  else delete box.dataset['total']

  // A cost that emptied the pile stops the cascade where it stopped: the blow
  // never landed, and a total printed here would be a total nothing took.
  box.textContent = record.landed ? parts.join(' ') : `${parts.join(' ')} — never thrown`
  box.setAttribute(
    'aria-label',
    record.landed
      ? `${record.sum} times ${showBare(record.multiplier)} is ${record.base}, for ${record.damage}`
      : `${record.sum} times ${showBare(record.multiplier)}. The blow never landed.`,
  )
  void run
}

/**
 * Paint one beat of the cascade straight at the tray.
 *
 * The same mechanism the font's frames and a death's frames use, and for the
 * same reason: a paint reads the screen off state, and state says nothing
 * about which beat of a transition is up. Every number below is read off the
 * record — this decides nothing and draws nothing at random.
 */
export function paintCascade(
  tray: Tray,
  run: RunState,
  record: AttackRecord,
  at: CascadeStage,
): void {
  const box = tray.well.querySelector<HTMLElement>('#readout')
  if (box) paintRecord(box, run, record, at)
  tray.root.dataset['cascade'] = at
}

/** Clear the cascade marker. The turn is over and the table is settled. */
export function clearCascade(tray: Tray): void {
  delete tray.root.dataset['cascade']
}

/** `2`, `1.25`, `0.5` — never `2.00`. */
function showBare(multiplier: number): string {
  return String(multiplier)
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

    // What the iron is holding, in words, before anything is committed. It is
    // the first thing in the well because it is the first thing the turn
    // settled — the block is terrain, and terrain is read before a decision.
    box.append(ironCaptionLine(run, combat))
    box.append(readoutOf(run, combat))
    renderScorecard(box, run, combat, on)
    const line = el('p', 'well-line', attackLine(combat))
    line.id = 'attack-line'
    box.append(line)
    tray.well.append(box)
    return
  }

  // Before combat, the tray carries only the encounter briefing.
  const here = roomAt(run)

  if (here.enemy && !run.cleared.includes(here.instanceId)) {
    const e = enemyById(here.enemy)
    const box = el('div', 'brief')
    box.id = 'brief'
    box.append(el('span', 'brief-name', e.name))
    box.append(el('p', 'well-line', e.tell))
    if (e.rule) box.append(el('p', 'well-rule', e.rule))
    // **The card prints the ladder before the first ROLL.** Every rule a monster
    // has is on screen before anything is committed, and a ladder is numbers, so
    // it is drawn as chips rather than written out — the same statement the tray's
    // live figure is a position on.
    const ladder = ladderChips(here.enemy)
    if (ladder.length > 0) {
      const strip = faceStripView(ladder)
      strip.classList.add('ladder')
      strip.id = 'brief-ladder'
      box.append(strip)
    }
    tray.well.append(box)
    return
  }
}

/**
 * The beds.
 *
 * Left is MENU, always, in both modes. Centre is whichever press the fight is
 * waiting for. The right bed **used to carry the second way out of a room**,
 * which put the most important verb in the game in the one region of the
 * screen that is not the world; movement moved into the picture, so GO left
 * the tray entirely — there is no `onGo` here and there is nowhere to write
 * one. What sits there now is MAP, out of a fight only, and it is allowed to
 * because it is not a move: it reads the run back and changes nothing.
 *
 * There is no verb for scoring either. Which hand to spend *is* the decision,
 * so the choice itself is the commitment and it lives on the scorecard where
 * the multipliers are.
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
      bed(
        1,
        button({
          act: 'roll',
          label: VERBS.roll,
          describe:
            run.ironDice.length > 0
              ? `Throw ${HAND_DICE} dice, and the iron with them`
              : `Throw ${HAND_DICE} dice`,
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
          label: `${VERBS.reroll} · ${MAX_ROLLS - combat.rollsUsed}`,
          describe: `Throw ${free} ${free === 1 ? 'die' : 'dice'} again. The iron stays as it is`,
          onPress: on.onReroll,
          className: 'act act-primary',
        }),
      )
    }
    return
  }

  // Exploring. The room's enemy, if it is still up, is the only press the tray
  // has left — and only while there is something to throw. An empty pile is
  // not a fight the reducer will open, so it is not a press the tray offers.
  //
  // Everything else a room offers is in the room: the ways out, the worked
  // objects and whatever is lying on the floor are all hotspots on the picture,
  // and none of them is the tray's business any more.
  const here = roomAt(run)
  if (here.enemy && !run.cleared.includes(run.roomId) && run.bones > 0) {
    bed(1, button({ act: 'fight', label: VERBS.fight, onPress: on.onFight, className: 'act act-primary' }))
  }

  // The right bed carries the strip, and only out of a fight.
  //
  // It is the bed GO used to sit in, and the reason it is free is that
  // movement moved into the picture — so what goes back into it has to be
  // something that is *not* a move. MAP is exactly that: it reads the run's
  // own reel back, changes nothing, writes nothing, and shows only rooms that
  // have been stood in. Inside a fight the bed stays empty: the fight is the
  // room, and a map of the corridor behind you is not a decision in it.
  bed(
    2,
    button({
      act: 'map',
      label: VERBS.map,
      describe: 'Where I have been, and the ways I did not take',
      onPress: on.onMap,
      className: 'act act-side',
    }),
  )
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
