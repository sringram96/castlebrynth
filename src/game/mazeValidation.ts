import { AREAS, COMPASS, KEYS } from '../content/areas.js'
import type { KeyId } from '../content/areas.js'
import type { RunMap } from './map.js'
import type { MapProblem } from './mapValidation.js'

/** Structural solvability, independent of combat luck and optional purchases. */
export function validateMaze(map: RunMap): readonly MapProblem[] {
  const problems: MapProblem[] = []
  const fail = (code: string, message: string): void => { problems.push({ code, message }) }
  const nodes = Object.values(map.nodes)
  const positions = new Set<string>()
  for (const node of nodes) {
    if (!node.area || !node.position) { fail('maze-position', `${node.id} has no area or position`); continue }
    if (!AREAS.some(area => area.id === node.area) ||
      !Number.isInteger(node.position.x) || node.position.x < 0 || node.position.x > 2 ||
      !Number.isInteger(node.position.y) || node.position.y < -2 || node.position.y > 3)
      fail('maze-position', `${node.id} has an invalid area or position`)
    if (node.key && !Object.hasOwn(KEYS, node.key)) fail('maze-key', `${node.id} has an unknown key`)
    const position = `${node.area}:${node.position.x}:${node.position.y}`
    if (positions.has(position)) fail('maze-overlap', `${node.id} overlaps another room`)
    positions.add(position)
    const directions = new Set<string>()
    for (const edge of node.exits) {
      const next = map.nodes[edge.to]
      if (!edge.direction || !Object.hasOwn(COMPASS, edge.direction) || directions.has(edge.direction)) { fail('maze-direction', `${node.id} repeats or omits a direction`); continue }
      if (edge.requiresKey && !Object.hasOwn(KEYS, edge.requiresKey)) fail('maze-lock', `${node.id} requires an unknown key`)
      directions.add(edge.direction)
      const d = COMPASS[edge.direction]
      if (next?.area === node.area && next.position &&
        (node.position.x + d.dx !== next.position.x || node.position.y + d.dy !== next.position.y)) fail('maze-geometry', `${node.id} has a nonadjacent passage`)
      if (next && next.role !== 'exit' && !next.exits.some(back => back.to === node.id && back.direction === d.opposite && back.requiresKey === edge.requiresKey))
        fail('maze-one-way', `${node.id} has a passage that cannot be retraced`)
    }
  }
  const flood = (blocked?: string, keys?: ReadonlySet<KeyId>): Set<string> => {
    const reached = new Set<string>(), queue = [map.start]
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i]!
      if (id === blocked || reached.has(id) || !map.nodes[id]) continue
      reached.add(id)
      for (const edge of map.nodes[id]!.exits) if (!keys || !edge.requiresKey || keys.has(edge.requiresKey)) queue.push(edge.to)
    }
    return reached
  }
  for (const area of AREAS) {
    const members = nodes.filter(n => n.area === area.id)
    const bosses = members.filter(n => n.sectionBoss)
    if (bosses.length !== 1 || bosses[0]?.enemyId !== area.boss) fail('maze-boss', `${area.id} needs exactly its section keeper`)
    if (members.filter(n => n.key === area.key).length !== 1) fail('maze-key', `${area.id} needs exactly one ${area.key}`)
    const boss = bosses[0]
    if (boss) {
      const without = flood(boss.id)
      if (without.has('out')) fail('maze-boss-bypass', `${area.id} keeper can be skipped`)
      const incoming = nodes.flatMap(n => n.exits.filter(e => e.to === boss.id && n.area === area.id))
      if (!incoming.length || incoming.some(e => e.requiresKey !== area.key)) fail('maze-lock', `${area.id} keeper has an unkeyed entrance`)
    }
    const cells = members.filter(n => n.position && n.position.y >= 0 && n.position.y < 3)
    const ids = new Set(cells.map(n => n.id))
    const edges = cells.reduce((sum,n) => sum + n.exits.filter(e => ids.has(e.to)).length, 0) / 2
    if (edges < cells.length) fail('maze-loop', `${area.id} has no real loop`)
  }
  // Repeatedly discover reachable keys. A key behind its own door never appears.
  const keys = new Set<KeyId>()
  let reached = flood(undefined, keys)
  for (let pass = 0; pass < AREAS.length; pass++) {
    for (const id of reached) { const key = map.nodes[id]?.key; if (key) keys.add(key) }
    reached = flood(undefined, keys)
  }
  if (reached.size !== nodes.length) fail('maze-key-deadlock', 'Some rooms cannot be reached by collecting reachable keys')
  if (nodes.filter(n => n.role === 'entrance').length !== 1 || map.nodes[map.start]?.role !== 'entrance') fail('maze-entrance', 'The maze needs one starting stair')
  if (nodes.filter(n => n.role === 'exit').length !== 1) fail('maze-ending', 'The maze needs one ending')
  const treasure = nodes.filter(n => n.dice?.some(d => d.kind === 'treasure'))
  if (treasure.length !== 1 || !flood(treasure[0]?.id).has('out')) fail('maze-treasure', 'The treasure must be singular and optional')
  return problems
}
