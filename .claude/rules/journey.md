# The journey — the modes, and where every mechanic lives
Articles keep their ledger numbers; cite as "art. N". Statuses as in
the-world.md. Ratified 2026-08-07 by the mend's first wave.

This file is the missing middle. The other five rule files each say what
one thing *is* — a room, a touch, a turn, a word, a world. None of them
says what shape the game has when you stand back from it: which screens
exist, what question each of them asks, and where any given mechanic
lives. That was smeared across a hundred and twenty articles and a
chronicle nobody could hold in their head, so it is written down here
once.

Nothing in this file invents a mechanic. Every row below is law that
already existed somewhere else; what is new is that it is in one place
and can be checked with a grep instead of with a feeling.

## The modes

121. SETTLED (ruled 2026-08-07) — **The game is five modes, each answering
     exactly one question, and every transition between them is a declared
     event.** This is art. 91 — *transitions are declared events, never
     inferences* — said about the whole game instead of about the tray.

     A mode is not a screen and not a panel. It is **what the player is
     being asked**. Two modes may look identical (the Descent and a Fight
     are the same room, art. 30) and one mode may be several screens (an
     Ending is a scrawl or a black door). What makes them different modes
     is the question.

| mode | is | the one question | in | out |
| --- | --- | --- | --- | --- |
| **Threshold** | a screen — `GATE`, cast the way any room is cast | *do I go down?* | boot, always (art. 123); abandoning a run | **Descend** → Choosing when the pouch has outgrown the hand, else Descent; **Continue** → back into the run exactly where it stood; the Book; Settings |
| **Choosing** | a screen, no tabs | *what comes down with me?* | any press that begins a descent, when `mustChoose` | the commit verb → Descent |
| **Descent** | the room, continuous | *which door — and what do I touch?* | a descent begun; a fight ended without dying | the horror tapped → Fight; the last door with its keeper down → Ending; the body at nothing → Ending |
| **Fight** | the same room, with the panel area turned to FIGHT | *how do I spend this hand?* | tapping the horror (art. 68) | won → Descent; fled → Descent, the fight paused where it stands (art. 63); killed → Ending |
| **Ending** | a screen: the scrawl, or the black door | *what did I keep?* | death; the Warden's door; abandonment | **Wake** / **Descend** / **Choose** → Choosing or Descent. Abandonment is the exception: it was pressed at the door, so it lands back on the Threshold |

     **Settings is a screen and not a mode**, because it asks nothing about
     the run — art. 116 makes it presentation, and a mode is a question the
     labyrinth is putting to you. It stands on the Threshold's room and
     returns there.

     **The panels are not modes either.** ACTS, POUCH and FIGHT are art. 67's
     anatomy: where the thumb is inside the Descent or a Fight. Focus moves
     only through `panelAfter`, which is six lines and the whole of art. 91.

     Two facts follow that are worth writing down rather than rediscovering:
     **the Threshold is reachable from boot and from abandoning and from
     nowhere else**, and **Settings is reachable from the Threshold and from
     nowhere else**. Both are consequences rather than decisions. Neither is
     a defect today — a reload costs nothing and loses nothing (art. 75) —
     and both are the kind of thing that becomes one silently, so they are
     named here and not in a wave journal.

122. SETTLED (ruled 2026-08-07) — **No mechanic ships without its row.** A
     mechanic that cannot say which mode it lives in, which ledger it
     writes to, and which articles govern it is not finished being
     designed. The table below is the statement, and adding to it is part
     of shipping rather than a chore after it.

     This is the paper half of what the two-ledger discipline already does
     in code (art. 11): the rituals make it impossible to *mix* the ledgers,
     and this makes it impossible to ship a mechanic without saying which
     one it is on.

## The mechanics

Every mechanic in the game, one row. **Ledger** is where the mechanic's
state lives: `run` burns at death, `permanent` survives it, `—` means the
mechanic holds no state at all (it is derived, or it is a script over an
outcome already decided).

### The Descent

| mechanic | ledger | articles |
| --- | --- | --- |
| candles — one beat of prose at a time | run (`at.beat`) | 29, 69; voice.md |
| looking, and the verb a look summons | run (`looked`) | 5–6, 68–69, 111 |
| acts and deeds, keyed on the instance | run (`did`) | 7, 70, 82 |
| a priced act — the price in the look, before the press | run (the body) | 5, 120 |
| the fork, and the half you forfeit | run (a deed) | 89 |
| what you refused, remembered | **permanent** (flags) | 84 |
| doors, and the sense each one leaks | run (`history`) | 31, 35, 71, 77 |
| the drift tally, and the forced region lock | — (derived from `history`) | 77–79 |
| lazy dealing — a room exists when its door opens | — (derived from seed + `history`) | 36, 79 |
| required things, and keys placed just in time | run (`carried`) | 3, 33, 80 |
| the mercies — the Sanctum's breath, the Savior's | run (the body) | 40 |
| the Savior's memory of you | **permanent** (`memories`) | 84 |
| the doorway stir, and the room's one unbidden beat | — (hashed off identity) | 106–110, 117 |
| the advance — the thing come close | run (`fight.advanced`) | 28, 30 |
| the lock, the key turning, and the keeper it wakes | run (a deed) | 37, 68, 97, 118 |

### The Fight

| mechanic | ledger | articles |
| --- | --- | --- |
| the turn — Roll, Reroll, Attack | run (`fight`) | 41, 44–46 |
| the intent, shown before the first casting | run (`fight`) | 42, 57–58, 65 |
| the ladder — shapes and multipliers | — (content) | 45, 48 |
| the card — each line once per fight | run (`fight.card`) | 63–64 |
| armor, and what corrodes or pierces it | **permanent** (a body stat), spent in the run | 47, 60 |
| riders, bonds, talismans, levels | **permanent** (the pouch and keepsakes), read into the run | 49–54, 86–88 |
| rolling goods — carried outside the hand | **permanent** (carried), rolled inside a turn | 51, 54 |
| the beats a claim resolves in | — (a script over an outcome already computed) | 1, 116, 119 |
| flight — the fight pauses where it stands | run (`fight`) | 41, 63 |
| the fight that survives a lock screen | run (`fight`), through the vault | 36, 75 |

### The Choosing, and the Ending

| mechanic | ledger | articles |
| --- | --- | --- |
| the pouch, ordered — and the hand as its first `handSize` | **permanent** | 55–56, 60, 124 |
| hand size, health and base armor as body stats | **permanent** | 47, 60 |
| the signature — the first die you ever collect | **permanent** | 56 |
| knowledge — clues keyed on the template, not the place | **permanent** (`known`) | 10, 34 |
| meetings — who you have met, and who remembers you | **permanent** (`met`) | 84 |
| the Book of Ends, opened by a scrawl and never empty | **permanent** | 11 |
| the reseed — every death deals a fresh labyrinth | run (a new seed) | 32, 36 |
| abandoning — an ending you pressed, written down | **permanent** (a Book line) | 11, 71 |

### Standing over all of it

| mechanic | ledger | articles |
| --- | --- | --- |
| the two ledgers, crossing only through the named rituals | both | 11 |
| exact resume — every mutation written, boot restores | both, through the vault | 36, 75, 91 |
| the migration ladder, and the quarantine | both | 11 |
| preferences, and the vault as text the player can carry | **permanent** | 116 |
| panel focus, moved only by `panelAfter` | run | 91 |
| the word band's three states — looked at, coming, just happened | run | 29, 69, 118 |
| nothing offered that cannot change anything | — (a question about a room) | 118 |

## What this file is not

It is not a spec of the screens' layout — that is art. 67's anatomy and
`index.html`. It is not a backlog — that is the board. And it is not a
place to settle an argument: where a row here disagrees with the article
it cites, **the article wins**, and the row is the bug.
