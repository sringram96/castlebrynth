import { AREAS, KEYS, areaById } from '../content/areas.js'
import type { AreaId } from '../content/areas.js'
import { discovery } from '../game/discovery.js'
import type { RunState } from '../game/state.js'
import { button, el } from './components.js'

const NS = 'http://www.w3.org/2000/svg'
const coordinate = (p: { x: number; y: number }): string => `${'ABC'[p.x]}${p.y + 3}`
function svg<K extends keyof SVGElementTagNameMap>(tag: K, attributes: Record<string, string> = {}): SVGElementTagNameMap[K] {
  const node = document.createElementNS(NS, tag)
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value)
  return node
}

/** Native map geometry, not world art. No undiscovered room content enters the DOM. */
export function mazeMapView(run: RunState, area: AreaId, compact = false): SVGSVGElement {
  const data = discovery(run, area)
  const map = svg('svg', { viewBox: '0 0 192 384', class: compact ? 'maze-map mini-map' : 'maze-map',
    role: 'img', 'aria-label': `${areaById(area).name}. ${data.rooms.filter(r => r.visited).length} rooms explored. Diamond: you. Question mark: unexplored.` })
  const point = (position: { x: number; y: number }): [number, number] => [32 + position.x * 64, 32 + (position.y + 2) * 64]
  for (const edge of data.passages) {
    if (!edge.from.position || !edge.to.position) continue
    const [x1,y1] = point(edge.from.position), [x2,y2] = point(edge.to.position)
    map.append(svg('line', { x1: String(x1), y1: String(y1), x2: String(x2), y2: String(y2), class: edge.locked ? 'map-passage map-locked' : 'map-passage' }))
    if (edge.locked) {
      const mark = svg('text', { x: String((x1+x2)/2), y: String((y1+y2)/2), class: 'map-lock-mark' })
      mark.textContent = '×'; map.append(mark)
    }
  }
  for (const room of data.rooms) {
    if (!room.node.position) continue
    const [x,y] = point(room.node.position)
    const group = svg('g', { 'data-map-node': room.node.id, 'data-visited': String(room.visited), 'data-current': String(room.current) })
    const title = svg('title'); title.textContent = `${coordinate(room.node.position)}: ${room.description}`
    const box = svg('rect', { x: String(x-16), y: String(y-16), width: '32', height: '32', class: room.current ? 'map-room map-current' : room.visited ? 'map-room' : 'map-room map-unknown' })
    const mark = svg('text', { x: String(x), y: String(y), class: 'map-mark' }); mark.textContent = room.mark
    group.append(title, box, mark)
    if (!compact) {
      const label = svg('text', { x: String(x), y: String(y+27), class: 'map-coordinate' })
      label.textContent = coordinate(room.node.position); group.append(label)
    }
    map.append(group)
  }
  return map
}

export function mazeMapPanel(run: RunState): HTMLElement {
  const current = run.map.nodes[run.roomId]!.area!
  const panel = el('div', 'maze-map-panel')
  const visited = new Set([...run.path, run.roomId].map(id => run.map.nodes[id]?.area))
  const tabs = el('div', 'map-area-tabs'), body = el('div', 'map-area-body')
  tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Explored areas')
  const draw = (area: AreaId): void => {
    body.replaceChildren()
    for (const tab of tabs.querySelectorAll<HTMLElement>('button')) tab.setAttribute('aria-pressed', String(tab.dataset['area'] === area))
    const content = areaById(area)
    body.append(el('h2', 'screen-head', content.name.toUpperCase()))
    body.append(mazeMapView(run, area))
    body.append(el('p', 'map-legend', '◆ YOU · ? UNEXPLORED · × LOCK · K KEY · F FONT · B KEEPER · ✓ CLEARED · ◇ DIE'))
    const hasKey = (run.keys ?? []).includes(content.key)
    const boss = Object.values(run.map.nodes).find(node => node.area === area && node.sectionBoss)
    body.append(el('p', 'map-objective', boss && run.cleared.includes(boss.id)
      ? 'Keeper defeated. The next passage is open.'
      : hasKey ? `${KEYS[content.key].name} carried. Find the keeper’s door.` : `Find the ${KEYS[content.key].name}.`))
    const list = el('ul', 'map-room-list')
    for (const room of discovery(run, area).rooms.filter(r => r.visited))
      list.append(el('li', '', `${coordinate(room.node.position!)}: ${room.description}`))
    body.append(list)
  }
  for (const area of AREAS.filter(a => visited.has(a.id))) {
    const tab = button({ act: 'map-area', label: area.name.replace('The ', ''), onPress: () => draw(area.id), className: 'map-area-tab' })
    tab.dataset['area'] = area.id; tabs.append(tab)
  }
  panel.append(tabs, body)
  draw(current)
  if (run.keys?.length) {
    const keys = el('div', 'map-keys'); keys.append(el('h3', '', 'CARRIED KEYS'))
    for (const key of run.keys) keys.append(el('p', '', `${KEYS[key].name} — ${KEYS[key].purpose}`))
    panel.append(keys)
  }
  return panel
}
