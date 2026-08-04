import type { Body } from '../state/index.js'
import { BASE_ARMOR } from './items.js'

/**
 * The body you wake with. arts 47 and 60 make health, armor, and hand size
 * stats rather than constants — which is exactly why the numbers live here.
 *
 * art. 55: the start is bare. The demo's blocked 3 comes from the Rusted
 * Plate, not the body, so a bare player blocks nothing (the ruling of
 * 2026-08-04).
 */
export const YOUR_HEALTH_AT_WAKING = 26

export const BARE_BODY: Body = { health: YOUR_HEALTH_AT_WAKING, armor: BASE_ARMOR }
