/** Fog of war: visited rooms and the mouths immediately visible from them. */
import type { AreaId } from '../content/areas.js'
import { KEYS } from '../content/areas.js'
import { exitUnlocked, ritualIn, roomAt } from './map.js'
import type { MapExit, RunRoom } from './map.js'
import type { RunState } from './state.js'

export interface DiscoveredRoom {
  readonly node: RunRoom
  readonly visited: boolean
  readonly current: boolean
  readonly mark: string
  readonly description: string
}

export function discovery(run: RunState, area: AreaId): {
  readonly rooms: readonly DiscoveredRoom[]
  readonly passages: readonly { readonly from: RunRoom; readonly to: RunRoom; readonly locked: boolean; readonly exit: MapExit }[]
} {
  const visited = new Set([...run.path, run.roomId])
  const revealed = new Set(visited)
  for (const id of visited) for (const edge of run.map.nodes[id]?.exits ?? []) revealed.add(edge.to)
  const rooms = Object.values(run.map.nodes).filter(n => n.area === area && revealed.has(n.id)).map(node => {
    const seen = visited.has(node.id), current = node.id === run.roomId
    let mark = '?', description = 'Unexplored passage'
    if (seen) {
      const here = roomAt(run, node.id)
      const key = node.key && !(run.keys ?? []).includes(node.key) ? node.key : undefined
      const cache = node.dice?.some((_, i) => !run.claimed?.[node.id]?.includes(i))
      const font = !!here.ritual && !ritualIn(run, node.id)
      mark = node.sectionBoss ? (run.cleared.includes(node.id) ? '✓' : 'B') : key ? 'K' : font ? 'F' : cache ? '◇' : '·'
      description = `${here.name}${key ? `. ${KEYS[key].name} here` : ''}${font ? '. Font unused' : ''}${cache ? '. Die left here' : ''}${node.sectionBoss ? (run.cleared.includes(node.id) ? '. Keeper defeated' : '. Section keeper') : ''}`
    }
    return { node, visited: seen, current, mark: current ? '◆' : mark, description: `${description}${current ? '. You are here' : ''}` }
  })
  const passages: { from: RunRoom; to: RunRoom; locked: boolean; exit: MapExit }[] = []
  const drawn = new Set<string>()
  for (const room of rooms) {
    if (!room.visited) continue
    for (const edge of room.node.exits) {
      const next = run.map.nodes[edge.to]
      if (!next || next.area !== area) continue
      const id = [room.node.id, next.id].sort().join('|')
      if (drawn.has(id)) continue
      drawn.add(id)
      passages.push({ from: room.node, to: next, locked: !exitUnlocked(run, edge), exit: edge })
    }
  }
  return { rooms, passages }
}
