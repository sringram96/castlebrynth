# GENERATOR.md - authored rooms, procedural maze (v1)

The law for how the labyrinth is laid. Engine cards implement this;
content cards feed it.

## the split

- **Rooms are authored.** Every room is a hand-written card in the
  pool, individually linted by every fairness law (LAWS.md). Rooms
  carry tags: depth (1-3, final), role (corridor | chamber | landmark |
  shrine | glimpse | situation | threshold), and exit sockets
  (n/s/e/w-style logical exits).
- **Arrangement is procedural.** A seeded generator lays each depth as
  a graph: landmark nodes fixed for the save, corridor/chamber nodes
  drawn from the pool and rewired.

## persistence & reshuffle

- **Landmarks persist** for the whole save: thresholds, shrines,
  glimpse-sites, the Crossing, and any room where a permanent flag was
  earned. Their graph positions never move.
- **Corridors reshuffle on every death** (fall or Communion): all
  non-landmark nodes and edges are redrawn. Doors-unbarred and
  shortcuts attach to landmarks, so route progress survives while the
  space between writhes.

## determinism

- Layout seed = hash(save seed, depth, death count). Same save, same
  death count, same maze - replays are exact (RULES.md 2). Generation
  draws from the run RNG stream in a fixed order.

## solvability walker (the guarantee)

After laying a depth, the generator PROVES before accepting:
1. Every threshold, glimpse-site, and required-key room is reachable
   from the depth entrance.
2. Every gate's key (item/flag) is obtainable on a reachable path at or
   above its gate (with knowledge flags treated as global).
3. No dead state: from every room, a path exists onward or back.
4. Exactly one glimpse-site per depth is placed and reachable.
Failure = redraw with the next stream draw (bounded retries, then a
known-good fallback layout). The walker is engine code, run at
generation time AND as content-lint over the pool + constraints.

## knobs (per depth, in data)

Room count range, branch factor, dead-end density (dead ends carry
reward or dread, never nothing), pool weights per role, situation-room
frequency. Tuned by the sim harness, not by taste alone.

## engine impact

One amendment: exits in room cards are **logical sockets**; the
generator binds them to concrete neighbors at layout time (goto targets
resolved through the binding). New engine module (pure, seeded):
generate(depth, seed, deaths, landmarkState) -> depth graph. VOCAB
unchanged otherwise.
