# VOCAB.md — the closed word set (P0)

The whole engine speaks these words. Content may use them freely;
nothing else exists. New words arrive only by amendment card (one word,
its tests, its lint), one system per wave.

## gates (the `if` of a response; all listed must hold; a response
## with no `if` is the fallback and every action must end with one)

- `flags: [id, ...]` — all set on the run
- `items: [id, ...]` — all currently carried

## deltas (the `then`; applied in order; all optional except `say`)

- `say: text` — the narrator line (always present)
- `set: [flag, ...]` — raise flags
- `give: [item, ...]` / `take: [item, ...]` — inventory
- `journal: id` — add the journal entry with this id
- `refuse: true` — log this response to the refused ledger (GAME.md
  #consequences); implies no other delta fired
- `goto: scene` — move the run to a scene
- `addObject: {scene, object, cause}` /
  `removeObject: {scene, object, cause}` — the only legal way a scene's
  object set changes (LAWS.md #affordance)
- `end: {line, note}` — end the slice

## reserved for later waves (do not implement, do not use)

`contest` (dice), `dropObols` (death), `prompt` (QTE), `roll` (chance
gate), `counter` (economies), `lies` (sanity). Each arrives as its own
amendment card in P2.
