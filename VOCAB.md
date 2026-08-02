# VOCAB.md — the closed word set

Frozen. Content may only speak these words. The compiler rejects any
other key and names the offending path (RULES.md §3). Adding a word is a
deliberate act: edit this file, edit the schema, edit the compiler, in
one PR.

## gates

A gate is a conjunction. Every listed condition must hold. An empty gate
(or an absent one) passes always — that is the **fallback**.

| word | argument | passes when |
| --- | --- | --- |
| `flag` | flag name | the flag is set |
| `notFlag` | flag name | the flag is not set |
| `item` | item id | the item is held |
| `notItem` | item id | the item is not held |

Gate arguments are strings or arrays of strings. An array means *all of
them*.

```yaml
gate: { flag: knows_glyph }
gate: { flag: [knows_glyph, lamp_lit], notItem: ash }
gate: {}            # fallback — always passes
```

## deltas

A delta is a change to `GameState`. Deltas are applied **in the order
listed below**, never in the order they appear in the file. This is what
makes two content authors produce the same run.

| # | word | argument | effect |
| --- | --- | --- | --- |
| 1 | `refuse` | line (string) | the action does not happen; ledger the ref |
| 2 | `setFlag` | flag name(s) | add to `state.flags` |
| 3 | `clearFlag` | flag name(s) | remove from `state.flags` |
| 4 | `addItem` | item id(s) | add to `state.items` |
| 5 | `removeItem` | item id(s) | remove from `state.items` |
| 6 | `addObject` | object id(s) | add to the scene's object set |
| 7 | `removeObject` | object id(s) | remove from the scene's object set |
| 8 | `journal` | entry (string) | append to `state.journal` |
| 9 | `goto` | scene id | change `state.scene` |

### refuse purity

A response carrying `refuse` may carry **no other delta**. A refusal
changes nothing about the world except the ledger — that is the whole
point of it. `content-lint` enforces this (H005) and the resolve engine
must not rely on the lint: it applies `refuse` and stops.

### object sets

`state` does not store the object set. The scene's object set is
`scene.objects` plus every `addObject` minus every `removeObject`
recorded so far. Objects never appear or vanish for any other reason —
see LAWS.md §affordance.

## responses

A response list is ordered. Resolution takes the **first response whose
gate passes** — not the best, not the most specific, the first. The
**last response must be a fallback** (empty or absent gate). Content
with no reachable fallback fails the lint.

```yaml
read:
  - gate: { flag: knows_glyph }
    journal: "procession"
    setFlag: book_open
    say: "The glyphs settle into an order you can follow."
  - say: "The marks swim. You cannot hold them."
    refuse: "You do not know how to read this."
```

## say

`say` is not a delta — it produces an `Effect`, not a state change. Every
response may carry exactly one `say`. It is the line the narrator speaks
for taking that branch.
