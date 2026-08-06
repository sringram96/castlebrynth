import type { Body } from '../state/index.js'
import { BASE_ARMOR } from './items.js'

/**
 * The body you wake with. arts 47 and 60 make health, armor, and hand size
 * stats rather than constants — which is exactly why the numbers live here.
 *
 * art. 55: the start is bare. The demo's blocked 3 comes from the Rusted
 * Plate, not the body, so a bare player blocks nothing (the ruling of
 * 2026-08-04).
 *
 * **Sixty-four, by the levels wave (card 89).** It was twenty-six, and
 * twenty-six is the number the whole arithmetic pass turned on: against the
 * Gnawing's script a body of twenty-six is dead on the fourth intent
 * whatever it does, so **every fight was over in three or four turns** —
 * the escalation never came round, BELLOW never landed, and the top of the
 * ladder was decoration. The body is what a fight's *length* is made of,
 * and a fight that cannot reach its fifth turn cannot have a fifth turn's
 * beat in it.
 *
 * Sixty-four is the first body that survives the Gnawing's whole script
 * once (fifty-one) and dies to the loop coming round (sixty-one, then
 * seventy), which is exactly the shape the horror was authored for. What
 * moved with it is on the horrors' side: the bleeds and the hungers, which
 * are taxes on a body and were sized against the old one. What did not move
 * is the priced acts (art. 120) and the Leech's heal — both are a smaller
 * share of a body than they were, and that is recorded in DESIGN.md as a
 * finding rather than fixed here, because neither was a lever this wave was
 * given.
 */
export const YOUR_HEALTH_AT_WAKING = 64

export const BARE_BODY: Body = { health: YOUR_HEALTH_AT_WAKING, armor: BASE_ARMOR }
