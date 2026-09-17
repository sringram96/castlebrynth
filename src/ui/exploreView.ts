import { BONE_CEILING, roomToRecover } from '../content/bones.js'
import { coreDie, talisman as talismanById } from '../content/dice.js'
import { handSaid } from '../content/faces.js'
import { VERBS } from '../content/text.js'
import type { GameState } from '../game/state.js'
import { button, el } from './components.js'
import { mazeMapView } from './mazeMap.js'
import { areaById } from '../content/areas.js'

export interface ExploreHandlers {
  readonly onMenu: () => void
  readonly onMap: () => void
  readonly onDrink: () => void
  readonly onInspectVial: () => void
  readonly onInspectCarried: (id: string) => void
  readonly onToggleBand: () => void
}

/** Everyday controls live below the picture; the reliquary belongs to a fight. */
export function renderExplore(
  host: HTMLElement,
  state: GameState,
  encounter: boolean,
  bandOff: boolean,
  on: ExploreHandlers,
): void {
  host.replaceChildren()
  host.hidden = state.mode !== 'explore' || encounter || !state.run
  const run = state.run
  if (host.hidden || !run) return
  host.dataset['layout'] = run.map.layout ?? 'classic'

  const pile = el('span', 'explore-pile', `${run.bones} BONES`)
  pile.id = 'explore-pile'
  pile.dataset['bones'] = String(run.bones)
  pile.dataset['low'] = run.bones <= 6 ? 'yes' : 'no'
  pile.setAttribute('aria-label', `${run.bones} of ${BONE_CEILING} bones remaining`)
  host.append(pile)

  // The six are the run's build, not combat furniture. They stay on screen
  // between encounters so a replacement that cost a bone and a slot is still
  // visibly owned once the picker and the fight tray have gone away: a plain
  // bone is a dot, a crooked one sits gold and off true.
  //
  // **A readout, not six buttons** — the same kind of thing the pile beside it
  // is. A hit target is 44px in its smallest dimension and the row is a slim
  // strip under the picture, so six of them could not fit beside the verbs,
  // and one that opened the loadout would be a second MENU next to MENU. What
  // the strip is for is *seeing* the build; reading it is MENU, two controls
  // along, where each of the six has its name, its faces and its flavour.
  const hand = el('span', 'explore-hand')
  hand.id = 'explore-hand'
  hand.setAttribute('role', 'img')
  hand.setAttribute('aria-label', `My six: ${handSaid(run.hand)}`)
  run.hand.forEach((id, slot) => {
    const die = coreDie(id)
    const mark = el('span', 'explore-die', id === 'bone' ? '·' : die.short.slice(0, 1))
    mark.dataset['slot'] = String(slot)
    mark.dataset['dieId'] = id
    mark.dataset['plain'] = id === 'bone' ? 'yes' : 'no'
    mark.setAttribute('aria-hidden', 'true')
    hand.append(mark)
  })
  host.append(hand)

  if (run.vials > 0) {
    const canDrink = roomToRecover(run) > 0
    const vial = button({
      act: canDrink ? 'drink' : 'inspect-reward',
      label: canDrink ? `DRINK +${Math.min(5, roomToRecover(run))}` : 'VIAL',
      describe: canDrink
        ? `Drink a Vial: 5 bones back, up to ${BONE_CEILING}. ${run.vials} remaining`
        : `Vials: ${run.vials}. Inspect`,
      onPress: canDrink ? on.onDrink : on.onInspectVial,
      className: 'explore-button explore-vial satchel-slot',
    })
    vial.dataset['slotId'] = 'vial'
    vial.dataset['live'] = canDrink ? 'yes' : 'no'
    const count = el('span', 'satchel-count', `×${run.vials}`)
    count.dataset['count'] = String(run.vials)
    vial.append(count)
    host.append(vial)
  }

  // What the run is carrying stays carried when the tray goes away. A talisman
  // is found in the world and its rule is a rule, not a place: hiding it until
  // the next fight would be hiding the rule, and would leave TAKE with nothing
  // to land its beat on. Inspect-only here, exactly as it is on the tray.
  if (run.talismans.length > 0) {
    const id = run.talismans[0]!
    const t = talismanById(id)
    const b = button({
      act: 'inspect-talisman',
      label: 'PAIR',
      describe: `${t.name}. ${t.rule}`,
      onPress: () => on.onInspectCarried(id),
      className: 'explore-button explore-talisman talisman-slot',
    })
    b.dataset['talismanId'] = id
    b.append(el('b', 'bay-count', `+${t.bonus}`))
    host.append(b)
  }

  const words = button({
    act: 'words',
    label: bandOff ? 'READ' : 'HIDE TEXT',
    describe: bandOff ? 'Read the room description' : 'Hide the room description',
    onPress: on.onToggleBand,
    className: 'explore-button',
  })
  words.setAttribute('aria-expanded', String(!bandOff))
  words.setAttribute('aria-controls', 'say')
  host.append(words)
  const area = run.map.nodes[run.roomId]?.area
  const mapButton = button({ act: 'map', label: VERBS.map, onPress: on.onMap, className: 'explore-button' })
  if (area) {
    mapButton.classList.add('explore-minimap')
    mapButton.setAttribute('aria-label', `${areaById(area).name}. Open map and carried keys`)
    mapButton.prepend(mazeMapView(run, area, true))
  }
  host.append(mapButton)
  host.append(button({ act: 'menu', label: VERBS.menu, onPress: on.onMenu, className: 'explore-button' }))
}
