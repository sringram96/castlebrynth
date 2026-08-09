/**
 * Whether a generated map is a run.
 *
 * A pure function over a finished map, and deliberately not a theorem prover:
 * it checks the grammar that actually exists rather than every grammar that
 * could. Two questions, kept apart because they fail for different reasons:
 *
 *   - `validateRunMap` — **is this a graph the game can walk?** Every edge
 *     lands somewhere, every node is reachable, every room can carry the number
 *     of ways the map attached to it, and nothing was put in art that cannot
 *     hold it. A failure here is a bug in the resolver or in a template.
 *   - `validateDescent` — **is this a run worth playing?** One way in, a fight
 *     before the keeper, somewhere to heal before it, the keeper before the
 *     door, and the optional branch coming back. A failure here is a bug in the
 *     plan.
 *
 * `generateRun` runs both and throws, so a broken descent fails at the press of
 * START rather than four rooms later at a button that leads nowhere.
 */

import { canHost } from '../content/roomResolver.js'
import { ROOM_TEMPLATES } from '../content/rooms.js'
import { WAYS } from '../content/runPlans.js'
import type { RunMap, RunRoom } from './map.js'

export interface MapProblem {
  readonly code: string
  readonly message: string
  readonly nodeId?: string
}

const problem = (code: string, message: string, nodeId?: string): MapProblem => ({
  code,
  message,
  ...(nodeId ? { nodeId } : {}),
})

/** Every node the player can actually get to, from the start. */
export function reachableFrom(map: RunMap, from: string): ReadonlySet<string> {
  const seen = new Set<string>()
  const queue: string[] = [from]
  while (queue.length > 0) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    const node = map.nodes[id]
    if (!node) continue
    seen.add(id)
    for (const exit of node.exits) queue.push(exit.to)
  }
  return seen
}

/**
 * Every simple route through the map, start to a dead end.
 *
 * Cheap because the graph is ten nodes. A cycle is not an error here — the walk
 * simply refuses to revisit a node on the same path — so a map with one still
 * gets checked rather than hanging.
 */
export function routesFrom(map: RunMap, from: string): readonly (readonly string[])[] {
  const routes: string[][] = []
  const walk = (id: string, path: readonly string[]): void => {
    if (path.includes(id)) return
    const here = [...path, id]
    const node = map.nodes[id]
    const onward = (node?.exits ?? []).filter((e) => !here.includes(e.to))
    if (!node || onward.length === 0) {
      routes.push(here)
      return
    }
    for (const exit of onward) walk(exit.to, here)
  }
  walk(from, [])
  return routes
}

export function validateRunMap(map: RunMap): readonly MapProblem[] {
  const out: MapProblem[] = []
  const entries = Object.entries(map.nodes)

  // 1. A map with no root is not a map.
  if (!map.start || !map.nodes[map.start]) {
    out.push(problem('no-start', `start node "${map.start}" is not in the map`))
  }

  // 2. A node whose key and identity disagree. The only shape a duplicate id
  //    can survive in, once the nodes are a record rather than a list.
  for (const [key, node] of entries) {
    if (key !== node.id) {
      out.push(problem('node-id-mismatch', `node keyed "${key}" calls itself "${node.id}"`, key))
    }
  }

  const incoming = new Map<string, number>()
  for (const [, node] of entries) {
    for (const exit of node.exits) {
      // 3. An edge that lands nowhere.
      if (!map.nodes[exit.to]) {
        out.push(problem('unknown-destination', `${node.id} leads to "${exit.to}", which is not in the map`, node.id))
        continue
      }
      incoming.set(exit.to, (incoming.get(exit.to) ?? 0) + 1)
    }
  }

  const reachable = map.nodes[map.start] ? reachableFrom(map, map.start) : new Set<string>()

  for (const [, node] of entries) {
    const t = ROOM_TEMPLATES[node.templateId]
    if (!t) {
      out.push(problem('unknown-template', `${node.id} names template "${node.templateId}", which nobody wrote`, node.id))
      continue
    }

    // 4. The resolver answered with the wrong kind of room.
    if (t.role !== node.role) {
      out.push(problem('role-mismatch', `${node.id} wants a ${node.role} and holds ${t.id}, which is a ${t.role}`, node.id))
    }
    if (t.territory !== node.territory) {
      out.push(problem('territory-mismatch', `${node.id} is in ${node.territory} and holds ${t.id}, which is ${t.territory}`, node.id))
    }

    // 5. More ways in or out than the picture can carry.
    const ways = incoming.get(node.id) ?? 0
    if (ways < t.topology.minEntrances || ways > t.topology.maxEntrances) {
      out.push(problem('entrance-count', `${node.id} (${t.id}) has ${ways} ways in; its art holds ${t.topology.minEntrances}–${t.topology.maxEntrances}`, node.id))
    }
    if (node.exits.length < t.topology.minExits || node.exits.length > t.topology.maxExits) {
      out.push(problem('exit-count', `${node.id} (${t.id}) has ${node.exits.length} ways on; its art holds ${t.topology.minExits}–${t.topology.maxExits}`, node.id))
    }

    // 6. A fight in art that cannot hold it. The one rule the pictures have
    //    over the director, and the reason `composition` is content.
    if (node.enemyId && !canHost(t, node.enemyId)) {
      out.push(problem('encounter-incompatible', `${node.id} (${t.id}, ${t.composition}) cannot hold ${node.enemyId}`, node.id))
    }
    // And the other direction: a room painted around a fight, standing empty.
    if (!node.enemyId && t.enemy) {
      out.push(problem('encounter-missing', `${node.id} holds ${t.id}, which was painted around ${t.enemy}, and nothing is standing in it`, node.id))
    }

    // 7. A line on a button that nobody wrote.
    for (const exit of node.exits) {
      const known = Object.values(WAYS).some((w) => w.label === exit.label && w.sense === exit.sense)
      if (!known) {
        out.push(problem('unwritten-way', `${node.id} → ${exit.to} says something no authored way says`, node.id))
      }
    }

    // 8. A room nobody can get to.
    if (!reachable.has(node.id)) {
      out.push(problem('unreachable', `${node.id} cannot be reached from ${map.start}`, node.id))
    }
  }

  // 9. Something leads back into the start, so the root is not a root.
  if ((incoming.get(map.start) ?? 0) > 0) {
    out.push(problem('malformed-root', `${map.start} is the start and something leads into it`, map.start))
  }

  // 10. A descent with no way out of it.
  const endings = [...reachable].filter((id) => ROOM_TEMPLATES[map.nodes[id]!.templateId]?.ending)
  if (map.nodes[map.start] && endings.length === 0) {
    out.push(problem('no-reachable-exit', 'no ending is reachable from the start'))
  }

  return out
}

const roleOf = (map: RunMap, id: string): string | undefined => map.nodes[id]?.role

/**
 * The dramatic grammar of the descent this game actually has.
 *
 * Every rule below is one the slice's route has always obeyed and none of them
 * were ever written down. They are written down now because the plan is data:
 * a plan is a thing somebody can edit, and these are what makes an edit a run
 * rather than a list of rooms.
 */
export function validateDescent(map: RunMap): readonly MapProblem[] {
  const out: MapProblem[] = []
  const nodes = Object.values(map.nodes)
  const has = (role: string): RunRoom[] => nodes.filter((n) => n.role === role)

  const entrances = has('entrance')
  if (entrances.length !== 1) {
    out.push(problem('entrance-count-run', `a run has one way in; this one has ${entrances.length}`))
  }
  if (entrances[0] && entrances[0].id !== map.start) {
    out.push(problem('entrance-not-start', `the entrance is ${entrances[0].id} and the run starts at ${map.start}`, entrances[0].id))
  }

  const keepers = has('keeper')
  if (keepers.length !== 1) {
    out.push(problem('keeper-count', `a descent has one keeper; this one has ${keepers.length}`))
    return out
  }
  const keeper = keepers[0]!

  const routes = routesFrom(map, map.start)
  const toKeeper = routes.filter((r) => r.includes(keeper.id))
  if (toKeeper.length === 0) {
    out.push(problem('keeper-unreachable', `nothing leads to the keeper at ${keeper.id}`, keeper.id))
  }

  for (const route of toKeeper) {
    const before = route.slice(0, route.indexOf(keeper.id))
    // A keeper you can walk to without a fight is a boss the run never earned.
    if (!before.some((id) => roleOf(map, id) === 'encounter')) {
      out.push(problem('keeper-unearned', `${route.join(' → ')} reaches the keeper with no fight before it`, keeper.id))
    }
    // And the fork's question — how much health am I willing to spend — is only
    // a question if the run has been told what it has to spend.
    if (!before.some((id) => roleOf(map, id) === 'recovery')) {
      out.push(problem('no-recovery', `${route.join(' → ')} reaches the keeper with nowhere to heal`, keeper.id))
    }
  }

  // Every ending sits behind the keeper, and every route that ends does so at
  // an ending. A branch that ran out of exits somewhere else is a dead end.
  for (const route of routes) {
    const last = route[route.length - 1]!
    const endsWell = ROOM_TEMPLATES[map.nodes[last]?.templateId ?? '']?.ending
    if (!endsWell) {
      out.push(problem('dead-end', `${route.join(' → ')} stops at ${last}, which is not a way out`, last))
      continue
    }
    if (!route.includes(keeper.id)) {
      out.push(problem('keeper-skipped', `${route.join(' → ')} reaches the way out without passing the keeper`, last))
    }
  }

  // An optional branch has to come back. The deep way's whole promise is that
  // it is longer and rejoins; a branch that did not would be a second run.
  //
  // Stated as: once the keeper is ahead of you, no press may take it off the
  // table. Which is why the keeper itself is skipped — everything past it is
  // past it by design.
  for (const node of nodes) {
    if (node.id === keeper.id) continue
    if (!reachableFrom(map, node.id).has(keeper.id)) continue
    for (const exit of node.exits) {
      if (!map.nodes[exit.to]) continue
      if (!reachableFrom(map, exit.to).has(keeper.id)) {
        out.push(problem('branch-lost', `${node.id} → ${exit.to} never rejoins the way to the keeper`, exit.to))
      }
    }
  }

  return out
}

/** Both questions, for the caller that wants a map or an exception. */
export function validateRun(map: RunMap): readonly MapProblem[] {
  return [...validateRunMap(map), ...validateDescent(map)]
}
