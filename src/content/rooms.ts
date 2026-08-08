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
  /** The run ends here, and it ends well. */
  readonly ending?: 'escaped'
}

export const ROOMS: Readonly<Record<string, Room>> = {
  entry: {
    id: 'entry',
    name: 'The Long Hall',
    art: 'entry',
    arrival: 'The stair ends in a long hall. Fresh candles are burning down here.',
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
    exits: [{ label: 'GO ON', to: 'passage', sense: 'The hall continues to a dark archway.' }],
  },

  passage: {
    id: 'passage',
    name: 'The Choir',
    art: 'choir',
    arrival: 'The hall narrows under an arch of skulls. Something has passed through here recently.',
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
        says: 'A step, worn down the middle. Whatever uses this passage uses it often.',
      },
    ],
    exits: [{ label: 'GO ON', to: 'hollow', sense: 'Something is breathing in the room ahead.' }],
  },

  hollow: {
    id: 'hollow',
    name: 'The Hollow',
    art: 'ossuary',
    arrival: 'The Gnawing is blocking the passage ahead. Too many eyes. All of them are on me.',
    details: [
      {
        id: 'niches',
        at: { x: 0.16, y: 0.34 },
        says: 'Niches, packed with skulls. Hundreds. This is where the hall was leading.',
      },
    ],
    enemy: 'gnawing',
    exits: [{ label: 'GO ON', to: 'fork', sense: 'The body is down. The corridor continues behind it.' }],
  },

  fork: {
    id: 'fork',
    name: 'The Split',
    art: 'shrine',
    arrival: 'The passage splits. The stair goes straight to the door. The deeper tunnel is warmer, louder, and optional.',
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
      { label: 'STAIR', to: 'gate', sense: 'Shorter route to the door.' },
      {
        label: 'DEEP',
        to: 'deep',
        sense: 'One more fight. More danger, better chance of an upgrade.',
      },
    ],
  },

  deep: {
    id: 'deep',
    name: 'The Deep Way',
    art: 'deep',
    arrival: 'The Marrow rises in the tunnel. It is between me and the way back to the door.',
    details: [
      {
        id: 'roots',
        at: { x: 0.2, y: 0.5 },
        says: 'Roots, or something like them, coming through the wall. They are warm.',
      },
    ],
    enemy: 'marrow',
    exits: [{ label: 'GO ON', to: 'gate', sense: 'This tunnel rejoins the path to the door.' }],
  },

  gate: {
    id: 'gate',
    name: 'The Door',
    art: 'gate',
    arrival: 'The Warden stands in front of the exit door. There is no way through while it is alive.',
    details: [
      {
        id: 'sign',
        at: { x: 0.8, y: 0.62 },
        says: 'A plate on the wall. REPENT OR PERISH. Someone had opinions.',
      },
    ],
    enemy: 'warden',
    exits: [{ label: 'THROUGH', to: 'exit', sense: 'The door is open.' }],
  },

  exit: {
    id: 'exit',
    name: 'Out',
    art: 'brazier',
    arrival: 'Cold air. Open space. I made it out with what I was carrying.',
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
