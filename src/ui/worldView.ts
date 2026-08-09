/**
 * The world: the room, the enemy, the word band, and what can be tapped.
 *
 * The enemy is placed by the compositor on its own layer and is never hidden
 * by anything — in explore as well as in combat, because a room's monster is
 * visible before any combat control appears.
 */

import { hideEnemy, holdWeapon, placeEnemy } from '../render/compositor.js'
import type { World } from '../render/compositor.js'
import { enemyArt, handArt, roomArt, url } from '../render/assets.js'
import { REACHES, enemy as enemyById, intentAt, stanceAt } from '../content/enemies.js'
import { room as roomById } from '../content/rooms.js'
import type { GameState } from '../game/state.js'
import { button, el } from './components.js'

export interface WorldHandlers {
  readonly onLook: (detailId: string) => void
  readonly onIntent: () => void
}

export function renderWorld(world: World, state: GameState, handlers: WorldHandlers): void {
  const run = state.run
  if (!run) {
    world.backdrop.src = url(roomArt('threshold'))
    hideEnemy(world)
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
