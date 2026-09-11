/**
 * The dungeon director, and the maps it makes.
 *
 * Three things are being asserted now, and the third is new:
 *
 *   - the director is **deterministic**. A seed is a run, and a run is a map
 *     that survives a save; a director that could produce two answers for one
 *     seed would make a saved map a guess.
 *   - the plan and the library are **separable**. The plan says
 *     `encounter, ossuary, low` and names no room; the library says what a
 *     room is and names no destination. That is the refactor, and it is
 *     asserted here rather than described.
 *   - there are **three grammars**, the seed chooses, and every one of them
 *     resolves against the library on every seed. A grammar that asked for a room
 *     nobody wrote would be a run that fails at the press of START — which is the
 *     correct failure and exactly why it is walked here instead.
 *
 * All of it is pure and none of it touches a DOM.
 */

import { describe, expect, it } from 'vitest'

import { DESCENT, GRAMMARS, LONG_WAY, TITHE, WAYS } from '../../src/content/runPlans.js'
import type { RunPlan } from '../../src/content/runPlans.js'
import { ROOM_TEMPLATES } from '../../src/content/rooms.js'
import { TREASURE_DIE } from '../../src/content/dice.js'
import { canHost, fits, territoriesOf } from '../../src/content/roomResolver.js'
import { generateRun, generateRunPlan, materializeRunPlan } from '../../src/game/runGenerator.js'
import {
  cyclesIn,
  isSpine,
  offersIn,
  reachableFrom,
  routesFrom,
  validateDescent,
  validateRun,
  validateRunMap,
} from '../../src/game/mapValidation.js'
import type { RunMap } from '../../src/game/map.js'
import { seedFor } from './where.js'

const SEEDS = [0, 1, 2, 7, 42, 999, 2654435761]

/** What a route reads as, in authored rooms. */
const asRooms = (map: RunMap, route: readonly string[]): readonly string[] =>
  route.map((id) => map.nodes[id]!.templateId)

/** A seed per grammar, so a spec can say which descent it is walking. */
const PINNED = {
  descent: seedFor('descent'),
  'long-way': seedFor('long-way'),
  tithe: seedFor('tithe'),
} as const

describe('the plans, before any room is chosen', () => {
  for (const plan of GRAMMARS) {
    it(`${plan.id} names no authored room anywhere`, () => {
      // A plan is the drama and nothing else. Every id in it is a *slot*, and
      // the moment one of them is a room the director has started choosing
      // content and the library has stopped being the only place content lives.
      const rooms = new Set(Object.keys(ROOM_TEMPLATES))
      for (const slot of plan.nodes) expect(rooms.has(slot.id), `slot ${slot.id}`).toBe(false)
      for (const edge of plan.edges) {
        expect(rooms.has(edge.from), `edge from ${edge.from}`).toBe(false)
        expect(rooms.has(edge.to), `edge to ${edge.to}`).toBe(false)
      }
    })

    it(`${plan.id} says only what kind of moment each slot is`, () => {
      // No art, no prose, no fight, no machinery. A slot that carried any of
      // those would be a room written in the wrong file. `placements` is allowed
      // and is not content: it says *the director stands something here*, and
      // what that something is stays in `content/dice.ts`.
      const allowed = new Set([
        'id',
        'role',
        'depth',
        'threat',
        'territory',
        'requiredTags',
        'forbiddenTags',
        'placements',
      ])
      for (const slot of plan.nodes) {
        expect(slot.role.length).toBeGreaterThan(0)
        expect(slot.territory, `${slot.id} does not say where it is`).toBeDefined()
        for (const key of Object.keys(slot)) expect([...allowed], `${slot.id}.${key}`).toContain(key)
      }
    })

    it(`${plan.id} gives every edge a line somebody wrote`, () => {
      for (const edge of plan.edges) {
        expect(WAYS[edge.way], `${edge.from} → ${edge.to} names an unwritten way`).toBeDefined()
      }
    })

    it(`${plan.id} names two treasure candidates, and both are real slots`, () => {
      const ids = new Set(plan.nodes.map((s) => s.id))
      expect(plan.treasureCandidates).toHaveLength(2)
      expect(plan.treasureCandidates[0]).not.toBe(plan.treasureCandidates[1])
      for (const id of plan.treasureCandidates) expect(ids.has(id), id).toBe(true)
    })
  }

  it('chooses among the three by seed, and only among the three', () => {
    const ids = new Set(GRAMMARS.map((g) => g.id))
    const seen = new Set<string>()
    for (let seed = 0; seed < 200; seed++) {
      const plan = generateRunPlan(seed)
      expect(ids.has(plan.id), plan.id).toBe(true)
      seen.add(plan.id)
    }
    // All three are actually reachable. A grammar the seed can never pick is a
    // grammar nobody plays, which would be worse than not having written it.
    expect([...seen].sort()).toEqual([...ids].sort())
  })

  it('is the same grammar for the same seed, every time', () => {
    for (const seed of SEEDS) expect(generateRunPlan(seed).id).toBe(generateRunPlan(seed).id)
  })

  it('resolves every grammar against the library on two hundred seeds', () => {
    // **The content test this wave exists to be able to pass.** Three grammars
    // and one library: a slot that asks for a room nobody wrote is a loud throw
    // at the press of START, so the only honest check is to press it, for every
    // grammar, on enough seeds that a rare resolution is not missed.
    for (const plan of GRAMMARS) {
      for (let seed = 1; seed <= 200; seed++) {
        expect(() => materializeRunPlan(plan, seed), `${plan.id} on seed ${seed}`).not.toThrow()
      }
    }
  })
})

describe('the maps it materialises', () => {
  it('is deeply equal for the same seed, every time', () => {
    for (const seed of SEEDS) {
      expect(generateRun(seed)).toEqual(generateRun(seed))
      expect(JSON.stringify(generateRun(seed))).toBe(JSON.stringify(generateRun(seed)))
    }
  })

  it('reads as the descent, on a seed that produces it', () => {
    // The Cleft crosses the Split, so DESCENT is one of four reels — and since
    // this wave both legs of the Split carry a room of their own, which is the
    // amendment: the short way now has a certain thing in it too.
    const map = generateRun(PINNED.descent)
    const routes = routesFrom(map, map.start).map((r) => asRooms(map, r))
    const spine = ['confluence', 'sanctuary', 'reliquary', 'fork']
    expect(routes).toContainEqual(['entry', 'passage', 'cleft', 'hollow', ...spine, 'niche', 'gate', 'exit'])
    expect(routes).toContainEqual(['entry', 'passage', 'cleft', 'offertory', ...spine, 'niche', 'gate', 'exit'])
    expect(routes).toContainEqual([
      'entry', 'passage', 'cleft', 'hollow', ...spine, 'chain-vault', 'niche', 'deep', 'gate', 'exit',
    ])
    expect(routes).toHaveLength(4)
  })

  it('reads as the long way, with the Font first and the Carver late', () => {
    const map = generateRun(PINNED['long-way'])
    const routes = routesFrom(map, map.start).map((r) => asRooms(map, r))
    expect(routes).toHaveLength(4)
    for (const route of routes) {
      // The Font is before either fight, which is the inversion the grammar is.
      expect(route.indexOf('sanctuary')).toBeLessThan(route.indexOf('carver'))
      expect(route).toContain('carver')
    }
  })

  it('reads as the tithe, with no Font anywhere in it', () => {
    const map = generateRun(PINNED.tithe)
    const routes = routesFrom(map, map.start).map((r) => asRooms(map, r))
    expect(routes).toHaveLength(4)
    for (const route of routes) expect(route).not.toContain('sanctuary')
    // And the Carver is on one branch of the first fork, opposite the Gnawing.
    expect(routes.some((r) => r.includes('carver'))).toBe(true)
    expect(routes.some((r) => r.includes('hollow'))).toBe(true)
  })

  it('is acyclic on every grammar. This wave forbids the loop, and asserts it', () => {
    for (const seed of SEEDS) expect(cyclesIn(generateRun(seed))).toEqual([])
  })

  it('seats every way out on a place in the picture', () => {
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
    for (const seed of SEEDS) {
      const map = generateRun(seed)
      for (const node of Object.values(map.nodes)) {
        const anchors = ROOM_TEMPLATES[node.templateId]!.exitAnchors ?? []
        node.exits.forEach((exit, index) => {
          expect(exit.at, `${node.id} way ${index}`).toEqual(anchors[index]!.at)
        })
      }
    }
  })

  it('lands the same rooms for the same grammar on every seed', () => {
    // Not a promise the architecture makes — it is a fact about a library with
    // no interchangeable pair in it yet. When there is one, this is the test
    // that says so, and it should be changed rather than deleted.
    for (const plan of GRAMMARS) {
      const first = materializeRunPlan(plan, 1)
      for (let seed = 1; seed < 12; seed++) {
        const map = materializeRunPlan(plan, seed)
        expect(Object.values(map.nodes).map((n) => n.templateId), `${plan.id}/${seed}`).toEqual(
          Object.values(first.nodes).map((n) => n.templateId),
        )
      }
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
    for (const seed of SEEDS) {
      const map = generateRun(seed)
      const keeper = Object.values(map.nodes).find((n) => n.role === 'keeper')!
      const ending = Object.values(map.nodes).find((n) => ROOM_TEMPLATES[n.templateId]?.ending)!
      for (const id of reachableFrom(map, map.start)) {
        const onward = reachableFrom(map, id)
        if (id === ending.id) continue
        expect(onward.has(ending.id), `${id} cannot reach the way out`).toBe(true)
        if (id !== keeper.id) expect(onward.has(keeper.id), `${id} cannot reach the keeper`).toBe(true)
      }
    }
  })

  it('rejoins every branch before the keeper', () => {
    for (const seed of SEEDS) {
      const map = generateRun(seed)
      const junctions = Object.values(map.nodes).filter((n) => n.role === 'junction')
      expect(junctions).toHaveLength(2)
      const keeper = Object.values(map.nodes).find((n) => n.role === 'keeper')!
      for (const junction of junctions) {
        expect(junction.exits).toHaveLength(2)
        for (const exit of junction.exits) {
          expect(reachableFrom(map, exit.to).has(keeper.id), `${exit.label} never rejoins`).toBe(true)
        }
      }
    }
  })

  it('brings the two branches of the first fork back into one room', () => {
    for (const seed of SEEDS) {
      const map = generateRun(seed)
      const meeting = Object.values(map.nodes).find((n) => n.templateId === 'confluence')!
      const into = Object.values(map.nodes).filter((n) => n.exits.some((e) => e.to === meeting.id))
      expect(into).toHaveLength(2)
      expect(ROOM_TEMPLATES['confluence']!.topology.minEntrances).toBe(2)
    }
  })

  it('satisfies every slot role with the room it chose', () => {
    for (const plan of GRAMMARS) {
      for (let seed = 1; seed < 8; seed++) {
        const map = materializeRunPlan(plan, seed)
        for (const slot of plan.nodes) {
          const node = map.nodes[slot.id]!
          const t = ROOM_TEMPLATES[node.templateId]!
          expect(t.role, `${slot.id} wanted a ${slot.role}`).toBe(slot.role)
          // **Membership, not equality.** A template that honestly reads in two
          // stretches of the descent may stand in either, and the node records
          // the one the slot asked for.
          expect(territoriesOf(t), `${slot.id} in ${slot.territory}`).toContain(slot.territory!)
          expect(node.territory).toBe(slot.territory)
          for (const tag of slot.requiredTags ?? []) expect(t.tags).toContain(tag)
        }
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
      for (const node of Object.values(map.nodes)) {
        if (node.enemyId) continue
        expect(ROOM_TEMPLATES[node.templateId]!.encounterTags, `${node.id} stands empty`).toBeUndefined()
      }
    }
  })

  it('reads as one descent through the territories its grammar declared', () => {
    expect(generateRun(PINNED.descent).territorySequence).toEqual([
      'threshold', 'ossuary', 'chapel', 'threshold', 'deep', 'threshold',
    ])
    expect(generateRun(PINNED.tithe).territorySequence).toEqual([
      'threshold', 'ossuary', 'chapel', 'threshold', 'deep', 'threshold',
    ])
    // The long way goes back out into the ossuary for its fights, which is a fact
    // about that grammar rather than about the game.
    expect(generateRun(PINNED['long-way']).territorySequence).toEqual([
      'threshold', 'ossuary', 'chapel', 'ossuary', 'chapel', 'deep', 'threshold',
    ])
  })

  it('passes both halves of its own validator, on every grammar', () => {
    for (const plan of GRAMMARS) {
      for (let seed = 1; seed <= 60; seed++) {
        expect(validateRun(materializeRunPlan(plan, seed)), `${plan.id} seed ${seed}`).toEqual([])
      }
    }
  })
})

describe('placements, and the treasure', () => {
  it('seats every placed die on a seat its picture declares', () => {
    for (const seed of SEEDS) {
      const map = generateRun(seed)
      for (const node of Object.values(map.nodes)) {
        const seats = new Set((ROOM_TEMPLATES[node.templateId]!.spareSeats ?? []).map((s) => s.id))
        for (const offer of node.dice ?? []) {
          expect(seats.has(offer.seat), `${node.id} seats ${offer.die} on ${offer.seat}`).toBe(true)
          expect(offer.at).toEqual(
            ROOM_TEMPLATES[node.templateId]!.spareSeats!.find((s) => s.id === offer.seat)!.at,
          )
        }
        expect((node.dice ?? []).length).toBeLessThanOrEqual(seats.size)
      }
    }
  })

  it('cuts a carving only where the picture has somewhere to cut one', () => {
    for (const seed of SEEDS) {
      const map = generateRun(seed)
      for (const node of Object.values(map.nodes)) {
        if ((node.carvings ?? []).length === 0) continue
        expect(ROOM_TEMPLATES[node.templateId]!.carvingAt, `${node.id}`).toBeDefined()
      }
    }
  })

  it('spends no seat on a carving', () => {
    // Prose, and nothing else. A hint that took a seat would be a hint competing
    // with the thing it hints at for a place in the picture.
    for (const plan of GRAMMARS) {
      const map = materializeRunPlan(plan, 1)
      for (const slot of plan.nodes) {
        const hints = (slot.placements ?? []).filter((p) => p === 'hint-carving').length
        if (hints === 0) continue
        const node = map.nodes[slot.id]!
        expect(node.carvings).toHaveLength(hints)
        expect(node.dice ?? []).toHaveLength(0)
      }
    }
  })

  it('holds exactly one treasure per run, on every grammar and every seed', () => {
    for (const plan of GRAMMARS) {
      for (let seed = 1; seed <= 60; seed++) {
        const map = materializeRunPlan(plan, seed)
        const hoards = offersIn(map, 'treasure')
        expect(hoards, `${plan.id} seed ${seed}`).toHaveLength(1)
        expect(map.nodes[hoards[0]!]!.dice![0]!.die).toBe(TREASURE_DIE)
        // Unpriced. Its price is the road to it.
        expect(map.nodes[hoards[0]!]!.dice![0]!.price).toBeUndefined()
      }
    }
  })

  it('puts the treasure on one candidate and a bargain on the other', () => {
    for (const plan of GRAMMARS) {
      const seen = new Set<string>()
      for (let seed = 1; seed <= 60; seed++) {
        const map = materializeRunPlan(plan, seed)
        const [first, second] = plan.treasureCandidates
        const kinds = [first, second].map((id) => map.nodes[id]!.dice![0]!.kind)
        expect(kinds.filter((k) => k === 'treasure')).toHaveLength(1)
        expect(kinds.filter((k) => k === 'bargain')).toHaveLength(1)
        seen.add(offersIn(map, 'treasure')[0]!)
      }
      // Both candidates are actually used across seeds, or "either branch" is a
      // claim the generator does not keep.
      expect([...seen].sort()).toEqual([...plan.treasureCandidates].sort())
    }
  })

  it('puts the two candidates on different branches of a fork', () => {
    for (const plan of GRAMMARS) {
      const map = materializeRunPlan(plan, 1)
      const [first, second] = plan.treasureCandidates
      const routes = routesFrom(map, map.start)
      // No route passes both: they are on different legs of the same decision, so
      // whichever is the treasure, one run can only reach one of them.
      expect(routes.some((r) => r.includes(first) && r.includes(second)), plan.id).toBe(false)
      for (const id of [first, second]) {
        expect(routes.some((r) => r.includes(id)), `${plan.id}: nothing reaches ${id}`).toBe(true)
      }
    }
  })

  it('never puts the treasure on a spine', () => {
    // A thing every route passes is a step, not a treasure. The hints say
    // somebody came down here for it; a guaranteed pickup would make them a lie.
    for (const plan of GRAMMARS) {
      for (let seed = 1; seed <= 60; seed++) {
        const map = materializeRunPlan(plan, seed)
        for (const id of offersIn(map, 'treasure')) {
          expect(isSpine(map, id), `${plan.id} seed ${seed}: ${id}`).toBe(false)
        }
      }
    }
  })

  it('never offers the treasure die for sale, anywhere', () => {
    for (const plan of GRAMMARS) {
      for (let seed = 1; seed <= 60; seed++) {
        const map = materializeRunPlan(plan, seed)
        for (const node of Object.values(map.nodes)) {
          for (const offer of node.dice ?? []) {
            if (offer.kind === 'treasure') continue
            expect(offer.die, `${plan.id} seed ${seed} at ${node.id}`).not.toBe(TREASURE_DIE)
            expect(offer.price, `${node.id} sells something unpriced`).toBeDefined()
          }
        }
      }
    }
  })

  it("never puts the same die twice on one carver's table", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const map = materializeRunPlan(LONG_WAY, seed)
      for (const node of Object.values(map.nodes)) {
        const carved = (node.dice ?? []).filter((d) => d.kind === 'carver')
        if (carved.length < 2) continue
        expect(new Set(carved.map((d) => d.die)).size).toBe(carved.length)
      }
    }
  })
})

describe('what the validator catches', () => {
  // Pinned to the descent, so the node ids below are the ones that grammar has.
  const map = (): RunMap => structuredClone(materializeRunPlan(DESCENT, 1)) as RunMap
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

  it('a room standing in a territory its picture does not belong in', () => {
    const broken = map()
    const node = broken.nodes['a1']!
    ;(broken.nodes as Record<string, typeof node>)['a1'] = { ...node, territory: 'deep' }
    expect(codes(broken)).toContain('territory-mismatch')
  })

  it('a fight in a picture that cannot hold it', () => {
    const broken = map()
    const node = broken.nodes['a3']!
    ;(broken.nodes as Record<string, typeof node>)['a3'] = { ...node, enemyId: 'warden' }
    expect(codes(broken)).toContain('encounter-incompatible')
  })

  it('a die seated where the picture has no seat', () => {
    const broken = map()
    const node = broken.nodes['a1']!
    ;(broken.nodes as Record<string, typeof node>)['a1'] = {
      ...node,
      dice: [{ die: 'jawbone', price: 3, kind: 'bargain', seat: 'nowhere', at: { x: 0.5, y: 0.5 } }],
    }
    expect(codes(broken)).toContain('unseated-placement')
  })

  it('a carving cut into a picture with no wall for one', () => {
    const broken = map()
    const node = broken.nodes['a5']!
    ;(broken.nodes as Record<string, typeof node>)['a5'] = { ...node, carvings: ['a hand'] }
    expect(codes(broken)).toContain('uncarvable')
  })

  it('a run with no treasure in it, and a run with two', () => {
    const none = map()
    for (const id of offersIn(none, 'treasure')) {
      const node = none.nodes[id]!
      ;(none.nodes as Record<string, typeof node>)[id] = { ...node, dice: [] }
    }
    expect(codes(none)).toContain('treasure-count')

    const two = map()
    const here = offersIn(two, 'treasure')[0]!
    const other = two.nodes['a8s']!.id === here ? 'a8n' : 'a8s'
    const node = two.nodes[other]!
    ;(two.nodes as Record<string, typeof node>)[other] = {
      ...node,
      dice: [{ ...node.dice![0]!, kind: 'treasure' }],
    }
    expect(codes(two)).toContain('treasure-count')
  })

  it('a treasure every route has to walk past', () => {
    const broken = map()
    const here = offersIn(broken, 'treasure')[0]!
    const spine = broken.nodes['a5']!
    ;(broken.nodes as Record<string, typeof spine>)['a5'] = {
      ...spine,
      dice: [{ ...broken.nodes[here]!.dice![0]!, seat: 'nowhere' }],
    }
    expect(codes(broken)).toContain('treasure-on-a-spine')
  })

  it('a keeper the run walked to having paid nothing', () => {
    // **Re-based twice.** It used to say *no fight before it*; the reel wave
    // widened it to an encounter or a toll, and this wave widened it again to
    // include an exchange — see `mapValidation.ts` for why that is a deliberate
    // weakening rather than a slip.
    const broken = map()
    const entrance = broken.nodes[broken.start]!
    const stair = broken.nodes['a7']!.exits.find((e) => e.label === 'STAIR')!
    ;(broken.nodes as Record<string, typeof entrance>)[broken.start] = {
      ...entrance,
      exits: [{ ...stair, at: entrance.exits[0]!.at! }],
    }
    expect(codes(broken)).toContain('keeper-unearned')
  })

  it('a keeper the run reached with nothing it could have changed', () => {
    const broken = map()
    // Every room on every route that could have changed what the run carries:
    // the Font, the Reliquary, and the two alcoves on the legs of the Split.
    for (const id of ['a5', 'a6', 'a8s', 'a8n']) {
      const node = broken.nodes[id]!
      ;(broken.nodes as Record<string, typeof node>)[id] = { ...node, role: 'transition' }
    }
    expect(codes(broken)).toContain('no-reprieve')
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
      id: 'stub',
      nodes: [
        { id: 'a', role: 'entrance', depth: 0, territory: 'threshold' },
        { id: 'b', role: 'exit', depth: 1, territory: 'threshold' },
      ],
      edges: [{ from: 'a', to: 'b', kind: 'forward', way: 'through' }],
      treasureCandidates: ['a', 'b'],
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
    // fight, no keeper, no treasure — which is exactly the split the two
    // validators are.
    expect(validateRunMap(map)).toEqual([])
    const problems = validateDescent(map).map((p) => p.code)
    expect(problems).toContain('keeper-count')
  })

  it('keeps the three grammars in a stable order', () => {
    expect(GRAMMARS.map((g) => g.id)).toEqual(['descent', 'long-way', 'tithe'])
    expect(GRAMMARS).toEqual([DESCENT, LONG_WAY, TITHE])
  })
})
