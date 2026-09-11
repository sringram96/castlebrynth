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
import { cyclesIn, reachableFrom, routesFrom, validateDescent, validateRun, validateRunMap } from '../../src/game/mapValidation.js'
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

  it('is a forked reel: two decision points and four routes through it', () => {
    // The Cleft crosses the Split, so a run is one of four reels. Every one of
    // them passes the Confluence, the Font and the Reliquary, and every one of
    // them ends at the door.
    const map = generateRun(1)
    const routes = routesFrom(map, map.start).map((r) => asRooms(map, r))
    const spine = ['confluence', 'sanctuary', 'reliquary', 'fork']
    expect(routes).toContainEqual(['entry', 'passage', 'cleft', 'hollow', ...spine, 'gate', 'exit'])
    expect(routes).toContainEqual(['entry', 'passage', 'cleft', 'offertory', ...spine, 'gate', 'exit'])
    expect(routes).toContainEqual(
      ['entry', 'passage', 'cleft', 'hollow', ...spine, 'chain-vault', 'deep', 'gate', 'exit'],
    )
    expect(routes).toContainEqual(
      ['entry', 'passage', 'cleft', 'offertory', ...spine, 'chain-vault', 'deep', 'gate', 'exit'],
    )
    expect(routes).toHaveLength(4)
  })

  it('is acyclic. This wave forbids the loop, and asserts it', () => {
    // Forward only. The maze feeling is seeing the mouth of a road you cannot
    // take, not walking back up one. Written as one assertion so that a loop
    // wave repeals it rather than re-litigating the validator.
    for (const seed of SEEDS) expect(cyclesIn(generateRun(seed))).toEqual([])
  })

  it('seats every way out on a place in the picture', () => {
    // Movement moved into the room. A way with no anchor is a button on a wall.
    for (const seed of SEEDS) {
      const map = generateRun(seed)
      for (const node of Object.values(map.nodes)) {
        for (const exit of node.exits) {
          expect(exit.at, `${node.id} → ${exit.to} stands nowhere`).toBeDefined()
        }
      }
    }
  })

  it('binds the edges to the anchors in declaration order', () => {
    // The map's contract with the picture: first edge, first anchor. It is the
    // same law that already made the first edge out of a junction the primary
    // one, and it is why the Split states the stair before the deep.
    const map = generateRun(1)
    for (const node of Object.values(map.nodes)) {
      const anchors = ROOM_TEMPLATES[node.templateId]!.exitAnchors ?? []
      node.exits.forEach((exit, index) => {
        expect(exit.at, `${node.id} way ${index}`).toEqual(anchors[index]!.at)
      })
    }
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

  it('rejoins every branch before the keeper', () => {
    const map = generateRun(7)
    const junctions = Object.values(map.nodes).filter((n) => n.role === 'junction')
    expect(junctions).toHaveLength(2)
    const keeper = Object.values(map.nodes).find((n) => n.role === 'keeper')!
    for (const junction of junctions) {
      expect(junction.exits).toHaveLength(2)
      for (const exit of junction.exits) {
        expect(reachableFrom(map, exit.to).has(keeper.id), `${exit.label} never rejoins`).toBe(true)
      }
    }
    // And the Split's long way really is longer: the Cleft's two branches are
    // the same length as each other, so the only spread in route length is the
    // deep detour's extra two rooms.
    const routes = routesFrom(map, map.start)
    const lengths = [...new Set(routes.map((r) => r.length))].sort((a, b) => a - b)
    expect(lengths).toHaveLength(2)
    expect(lengths[1]! - lengths[0]!).toBe(2)
  })

  it('brings the two branches of the Cleft back into one room', () => {
    // A 2-in room, which is a fact about the picture rather than about the
    // plan: only a template whose topology claims two entrances can stand here,
    // and `validateRunMap` is what says so.
    const map = generateRun(1)
    const meeting = Object.values(map.nodes).find((n) => n.templateId === 'confluence')!
    const into = Object.values(map.nodes).filter((n) => n.exits.some((e) => e.to === meeting.id))
    expect(into).toHaveLength(2)
    expect(ROOM_TEMPLATES['confluence']!.topology.minEntrances).toBe(2)
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
    const orphan = { ...broken.nodes['a1']!, id: 'a99' }
    ;(broken.nodes as Record<string, typeof orphan>)['a99'] = orphan
    expect(codes(broken)).toContain('unreachable')
  })

  it('a node whose key and identity disagree', () => {
    const broken = map()
    const wrong = { ...broken.nodes['a1']!, id: 'not-a1' }
    ;(broken.nodes as Record<string, typeof wrong>)['a1'] = wrong
    expect(codes(broken)).toContain('node-id-mismatch')
  })

  it('more ways on than the art can carry', () => {
    const broken = map()
    const node = broken.nodes['a1']!
    ;(broken.nodes as Record<string, typeof node>)['a1'] = {
      ...node,
      exits: [...node.exits, { ...node.exits[0]!, to: 'a4' }],
    }
    expect(codes(broken)).toContain('exit-count')
  })

  it('a corridor that forks', () => {
    // Several `forward` ways out is the shape of a decision, and a decision
    // belongs in a room painted as one.
    const broken = map()
    const node = broken.nodes['a1']!
    ;(broken.nodes as Record<string, typeof node>)['a1'] = {
      ...node,
      exits: [...node.exits, { ...node.exits[0]!, to: 'a4' }],
    }
    expect(codes(broken)).toContain('forked-corridor')
  })

  it('a way out with nowhere in the picture to stand', () => {
    const broken = map()
    const node = broken.nodes['a1']!
    const { at: _gone, ...unanchored } = node.exits[0]!
    ;(broken.nodes as Record<string, typeof node>)['a1'] = { ...node, exits: [unanchored] }
    expect(codes(broken)).toContain('unanchored-exit')
  })

  it('a cycle', () => {
    // This wave's law. A loop wave deletes this test and the assertion behind
    // it; until then a descent that folds back on itself fails at START.
    const broken = map()
    const node = broken.nodes['a5']!
    ;(broken.nodes as Record<string, typeof node>)['a5'] = {
      ...node,
      exits: [{ ...node.exits[0]!, to: 'a4' }],
    }
    expect(codes(broken)).toContain('cycle')
  })

  it('a room standing in the wrong kind of slot', () => {
    const broken = map()
    const node = broken.nodes['a1']!
    ;(broken.nodes as Record<string, typeof node>)['a1'] = { ...node, role: 'keeper' }
    expect(codes(broken)).toContain('role-mismatch')
  })

  it('a fight in a picture that cannot hold it', () => {
    const broken = map()
    const node = broken.nodes['a3']!
    ;(broken.nodes as Record<string, typeof node>)['a3'] = { ...node, enemyId: 'warden' }
    expect(codes(broken)).toContain('encounter-incompatible')
  })

  it('a keeper the run walked to having paid nothing', () => {
    // The entrance leads straight past both branches to the door.
    //
    // **Re-based by the reel wave**: it used to say *no fight before it*, which
    // stopped being the rule the moment the right-hand branch traded the
    // Gnawing for a toll. What it protects is that the run paid something.
    const broken = map()
    const entrance = broken.nodes[broken.start]!
    const stair = broken.nodes['a7']!.exits.find((e) => e.label === 'STAIR')!
    ;(broken.nodes as Record<string, typeof entrance>)[broken.start] = {
      ...entrance,
      exits: [{ ...stair, at: entrance.exits[0]!.at! }],
    }
    expect(codes(broken)).toContain('keeper-unearned')
  })

  it('something leading back into the start', () => {
    const broken = map()
    const node = broken.nodes['a1']!
    ;(broken.nodes as Record<string, typeof node>)['a1'] = {
      ...node,
      exits: [{ ...node.exits[0]!, to: broken.start }],
    }
    expect(codes(broken)).toContain('malformed-root')
  })

  it('a branch that never comes back', () => {
    const broken = map()
    const node = broken.nodes['a8b']!
    ;(broken.nodes as Record<string, typeof node>)['a8b'] = { ...node, exits: [] }
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
    expect(map.nodes['a']!.exits).toEqual([
      {
        label: 'THROUGH',
        to: 'b',
        sense: 'The door is open.',
        kind: 'forward',
        at: ROOM_TEMPLATES['entry']!.exitAnchors![0]!.at,
      },
    ])
    // It is a legal graph, and it is deliberately not a legal *descent* — no
    // fight, no keeper — which is exactly the split the two validators are.
    expect(validateRunMap(map)).toEqual([])
    expect(validateDescent(map).map((p) => p.code)).toContain('keeper-count')
  })
})
