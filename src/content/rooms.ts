/**
 * The rooms, and the authored route through them.
 *
 * There is no generator. The slice is an explicit ten-node graph, because a
 * hand-authored route is trivially inspectable and the interesting question —
 * *is this fun on a second run?* — is not answered by procedure.
 *
 * Every room answers five questions in data: what is shown, what the eye
 * should find, what else can be tapped, where the exits go, and what occupies
 * the room. A room may never require the player to find a hidden thing in
 * order to leave.
 *
 * Three kinds of thing can occupy a room, and they are different in what they
 * withhold. An **enemy** and a **ritual** each hold the exits shut until they
 * are resolved. **Interactables** are the third and are not one thing but
 * several — objects with positions that survive a reload, where what one will
 * do depends on where the others are standing. Whether they hold the exits is
 * the room's own business: the Reliquary's four never do, and the Chain Vault's
 * do until its gate is up. `exitsOpen` in `content/interactions.ts` is the one
 * statement of that, and the reducer's `GO` is what enforces it.
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

/**
 * The one thing in the room that is pressed rather than looked at.
 *
 * A detail answers and moves nothing. A ritual *commits*: the reducer rolls,
 * the run changes, and the room records what it gave. Like an enemy, it holds
 * the exits shut until it is resolved — which is why it is content rather than
 * a class the view could forget to apply.
 */
export interface Ritual {
  /** The prop's art family. Its frames are `<art>.idle` and `<art>.1`–`.6`. */
  readonly art: string
  /** The name of the thing, for the well. */
  readonly name: string
  /** What the press says. Two words or fewer — it goes on a button. */
  readonly label: string
  readonly describe: string
  /** Where the object sits, in fractions of the world box. */
  readonly at: { readonly x: number; readonly y: number }
  /** What the well says before it is used. */
  readonly prompt: string
}

/**
 * One object in a room that can be worked, and remembers being worked.
 *
 * The third kind of thing in a room, and the one the slice was missing. A
 * `Detail` answers and moves nothing. A `Ritual` commits once and holds the
 * exits shut until it has. An interactable is neither: it has a **position of
 * its own** that survives a reload, several of them can stand in one room, and
 * what any of them will do depends on where the others are standing.
 *
 * What is here is only what does not change: the id the reducer switches on,
 * the art family, and where the object sits. Everything that *does* change —
 * the verb on the button, whether there is a button at all, which frame is up —
 * is a function of state and lives in `content/interactions.ts`, because a
 * label baked in here would be a second place the room's rules were written.
 */
export interface Interactable {
  /** What `INTERACT` carries. Unique across the game, not just the room. */
  readonly id: string
  /** The prop's art family. Its frames are `<art>.<frame>`. */
  readonly art: string
  /** Where the object sits, in fractions of the world box. */
  readonly at: { readonly x: number; readonly y: number }
  /**
   * Default action copy, for the accessible name.
   *
   * The starting verb only. A thing whose verb changes with its state resolves
   * it through `actionFor`, and this is what it says before anything has
   * happened to it.
   */
  readonly describe: string
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
  /** A thing that must be used before the exits open. */
  readonly ritual?: Ritual
  /** Objects that can be worked, and remember it. */
  readonly interactables?: readonly Interactable[]
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
    // The one room painted around its encounter: a long hall with the far end
    // still visible, because the whole fight is how much of it is left.
    art: 'hall',
    arrival: 'The Gnawing is at the far end of the hall. Too many eyes. All of them are on me.',
    details: [
      {
        id: 'niches',
        at: { x: 0.16, y: 0.34 },
        says: 'Niches, packed with skulls. Hundreds. This is where the hall was leading.',
      },
    ],
    enemy: 'gnawing',
    exits: [{ label: 'GO ON', to: 'sanctuary', sense: 'The body is down. The corridor continues behind it.' }],
  },

  sanctuary: {
    id: 'sanctuary',
    name: 'The Font',
    art: 'sanctuary',
    // The one room in the slice that gives something back. It sits between the
    // first fight and the fork on purpose: the decision at the fork is *how
    // much health am I willing to spend*, and it is a real decision only if
    // the player knows how much health they have to spend.
    arrival: 'The hall opens into a chapel. The basin is full. Something turns beneath the surface.',
    details: [
      {
        id: 'candles',
        at: { x: 0.16, y: 0.62 },
        says: 'Candles down both walls, lit and level. Somebody comes down here and keeps them.',
      },
      {
        id: 'niches',
        at: { x: 0.84, y: 0.4 },
        says: 'Skulls, shelf on shelf, back into the dark. Every one of them is facing the basin.',
      },
    ],
    ritual: {
      art: 'chalice',
      name: 'The Font',
      label: 'ROLL',
      describe: 'Roll the die in the font',
      // On the bowl itself, not on the altar behind it. Measured against the
      // staged plate: `SANCTUARY.stance` in `tools/art.mjs` stands the basin
      // with its base at 0.9 of the scene, which puts the blood and the carved
      // skull under the middle of this.
      at: { x: 0.5, y: 0.68 },
      // What it does, in numbers, before the press — the same contract every
      // die and every relic in the game is held to.
      prompt: 'A basin, filled to the lip, with a die turning under the surface. It gives back a share of what I have already lost. The higher it lands, the bigger the share.',
    },
    exits: [{ label: 'GO ON', to: 'reliquary', sense: 'The chapel opens onto a dead one.' }],
  },

  /**
   * The optional room.
   *
   * Four objects, an order between them, and no penalty whatsoever for walking
   * past all of it. That is the point: the slice's rooms were *enter, look,
   * read, leave*, and the fix for that is not another thing the player is made
   * to do — it is a thing they may choose to work out. GO ON is on screen from
   * the first frame and never leaves.
   *
   * The order is bell, dark, lever, and it is learnable without a guess: the
   * three cuts beside the lever say it in the order they have to happen, and
   * the brazier's own line says what putting it out reveals.
   */
  reliquary: {
    id: 'reliquary',
    name: 'The Reliquary',
    art: 'reliquary',
    arrival: 'A dead chapel. A bell, a brazier, and a chest have been left around the altar.',
    details: [
      {
        id: 'bell',
        at: { x: 0.2, y: 0.42 },
        says: 'A bronze bell. The clapper has been wrapped in old red thread.',
      },
      {
        id: 'brazier',
        at: { x: 0.79, y: 0.6 },
        says: 'A shallow brazier. Its flame is the only warm light touching the altar.',
      },
      {
        id: 'lever',
        at: { x: 0.5, y: 0.53 },
        focal: true,
        says: 'A lever through a stone skull. Three cuts beside it: a bell, a black flame, a lowered jaw.',
      },
      {
        id: 'chest',
        at: { x: 0.29, y: 0.75 },
        says: 'A chest with no keyhole. The skull clasp is connected to something inside the wall.',
      },
    ],
    // Deliberately seated off the details they belong to, so a LOOK and an act
    // are never the same 44px of screen. The action sits on the object; the
    // detail sits beside it.
    interactables: [
      { id: 'reliquary-bell', art: 'bell', at: { x: 0.2, y: 0.3 }, describe: 'Ring the ritual bell' },
      {
        id: 'reliquary-brazier',
        art: 'brazier',
        at: { x: 0.79, y: 0.48 },
        describe: 'Extinguish the brazier',
      },
      { id: 'reliquary-lever', art: 'lever', at: { x: 0.5, y: 0.41 }, describe: 'Pull the skull lever' },
      {
        id: 'reliquary-chest',
        art: 'chest',
        at: { x: 0.29, y: 0.63 },
        describe: 'Take what is inside the reliquary',
      },
    ],
    exits: [{ label: 'GO ON', to: 'fork', sense: 'The chapel gives onto the passage again.' }],
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
        to: 'chain-vault',
        sense: 'One more fight. More danger, better chance of an upgrade.',
      },
    ],
  },

  /**
   * The mandatory one, and the counterweight to the Reliquary.
   *
   * The same machinery — objects with positions, an order between them — spent
   * the opposite way: there is no way out until the gate is up, and getting it
   * wrong costs blood. It is the toll on the deep route, paid before the fight
   * rather than during it, and it is the first place in the slice where a room
   * itself can kill you.
   *
   * It is still not a guessing game. The wall panel draws the rule in two
   * pictures — a weight falling, then a gate lifting — and the lever's own line
   * says its linkage runs to the floor plate.
   */
  'chain-vault': {
    id: 'chain-vault',
    name: 'The Chain Vault',
    art: 'chain-vault',
    arrival: 'The deeper passage ends at an iron gate. A cage hangs over a stone plate.',
    // Measured against the backdrop rather than guessed: the vault was painted
    // with a cage hung top-right, a barred arch across the middle and a round
    // grate set into the floor below it, and the LOOK copy names all three. A
    // player who reads "a square plate in the floor" and taps the plate they
    // can see has to be tapping the right thing, or the clue is a riddle.
    details: [
      {
        id: 'cage',
        at: { x: 0.81, y: 0.16 },
        says: 'An iron cage. Heavy enough to make the chain groan.',
      },
      {
        id: 'plate',
        at: { x: 0.61, y: 0.69 },
        says: 'A square plate in the floor, polished around the edges by weight.',
      },
      {
        id: 'lever',
        at: { x: 0.19, y: 0.63 },
        says: 'A lever beside the gate. Its linkage runs toward the floor plate.',
      },
      {
        id: 'wall-panel',
        at: { x: 0.13, y: 0.36 },
        focal: true,
        says: 'Two figures cut into the stone: first a weight falling, then a gate lifting.',
      },
      {
        id: 'gate',
        at: { x: 0.61, y: 0.55 },
        says: 'Iron bars with no lock. The mechanism is inside the wall.',
      },
    ],
    // The chain's control sits on the chain, under the cage it lifts — so the
    // press and the thing that answers it are the same object in the picture.
    interactables: [
      { id: 'vault-chain', art: 'chain', at: { x: 0.81, y: 0.28 }, describe: 'Lower the hanging cage' },
      { id: 'vault-lever', art: 'lever', at: { x: 0.19, y: 0.51 }, describe: 'Pull the iron lever' },
    ],
    exits: [{ label: 'GO ON', to: 'deep', sense: 'The gate is up. The tunnel goes on.' }],
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
