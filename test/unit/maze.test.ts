import { describe, expect, it } from 'vitest'
import { AREAS } from '../../src/content/areas.js'
import { discovery } from '../../src/game/discovery.js'
import { exitUnlocked, ritualIn, roomAt } from '../../src/game/map.js'
import type { RunMap } from '../../src/game/map.js'
import { generateMaze } from '../../src/game/mazeGenerator.js'
import { validateRun } from '../../src/game/mapValidation.js'
import { reduce } from '../../src/game/reducer.js'
import { load, save } from '../../src/game/save.js'
import { firstEntryToTerritory } from '../../src/game/strip.js'
import { TITLE } from '../../src/game/state.js'
import type { GameState, RunState } from '../../src/game/state.js'
import { simulateFight } from '../balance/simulate.js'

const start = (seed = 1): GameState => reduce(TITLE, { type: 'START_RUN', seed })
const stand = (state: GameState, roomId: string): GameState => ({ ...state,
  run: { ...state.run!, roomId, path: [...state.run!.path, roomId] } })
function storage(): Storage {
  const values = new Map<string, string>()
  return { get length() { return values.size }, clear: () => values.clear(),
    getItem: key => values.get(key) ?? null, key: i => [...values.keys()][i] ?? null,
    removeItem: key => { values.delete(key) }, setItem: (key,value) => { values.set(key,value) } }
}

function route(run: RunState, target: string): readonly string[] {
  const queue = [[run.roomId]], seen = new Set<string>()
  for (let i = 0; i < queue.length; i++) {
    const path = queue[i]!, id = path.at(-1)!
    if (id === target) return path.slice(1)
    if (seen.has(id)) continue
    seen.add(id)
    const node = run.map.nodes[id]!
    if (node.enemyId && !run.cleared.includes(id)) continue
    for (const exit of node.exits) if (!seen.has(exit.to) && exitUnlocked(run,exit)) queue.push([...path,exit.to])
  }
  throw new Error(`no legal path from ${run.roomId} to ${target}`)
}
function walk(state: GameState, target: string): GameState {
  for (const to of route(state.run!, target)) {
    state = reduce(state, { type: 'GO', to })
    expect(state.run!.roomId).toBe(to)
  }
  return state
}

describe('the generated maze', () => {
  it('is the default new run; the authored reels remain explicit fixtures', () => {
    expect(start().run!.map.layout).toBe('maze')
    expect(reduce(TITLE,{ type:'START_RUN', seed:1, layout:'classic' }).run!.map.layout).toBeUndefined()
  })
  it('replays a seed exactly and produces genuinely different edge layouts', () => {
    const signatures = new Set<string>()
    for (let seed = 1; seed <= 128; seed++) {
      const map = generateMaze(seed)
      expect(map).toEqual(generateMaze(seed))
      expect(validateRun(map), `seed ${seed}`).toEqual([])
      expect(Object.keys(map.nodes)).toHaveLength(32)
      signatures.add(JSON.stringify(Object.values(map.nodes).map(n=>[n.id,n.exits.map(e=>e.to)])))
    }
    expect(signatures.size).toBeGreaterThan(120)
  })
  it('has a real undirected loop and one boss and key in each section', () => {
    const map = generateMaze(29)
    for (const area of AREAS) {
      const cells = Object.values(map.nodes).filter(n=>n.area===area.id && n.position!.y>=0 && n.position!.y<3)
      const ids = new Set(cells.map(n=>n.id))
      expect(cells.reduce((n,c)=>n+c.exits.filter(e=>ids.has(e.to)).length,0)/2).toBe(8+area.loops)
      expect(Object.values(map.nodes).filter(n=>n.area===area.id && n.sectionBoss)).toHaveLength(1)
      expect(Object.values(map.nodes).filter(n=>n.key===area.key)).toHaveLength(1)
    }
  })
  it('rejects keys moved behind their own lock', () => {
    const map=generateMaze(3), keyRoom=Object.values(map.nodes).find(n=>n.key==='bone-key')!
    const { key: _key, ...withoutKey }=keyRoom
    const bad: RunMap={...map,nodes:{...map.nodes,[keyRoom.id]:withoutKey,
      'ossuary:keeper':{...map.nodes['ossuary:keeper']!,key:'bone-key'}}}
    expect(validateRun(bad).map(p=>p.code)).toContain('maze-key-deadlock')
  })
})

describe('keys, revisits, and persistence', () => {
  it('requires a real pickup, refuses duplicate takes, and retains the key on return', () => {
    let state=start(17)
    const run=state.run!, keyRoom=Object.values(run.map.nodes).find(n=>n.key==='bone-key')!
    const gate=Object.values(run.map.nodes).find(n=>n.exits.some(e=>e.to==='ossuary:keeper' && e.requiresKey))!
    expect(reduce(state,{type:'TAKE_KEY'})).toBe(state)
    state=walk(state,gate.id)
    expect(reduce(state,{type:'GO',to:'ossuary:keeper'})).toBe(state)
    state=walk(state,keyRoom.id)
    const hand=state.run!.hand, bones=state.run!.bones
    state=reduce(state,{type:'TAKE_KEY'})
    expect(state.run!.keys).toEqual(['bone-key'])
    expect(state.run!.hand).toEqual(hand);expect(state.run!.bones).toBe(bones)
    expect(reduce(state,{type:'TAKE_KEY'})).toBe(state)
    state=walk(state,gate.id);state=reduce(state,{type:'GO',to:'ossuary:keeper'})
    expect(state.run!.roomId).toBe('ossuary:keeper')
    expect(reduce(state,{type:'GO',to:gate.id})).toBe(state) // keeper still alive
    state=simulateFight(state,'heuristic').state
    expect(state.mode).toBe('explore')
    const loot=state.run!.loot
    state=walk(state,keyRoom.id);state=walk(state,'ossuary:keeper')
    expect(reduce(state,{type:'FIGHT'})).toBe(state)
    expect(state.run!.loot).toEqual(loot)
    expect(state.run!.keys).toEqual(['bone-key'])
    const disk=storage();save(state,disk)
    const continued=reduce(load(disk).state,{type:'CONTINUE'})
    expect(continued.run).toEqual(state.run)
  })
  it('stores separate font results and cannot heal again after another font or a reload', () => {
    let state=start(5)
    const fonts=Object.values(state.run!.map.nodes).filter(n=>roomAt(state.run!,n.id).ritual)
    state={...state,run:{...state.run!,bones:5}}
    state=stand(state,fonts[0]!.id);state=reduce(state,{type:'RITUAL_ROLL'})
    const first=ritualIn(state.run!)
    state=stand(state,fonts[1]!.id);state=reduce(state,{type:'RITUAL_ROLL'})
    state=stand(state,fonts[0]!.id)
    expect(ritualIn(state.run!)).toEqual(first)
    expect(reduce(state,{type:'RITUAL_ROLL'})).toBe(state)
    const disk=storage();save(state,disk);state=reduce(load(disk).state,{type:'CONTINUE'})
    expect(reduce(state,{type:'RITUAL_ROLL'})).toBe(state)
  })
  it('leaves a fresh font usable later and prevents repeat core-die purchases', () => {
    let state=start(1)
    const font=Object.values(state.run!.map.nodes).find(n=>n.area==='ossuary' && roomAt(state.run!,n.id).ritual)!
    state=walk(state,font.id)
    state=reduce(state,{type:'GO',to:font.exits[0]!.to})
    expect(state.run!.roomId).not.toBe(font.id)
    expect(ritualIn(state.run!,font.id)).toBeUndefined()
    const cache=Object.values(state.run!.map.nodes).find(n=>n.area==='ossuary' && n.dice?.length)!
    state=walk(state,cache.id);state=reduce(state,{type:'CLAIM_DIE',index:0,slot:0})
    const paid=state.run!.bones
    state=reduce(state,{type:'GO',to:cache.exits[0]!.to});state=walk(state,cache.id)
    expect(reduce(state,{type:'CLAIM_DIE',index:0,slot:1})).toBe(state)
    expect(state.run!.bones).toBe(paid);expect(state.run!.hand).toHaveLength(6)
  })
  it('rejects malformed new progression state without booting into a broken map', () => {
    const disk=storage(), state=start(4)
    disk.setItem('castlebrynth',JSON.stringify({...state,run:{...state.run,keys:['not-a-key']}}))
    expect(load(disk).discarded).toBe('corrupt')
    disk.setItem('castlebrynth',JSON.stringify({...state,run:{...state.run,rituals:{stair:null}}}))
    expect(load(disk).discarded).toBe('corrupt')
  })
})

describe('the discovered map', () => {
  it('hides room names and objects beyond explored rooms, and deduplicates revisits', () => {
    let state=start(10)
    const initial=discovery(state.run!,'ossuary')
    expect(initial.rooms.filter(r=>r.visited)).toHaveLength(1)
    expect(initial.rooms.filter(r=>!r.visited).every(r=>r.description==='Unexplored passage' && r.mark==='?')).toBe(true)
    expect(initial.rooms).toHaveLength(2)
    const next=state.run!.map.nodes.stair!.exits[0]!.to
    state=reduce(state,{type:'GO',to:next});state=reduce(state,{type:'GO',to:'stair'})
    expect(state.run!.path).toHaveLength(3)
    expect(discovery(state.run!,'ossuary').rooms.filter(r=>r.visited)).toHaveLength(2)
    expect(firstEntryToTerritory(state.run!)).toBe(false)
  })
})

it('plays all three sections through real reducer actions without a maze stall', () => {
  let wins=0
  const escapedSeeds: number[]=[]
  for(let seed=1;seed<=48;seed++) {
    let state=start(seed)
    for (const area of AREAS) {
      const members=Object.values(state.run!.map.nodes).filter(n=>n.area===area.id)
      const cache=members.find(n=>n.dice?.length)!
      state=walk(state,cache.id)
      state=reduce(state,{type:'CLAIM_DIE',index:0,slot:AREAS.indexOf(area)})
      const key=members.find(n=>n.key)!
      state=walk(state,key.id);state=reduce(state,{type:'TAKE_KEY'})
      const font=members.find(n=>roomAt(state.run!,n.id).ritual)!
      state=walk(state,font.id)
      if(state.run!.bones<30)state=reduce(state,{type:'RITUAL_ROLL'})
      const boss=members.find(n=>n.sectionBoss)!
      state=walk(state,boss.id)
      state=simulateFight(state,'heuristic').state
      if(state.mode==='dead')break
      expect(state.mode).toBe('explore')
      for(let i=0;i<(state.run!.loot?.[boss.id]?.length??0);i++) state=reduce(state,{type:'TAKE',index:i})
    }
    if(state.mode==='explore')state=walk(state,'out')
    expect(['dead','complete']).toContain(state.mode)
    if(state.mode==='complete') {
      wins++;escapedSeeds.push(seed);expect(state.run!.keys).toHaveLength(3);expect(state.run!.cleared).toHaveLength(3)
    }
  }
  expect(wins).toBeGreaterThan(0)
  console.log(`Maze, heuristic, taking found dice: ${wins}/48 escaped. Exploratory measurement, not a tuned target.`)
  console.log(`Reproducible escapes: ${escapedSeeds.slice(0,3).join(', ')}.`)
})
