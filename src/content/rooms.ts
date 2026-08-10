/**
 * The room library: every authored place, and nothing about the route.
 *
 * There is no generator here and there is no graph here. Each entry answers
 * four questions in data — what is shown, what the eye should find, what else
 * can be tapped, and what occupies the room — and one further question it used
 * to answer is now conspicuously missing: **where does this lead**. That is the
 * generated map's, in `src/game/map.ts`, and a template that named a
 * destination would put the descent back inside the content library.
 *
 * A room may never require the player to find a hidden thing in order to
 * leave.
 *
 * Three kinds of thing can occupy a room, and they are different in what they
 * withhold. An **enemy** and a **ritual** each hold the exits shut until they
 * are resolved. **Interactables** are the third and are not one thing but
 * several — objects with positions that survive a reload, where what one will
 * do depends on where the others are standing. Whether they hold the exits is
 * the room's own business: the Reliquary's four never do, and the Chain Vault's
 * do until its gate is up. `exitsOpen` in `content/interactions.ts` is the one
 * statement of that, and the reducer's `GO` is what enforces it.
 *
 * The vocabulary — role, territory, composition, topology — is in
 * `roomTypes.ts`, and the reason each of the ten below is classified the way
 * it is is written beside it.
 */

import type { RoomTemplate } from './roomTypes.js'

export type {
  Composition,
  Detail,
  Interactable,
  Ritual,
  RoomRole,
  RoomTemplate,
  RoomTopology,
  Territory,
  ThreatBand,
} from './roomTypes.js'

/** One way in, one way on. The shape most corridors have. */
const THROUGH = { minEntrances: 1, maxEntrances: 1, minExits: 1, maxExits: 1 } as const

export const ROOM_TEMPLATES: Readonly<Record<string, RoomTemplate>> = {
  entry: {
    id: 'entry',
    name: 'The Long Hall',
    // The way in. Nothing arrives here, and it was painted as a hall receding
    // to a door with no light behind it — a long axis, and the first one.
    role: 'entrance',
    territory: 'threshold',
    composition: 'long-axis',
    tags: [],
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
    topology: { minEntrances: 0, maxEntrances: 0, minExits: 1, maxExits: 1 },
  },

  passage: {
    id: 'passage',
    name: 'The Choir',
    // It narrows. That is the whole of the picture, and it is why nothing can
    // be staged in it: there is no room in the frame for a thing to stand.
    role: 'transition',
    territory: 'ossuary',
    composition: 'cramped',
    tags: [],
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
    topology: THROUGH,
  },

  hollow: {
    id: 'hollow',
    name: 'The Hollow',
    // The one room painted around its encounter: a long hall with the far end
    // still visible, because the whole fight is how much of it is left. Which
    // is exactly what `closing-horror` means — a thing may be placed here only
    // if the picture can show it coming.
    role: 'encounter',
    territory: 'ossuary',
    composition: 'long-axis',
    tags: [],
    art: 'hall',
    arrival: 'The Gnawing is at the far end of the hall. Too many eyes. All of them are on me.',
    details: [
      {
        id: 'niches',
        at: { x: 0.16, y: 0.34 },
        says: 'Niches, packed with skulls. Hundreds. This is where the hall was leading.',
      },
    ],
    encounterTags: ['closing-horror'],
    threat: 'low',
    enemy: 'gnawing',
    topology: THROUGH,
  },

  sanctuary: {
    id: 'sanctuary',
    name: 'The Font',
    art: 'sanctuary',
    // The one room in the slice that gives something back. The director puts it
    // between the first fight and the fork on purpose: the decision at the fork
    // is *how many bones am I willing to spend*, and it is a real decision only
    // if the player knows how many bones they have to spend. That ordering is
    // the plan's, in `content/runPlans.ts`, and no longer this room's.
    role: 'recovery',
    territory: 'chapel',
    composition: 'altar',
    tags: [],
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
      // bone and every carried thing in the game is held to.
      prompt: 'A basin, filled to the lip, with a die turning under the surface. It gives back bones: whatever it lands on, and two more. Never past thirty, and never one that had a name.',
    },
    topology: THROUGH,
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
   * Its role is `find` and `worked` is a tag, because what it *is* is the room
   * that pays, and how it pays is by being worked. A plan that wants a paying
   * room asks for `find`; a plan that wants a room with machinery in it asks
   * for the tag.
   *
   * The order is bell, dark, mechanism, and it is learnable without a guess:
   * the three marks cut beside the altar's handle say it in the order they have
   * to happen, and the brazier's own line says what putting it out reveals.
   *
   * **Every coordinate below is measured off the art**, not chosen. The four
   * objects were painted as portraits and `tools/art.mjs` seats each of them in
   * the room at a stance declared there; these are where those stances put them,
   * converted from the scene's fractions into the world box's — a 480 × 720
   * scene cover-fitted into a 390 × 844 phone loses about 7% of its width, so a
   * fraction of the painting is not yet a fraction of the screen. Move a stance
   * and these move with it or the button comes off the object.
   */
  reliquary: {
    id: 'reliquary',
    name: 'The Reliquary',
    role: 'find',
    territory: 'chapel',
    composition: 'altar',
    tags: ['worked', 'optional'],
    art: 'reliquary',
    arrival: 'A dead chapel. A bell hangs over an altar. Candles burn beside a locked chest.',
    details: [
      {
        id: 'bell',
        at: { x: 0.214, y: 0.31 },
        says: 'A bronze bell. Old red thread is knotted around the clapper.',
      },
      {
        id: 'brazier',
        at: { x: 0.16, y: 0.79 },
        says: 'Five candles melted almost to the stone. They are the only warm light in the room.',
      },
      {
        id: 'altar',
        at: { x: 0.5, y: 0.585 },
        says: 'An altar built around a basin. The blood in it is old enough to be black.',
      },
      {
        id: 'lever',
        at: { x: 0.5, y: 0.815 },
        focal: true,
        says: 'The altar has a recessed iron handle beneath the basin. Three marks have been cut beside it: a bell, a dead flame, a lowered skull.',
      },
      {
        id: 'chest',
        at: { x: 0.823, y: 0.815 },
        says: 'A chest with no keyhole. The skull clasp is joined to something inside the wall.',
      },
    ],
    // Deliberately seated off the details they belong to, so a LOOK and an act
    // are never the same 44px of screen. The action sits on the object; the
    // detail sits beside it.
    //
    // `reliquary-lever` sits on the altar, because the altar *is* the
    // mechanism: no lever was ever painted, and a handle recessed under the
    // basin is the thing the three marks are cut beside. The id is the
    // reducer's and the save's, and renaming it would migrate every save that
    // ever pulled it for no gain the player could see.
    interactables: [
      { id: 'reliquary-bell', art: 'bell', at: { x: 0.214, y: 0.19 }, describe: 'Ring the ritual bell' },
      {
        id: 'reliquary-brazier',
        art: 'brazier',
        // Just above the flames rather than across them. This verb is a pill
        // wide enough to hold two words, and the two words are exactly as wide
        // as the candle stand — put it on the object's centre and it covers the
        // five flames it is asking you to put out.
        at: { x: 0.16, y: 0.6 },
        describe: 'Put out the candles',
      },
      {
        id: 'reliquary-lever',
        art: 'altar',
        at: { x: 0.5, y: 0.7 },
        describe: 'Pull the handle under the basin',
      },
      {
        id: 'reliquary-chest',
        art: 'chest',
        at: { x: 0.823, y: 0.7 },
        describe: 'Take what is inside the reliquary',
      },
    ],
    topology: THROUGH,
  },

  fork: {
    id: 'fork',
    name: 'The Split',
    // Two ways on, and the picture was painted with the passage dividing in
    // front of you — so `maxExits` is 2 and it is a fact about the art.
    role: 'junction',
    territory: 'chapel',
    composition: 'junction',
    tags: [],
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
    topology: { minEntrances: 1, maxEntrances: 1, minExits: 2, maxExits: 2 },
  },

  /**
   * The mandatory one, and the counterweight to the Reliquary.
   *
   * The same machinery — objects with positions, an order between them — spent
   * the opposite way: there is no way out until the gate is up, and getting it
   * wrong costs blood. It is the toll on the deep route, paid before the fight
   * rather than during it, and it is the first place in the slice where a room
   * itself can kill you. `toll` is what that is, and `worked` and `mandatory`
   * are how it does it.
   *
   * It is still not a guessing game. The wall panel draws the rule in two
   * pictures — a weight falling, then a gate lifting — and the lever's own line
   * says its linkage runs to the floor plate.
   */
  'chain-vault': {
    id: 'chain-vault',
    name: 'The Chain Vault',
    role: 'toll',
    territory: 'deep',
    // A cage on a chain over a plate in the floor: the whole mechanism runs up
    // and down, and there is no depth in the frame for anything to stand in.
    composition: 'vertical',
    tags: ['worked', 'mandatory'],
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
    topology: THROUGH,
  },

  deep: {
    id: 'deep',
    name: 'The Deep Way',
    // A tunnel with a thing standing in it. There is no far end in frame, so
    // nothing that closes the distance can be staged here — only something that
    // stands and trades.
    role: 'encounter',
    territory: 'deep',
    composition: 'cramped',
    tags: [],
    art: 'deep',
    arrival: 'The Marrow rises in the tunnel. It is between me and the way back to the door.',
    details: [
      {
        id: 'roots',
        at: { x: 0.2, y: 0.5 },
        says: 'Roots, or something like them, coming through the wall. They are warm.',
      },
    ],
    encounterTags: ['standing-horror'],
    threat: 'medium',
    enemy: 'marrow',
    topology: THROUGH,
  },

  gate: {
    id: 'gate',
    name: 'The Door',
    // The keeper's room, and the one place two ways in converge — the stair and
    // the deep tunnel both arrive here, so `maxEntrances` is 2.
    role: 'keeper',
    territory: 'threshold',
    composition: 'duel',
    tags: [],
    art: 'gate',
    arrival: 'The Warden stands in front of the exit door. There is no way through while it is alive.',
    details: [
      {
        id: 'sign',
        at: { x: 0.8, y: 0.62 },
        says: 'A plate on the wall. REPENT OR PERISH. Someone had opinions.',
      },
    ],
    encounterTags: ['duel-stander'],
    threat: 'keeper',
    enemy: 'warden',
    topology: { minEntrances: 1, maxEntrances: 2, minExits: 1, maxExits: 1 },
  },

  exit: {
    id: 'exit',
    name: 'Out',
    role: 'exit',
    territory: 'threshold',
    composition: 'threshold',
    tags: [],
    art: 'brazier',
    arrival: 'Cold air. Open space. I made it out with what I was carrying.',
    details: [],
    topology: { minEntrances: 1, maxEntrances: 1, minExits: 0, maxExits: 0 },
    ending: 'escaped',
  },
}

/** Every authored place, in declaration order. The resolver's whole world. */
export const ROOM_LIBRARY: readonly RoomTemplate[] = Object.values(ROOM_TEMPLATES)

/**
 * One authored place, by id.
 *
 * Note what this is *not*: a room the run is standing in. That question is
 * `roomAt(run)` in `src/game/map.ts`, which joins the generated node onto this.
 * A call to `template()` with `run.roomId` is a bug — those are node ids now —
 * and there is nothing here that would notice.
 */
export function template(id: string): RoomTemplate {
  const found = ROOM_TEMPLATES[id]
  if (!found) throw new Error(`no such room template: ${id}`)
  return found
}
