# The world — time, touch, structure, the chain, the drift
Articles keep their ledger numbers; cite as "art. N". Statuses: SETTLED
binds every task. STANDING is inherited from GAME.md, unamended. DEFAULT
binds until deliberately revisited. PARKED is not law — build nothing
that assumes it. How the game is touched — the interaction model — lives
in the-thumb.md (arts 66–76).

## Time & the clock
1. SETTLED — The rules are discrete: no decision is ever lost to slowness.
   Any pulse in presentation is skin — skippable, with a settled end-state.
2. SETTLED (amended by ruling) — QTEs are the exception to the still
   world. Rare by law — sparing enough to stay events — they may arrive
   unannounced, even mid-browsing, with real consequences. Budgets are
   tuning; rarity is not.
3. SETTLED — Key items — anything required to finish a run — are never gated
   behind reflexes. A run cannot become unwinnable by a slow thumb.
4. SETTLED — Optional treasure may be fleeting: a moment opens mid-scene
   and, unmet, closes. Missed means missed for that run; the reseed may
   offer it again. A window open when the app closes resolves as missed.
5. SETTLED — Tapping never harms. The world never punishes touch; it
   sometimes stops offering.

## Touch
6. SETTLED — One thumb. Everything ever clickable is always clickable;
   looking is free and always answers.
7. SETTLED — Outcomes, not clicks, are gated — on an item, a piece of
   knowledge, or a world event.
8. PARKED — The lean (drag to peek with true parallax, spring home) exists
   in the reference renderer. Not law.

## Structure
9. SETTLED — Rooms are hand-authored; runs are procedurally arranged from
   them. Spire skeleton, Layton flesh. Forward only — the engine has no back.
10. SETTLED — Knowledge is a key: learned clues are game state, live on the
    permanent ledger, and survive death.
11. STANDING — Two ledgers. The run burns at death; the permanent survives:
    dice, signature, keepsakes, knowledge, the Book of Ends.
12. PARKED — Classes. (See art. 56: the socket is a curated starting hand.)

## The chain
31. SETTLED (amended) — Blind chains. A depth is a chain of rooms joined
    by doors; at each room, one to three doors — one is a corridor
    moment, three is a crossroads. No map UI exists — the road ahead is
    only ever the doors in front of you. (Senses on doors are PARKED
    with the hint system; see art. 77's note.)
32. SETTLED — Every death reseeds. Each run is a fresh randomized
    arrangement of the authored rooms.
33. SETTLED — Every arrangement must be winnable: on any path the player
    can be forced down, whatever a lock demands exists upstream of it.
    (Under art. 80's just-in-time placement this holds by construction,
    not by search.)
34. SETTLED — Knowledge attaches to things, not places. Clues, names, and
    decodings key on room and entity identity, never position — so they
    survive both death and the reseed. (Identity means the template;
    see art. 82.)
35. DEFAULT — A door commits one room. Each choice selects only the next
    room; no hidden multi-room lanes. Blind play cannot perceive a lane,
    so the door itself is the branch.
36. DEFAULT (amended) — A run is seeded at waking, and the arrangement
    derives from the seed plus the choices made: seed + choice history →
    the same run, always. The history graph of a run — every room dealt,
    every door taken — is the source of truth; resume replays it.
    Rerolling the labyrinth still costs what it should — a death.

## Room types & the grammar
37. SETTLED — The taxonomy the generator deals: Passage (the Layton bread),
    Lair (the fight is the room), Puzzle (a lock of logic), Trove (treasure
    with teeth; fleeting moments live here), Omen (story and strange
    bargains), Sanctum, Merchant, Savior. Fixed anchors: the Crossing opens
    every run; the Warden's door ends the depth. Length is tuning, not law.
38. SETTLED (amended) — Rules, not templates. The generator's mercy lives
    in the math: just-in-time placement makes stranding impossible
    (art. 80), and rhythm obligations (fight-count bands, no-clump rules)
    are distributional laws tested across seeds, not per-seed
    constraints solved for.
39. DEFAULT — Depth tendencies: soft type-weights per depth (shallow leans
    quiet, deep leans toward teeth) keep rhythm learnable without
    templates. Under the drift, tendencies weight the pools.
40. DEFAULT — Sanctum is a place granting a small breath; Savior is a rare
    being granting a large mercy. What each restores awaits the economy
    ruling.

## The drift (ratified 2026-08-04)
77. SETTLED — Regions and the drift. A depth holds regions (how many is
    content) plus a neutral pool. Every dealt door carries a hidden
    region tag; every choice tallies. Rooms deal from pools weighted by
    the tally — the labyrinth leans as the player leans. Twenty
    questions, not a fork in a road: no single door means much, and the
    pattern of doors means everything. (When the parked hint system
    returns, a door's sense is simply its region tag, leaking.)
78. SETTLED (ruled) — The lock is forced. By a set door count (content),
    one region locks: the rest of the depth deals from its pool, its
    bound encounters activate, and the first room after the lock
    announces the arrival. Every run arrives somewhere; arrival is the
    payoff of commitment.
79. SETTLED — Dealing is lazy. A room is dealt when its door is opened,
    derived from seed + choice history (art. 36). Nothing about the road
    not taken is ever computed, so nothing about it can leak.
80. SETTLED — Keys arrive just in time. Required items are not bound to
    rooms: when the engine has committed to a lock ahead, it places the
    key in the player's path before it. Stranding is impossible by
    construction; art. 3's door-refusal remains as the belt to this
    suspender.
81. SETTLED — Depth length is a content variable: fixed rooms per depth,
    authored per depth, changeable without touching the engine.
82. SETTLED — Template and instance. Rooms may repeat within a run.
    Knowledge keys on the template (art. 34 unchanged — recognizing a
    repeat means what you learned applies); scene state keys on the
    instance (what you took here is gone from *here*).
83. SETTLED — Binding and scope. Every encounter declares two axes:
    binding (bound to a room, or floating into sockets) and scope (how
    it repeats). Straw rows: a plain horror floats and repeats freely; a
    special horror floats and is unique per run; a merchant may be bound
    or floating, and remembers. Rooms declare sockets; encounters carry
    their own words — a room's authored prose never assumes what fills
    its sockets.
84. SETTLED (ruled) — What survives death. Unique encounters respawn with
    the reseed — the run burns (art. 11) — but meetings are knowledge:
    the permanent ledger remembers who you have met, and a merchant's
    memory of you lives there too. The labyrinth remembers you.
85. PARKED — The trail. The run's history graph (art. 36) could someday
    be shown as where you have been; art. 31 bans the road ahead, not
    the road behind. Showing it still requires an amendment. Parked,
    tracked on the board.

## Puzzles & the QTE guardrails
59. DEFAULT — Puzzles are in-scene locks opened by observation and
    knowledge; full-screen minigames are reserved for later CINE moments.
61. DEFAULT — An ambush QTE can cost anything except the run itself: it
    wounds, pins, steals, spoils — it never kills outright.
62. DEFAULT — An unresolved window resolves as failed. The lock screen is
    not a shield.
