/**
 * The tray: the painted reliquary and everything the thumb does.
 *
 * The frame is one authored picture and is `pointer-events: none`. Every
 * control on top of it is a real button placed in the tray's own fractions.
 *
 * The geometry is unchanged and the meaning of every region is not:
 *
 *   the orb        the pile — how many bones are alive
 *   the crown      your line, six lanes, and nothing else
 *   the strip      the enemy's line, lane-aligned with the crown above it
 *   the well       the field count, and the one instruction for the phase
 *   the right bays the satchel: Vial, Charm, Pouch
 *   the three beds MENU · the phase's one verb · a second route out of a room
 *
 * A secondary action that does not exist is **absent**, never disabled. And
 * the four combat verbs never appear together: a phase has exactly one.
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
import { PHASE_LINE, VERBS, WELL_IDLE } from '../content/text.js'
import { BONE_CEILING, roomToRecover, specialBone, totalBones } from '../content/bones.js'
import type { BoneProfileId } from '../content/bones.js'
import { brokenPlayerKeys } from '../combat/clash.js'
import { LINE_WIDTH } from '../combat/line.js'
import { enemy as enemyById } from '../content/enemies.js'
import { room as roomById } from '../content/rooms.js'
import { exitsOpen, stateOf } from '../content/interactions.js'
import { fieldLegal, maxWidth } from '../game/reducer.js'
import type { CombatState, GameState, RunState } from '../game/state.js'
import { boneProfile } from '../content/bones.js'
import { boneButton, boneFace, button, el, place, seat, seatBed } from './components.js'

/**
 * The draft the player is editing before FIELD.
 *
 * Presentation-local, and deliberately not in `GameState`: nudging a stepper
 * is not a move. It reaches the reducer once, whole, as the FIELD action.
 */
export interface FieldDraft {
  readonly width: number
  readonly specialIds: readonly string[]
}

export interface TrayHandlers {
  readonly onMenu: () => void
  readonly onFight: () => void
  readonly onWidth: (width: number) => void
  readonly onField: () => void
  readonly onThrow: () => void
  readonly onSmash: () => void
  readonly onRound: () => void
  readonly onDrink: () => void
  /** Arm the Charm, or put it away. Two steps, never one. */
  readonly onArmCharm: () => void
  /** Spend the armed Charm on one rolled bone. */
  readonly onCharmBone: (boneKey: string) => void
  readonly onPouch: () => void
  /** A close look at one satchel utility. No state change. */
  readonly onInspectReward: (id: string) => void
  /** A close look at one bone in the line. No state change. */
  readonly onInspectBone: (profile: BoneProfileId, specialId?: string) => void
  readonly onGo: (to: string) => void
}

/** What the tray needs to know that is not in the save. */
export interface TrayView {
  readonly draft: FieldDraft
  readonly charmArmed: boolean
}

export interface Tray {
  readonly root: HTMLElement
  readonly orb: HTMLElement
  readonly orbText: HTMLElement
  readonly crown: HTMLElement
  readonly enemyLine: HTMLElement
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

  const crown = el('div', 'crown player-line')
  crown.id = 'crown'

  // The enemy's line sits directly above the plate, in the plate's own
  // coordinate space, so lane N of the enemy is over lane N of the crown at
  // every viewport. It is above the tray rather than inside it because the
  // painted frame has no bay for it — see `## HUMAN ART REQUIRED`.
  const enemyLine = el('div', 'bone-line enemy-line')
  enemyLine.id = 'enemy-line'

  const well = el('div', 'well')
  well.id = 'well'
  place(well, WELL)

  const satchel = el('div', 'satchel')
  satchel.id = 'satchel'

  const beds = el('div', 'beds')
  beds.id = 'beds'

  root.append(orb, orbText, enemyLine, crown, well, satchel, beds)
  return { root, orb, orbText, crown, enemyLine, well, satchel, beds }
}

export function renderTray(tray: Tray, state: GameState, view: TrayView, on: TrayHandlers): void {
  const run = state.run
  tray.root.hidden = !(run && (state.mode === 'explore' || state.mode === 'combat'))
  if (!run || tray.root.hidden) return

  const combat = state.mode === 'combat' ? run.combat : undefined
  renderPile(tray, run)
  renderEnemyLine(tray, combat)
  renderPlayerLine(tray, run, combat, view, on)
  renderSatchel(tray, run, combat, view, on)
  renderWell(tray, state, combat, view, on)
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
  const bones = totalBones(run)
  const fill = tray.orb.querySelector<HTMLElement>('.orb-fill')
  if (fill) fill.style.height = `${Math.max(0, Math.min(1, bones / BONE_CEILING)) * 100}%`
  tray.orbText.textContent = `${bones}`
  tray.orbText.dataset['bones'] = String(bones)
  tray.orbText.dataset['common'] = String(run.commonBones)
  tray.orbText.dataset['specials'] = String(run.specials.length)
  tray.orbText.setAttribute('aria-label', `${bones} living bones`)
  // Nine is a line and a half. Below it a smash can end the run outright, and
  // that is the point at which the number should stop being decoration.
  tray.orb.dataset['low'] = bones <= 9 ? 'yes' : 'no'
}

/**
 * The enemy's line, face-up and public.
 *
 * It exists before the player commits anything, which is the first rule of the
 * fight. Lane-aligned with the crown below it, in DOM order that matches the
 * visible order, and every value is in the accessible name.
 */
function renderEnemyLine(tray: Tray, combat: CombatState | undefined): void {
  tray.enemyLine.replaceChildren()
  tray.enemyLine.hidden = !combat
  if (!combat) return

  const broken = combat.lastSmash ? brokenPlayerKeysOfEnemy(combat) : new Set<string>()
  tray.enemyLine.dataset['count'] = String(combat.enemyLine.length)

  combat.enemyLine.forEach((bone, lane) => {
    const centre = DIE_CENTRES[lane] ?? DIE_CENTRES[DIE_CENTRES.length - 1]!
    const node = el('div', 'bone bone-enemy')
    node.dataset['lane'] = String(lane)
    node.dataset['boneKey'] = bone.boneKey
    node.dataset['value'] = String(bone.value)
    node.dataset['profile'] = bone.profile
    if (broken.has(bone.boneKey)) node.dataset['broken'] = 'yes'
    node.setAttribute('role', 'img')
    node.setAttribute(
      'aria-label',
      `Its bone, rolled ${bone.value}${broken.has(bone.boneKey) ? ', broken' : ''}`,
    )
    node.append(boneFace(bone.profile, bone.value))
    seat(node, centre, DIE_PITCH)
    tray.enemyLine.append(node)
  })
}

/** Which of the enemy's bones the last smash broke. */
function brokenPlayerKeysOfEnemy(combat: CombatState): ReadonlySet<string> {
  const lanes = combat.lastSmash?.lanes ?? []
  return new Set(
    lanes
      .filter((l) => l.enemy && (l.result === 'player' || l.result === 'both'))
      .map((l) => l.enemy!.boneKey),
  )
}

/**
 * The crown: your line.
 *
 * Four different things across a round, and each of them is the truth of its
 * phase — the draft you are building, the bones you committed with their backs
 * showing, the throw, and the wreckage. Out of a fight it is empty: the pile
 * is the loadout now, and six sockets pretending to be a hand would be the old
 * game's furniture left standing.
 */
function renderPlayerLine(
  tray: Tray,
  run: RunState,
  combat: CombatState | undefined,
  view: TrayView,
  on: TrayHandlers,
): void {
  tray.crown.replaceChildren()
  const phase = combat?.phase
  tray.crown.dataset['phase'] = phase ?? 'none'

  if (!combat || combat.defeated) {
    tray.crown.dataset['count'] = '0'
    return
  }

  // Before the throw the crown shows the *shape* of the commitment: which
  // lanes are named bones and which are anonymous ones. Faces are absent
  // because no face has been decided — showing one would be the view
  // inventing a number the reducer has not drawn.
  if (phase === 'thrown' || phase === 'fielded') {
    const committed = phase === 'fielded' ? combat.field : undefined
    const width = committed?.width ?? view.draft.width
    const specialIds = committed?.specialIds ?? view.draft.specialIds
    const byId = new Map(run.specials.map((s) => [s.instanceId, s]))
    const lanes = [
      ...specialIds.map((id) => ({ id, profile: profileFor(run, id) })),
      ...Array.from({ length: Math.max(0, width - specialIds.length) }, () => ({
        id: undefined,
        profile: 'common' as BoneProfileId,
      })),
    ]
    tray.crown.dataset['count'] = String(lanes.length)
    lanes.forEach((lane, index) => {
      const centre = DIE_CENTRES[index] ?? DIE_CENTRES[DIE_CENTRES.length - 1]!
      const named = lane.id ? byId.get(lane.id)?.specialId : undefined
      const b = boneButton(
        {
          boneKey: lane.id ?? `draft:${index}`,
          profile: lane.profile,
          lane: index,
          ...(named ? { specialId: named } : {}),
        },
        {
          act: 'inspect-bone',
          describe: named
            ? `Inspect ${specialBone(named).name}, lane ${index + 1}`
            : `A common bone, lane ${index + 1}`,
          onPress: () => on.onInspectBone(lane.profile, named),
        },
      )
      if (phase === 'fielded') b.dataset['committed'] = 'yes'
      seat(b, centre, DIE_PITCH)
      tray.crown.append(b)
    })
    return
  }

  const line = combat.playerLine ?? []
  const smash = phase === 'smashed' ? combat.lastSmash : undefined
  const broken = smash ? brokenPlayerKeys(smash.lanes) : new Set<string>()
  const safe = new Set(
    (smash?.lanes ?? []).filter((l) => l.result === 'safe-player').map((l) => l.player!.boneKey),
  )
  tray.crown.dataset['count'] = String(line.length)

  // In `rolled` with the Charm armed, a bone is a target. Otherwise a press on
  // one takes a close look at it — the same rule the old crown had, and the
  // reason a bone is a button in every phase rather than only sometimes.
  const arming = phase === 'rolled' && view.charmArmed
  tray.crown.dataset['charmArmed'] = arming ? 'yes' : 'no'

  line.forEach((bone, lane) => {
    const centre = DIE_CENTRES[lane] ?? DIE_CENTRES[DIE_CENTRES.length - 1]!
    // Off the bone, not out of the pile: a bone that just broke is no longer
    // in `run.specials`, and it still has to be able to say its own name.
    const named = bone.specialId
    const b = boneButton(
      {
        boneKey: bone.boneKey,
        profile: bone.profile,
        value: bone.value,
        lane,
        ...(named ? { specialId: named } : {}),
        ...(broken.has(bone.boneKey) ? { broken: true } : {}),
        ...(safe.has(bone.boneKey) ? { safe: true } : {}),
      },
      arming
        ? {
            act: 'charm-bone',
            describe: `Throw this ${bone.value} again`,
            onPress: () => on.onCharmBone(bone.boneKey),
          }
        : {
            act: 'inspect-bone',
            onPress: () => on.onInspectBone(bone.profile, named),
          },
    )
    if (arming) b.dataset['target'] = 'yes'
    seat(b, centre, DIE_PITCH)
    tray.crown.append(b)
  })
}

/** One hop through content, so the tray holds no opinion of its own. */
function profileFor(run: RunState, instanceId: string): BoneProfileId {
  const found = run.specials.find((s) => s.instanceId === instanceId)
  return found ? specialBone(found.specialId).profile : 'common'
}

/**
 * The three bays on the right: the satchel.
 *
 * Vial, Charm, Pouch, in that order and always in that order — a control that
 * moves bay depending on what is carried is a control the thumb has to look
 * for. Each shows its count and each is pressable: DRINK and CHARM when they
 * are legal, an inspection when they are not, and the Pouch always.
 */
function renderSatchel(
  tray: Tray,
  run: RunState,
  combat: CombatState | undefined,
  view: TrayView,
  on: TrayHandlers,
): void {
  tray.satchel.replaceChildren()

  const canDrink =
    run.vials > 0 &&
    roomToRecover(run) > 0 &&
    (!combat || (!combat.defeated && combat.phase !== 'smashed'))
  const canCharm =
    combat !== undefined &&
    !combat.defeated &&
    combat.phase === 'rolled' &&
    !combat.charmUsed &&
    run.charms > 0

  const bays: readonly {
    id: string
    label: string
    count?: number
    act: string
    describe: string
    on: () => void
    live: boolean
  }[] = [
    {
      id: 'vial',
      label: 'VIAL',
      count: run.vials,
      act: canDrink ? 'drink' : 'inspect-reward',
      describe: canDrink
        ? `Drink a Vial: 5 bones back, up to ${BONE_CEILING}`
        : `Vials: ${run.vials}. Inspect`,
      on: canDrink ? on.onDrink : () => on.onInspectReward('vial'),
      live: canDrink,
    },
    {
      id: 'charm',
      label: view.charmArmed ? 'PICK' : 'CHARM',
      count: run.charms,
      act: canCharm ? 'charm' : 'inspect-reward',
      describe: canCharm
        ? view.charmArmed
          ? 'Choose one rolled bone to reroll'
          : 'Spend a Charm to throw one rolled bone again'
        : `Charms: ${run.charms}. Inspect`,
      on: canCharm ? on.onArmCharm : () => on.onInspectReward('charm'),
      live: canCharm,
    },
    {
      id: 'pouch',
      label: 'POUCH',
      count: run.specials.length,
      act: 'pouch',
      describe:
        combat?.phase === 'thrown'
          ? 'Open the pouch and choose named bones for the line'
          : 'Open the pouch: every named bone and its faces',
      on: on.onPouch,
      live: true,
    },
  ]

  bays.forEach((bay, index) => {
    const b = button({
      act: bay.act,
      label: '',
      describe: bay.describe,
      onPress: bay.on,
      className: 'satchel-slot',
    })
    b.dataset['slotId'] = bay.id
    b.dataset['live'] = bay.live ? 'yes' : 'no'
    if (bay.id === 'charm' && view.charmArmed) b.dataset['armed'] = 'yes'
    b.append(el('span', 'satchel-label', bay.label))
    if (bay.count !== undefined) {
      const badge = el('b', 'satchel-count', String(bay.count))
      badge.dataset['count'] = String(bay.count)
      b.append(badge)
    }
    seat(b, RELIC_CENTRES[index]!, RELIC_PITCH)
    tray.satchel.append(b)
  })
}

/** The stage. One reading at a time, and it is always the important one. */
function renderWell(
  tray: Tray,
  state: GameState,
  combat: CombatState | undefined,
  view: TrayView,
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

    const box = el('div', 'field-read')
    box.id = 'field-read'

    // The count on both sides of a skull. Mine on the left, its on the right,
    // and the two numbers are the whole tactical picture before FIELD.
    const counts = el('div', 'field-pips')
    const mine =
      combat.phase === 'thrown'
        ? view.draft.width
        : (combat.field?.width ?? combat.playerLine?.length ?? 0)
    counts.append(pipGroup('player', mine))
    counts.append(el('span', 'field-skull', '☠'))
    counts.append(pipGroup('enemy', combat.enemyLine.length))
    box.dataset['playerCount'] = String(mine)
    box.dataset['enemyCount'] = String(combat.enemyLine.length)
    box.append(counts)

    // The stepper, and only in the phase that can use it. Below it there is
    // nothing to nudge and the control is absent rather than dead.
    if (combat.phase === 'thrown') {
      box.append(widthStepper(run, view, on))
    }

    if (combat.phase === 'smashed' && combat.lastSmash) {
      const smash = combat.lastSmash
      const lost = smash.playerCommonLost + smash.playerSpecialsLost.length
      const summary = el(
        'p',
        'smash-summary',
        `${lost} LOST / ${smash.enemyBonesLost.length} BROKEN`,
      )
      summary.id = 'smash-summary'
      summary.dataset['lost'] = String(lost)
      summary.dataset['broken'] = String(smash.enemyBonesLost.length)
      summary.dataset['held'] = String(smash.heldTies)
      box.append(summary)
    }

    box.append(el('p', 'well-line', PHASE_LINE[combat.phase]))
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
  if (!exitsOpen(stateOf(run.rooms, run.roomId))) {
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

function pipGroup(side: 'player' | 'enemy', count: number): HTMLElement {
  const group = el('span', `pip-group pip-${side}`)
  group.dataset['count'] = String(count)
  for (let n = 0; n < Math.min(count, LINE_WIDTH); n++) group.append(el('i', 'field-pip'))
  return group
}

/**
 * How many bones to risk.
 *
 * Minimum one, maximum whatever the pile allows, and it may never fall below
 * the number of named bones already chosen — lowering the width past a fielded
 * special would silently unfield it, and a control that undoes a decision the
 * player did not revisit is a control that lies.
 *
 * The two buttons are absent at the ends of their range rather than dead, and
 * the count announces itself with its legal range so the whole control is
 * readable without seeing it.
 */
function widthStepper(run: RunState, view: TrayView, on: TrayHandlers): HTMLElement {
  const box = el('div', 'width-stepper')
  box.id = 'width'
  const most = maxWidth(run)
  const least = Math.max(1, view.draft.specialIds.length)
  box.dataset['width'] = String(view.draft.width)
  box.dataset['min'] = String(least)
  box.dataset['max'] = String(most)

  if (view.draft.width > least) {
    box.append(
      button({
        act: 'width-down',
        label: '−',
        describe: `Risk one bone fewer: ${view.draft.width - 1}`,
        onPress: () => on.onWidth(view.draft.width - 1),
        className: 'act act-step',
      }),
    )
  }
  const read = el('b', 'width-count', String(view.draft.width))
  read.setAttribute('role', 'status')
  read.setAttribute('aria-label', `Fielding ${view.draft.width} of a possible ${most}`)
  box.append(read)
  if (view.draft.width < most) {
    box.append(
      button({
        act: 'width-up',
        label: '+',
        describe: `Risk one bone more: ${view.draft.width + 1}`,
        onPress: () => on.onWidth(view.draft.width + 1),
        className: 'act act-step',
      }),
    )
  }
  return box
}

/**
 * The three beds.
 *
 * Left is MENU, always, in both modes. Centre is the phase's one verb. Right
 * is the secondary, and is simply not rendered when there is not one — a
 * greyed button that explains nothing is the defect this replaces.
 *
 * FIELD, THROW, SMASH and ROUND are never on screen together. Each phase has
 * exactly one thing to press, and the well says what it is for.
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
      describe: 'Open the army, the satchel and the rules',
      onPress: on.onMenu,
      className: 'act act-side',
    }),
  )

  if (combat) {
    // While the thing is dying there is no move to make, so none is offered —
    // not greyed out, not shown waiting: absent. The reducer refuses all of
    // them anyway; this is the half of that rule the player can see.
    if (combat.defeated) return

    switch (combat.phase) {
      case 'thrown': {
        const legal = fieldLegal(run, view.draft.width, view.draft.specialIds)
        if (!legal) return
        bed(
          1,
          button({
            act: 'field',
            label: VERBS.field,
            describe: `Commit ${view.draft.width} ${view.draft.width === 1 ? 'bone' : 'bones'}`,
            onPress: on.onField,
            className: 'act act-primary',
          }),
        )
        return
      }
      case 'fielded':
        bed(
          1,
          button({
            act: 'throw',
            label: VERBS.throw,
            describe: 'Throw the bones you committed',
            onPress: on.onThrow,
            className: 'act act-primary',
          }),
        )
        return
      case 'rolled':
        bed(
          1,
          button({
            act: 'smash',
            label: VERBS.smash,
            describe: 'Line them up and break the losers',
            onPress: on.onSmash,
            className: 'act act-primary',
          }),
        )
        return
      case 'smashed':
        bed(
          1,
          button({
            act: 'round',
            label: VERBS.round,
            describe: 'It throws again',
            onPress: on.onRound,
            className: 'act act-primary',
          }),
        )
        return
    }
    return
  }

  // Exploring. The room's enemy, if it is still up, is the only way on —
  // and only while there is something left to field. An empty pile is not a
  // fight the reducer will open, so it is not a press the tray offers: the
  // view and the reducer answer the same question with the same call.
  const here = roomById(run.roomId)
  if (here.enemy && !run.cleared.includes(run.roomId)) {
    if (totalBones(run) > 0) {
      bed(1, button({ act: 'fight', label: VERBS.fight, onPress: on.onFight, className: 'act act-primary' }))
    }
    return
  }

  // The same for a font that has not been used. There is no way on yet — the
  // reducer will not grant one — so no way on is offered.
  if (here.ritual && run.ritual?.roomId !== run.roomId) return

  // And the same again for a room whose machinery is still shut.
  if (!exitsOpen(stateOf(run.rooms, run.roomId))) return

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
 * Cosmetic only, and deterministic by construction: the lane and the step
 * choose which face flickers past, so a bone in flight cannot show a value the
 * run did not produce and a replay cannot differ. `step === undefined` puts
 * back the exact face node the reducer chose.
 */
const settledFace = new WeakMap<HTMLElement, HTMLElement>()

export function paintTumble(bone: HTMLElement, step: number | undefined): void {
  const profile = bone.dataset['profile'] as BoneProfileId | undefined
  const current = bone.querySelector<HTMLElement>('.bone-face')
  if (!profile || !current) return

  if (step === undefined) {
    const settled = settledFace.get(bone)
    if (settled && settled !== current) current.replaceWith(settled)
    settledFace.delete(bone)
    return
  }

  if (!settledFace.has(bone)) settledFace.set(bone, current)
  const faces = boneProfile(profile).faces
  const lane = Number(bone.dataset['lane']) || 0
  current.replaceWith(boneFace(profile, faces[(lane * 2 + step * 3 + 1) % faces.length]!))
}
