import type { RoomPalette } from '../room/index.js'

/**
 * art. 21: light and palette are authorial, chosen per scene. There is no
 * global light rule, so these are two schools and not two settings.
 *
 * Both are lifted from `reference/castlebrynth-wake-v3.html`, which wins
 * ties about intent.
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
