# The generated castle

The user approved areas, section bosses, progression items, a better minimap
and removing the forward-only DAG rule. This is the current exploration
contract. The dice, scoring, enemy health/damage, drops and healing amounts
are unchanged by this addition.

## A run

Every normal DESCEND builds a seeded maze of 32 room instances: nine rooms
and a keeper in each of three areas, plus the starting stair and final exit.
Rooms have authored pictures and descriptions; their connections, ordinary
room assignments, key locations, fonts and die caches vary with the seed.

| Area | Required item | Section keeper | Extra grid passages |
| --- | --- | --- | --- |
| The Ossuary | Bone Key | The Gnawing | 1 |
| The Bellworks | Bell Clapper | The Marrow | 2 |
| The Deep | Warden Seal | The Warden | 3 |

Each section has a 3×3 grid built with a randomized depth-first spanning tree
and extra edges, creating actual loops. Passages are reciprocal, including
between areas. The final exit ends the run. Each keeper blocks the next area;
its matching key is reachable without passing that keeper. Keys remain carried
after use, cost nothing, and never occupy or modify a combat die slot.

An area's font may be saved for later. Its d6 + 2 result is recorded once per
room. The first two areas each have an optional die bargain at the existing
price; the Deep has one optional treasure. Removing that treasure room still
leaves an escape route. Enemies, taken rewards and purchased dice never refill
on return. Unclaimed loot remains available where it fell.

The three existing enemies serve as section bosses, with their existing rules
and artwork. This introduces no new attack phases or combat statuses. Entering
a live keeper's room still commits the player to its encounter, as before.

## Reading the place

N/E/S/W arrows sit at fixed compass positions on the world. This makes
generated connections agree with the map even when the painting does not
depict four doorways. Locks are inspectable and state their exact required
item. Key pickups state what they open before TAKE.

The compact map is inside the exploration MAP button. The full map has tabs
for areas already visited, unique room coordinates, and descriptions of visited
rooms. It shows visited rooms and the unknown rooms immediately adjacent to
them. Unknown room contents never enter the map DOM. Symbols identify current
position, locks, remaining keys, fonts, dice and cleared keepers. These markers
update from the saved room state. The map cannot teleport the player.

The exploration hand remains visible between fights. Area names appear on
entry and room labels identify the current place. North/south and east/west
crossings move in opposite directions; motion-off still settles immediately.

## Assets

The six previously approved Bellworks kit backdrops are copied unchanged into
public/assets/rooms as bellworks-hanging, bellworks-rope, bellworks-weight,
bellworks-nest, bellworks-service and bellworks-balcony. Each is 1024×1536.
Original art and masters are untouched. These delivered PNGs are preserved
when the legacy art pipeline rebuilds its own outputs.

The Ossuary and Deep reuse existing paintings. Some procedural rooms share
art; coordinates and names distinguish them. Dedicated key sprites and new
boss art are not included. The experimental bell animation atlas remains in
the separate animation kit; it is not a runtime dependency of this change.

## Code and saves

- areas.ts and mazeRooms.ts define content; mazeGenerator.ts connects it.
- validateMaze checks geometry, reciprocal passages, locks, reachable keys,
  unavoidable bosses, loops, a single ending and optional treasure.
- GO, TAKE_KEY, CLAIM_DIE and RITUAL_ROLL validate actions in the reducer.
- Save version 13 stores the generated map, carried keys and font results by
  room. Reload resumes the same layout and discoveries. Incompatible saves
  follow the existing discard-with-notice policy; there is no migration.
- START_RUN defaults to the maze. Explicit layout: classic and ?plan= URLs
  retain old authored regressions. The low-level newRun factory still accepts
  a supplied map and defaults to an authored map for those fixtures.
- ?maze=1&seed=1 previews a reproducible maze with persistence disabled.
  Normal play chooses a new seed and saves normally.

## Verification

The unit suite currently passes 747 tests. The new checks replay 128 seeds,
validate every generated map, exercise locked gates and key pickup, verify
backtracking and save/load, prevent duplicate rewards and font refills, and
check discovery fog. Across 48 complete reducer journeys, 24 escaped and 24
ended in combat death; none stalled in the maze. This is an exploratory sample
using the existing heuristic and taking found dice, not a tuned balance target
or a claim about player difficulty. Seeds 1, 2 and 3 escape with that policy.

56 focused mobile browser tests passed: the five new maze checks plus existing
crossing, save/resume, restart, loading and exploration UX regressions. The new checks
cover controls at 320, 390 and 430 pixels, lock discovery, key pickup,
backtracking, map persistence, area tabs and a three-boss escape through real
controls. Screenshot review caught a long-map overflow; the room list now
scrolls while CLOSE stays reachable, with regression assertions for both ends
of the scroll. The older persistent-hand UI also had undersized targets in
authored fixtures; all layouts now give each bone a full 44px target. The 13
maze and exploration UX checks passed together after these fixes.

The normal Playwright browser download failed, so verification used Chromium
153 from a temporary installation of @sparticuz/chromium with CHROMIUM_PATH.
That package is not a game dependency. The complete historical browser suite
was not rerun. The production build and typecheck pass.

The next design check is human pacing: whether nine
rooms per area creates satisfying exploration, how often paintings repeat, and
whether fonts are worth returning to. Those questions need play, not more
mechanics or a survival percentage inferred from a small automated sample.

## What a shut way looks like

A room seats four compass ways and a seeded maze rarely gives it four, so for
as long as the barriers were missing the game could not tell the player the
difference between *there is no road north* and *the road north is gated*. Both
were an absence.

Now every painting declares the openings it has — `content/passages.ts`, a box
per direction in the scene's own fractions, read off the painting by eye — and
what fills one is decided by the state the reducer already settled:

| state | what it means | what is drawn |
| --- | --- | --- |
| `open` | a way out, and it works | nothing; the hotspot is the way |
| `sealed` | no exit in that direction at all | rubble, the arch fallen in |
| `locked` | an exit that wants a key you have not got | a gate, with LOCK on it |
| `guarded` | an exit the room is holding while something lives in it | the same gate |

Two rules keep it honest. **It decides nothing**: the state comes from
`exitsAvailable` and `exitUnlocked`, which is what the reducer's own GO guard
asks, so a drawn gate and a refused press cannot come apart. And **it is never
a press**: the plane is `aria-hidden` and takes no pointer events, because the
lock already has a real button — which now sits on the gate rather than at the
compass seat, since a verb and the thing it is about belong in one place.

**The hall is the exception.** Its arch is most of its frame, so a plate laid
over it would read as a patch on a wall. Two whole repaints of the room were
delivered instead — the arch fallen in, and the arch gated — and the backdrop
swaps for them. Nothing else in the game does this, and the rule for when
something else should is the same one: a patch that would cover half a painting
is a repaint.
