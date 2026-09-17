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
 * ## The ways out are in the picture
 *
 * A template also says **where** each way out is standing — `exitAnchors`, one
 * per exit slot, measured against the art exactly as a detail is. It still
 * names no destination: the map binds its edges to these positionally, first
 * anchor to first edge, which is the same law that already made the first edge
 * out of a junction the primary one.
 *
 * A worked object's verb, a found thing's pill and a way out are all presses on
 * the picture, and **none of them may share 44 px with a LOOK detail or with
 * each other.** `test/unit/anchors.test.ts` does that arithmetic over every
 * template in this file, at the phone's own geometry.
 *
 * ## What a room may hold at all
 *
 * **The negative-space law**, and it is the reason several of these rooms got
 * shorter rather than longer. A frame has two kinds of crowding and a budget
 * for each — furniture seated into the painting, and hotspots of any kind
 * besides the ways out — and the budget comes from the room's `composition`,
 * which is already the statement of what the picture can hold. The table is in
 * `content/roomResolver.ts` beside `fits`, content validation walks every
 * template in this file, and a breach throws at the press of START rather than
 * reading as noise on a phone.
 *
 * What it cost, and it was the point: **a LOOK whose only job is flavour has no
 * hotspot any more.** Its line did not go anywhere — it folded into the arrival
 * or into the room's one focal LOOK, verbatim, and `test/unit/frames.test.ts`
 * holds every folded line to still being in the room's prose. The backdrop
 * still shows the thing; the room has simply stopped offering a press for every
 * brick it was painted with.
 *
 * ## What a room does while nobody is pressing anything
 *
 * A room with no enemy in it used to be perfectly still, which reads as a slide
 * rather than as a place. So a template may declare **ambient motion** beside
 * the seating it animates, and a territory may declare one of its own. Two
 * sources per room, the territory's counting as one of them; every one of them
 * steps on one shared clock; all of it vanishes with motion off. See
 * `render/ambience.ts` for the ticker and `docs/ART_DIRECTION.md` for the law.
 *
 * ## What a room withholds
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

import { DIE_PRICE } from './dice.js'
import { MAZE_ROOMS } from './mazeRooms.js'
import type { Ambient, RoomTemplate, Territory } from './roomTypes.js'

export type {
  Ambient,
  AmbientKind,
  Composition,
  Detail,
  ExchangeOffer,
  ExitAnchor,
  Furniture,
  Interactable,
  LootAnchor,
  PlacementId,
  Ritual,
  RoomRole,
  RoomTemplate,
  RoomTopology,
  Seat,
  Territory,
  ThreatBand,
} from './roomTypes.js'

/** One way in, one way on. The shape most corridors have. */
const THROUGH = { minEntrances: 1, maxEntrances: 1, minExits: 1, maxExits: 1 } as const

export const ROOM_TEMPLATES: Readonly<Record<string, RoomTemplate>> = {
  ...MAZE_ROOMS,
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
    // The premise, in the room rather than on a screen, and the only place it is
    // said outside the title. Two plain facts and no riddle: he has been here,
    // and he does not have it any more.
    arrival:
      'The stair ends in a long hall. Fresh candles, burning. I have been down here before and I do not remember any of it.',
    // One LOOK, and the skull and the door fold into it. The door especially:
    // it was a LOOK sitting on the same painted feature as the way out, which
    // is the room offering to describe the thing it is also asking you to walk
    // through.
    details: [
      {
        id: 'candles',
        at: { x: 0.16, y: 0.66 },
        focal: true,
        // **The first of the two treasure hints is in here**, welded to the
        // skull's sentence. The negative-space audit demoted the skull's own
        // hotspot and folded its line into this one; the hint rides the line it
        // was written on rather than asking for the hotspot back. It says a thing
        // exists and it does not say where — which is the whole contract: *we
        // hide places, never rules*, and where the treasure is standing is a
        // place. The other hint is cut at the transition, by the plan.
        says: 'Candles. Fresh ones, burning. Something down here still keeps a schedule. A skull on the floor. Small. It has been here longer than the candles. Under the skull, the same hand, scratched smaller. The hall keeps going. There is a door at the end of it and no light behind it.',
      },
    ],
    // On the hall's own vanishing point, below the door the LOOK names — the
    // press is *walking down there*, and the door is the thing you look at.
    exitAnchors: [{ id: 'far-door', at: { x: 0.53, y: 0.55 } }],
    // The first room of the run, and the first thing in the game that moves on
    // its own: the candles the arrival line calls fresh. Fast, uneven, and two
    // quanta of light — a flame, not a lamp.
    ambient: [{ kind: 'flicker', target: 'candles', amplitude: 2, tick: 1 }],
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
    // The step folds into the arch. A cramped frame gets three hotspots at the
    // most and this one is a corridor: one thing to read, one way through.
    details: [
      {
        id: 'arch',
        at: { x: 0.5, y: 0.28 },
        focal: true,
        says: 'An arch of skulls. Set carefully, every one facing out. Not a grave — a warning. A step, worn down the middle. Whatever uses this passage uses it often.',
      },
    ],
    // Under the arch of skulls and above the worn step: the gap the passage
    // actually goes through, between the two things you can look at.
    exitAnchors: [{ id: 'under-the-arch', at: { x: 0.5, y: 0.5 } }],
    // Low on the left wall, clear of the arch above and the step below. A
    // carving is prose and a tap, so it is sized as a LOOK ring and seated like
    // one; a room with no `carvingAt` simply cannot carry a hint.
    carvingAt: { x: 0.2, y: 0.62 },
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
    arrival:
      'The Gnawing is at the far end of the hall. Too many eyes. All of them are on me. Niches, packed with skulls. Hundreds. This is where the hall was leading.',
    // Nothing to look at, and that is the audit's ruling rather than an
    // omission: the room is a fight and two things on the floor afterwards, and
    // a LOOK at the masonry during either is a press that answers nothing. The
    // niches are still painted there, and the arrival still names them.
    details: [],
    encounterTags: ['closing-horror'],
    threat: 'low',
    enemy: 'gnawing',
    // The far end of the hall, which is where the thing came from and is the
    // only way on. Held shut while it is alive, and the view draws nothing.
    exitAnchors: [{ id: 'hall-end', at: { x: 0.5, y: 0.46 } }],
    // What a fight pays falls on the floor of the room it was fought in, in
    // front of the body. Two, because the Marrow's guaranteed drop and its
    // rolled offer are two objects and never one card with two things on it.
    lootAt: [
      { id: 'fallen-1', at: { x: 0.3, y: 0.72 } },
      { id: 'fallen-2', at: { x: 0.68, y: 0.72 } },
    ],
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
    arrival:
      'The hall opens into a chapel. The basin is full. Something turns beneath the surface. Candles down both walls, lit and level. Somebody comes down here and keeps them. Skulls, shelf on shelf, back into the dark. Every one of them is facing the basin.',
    // One object, one press, one number — which is what the room was always
    // described as and is now what it is. The candles and the niches are in the
    // arrival, where they were doing their whole job anyway.
    details: [],
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
    // The arch behind the altar, well clear of the basin's own press: the font
    // holds the exits shut until it is used, so the two are never up together,
    // and they are still not allowed to share a thumb's worth of screen.
    exitAnchors: [{ id: 'chapel-arch', at: { x: 0.5, y: 0.3 } }],
    // The water breathes. Slow, even, one quantum — the opposite of the entry
    // hall's flame, and the only thing in the chapel that moves.
    ambient: [{ kind: 'glow', target: 'ritual', amplitude: 1, tick: 3 }],
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
    // **Five LOOKs became one**, and the Reliquary is where the negative-space
    // law cost the most. Four of the five sat on objects that already carry
    // their own verb — a LOOK on the bell beside RING, a LOOK on the candles
    // beside PUT OUT — which is two presses on one thing and the exact crowding
    // the audit was for. The fifth is the mechanism's own clue and stays.
    //
    // Nothing was cut from the writing. Every demoted line is inside this one,
    // word for word, in the order the eye would take them: the altar, the
    // handle under it, the bell above, the candles left, the chest right.
    details: [
      {
        id: 'lever',
        at: { x: 0.5, y: 0.815 },
        focal: true,
        says: 'An altar built around a basin. The blood in it is old enough to be black. The altar has a recessed iron handle beneath the basin. Three marks have been cut beside it: a bell, a dead flame, a lowered skull. A bronze bell. Old red thread is knotted around the clapper. Five candles melted almost to the stone. They are the only warm light in the room. A chest with no keyhole. The skull clasp is joined to something inside the wall.',
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
      // On the skirt, which is where a hand would take it — and re-set with the
      // bell rather than guessed. The swing was painted, so the bell is a
      // registered family now instead of a portrait on a stance, and a family
      // that turns about its bar sweeps wider than the bell is: it is seated to
      // keep all five plates on a 320px screen, which moved it right and up.
      // `tools/sheet.mjs` prints the box these two numbers are read off.
      { id: 'reliquary-bell', art: 'bell', at: { x: 0.286, y: 0.125 }, describe: 'Ring the ritual bell' },
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
    ],
    // There is no `reliquary-chest` control any more, and its absence is the
    // wave's ruling in one line: the chest is not a button that pays out, it is
    // a container, and what is in it is **an object in the room** with its own
    // name, its own LOOK and its own TAKE. See `lootAt` below.
    //
    // The way out is the arch on the right wall, well above the chest and well
    // clear of the bell: GO ON is on screen from the first frame in this room
    // and never leaves, so it has to share the picture with everything else in
    // it without ever sharing a thumb.
    exitAnchors: [{ id: 'side-arch', at: { x: 0.82, y: 0.36 } }],
    // The found thing lies in the chest, which is where the chest is painted.
    lootAt: [{ id: 'in-the-chest', at: { x: 0.823, y: 0.62 } }],
    // The five candles, which the room's own line calls the only warm light in
    // it. **Not in the wave's first table, and added deliberately**: the
    // Reliquary already had a candle varying by a few percent on an eased CSS
    // loop, this wave deletes every one of those, and a room that came out of a
    // motion wave with less motion than it went in with would be a regression
    // wearing a law's coat. Same kind, same numbers as the Offertory's.
    ambient: [{ kind: 'flicker', target: 'reliquary-brazier', amplitude: 2, tick: 1 }],
    // And what is in it is authored rather than drawn. The Talisman of the Pair
    // used to be starting equipment; it lives here now, which is what makes the
    // Reliquary worth working rather than worth walking past.
    find: 'pair-talisman',
    topology: THROUGH,
  },

  /**
   * The first fork, and the one that decides what the run is carrying.
   *
   * A dividing passage in the ossuary. It reuses the Split's painting, and that
   * is **recorded quality debt rather than a joke**: the picture is a passage
   * dividing in front of you, a dividing passage in the ossuary is the same
   * fact, and a bespoke cleft painting is owed — see POLISH_PROGRESS.md
   * § HUMAN ART REQUIRED. Nothing was drawn, traced, recoloured or cropped.
   *
   * What the fork asks is not *how much health am I willing to spend* — that is
   * the Split's question, five rooms later. It is *what do I want to be
   * carrying*: left is a fight and a draw, right is a certain die and a toll.
   */
  cleft: {
    id: 'cleft',
    name: 'The Cleft',
    role: 'junction',
    territory: 'ossuary',
    composition: 'junction',
    tags: [],
    art: 'shrine',
    arrival: 'The passage divides. Bones went both ways.',
    // The two mouth-marks fold into the pillar between them. They were LOOKs
    // seated on the same painted mouths the ways out stand in, and a way
    // already says what it costs and what it pays **before** the press — so the
    // marks were describing a choice the buttons were already describing.
    details: [
      {
        id: 'divide',
        at: { x: 0.5, y: 0.52 },
        focal: true,
        says: 'The passage splits around a pillar of packed bone. Both mouths have been used. Dragged marks into the left mouth. Something heavy goes that way, and often. Wax down the right-hand wall. Somebody carried a light in there and came back.',
      },
    ],
    exitAnchors: [
      { id: 'left-mouth', at: { x: 0.28, y: 0.38 } },
      { id: 'right-mouth', at: { x: 0.72, y: 0.38 } },
    ],
    topology: { minEntrances: 1, maxEntrances: 1, minExits: 2, maxExits: 2 },
  },

  /**
   * Where the two ways come back together.
   *
   * The Split's painting read the other way round: two passages meeting rather
   * than one dividing. Same recorded debt as the Cleft, same reason, and the
   * same nothing authored. Its topology is what makes it the only room that can
   * stand here — **two ways in and one on** — and that is a fact about the
   * picture, which is why the validator asks the art rather than the plan.
   */
  confluence: {
    id: 'confluence',
    name: 'The Confluence',
    role: 'transition',
    territory: 'chapel',
    composition: 'junction',
    tags: [],
    art: 'shrine',
    arrival: 'The two ways meet. Whichever I took, this is where it was going.',
    // Same demotion as the Cleft's, read the other way round: the two mouths
    // are behind you here, and a hotspot on a road already taken is the purest
    // form of a press that answers nothing.
    details: [
      {
        id: 'meeting',
        at: { x: 0.5, y: 0.52 },
        focal: true,
        says: 'Two passages, one floor. The dust from both of them stops in the same place. The mouth I could have come out of. It is quiet in there now. The other mouth. Narrower. I would have had to turn my shoulders.',
      },
    ],
    exitAnchors: [{ id: 'on-together', at: { x: 0.5, y: 0.8 } }],
    // Above the meeting, on the pillar the two ways divide around — the one
    // piece of wall in this picture nothing else is standing on.
    carvingAt: { x: 0.5, y: 0.3 },
    topology: { minEntrances: 2, maxEntrances: 2, minExits: 1, maxExits: 1 },
  },

  /**
   * The Offertory: the Chain Vault's grammar, spent a second way.
   *
   * The vault charges a bone for a mistake. This one charges two for the
   * correct answer, and prints the price on the wall before the press — which
   * is the whole difference between a toll and a trap. It is the right-hand
   * branch's cost, and it is flat: the left branch pays the Gnawing three bones
   * a round instead, and which of those is cheaper depends on the dice.
   *
   * The greedy press is the vault's, exactly: PRY the recess before paying,
   * lose a bone, move nothing, as many times as there is blood for it. A run
   * can die here.
   *
   * **Built entirely from plates that already exist**: the Choir's backdrop and
   * the Reliquary's altar, candle stand and chest. Nothing was authored,
   * generated or moved. The plates are staged where they were painted for the
   * Reliquary, so the objects sit where those coordinates put them and the
   * verbs sit on the objects — which reads, and is recorded as owed art all the
   * same.
   */
  offertory: {
    id: 'offertory',
    name: 'The Offertory',
    role: 'toll',
    territory: 'ossuary',
    composition: 'altar',
    tags: ['worked', 'mandatory'],
    art: 'choir',
    arrival:
      'A side chapel with its own altar. The candles here are burning for somebody. There is a slot cut into the stone.',
    // **The proving room of the negative-space law**, and it failed it: seven
    // hotspots in an altar frame that allows five, on a backdrop painted for a
    // different room with another room's furniture standing on it.
    //
    // The carved slot merges onto the altar — one plate carrying the price LOOK
    // and the OFFER press, which is what it always was in the fiction and now
    // is in the picture. The candles fold in, because the candle stand already
    // carries PUT OUT and a LOOK beside it was the second press on one object.
    // The recess folds in, because until the toll is paid there is nothing in
    // it, and once it is paid what is in it is **the found thing**, with its own
    // name and its own TAKE where it lies.
    details: [
      {
        id: 'price',
        at: { x: 0.5, y: 0.585 },
        focal: true,
        says: 'Two skulls carved beside the slot. Under them, two carved bones. A price list. Candles, and fresh ones. Whoever they are burning for is not me yet. A recess in the wall, shut with a stone lid. The lid has been forced at before.',
      },
    ],
    interactables: [
      {
        id: 'offertory-candles',
        art: 'brazier',
        // Above the flames, as the Reliquary's is: the verb is two words wide
        // and the candle stand is exactly as wide as the verb.
        at: { x: 0.16, y: 0.6 },
        describe: 'Put out the candles',
      },
      { id: 'offertory-altar', art: 'altar', at: { x: 0.5, y: 0.7 }, describe: 'Offer two bones' },
      { id: 'offertory-recess', art: 'chest', at: { x: 0.8, y: 0.44 }, describe: 'Pry at the stone lid' },
    ],
    exitAnchors: [{ id: 'chapel-out', at: { x: 0.5, y: 0.3 } }],
    lootAt: [{ id: 'in-the-recess', at: { x: 0.823, y: 0.62 } }],
    find: 'grave-candle',
    // The room's one light, and its second source is the ossuary's own drift —
    // which is the cap, exactly: two, and one of them belongs to the territory.
    ambient: [{ kind: 'flicker', target: 'offertory-candles', amplitude: 2, tick: 1 }],
    topology: THROUGH,
  },

  /**
   * The Bone Carver: the first room in the game where the **hand** is sold.
   *
   * Its role is `exchange`, which is a new word and earns it: a `find` is a
   * thing lying there, a `toll` is a price for the way on, and this is a price
   * for *a specific object you can read before you pay for it*. The bargain law
   * is the same law — never generic power, only a particular die that fits the
   * build or does not — and this is the law with a shopkeeper.
   *
   * It declares **two territories**. A table of sorted bones reads in the
   * ossuary and it reads in a dead chapel, and `territories` is what lets the
   * one honest painting stand in either rather than be copied under two names.
   *
   * **Built entirely from plates that already exist**: the Choir's backdrop and
   * the Reliquary's altar, standing in for a worktable. The two dice on it are
   * nameplates, which is the pattern every unpainted in-world object in this
   * game uses. Nothing was authored, generated, traced, recoloured or cropped —
   * a composed Carver painting is owed, and is recorded under
   * `POLISH_PROGRESS.md` § HUMAN ART REQUIRED.
   *
   * It holds nothing shut and it has no press of its own. Walking away is legal
   * at every moment and both dice stay on the table, which is the whole of what
   * makes the price a decision rather than a gate.
   */
  carver: {
    id: 'carver',
    name: 'The Bone Carver',
    role: 'exchange',
    territory: 'ossuary',
    territories: ['ossuary', 'chapel'],
    composition: 'altar',
    tags: [],
    art: 'choir',
    arrival:
      'Somebody works here. Bones on the table, sorted by what they are good for — and by whose they were. A price scratched beside each.',
    details: [
      {
        id: 'table',
        at: { x: 0.18, y: 0.78 },
        says: 'A table of sorted bones, cut so they fall true. Longest on the left, split ones on the right. Somebody has a system.',
      },
      {
        id: 'prices',
        at: { x: 0.82, y: 0.78 },
        says: 'Numbers scratched into the stone beside each one. Three strokes, over and over. Three bones apiece.',
      },
      {
        id: 'knife',
        at: { x: 0.5, y: 0.86 },
        focal: true,
        says: 'The carver is not here. The knife is.',
      },
    ],
    // The altar, standing in for the worktable. Furniture: nothing in the game
    // can move it, so there is no state behind it and no record of it.
    furniture: [{ id: 'carver-table', art: 'altar', frame: 'still' }],
    // Two dice on the table, and the generator decides which two. Seats rather
    // than `lootAt`, because what stands here is the director's rather than the
    // room's own machinery's — and the budget counts them whether filled or not.
    spareSeats: [
      { id: 'on-the-table-left', at: { x: 0.36, y: 0.6 } },
      { id: 'on-the-table-right', at: { x: 0.64, y: 0.6 } },
    ],
    exchange: { count: 2, price: DIE_PRICE },
    exitAnchors: [{ id: 'past-the-table', at: { x: 0.5, y: 0.3 } }],
    topology: THROUGH,
  },

  /**
   * The niche: a shell room whose contents are entirely the director's.
   *
   * It authors no find, no fight and no machinery. What is in it is a
   * **placement** — a chained bargain on most runs, and on one branch of one
   * fork per run, the treasure. That is the point of it: the room is a place the
   * plan can put something, and which something is what makes two runs through
   * the same alcove two different rooms.
   *
   * `placed` is the tag that keeps it apart from the Reliquary, which is the
   * other chapel `find`. A plan that wants a worked paying room asks for
   * `worked`; a plan that wants a shell asks for `placed`.
   *
   * **Built from the Deep Way's backdrop and the vault's chain plate.** The
   * chain has never been painted, so the midground is empty and the room runs as
   * every unpainted room in this game runs: the verb is a press on the object,
   * the price is on the verb, and the outcome is in the word band. A composed
   * niche painting and a chain-in-niche seating are owed, and recorded.
   */
  niche: {
    id: 'niche',
    name: 'The Niche',
    role: 'find',
    territory: 'threshold',
    territories: ['threshold', 'chapel', 'deep'],
    composition: 'cramped',
    tags: ['placed'],
    art: 'deep',
    arrival:
      'A niche cut into the wall and something chained in it. Whoever chained it did not want it walking off.',
    details: [
      {
        id: 'chain',
        at: { x: 0.2, y: 0.5 },
        says: 'A short chain, set into the stone at both ends. Somebody meant this to stay exactly here.',
      },
      {
        id: 'plates',
        at: { x: 0.8, y: 0.5 },
        says: 'Two iron plates over the mouth of the alcove. They have been forced at and they held.',
      },
    ],
    furniture: [{ id: 'niche-chain', art: 'chain', frame: 'off' }],
    spareSeats: [{ id: 'in-the-niche', at: { x: 0.5, y: 0.52 } }],
    exitAnchors: [{ id: 'past-the-niche', at: { x: 0.5, y: 0.26 } }],
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
        says: 'A shrine. Someone knelt here. The wax has run over the edge and set. Scratches on the stone. Counting something. They stop at nine.',
      },
    ],
    // Two mouths, and the order is the map's contract: the first anchor takes
    // the first edge out of the slot, which is the stair.
    exitAnchors: [
      { id: 'stair-mouth', at: { x: 0.3, y: 0.38 } },
      { id: 'deep-mouth', at: { x: 0.7, y: 0.38 } },
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
    // **Five LOOKs became one, and the one is the rule.** A vertical frame
    // allows four hotspots; the vault had eight. The panel is the only thing in
    // the room the player has to read — it draws the mechanism in two pictures —
    // and the four objects it names are all still in the picture, all still
    // named, and two of them still carry their own verb.
    //
    // The order the lines fold in is the order the mechanism runs: the rule,
    // the weight, the thing it stands on, the lever, the gate.
    details: [
      {
        id: 'wall-panel',
        at: { x: 0.13, y: 0.36 },
        focal: true,
        says: 'Two figures cut into the stone: first a weight falling, then a gate lifting. An iron cage. Heavy enough to make the chain groan. A square plate in the floor, polished around the edges by weight. A lever beside the gate. Its linkage runs toward the floor plate. Iron bars with no lock. The mechanism is inside the wall.',
      },
    ],
    // The chain's control sits on the chain, under the cage it lifts — so the
    // press and the thing that answers it are the same object in the picture.
    interactables: [
      { id: 'vault-chain', art: 'chain', at: { x: 0.81, y: 0.28 }, describe: 'Lower the hanging cage' },
      { id: 'vault-lever', art: 'lever', at: { x: 0.19, y: 0.51 }, describe: 'Pull the iron lever' },
    ],
    // Through the gate, once the gate is up. Nothing is drawn here while it is
    // down: `exitsOpen` is the one statement of that and the view obeys it.
    // Through the barred arch, left of centre — the cage hangs on the right and
    // what is in it is a press of its own, and the two may not share a thumb.
    exitAnchors: [{ id: 'through-the-gate', at: { x: 0.55, y: 0.38 } }],
    // What the cage holds, sitting in the cage, once the cage is on the floor
    // and the gate is up. The deep way pays iron, and it pays it here.
    lootAt: [{ id: 'in-the-cage', at: { x: 0.83, y: 0.4 } }],
    find: 'rustplate',
    // The hanging cage, moved by nothing in particular. One pixel, and slow
    // enough that it is never the loudest thing in the frame — a room whose
    // whole mechanism runs up and down should have exactly one thing in it that
    // is not waiting to be pressed.
    ambient: [{ kind: 'sway', target: 'vault-chain', amplitude: 1, tick: 3 }],
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
        // Focal now, and it is the room's only LOOK: the thing worth reading in
        // a tunnel with the Marrow in it is the wall that is warm.
        focal: true,
        says: 'Roots, or something like them, coming through the wall. They are warm.',
      },
    ],
    encounterTags: ['standing-horror'],
    threat: 'medium',
    enemy: 'marrow',
    exitAnchors: [{ id: 'tunnel-on', at: { x: 0.5, y: 0.34 } }],
    lootAt: [
      { id: 'fallen-1', at: { x: 0.3, y: 0.72 } },
      { id: 'fallen-2', at: { x: 0.68, y: 0.72 } },
    ],
    // A glint off the warm wall. Low and slow — the deep is the stretch that is
    // meant to feel like somewhere else, and the way to say that is to move
    // less than the rooms above it, not more.
    ambient: [{ kind: 'glow', target: 'roots', amplitude: 1, tick: 4 }],
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
    arrival:
      'The Warden stands in front of the exit door. There is no way through while it is alive. A plate on the wall. REPENT OR PERISH. Someone had opinions.',
    // A duel frame holds the enemy and nothing else, which is the whole of what
    // its budget says. The plate on the wall is still painted there and the
    // arrival still reads it out; what has gone is a hotspot beside a keeper.
    details: [],
    encounterTags: ['duel-stander'],
    threat: 'keeper',
    enemy: 'warden',
    // The door itself, which is what the thing is standing in front of. It pays
    // nothing, so it declares nowhere for anything to fall.
    exitAnchors: [{ id: 'the-door', at: { x: 0.5, y: 0.55 } }],
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
 * What a whole stretch of the descent does, in every room of it.
 *
 * The companion to the ambient grade: rooms of one territory already share a
 * light, and bone country now also shares **air with something in it**. It is
 * declared once here rather than five times in the library, for the reason the
 * grade is one table — a fact about a stretch written down per room is a fact
 * that will disagree with itself.
 *
 * It counts against the room's cap of two. The Offertory is the room where that
 * bites: its own candle plus the ossuary's dust is two, and there is no third.
 */
export const TERRITORY_AMBIENCE: Partial<Readonly<Record<Territory, Ambient>>> = {
  ossuary: { kind: 'drift', target: 'world', amplitude: 2, tick: 1 },
}

/**
 * How many motes may be in the air at once.
 *
 * Content, and a hard cap rather than a rate: dust that accumulates is weather,
 * and weather is a system. Six, deterministically placed, recycled forever.
 */
export const MOTE_CAP = 6

/** At most this many ambient sources in one room, the territory's included. */
export const AMBIENT_CAP = 2

/**
 * Where an ambient's target is standing in the picture.
 *
 * The whole reason an ambient names a target instead of carrying a coordinate:
 * the light is seated on the object, so moving the object moves its light and
 * there is never a second number to keep in step. `undefined` for `world`,
 * which has no seat because it is the whole box — and `undefined` for a target
 * nobody wrote, which is what content validation fails on.
 */
export function ambientSeat(
  t: RoomTemplate,
  target: string,
): { readonly x: number; readonly y: number } | undefined {
  if (target === 'world') return undefined
  if (target === 'ritual') return t.ritual?.at
  return (
    t.details.find((d) => d.id === target)?.at ??
    t.interactables?.find((i) => i.id === target)?.at ??
    t.lootAt?.find((l) => l.id === target)?.at
  )
}

/** An ambient, with the seat its target stands on already resolved. */
export interface SeatedAmbient extends Ambient {
  readonly at?: { readonly x: number; readonly y: number }
}

/**
 * Everything moving in one room: its own, and its territory's.
 *
 * The room's own come first, so the thing the player is looking at is the thing
 * that was declared beside it. Nothing here decides anything and nothing here
 * is stored — it is a pure function of the template, which is what lets the
 * ticker be a timer and a list of elements and nothing else.
 */
export function ambienceFor(t: RoomTemplate): readonly SeatedAmbient[] {
  const territory = TERRITORY_AMBIENCE[t.territory]
  return [...(t.ambient ?? []), ...(territory ? [territory] : [])].map((a) => {
    const at = ambientSeat(t, a.target)
    return at ? { ...a, at } : { ...a }
  })
}

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
