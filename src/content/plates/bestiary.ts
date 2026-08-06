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
 *
 * **A loop's frames share one silhouette** (arts 107, 110). Animation is
 * overlay repaint on the frame the cast already made, so a frame that covers
 * fewer cells than the one under it leaves the one under it showing — a
 * flame that shrank would smear. What an authored frame varies is what its
 * cells are *made of*, never which cells it has: the fire moves through the
 * flame rather than the flame changing shape, and the blink is the same face
 * with the light out of it.
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
 * art. 107: the bearer's lantern, moving. The same stoop, the same lamp, and
 * the fire running through it — two further frames, and no cell of the
 * silhouette moves in either.
 */
export const BEARER_FRAMES: readonly Drawn[] = [
  BEARER,
  drawn([
    '.....444......',
    '....45554.....',
    '....45554.....',
    '.....444......',
    '...4444444....',
    '..455555554...',
    '..455555554...',
    '..4555555+4...',
    '...4555554+...',
    '...455555+7+..',
    '...45555+*7*+.',
    '...4555.+7**+.',
    '...4555..+*+..',
    '...4555...+...',
    '...44.44......',
    '...4...44.....',
    '...4....4.....',
    '..44....44....',
    '..33....33....',
  ]),
  drawn([
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
    '...45555+7*7+.',
    '...4555.+*7*+.',
    '...4555..+7+..',
    '...4555...+...',
    '...44.44......',
    '...4...44.....',
    '...4....4.....',
    '..44....44....',
    '..33....33....',
  ]),
]

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

/**
 * art. 108: the choir, with the light out of it. One frame, very rarely, and
 * the same faces — what goes out is the lit point in each of them, which is
 * the smallest change in this file and the loudest.
 */
export const CHOIR_DARK: Drawn = drawn([
  '..............',
  '...44....44...',
  '..4554..4554..',
  '..4334..4334..',
  '..4554..4554..',
  '...44....44...',
  '....44554444..',
  '...444554444..',
  '..45544554554.',
  '..43344334334.',
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

/** art. 108: the same, for the long neck. It is not looking at you now. */
export const WATCHER_DARK: Drawn = drawn([
  '........444...',
  '.......45554..',
  '.......43354..',
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
  '.455335554....',
  '.455555554....',
  '.445555554....',
  '..4455554.....',
  '...44..44.....',
  '...3....3.....',
  '..33....33....',
])

/**
 * THE SILT MOTHER — the drowned's unique (card 29).
 *
 * Only what the water gives back. She is drawn tall and narrow and given
 * away by two lights: the eyes are `*`, so they burn at the top of the ramp
 * whatever school she is standing in, and everything else takes the room's
 * own light like the stone does. Nothing about her is hand-shaded — the way
 * the silt catches down one side is the rim, derived (art. 115).
 */
export const SILT_MOTHER: Drawn = drawn([
  '....455554....',
  '...45566554...',
  '...45*66*54...',
  '...45666654...',
  '...44566544...',
  '....455554....',
  '....455554....',
  '..3455555543..',
  '.345555555543.',
  '.345566665543.',
  '34556666665543',
  '.345566665543.',
  '.345555555543.',
  '.345555555543.',
  '..3455555543..',
  '..3455555543..',
  '..3445555443..',
  '...34444443...',
  '...3.3..3.3...',
  '...3.3..3.3...',
])

/**
 * THE KINDLED — the burnt's unique (card 29).
 *
 * Char over a fire that never went out. The cracks are `*`: the light in it
 * is its own and not the room's, so it reads the same in a room lit from
 * below as in one lit from ahead. Its plate is `+`, because whatever it was
 * wearing is still on it.
 */
export const KINDLED: Drawn = drawn([
  '.....333.....',
  '....33333....',
  '...3*333*3...',
  '...3333333...',
  '....33333....',
  '.....222.....',
  '...2222222...',
  '..222*2*222..',
  '..+2223222+..',
  '..+222*222+..',
  '..+2223222+..',
  '...2*222*2...',
  '...2222222...',
  '...222.222...',
  '...22...22...',
  '..222...222..',
  '..22.....22..',
  '.222.....222.',
])

/**
 * THE WARDEN — the keeper the door was built for (card 31).
 *
 * Hooded, and wider at the shoulder than the aperture it stands behind:
 * art. 30's advance done by a thing that was always too big for the room.
 * The iron is `+` — the bands of the door, worn — and the one light in it
 * is what is under the hood, which is the only part of it there is to read.
 */
export const WARDEN_KEEPER: Drawn = drawn([
  '.......5555.......',
  '.....55666655.....',
  '....5566666655....',
  '...556611116655...',
  '...56611**11665...',
  '...566111111665...',
  '...566611116665...',
  '..55666666666655..',
  '.5566666666666655.',
  '556666666666666655',
  '566+++666666+++665',
  '5666++6666666++665',
  '566666666666666665',
  '.5666666666666665.',
  '.5666666666666665.',
  '.5666666666666665.',
  '..56666666666665..',
  '..566666..666665..',
  '..56666....66665..',
  '..5666......6665..',
  '..555........555..',
  '..44..........44..',
])

/**
 * THE GNAWING — the depth's own horror, drawn (card 78).
 *
 * It was a `lurker` at the far end and the hinge's default mass in the
 * fight, which is to say it was a dark smear in both places. Art. 100 is
 * blunt about why that fails: **procedural scatter has no silhouette, and
 * silhouette is most of legibility at this scale.** A horror a run meets
 * five times has to be the same thing all five, and a smear cannot be.
 *
 * It is drawn as what its script says it is. It swipes, it bellows and it
 * covets, so it is **wide and low and mostly jaw** — the opposite silhouette
 * to the Warden's tall hood and to the Marrow's ribs, which is the whole
 * point of drawing it at all. The teeth are the top of the ramp and the
 * mouth behind them is the bottom of it; the two eyes are `*`, so they burn
 * in whatever school it is standing in and are the last thing to go dark.
 */
export const GNAWING: Drawn = drawn([
  '....343........343....',
  '...34543......34543...',
  '..346666666666666643..',
  '.34111111666611111143.',
  '.341****166661****143.',
  '.341****166661****143.',
  '.34111111666611111143.',
  '..346666666666666643..',
  '...3455555555555543...',
  '..349911991199119943..',
  '..349911991199119943..',
  '..341111111111111143..',
  '..341199119911991143..',
  '..341199119911991143..',
  '...3455555555555543...',
  '...344443....344443...',
  '..3444443....3444443..',
  '..3444443....3444443..',
])

/**
 * THE MARROW — the ossuary's unique, drawn (card 78).
 *
 * The same debt as the Gnawing's and the same fix. Where the Gnawing is all
 * jaw, this is all **frame**: a skull on a barred ribcage on two long legs,
 * so the two of them cannot be confused at any distance the projection
 * leaves them readable at. The dark between the ribs is the body's own
 * lowest step rather than a hole — a ribcage you can see the room through
 * would break its silhouette, and the silhouette is the thing being bought.
 */
export const MARROW: Drawn = drawn([
  '......3443......',
  '.....346643.....',
  '....34*66*43....',
  '....34666643....',
  '.....345543.....',
  '.....325243.....',
  '.......33.......',
  '.......33.......',
  '...3466666643...',
  '...3111441113...',
  '..346666666643..',
  '..311114411113..',
  '..346666666643..',
  '..311114411113..',
  '..346666666643..',
  '..311114411113..',
  '...3466666643...',
  '...3111441113...',
  '....34555543....',
  '.....344443.....',
  '....34....43....',
  '....34....43....',
  '....34....43....',
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

/** art. 107: the same lantern, with the flame turning over inside it. */
export const LANTERN_FRAMES: readonly Drawn[] = [
  LANTERN,
  drawn([
    '...+++...',
    '..+...+..',
    '.+.....+.',
    '+++++++++',
    '+**7**7*+',
    '+*7666**+',
    '+**666*7+',
    '+*7***7*+',
    '+++++++++',
    '..+++++..',
  ]),
  drawn([
    '...+++...',
    '..+...+..',
    '.+.....+.',
    '+++++++++',
    '+*7***7*+',
    '+**666*7+',
    '+*7666**+',
    '+**7**7*+',
    '+++++++++',
    '..+++++..',
  ]),
]

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

/**
 * art. 107: the brazier burning. Three authored frames on the slow clock, and
 * the flame's outline is the same cell for cell in all three — what moves is
 * the fire inside it, which is what fire actually does at this scale.
 */
export const BRAZIER_FRAMES: readonly Drawn[] = [
  BRAZIER,
  drawn([
    '....*7*....',
    '...**8**...',
    '..*7***8*..',
    '.***7*8***.',
    '..**8*7**..',
    '.+++++++++.',
    '.+8888888+.',
    '..+66666+..',
    '...+444+...',
    '....+++....',
    '.....+.....',
    '....+++....',
    '...++.++...',
    '..++...++..',
  ]),
  drawn([
    '....8**....',
    '...*7*8*...',
    '..**8*7**..',
    '.**8***7**.',
    '..*7***8*..',
    '.+++++++++.',
    '.+8888888+.',
    '..+66666+..',
    '...+444+...',
    '....+++....',
    '.....+.....',
    '....+++....',
    '...++.++...',
    '..++...++..',
  ]),
]

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

/**
 * An urn. Somebody was put in it, and the lid is off — which is the whole
 * of what a bonefield has to say about the people banked against its walls.
 */
export const URN: Drawn = drawn([
  '..66666666..',
  '.6777777776.',
  '..44444444..',
  '...555555...',
  '..55666655..',
  '.5566666655.',
  '.5666666665.',
  '.5666666665.',
  '.5566666655.',
  '..5566665...',
  '...555555...',
  '....5555....',
  '...555555...',
  '..66666666..',
  '..44444444..',
])

// ── The covered font (card 88) ─────────────────────────────────────────

/**
 * **The covered font, shut.** A stone basin at waist height with cloth
 * stretched over the top of it and tied off under the rim.
 *
 * The cloth is the light end of the ramp and the stone is the middle of it,
 * so the eye reads the cloth first — which is the room's whole composition
 * (art. 104): one thing, and the thing is a lid somebody tied down. The two
 * dark cells at the centre of the cloth are where it is wet through from
 * underneath, and they are the only lie the room tells before it is asked a
 * question.
 */
export const COVERED_BASIN: Drawn = drawn([
  '..777777777..',
  '.77788877777.',
  '7778888888777',
  '7788811188877',
  '7788111118877',
  '7778811188777',
  '.77788887777.',
  '.66666666666.',
  '.65555555556.',
  '..655555556..',
  '..655555556..',
  '...6555556...',
  '...6555556...',
  '....65556....',
  '....65556....',
  '...6555556...',
  '..66666666...',
  '..55555555...',
])

/**
 * **The cloth back, and the water still in it** — what the basin is after
 * the stone has been taken out of it (art. 89: the forfeiture shows in
 * pixels, and so does the take).
 *
 * The cloth is folded off to one side rather than gone, because a cloth that
 * vanished would be a cloth that was never tied on (art. 70).
 */
export const OPEN_BASIN: Drawn = drawn([
  '.....444.....',
  '....44444....',
  '.66666666666.',
  '.63333333336.',
  '.63222222236.',
  '.63222222236.',
  '.66333333366.',
  '.66666666666.',
  '.65555555556.',
  '..655555556..',
  '..655555556..',
  '...6555556...',
  '...6555556...',
  '....65556....',
  '....65556....',
  '...6555556...',
  '..66666666...',
  '..55555555...',
])

/**
 * **Gone over.** Reading the inside of the lip means leaning the basin, and
 * what was in the water goes with it — so the third state is a basin tipped
 * on its foot and a floor that is wet where it was dry.
 *
 * It is the same silhouette as the other two down the stem, so the three
 * read as one object in three states rather than as three objects
 * (art. 100's argument about silhouette, applied along time).
 */
export const SPILLED_BASIN: Drawn = drawn([
  '....444......',
  '...44444.....',
  '.6666666.....',
  '.6333333666..',
  '.63222233366.',
  '.66333322236.',
  '..66663333366',
  '.66666666666.',
  '.65555555556.',
  '..655555556..',
  '..655555556..',
  '...6555556...',
  '...6555556...',
  '....65556....',
  '....65556....',
  '...6555556...',
  '.166666666.1.',
  '11555555551 1',
])
