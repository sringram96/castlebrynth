/**
 * The dungeon director, and the map it makes.
 *
 * Two things are being asserted, and the second is the one that matters:
 *
 *   - the director is **deterministic**. A seed is a run, and a run is a map
 *     that survives a save; a director that could produce two answers for one
 *     seed would make a saved map a guess.
 *   - the plan and the library are **separable**. The plan says
 *     `encounter, ossuary, low` and names no room; the library says what a
 *     room is and names no destination. That is the refactor, and it is
 *     asserted here rather than described.
 *
 * All of it is pure and none of it touches a DOM.
 */

import { describe, expect, it } from 'vitest'

import { DESCENT, WAYS } from '../../src/content/runPlans.js'
import type { RunPlan } from '../../src/content/runPlans.js'
import { ROOM_TEMPLATES } from '../../src/content/rooms.js'
import { canHost, fits } from '../../src/content/roomResolver.js'
import { generateRun, generateRunPlan, materializeRunPlan } from '../../src/game/runGenerator.js'
import { reachableFrom, routesFrom, validateDescent, validateRun, validateRunMap } from '../../src/game/mapValidation.js'
import type { RunMap } from '../../src/game/map.js'

const SEEDS = [0, 1, 2, 7, 42, 999, 2654435761]

/** What a route reads as, in authored rooms. */
const asRooms = (map: RunMap, route: readonly string[]): readonly string[] =>
  route.map((id) => map.nodes[id]!.templateId)

describe('the plan, before any room is chosen', () => {
  it('names no authored room anywhere', () => {
    // The plan is the drama and nothing else. Every id in it is a *slot*, and
    // the moment one of them is a room the director has started choosing
    // content and the library has stopped being the only place content lives.
    //
    // Checked over the ids rather than over the whole JSON, because a
    // territory and a room are allowed to share a word — `deep` is both the
    // country and the tunnel — and a substring match would call that a
    // failure it is not.
    const rooms = new Set(Object.keys(ROOM_TEMPLATES))
    for (const slot of DESCENT.nodes) expect(rooms.has(slot.id), `slot ${slot.id}`).toBe(false)
    for (const edge of DESCENT.edges) {
      expect(rooms.has(edge.from), `edge from ${edge.from}`).toBe(false)
      expect(rooms.has(edge.to), `edge to ${edge.to}`).toBe(false)
    }
  })

  it('says only what kind of moment each slot is', () => {
    // No art, no prose, no fight, no machinery. A slot that carried any of
    // those would be a room written in the wrong file.
    const allowed = new Set(['id', 'role', 'depth', 'threat', 'territory', 'requiredTags', 'forbiddenTags'])
    for (const slot of DESCENT.nodes) {
      expect(slot.role.length).toBeGreaterThan(0)
      expect(slot.territory, `${slot.id} does not say where it is`).toBeDefined()
      for (const key of Object.keys(slot)) expect([...allowed], `${slot.id}.${key}`).toContain(key)
    }
  })

  it('gives every edge a line somebody wrote', () => {
    for (const edge of DESCENT.edges) {
      expect(WAYS[edge.way], `${edge.from} → ${edge.to} names an unwritten way`).toBeDefined()
    }
  })

  it('is the same plan for every seed, for now, and says so', () => {
    for (const seed of SEEDS) expect(generateRunPlan(seed)).toEqual(DESCENT)
  })
})

describe('the map it materialises', () => {
  it('is deeply equal for the same seed, every time', () => {
    for (const seed of SEEDS) {
      expect(generateRun(seed)).toEqual(generateRun(seed))
      expect(JSON.stringify(generateRun(seed))).toBe(JSON.stringify(generateRun(seed)))
    }
  })

  it('reproduces the run the slice has always had', () => {
    // The whole point of the first director. The architecture changed; the
    // game did not.
    const map = generateRun(1)
    const routes = routesFrom(map, map.start).map((r) => asRooms(map, r))
    expect(routes).toContainEqual([
      'entry', 'passage', 'hollow', 'sanctuary', 'reliquary', 'fork', 'gate', 'exit',
    ])
    expect(routes).toContainEqual([
      'entry', 'passage', 'hollow', 'sanctuary', 'reliquary', 'fork', 'chain-vault', 'deep', 'gate', 'exit',
    ])
    expect(routes).toHaveLength(2)
  })

  it('lands the same rooms on every seed, while the library has one of each', () => {
    // Not a promise the architecture makes — it is a fact about a library with
    // no interchangeable pair in it yet. When there is one, this is the test
    // that says so, and it should be changed rather than deleted.
    const first = generateRun(SEEDS[0]!)
    for (const seed of SEEDS) {
      const map = generateRun(seed)
      expect(Object.values(map.nodes).map((n) => n.templateId)).toEqual(
        Object.values(first.nodes).map((n) => n.templateId),
      )
    }
  })

  it('leads only to rooms it holds, and reaches all of them', () => {
    for (const seed of SEEDS) {
      const map = generateRun(seed)
      for (const node of Object.values(map.nodes)) {
        for (const exit of node.exits) expect(map.nodes[exit.to], `${node.id} → ${exit.to}`).toBeDefined()
      }
      expect(reachableFrom(map, map.start).size).toBe(Object.keys(map.nodes).length)
    }
  })

  it('reaches the keeper and the way out from every branch', () => {
    const map = generateRun(7)
    const keeper = Object.values(map.nodes).find((n) => n.role === 'keeper')!
    const ending = Object.values(map.nodes).find((n) => ROOM_TEMPLATES[n.templateId]?.ending)!
    for (const id of reachableFrom(map, map.start)) {
      const onward = reachableFrom(map, id)
      if (id === ending.id) continue
      expect(onward.has(ending.id), `${id} cannot reach the way out`).toBe(true)
      if (id !== keeper.id) expect(onward.has(keeper.id), `${id} cannot reach the keeper`).toBe(true)
    }
  })

  it('rejoins the optional branch before the keeper', () => {
    const map = generateRun(7)
    const junction = Object.values(map.nodes).find((n) => n.role === 'junction')!
    expect(junction.exits).toHaveLength(2)
    const keeper = Object.values(map.nodes).find((n) => n.role === 'keeper')!
    for (const exit of junction.exits) {
      expect(reachableFrom(map, exit.to).has(keeper.id), `${exit.label} never rejoins`).toBe(true)
    }
    // And the long way really is longer.
    const routes = routesFrom(map, map.start)
    const lengths = routes.map((r) => r.length).sort((a, b) => a - b)
    expect(lengths[1]! - lengths[0]!).toBe(2)
  })

  it('satisfies every slot role with the room it chose', () => {
    for (const seed of SEEDS) {
      const map = generateRun(seed)
      for (const slot of DESCENT.nodes) {
        const node = map.nodes[slot.id]!
        const t = ROOM_TEMPLATES[node.templateId]!
        expect(t.role, `${slot.id} wanted a ${slot.role}`).toBe(slot.role)
        expect(t.territory).toBe(slot.territory)
        for (const tag of slot.requiredTags ?? []) expect(t.tags).toContain(tag)
      }
    }
  })

  it('gives every chosen room a topology it can carry', () => {
    for (const seed of SEEDS) {
      const map = generateRun(seed)
      for (const node of Object.values(map.nodes)) {
        const t = ROOM_TEMPLATES[node.templateId]!
        const entrances = Object.values(map.nodes).filter((n) => n.exits.some((e) => e.to === node.id)).length
        expect(
          fits(t, {
            role: node.role,
            territory: node.territory,
            depth: node.depth,
            entrances,
            exits: node.exits.length,
          }),
          `${node.id} (${t.id}) was given ${entrances} in and ${node.exits.length} out`,
        ).toBe(true)
      }
    }
  })

  it('puts no fight in art that cannot hold it', () => {
    for (const seed of SEEDS) {
      const map = generateRun(seed)
      const fights = Object.values(map.nodes).filter((n) => n.enemyId)
      expect(fights).toHaveLength(3)
      for (const node of fights) {
        const t = ROOM_TEMPLATES[node.templateId]!
        expect(t.encounterTags, `${t.id} holds a fight and declares nothing`).toBeDefined()
        expect(
          canHost(t, node.enemyId!),
          `${node.id} puts ${node.enemyId} in a ${t.composition} that cannot hold it`,
        ).toBe(true)
      }
      // And every room that was *not* given a fight is one that could not have
      // taken one — nothing was left empty that the art could have filled.
      for (const node of Object.values(map.nodes)) {
        if (node.enemyId) continue
        expect(ROOM_TEMPLATES[node.templateId]!.encounterTags, `${node.id} stands empty`).toBeUndefined()
      }
    }
  })

  it('reads as one descent through four territories', () => {
    expect(generateRun(1).territorySequence).toEqual(['threshold', 'ossuary', 'chapel', 'deep', 'threshold'])
  })

  it('passes both halves of its own validator', () => {
    for (const seed of SEEDS) expect(validateRun(generateRun(seed)), `seed ${seed}`).toEqual([])
  })
})

describe('what the validator catches', () => {
  const map = (): RunMap => structuredClone(generateRun(1)) as RunMap
  const codes = (m: RunMap): readonly string[] => validateRun(m).map((p) => p.code)

  it('a start that is not in the map', () => {
    const broken = { ...map(), start: 'nowhere' }
    expect(codes(broken)).toContain('no-start')
  })

  it('an edge that lands nowhere', () => {
    const broken = map()
    const first = broken.nodes[broken.start]!
    ;(broken.nodes as Record<string, typeof first>)[broken.start] = {
      ...first,
      exits: [{ ...first.exits[0]!, to: 'nowhere' }],
    }
    expect(codes(broken)).toContain('unknown-destination')
  })

  it('a node nobody can reach', () => {
    const broken = map()
    const orphan = { ...broken.nodes['n2']!, id: 'n99' }
    ;(broken.nodes as Record<string, typeof orphan>)['n99'] = orphan
    expect(codes(broken)).toContain('unreachable')
  })

  it('a node whose key and identity disagree', () => {
    const broken = map()
    const wrong = { ...broken.nodes['n2']!, id: 'not-n2' }
    ;(broken.nodes as Record<string, typeof wrong>)['n2'] = wrong
    expect(codes(broken)).toContain('node-id-mismatch')
  })

  it('more ways on than the art can carry', () => {
    const broken = map()
    const node = broken.nodes['n2']!
    ;(broken.nodes as Record<string, typeof node>)['n2'] = {
      ...node,
      exits: [...node.exits, { label: 'GO ON', to: 'n4', sense: 'The hall continues to a dark archway.' }],
    }
    expect(codes(broken)).toContain('exit-count')
  })

  it('a room standing in the wrong kind of slot', () => {
    const broken = map()
    const node = broken.nodes['n2']!
    ;(broken.nodes as Record<string, typeof node>)['n2'] = { ...node, role: 'keeper' }
    expect(codes(broken)).toContain('role-mismatch')
  })

  it('a fight in a picture that cannot hold it', () => {
    const broken = map()
    const node = broken.nodes['n3']!
    ;(broken.nodes as Record<string, typeof node>)['n3'] = { ...node, enemyId: 'warden' }
    expect(codes(broken)).toContain('encounter-incompatible')
  })

  it('a keeper with nothing fought before it', () => {
    // The junction leads straight past the first fight to the door.
    const broken = map()
    const entrance = broken.nodes[broken.start]!
    ;(broken.nodes as Record<string, typeof entrance>)[broken.start] = {
      ...entrance,
      exits: [{ label: 'STAIR', to: 'n9', sense: 'Shorter route to the door.' }],
    }
    expect(codes(broken)).toContain('keeper-unearned')
  })

  it('something leading back into the start', () => {
    const broken = map()
    const node = broken.nodes['n2']!
    ;(broken.nodes as Record<string, typeof node>)['n2'] = {
      ...node,
      exits: [{ label: 'GO ON', to: broken.start, sense: 'The hall continues to a dark archway.' }],
    }
    expect(codes(broken)).toContain('malformed-root')
  })

  it('a branch that never comes back', () => {
    const broken = map()
    const node = broken.nodes['n8']!
    ;(broken.nodes as Record<string, typeof node>)['n8'] = { ...node, exits: [] }
    expect(codes(broken)).toContain('branch-lost')
    expect(codes(broken)).toContain('dead-end')
  })

  it('and passes a map with none of that wrong with it', () => {
    expect(validateRunMap(map())).toEqual([])
    expect(validateDescent(map())).toEqual([])
  })
})

describe('adding to the library does not touch the map', () => {
  it('materialises any plan against the same resolver, with no room named in it', () => {
    // A two-room plan, invented here, filled by the same code path. It proves
    // the seam: changing the shape of a descent is editing a plan, and nothing
    // in `content/rooms.ts` has to know.
    const stub: RunPlan = {
      nodes: [
        { id: 'a', role: 'entrance', depth: 0, territory: 'threshold' },
        { id: 'b', role: 'exit', depth: 1, territory: 'threshold' },
      ],
      edges: [{ from: 'a', to: 'b', kind: 'forward', way: 'through' }],
    }
    const map = materializeRunPlan(stub, 5)
    expect(map.start).toBe('a')
    expect(map.nodes['a']!.templateId).toBe('entry')
    expect(map.nodes['b']!.templateId).toBe('exit')
    expect(map.nodes['a']!.exits).toEqual([{ label: 'THROUGH', to: 'b', sense: 'The door is open.' }])
    // It is a legal graph, and it is deliberately not a legal *descent* — no
    // fight, no keeper — which is exactly the split the two validators are.
    expect(validateRunMap(map)).toEqual([])
    expect(validateDescent(map).map((p) => p.code)).toContain('keeper-count')
  })
})
