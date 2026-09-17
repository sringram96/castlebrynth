/** Places for the spatial maze. Compass exits describe off-frame passages. */
import { COMPASS, DIRECTIONS } from './areas.js'
import type { RoomTemplate, Territory } from './roomTypes.js'

const exits = DIRECTIONS.map(direction => ({ id: direction, at: COMPASS[direction].at }))
const topology = { minEntrances: 1, maxEntrances: 4, minExits: 1, maxExits: 4 }
function place(id: string, name: string, art: string, territory: Territory, arrival: string): RoomTemplate {
  return { id, name, art, territory, arrival, role: 'transition', composition: 'long-axis',
    tags: ['maze'], details: [], exitAnchors: exits, topology }
}
function cache(id: string, name: string, art: string, territory: Territory, arrival: string): RoomTemplate {
  return { ...place(id, name, art, territory, arrival), role: 'find',
    spareSeats: [{ id: 'ledge', at: { x: .5, y: .66 } }] }
}

export const MAZE_ROOMS: Readonly<Record<string, RoomTemplate>> = Object.fromEntries([
  { ...place('maze-entry', 'The Remembered Stair', 'entry', 'ossuary',
    'Bone remembers. Somewhere below is the one I came for. The passages fold back on themselves. Find the Bone Key.'),
    role: 'entrance' as const },
  place('maze-bone-walk', 'Bone Walk', 'hall', 'ossuary', 'The floor is worn in both directions. I can come back this way.'),
  place('maze-candle-court', 'Candle Court', 'choir', 'ossuary', 'Fresh candles among old bones. A draught finds more than one way through.'),
  place('maze-burial-gallery', 'Burial Gallery', 'reliquary', 'ossuary', 'Names rubbed smooth. The alcoves repeat, but the passages do not.'),
  cache('maze-bone-reliquary', 'The Key Reliquary', 'reliquary', 'ossuary', 'A key cut from a single bone rests on the ledge.'),
  place('maze-hanging-bell', 'The Hanging Bell', 'bellworks-hanging', 'chapel', 'The bell hangs over an open shaft. Its clapper is missing.'),
  place('maze-rope-passage', 'Rope Passage', 'bellworks-rope', 'chapel', 'Ropes disappear through the ceiling. Beyond the slit, the same bell shaft.'),
  place('maze-counterweight', 'The Counterweight', 'bellworks-weight', 'chapel', 'An enormous weight hangs still. Footsteps arrive from somewhere beside me.'),
  place('maze-service-passage', 'Service Passage', 'bellworks-service', 'chapel', 'A barred service gate overlooks the shaft. Side passages run around it.'),
  place('maze-bell-balcony', 'Bell Balcony', 'bellworks-balcony', 'chapel', 'The shaft again, from above. I know this place.'),
  cache('maze-clapper-store', 'Clapper Store', 'bellworks-weight', 'chapel', 'A bronze clapper lies beside the machinery. The keeper’s gate has a matching socket.'),
  place('maze-deep-walk', 'The Warm Passage', 'deep', 'deep', 'Warm air rises from a passage I cannot see the end of.'),
  place('maze-chain-well', 'Chain Well', 'chain-vault', 'deep', 'Chains descend out of sight. A second passage leads around the well.'),
  place('maze-dead-hearth', 'The Dead Hearth', 'brazier', 'deep', 'An unlit hearth. The warmth comes from underneath it.'),
  cache('maze-seal-vault', 'The Seal Vault', 'gate', 'deep', 'The Warden’s seal lies where someone put it down and never returned.'),
  ...(['ossuary', 'chapel', 'deep'] as const).flatMap(territory => [
    cache(`maze-${territory}-cache`, 'The Chained Alcove', 'deep', territory, 'One crooked casting bone on the ledge. Its faces and its price are plain.'),
    { ...place(`maze-${territory}-font`, 'The Still Font', 'sanctuary', territory,
      'Still water. This font remembers what it has already given.'), role: 'recovery' as const,
      ritual: { art: 'chalice', name: 'The Font', label: 'ROLL', describe: 'Roll the die in the font',
        at: { x: .5, y: .68 }, prompt: 'It gives back bones: whatever it lands on, and two more. Never past thirty, and never one that had a name.' } },
  ]),
  { ...place('maze-ossuary-keeper', 'The Gnawing’s Hall', 'hall', 'ossuary', 'The keeper of the Ossuary has heard the key turn.'),
    role: 'encounter' as const, enemy: 'gnawing', encounterTags: ['closing-horror'], threat: 'low' as const,
    lootAt: [{ id: 'beside-the-body', at: { x: .5, y: .69 } }] },
  { ...place('maze-bellworks-keeper', 'The Bellworks Nest', 'bellworks-nest', 'chapel', 'The keeper has nested beneath the machinery.'),
    role: 'encounter' as const, enemy: 'marrow', encounterTags: ['standing-horror'], threat: 'medium' as const,
    lootAt: [{ id: 'beside-the-body', at: { x: .34, y: .69 } }, { id: 'under-the-weight', at: { x: .66, y: .69 } }] },
  { ...place('maze-deep-keeper', 'The Last Door', 'gate', 'deep', 'The Warden waits at the last door.'),
    role: 'keeper' as const, enemy: 'warden', encounterTags: ['duel-stander'], threat: 'keeper' as const },
  { ...place('maze-exit', 'Out', 'brazier', 'deep', 'Cold air. Open space. I made it out with what I was carrying.'),
    role: 'exit' as const, ending: 'escaped' as const, topology: { minEntrances: 1, maxEntrances: 1, minExits: 0, maxExits: 0 }, exitAnchors: [] },
].map(room => [room.id, room]))
