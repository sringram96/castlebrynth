# LAWS.md — laws of the world

These are not engineering rules (see .llm/rules/). These are the promises
the world makes to the person inside it. Breaking one is a content bug
even when every test is green.

## §affordance — the world does not rearrange itself behind you

An object's presence in a scene changes **only** through an explicit
`addObject` / `removeObject` delta, and every such delta must have a
cause the person can point at: something they did, one tap ago.

Objects never appear because a flag happens to be set. They never vanish
because the scene "moved on". If the pool is gone, it is because you
drained it, and you were there when it drained.

The engine enforces the mechanism; the author owes the cause.

## §refusal — a refusal is information, not a wall

When the world refuses, it says *why* in the world's own terms — never
"you can't do that". A refusal must name the thing you lack in language
that tells you what to go find.

> The marks swim. You cannot hold them.

is a refusal. It tells you the problem is in your eyes, not in the book.

> You can't read the book yet.

is not. "Yet" is the author talking to the player about the game.

A refusal is ledgered (`state.refused`). The world remembers being asked.
An action refused once and then permitted is the shape of every good
scene in this project — it is the thing P0 exists to prove.

## §persistence — the world remembers, the person forgets

Anything the person did is in state: flags, items, journal, the refusal
ledger. Nothing about the world lives in a closure, a module variable, or
a clock. Two runs from the same seed and the same taps are the same run,
forever, on any machine.

## §economy — the journal is not a log

`journal` entries are the person's own record, in their voice, of things
that will matter later. One word or a short phrase. If everything is
journalled, the journal is noise and the person stops reading it.

`procession` is a journal entry. `You read the book.` is not.

## §naming — the world is older than you

Scene, object, and flag ids are lowercase snake_case and named for what
the thing *is*, not what it does for the plot. `stone`, not
`tutorial_stone`. `knows_glyph`, not `book_unlocked`.
