# GAME.md — CASTLEBRYNTH (design constitution, v4)

A still-frame, tap-driven dungeon-crawl roguelike for phones. Full-screen
pixel scenes, a line of writing on top, a paged panel below, dice
underneath, memory on the line. The labyrinth is bleak, claustrophobic,
and refuses to be learned. Cards cite this doc by anchor.
(v4 pivot: cult story, procedural maze, pager panel, tithes/Effigies,
the Communion, everything-XP. Supersedes v3.)

## frame (#frame)

- **Full-bleed pixel still** fills the screen — one painted scene,
  third-person shoulder framing, oppressive close walls. No animation
  beyond ambient touches; scene changes are cuts.
- **Top: the writing.** One or two short lines — place, event, feeling.
- **Bottom: the paged panel.** Fixed height, always present. You toggle
  **left / right** (◂ ▸ or swipe) through panes: **ACTIONS · SKILLS ·
  ITEMS** at launch, with JOURNAL and SETTINGS as further pages on the
  same pager. The strip above the pager always shows HP · Might · Will
  · tithes · level · depth. Selecting anything in the scene snaps the
  pager to ACTIONS.
- **Sanity is the vignette.** The dark border closes as sanity falls.
  No sanity bar exists anywhere.

## input (#input)

- **The first tap is free, always.** Layton-style poke-the-scenery:
  tapping describes, selects, surfaces actions. Never advances the
  world, never costs, never harms. Bedrock; no exceptions.
- **Investigation is where risk lives:** explicit actions — PEER,
  LISTEN AT, PRESS YOUR EYE, REACH IN — may cost sanity, spring
  consequences, or open a **situation** (#situations). Some things
  look back.
- **Affordance permanence** (LAWS.md #affordance): tappability is
  constant for an object's lifetime on screen; arrivals/removals only
  via world deltas with cause; gates live in responses. "It's a door."
  is a complete answer.

## stats (#stats)

- **HP** the body · **Sanity** the mind (vignette) · **Might** physical
  contest · **Will** mental contest and resistance.
- Armor soaks physical damage. **Sanity damage is never soaked.**
- HP 0 → the fall (#death). Sanity 0 → the Communion (#communion).
  Both end with waking at the Crossing.

## xp & levels (#xp)

- **XP flows from everything** — kills, rites, discoveries, situations,
  glimpses — but **weighted**: repeatables trickle, firsts gush, and
  yields scale with depth, so the fastest XP is always deeper, never
  circling. Numbers always move; grinding is merely slow.
- Levels (soft cap ~10) grant one choice at rest: +1 Might, +1 Will,
  +2 max HP, or +2 max Sanity. XP and levels survive everything.
- Content never gates on level number; stats gate, levels shape stats.

## items (#items)

- **Four equipment slots** (weapon and armor included) + **two
  consumable slots**. Stash at the Crossing. Keys are consumables.
  Carrying is choosing.
- Weapons set damage and may gate skills. Armor soaks physical.
  Trinkets bend one rule each. Nothing grants rerolls.

## skills (#skills)

- **The agency layer.** Dice land and stand; a limited-use skill spent
  *after seeing them* is the only post-roll play. Uses refill at rest.
- Found, never bought: scrolls, allies, rites. Stat- or weapon-gated.

## combat (#combat)

- Free inspect always shows an enemy's numbers, which bar it threatens,
  intent, and pursuit.
- Exchange: opposed d6 + stat (Might/Might for body, Will/Will for
  mind). Loser takes winner's damage; armor soaks physical only.
- **No rerolls, no takebacks.** Post-roll: a skill, or flee.
- **Flee is free and always present:** d6 vs visible pursuit; failure
  means it strikes. Some cultists would rather talk (#complicity).

## QTEs (#qte)

Punctuation, not the meal: timed choice (visible countdown, labeled
default) · swipe-parry · frame-grab (a hand out of the vignette attacks
the panel) · **sequences** (chained prompts for thresholds and set
pieces; each step telegraphed by the prior beat; failures join the Book
of Ends death reel). Every QTE declares a Will-check fallback; the
accessibility setting converts all (LAWS.md #qte).

## situations (#situations)

Scenes entered through investigation or events: constrained exits,
sometimes no way back but through; dialogue-situations can cost bars or
lives. The free tap before a risky action always carries the scent of
risk; inside, a readable cue precedes any kill (LAWS.md #telegraph).

## the maze (#maze)

- **Authored rooms, procedural arrangement.** Every room is a
  hand-written, linted card from the pool; a seeded generator lays the
  corridor graph. See GENERATOR.md.
- **Landmarks persist; corridors writhe.** Landmark rooms (thresholds,
  shrines, glimpse-sites, the Crossing) keep their place in the graph
  for the whole save. Everything between them **reshuffles on every
  death**. You cannot map the labyrinth — only its landmarks. The maze
  refusing to be learned is the theme made mechanical.
- **Three depths + the final chamber** (v1). Each depth ends in a
  threshold demanding something from that depth.
- Solvability is guaranteed by the generator's walker: every required
  key, rite, and glimpse reachable, every layout escapable.

## the child (#the-child)

- The brother is a **baby**. He cannot speak, plead, or explain. Every
  encounter is image and compulsion only.
- The protagonist **vaguely recognizes everything and remembers
  nothing** — and feels compelled toward the child. The game never
  explains the pull. *You don't remember him. Your arms do.*
- **One glimpse per depth, escalating proximity:** a procession seen
  far off; a cry through an unbreachable wall (logged in the refused
  ledger — the child becomes a quest your failures wrote); a
  cradle-shrine still warm; each time the ritual marks further along,
  the light around him wrong, a second voice under the cry.
- The transformation is shown only as escalating stills. It is gated by
  the player's progress, not a clock.

## complicity (#complicity)

- **The past is in superposition; deeds collapse it.** A hidden ledger
  counts cult-shaped acts: performing rites to pass, wearing the robes,
  spending others to save yourself.
- **Recognition** scales with it: cultists hesitate — "something in
  your gait is familiar" — then defer; doors open that should not.
  Being welcomed is its own horror.
- The game never states who you were. The **ending reads the ledger**
  and tells you who you must have been. Who you were is decided by who
  you are. (Player-facing content stays inside knowledge tiers —
  TRUTH.md.)

## sanity: fraying & the communion (#fraying, #communion)

- Low sanity corrupts descriptions, never affordances; rest points
  always tell the truth. At sanity ≤ 2 the **Fraying**: lies intensify
  and the narrator turns hostile and too familiar — the cult's voice
  getting in.
- **Sanity 0 → the Communion:** a tailored, haunted sequence built from
  **your own ledger** — the shrine you broke restored and watching, a
  robed figure wearing a face from your journal, doors you are ashamed
  of standing open. Scary, personal, and **not an ending**: it always
  concludes with waking at the Crossing, bearing a **communion mark**
  (−1 max Sanity, curable, rarer cure than clearwater).

## death (#death)

- **Every death ends the same way: you wake at the Crossing.** The
  world keeps every door-flag, glyph, item, skill, and level; the
  corridors have moved (#maze); only you got smaller.
- The fall (HP 0) drops your **tithes** where you fell. Reclaim them by
  returning; die again first and an **Effigy** rises wearing them
  (−1 max HP mark until it is broken or you are cleansed).
- **Every death pays** (#death-pays, LAWS.md 11): each fall or
  Communion unlocks at least one new line somewhere. Dying always
  advances the story of being known.

## progress (#progress)

A **ratchet**: route (landmark doors and shortcuts, permanent),
knowledge (glyphs, rites, names — flags survive death; some gates open
only to the *player's* understanding), power (gear, skills, levels).
Attrition is the quiet mechanic — bars refill only at rest, so each
push is a budget of body, mind, and slots. **The refused ledger is the
compass**: every gate that turned you away, logged with its landmark.

## consequences (#consequences)

The journal records only what you witnessed — act and place. No costs,
no amends, no permanence flags. Permanence is learned by attempting
repair and being refused.

## rest & hub

**The Crossing** — where the portal spat you out; it is dark now. Rest
(refill bars and skill uses, spend level choices), stash, one wary
resident, the way down. Landmark shortcuts land here permanently.

## home screen & the book of ends

Title over the Crossing. Continue · New Descent · Book of Ends ·
Settings. The silhouette dims per standing Effigy and communion mark.
The Book of Ends holds only what you personally survived, read, and
died to — the death reel included.

## determinism

A run is fully determined by **save seed + death count + inputs** (QTE
inputs included). Maze layouts, dice, spawns — all replayable exactly
(RULES.md 2, GENERATOR.md).
