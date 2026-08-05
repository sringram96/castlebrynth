import type { Air, Light, Look, RampSpec, RoomPalette, Station } from '../room/index.js'
import { darkest, extend, lightest, ramp, stepOf } from '../room/index.js'

/**
 * art. 21: light and palette are authorial, chosen per scene. There is no
 * global light rule, so these are schools and not settings.
 *
 * One school per room in the depth, because art. 34 hangs knowledge on room
 * identity: a room the player cannot tell apart is a room they cannot learn.
 * MUTED and NOIR are lifted from `reference/castlebrynth-wake-v3.html`,
 * which wins ties about intent; the other four are cut to the same pattern
 * and each carries one thing the eye can name — the wet green, the warm
 * dust, the pale floor, the cold blue.
 */
export interface School {
  readonly mortar: string
  readonly brick: readonly [string, string, string, string]
  readonly brickAlt: string
  readonly grime: string
  readonly moss: string
  readonly moss2: string
  readonly damp: string
  readonly flag: readonly [string, string, string, string]
  readonly slat: readonly [string, string, string, string]
  readonly bone: readonly [string, string, string]
  readonly accent: readonly [string, string, string, string]
  readonly edge: string
  readonly iron: string
  readonly coin: string
  /** art. 16: the structural near-black past the cutoff. */
  readonly hollow: string
  readonly breath: string
  /**
   * art. 113: where this room's light stands. Omitted is the light you
   * carry, which is what every room had before there were stations.
   *
   * art. 114 is why this is on the school and not on the room: at
   * sixty-four steps a palette stops carrying identity on its own, so a
   * region is known by its light. The drowned is lit from below through
   * water; the burnt from its embers; the ossuary close and with you; the
   * neutral pool is quiet.
   */
  readonly station?: Station
  /** What the light is the colour of. Omitted takes the school's pale bone. */
  readonly glow?: string
  /** How far it reaches and how hard it lifts, if this room is not ordinary. */
  readonly lamp?: { readonly reach?: number; readonly lift?: number; readonly tintAmt?: number }
}

export const MUTED: School = {
  mortar: '#151310',
  brick: ['#241f19', '#332b22', '#42372b', '#332b22'],
  brickAlt: '#544636',
  grime: '#100e0b',
  moss: '#26331f',
  moss2: '#33452a',
  damp: '#1b2226',
  flag: ['#1e1a14', '#2b251c', '#2b251c', '#38301f'],
  slat: ['#1c1814', '#262019', '#1c1814', '#120f0c'],
  bone: ['#93825f', '#c4b189', '#e6d8b0'],
  accent: ['#123c39', '#20605a', '#46a094', '#9fe8dc'],
  edge: '#030404',
  iron: '#101216',
  coin: '#cfa94f',
  hollow: '#020304',
  breath: '#101215',
  // art. 114: The waking corridor: what light there is falls through the grate.
  station: 'above',
}

/**
 * The wet passage. Water is the room's whole character, so the school runs
 * cold and green and the accent is the only thing in it with any light.
 */
export const WET: School = {
  mortar: '#101416',
  brick: ['#1a2326', '#222e31', '#2b3a3d', '#222e31'],
  brickAlt: '#3b4f52',
  grime: '#0b0f10',
  moss: '#1c3327',
  moss2: '#274733',
  damp: '#152a30',
  flag: ['#141d1f', '#1c282a', '#1c282a', '#243336'],
  slat: ['#141a1c', '#1c2426', '#141a1c', '#0d1214'],
  bone: ['#8b9a95', '#b6c6c0', '#dcebe4'],
  accent: ['#0e3a44', '#176070', '#2f9fb4', '#8fe2ee'],
  edge: '#020404',
  iron: '#0e1417',
  coin: '#7fb9c4',
  hollow: '#010303',
  breath: '#0c1417',
  // art. 114: The drowned: thrown up off the water, so the ceiling is the dark.
  station: 'below',
  glow: '#46a094',
}

/**
 * The alcove. Warm dust, and the one gold thing in the depth lying in it —
 * the school is chosen so the key reads as the brightest object in the room.
 */
export const OCHRE: School = {
  mortar: '#171208',
  brick: ['#2a2013', '#3a2c1a', '#4a3a22', '#3a2c1a'],
  brickAlt: '#5e4a2b',
  grime: '#120d06',
  moss: '#33301a',
  moss2: '#454025',
  damp: '#241c10',
  flag: ['#221a0f', '#2f2415', '#2f2415', '#3c2f1b'],
  slat: ['#1f1810', '#2a2116', '#1f1810', '#141009'],
  bone: ['#a3906a', '#d3bd8e', '#f0e2ba'],
  accent: ['#4a3208', '#7a5410', '#c08b1e', '#f0cf72'],
  edge: '#040302',
  iron: '#171410',
  coin: '#e0b452',
  hollow: '#030202',
  breath: '#141009',
  // art. 114: Neutral, and quiet: a little day from somewhere overhead.
  station: 'above',
}

/**
 * The ash passage. The tell is underfoot: the flagstones are paler than the
 * walls, which no other room in the depth does.
 */
export const ASH: School = {
  mortar: '#1b1a17',
  brick: ['#232227', '#2c2b2f', '#38363a', '#2c2b2f'],
  brickAlt: '#4b4844',
  grime: '#131215',
  moss: '#2a2926',
  moss2: '#37352f',
  damp: '#1f1e1c',
  flag: ['#3a3830', '#454338', '#454338', '#514e42'],
  slat: ['#1e1d1a', '#272620', '#1e1d1a', '#141310'],
  bone: ['#a8a49c', '#cfccc4', '#eeece6'],
  accent: ['#3a3833', '#5c584f', '#918b7d', '#d6cfbd'],
  edge: '#040405',
  iron: '#15161a',
  coin: '#b8b2a4',
  hollow: '#020203',
  breath: '#101114',
  // art. 114: Burnt. Something is still alight at the far end of it.
  station: 'ahead',
}

/**
 * The Warden's door. Colder than anything above it, and the only school in
 * the depth whose accent is blue — the depth's one lock reads as iron.
 */
export const IRON: School = {
  mortar: '#0c0e12',
  brick: ['#161a21', '#1d232c', '#252d38', '#1d232c'],
  brickAlt: '#39424f',
  grime: '#0a0c0f',
  moss: '#182028',
  moss2: '#212b35',
  damp: '#141c26',
  flag: ['#121519', '#191d23', '#191d23', '#222831'],
  slat: ['#111419', '#181c22', '#111419', '#0b0d10'],
  bone: ['#8e97a5', '#bcc5d3', '#e2e9f4'],
  accent: ['#0b2a4a', '#134672', '#2a7ab8', '#8ac6f0'],
  edge: '#020203',
  iron: '#0d1015',
  coin: '#93a3bb',
  hollow: '#010102',
  breath: '#0b0e13',
  // art. 114: The Warden's hall takes no light at all.
  station: 'none',
}

export const NOIR: School = {
  mortar: '#131316',
  brick: ['#202226', '#2b2e33', '#383c42', '#2b2e33'],
  brickAlt: '#494e56',
  grime: '#0e0f11',
  moss: '#262a30',
  moss2: '#31363d',
  damp: '#1a1e23',
  flag: ['#191b1e', '#25282c', '#25282c', '#32363c'],
  slat: ['#1a1c20', '#232529', '#1a1c20', '#101215'],
  bone: ['#959aa3', '#c1c6ce', '#e4e8ee'],
  accent: ['#123c39', '#20605a', '#46a094', '#9fe8dc'],
  edge: '#030304',
  iron: '#121419',
  coin: '#a7adb6',
  hollow: '#020304',
  breath: '#101215',
  // art. 114: Ossuary. Close, and it finds very little.
  station: 'with',
}

/**
 * The stair. The neutral pool's second room: grey granite, no character of
 * its own, which is the character — a room that leans nowhere (art. 77).
 */
export const GRANITE: School = {
  mortar: '#141416',
  brick: ['#212226', '#2a2b30', '#34363b', '#2a2b30'],
  brickAlt: '#454850',
  grime: '#101012',
  moss: '#242629',
  moss2: '#2f3236',
  damp: '#1a1c20',
  flag: ['#1b1c1f', '#242629', '#242629', '#2e3034'],
  slat: ['#1b1c1e', '#232427', '#1b1c1e', '#121314'],
  bone: ['#8f9195', '#b9bcc1', '#dee1e6'],
  accent: ['#2c3138', '#3f4650', '#6b7482', '#a9b3c0'],
  edge: '#020203',
  iron: '#111215',
  coin: '#9aa1ab',
  hollow: '#010102',
  breath: '#0e0f12',
  // art. 114: Ossuary. The stone gives nothing back.
  station: 'with',
}

/**
 * The cistern. The drowned region's lair: everything below the tidemark is
 * black and flat, and the accent is the one thing the water gives back.
 */
export const BRINE: School = {
  mortar: '#0b1315',
  brick: ['#132022', '#1a2c2e', '#22383a', '#1a2c2e'],
  brickAlt: '#2f4a4d',
  grime: '#080f10',
  moss: '#12291f',
  moss2: '#1a3b2b',
  damp: '#0d2228',
  flag: ['#0e1719', '#141f22', '#141f22', '#1a292c'],
  slat: ['#0f1618', '#161f21', '#0f1618', '#090e0f'],
  bone: ['#7d8f8b', '#a6b9b4', '#cde0da'],
  accent: ['#07303a', '#0d5364', '#1a8ba4', '#6fd4e6'],
  edge: '#010303',
  iron: '#0b1114',
  coin: '#6aa8b4',
  hollow: '#000202',
  breath: '#081113',
  // art. 114: Drowned. Off the water, and colder than the drip.
  station: 'below',
}

/**
 * The sump. Where the depth's water ends up, and everything it carried with
 * it: brown, thick, and the only school whose flagstones read as wet mud.
 */
export const SILT: School = {
  mortar: '#12100c',
  brick: ['#1e1a14', '#28231b', '#332c22', '#28231b'],
  brickAlt: '#483e2f',
  grime: '#0d0b08',
  moss: '#20261a',
  moss2: '#2c3423',
  damp: '#1b1a12',
  flag: ['#191510', '#231d15', '#231d15', '#2d2519'],
  slat: ['#171410', '#201b15', '#171410', '#0f0d0a'],
  bone: ['#8a7f6a', '#b3a68d', '#d8cbaf'],
  accent: ['#2b2a12', '#484522', '#7a7338', '#bdb271'],
  edge: '#030302',
  iron: '#131210',
  coin: '#9c8f5e',
  hollow: '#020201',
  breath: '#0f0d0a',
  // art. 114: Drowned, and the water is thick with what it carries.
  station: 'below',
}

/**
 * The kiln. The burnt region's lair: the one school in the depth with heat
 * still in it, and the accent is the only red anywhere in the game.
 */
export const EMBER: School = {
  mortar: '#160f0c',
  brick: ['#26170f', '#331e14', '#40271a', '#331e14'],
  brickAlt: '#5a3823',
  grime: '#110b08',
  moss: '#2b1d13',
  moss2: '#3a281a',
  damp: '#22140e',
  flag: ['#1f1410', '#2a1a14', '#2a1a14', '#35211a'],
  slat: ['#1c120e', '#261813', '#1c120e', '#120b08'],
  bone: ['#9d8875', '#c8b09a', '#e8d4c0'],
  accent: ['#4a1206', '#7c2409', '#c04a12', '#f08a4a'],
  edge: '#040202',
  iron: '#161010',
  coin: '#d4763a',
  hollow: '#030101',
  breath: '#150c0a',
  // art. 114: The burnt: the embers are on the floor, and they are the light.
  station: 'below',
  glow: '#ff8b3d',
}

/**
 * The pyre. What the kiln leaves behind: the burnt region without the heat,
 * flat black on flat grey, and no accent worth the name.
 */
export const SOOT: School = {
  mortar: '#0f0e0d',
  brick: ['#1a1918', '#22201e', '#2b2926', '#22201e'],
  brickAlt: '#3d3a36',
  grime: '#0a0a09',
  moss: '#1c1b19',
  moss2: '#262421',
  damp: '#141312',
  flag: ['#141312', '#1c1a18', '#1c1a18', '#252220'],
  slat: ['#141312', '#1b1917', '#141312', '#0d0c0b'],
  bone: ['#7f7a73', '#a5a099', '#cbc6bd'],
  accent: ['#231f1b', '#3a342d', '#5e564a', '#8f8577'],
  edge: '#020202',
  iron: '#121110',
  coin: '#7d7568',
  hollow: '#010101',
  breath: '#0c0b0a',
  // art. 114: Burnt out. Nothing here is lit; the ramp is the whole of it.
  station: 'none',
}

/**
 * The bonefield. The ossuary region's passage: chalk-pale everywhere, which
 * is the tell — it is the brightest room in the depth and the least alive.
 */
export const CHALK: School = {
  mortar: '#232019',
  brick: ['#2e2b23', '#3a362d', '#474338', '#3a362d'],
  brickAlt: '#5f5a4c',
  grime: '#1a1813',
  moss: '#2f2d24',
  moss2: '#3d3a2f',
  damp: '#26241d',
  flag: ['#484333', '#55503e', '#55503e', '#635d49'],
  slat: ['#26231c', '#302c24', '#26231c', '#1a1814'],
  bone: ['#c0b9a4', '#ded7c2', '#f6f1e2'],
  accent: ['#4c4636', '#6e6650', '#9c9478', '#d8d2bc'],
  edge: '#050504',
  iron: '#1b1a16',
  coin: '#cabf9f',
  hollow: '#030302',
  breath: '#16150f',
  // art. 114: The ossuary: close light, and it goes no further than you do.
  station: 'with',
}

/**
 * The tally. The ossuary region's puzzle: slate, so the scratches cut into
 * the wall read as the only thing in the room anyone wrote down.
 */
export const SLATE: School = {
  mortar: '#101215',
  brick: ['#1a1d22', '#22262c', '#2b3037', '#22262c'],
  brickAlt: '#3c424b',
  grime: '#0c0e11',
  moss: '#1d2126',
  moss2: '#272c33',
  damp: '#161a1f',
  flag: ['#161a1e', '#1e2328', '#1e2328', '#262c33'],
  slat: ['#151819', '#1d2124', '#151819', '#0e1012'],
  bone: ['#98a0a8', '#c0c8d0', '#e6ecf2'],
  accent: ['#2a2a3a', '#3d3d55', '#63637f', '#9f9fbc'],
  edge: '#020304',
  iron: '#101317',
  coin: '#8e96a4',
  hollow: '#010102',
  breath: '#0a0c0f',
  // art. 114: Neutral. The way on is brighter than where you stand.
  station: 'ahead',
}

/**
 * The font. The neutral pool's mercy (art. 40): copper gone green, and the
 * only school in the depth whose accent is *lit* rather than reflected — the
 * one room in a depth that is not trying to kill you should look like it.
 */
export const VERDIGRIS: School = {
  mortar: '#111613',
  brick: ['#1b2620', '#24322a', '#2d3f35', '#24322a'],
  brickAlt: '#41584a',
  grime: '#0d1210',
  moss: '#1f3527',
  moss2: '#2b4834',
  damp: '#132a24',
  flag: ['#161e1a', '#1e2822', '#1e2822', '#273329'],
  slat: ['#161d19', '#1e2621', '#161d19', '#0f1412'],
  bone: ['#93a396', '#bdcdbf', '#e2efe2'],
  accent: ['#1f4a34', '#2f7a55', '#4fbd88', '#a8f0cb'],
  edge: '#020403',
  iron: '#101613',
  coin: '#6fc79a',
  hollow: '#010302',
  breath: '#0b1210',
  // art. 114: Neutral, and something green is lit from up there.
  station: 'above',
  glow: '#9fe8dc',
}

/** The four colours the box needs that are not on a ramp. */
export function roomPalette(school: School): RoomPalette {
  return {
    edge: school.edge,
    rim: school.brickAlt,
    hollow: school.hollow,
    breath: school.breath,
  }
}

// ── The ramps ──────────────────────────────────────────────────────────
//
// One ramp per surface, and every authored thing about a pixel — variation,
// seams, grime, damp, moss, light, distance — is an offset along it rather
// than a colour of its own. The offsets are the masonry's, and live with the
// masonry in `plates/wake.ts`; what lives here is the colour: where each
// ramp starts, where it ends, how many steps, and how they bend.
//
// The conversion of the fourteen schools is mechanical. A ramp's dark end is
// the darkest tone the school already declares for that surface and its
// light end is the lightest, carried a little further along the same line
// for the light to lift into — so no room can fall out of key with itself.
// The base is where that surface's own commonest stone already sits on that
// ramp, so a room starts from exactly where it stood before the ramps
// arrived, and the offsets move it from there.
//
// What did not convert: `moss`, `moss2` and `damp` are hue departures rather
// than value ones — a green patch on a warm wall, a blue one on a cold
// floor — so a single ramp can only spend them as drops. Every other tone in
// every school lands within a few bytes of its ramp's line. See DESIGN.md.

/**
 * How many steps each surface gets. Fewer than seven and the bands show;
 * more than about fourteen and it stops reading as pixel art. The ceiling
 * gets fewer because it holds the least light and the least eye.
 */
/**
 * art. 94 as amended: the ramp is deep. Sixty-four steps is not sixty-four
 * bands — the upper ramp blends (art. 95), so the count is headroom for the
 * light to lift into rather than a number of visible belts.
 */
const STEPS = { wall: 64, floor: 64, ceiling: 64 } as const

/**
 * art. 94: how far a ramp turns. The dark end goes cool and desaturated,
 * the light end warm and saturated — the direction stone under a flame
 * actually goes, and most of the visible gain in the demos.
 *
 * The floor turns hardest because it holds the widest span of light in the
 * frame; the ceiling least, because it is mostly dark and a turn there
 * reads as a colour cast rather than as light.
 */
const TURN = { wall: 14, floor: 18, ceiling: 9 } as const
const HEAT = { wall: 0.1, floor: 0.13, ceiling: 0.07 } as const

/**
 * art. 94: how much deeper the ramp is than the ten steps every grammar
 * offset in this game was authored against. Every offset expressed in ramp
 * steps — a seam's depth, a defect's drop, the light's lift, the air's
 * gain — is multiplied by this and by nothing else, so the wave that
 * deepened the ramp did not re-author fourteen rooms' worth of numbers.
 */
export const DEEP = STEPS.wall / 10

/** A tone a fraction of the way along a ramp, rather than at an index. */
export function alongSteps(ramp: readonly string[], t: number): string {
  const top = ramp.length - 1
  return ramp[Math.max(0, Math.min(top, Math.round(t * top)))] ?? ramp[0]!
}

/**
 * The bend, weighting steps toward the dark end — where this game lives.
 * Above 1 is dark-weighted; the floor takes the most because it holds the
 * widest span of light in the frame, from underfoot to the mouth.
 */
const BEND = { wall: 1.5, floor: 1.6, ceiling: 1.35 } as const

/**
 * Headroom. A ramp's light end sits past the lightest tone the school
 * declares for that surface, carried that much further along the ramp's own
 * line. Without it a surface's ordinary stone sits at the top of its own
 * ramp and the light has nowhere to lift it, which is what flattened the
 * ceilings on the first pass. Along the line rather than toward a pale
 * neutral, because that is the one direction that cannot take a school out
 * of key with itself — the wet room stays wet, the kiln stays hot.
 */
const HEADROOM = 0.45

/**
 * The light, as a lift along the ramp. One station — the light that stands
 * where you do — because the light stations are a later wave. This is the
 * light the rooms already had, expressed.
 */
const LIGHT = { reach: 22, lift: 1.9, tintAmt: 0.16 } as const

/** Everything a school says about how its stone takes light and distance. */
export interface Shading {
  readonly wall: RampSpec
  readonly floor: RampSpec
  readonly ceiling: RampSpec
  /** Where each surface's own stone sits on its ramp, unlit, in steps. */
  readonly base: { readonly wall: number; readonly floor: number; readonly ceiling: number }
  readonly light: Light
  readonly air: Air
}

function specOf(
  tones: readonly string[],
  steps: number,
  bend: number,
  turn: number,
  heat: number,
): RampSpec {
  const dark = darkest(tones)
  return { dark, light: extend(dark, lightest(tones), HEADROOM), steps, bend, turn, heat }
}

const shadings = new Map<School, Shading>()

/** A school's ramps and where its stone sits on them. Derived once. */
export function shadingOf(school: School): Shading {
  const held = shadings.get(school)
  if (held !== undefined) return held
  // The wall's tones: its mortar, its four bricks, its pale cell, its grime,
  // its damp and its moss. All of them, so the ends bracket every one.
  const wall = specOf(
    [school.grime, school.mortar, ...school.brick, school.brickAlt, school.damp, school.moss],
    STEPS.wall,
    BEND.wall,
    TURN.wall,
    HEAT.wall,
  )
  const floor = specOf(
    [school.grime, school.mortar, ...school.flag],
    STEPS.floor,
    BEND.floor,
    TURN.floor,
    HEAT.floor,
  )
  const ceiling = specOf(
    [school.grime, ...school.slat],
    STEPS.ceiling,
    BEND.ceiling,
    TURN.ceiling,
    HEAT.ceiling,
  )
  const made: Shading = {
    wall,
    floor,
    ceiling,
    base: {
      // The commonest stone on each surface — the tone the old shaders
      // reached for in half of all cells, so a room starts from exactly
      // where it stood before the ramps arrived.
      wall: stepOf(wall, school.brick[1]),
      floor: stepOf(floor, school.flag[1]),
      ceiling: stepOf(ceiling, school.slat[0]),
    },
    light: {
      // art. 113: every school declares a station. This is the default —
      // the light you carry — and `schoolLight` overrides it per region,
      // because art. 114 says that is where identity now lives.
      station: school.station ?? 'with',
      reach: school.lamp?.reach ?? LIGHT.reach,
      lift: (school.lamp?.lift ?? LIGHT.lift) * DEEP,
      tint: school.glow ?? school.bone[0],
      tintAmt: school.lamp?.tintAmt ?? LIGHT.tintAmt,
    },
    // art. 16: the far end resolves into the same darkness the mouth is.
    air: { tint: school.hollow, rate: 1 },
  }
  shadings.set(school, made)
  return made
}

const looks = new Map<School, Look>()

/** Everything authorial about how a room is lit and coloured (art. 21). */
export function lookOf(school: School): Look {
  const held = looks.get(school)
  if (held !== undefined) return held
  const shading = shadingOf(school)
  const made: Look = {
    palette: roomPalette(school),
    ramps: {
      wall: ramp(shading.wall),
      floor: ramp(shading.floor),
      ceiling: ramp(shading.ceiling),
    },
    light: shading.light,
    air: shading.air,
  }
  looks.set(school, made)
  return made
}
