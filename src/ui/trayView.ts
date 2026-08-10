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
 *   the well       **its** line, lane-aligned under yours, and the phase's line
 *   the right bays the satchel: Vial, Pouch
 *   the three beds MENU · the phase's one verb · a second route out of a room
 *
 * A secondary action that does not exist is **absent**, never disabled. And a
 * phase has exactly one verb: THROW, then ROUND.
 */

import {
  ACTION_BEDS,
  DIE_CENTRES,
  DIE_PITCH,
  ENEMY_BONE,
  ENEMY_LANES,
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
import { enemy as enemyById } from '../content/enemies.js'
import { roomAt } from '../game/map.js'
import { exitsOpen, stateOf } from '../content/interactions.js'
import { fieldFor } from '../game/reducer.js'
import type { CombatState, GameState, RunState } from '../game/state.js'
import { boneProfile } from '../content/bones.js'
import { boneButton, boneFace, button, el, place, seat, seatBed } from './components.js'

/**
 * The modifier the player is editing before the throw.
 *
 * Which named bones stand in the line, and nothing else — the width is not a
 * choice. Presentation-local and deliberately not in `GameState`: lighting a
 * bone in the pouch is a thought, not a move, and it reaches the reducer once,
 * whole, on the THROW that acts on it.
 */
export interface FieldDraft {
  readonly specialIds: readonly string[]
}

export interface TrayHandlers {
  readonly onMenu: () => void
  readonly onFight: () => void
  /** Throw, and find out. The only press inside a round. */
  readonly onThrow: () => void
  readonly onRound: () => void
  readonly onDrink: () => void
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

  // Its line stands in the well, in the plate's own coordinate space, so lane
  // N of the enemy is directly under lane N of the crown at every viewport.
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
 * It exists before the player throws, which is the first rule of the fight:
 * you are answering a line you can already read. Lane-aligned with the crown
 * above it — the column *is* the pairing, and the smash that follows breaks
 * one against the other down that column — in DOM order that matches the
 * visible order, with every value in the accessible name.
 */
function renderEnemyLine(tray: Tray, combat: CombatState | undefined): void {
  tray.enemyLine.replaceChildren()
  tray.enemyLine.hidden = !combat
  if (!combat) return

  const broken = combat.lastSmash ? brokenPlayerKeysOfEnemy(combat) : new Set<string>()
  tray.enemyLine.dataset['count'] = String(combat.enemyLine.length)

  combat.enemyLine.forEach((bone, lane) => {
    const centre = ENEMY_LANES[lane] ?? ENEMY_LANES[ENEMY_LANES.length - 1]!
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
    // Read, not pressed: seated on the painted bone's own size rather than
    // grown to the touch floor, which is what lets six of them fit the well.
    node.style.left = `${(centre.x - ENEMY_BONE.width / 2) * 100}%`
    node.style.top = `${(centre.y - ENEMY_BONE.height / 2) * 100}%`
    node.style.width = `${ENEMY_BONE.width * 100}%`
    node.style.height = `${ENEMY_BONE.height * 100}%`
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

  // Before the throw the crown shows the *shape* of the line: how many bones
  // are going in, and which of them are named. Faces are absent because no
  // face has been decided — showing one would be the view inventing a number
  // the reducer has not drawn.
  //
  // Nothing here is a control any more. The width is not a choice, and which
  // named bones stand in the line is chosen in the pouch, where the bones
  // actually live. A press on a lane is a close look, exactly as it is after
  // the throw.
  if (phase === 'thrown') {
    const { width, specialIds } = fieldFor(run, view.draft.specialIds)
    const byId = new Map(run.specials.map((s) => [s.instanceId, s]))
    tray.crown.dataset['count'] = String(width)

    for (let index = 0; index < width; index++) {
      const centre = DIE_CENTRES[index] ?? DIE_CENTRES[DIE_CENTRES.length - 1]!
      const id = specialIds[index]
      const named = id ? byId.get(id)?.specialId : undefined
      const profile: BoneProfileId = id ? profileFor(run, id) : 'common'

      const b = boneButton(
        {
          boneKey: id ?? `draft:${index}`,
          profile,
          lane: index,
          ...(named ? { specialId: named } : {}),
        },
        {
          act: 'inspect-bone',
          describe: named
            ? `Inspect ${specialBone(named).name}, lane ${index + 1}`
            : `A common bone, lane ${index + 1}`,
          onPress: () => on.onInspectBone(profile, named),
        },
      )
      seat(b, centre, DIE_PITCH)
      tray.crown.append(b)
    }
    return
  }

  const line = combat.playerLine ?? []
  const smash = combat.lastSmash
  const broken = smash ? brokenPlayerKeys(smash.lanes) : new Set<string>()
  const safe = new Set(
    (smash?.lanes ?? []).filter((l) => l.result === 'safe-player').map((l) => l.player!.boneKey),
  )
  tray.crown.dataset['count'] = String(line.length)

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
      {
        act: 'inspect-bone',
        onPress: () => on.onInspectBone(bone.profile, named),
      },
    )
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
  // Two bays on a plate painted for three. The empty one is left showing
  // rather than the pair being re-centred on it: the recess is part of the
  // picture, and sliding controls around to hide that the Charm is gone would
  // be the tray pretending its own geometry changed.
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
      id: 'pouch',
      label: 'POUCH',
      count: run.specials.length,
      act: 'pouch',
      describe:
        combat?.phase === 'thrown'
          ? 'Open the pouch and choose which named bones stand in the line'
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

    // The well's top half is the enemy's line, which is seated over this box
    // rather than inside it. What is left is a reserved band, so the phase line
    // starts below its bones instead of behind them.
    const mine = combat.field?.width ?? fieldFor(run, view.draft.specialIds).width
    box.dataset['playerCount'] = String(mine)
    box.dataset['enemyCount'] = String(combat.enemyLine.length)
    box.append(el('div', 'enemy-band'))

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
        const { width } = fieldFor(run, view.draft.specialIds)
        if (width === 0) return
        bed(
          1,
          button({
            act: 'throw',
            label: VERBS.throw,
            describe: `Throw ${width} ${width === 1 ? 'bone' : 'bones'} against its line`,
            onPress: on.onThrow,
            className: 'act act-primary',
          }),
        )
        return
      }
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
  const here = roomAt(run)
  if (here.enemy && !run.cleared.includes(run.roomId)) {
    if (totalBones(run) > 0) {
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
