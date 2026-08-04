/**
 * Every player-facing word. rules/voice.md binds all of it: second person,
 * present tense, no "you feel", no jokes, no exclamation marks, one candle
 * of text at a time — a beat is ~45 words or fewer. The labyrinth never
 * explains itself twice.
 *
 * Engine code contains no prose. This is the only file that says anything
 * out loud.
 *
 * **Placeholder, this tranche.** The skeleton walks before the cover goes
 * on: what follows is functional second person, not the register. The
 * register pass is a later task, and the debt is written in DESIGN.md.
 */

/** The word band, one candle at a time (art. 29). */
export const BEATS: Readonly<Record<string, readonly string[]>> = {
  'room.crossing': [
    'You wake. The ceiling is close enough to touch.',
    'Six bones lie in your open hand. One of them is paler than the rest.',
    'The corridor goes down. Behind you the stone is unbroken.',
  ],
  'room.passage.drip': [
    'A long room. Water runs somewhere under the floor.',
    'The far end narrows to a door.',
  ],
  'room.trove.alcove': [
    'An alcove, cut square into the wall.',
    'A key lies in the dust at the back of it.',
  ],
  'room.lair.gnawing': [
    'A low room. The floor is bare where something drags across it.',
    'The door at the far end breathes.',
  ],
  'room.passage.ash': [
    'A short room. Ash banks against both walls.',
    'The stair down starts past the door.',
  ],
  'room.warden': [
    'The room ends in a door of black iron.',
    'There is one lock, and it is not small.',
  ],
}

/** Tappable nouns are concrete and singular (voice). */
export const NOUNS: Readonly<Record<string, string>> = {
  'crossing.grate': 'the grate',
  'crossing.bones': 'the bones',
  'crossing.traveler': 'the traveler',
  'crossing.chain': 'the chain',
  'drip.water': 'the water',
  'alcove.key': 'the key',
  'alcove.dust': 'the dust',
  'lair.drag': 'the drag mark',
  'ash.ash': 'the ash',
  'warden.lock': 'the lock',
  'warden.door': 'the black door',
}

/** What looking answers. Looking is free and always answers (art. 6). */
export const LOOKS: Readonly<Record<string, string>> = {
  'crossing.grate': 'Light comes down through iron you cannot reach.',
  'crossing.bones': 'Six bones, worn smooth. The pale one fits your thumb.',
  'crossing.traveler': 'A traveler lies along the wall. The cloak has gone stiff.',
  'crossing.chain': 'A chain comes out of the dark above and stops short of the floor.',
  'drip.water': 'The water goes under the wall and keeps going.',
  'alcove.key': 'Iron, long as your palm, cut with three teeth.',
  'alcove.dust': 'Dust, and the shape of something lifted out of it.',
  'lair.drag': 'A wide smear in the dust, from the door to the corner and back.',
  'ash.ash': 'Ash, banked and cold. Nothing burns here now.',
  'warden.lock': 'One keyhole, cut for three teeth.',
  'warden.door': 'Black iron. The stone around it is scored where it swings.',
}

/** A door's sense is one line — true, and incomplete (voice). */
export const DOOR_SENSES: Readonly<Record<string, string>> = {
  'room.crossing': 'The corridor behind you is stone, and stays stone.',
  'room.passage.drip': 'Water runs down the far side of this one.',
  'room.trove.alcove': 'Cold air comes under this one, and the smell of iron.',
  'room.lair.gnawing': 'Behind this one, something wet is scratching.',
  'room.passage.ash': 'Ash comes under this one and settles on your boot.',
  'room.warden': 'Nothing comes from this one. The nothing goes on a long way.',
}

/** One line per death, and one for the door that is not a death (art. 11). */
export const END_LINES: Readonly<Record<string, string>> = {
  'end.gnawing': 'The Gnawing opens you and goes back to its corner.',
  'end.warden': 'The Warden stands aside. The stair keeps going down.',
}

/**
 * What each intent means, said once. art. 42 shows the number; this says
 * what the number will do to the plan (art. 65).
 */
export const INTENT_SAYS: Readonly<Record<string, string>> = {
  SWIPE: 'It swipes at you.',
  SEAL: 'It jams your pair combos. Pair-shaped lines are shut this turn.',
  COVET: 'It curses your sixes. Sixes count as nothing this turn.',
  CORRODE: 'It spits something corrosive. Your armor does nothing this turn.',
  BELLOW: 'It takes a long breath.',
}

/** The lines the shell says at the seams of a run. */
export const NOTICES: Readonly<Record<string, string>> = {
  'door.locked': 'The lock holds. Whatever opens it is not on you.',
  'fight.won': 'The room goes quiet. The door gives.',
  'fight.fled': 'You back out of the door. It is still in there.',
  'run.dead': 'The floor comes up. The run ends here.',
  'run.finished': 'You go through, and the stair keeps going down.',
  'book.empty': 'Nothing is written here yet.',
  'book.title': 'The Book of Ends.',
}

/**
 * The names that reach the player: combos, items, rooms, horrors, verbs.
 * They are labels, not sentences, and the lint judges them as labels — the
 * ruling of 2026-08-04.
 */
export const LABELS: Readonly<Record<string, string>> = {
  'horror.gnawing': 'the gnawing',
  'room.crossing': 'the crossing',
  'room.passage.drip': 'the wet passage',
  'room.trove.alcove': 'the alcove',
  'room.lair.gnawing': 'the low room',
  'room.passage.ash': 'the ash passage',
  'room.warden': "the warden's door",
  'act.take-key': 'take the key',
  'item.warden-key': 'the iron key',
  'die.plain': 'a plain bone',
  'die.orphan': 'the orphan',
  'die.sisters': 'the sisters',
  'die.leech': 'the leech',
  'talisman.ossuary': 'the ossuary',
  'talisman.zealot': 'the zealot',
  'wearable.rusted-plate': 'the rusted plate',
}
