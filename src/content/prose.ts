/**
 * Every player-facing word. rules/voice.md binds all of it: second person,
 * present tense, no "you feel", no jokes, no exclamation marks, one candle
 * of text at a time — a beat is ~45 words or fewer. The labyrinth never
 * explains itself twice.
 *
 * Engine code contains no prose. This is the only file that says anything
 * out loud.
 *
 * One exception, and it is a law rather than a leak: `VERBS` are controls,
 * and art. 66 exempts controls from the voice register and binds them to
 * itself instead — a plain imperative verb, two words or fewer. They are
 * linted against that rule and not against this file's.
 *
 * **Placeholder, this tranche.** The register pass is a later task, and the
 * debt is written in DESIGN.md. What is *not* placeholder any more is that
 * every room says its own name in its first candle: art. 34 hangs knowledge
 * on room identity, and a room the player cannot name is a room they cannot
 * learn.
 */

/** The word band, one candle at a time (art. 29). */
export const BEATS: Readonly<Record<string, readonly string[]>> = {
  'room.crossing': [
    'The Crossing. You wake, and the ceiling is close enough to touch.',
    // arts 55–56: five bones against a hand that holds six. The hole is the
    // whole of the invitation, and the room does not explain it.
    'Five bones lie in your open hand. Your hand holds six.',
    'The corridor goes down. Behind you the stone is unbroken.',
  ],
  'room.passage.drip': [
    'The wet passage. Water runs in a cut down the middle of the floor.',
    'Three seams in the ceiling let it in. The far end narrows to a door.',
  ],
  // art. 83: the room says the room. What stands in it says itself.
  'room.sanctum.font': [
    'The font. Three shallow steps go down to a floor under a hand of water.',
    'Nothing drips. Whatever fills this comes up rather than down.',
  ],
  'room.trove.alcove': [
    'The alcove, cut square into the right-hand wall of a low room.',
    'The dust at the back of it lies deep enough to hold a print.',
  ],
  'room.passage.stair': [
    'The stair. It goes down in short flights, and the flights do not line up.',
    'Grit slides off each tread and keeps going without you.',
  ],
  'room.lair.cistern': [
    'The cistern. Black water lies flat across the whole floor.',
    'It gives back one line of light and nothing else.',
  ],
  'room.trove.sump': [
    'The sump. The floor tilts to a grate, and what the depth loses ends here.',
    'Silt banks against the walls in a tidemark at knee height.',
  ],
    'room.trove.buried': [
    'The buried hall. Sand comes in from both walls and meets in a ridge across the middle.',
    'A skull sits on the ridge where the sand put it.',
    'Something hangs above the far slope, clear of it.',
  ],
  'room.hall.throne': [
    'The throne hall. The ceiling goes up past what the light reaches.',
    'A chair stands at the far end, on a floor worn smooth in front of it.',
    'Two braziers still burn. Nobody set them going.',
  ],
  'room.passage.sewer': [
    'The sewer. The vault is low enough to touch and the channel runs down the middle.',
    'Caps grow along the ledge. Two of them are lit from inside.',
  ],
  'room.open.barrow': [
    'The barrow. There is no roof here, and the stars are wrong.',
    'Two statues stand out on the ground with the heads gone.',
    'Something hangs between them, well clear of the grass.',
  ],
  'room.lair.choir': [
    'The choir. Small faces crowd the far wall, at the height a child stands.',
    'A cage sits open beside them. Whatever it held is out.',
  ],
  'room.trove.hoard': [
    'The hoard. Coins lie spilled across the floor and nobody is coming for them.',
    'A lantern still burns in a niche. A knife stands upright in the stone.',
  ],
  'room.puzzle.watcher': [
    'The watcher. A long neck comes up out of the floor and the head faces away.',
    'A skull lies at the foot of it, set down and facing up.',
  ],
  'room.lair.crawl': [
    'The crawl. The ceiling is low and the floor is scored from wall to wall.',
    'Something wide sits in the middle of the scoring, and it has no front.',
  ],
  'room.passage.ash': [
    'The ash passage. Ash banks against both walls and pales the flagstones.',
    'Nothing moves it. The way down starts past the door.',
  ],
  'room.lair.kiln': [
    'The kiln. A brick mouth gapes in the left wall, tall enough to walk into.',
    'The stone around it keeps a little of the heat.',
  ],
  'room.omen.pyre': [
    'The pyre. Timber stacks in a square, burnt through and holding its shape.',
    'Nothing on it is bone. Whatever it burned, it burned somewhere else.',
  ],
  'room.lair.den': [
    'The den. A wide mark drags across the floor and turns at the corner.',
    'The door at the far end breathes.',
  ],
  'room.passage.bonefield': [
    'The bonefield. Bone banks against both walls the way ash does elsewhere.',
    'None of it matches. None of it is small.',
  ],
  'room.puzzle.tally': [
    'The tally. Scratches run the length of the right wall, cut in fives.',
    'The last group stops at four.',
  ],
  'room.warden': [
    "The Warden's door. Black iron, three bands, no seam.",
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
  'alcove.dust': 'the dust',
  'stair.tread': 'the tread',
  'cistern.water': 'the black water',
  'sump.grate': 'the grate',
  'buried.sand': 'the sand',
  'buried.skull': 'the skull',
  'throne.seat': 'the throne',
  'throne.bell': 'the bell',
  'sewer.channel': 'the channel',
  'sewer.caps': 'the caps',
  'barrow.sky': 'the sky',
  'barrow.statue': 'the statue',
  'barrow.hanged': 'the hanged',
  'choir.cage': 'the cage',
  'choir.faces': 'the faces',
  'hoard.coins': 'the coins',
  'hoard.lantern': 'the lantern',
  'hoard.ring': 'the ring',
  'watcher.neck': 'the neck',
  'watcher.skull': 'the skull',
  'crawl.legs': 'the legs',
  'ash.ash': 'the ash',
  'kiln.mouth': 'the kiln mouth',
  'pyre.timber': 'the timber',
  'den.drag': 'the drag mark',
  'bonefield.bone': 'the bone',
  'tally.marks': 'the scratches',
  'font.step': 'the step',
  'warden.lock': 'the lock',
  'warden.door': 'the black door',
  // art. 83: what stands in a socket names itself, wherever it stands.
  'gnawing.shape': 'the wet shape',
  'marrow.shape': 'the tall shape',
  'key.iron': 'the iron key',
  'basin.water': 'the basin',
  'mender.figure': 'the mender',
  'door.ahead': 'the door',
  // art. 86: the three who came down here first. A traveler is tapped as a
  // body, because that is what is on the floor; the bone is what you take.
  'traveler.pusher.thing': 'the open hand',
  'traveler.careful.thing': 'the folded cloak',
  'traveler.runner.thing': 'the boot',
  // arts 49, 87: the goods, as they lie. Concrete and singular (voice).
  'sister.elder.thing': 'the older bone',
  'sister.younger.thing': 'the younger bone',
  'leech.thing': 'the dark bone',
  'cord.thing': 'the knotted cord',
  'plate.thing': 'the rusted plate',
}

/** What looking answers. Looking is free and always answers (art. 6). */
export const LOOKS: Readonly<Record<string, string>> = {
  'crossing.grate': 'Light comes down through iron you cannot reach.',
  'crossing.bones': 'Five bones, worn smooth. Nothing is written on any of them.',
  'crossing.traveler': 'A traveler lies along the wall. The cloak has gone stiff.',
  'crossing.chain': 'A chain comes out of the dark above and stops short of the floor.',
  'drip.water': 'The water goes under the wall and keeps going.',
  'alcove.dust': 'Dust, undisturbed, and deep enough to hold a print.',
  'stair.tread': 'Each tread dips in the middle. A great many boots, or a few centuries.',
  'cistern.water': 'Flat, black, and deeper than the room is tall.',
  'sump.grate': 'Iron bars over a drop. Nothing comes back up it.',
  'buried.sand': 'Sand, banked to the walls. It is still coming in.',
  'buried.skull': 'A skull, half out of the sand. The jaw is somewhere under it.',
  'throne.seat': 'A stone chair, cold. The arms are worn smooth at the ends.',
  'throne.bell': 'A bell, cracked across. Hung too low to swing.',
  'sewer.channel': 'A channel, running. Whatever it carries, it carries down.',
  'sewer.caps': 'Caps, pale and packed. Two of them hold a light.',
  'barrow.sky': 'Sky, and stars in it. None of them are in the right places.',
  'barrow.statue': 'A statue, headless. The break is old and clean.',
  'barrow.hanged': 'A shape, hanging. The rope goes up past the light.',
  'choir.cage': 'A cage, open. The bars are bent outward.',
  'choir.faces': 'Faces, small and many. None of them has eyes yet.',
  'hoard.coins': 'Coins, spilled. Nobody is coming for them.',
  'hoard.lantern': 'A lantern, lit. Nothing here has fed it in a long time.',
  'hoard.ring': 'A ring, and part of a finger still in it.',
  'watcher.neck': 'A neck, long and stone. The head at the end faces away.',
  'watcher.skull': 'A skull, set down carefully. It faces the neck.',
  'crawl.legs': 'Legs, too many, and the same on every side.',
  'ash.ash': 'Ash, banked and cold. Nothing burns here now.',
  'kiln.mouth': 'Brick, glazed smooth by heat. The inside goes back further than the wall.',
  'pyre.timber': 'Charred through and still square. Nothing has knocked it down.',
  'den.drag': 'A wide smear in the dust, from the door to the corner and back.',
  'bonefield.bone': 'Long bones, none of them a pair, none of them yours yet.',
  'tally.marks': 'Someone counts something here. The counting continues.',
  'font.step': 'Worn through in the middle. A great many knees, and no boots.',
  'warden.lock': 'One keyhole, cut for three teeth.',
  'warden.door': 'Black iron. The stone around it is scored where it swings.',
  'gnawing.shape': 'It keeps to the far end. When you stop, the scratching stops.',
  'marrow.shape': 'It stands a head above the door beside it, and it does not lean.',
  'key.iron': 'Iron, long as your palm, cut with three teeth.',
  'basin.water': 'Copper, full to the lip, and still. It costs nothing.',
  'mender.figure': 'It sits with its hands open. Nothing about it moves but the breath.',
  'door.ahead': 'Shut. Nothing comes under it, and nothing goes through it but you.',
  // art. 86: a traveler answers as a body. The bone is what the act takes;
  // this is what the thumb finds when it asks.
  'traveler.pusher.thing': 'The hand is out and shut on one bone. There is nothing else on the body.',
  'traveler.careful.thing': 'The cloak is folded under the head. Nothing else down here is tidy.',
  'traveler.runner.thing': 'One boot points back the way you come from. The other is gone.',
  // arts 49, 87: the goods, as they lie.
  'sister.elder.thing': 'A bone with a notch cut in it. The notch is half a mark.',
  'sister.younger.thing': 'A bone with a notch cut in it, and the notch is cut twice.',
  'leech.thing': 'One face of it is stained darker than the others. The stain is not dust.',
  'cord.thing': 'Knotted at every hand’s width. The knots run out before the cord does.',
  'plate.thing': 'Iron, rusted through in two places, and neither of them over the heart.',
}

/**
 * art. 87, the item law: an item's origin explains its rules, in one
 * sentence, for every good that ships. It is prose and it owes
 * rules/voice.md like any beat — which is what stops it becoming flavour
 * text with the numbers repeated underneath.
 *
 * The dead are spoken of in the present tense and without a third person to
 * hide behind, because that is what the voice allows and because it is truer
 * anyway: down here they have not finished happening.
 */
export const ORIGINS: Readonly<Record<string, string>> = {
  'bone.pusher': 'The one who throws high, and again, and again, until the throw that lands low.',
  'bone.careful': 'The one who never throws high and never throws low, and dies here regardless.',
  'bone.runner':
    'The one who keeps the strong throw for the last room, and opens something reaching for it.',
  'bone.sister.elder':
    'Two who go down together, and are worth anything only when they land together.',
  'bone.sister.younger':
    'Two who go down together, and are worth anything only when they land together.',
  'bone.leech':
    'The habit of taking a little back off whatever you hit, which does not keep you alive.',
  'talisman.cord':
    'The cord of one who counts the way down in order, and what you claim in order scores a tier higher.',
  'wearable.rusted-plate':
    'Iron somebody wears down here, rusted through in two places, and still good for three.',
}

/**
 * art. 83: what stands in a socket says its own words. A room never says
 * them — that rule is what lets fourteen rooms hold thirty rooms' worth of
 * moments, and breaking it here would break it everywhere.
 */
export const SOCKET_BEATS: Readonly<Record<string, readonly string[]>> = {
  'enc.gnawing': ['Something wet scratches at the far end, and stops when you stop.'],
  'enc.marrow': ['A tall shape waits in the dark ahead. It does not narrow as you near it.'],
  'enc.iron-key': ['An iron key lies where the floor is worn, cut with three teeth.'],
  // art. 40: the place, and the being. Neither asks for anything.
  'enc.basin': ['A copper basin stands full at the foot of the steps. Nothing guards it.'],
  'enc.mender': ['Someone sits against the wall with their hands open, and waits.'],
  // art. 86: the dead say their own candle, the way everything in a socket
  // does. The room never mentions them.
  'enc.traveler.pusher': ['Someone lies against the wall with a hand out. There is a bone in it.'],
  'enc.traveler.careful': ['Someone lies folded on the floor, arranged, with a bone by the knee.'],
  'enc.traveler.runner': ['Someone lies half across the doorway, pointed the wrong way.'],
  'enc.sister.elder': ['A notched bone lies in the dust where a hand puts it down.'],
  'enc.sister.younger': ['A notched bone lies here on its own, and the notch is cut twice.'],
  'enc.leech': ['A bone lies apart from the grit, and one face of it is stained.'],
  'enc.cord': ['A knotted cord lies coiled where a hand lets go of it.'],
  'enc.plate': ['A plate of rusted iron lies flat on the stone. The straps are cut.'],
  /**
   * art. 89: the terms of a fork, said plainly and said first — before
   * either verb is on the strip, and once (the labyrinth never explains
   * itself twice). It names nothing: what the two things are is the thumb's
   * to find out (art. 68).
   */
  fork: ['Two things lie here. What you take closes what you leave.'],
}

/**
 * art. 78: the first room after the lock announces the arrival. Every run
 * arrives somewhere, and this is the somewhere saying so — once, in one
 * candle, and never again (the labyrinth never explains itself twice).
 */
export const ARRIVALS: Readonly<Record<string, readonly string[]>> = {
  'region.drowned': ['The floor slopes, and stays sloped. Everything under this runs to water.'],
  'region.burnt': ['The air dries out. Everything under this has burned once already.'],
  'region.ossuary': ['The walls go pale. Everything under this is bone, and set in courses.'],
}

/** One line per death, and one for the door that is not a death (art. 11). */
export const END_LINES: Readonly<Record<string, string>> = {
  'end.gnawing': 'The Gnawing opens you and goes back to its corner.',
  'end.marrow': 'The Marrow closes over you. The scratching starts again behind it.',
  'end.warden': 'The Warden stands aside. The stair keeps going down.',
  'end.kept': 'The door does not open, and the corridor behind you is stone.',
}

/**
 * What each intent means, said once. art. 42 shows the number; this says
 * what the number will do to the plan (art. 65). art. 73: the intent is
 * tappable, and this is what it answers with.
 */
export const INTENT_SAYS: Readonly<Record<string, string>> = {
  SWIPE: 'It swipes at you.',
  SEAL: 'It jams your pair combos. Pair-shaped lines are shut this turn.',
  COVET: 'It curses your sixes. Sixes count as nothing this turn.',
  CORRODE: 'It spits something corrosive. Your armor does nothing this turn.',
  BELLOW: 'It takes a long breath.',
  REND: 'It opens you from the shoulder down.',
}

/** The lines the shell says at the seams of a run. */
export const NOTICES: Readonly<Record<string, string>> = {
  'door.locked': 'The lock holds. Whatever opens it is not on you.',
  // arts 31, 77: a door's sense would be its region tag leaking, and the
  // hint system is parked. A door still answers — it answers with itself.
  'door.blind': 'Shut, and giving nothing away. The road is what you pick.',
  // arts 3 and 9: a stop, not a hint. It names nothing and points at nothing.
  'door.held': 'Something here is still yours to take.',
  // art. 40: what the breath answers with. The poetry is the response to the
  // button, never the button (art. 66).
  'mercy.breath': 'The cold of it goes through you, and some of what is open closes.',
  'mercy.whole': 'Nothing on you is open. What is offered here keeps.',
  'fight.won': 'The room goes quiet. The door gives.',
  // art. 63: a fled fight pauses. Nothing about it refills.
  'fight.fled': 'You back out of the door. It waits where you leave it.',
  'fight.resumed': 'It is where you leave it, and it remembers the rest.',
  'run.dead': 'The floor comes up. The run ends here.',
  'run.finished': 'You go through, and the stair keeps going down.',
  // art. 60: an ending with a choice waiting behind it says so, because the
  // next screen is a question rather than the labyrinth. It states what is
  // true of the pouch and stops there — the Choose verb is what instructs.
  'run.dead.choose': 'The floor comes up. The run ends here. What is on you now is more than your hand holds.',
  'run.finished.choose':
    'You go through, and the stair keeps going down. What is on you now is more than your hand holds.',
  'book.empty': 'Nothing is written here yet.',
  'book.title': 'The Book of Ends.',
  'card.title': 'The card. Each line spends once, and refills at the next door.',
  'pouch.empty': 'Nothing is in this slot yet.',
  // art. 69: the pouch panel says what is true of it rather than going quiet.
  'pouch.whole': 'Everything you own is in your hand.',
  // art. 67: the pouch is a thing you read, not a thing you press.
  'pouch.spares': 'What is past the line is yours, and is not going down with you.',
  // art. 60: the choosing screen. It states the situation and never
  // instructs — the verb on the strip is the only thing that says what to do.
  'choose.which': 'More bones than your hand holds. The rest stay up here.',
  'choose.full': 'Your hand is full. Put one back to take another.',
  'choose.short': 'Your hand is not full yet.',
  // art. 72: claim offers match the exact selection, so a selection that
  // fits nothing says why. The shape must be exactly what is chosen — a
  // full house is the five, never the five and one more.
  'claim.exact': 'No combo uses exactly these dice.',
  'claim.none': 'Nothing is chosen yet.',
  // arts 60, 86: the hand is a chosen six, and choosing is a swap. Neither
  // of these instructs — they say what is true of the tray right now, and
  // the verb on the strip is the only thing that tells you what to press.
  'swap.none': 'Nothing is chosen to leave, and nothing to take its place.',
  'swap.done': 'The bone goes into your hand. The other one keeps.',
  'swap.locked': 'Something is waiting behind that door. Your hand stays as it is.',
  'pouch.spare': 'Yours, and not in your hand.',
}

/**
 * The names that reach the player: combos, items, rooms, horrors, verbs.
 * They are labels, not sentences, and the lint judges them as labels — the
 * ruling of 2026-08-04.
 */
export const LABELS: Readonly<Record<string, string>> = {
  'horror.gnawing': 'the gnawing',
  'horror.marrow': 'the marrow',
  'room.crossing': 'the crossing',
  'room.trove.alcove': 'the alcove',
  'room.passage.stair': 'the stair',
  'room.passage.drip': 'the wet passage',
  'room.lair.cistern': 'the cistern',
  'room.trove.sump': 'the sump',
  'room.trove.buried': 'the buried hall',
  'room.hall.throne': 'the throne hall',
  'room.passage.sewer': 'the sewer',
  'room.open.barrow': 'the barrow',
  'room.lair.choir': 'the choir',
  'room.trove.hoard': 'the hoard',
  'room.puzzle.watcher': 'the watcher',
  'room.lair.crawl': 'the crawl',
  'room.passage.ash': 'the ash passage',
  'room.lair.kiln': 'the kiln',
  'room.omen.pyre': 'the pyre',
  'room.lair.den': 'the den',
  'room.passage.bonefield': 'the bonefield',
  'room.puzzle.tally': 'the tally',
  'room.sanctum.font': 'the font',
  'room.warden': "the warden's door",
  'region.drowned': 'the drowned',
  'region.burnt': 'the burnt',
  'region.ossuary': 'the ossuary',
  'key.warden': 'the iron key',
  'die.plain': 'a plain bone',
  'die.orphan': 'the orphan',
  'die.sisters': 'the sisters',
  'die.leech': 'the leech',
  // art. 86: a traveler's die is named for the death, not for the owner.
  // Nobody down here has a name yet, and that is the point of them.
  'die.pusher': 'the last push',
  'die.careful': 'the careful bone',
  'die.runner': 'the last room',
  'talisman.ossuary': 'the ossuary',
  'talisman.zealot': 'the zealot',
  'talisman.cord': 'the counting cord',
  'wearable.rusted-plate': 'the rusted plate',
  'rider.leech': 'the leech bite',
  'rider.push': 'the push',
  'rider.bleed': 'the bleed',
}

/**
 * The short words the tray's readouts are made of (art. 57: everything
 * visible). They are labels, not sentences: a number needs a word beside it
 * and nothing more.
 */
export const READOUT: Readonly<Record<string, string>> = {
  health: 'you',
  armor: 'armor',
  attack: 'attack',
  incoming: 'incoming',
  unused: 'unused',
  // art. 86: what the cost faces on your own dice will charge this turn.
  cost: 'cost',
  showing: 'showing',
  faces: 'faces',
  spent: 'spent in',
  corroded: 'corroded',
  next: 'next',
  ends: 'ends',
  depth: 'depth',
  seed: 'seed',
}

/**
 * art. 66: controls are a different language from prose. A control is a
 * plain imperative verb, two words or fewer; it never narrates, and the
 * poetry is the response to the button rather than the button.
 *
 * These are exempt from rules/voice.md by that article and bound by it
 * instead — `test/content.voice.test.ts` holds them to it.
 */
export const VERBS: Readonly<Record<string, string>> = {
  'act.take-key': 'Take',
  // art. 40's two mercies, as plain as the article is. Not "Rest", not
  // "Receive the mercy" — the verb is what the thumb does.
  'act.drink': 'Drink',
  'act.kneel': 'Kneel',
  // arts 66, 86: taking a dead traveler's bone is one plain verb. Two words
  // where a fork needs the thumb to tell two verbs apart (art. 89), and one
  // everywhere else.
  'act.take.traveler.pusher': 'Take bone',
  'act.take.traveler.careful': 'Take bone',
  'act.take.traveler.runner': 'Take bone',
  'act.take.sister.elder': 'Take bone',
  'act.take.sister.younger': 'Take bone',
  'act.take.leech': 'Take leech',
  'act.take.cord': 'Take cord',
  'act.take.plate': 'Take plate',
  open: 'Open',
  fight: 'Fight',
  descend: 'Descend',
  end: 'End run',
  wake: 'Wake',
  // art. 60: the verb an ending offers when the pouch has outgrown the hand.
  // It names what the press does — it opens the question, it does not descend.
  choose: 'Choose',
  read: 'Read',
  close: 'Close',
  card: 'Card',
  roll: 'Roll',
  // art. 41 (amended 2026-08-05): the turn is three presses — Roll, Reroll,
  // Attack. "Recast" was the law's word for the second casting and made the
  // thumb learn a synonym for a thing every dice game already has a word
  // for; "Claim" named the mechanism (a line off the card) where the player
  // is doing the only thing anybody comes to a fight to do.
  recast: 'Reroll',
  attack: 'Attack',
  // art. 66: two words or fewer, and it never narrates.
  swap: 'Swap',
  'end-turn': 'End turn',
  run: 'Run',
}

/**
 * art. 67 (amended): the tabs of the rail.
 *
 * These are deliberately **not** in `VERBS`. A control is a plain imperative
 * verb that commits something (art. 66); a tab commits nothing — it moves
 * the thumb between panels and names a place. Putting them under art. 66's
 * lint would have meant quietly widening that article to cover nouns, so
 * they are labels, judged as labels, and bound by art. 90 instead.
 */
export const TABS: Readonly<Record<string, string>> = {
  acts: 'acts',
  pouch: 'pouch',
  // arts 31, 85: a socket, named so that the absence reads as a decision
  // rather than as something nobody got to.
  map: 'map',
}
