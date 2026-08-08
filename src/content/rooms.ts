/**
 * The rooms, and the authored route through them.
 *
 * There is no generator. The slice is an explicit seven-node graph, because a
 * hand-authored route is trivially inspectable and the interesting question —
 * *is this fun on a second run?* — is not answered by procedure.
 *
 * Every room answers five questions in data: what is shown, what the eye
 * should find, what else can be tapped, where the exits go, and what occupies
 * the room. A room may never require the player to find a hidden thing in
 * order to leave.
 */

export interface Detail {
  readonly id: string
  /** What the tap says. Leads with the plain noun. */
  readonly says: string
  /** Where the hit region sits, in fractions of the world box. */
  readonly at: { readonly x: number; readonly y: number }
  /** Whether this is the one thing the eye should find. */
  readonly focal?: boolean
}

export interface Exit {
  /** Two words or fewer — it goes on a button. */
  readonly label: string
  readonly to: string
  /** One line, given before the press, so a fork is a decision. */
  readonly sense: string
}

export interface Room {
  readonly id: string
  readonly name: string
  /** The backdrop asset id. Every room has one; it is validated. */
  readonly art: string
  /** The line on arrival. */
  readonly arrival: string
  readonly details: readonly Detail[]
  readonly exits: readonly Exit[]
  /** An enemy that must be beaten before the exits open. */
  readonly enemy?: string
  /** A gift: pick one of these and leave the rest. */
  readonly gift?: readonly string[]
  /** The run ends here, and it ends well. */
  readonly ending?: 'escaped'
}

export const ROOMS: Readonly<Record<string, Room>> = {
  entry: {
    id: 'entry',
    name: 'The Long Hall',
    art: 'entry',
    arrival: 'Down. The stair ended and this began. Candles somebody keeps lit.',
    details: [
      {
        id: 'candles',
        at: { x: 0.16, y: 0.66 },
        focal: true,
        says: 'Candles. Fresh ones, burning. Something down here still keeps a schedule.',
      },
      {
        id: 'skull',
        at: { x: 0.42, y: 0.86 },
        says: 'A skull on the floor. Small. It has been here longer than the candles.',
      },
      {
        id: 'far-door',
        at: { x: 0.53, y: 0.4 },
        says: 'The hall keeps going. There is a door at the end of it and no light behind it.',
      },
    ],
    exits: [{ label: 'ONWARD', to: 'passage', sense: 'The hall runs on into the dark.' }],
  },

  passage: {
    id: 'passage',
    name: 'The Choir',
    art: 'choir',
    arrival: 'Somebody left two things on the step. Only two. I can carry one.',
    details: [
      {
        id: 'arch',
        at: { x: 0.5, y: 0.28 },
        focal: true,
        says: 'An arch of skulls. Set carefully, every one facing out. Not a grave — a warning.',
      },
      {
        id: 'step',
        at: { x: 0.5, y: 0.78 },
        says: 'The step. Two things laid out on it, side by side, like a question.',
      },
    ],
    // The blueprint's room 2: show a special die or a relic, in plain
    // mechanical language, before the first fight makes it matter.
    gift: ['careful', 'knuckle'],
    exits: [{ label: 'ONWARD', to: 'hollow', sense: 'Something is breathing in the next room.' }],
  },

  hollow: {
    id: 'hollow',
    name: 'The Hollow',
    art: 'ossuary',
    arrival: 'Oh. Oh no. It was waiting in here.',
    details: [
      {
        id: 'niches',
        at: { x: 0.16, y: 0.34 },
        says: 'Niches, packed with skulls. Hundreds. This is where the hall was leading.',
      },
    ],
    enemy: 'gnawing',
    exits: [{ label: 'ONWARD', to: 'fork', sense: 'Past it. There is a way past it.' }],
  },

  fork: {
    id: 'fork',
    name: 'The Split',
    art: 'shrine',
    arrival: 'Two ways. One of them is quieter, and I do not trust the quiet one either.',
    details: [
      {
        id: 'shrine',
        at: { x: 0.5, y: 0.45 },
        focal: true,
        says: 'A shrine. Someone knelt here. The wax has run over the edge and set.',
      },
      {
        id: 'scratches',
        at: { x: 0.78, y: 0.62 },
        says: 'Scratches on the stone. Counting something. They stop at nine.',
      },
    ],
    exits: [
      { label: 'THE STAIR', to: 'gate', sense: 'Quiet. Straight down to whatever the door is.' },
      { label: 'THE DEEP', to: 'deep', sense: 'Warm air, and something moving in it. There is more down there.' },
    ],
  },

  deep: {
    id: 'deep',
    name: 'The Deep Way',
    art: 'deep',
    arrival: 'Warmer down here. Wetter. It stood up when it saw the light.',
    details: [
      {
        id: 'roots',
        at: { x: 0.2, y: 0.5 },
        says: 'Roots, or something like them, coming through the wall. They are warm.',
      },
    ],
    enemy: 'marrow',
    exits: [{ label: 'ONWARD', to: 'gate', sense: 'The way out of here goes to the door as well.' }],
  },

  gate: {
    id: 'gate',
    name: 'The Door',
    art: 'gate',
    arrival: 'The door. And the thing that was built to stand in front of it.',
    details: [
      {
        id: 'sign',
        at: { x: 0.8, y: 0.62 },
        says: 'A plate on the wall. REPENT OR PERISH. Someone had opinions.',
      },
    ],
    enemy: 'warden',
    exits: [{ label: 'THROUGH', to: 'exit', sense: 'Through. Finally, through.' }],
  },

  exit: {
    id: 'exit',
    name: 'Out',
    art: 'brazier',
    arrival: 'Air. Actual air. I got out, and I got out carrying something.',
    details: [],
    exits: [],
    ending: 'escaped',
  },
}

export const FIRST_ROOM = 'entry'

export function room(id: string): Room {
  const found = ROOMS[id]
  if (!found) throw new Error(`no such room: ${id}`)
  return found
}
