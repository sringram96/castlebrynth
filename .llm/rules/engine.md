# engine rules (non-negotiable)

- src/core is pure: no DOM, I/O, Date, Math.random, console; all
  randomness flows from the seeded RNG on state, in fixed draw order.
- Determinism: run = seed + death count + inputs, exactly; state
  survives JSON round-trip; saves use a versioned envelope (unknown
  version → null, never throw).
- Two closed languages. The Descent's complete word set: gates
  {flags, items} · deltas {say, set, unset, give, take, adjust,
  journal, refuse (→ refused ledger), goto (declared doors only),
  addObject, removeObject, prompt, fight (emission), end}. The Lots
  speaks manifest hooks + effect verbs (DESIGN.md §the-lots). Unknown
  words fail at LOAD. A new word/verb/hook is its own Asana task,
  never a side effect.
- Combat content lives in grammar.yaml (+ experiments overlays);
  engine code never names a specific die, joker, or enemy.
- Run-ledger vs campaign-ledger are distinct typed branches of state;
  death code may only touch the run branch.
- No takebacks: nothing rerolls or cancels a landed die, anywhere.
