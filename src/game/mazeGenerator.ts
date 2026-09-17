/** Seeded spanning trees with extra passages: a new connected maze, not a shuffled reel. */
import { AREAS, COMPASS, DIRECTIONS } from '../content/areas.js'
import type { Direction, KeyId } from '../content/areas.js'
import { BARGAIN_POOL, DIE_PRICE, TREASURE_DIE } from '../content/dice.js'
import { assertContent } from '../content/roomResolver.js'
import { template } from '../content/rooms.js'
import { way } from '../content/runPlans.js'
import type { MapExit, RunMap, RunRoom } from './map.js'
import { validateRun } from './mapValidation.js'
import { Rng } from './rng.js'

interface Cell { readonly x: number; readonly y: number }
const cellId = (cell: Cell): string => `${cell.x},${cell.y}`
const adjacent = (cell: Cell): Cell[] => DIRECTIONS.map(d => ({ x: cell.x + COMPASS[d].dx, y: cell.y + COMPASS[d].dy }))
  .filter(c => c.x >= 0 && c.x < 3 && c.y >= 0 && c.y < 3)

export function generateMaze(seed: number): RunMap {
  assertContent()
  const rng = new Rng(((seed >>> 0) ^ 0x4d415a45) >>> 0)
  const nodes: Record<string, RunRoom> = {}
  const addExit = (from: string, to: string, direction: Direction, key?: KeyId): void => {
    const source = nodes[from]!
    const exit: MapExit = { ...way(`maze-${direction}`), to, kind: 'passage', direction,
      at: COMPASS[direction].at, ...(key ? { requiresKey: key } : {}) }
    nodes[from] = { ...source, exits: [...source.exits, exit] }
  }
  const join = (from: string, to: string, direction: Direction, key?: KeyId, oneWay = false): void => {
    addExit(from, to, direction, key)
    if (!oneWay) addExit(to, from, COMPASS[direction].opposite, key)
  }
  let previousBoss: string | undefined

  AREAS.forEach((area, areaIndex) => {
    const cells: Cell[] = Array.from({ length: 9 }, (_, i) => ({ x: i % 3, y: Math.floor(i / 3) }))
    const entrance: Cell = { x: rng.int(3), y: 2 }
    const connections = new Map(cells.map(c => [cellId(c), new Set<string>()]))
    const connect = (a: Cell, b: Cell): void => {
      connections.get(cellId(a))!.add(cellId(b)); connections.get(cellId(b))!.add(cellId(a))
    }
    const visited = new Set([cellId(entrance)])
    const stack = [entrance]
    while (stack.length) {
      const here = stack[stack.length - 1]!
      const choices = adjacent(here).filter(c => !visited.has(cellId(c)))
      if (!choices.length) { stack.pop(); continue }
      const next = choices[rng.int(choices.length)]!
      connect(here, next); visited.add(cellId(next)); stack.push(next)
    }
    // Extra undirected edges make real loops, not just the two arcs of a doorway.
    const missing = cells.flatMap(a => adjacent(a)
      .filter(b => cellId(a) < cellId(b) && !connections.get(cellId(a))!.has(cellId(b)))
      .map(b => [a, b] as const))
    for (let i = 0; i < area.loops && missing.length; i++) {
      const [a, b] = missing.splice(rng.int(missing.length), 1)[0]!
      connect(a, b)
    }
    const distances = (from: Cell, blocked?: string): Map<string, number> => {
      const seen = new Map<string, number>([[cellId(from), 0]])
      const queue = [cellId(from)]
      for (let i = 0; i < queue.length; i++) {
        const current = queue[i]!
        for (const next of connections.get(current)!) {
          if (next === blocked || seen.has(next)) continue
          seen.set(next, seen.get(current)! + 1); queue.push(next)
        }
      }
      return seen
    }
    const steps = distances(entrance)
    const gate = [...cells.filter(c => c.y === 0)].sort((a,b) => steps.get(cellId(b))! - steps.get(cellId(a))!)[0]!
    const keyCandidates = cells.filter(c => cellId(c) !== cellId(entrance) && cellId(c) !== cellId(gate))
      .sort((a,b) => steps.get(cellId(b))! - steps.get(cellId(a))!)
    const keyCell = keyCandidates[rng.int(Math.min(3, keyCandidates.length))]!
    const optional = cells.filter(c => ![entrance, gate, keyCell].some(other => cellId(other) === cellId(c)))
      .filter(c => { const reachable = distances(entrance, cellId(c)); return reachable.has(cellId(keyCell)) && reachable.has(cellId(gate)) })
    // A 3x3 tree plus a loop always has a nonessential room outside these three seats.
    if (!optional.length) throw new Error(`no optional cache in ${area.id}`)
    const cacheCell = optional[rng.int(optional.length)]!
    const fontChoices = cells.filter(c => ![entrance, gate, keyCell, cacheCell].some(other => cellId(other) === cellId(c)))
    const fontCell = fontChoices[rng.int(fontChoices.length)]!
    const nodeId = (cell: Cell): string => `${area.id}:${cell.x}:${cell.y}`

    const add = (id: string, templateId: string, position: Cell, extra: Partial<RunRoom> = {}): void => {
      const room = template(templateId)
      nodes[id] = { id, templateId, role: room.role, territory: room.territory, area: area.id,
        position, depth: areaIndex * 12 + (3 - position.y), exits: [], ...extra }
    }
    for (const cell of cells) {
      let chosen = area.rooms[rng.int(area.rooms.length)]!
      if (cellId(cell) === cellId(keyCell)) chosen = area.keyRoom
      if (cellId(cell) === cellId(fontCell)) chosen = `maze-${area.territory}-font`
      if (cellId(cell) === cellId(cacheCell)) chosen = `maze-${area.territory}-cache`
      const seat = template(chosen).spareSeats?.[0]
      const treasure = areaIndex === AREAS.length - 1
      add(nodeId(cell), chosen, cell, {
        ...(cellId(cell) === cellId(keyCell) ? { key: area.key } : {}),
        ...(cellId(cell) === cellId(cacheCell) && seat ? { dice: [{
          die: treasure ? TREASURE_DIE : BARGAIN_POOL[rng.int(BARGAIN_POOL.length)]!,
          kind: treasure ? 'treasure' : 'bargain', ...(treasure ? {} : { price: DIE_PRICE }), seat: seat.id, at: seat.at,
        }] } : {}),
      })
    }
    for (const cell of cells) {
      for (const other of adjacent(cell)) {
        if (cellId(cell) >= cellId(other) || !connections.get(cellId(cell))!.has(cellId(other))) continue
        const direction = DIRECTIONS.find(d => cell.x + COMPASS[d].dx === other.x && cell.y + COMPASS[d].dy === other.y)!
        join(nodeId(cell), nodeId(other), direction)
      }
    }
    if (previousBoss) join(previousBoss, nodeId(entrance), 'north')
    else {
      add('stair', 'maze-entry', { x: entrance.x, y: 3 })
      join('stair', nodeId(entrance), 'north')
    }
    const bossId = `${area.id}:keeper`
    add(bossId, area.bossRoom, { x: gate.x, y: -1 }, { enemyId: area.boss, sectionBoss: true })
    join(nodeId(gate), bossId, 'north', area.key)
    previousBoss = bossId
    if (areaIndex === AREAS.length - 1) {
      add('out', 'maze-exit', { x: gate.x, y: -2 })
      join(bossId, 'out', 'north', undefined, true)
    }
  })
  // Fixed compass order makes both the display and serialized maps reproducible.
  for (const [id, node] of Object.entries(nodes)) nodes[id] = { ...node,
    exits: [...node.exits].sort((a,b) => DIRECTIONS.indexOf(a.direction!) - DIRECTIONS.indexOf(b.direction!)) }
  const map: RunMap = { layout: 'maze', start: 'stair', nodes, territorySequence: AREAS.map(area => area.territory) }
  const problems = validateRun(map)
  if (problems.length) throw new Error(`invalid maze: ${problems.map(p => p.message).join('; ')}`)
  return map
}
