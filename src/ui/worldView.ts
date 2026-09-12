/**
 * The world: the room, the enemy, the word band, and what can be tapped.
 *
 * The enemy is placed by the compositor on its own layer and is never hidden
 * by anything — in explore as well as in combat, because a room's monster is
 * visible before any combat control appears.
 */

import { hideEnemy, hideProp, holdWeapon, placeEnemy, showProp, showProps } from '../render/compositor.js'
import type { World } from '../render/compositor.js'
import { enemyArt, handArt, isScenePlate, propArt, roomArt, url } from '../render/assets.js'
import { STAGES, breakFor, enemy as enemyById, stageForRound, stanceAt } from '../content/enemies.js'
import { idlePose } from '../content/enemyPresentation.js'
import { exitsAvailable, roomAt } from '../game/map.js'
import { actionFor, platesFor, stateOf } from '../content/interactions.js'
import { reward, thingSaidIn } from '../content/rewards.js'
import { carriedSaidIn, ladderChips, stripSaid } from '../content/faces.js'
import { coreDie } from '../content/dice.js'
import { VERBS } from '../content/text.js'
import { canClaim, canTake, diceOnOffer, lootIn, refusalFor, refusalForDie } from '../game/reducer.js'
import type { GameState } from '../game/state.js'
import { button, el, faceStripFor, faceStripView } from './components.js'

/**
 * How far under a found thing's name its TAKE sits.
 *
 * Two presses on one object have to be two thumbs' worth apart, and the world
 * box is about 634 px tall on a 390 × 844 phone, so this is a little over the
 * 44 px floor. `test/unit/anchors.test.ts` does the arithmetic against every
 * anchor in the library rather than trusting the number here.
 */
const LOOT_TAKE_DROP = 0.09

/**
 * How many cells the enemy's health bar is made of.
 *
 * The bar is a row of whole cells, not a percentage: **combat chrome obeys the
 * art's pixel grid**, so what changes as a thing is hurt is how many cells are
 * lit, and never a fractional width. Forty-eight at six pixels a cell is 288 px,
 * which fits inside the 390 px phone with the margins the bar already had.
 */
const HP_CELLS = 48

export interface WorldHandlers {
  readonly onLook: (detailId: string) => void
  /** The encounter's rule, said out loud. Reads state, changes none. */
  readonly onRule: () => void
  /** The room's focal object, pressed. The reducer decides what it gives. */
  readonly onRitual: () => void
  /** One of the room's objects, worked. The reducer decides what it does. */
  readonly onInteract: (interactionId: string) => void
  /** A way out, pressed where it stands in the picture. */
  readonly onGo: (to: string) => void
  /** One of the things lying in this room, picked up. */
  readonly onTake: (index: number) => void
  /**
   * A core die on a table or a chain, taken.
   *
   * It opens the **picker** rather than committing anything: the hand is six and
   * nothing sits outside it, so taking a die is choosing which one goes, and that
   * choice is a beat of its own. Cancel is legal and leaves the die where it lay.
   */
  readonly onClaim: (index: number) => void
  /**
   * Whether the word band has been waved away.
   *
   * **Presentation, and never state.** Not in `GameState`, not in the save, not
   * a fixture key — a reload comes back with the words on, exactly as the picker
   * and the hold draft come back cleared. Rendering is still deciding nothing
   * about the run; it is deciding whether one paragraph is painted over it.
   */
  readonly bandOff: boolean
  /** Wave the words away, or ask for them back. Changes no run state. */
  readonly onToggleBand: () => void
}

/**
 * What the room's ritual has already given, if this is a room with one and it
 * has been used. Every view below asks the same question of the same state.
 */
function resolvedRitual(state: GameState) {
  const run = state.run!
  return run.ritual?.roomId === run.roomId ? run.ritual : undefined
}

export function renderWorld(world: World, state: GameState, handlers: WorldHandlers): void {
  const run = state.run
  if (!run) {
    world.backdrop.src = url(roomArt('threshold'))
    hideEnemy(world)
    hideProp(world)
    delete world.grade.dataset['territory']
    world.hits.replaceChildren()
    world.hud.replaceChildren()
    world.room.hidden = true
    return
  }

  // The room, resolved: authored place joined to generated topology, in one
  // call. Nothing in this file knows a map exists, which is the point.
  const here = roomAt(run)
  const backdrop = url(roomArt(here.art))
  if (world.backdrop.getAttribute('src') !== backdrop) world.backdrop.src = backdrop

  // The air of the stretch of the descent this room is in.
  //
  // Written from the room the paint is painting, so the grade crosses over in
  // the same frame the picture does — which, during a crossing, is the frame
  // under the dark. Rooms of one territory now share a palette; the stylesheet
  // owns what each one is, and no pixel of `public/` is touched by it.
  world.grade.dataset['territory'] = here.territory

  // The monster, if there is one still standing here.
  const standing = here.enemy && !run.cleared.includes(run.roomId) ? here.enemy : undefined
  if (standing) {
    const e = enemyById(standing)
    const combat = run.combat?.enemyId === standing ? run.combat : undefined
    // Which drawing of a thing painted three ways. Straight off `combat.round`
    // and stored nowhere, so a reload on round three paints the near
    // composition without a frame index in the save. Before the fight opens
    // there is no round yet, and a thing that is painted approaching is
    // standing where the fight will start it: at the far end.
    //
    // It is staging and nothing else. Being close costs the player nothing.
    const stage = stageForRound(standing, combat?.round ?? 1) ?? (e.staging ? STAGES[0] : undefined)
    const stance = stanceAt(standing, stage)
    // And how much of it is left, for a horror painted deteriorating.
    // Recomputed here on every paint and stored nowhere — which is the whole
    // reason a reload at half health shows the middle plate.
    //
    // The *first* plate of the band, always. The second is a beat of an idle
    // loop, the loop belongs to `app/app.ts`, and a settled picture is the one
    // every band is authored to rest on.
    const maxHp = combat?.enemyMaxHp ?? e.maxHp
    const hp = combat?.enemyHp ?? maxHp
    const pose = idlePose(standing, hp, maxHp) ?? stage
    const art = enemyArt(e.art, pose)
    placeEnemy(world, url(art), {
      width: stance.width,
      foot: stance.foot,
      ...(stance.at !== undefined ? { at: stance.at } : {}),
      ...(stage ? { reach: stage } : {}),
      ...(isScenePlate(art) ? { scene: true } : {}),
    })
  } else {
    hideEnemy(world)
  }

  // The room's focal object, at the frame the *state* says it is on: the idle
  // basin until the font has been used, and afterwards the face it landed on,
  // for good. Nothing here remembers a frame and nothing here chooses one —
  // which is why a reload shows the result rather than an unpressed room, and
  // why the sequence that plays the throw cannot change what it lands on.
  const ritual = here.ritual
  const given = resolvedRitual(state)
  const frame = ritual ? propArt(ritual.art, given ? String(given.roll) : 'idle') : undefined
  if (frame) showProp(world, url(frame))
  else hideProp(world)

  // And a room whose objects each have a position of their own paints all of
  // them, in content's order, off the same settled state. Nothing here
  // remembers a frame: the picture is `platesFor` of the save and nothing
  // else, so a reload mid-puzzle and never having left are the same room.
  // Furniture first, then the worked objects. Furniture is a plate a room simply
  // has — the Carver's table, the chain across a niche — with no state behind it
  // and nothing in the game that can move it; declaring it beside the room's copy
  // is honest, and a `RoomInteractionState` with no transitions in it would not be.
  const worked = stateOf(run.rooms, run.roomId, here.id)
  showProps(
    world,
    [...(here.furniture ?? []), ...(worked ? platesFor(worked) : [])]
      .map((p) => ({ plate: p, art: propArt(p.art, p.frame) }))
      .filter((x): x is { plate: typeof x.plate; art: NonNullable<typeof x.art> } => x.art !== undefined)
      .map(({ plate, art }) => ({
        id: plate.id,
        src: url(art),
        ...(plate.look !== undefined ? { look: plate.look } : {}),
      })),
  )

  // The knife comes out for the thing in the room, not for the room. Both
  // plates are mounted here; which one shows is the sequence's business, and
  // the resting one is what a settled screen always lands on.
  holdWeapon(
    world,
    standing && enemyById(standing).staging
      ? { rest: url(handArt('rest')), thrust: url(handArt('thrust')) }
      : undefined,
  )

  renderHits(world, state, handlers)
  renderHud(world, state, handlers)
}

function renderHits(world: World, state: GameState, handlers: WorldHandlers): void {
  const run = state.run!
  const here = roomAt(run)
  world.hits.replaceChildren()

  // Nothing in the world is tappable while a fight is on: the fight is the
  // room, and a stray detail tap during a turn is noise.
  world.room.hidden = state.mode !== 'explore'
  if (state.mode !== 'explore') return

  // **The room itself, as one press.**
  //
  // Tapping a part of the picture nothing is standing on waves the word band
  // away, so the painting can be looked at; tapping again asks for it back, and
  // so does touching anything real, because any press at all un-dismisses.
  //
  // It is a sibling *before* `#hits` — see `mountWorld` — so every hotspot
  // paints and presses over it, and it can only ever catch a tap that would
  // have landed on nothing. It is mounted once rather than rebuilt here,
  // because it is not one of the room's presses: `#hits` is what the frame's
  // negative-space budget counts, and this is global chrome.
  //
  // The tray does not move. A picture with no tray under it is not a state this
  // game has: what goes is one paragraph, and only while it is in the way.
  world.room.hidden = false
  world.room.dataset['act'] = 'band'
  world.room.dataset['bandOff'] = handlers.bandOff ? 'yes' : 'no'
  world.room.setAttribute(
    'aria-label',
    handlers.bandOff ? 'Show what the room said' : 'Hide what the room said',
  )
  world.room.onclick = handlers.onToggleBand

  // The focal object first, and only while it still has something to give.
  // It carries its verb where the thing itself is rather than in the tray,
  // because *this basin* is what is being pressed — and once it has answered
  // it stops being a control, exactly as a beaten enemy stops being a fight.
  if (here.ritual && !resolvedRitual(state)) {
    const b = button({
      act: 'ritual',
      label: here.ritual.label,
      describe: here.ritual.describe,
      onPress: handlers.onRitual,
      className: 'hit hit-focal hit-ritual',
    })
    b.dataset['ritual'] = here.ritual.art
    b.style.left = `${here.ritual.at.x * 100}%`
    b.style.top = `${here.ritual.at.y * 100}%`
    world.hits.append(b)
  }

  // The room's worked objects, each carrying its verb where the thing itself
  // is. A press dispatches an id and nothing else — the view never computes
  // what an object will do, and `actionFor` is the same call the reducer makes
  // to decide whether to accept it, so a button that would be rejected is a
  // button that is never drawn.
  //
  // An object with nothing to offer gets **no element at all**, not a disabled
  // one. A greyed PULL beside three carved clues is the interface refusing to
  // say what it wants; an absent one leaves the clues to do their job.
  const worked = stateOf(run.rooms, run.roomId, here.id)
  if (worked) {
    for (const thing of here.interactables ?? []) {
      const action = actionFor(worked, thing.id)
      if (!action) continue
      const b = button({
        act: 'interact',
        label: action.label,
        describe: action.describe,
        onPress: () => handlers.onInteract(thing.id),
        className: 'hit hit-focal hit-interact',
      })
      b.dataset['interact'] = thing.id
      b.dataset['prop'] = thing.art
      b.style.left = `${thing.at.x * 100}%`
      b.style.top = `${thing.at.y * 100}%`
      world.hits.append(b)
    }
  }

  // What is lying here, and has not been picked up.
  //
  // Two presses on one object, because a found thing has always been two
  // questions and the reward screen used to answer them with a card and a
  // button. The pill carries the thing's short name and is the LOOK — its
  // name and its exact rule, in the band, committing nothing. TAKE sits under
  // it and is the only press that changes the run.
  //
  // A thing the run cannot carry gets **no TAKE at all**. The cap is the
  // reducer's, the refusal is a sentence the LOOK prints, and a greyed button
  // beside a full loadout would be the interface refusing to say why.
  lootIn(run).forEach((item, index) => {
    if (item.taken) return
    const spot = here.lootAt?.[index] ?? here.lootAt?.[here.lootAt.length - 1]
    if (!spot) return
    const card = reward(item.id)

    const refused = refusalFor(run, item.id)
    const faces = stripSaid(item.id)
    const name = button({
      act: 'look-loot',
      label: card.short,
      // The refusal is in the accessible name as well as one press away, so a
      // thing that cannot be carried says why without being touched — which is
      // what replaces the grey button that is not allowed to exist. The faces
      // are in it too: a strip is a picture, and a picture is not a statement.
      describe: `${card.name}. ${faces ? `${faces}. ` : ''}${card.rule}${refused ? ` ${refused}` : ''}`,
      onPress: () => handlers.onLook(`loot:${index}`),
      className: 'hit hit-focal hit-loot',
    })
    name.dataset['loot'] = item.id
    name.dataset['lootIndex'] = String(index)
    name.style.left = `${spot.at.x * 100}%`
    name.style.top = `${spot.at.y * 100}%`
    world.hits.append(name)

    if (!canTake(run, item.id)) return
    const take = button({
      act: 'take',
      label: VERBS.take,
      describe: `Take the ${card.name}`,
      onPress: () => handlers.onTake(index),
      className: 'hit hit-focal hit-take',
    })
    take.dataset['takeIndex'] = String(index)
    take.dataset['takeId'] = item.id
    take.style.left = `${spot.at.x * 100}%`
    take.style.top = `${(spot.at.y + LOOT_TAKE_DROP) * 100}%`
    world.hits.append(take)
  })

  // The core dice lying in this room, and what each one costs.
  //
  // The same two presses a found thing has, and for the same reason: a pill that
  // names it and reads its faces and its price, and a verb under it that is the
  // only press that changes the run. What differs is the verb's consequence —
  // TAKE here opens the **picker**, because the hand is six and nothing sits
  // outside it, so taking a die is choosing which one goes.
  //
  // **A bargain is never lethal.** When the pile is not strictly bigger than the
  // price there is *no verb at all* — not greyed, absent — and the pill's own
  // name carries the refusal, which is the sentence that replaces the button.
  for (const { index, offer } of diceOnOffer(run)) {
    const die = coreDie(offer.die)
    const refused = refusalForDie(run, offer)
    const priced =
      offer.price === undefined
        ? 'Not priced. It cost what it cost to get here.'
        : `${offer.price} bones.`

    const name = button({
      act: 'look-die',
      label: die.short,
      describe: `${die.name}. ${stripSaid(offer.die)}. ${refused ?? priced}`,
      onPress: () => handlers.onLook(`die:${index}`),
      className: 'hit hit-focal hit-loot hit-die',
    })
    name.dataset['die'] = offer.die
    name.dataset['dieIndex'] = String(index)
    name.dataset['offer'] = offer.kind
    if (offer.price !== undefined) name.dataset['price'] = String(offer.price)
    name.style.left = `${offer.at.x * 100}%`
    name.style.top = `${offer.at.y * 100}%`
    world.hits.append(name)

    if (!canClaim(run, offer)) continue
    const take = button({
      act: 'claim',
      label: VERBS.take,
      // The price is on the verb before the verb charges. The same contract the
      // Offertory's slot is held to, said about an object rather than a toll.
      describe:
        offer.price === undefined
          ? `Take the ${die.name} in place of one of my six`
          : `Break ${offer.price} bones. Take the ${die.name} in place of one of my six`,
      onPress: () => handlers.onClaim(index),
      className: 'hit hit-focal hit-take hit-claim',
    })
    take.dataset['claimIndex'] = String(index)
    take.dataset['claimId'] = offer.die
    take.style.left = `${offer.at.x * 100}%`
    take.style.top = `${(offer.at.y + LOOT_TAKE_DROP) * 100}%`
    world.hits.append(take)
  }

  // What the plan cut into this room's wall. Prose, one tap, no seat, and it
  // names nowhere: it says somebody came down here for a thing.
  const carving = here.carvings[0]
  if (carving && here.carvingAt) {
    const b = button({
      act: 'look',
      label: '',
      describe: 'Inspect the carving',
      onPress: () => handlers.onLook('carving'),
      className: `hit${run.looked.includes('carving') ? ' hit-seen' : ''}`,
    })
    b.dataset['detail'] = 'carving'
    b.style.left = `${here.carvingAt.x * 100}%`
    b.style.top = `${here.carvingAt.y * 100}%`
    world.hits.append(b)
  }

  // The ways out, seated on the painted feature each one passes through.
  //
  // **A held exit renders nothing.** Not a greyed arch, not a dimmed label:
  // `exitsOpen` and the reducer's GO guard are the one statement of whether a
  // room lets you leave, and the view obeys it rather than restating it.
  if (exitsAvailable(run, here)) {
    for (const exit of here.exits) {
      if (!exit.at) continue
      const b = button({
        act: 'go',
        label: exit.label,
        describe: `${exit.label} — ${exit.sense}`,
        onPress: () => handlers.onGo(exit.to),
        className: 'hit hit-focal hit-go',
      })
      b.dataset['to'] = exit.to
      b.style.left = `${exit.at.x * 100}%`
      b.style.top = `${exit.at.y * 100}%`
      world.hits.append(b)
    }
  }

  for (const detail of here.details) {
    const b = button({
      act: 'look',
      label: '',
      // "Inspect", because this is the word's proper subject: one concrete
      // thing in the room. The global overlay is MENU and is not this.
      describe: `Inspect the ${detail.id.replace(/-/g, ' ')}`,
      onPress: () => handlers.onLook(detail.id),
      className: `hit${detail.focal ? ' hit-focal' : ''}${run.looked.includes(detail.id) ? ' hit-seen' : ''}`,
    })
    b.dataset['detail'] = detail.id
    b.style.left = `${detail.at.x * 100}%`
    b.style.top = `${detail.at.y * 100}%`
    world.hits.append(b)
  }
}

function renderHud(world: World, state: GameState, handlers: WorldHandlers): void {
  const run = state.run!
  world.hud.replaceChildren()

  const combat = run.combat
  if (combat && state.mode === 'combat') {
    const e = enemyById(combat.enemyId)
    const bar = el('div', 'enemy-bar')
    bar.id = 'enemy-bar'

    // Its name, what is left of it, and exactly what it costs to leave it
    // standing. Both numbers are stated outright and neither is hidden until
    // it happens: the whole tactical contract of a fight is *I know how many
    // bones this thing will break if it survives my attack*.
    const name = el('div', 'enemy-name')
    name.append(el('span', 'enemy-title', e.name))
    const hp = el('span', 'enemy-hp', `${combat.enemyHp} / ${combat.enemyMaxHp}`)
    hp.id = 'enemy-hp'
    hp.dataset['hp'] = String(combat.enemyHp)
    hp.dataset['max'] = String(combat.enemyMaxHp)
    hp.setAttribute('aria-label', `${e.name}, ${combat.enemyHp} of ${combat.enemyMaxHp} left`)
    name.append(hp)
    bar.append(name)

    // What is left of it, drawn on the art's own pixel grid.
    //
    // **Combat chrome obeys the art's grid and palette** — the law this wave
    // wrote into `docs/ART_DIRECTION.md`. A smooth CSS bar sliding across
    // static pixels is the one thing on the combat screen that looks like it
    // came from a different game, so the fill is a whole number of cells and
    // never a fraction of one. The count is computed here, in integers, and the
    // stylesheet multiplies it by one step; there is no sub-pixel width to
    // round and nothing for a transition to interpolate through.
    //
    // A thing that is alive always shows at least one cell. Rounding a live
    // enemy to an empty bar would be the chrome lying about the only number the
    // fight is made of.
    const cells =
      combat.enemyHp <= 0
        ? 0
        : Math.max(1, Math.round((combat.enemyHp / combat.enemyMaxHp) * HP_CELLS))
    const track = el('div', 'enemy-track')
    track.id = 'enemy-track'
    track.dataset['cells'] = String(HP_CELLS)
    const fill = el('i', 'enemy-fill')
    fill.id = 'enemy-fill'
    fill.dataset['cells'] = String(cells)
    fill.style.setProperty('--cells', String(cells))
    track.append(fill)
    bar.append(track)

    if (!combat.defeated) {
      // **The live number, off `breakFor`.** Not `e.damage`: a monster's break is
      // a ladder now, and what the tray prints is the rung the turn in front of
      // the player is standing on — the Gnawing's as it closes, the Marrow's as
      // it is worn down. It is derived on every paint and stored nowhere, which
      // is why it moves the moment the rule does and why a reload finds the same
      // figure.
      //
      // No line has been scored for the turn that is about to happen, so a rule
      // that reads the line reads as its ordinary rung here — which is exactly
      // what the Warden's card promises in capitals.
      const breaks = breakFor(e, combat)
      const hits = el('p', 'enemy-hits', `BREAKS ${breaks}`)
      hits.id = 'enemy-hits'
      hits.dataset['damage'] = String(breaks)
      if (e.breakRule) hits.dataset['rule'] = e.breakRule.kind
      hits.setAttribute(
        'aria-label',
        `It breaks ${breaks} of my bones every attack that does not finish it`,
      )
      bar.append(hits)

      // And the whole ladder, as chips, so the number above is a position on
      // something the player has already read rather than a figure that moved.
      const ladder = ladderChips(combat.enemyId)
      if (ladder.length > 0) {
        const strip = faceStripView(ladder)
        strip.classList.add('ladder')
        strip.id = 'enemy-ladder'
        bar.append(strip)
      }
    }

    // Its rule, in readable text, before anything can be committed. A rule the
    // player only learns by losing a bone to it is not a rule. A finished
    // thing declares nothing, so it goes with the fight.
    if (e.rule && !combat.defeated) {
      const b = button({
        act: 'rule',
        label: 'ITS RULE',
        describe: e.rule,
        onPress: handlers.onRule,
        className: 'enemy-rule',
      })
      b.id = 'enemy-rule'
      bar.append(b)
    }
    world.hud.append(bar)
  }

  // The whole exchange, not its last line.
  //
  // Every beat of an attack is written into `combat.log` by the reducer that
  // settled it — the hand, the arithmetic, what it took off the thing, and
  // what the thing took off you — so the round can be read back after it is
  // over rather than only while it is moving. Anything that is only legible
  // while moving is missing for anyone who turned motion off.
  const say = el('p', 'say')
  say.id = 'say'
  const beats = run.say ? [run.say] : (combat && state.mode === 'combat' ? combat.log : [])
  for (const beat of beats) say.append(el('span', 'say-beat', beat))

  // And the faces of the thing the band is talking about.
  //
  // A found thing states its exact mechanic **where it lies**, and since the
  // faces are drawn rather than described, that means the strip goes here too:
  // under the LOOK that names it and under the line that confirms taking it.
  // Which thing is derived from the say the reducer wrote, against the reward
  // table itself — see `thingSaidIn`. Nothing here decides anything, and a
  // line about no thing at all gets no chips.
  // A found reward first, then anything else with faces — which since this wave
  // includes a crooked die lying on a table. A core die is not a reward and never
  // will be (fights pay item dice and vials; the build is bought in places), so
  // the second lookup is what keeps the law true for it: *a found thing states its
  // exact mechanic where it lies.*
  const about = run.say ? (thingSaidIn(run.say) ?? carriedSaidIn(run.say)) : undefined
  const strip = about ? faceStripFor(about) : undefined
  if (strip) say.append(strip)

  if (beats.length === 0) say.hidden = true
  world.hud.append(say)

}
