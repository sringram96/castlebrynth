/**
 * The world: the room, the enemy, the word band, and what can be tapped.
 *
 * The enemy is placed by the compositor on its own layer and is never hidden
 * by anything — in explore as well as in combat, because a room's monster is
 * visible before any combat control appears.
 */

import { hideEnemy, hideProp, holdWeapon, placeEnemy, showProp, showProps } from '../render/compositor.js'
import type { World } from '../render/compositor.js'
import { enemyArt, handArt, isScenePlate, propArt, roomArt, url } from '../render/assets.js'
import { STAGES, armySize, enemy as enemyById, stageForRound, stanceAt } from '../content/enemies.js'
import { idlePose } from '../content/enemyPresentation.js'
import { room as roomById } from '../content/rooms.js'
import { actionFor, platesFor, stateOf } from '../content/interactions.js'
import type { GameState } from '../game/state.js'
import { button, el } from './components.js'

export interface WorldHandlers {
  readonly onLook: (detailId: string) => void
  /** The encounter's rule, said out loud. Reads state, changes none. */
  readonly onRule: () => void
  /** The room's focal object, pressed. The reducer decides what it gives. */
  readonly onRitual: () => void
  /** One of the room's objects, worked. The reducer decides what it does. */
  readonly onInteract: (interactionId: string) => void
}

/**
 * What the room's ritual has already given, if this is a room with one and it
 * has been used. Every view below asks the same question of the same state.
 */
function resolvedRitual(state: GameState) {
  const run = state.run!
  return run.ritual?.roomId === run.roomId ? run.ritual : undefined
}

export function renderWorld(world: World, state: GameState, handlers: WorldHandlers): void {
  const run = state.run
  if (!run) {
    world.backdrop.src = url(roomArt('threshold'))
    hideEnemy(world)
    hideProp(world)
    world.hits.replaceChildren()
    world.hud.replaceChildren()
    return
  }

  const here = roomById(run.roomId)
  const backdrop = url(roomArt(here.art))
  if (world.backdrop.getAttribute('src') !== backdrop) world.backdrop.src = backdrop

  // The monster, if there is one still standing here.
  const standing = here.enemy && !run.cleared.includes(run.roomId) ? here.enemy : undefined
  if (standing) {
    const e = enemyById(standing)
    const combat = run.combat?.enemyId === standing ? run.combat : undefined
    // Which drawing of a thing painted three ways. Straight off `combat.round`
    // and stored nowhere, so a reload on round three paints the near
    // composition without a frame index in the save. Before the fight opens
    // there is no round yet, and a thing that is painted approaching is
    // standing where the fight will start it: at the far end.
    //
    // It is staging and nothing else. Being close costs the player nothing.
    const stage = stageForRound(standing, combat?.round ?? 1) ?? (e.staging ? STAGES[0] : undefined)
    const stance = stanceAt(standing, stage)
    // And how much of its army is left, for a horror painted deteriorating.
    // Recomputed here on every paint and stored nowhere — which is the whole
    // reason a reload at four of eight shows the middle plate.
    //
    // The *first* plate of the band, always. The second is a beat of an idle
    // loop, the loop belongs to `app/app.ts`, and a settled picture is the one
    // every band is authored to rest on.
    const start = combat?.enemyStartCount ?? armySize(standing)
    const alive = combat?.enemyBones.length ?? start
    const pose = idlePose(standing, alive, start) ?? stage
    const art = enemyArt(e.art, pose)
    placeEnemy(world, url(art), {
      width: stance.width,
      foot: stance.foot,
      ...(stance.at !== undefined ? { at: stance.at } : {}),
      ...(stage ? { reach: stage } : {}),
      ...(isScenePlate(art) ? { scene: true } : {}),
    })
  } else {
    hideEnemy(world)
  }

  // The room's focal object, at the frame the *state* says it is on: the idle
  // basin until the font has been used, and afterwards the face it landed on,
  // for good. Nothing here remembers a frame and nothing here chooses one —
  // which is why a reload shows the result rather than an unpressed room, and
  // why the sequence that plays the throw cannot change what it lands on.
  const ritual = here.ritual
  const given = resolvedRitual(state)
  const frame = ritual ? propArt(ritual.art, given ? String(given.roll) : 'idle') : undefined
  if (frame) showProp(world, url(frame))
  else hideProp(world)

  // And a room whose objects each have a position of their own paints all of
  // them, in content's order, off the same settled state. Nothing here
  // remembers a frame: the picture is `platesFor` of the save and nothing
  // else, so a reload mid-puzzle and never having left are the same room.
  const worked = stateOf(run.rooms, run.roomId)
  showProps(
    world,
    worked
      ? platesFor(worked)
          .map((p) => ({ plate: p, art: propArt(p.art, p.frame) }))
          .filter((x): x is { plate: typeof x.plate; art: NonNullable<typeof x.art> } => x.art !== undefined)
          .map(({ plate, art }) => ({
            id: plate.id,
            src: url(art),
            ...(plate.look !== undefined ? { look: plate.look } : {}),
          }))
      : [],
  )

  // The knife comes out for the thing in the room, not for the room. Both
  // plates are mounted here; which one shows is the sequence's business, and
  // the resting one is what a settled screen always lands on.
  holdWeapon(
    world,
    standing && enemyById(standing).staging
      ? { rest: url(handArt('rest')), thrust: url(handArt('thrust')) }
      : undefined,
  )

  renderHits(world, state, handlers)
  renderHud(world, state, handlers)
}

function renderHits(world: World, state: GameState, handlers: WorldHandlers): void {
  const run = state.run!
  const here = roomById(run.roomId)
  world.hits.replaceChildren()

  // Nothing in the world is tappable while a fight is on: the fight is the
  // room, and a stray detail tap during a turn is noise.
  if (state.mode !== 'explore') return

  // The focal object first, and only while it still has something to give.
  // It carries its verb where the thing itself is rather than in the tray,
  // because *this basin* is what is being pressed — and once it has answered
  // it stops being a control, exactly as a beaten enemy stops being a fight.
  if (here.ritual && !resolvedRitual(state)) {
    const b = button({
      act: 'ritual',
      label: here.ritual.label,
      describe: here.ritual.describe,
      onPress: handlers.onRitual,
      className: 'hit hit-focal hit-ritual',
    })
    b.dataset['ritual'] = here.ritual.art
    b.style.left = `${here.ritual.at.x * 100}%`
    b.style.top = `${here.ritual.at.y * 100}%`
    world.hits.append(b)
  }

  // The room's worked objects, each carrying its verb where the thing itself
  // is. A press dispatches an id and nothing else — the view never computes
  // what an object will do, and `actionFor` is the same call the reducer makes
  // to decide whether to accept it, so a button that would be rejected is a
  // button that is never drawn.
  //
  // An object with nothing to offer gets **no element at all**, not a disabled
  // one. A greyed PULL beside three carved clues is the interface refusing to
  // say what it wants; an absent one leaves the clues to do their job.
  const worked = stateOf(run.rooms, run.roomId)
  if (worked) {
    for (const thing of here.interactables ?? []) {
      const action = actionFor(worked, thing.id)
      if (!action) continue
      const b = button({
        act: 'interact',
        label: action.label,
        describe: action.describe,
        onPress: () => handlers.onInteract(thing.id),
        className: 'hit hit-focal hit-interact',
      })
      b.dataset['interact'] = thing.id
      b.dataset['prop'] = thing.art
      b.style.left = `${thing.at.x * 100}%`
      b.style.top = `${thing.at.y * 100}%`
      world.hits.append(b)
    }
  }

  for (const detail of here.details) {
    const b = button({
      act: 'look',
      label: '',
      // "Inspect", because this is the word's proper subject: one concrete
      // thing in the room. The global overlay is MENU and is not this.
      describe: `Inspect the ${detail.id.replace(/-/g, ' ')}`,
      onPress: () => handlers.onLook(detail.id),
      className: `hit${detail.focal ? ' hit-focal' : ''}${run.looked.includes(detail.id) ? ' hit-seen' : ''}`,
    })
    b.dataset['detail'] = detail.id
    b.style.left = `${detail.at.x * 100}%`
    b.style.top = `${detail.at.y * 100}%`
    world.hits.append(b)
  }
}

function renderHud(world: World, state: GameState, handlers: WorldHandlers): void {
  const run = state.run!
  world.hud.replaceChildren()

  const combat = run.combat
  if (combat && state.mode === 'combat') {
    const e = enemyById(combat.enemyId)
    const bar = el('div', 'enemy-bar')
    bar.id = 'enemy-bar'

    // Its name and how many bones it has left. Not a meter: a count, because a
    // count is what the fight is made of and a bar would be a health bar
    // wearing a different label.
    const name = el('div', 'enemy-name')
    name.append(el('span', 'enemy-title', e.name))
    const bones = el('span', 'enemy-bones', `${combat.enemyBones.length} BONES`)
    bones.id = 'enemy-bones'
    bones.dataset['bones'] = String(combat.enemyBones.length)
    bones.dataset['start'] = String(combat.enemyStartCount)
    bones.setAttribute('aria-label', `${e.name}, ${combat.enemyBones.length} bones left`)
    name.append(bones)
    bar.append(name)

    // Its rule, in readable text, before anything can be committed. A boss
    // rule the player only learns by losing a bone to it is not a rule.
    // A finished thing declares nothing, so it goes with the fight.
    if (e.rule && !combat.defeated) {
      const b = button({
        act: 'rule',
        label: e.tieRule === 'warden-holds' ? 'TIES HOLD.' : 'ITS RULE',
        describe: e.rule,
        onPress: handlers.onRule,
        className: `enemy-rule${e.tieRule === 'warden-holds' ? ' enemy-rule-hard' : ''}`,
      })
      b.id = 'enemy-rule'
      bar.append(b)
    }
    world.hud.append(bar)
  }

  // The whole turn, not its last line.
  //
  // The band used to show `log.at(-1)`, which is always the enemy's answer —
  // so "Green face: heal 4 HP" and "Red face: lose 7 HP" existed in the state,
  // were animated on the die that caused them, and were then unreadable a
  // moment later. Anything that is only legible while moving is missing for
  // anyone who turned motion off.
  const say = el('p', 'say')
  say.id = 'say'
  const beats = run.say ? [run.say] : (combat && state.mode === 'combat' ? combat.log : [])
  for (const beat of beats) say.append(el('span', 'say-beat', beat))
  if (beats.length === 0) say.hidden = true
  world.hud.append(say)
}
