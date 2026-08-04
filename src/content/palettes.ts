import type { RoomPalette } from '../room/index.js'

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
}

/** The six colours the box itself needs, drawn out of a school. */
export function roomPalette(school: School): RoomPalette {
  return {
    edge: school.edge,
    rim: school.brickAlt,
    dark: '#000000',
    haze: school.grime,
    hollow: school.hollow,
    breath: school.breath,
  }
}
