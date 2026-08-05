/**
 * The bestiary and the hoard — things drawn once, by hand (arts 100, 115).
 *
 * Every shape here is a grid of *ramp indices*, never colours: `0`–`9` walk
 * the room's own ramp from its dark end to its light, `.` is nothing, `*` is
 * a light that carries, and `+` is metal. The school colours them at paint
 * time, so one drawing is one object in fourteen keys — the skull in the
 * ossuary and the skull in the drowned are the same skull, lit differently.
 *
 * Nothing below is hand-shaded (art. 115). Where a thing looks lit from one
 * side in the frame, that is the rim, derived from the shape's own distance
 * field against wherever the room's light happens to stand. A highlight
 * painted in here would be right in one room and wrong in the other
 * thirteen.
 *
 * Drawings are small on purpose. Readable size is a property of the drawing
 * (art. 100), so a thing declares the distance past which it is not placed
 * rather than letting the projection shrink it into noise.
 */

import type { Drawn } from '../../room/index.js'
import { drawn } from '../../room/index.js'

// ── The bestiary ───────────────────────────────────────────────────────

/**
 * The hanged. Whatever it was, it is not touching the floor, and the rope
 * goes up further than the light does.
 */
export const HANGED: Drawn = drawn([
  '......22......',
  '......22......',
  '......22......',
  '.....3333.....',
  '....344443....',
  '....345543....',
  '....344443....',
  '.....3443.....',
  '....455554....',
  '...45544554...',
  '..4554..4554..',
  '..455....554..',
  '...44....44...',
  '....4....4....',
  '....44..44....',
  '.....4..4.....',
  '.....3..3.....',
  '.....3..3.....',
  '.....33.33....',
  '.....22.22....',
])

/**
 * The lantern-bearer. It is stooped because of what it carries, and what it
 * carries is the only light in the room it stands in.
 */
export const BEARER: Drawn = drawn([
  '.....444......',
  '....45554.....',
  '....45554.....',
  '.....444......',
  '...4444444....',
  '..455555554...',
  '..455555554...',
  '..4555555+4...',
  '...4555554+...',
  '...455555+*+..',
  '...45555+***+.',
  '...4555.+***+.',
  '...4555..+*+..',
  '...4555...+...',
  '...44.44......',
  '...4...44.....',
  '...4....4.....',
  '..44....44....',
  '..33....33....',
])

/**
 * The many. Low, wide, and it does not have a front — the legs are the same
 * on every side, which is the thing about it that is wrong.
 */
export const MANY: Drawn = drawn([
  '..............',
  '..2........2..',
  '..32......23..',
  '...3......3...',
  '...33....33...',
  '..3344444433..',
  '.334555555433.',
  '.34556666543..',
  '2345667766542.',
  '34566788876543',
  '34567899987653',
  '.345678887654.',
  '..3456666543..',
  '..3345555433..',
  '...33444433...',
  '..33......33..',
  '.23........32.',
  '.2..........2.',
])

/**
 * The choir. Small faces, too many of them, at the height a child's would
 * be — the rhyme with what waits at the bottom, arriving long before the
 * sentence does.
 */
export const CHOIR: Drawn = drawn([
  '..............',
  '...44....44...',
  '..4554..4554..',
  '..4664..4664..',
  '..4554..4554..',
  '...44....44...',
  '....44554444..',
  '...444554444..',
  '..45544554554.',
  '..46644664664.',
  '..45544554554.',
  '...4444444444.',
  '....44444444..',
  '.....444444...',
  '....33333333..',
  '...3333333333.',
  '...3.3.3..3.3.',
  '...3.3.3..3.3.',
])

/** Something with a long neck that is not looking at you yet. */
export const WATCHER: Drawn = drawn([
  '........444...',
  '.......45554..',
  '.......46654..',
  '.......45554..',
  '........444...',
  '........44....',
  '.......44.....',
  '......44......',
  '.....44.......',
  '....44........',
  '...444........',
  '..44554.......',
  '.4555554......',
  '.455665554....',
  '.455555554....',
  '.445555554....',
  '..4455554.....',
  '...44..44.....',
  '...3....3.....',
  '..33....33....',
])

// ── The hoard ──────────────────────────────────────────────────────────

/** A skull, and it is the plainest thing in this file on purpose. */
export const SKULL: Drawn = drawn([
  '..55555..',
  '.5666665.',
  '567777765',
  '56111.165',
  '56111.165',
  '567777765',
  '.5677765.',
  '.56.7.65.',
  '..55555..',
  '..5.5.5..',
])

/** A lantern, still burning. The one thing in the hoard that lights itself. */
export const LANTERN: Drawn = drawn([
  '...+++...',
  '..+...+..',
  '.+.....+.',
  '+++++++++',
  '+*******+',
  '+**666**+',
  '+**666**+',
  '+*******+',
  '+++++++++',
  '..+++++..',
])

/** A ring, and the finger it did not come off cleanly. */
export const RING: Drawn = drawn([
  '..+++..',
  '.+...+.',
  '+..*..+',
  '+.....+',
  '.+...+.',
  '..+++..',
  '...3...',
  '..333..',
])

/** A knife, buried to the grip in something that is no longer there. */
export const KNIFE: Drawn = drawn([
  '....++....',
  '....++....',
  '....++....',
  '...++++...',
  '..++++++..',
  '...4444...',
  '...4554...',
  '...4554...',
  '...4444...',
  '....44....',
])

/** A bottle. Whatever is in it has not moved in a long time. */
export const BOTTLE: Drawn = drawn([
  '...33...',
  '...33...',
  '..3443..',
  '.344443.',
  '.355553.',
  '.366663.',
  '.366663.',
  '.366663.',
  '.355553.',
  '.344443.',
  '..3333..',
])

/** Coins, spilled and not picked up, which says something about this place. */
export const COINS: Drawn = drawn([
  '...............',
  '....++...++....',
  '...+**+.+**+...',
  '...+**+.+**+...',
  '..++++.++++....',
  '.+**+.+**++**+.',
  '.+**+.+**++**+.',
  '..++...++..++..',
])

// ── What stands in a room and is not alive ─────────────────────────────

/** A brazier. It is the light, so the room around it takes its station. */
export const BRAZIER: Drawn = drawn([
  '....***....',
  '...*****...',
  '..***7***..',
  '.****7****.',
  '..*******..',
  '.+++++++++.',
  '.+8888888+.',
  '..+66666+..',
  '...+444+...',
  '....+++....',
  '.....+.....',
  '....+++....',
  '...++.++...',
  '..++...++..',
])

/** A throne, and nobody has sat in it for as long as the stone has been cold. */
export const THRONE: Drawn = drawn([
  '..6666666..',
  '..6555556..',
  '..6544456..',
  '..6544456..',
  '..6544456..',
  '..6544456..',
  '..6555556..',
  '.665555566.',
  '.655555556.',
  '.666666666.',
  '.65.....56.',
  '.65.....56.',
  '.66.....66.',
  '.55.....55.',
  '.44.....44.',
])

/** A statue with the head gone. Somebody took it, or something did. */
export const STATUE: Drawn = drawn([
  '....5555....',
  '...555555...',
  '...5.....5..',
  '..55555555..',
  '..56666665..',
  '..56666665..',
  '.5566666655.',
  '.5666666665.',
  '.5666666665.',
  '..56666665..',
  '..55666655..',
  '...555555...',
  '..55555555..',
  '.5555555555.',
  '.6666666666.',
  '.6666666666.',
])

/** Mushrooms, and two of them are lit from the inside. */
export const CAPS: Drawn = drawn([
  '...............',
  '.....666.......',
  '....66*66..66..',
  '....66666.6*6..',
  '.....444..6666.',
  '.66..444...44..',
  '6*666.44...44..',
  '666666.4...4...',
  '..444..4...4...',
  '..444..4...4...',
])

/** A cage, and the door of it is open. */
export const CAGE: Drawn = drawn([
  '..+++++++..',
  '.+++++++++.',
  '.+.+.+.+.+.',
  '.+.+.+.+.+.',
  '.+.+.+.+.+.',
  '.+.+.+.+.+.',
  '.+.+.+.+.+.',
  '.+.+.+.+.+.',
  '.+.+.+.+.+.',
  '.+++++++++.',
  '.+.......+.',
  '.+++++++++.',
])

/** A bell, cracked, hung too low to ring. */
export const BELL: Drawn = drawn([
  '....+++....',
  '...+++++...',
  '..++777++..',
  '..+77777+..',
  '.+7777.77+.',
  '.+777..77+.',
  '+7777..777+',
  '+777....77+',
  '+7777..777+',
  '.+++++++++.',
  '..+++.+++..',
  '.....+.....',
])
