# DUNGEON.md

The generated map: what returns from the §6 cut, on what terms, and in what
order. This is a wave-0 ruling — it amends `PRODUCT.md` and writes no code.
Read time: eight minutes.

## The ruling

The slice's seven-room route is replaced by a **dealt map**: a per-run graph
of rooms, assembled by a seeded generator from hand-authored **recipes**,
walkable in both directions, holding optional limbs and at least one secret.

What "like Diablo" means here — and all it means: the layout differs every
run, routing is a decision, and optional depth holds risk against reward.
It does not mean tiles, free movement, or a camera. The room stays the unit,
the exit stays a button, and every verb in `PRODUCT.md`'s table keeps its
meaning.

**The honest part.** The §6 cut said none of this returns without playtest
evidence, and the moderated sessions `RESET_PROGRESS.md` asks for have not
happened. This ruling overrides that condition by owner's call, recorded
here rather than implied. The reset's definition of done is green in
`RESET_PROGRESS.md`; the polish sweep's no-art rule is untouched by this
plan, which needs no new asset.

## What returns, and what stays dead

The archive already built a generator once (`archive/legacy-design/`,
arts 31–39, 77–85). Three of its ideas are worth their weight and come back
as ideas, not as code:

- **Winnability by construction** — the route out is built first, so no
  generate-and-test loop and no unwinnable seed, ever.
- **The distributional suite** — a generator's correctness is a property
  over a thousand seeds, not an example.
- **The door that leaks its sense** — an exit tells you something true and
  partial about what is behind it, and never a label.

What stays dead, deliberately: the forward-only verdict door (navigation is
the point now), lazy dealing (a map you can walk back through must exist
whole), region lean and lock, priced acts, and required-item keys. Keys are
a third collectible noun wearing a costume; if they ever come, they come as
their own ruling.

## Vocabulary

- **Recipe** — authored content, in `src/content/recipes.ts`: a backdrop id
  (one of the eight that exist), a name pool, arrival lines (first visit and
  cleared revisit), a detail pool, an enemy table, and sense fragments for
  its edges. Recipes are the art direction's answer to procedure: everything
  a player reads or sees was written by a person.
- **Room** — dealt: a stable id, its recipe, its chosen details, its exits.
- **Map** — `generateMap(seed)`, a pure function in `src/game/map.ts`.
  The map is **derived at load, never stored** — the same rule the combat
  cursor already lives by — so a save can never disagree with its dungeon.

## The deal

1. **The spine first.** entry → rooms and fights → gate → exit, dealt as a
   path. The Warden holds the gate; the exit hangs only off the gate. The
   way out exists before anything optional does — that is the whole of the
   winnability proof.
2. **Then the limbs.** One or two optional branches off spine rooms. A limb
   ends in value — a fight with a reward, or a gift room on the offer
   screen the slice already has — and either dead-ends or **loops back**
   past a fight, a shortcut you earned by going the long way once.
3. **Then the secret.** One hidden edge per map, placed on a limb or a
   shortcut, never on the spine.
4. **Doors are open both ways.** Every edge yields an exit in both of its
   rooms; the return edge is labeled BACK. The old game's doors closed like
   verdicts; here the verdict is spent health, and walking back to think is
   allowed.

## Secrets

A hidden edge renders no button until its **tell** has been looked at. The
tell is a detail — "The draft comes from behind the niches." — and pressing
it reveals the way. LOOK's contract survives intact: it always answers, it
never commits, and now it sometimes pays.

- A secret gates a gift room or a shortcut. It never gates the way out and
  never gates the boss; the rooms rule — no hidden thing required to leave —
  holds everywhere.
- `revealed` (edge ids) joins `RunState` and persists for the run, so a
  found way stays found across a revisit and a reload.
- No key, no new collectible species, no new screen mode, no new panel.

## Invariants — each one a test

| invariant | proved by |
| --- | --- |
| exit reachable from entry with every secret edge removed | property, 1000 seeds |
| every dealt room reachable; secret rooms reachable once revealed | property, 1000 seeds |
| every route out passes the gate | property, 1000 seeds |
| spine holds 2 fights before the gate; whole map ≤ 3 + boss | property + balance |
| naive/direct stays near 4-in-5 out; naive/full-clear stays a coin flip | balance, policies over 400 dealt seeds |
| offers per run ≤ 3 until the replace-picker exists | property (see below) |
| visible exits per room ≤ 3, plus at most one hidden | property, 1000 seeds |
| every room's recipe art exists on disk | extends `assets.test.ts` |
| same seed, identical map, every time | property; no `Date`, no `Math.random` |
| every edge has a sense line; every hidden edge has a tell in a detail | property, 1000 seeds |

Two of these deserve their sentence. The **balance bands are the law**: the
reset's harness runs the real reducer over 400 seeds per policy, and it now
runs over dealt maps — a generator change that moves the out-rate outside
its band fails the PR, which is what keeps "how far do I push?" a tuned
question rather than an accident. And the **offer cap is load-bearing**:
`equip()` overwrites plain bones only, on the reset's finding that a run
finds at most three dice; a generator that deals more finds than that owes
the replace-picker first (`equip()` in `reducer.ts` is already marked as
where it goes).

## State

`SAVE_VERSION` → 3, a deliberate break, no migration — the house rule.
`roomId` becomes a dealt id; `revealed` is added; `cleared`, `looked`,
`path` keep their shapes. Three ids are stable in every deal — `entry`,
`gate`, `exit` — so the fixtures and the end-of-game tests keep their
addresses: `?seed=7&room=gate&hp=1&mode=combat` means today what it means
tomorrow.

## Orientation

Rooms have names, return edges say BACK, and every exit leaks its sense.
No map panel in this ruling — a new panel is its own product decision, and
at a dozen rooms the bet is that names and senses carry it. The trigger to
revisit the bet: a playtester lost for more than a minute.

## The waves

- **0 — the ruling.** This document; `PRODUCT.md` amended as below. No code.
- **1 — the seam.** `recipes.ts` and `map.ts`, with a degenerate deal that
  emits the authored seven exactly. Every existing browser and unit test
  green with no behavioral diff; `SAVE_VERSION` 3. This wave proves the
  seam is real before anything interesting flows through it.
- **2 — the deal.** Spine, limbs, loops. The property suite and the balance
  harness over dealt seeds. `first-run.spec.ts` pins a named seed and
  fights its whole route with real presses, as it does today.
- **3 — the secret.** Hidden edges, `revealed`, the gift-room and shortcut
  payloads. A browser test finds one: press the tell, watch the exit
  appear, take the reward.
- **4 — the pool.** More recipes over the eight existing backdrops, arrival
  and sense variants, cleared-revisit lines. **No new art while
  `POLISH_PROGRESS.md` is open** — a recipe that genuinely needs a backdrop
  files `## HUMAN ART REQUIRED` and waits.

## PRODUCT.md amendments, exactly

1. The pitch: "descend through hand-authored rooms" → "descend through a
   dealt map of hand-authored rooms".
2. The slice diagram is replaced by a pointer to this document's invariants.
3. The parked list: strike "the provable-winnability generator" (it is this,
   returned on these terms). "Procedural region lean and lock" stays parked.
4. The gate's "procedural world rule" bar becomes: no *second* procedural
   system — regions, lean, lock, keys, spawned enemies — without its own
   ruling.

## Risks, stated rather than buried

- **The authored feel is the thing at stake.** ART_DIRECTION promises
  places that feel authored rather than procedurally decorated, and eight
  backdrops re-dealt can betray that promise. The mitigations are recipes'
  authored variants and limbs dealt as authored two-to-three-room *chunks*
  rather than loose rooms. The tripwire is the existing acceptance line:
  if a run's rooms stop being distinguishable as thumbnails, the pool is
  too thin and wave 4 is late.
- **Layout variety is not replay value.** With today's loot pool, run three
  feels like run two whatever shape the map takes. After wave 2 the binding
  constraint is content — recipes, senses, rewards — not code.
- **Free treasure bends the curve.** A gift room behind a secret raises the
  heuristic line; the balance bands catch it, which is why they gate the PR.
