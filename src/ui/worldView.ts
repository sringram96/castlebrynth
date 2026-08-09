/**
 * The world: the room, the enemy, the word band, and what can be tapped.
 *
 * The enemy is placed by the compositor on its own layer and is never hidden
 * by anything — in explore as well as in combat, because a room's monster is
 * visible before any combat control appears.
 */

import { hideEnemy, hideProp, holdWeapon, placeEnemy, showProp, showProps } from '../render/compositor.js'
import type { World } from '../render/compositor.js'
import { enemyArt, handArt, propArt, roomArt, url } from '../render/assets.js'
import { REACHES, enemy as enemyById, intentAt, stanceAt } from '../content/enemies.js'
import { room as roomById } from '../content/rooms.js'
import { actionFor, platesFor, stateOf } from '../content/interactions.js'
import type { GameState } from '../game/state.js'
import { button, el } from './components.js'

export interface WorldHandlers {
  readonly onLook: (detailId: string) => void
  readonly onIntent: () => void
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
    // How far away it is, straight off the state. Nothing here remembers where
    // it was a moment ago and nothing here moves it: a reload paints the reach
    // the save records, which is the only reason the picture can be trusted to
    // mean how many attacks are left.
    //
    // Before the fight opens there is no reach in state yet — but a thing that
    // closes is still standing somewhere, and it is standing where the fight
    // will start it.
    const fighting = run.combat?.enemyId === standing ? run.combat.approach : undefined
    const reach = fighting ?? (e.approach ? REACHES[0] : undefined)
    const stance = stanceAt(standing, reach)
    placeEnemy(world, url(enemyArt(e.art, reach)), {
      width: stance.width,
      foot: stance.foot,
      ...(stance.at !== undefined ? { at: stance.at } : {}),
      ...(reach ? { reach } : {}),
      ...(run.combat?.reached ? { contact: true } : {}),
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
          .map(({ plate, art }) => ({ id: plate.id, src: url(art) }))
      : [],
  )

  // The knife comes out for the thing in the room, not for the room. Both
  // plates are mounted here; which one shows is the sequence's business, and
  // the resting one is what a settled screen always lands on.
  holdWeapon(
    world,
    standing && enemyById(standing).approach
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

    const name = el('div', 'enemy-name')
    name.append(el('span', 'enemy-title', e.name))
    const hp = el('span', 'enemy-hp', `${combat.enemyHp} / ${combat.enemyMaxHp}`)
    hp.id = 'enemy-hp'
    name.append(hp)
    bar.append(name)

    const meter = el('div', 'meter')
    const fill = el('i', 'meter-fill')
    fill.style.width = `${(combat.enemyHp / combat.enemyMaxHp) * 100}%`
    meter.append(fill)
    bar.append(meter)

    // The intent, before the first casting, and tappable so it explains itself.
    // A dead thing declares nothing: what it was going to do next is no longer
    // true, and leaving it up would be the bar promising a turn that will not
    // happen over the top of the thing failing to take it.
    if (!combat.defeated) {
      const intent = intentAt(combat.enemyId, combat.turn)
      const b = button({
        act: 'intent',
        label: intent.damage > 0 ? `${intent.verb} ${intent.damage}` : intent.verb,
        describe: `Next: ${intent.explain}`,
        onPress: handlers.onIntent,
        className: `intent${intent.telegraph ? ' intent-telegraph' : ''}`,
      })
      b.id = 'intent'
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
