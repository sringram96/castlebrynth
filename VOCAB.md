# VOCAB.md — the Descent's closed word set (v2)

The room engine speaks these words; nothing else exists. New words by
amendment card only. (The Lots has its own closed language:
GRAMMAR.md hooks + verbs.)

## gates (all listed must hold; gateless response = mandatory fallback)

- flags: [id, ...]      — all set on the campaign ledger
- items: [id, ...]      — all currently carried (run ledger)

## deltas (applied in order; say always present)

- say: text
- set: [flag, ...] · unset: [flag, ...]
- give: [item] · take: [item]
- adjust: {stat|tithes, amount, clamped}
- journal: id
- refuse: true          — logs to the refused ledger; no other delta
- goto: door_ref        — forward-only; doors bound by the draw engine
- addObject/removeObject: {scene, object, cause}   (LAWS #affordance)
- prompt: {...}         — QTE effect (input returns via act)
- fight: enemy_id       — the one doorway: invokes the Lots, returns
- end: {line, note}

## reserved (do not implement, do not use)

lies · counter · dropObols — parked ideas; amendment cards only.
