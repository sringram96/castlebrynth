# Polish sweep: clarity, motion, tray

Working branch: `claude/polish-clarity-motion-tray-cvvq2h`.

> The specification named `polish/clarity-motion-tray`. This session is pinned
> to the branch above by its harness and may not push anywhere else, so the
> name differs and nothing else does.

**No art was authored in this sweep.** See `CLAUDE.md` § *No art in the polish
sweep*. Every change is layout, motion, copy, or rules — `git diff --stat main`
touches nothing under `public/`, and no new image file exists.

The approach-encounter wave that followed did need art, and stopped rather
than drawing it: see `## HUMAN ART REQUIRED` at the end of this file.

---

## Gates

| | baseline (`7d7d653`) | final |
| --- | --- | --- |
| `npm run typecheck` | clean | clean |
| `npm test` | 5 files, 77 tests | 7 files, 96 tests |
| `npm run build` | 36.0 kB js / 11.2 kB css | 42.2 kB js / 13.1 kB css |
| `npx playwright test` | 38 passed | 78 passed, 0 skipped |
| `npm run balance` | all gates green | all gates green, two gates added |

In this container Playwright needs `CHROMIUM_PATH=/opt/pw-browsers/chromium`:
the managed download is build 1234 and the image ships 1194.

Screenshots: `npm run shots -- <label>` writes the acceptance set at 390×844
and 360×800 to `screens/<label>/` (gitignored — they are evidence for a
person, not repository content). `screens/baseline/` and `screens/final/` were
both captured and compared.

---

## Measured plate geometry

`src/content/tray.ts` carried coordinates "measured off the master". Several
had drifted from the shipped `public/assets/ui/tray.png`, which is the direct
cause of complaint 5. Everything was re-measured off the actual 730 × 364 file
by luminance profile — the ribs of the frame are bright, the bays are dark —
and cross-checked against 3× crops.

| thing | painted (source px) | was | now |
| --- | --- | --- | --- |
| crown ribs | 170, 236.7, 303.3, 370, 436.7, 503.3, 570 | pitch 0.101 | pitch 0.09132 |
| first die centre | 203.3 → 0.2785 | 0.236 | 0.2785 |
| crown bay interior | y 52–88, 55 × 36 | y 21–96 | y 52–88 |
| relic bay centres | 566.5, 621.5, 678 | 0.788 / 0.864 / 0.940 | 0.776 / 0.851 / 0.929 |
| relic bay interior | y 166–256 | y 157–244 | y 166–256 |
| action beds | x 113–263, 275–452, 463–611; y 301–346 | y 291–342 | y 301–346 |
| well | x 200–524, y 108–255 | x 182–533, y 104–260 | x 200–524, y 108–255 |

The old first-die centre sat 31 source px left of its bay and every bay was
23 px too tall, which is why the baseline screenshots show six dice resting on
the crown's top rail rather than in it.

### Reference images supplied mid-sweep

Two annotated layout images were provided. The **zone model** in them is
adopted as the vocabulary of `src/content/tray.ts` — top rail, dice zone, main
well, footer — and the structure (orb left, six bays, three right slots, three
footer beds) matches the shipped plate.

Two things in those images are deliberately not used:

1. **The numeric dice-slot table** (`Slot 0: (0.14, 0.10) w 0.11 …`) disagrees
   with the dashed boxes drawn in the same image *and* with the shipped PNG. On
   `tray.png`, x 0.14 is the health orb and x 0.84–0.95 is the second and third
   relic bay — those numbers would put die 1 on the orb and die 6 in a relic
   slot. The drawn boxes span ≈0.27–0.72, which agrees with the measurements
   above. Measurement wins.
2. **The footer tabs** (`Acts / Map / Pouch`) are pre-reset nouns. The reset
   deleted the tab bar and this sweep may not reintroduce a screen mode. The
   footer stays `MENU · primary · secondary`.

If the plate is repainted, only the table in `src/content/tray.ts` needs
remeasuring; nothing else in the codebase reads a coordinate.

---

## P0 — Guardrails and baseline
Status: DONE
Files changed: `POLISH_PROGRESS.md` (new), `CLAUDE.md`, `tools/shots.mjs` (new), `package.json`, `.gitignore`
Tests added/changed: none — no runtime behaviour changed
Behavior verified: all four gates green at `7d7d653`; baseline screenshots captured at both widths
Deviations from spec: branch name, as noted at the top. `main` had advanced one
commit past the audited baseline (`7d7d653`, restoring the build's commit
stamp); it touches nothing this sweep is about and was left alone.
Human decision needed: none

## P1 — Rename global INSPECT to MENU and reserve inspect semantics
Status: DONE
Files changed: `src/content/text.ts`, `src/ui/trayView.ts`, `src/ui/screens.ts`, `src/ui/components.ts`, `src/ui/worldView.ts`, `src/app/app.ts`
Tests added/changed: `test/browser/menu.spec.ts` (new, 9 tests); selector renames across the suite
Behavior verified: the bottom-left bed says `MENU` in every mode and opens the
loadout; `renderInspect` → `renderMenu`, `inspecting` → `opened`; no control
anywhere renders the word INSPECT; a crown die out of a throw opens that die's
card, a crown die in a throw still chooses, a relic bay opens that relic, and a
room detail is described as *Inspect the far door*. All three inspections move
no state — asserted by deep-comparing `GameState` across open and close.
Deviations from spec: the mode split is on **whether there are dice on the
table**, not on explore-vs-combat. A fight before its ROLL has nothing to
choose, so a tap there dispatched a `SELECT` the reducer discarded — the same
dead press the spec is fixing, one screen over. `VERBS.inspect` was deleted
rather than kept for contextual use; the contextual labels are written where
they are used.
Human decision needed: none

## P2 — Make tray geometry fit at phone size
Status: DONE
Files changed: `src/content/tray.ts`, `src/ui/components.ts`, `src/ui/trayView.ts`, `src/style.css`
Tests added/changed: `test/browser/tray.spec.ts` rewritten; fit asserted at 390×844 and 360×800 across eight stations
Behavior verified: the plate is laid out so its content band — the orb's outer
edge to the third relic bay's inner edge, 0.913 of the picture — exactly fills
the viewport; only the painted margin bleeds. `seat()` separates target from
object: a die's button is the bay's pitch wide and a flat 44 px tall, centred
on the bay, and the visible die is 70% of the pitch so the rib beside it shows.
No label ellipsizes (`text-overflow` removed and asserted against); no
horizontal scroll; the well never overlaps an action bed; the room's tappable
details are all above the plate.

**Deviation, and the one real one in this sweep.** The six crown bays are
painted 66⅔ of 730 apart and the three relic bays 55 apart. On a 390 px phone
that is a 38 px and a 32 px pitch. Targets grown to 44 px *wide* would have to
overlap each other, and a tap that fires the neighbouring die is a worse
failure than a slightly narrow target. Widening the plate until the pitch
reaches 44 px needs 482 px, at which point 60% of the health orb is off the
left edge — that is the arithmetic, not a preference. So:

```
every target          44 px tall
die targets           the painted pitch wide (38 px at 390, 35 px at 360)
relic targets         the painted pitch wide (32 px at 390, 29 px at 360)
overlap               none, at either width
```

`test/browser/helpers.ts` states this as a per-kind floor rather than hiding it
behind a lowered global constant. **This is a property of the plate, not of the
code**: a repaint with wider bays would let the floor go back to 44 × 44 with
no code change beyond the geometry table.
Human decision needed: whether 38 × 44 is acceptable, or the plate should be
repainted with a wider crown. Question 6 of the playtest list.

## P3 — Carried relics in the right-hand tray slots, inspectable
Status: DONE
Files changed: `src/ui/trayView.ts`, `src/ui/components.ts`, `src/style.css`
Tests added/changed: `test/browser/tray.spec.ts`, `test/browser/menu.spec.ts`, `test/browser/loot.spec.ts`
Behavior verified: relics were placed but never positioned — `.relic` had no
`position`, so `place()` did nothing and the bays read as empty at every phone
size — and were inert `div`s explained by a `title` tooltip, which is not an
explanation on a phone. They are buttons now, absolutely positioned on their
measured bays in acquisition order, 44 px tall, with a stronger icon glow so an
occupied bay is obvious. A fourth relic leaves the first three and adds a plain
`+1`; MENU always holds the full list. Pressing one opens its card and moves
nothing.
Deviations from spec: none
Human decision needed: none

## P4 — Restore dice roll / reroll / score / hit animation
Status: DONE
Files changed: `src/render/animation.ts`, `src/app/app.ts`, `src/ui/trayView.ts`, `src/ui/worldView.ts`, `src/main.ts`, `src/style.css`
Tests added/changed: `test/browser/motion.spec.ts` (new, 8 tests, no skips)
Behavior verified: ROLL tumbles all six, staggered 28 ms; REROLL tumbles only
what was not held; SCORE runs chosen → relics → faces → damage → answer → next
turn over about 950 ms, and the last beat is the same length whether or not the
enemy replied, so a killing blow lands before the reward screen. `presenting`
holds the pre-score frame on screen while `this.state` is already the next turn
— never saved, never reduced, never read by anything. `Sequence.settle()` runs
the whole remainder synchronously and the dispatcher calls it before every
action, so a press during a transition finishes it rather than being eaten.
`motion: false` and `prefers-reduced-motion` take the same path and resolve in
the same tick.
Deviations from spec: the intermediate faces are *deterministic by
construction* — `(slot * 2 + step * 3 + 1) % 6`, no generator anywhere near the
presentation layer — and `paintTumble` restores the exact face **node** the
reducer chose rather than looking one up by value, because the Runner has two
6s and only one costs health.
Human decision needed: whether 950 ms per score is right, or long. Question 10.

**Found while writing the reduced-motion tests.** The word band showed
`log.at(-1)`, which is always the enemy's answer — so "Green face: heal 4 HP"
was computed, animated on the die that caused it, and then unreadable a moment
later. Anything legible only while moving is missing for anyone who turned
motion off. The band now shows every beat of the turn, in order.

## P5 — Make upgrades rarer
Status: DONE
Files changed: `src/content/enemies.ts`, `src/game/reducer.ts`, `src/content/rooms.ts`, `test/balance/simulate.ts`, `test/balance/report.ts`
Tests added/changed: `test/unit/journey.test.ts` (+6), `test/browser/loot.spec.ts` (new, 6 tests)
Behavior verified: the passage's guaranteed gift is gone, and so is the whole
`gift` field behind it — a room-level offer existed only to hand one out free.
Cadence is content: Gnawing 60% of two, Marrow 70% of two, Warden nothing.
`offerFor` draws the drop roll first and always consumes a number, so whether a
fight paid cannot depend on what was left in the pool, and a reload mid-fight
cannot change it. An empty-handed win says so plainly.

Measured over 400 seeds:

```
route            average   none   one   two      target
naive/stair         0.58    42%   58%    0%      0.5–0.8
naive/deep          1.28    13%   47%   41%      1.0–1.5
heuristic/stair     0.57    43%   57%    0%
heuristic/deep      1.22    15%   48%   37%
```

Win rates did not move — naive out 83% on the stair and 47% on the deep way,
both inside the bands they were already gated on — so **no enemy needed tuning
to pay for the lost gift**. Two gates were added so a change that quietly
starts showering the player again fails the report.
Deviations from spec: none
Human decision needed: none

## P6 — Rewrite special-die copy for literal comprehension
Status: DONE
Files changed: `src/content/dice.ts`, `src/ui/components.ts`
Tests added/changed: `test/unit/copy.test.ts` (new), `test/browser/copy.spec.ts` (new)
Behavior verified: every rule answers what it rolls, whether a face is special,
exactly when that fires, what it does; `helpsWith` answers why you would want
it. "Marked" is gone from everything a player can read, everywhere. Every
conditional says *included in the hand you SCORE*. The Runner's rule now admits
it has two 6s and that only one is red. The Leech no longer claims to be the
only healing in the run, which was false while Grave Wax existed. Card label is
`HELPS WITH ·`.
Deviations from spec: `goodWith` renamed to `helpsWith` rather than left with a
mismatched label. No generic RED/GREEN legend was added — every rule states its
own condition, and the spec prefers specific text over a legend.
Human decision needed: none

## P7 — Rewrite relic copy for literal comprehension
Status: DONE
Files changed: `src/content/relics.ts`, `src/combat/scoring.ts`, `src/ui/components.ts`
Tests added/changed: `test/unit/copy.test.ts`, `test/browser/copy.spec.ts`
Behavior verified: rules are exact, help lines are concrete, labels are
`EFFECT ·` and `HELPS WITH ·`.

**The Blood Thimble conflict, resolved.** The implementation counted red faces
only; the copy said "each marked face", which names a larger set. The code was
right — paying you for risk is the intelligible version, and a green face is
not a risk — so the effect kind is now `perRedFace` and the sentence says red.
A test asserts the two agree.
Deviations from spec: `buildHint` renamed to `helpsWith`; a unit test forbids
the word *build* in anything player-facing.
Human decision needed: none

## P8 — Rewrite general room / action / reward copy
Status: DONE
Files changed: `src/content/rooms.ts`, `src/content/enemies.ts`, `src/combat/resolve.ts`, `src/content/text.ts`, `src/game/reducer.ts`, `src/ui/trayView.ts`, `src/ui/screens.ts`
Tests added/changed: `test/unit/copy.test.ts`, `test/browser/copy.spec.ts`
Behavior verified: "Past it. There is a way past it." now says the corridor
continues behind the body. The fork says which route is shorter and that the
other is one more fight for a better chance of an upgrade. Every enemy intent
states verb, number and order — *after you score, unless you kill it first* —
and telegraphs name their next attack and its size. Beats say "Red face: lose
7 HP", not "The marked face takes 7". A pickup repeats the thing's rule.
The score preview names every term it adds and states consequences with a verb.
MENU gives the literal damage equation.
Deviations from spec: labels shortened to `GO ON` / `STAIR` / `DEEP`, verified
against the painted beds at both widths rather than assumed.
Human decision needed: none

## P9 — Browser, motion, and regression acceptance
Status: DONE
Files changed: all of `test/browser/`
Tests added/changed: `menu.spec.ts`, `tray.spec.ts` (rewritten), `motion.spec.ts`, `loot.spec.ts`, `copy.spec.ts`; `helpers.ts` and the full-route journey updated
Behavior verified: 78 browser tests, **no skips**. Every seed-dependent test is
pinned to a seed that produces the case it is testing, rather than skipping when
the dice do not cooperate. The full route no longer assumes a fight pays.
Deviations from spec: no `toHaveScreenshot` baselines were committed. Pixel
baselines are brittle across platforms and would turn a font-rendering
difference into a red build; `npm run shots` produces the same acceptance set on
demand at both widths, and `screens/baseline` vs `screens/final` is the
comparison a person actually makes.

Manual phone checklist, run under device emulation at 390×844 and 360×800 with
touch (a real handset is the human's to check — that is question 6):

```
MENU is obvious                                   yes
no box clips                                      yes, asserted at both widths
no die sits outside its socket                    yes, asserted against the bay
relic visible after acquisition                   yes
special die understandable without guessing       yes — see screens/final/inspect-die-*
roll feels animated                               yes
reroll visibly preserves held dice                yes
score visibly lands                               yes
reward does not happen after every fight          yes, 42% of safe runs find nothing
no tap appears dead                               yes
```

## P10 — Human playtest handoff
Status: DONE — see below.

---

# HUMAN PLAYTEST QUESTIONS

1. Does rolling feel fun again, or merely animated?
2. Can a player explain Pusher Bone after reading it once?
3. Can a player explain Blood Thimble after reading it once?
4. Does the player notice a relic entering the right-hand tray slot?
5. Does MENU feel like the correct label?
6. Does any tray element still look like it is sitting on top of, rather than
   inside, the reliquary?
7. Do rewards now feel exciting rather than routine?
8. Does the safe/deep fork communicate its risk/reward meaning before the tap?
9. Are room descriptions atmospheric without hiding what changed?
10. Does SCORE feel like an event?

Added by the legibility wave, and these are the ones a phone has to settle:

11. After one fight carrying a die, can a player say what its faces are —
    without opening anything?
12. Does a pop that carries its name (`GRAVE CANDLE +5`) read, or is the name
    too small to land in the time it is up?
13. Does MAP answer *where am I* or *where can I go*? It is meant to answer
    only the first. If it reads as a plan, the mouths are doing too much.
14. Crossing from the ossuary into the chapel: does it read as going further
    down, or as the picture changing?
15. Does the territory card land on the arrival, or on top of the way out?
16. Is a 38 × 44 slot on the rail reachable with a thumb, given it sits between
    two dice at the same pitch?

Two of these have a specific thing to look at:

- **6** is also where the 38 × 44 die target lands. If the answer is "the dice
  still look cramped", the fix is a repaint with a wider crown, not more code:
  the bays are 55 px wide in a 730 px plate and everything else follows from
  that number.
- **10** is where 950 ms is either right or long. The beats are named constants
  at the top of `src/app/app.ts`; changing the feel is changing six numbers.

---

# HUMAN ART REQUIRED

## The Crawling One — the approach encounter in `hollow`

**Status: RESOLVED.** The plates were authored by a human and delivered. This
entry stays as the record of what was asked for and what arrived.

Raised by the wave that turned the first fight into a thing that closes the
distance. The rules, the state, the sequence and the tests were finished and
green; the pictures were not, and no coding agent may draw them. So it stopped
and wrote `docs/art-reference/masters/crawling-one/BRIEF.md` instead.

**What was asked for, and what arrived:** all seven, at 1024 × 1536 — an empty
corridor, the creature at `far`, `mid` and `close`, the same creature lit white
for the instant it is struck, and the player's own arm at rest and at full
extension. The optional bright plates for `far` and `mid` were not needed in
the end; at those reaches the sprite's own brightness carries the frame.

**Nothing was drawn, retouched, recoloured or repainted here.** `tools/art.mjs`
lifts each subject off the flat black field it was delivered on, downsamples,
and writes the runtime plates. The masters are never served. The one thing the
pipeline decides is the matte, and it decides it identically every run.

**What the encounter gained by waiting:**

- the room is the corridor the fight was painted for, rather than a reused
  ossuary hall;
- each reach is its own drawing rather than one sprite at three sizes, which
  is what `ART_DIRECTION.md` § *Motion budget* was asking for;
- the impact frame at `close` is an authored plate instead of a filter;
- the strike moves a real arm, so the foreground layer is finally doing the
  job it was reserved for.

Runtime art went from 2.44 MB to 3.15 MB against the 4 MB cap. The old
`gnawing` sprite and the `ossuary` backdrop it stood in are retired, and their
pipeline entries went with them.

`supplied/` keeps the four mock-up plates the brief was written from. They were
never usable — each paints a mock tray across its bottom third, and the four
are separate paintings of the corridor rather than one corridor with the
creature moved — but they are the look that was being aimed at.

---

## The Font — the healing room between `hollow` and `fork`

**Status: RESOLVED.** Nine plates were authored by a human and delivered. This
entry stays as the record of what was asked for and what arrived.

Raised by the wave that put a healing room in front of the fork. The rules, the
state, the sequence and the tests were finished and green before any picture
existed — the room was playable with an empty midground, because the verb is a
button in the world, the result is in the word band and the health orb moves —
and `docs/art-reference/masters/sanctuary/BRIEF.md` was written rather than
anything being drawn.

**What was asked for, and what arrived:** all nine, at 1024 × 1536 — the chapel
with nothing standing in it, the chalice still, the instant the die comes out
of the blood, and one plate per face.

**Nothing was drawn, retouched, recoloured or repainted here.** `tools/art.mjs`
keys each plate off the flat black field it was delivered on, downsamples, and
writes the runtime plates. The masters are never served.

**One thing the pipeline had to do that no previous set needed.** The chalice
plates arrived as portraits of the object rather than as pictures of it
standing in a chapel — filling their own frames, and not registered with each
other: painted separately, the basin wanders up to 73 master-pixels vertically
and 2.4% in size between frames, which at 480 wide is the room jumping every
time the die changes face. So `buildSanctuary` measures each plate's base — the
bottom 4% of its opaque mask, which is the plinth and the only feature all
eight share — and scales and seats every one of them onto a single staged base,
`SANCTUARY.stance`, in the scene's own fractions. That fixes the drift and
decides the composition in the same arithmetic, and it is the only place either
is decided. Measurement and placement, which is what code is for; the pixels
are untouched, and the numbers are printed on every run.

**What the room gained by waiting:** the chapel is a painting of the place the
font was designed for, and the die's face is readable off the art — so the word
band names the result rather than being the only place it exists.

The midground layer — reserved since the reset and unused — is now doing the
job it was reserved for, and `showProp`/`hideProp` are the whole of its API.

Runtime art went from 3.15 MB to 3.75 MB against the 4 MB cap: 256 KB for the
chapel and 284 KB for the eight plates. Staging the basin down paid for itself
twice over — a plate costs almost exactly its opaque area, and the set was
82–89 KB a frame at delivered size against 37–48 KB staged — so the composition
decision and the budget decision turned out to be the same decision. The brief
carries the arithmetic.

---

## The Gnawing — the four plates of its death

**Status: OPEN.** The defeat sequence is built, wired, tested and playing. The
four plates it was specified against were not in the repository when the work
was done, so nothing was drawn: the frames are staged out of the plates the
encounter already ships, and the manifest is one line per frame away from the
authored set.

Raised by the wave that gave The Gnawing a death. The rules, the state, the
sequence, the input lock and the resume are finished and green — see
`test/unit/defeat.test.ts` and `test/browser/defeat.spec.ts` — and the fight
already plays a readable collapse. What is missing is that three of its four
frames are the same drawing.

**Nothing was drawn, generated, traced, recoloured or repainted.** Per
`CLAUDE.md` § *No art in the polish sweep*, the existing plates were measured,
placed, scaled, darkened and animated, and their pixels were not touched.

### What is being asked for

Four plates of the creature dying, at **1024 × 1536** on the flat black field
the rest of `docs/art-reference/masters/crawling-one/` was delivered on, so
`tools/art.mjs` can lift them with the same matte as `close.png` and `hit.png`:

| file | the beat |
| --- | --- |
| `defeat-1.png` | struck, and still a threat. The pose of `close.png`, hit — jaw wide, tentacles braced, nothing given up yet. |
| `defeat-2.png` | recoiling. The head driven back and down, the front limbs buckling under it. |
| `defeat-3.png` | ruined. The jaw slack, the eyes going, the mass settling onto the corridor floor. |
| `defeat-4.png` | dead. Collapsed, lower than the frame's floor line, the silhouette broken. This one is held longest and is the picture the player is left with. |

They want the same corridor, the same camera and the same footing as
`close.png` — this is one creature going down in one place, not four paintings
of a dying creature. Registration between them matters more than detail: the
sequence hard-cuts, so anything that wanders between frames reads as the whole
scene jumping.

### What lands when they arrive

1. a `buildCrawlingOne`-style entry in `tools/art.mjs` cutting the four to
   runtime plates, and `npm run art`;
2. four rows in `ENEMY_ART` — `gnawing.defeat.1` … `gnawing.defeat.4`;
3. `pose: 'defeat.1'` … `'defeat.4'` on the four frames in
   `src/content/defeat.ts`, and `lit` dropped from the first;
4. the staging in the same file — `scale`, `drop`, `dim` — relaxed towards 1,
   0 and 1, because the collapse will then be in the drawings rather than in
   the transform.

Nothing else changes. No timing, no state, no test, and no other file.

### What is shipping in the meantime

Frame 1 is the authored impact plate (`crawling-hit.png`, the creature blown
out white) held for 110 ms rather than flashed for 130. Frames 2–4 are the
plate it died standing in, staged down and out: 0.98 → 0.90 → 0.76 of its
dying width, sunk 2% → 7% → 14% of the world's height, at 78% → 50% → 26%
brightness. It reads as a thing going down in the dark, and it reads as a
stand-in, which is the honest state of it.

---

## HUMAN ART REQUIRED — The Reliquary and The Chain Vault

**Partly resolved.** The Reliquary's four objects were authored by a human and
delivered — an altar, a bell, a candle stand and a chest — and the room is now
painted rather than merely played. What is still owed is the *other positions*
of three of them, and the Chain Vault's whole set.

The full contract for each set is in the brief beside the masters:

- `docs/art-reference/masters/reliquary/BRIEF.md`
- `docs/art-reference/masters/chain-vault/BRIEF.md`

Every file below is **1024 × 1536, portrait 2:3, PNG**, subject on flat
`#000000`, no HUD, no text, no borders. Two shapes of delivery are accepted and
the brief says which each set is on:

- **registered** — every plate painted where the object stands, on the same
  canvas as `background.png`. `buildRooms` in `tools/art.mjs` then only
  cover-crops, keys and resamples, and a frame out of register at 1024 × 1536 is
  out of register on the phone. This is what the Chain Vault is waiting for.
- **portrait plus a stance** — the object centred in its own frame, and where it
  stands declared once in `ROOMS[].stances` in `tools/art.mjs`. The Reliquary
  arrived this way and is built this way. A family delivered like this must have
  **one silhouette**, because the stance is measured off the plate's own box: a
  swinging bell in four portraits would walk across the ceiling as it swung, and
  has to come back registered instead.

A family must be **whole or absent**. `npm run art` throws on a partial family
rather than shipping an object that freezes mid-swing.

### Delivered

```
docs/art-reference/masters/reliquary/background.png      ✅ 1024x1536
docs/art-reference/masters/reliquary/altar-still.png     ✅ 1024x1536
docs/art-reference/masters/reliquary/bell-idle.png       ✅ 1024x1536
docs/art-reference/masters/reliquary/brazier-lit.png     ✅ 1024x1536
docs/art-reference/masters/reliquary/chest-closed.png    ✅ 1024x1536
docs/art-reference/masters/chain-vault/background.png    ✅ 1024x1536
```

The four Reliquary plates cost **70 KB** between them at 480 × 720, because a
plate costs almost exactly its opaque area and these are 2–8% opaque.

`docs/art-reference/visual/reliquary/` holds what came with them and is **not**
runtime art: two paintings of the chapel that were the composition being aimed
at, a sheet of the objects in states nobody has painted yet, and a four-position
study of the bell swinging. The study is a *reference for motion*, not four
frames — the bell swings by rotating its one authored plate about its chain.

### Still missing — the Reliquary (18 files)

The room plays and paints completely without every one of these. What each buys
is written beside it, because none of them is a blocker and the order is a
judgement call.

```
brazier-out.png        five candles, dead, wax cold      ← the biggest win
chest-open.png         the lid up, something inside      ← the second
lever-up.png           lever-pulling.png   lever-down.png

bell-ring-1.png        bell-ring-2.png     bell-settle.png

ambient-candle-1..3.png   ambient-chain-1..3.png    ambient-drip-1..3.png
ambient-embers-1..4.png   ambient-window-1..2.png
```

**`brazier-out.png` is the one to paint first.** The candles going out is a
state the player toggles as often as they like and is half of the room's puzzle,
and today it is a CSS treatment of the lit plate — brightness 0.48, saturation
0.4 — which drains the warmth out of it convincingly and still leaves five
flame-shaped highlights for anyone who looks hard. It is honest, it is not
finished, and it is the difference between a dark room and a dead one.

**`chest-open.png` is the second.** Today the chest takes a knock from the
mechanism and stays shut; what came out of it is in the word band, and the verb
on it turns from nothing to TAKE. A player is told, but not shown.

The lever family is optional in a way the others are not: **there is no lever in
the room any more.** No lever was delivered, so the PULL sits on the altar, where
a recessed iron handle under the basin is the mechanism the three cut marks are
beside. If a lever is ever painted it is a *new object* and a product decision,
not a missing frame. The interaction id stays `reliquary-lever` regardless — it
is in every save that ever pulled it.

`bell-ring-1/2` and `bell-settle` would replace the CSS swing with authored
positions. They must arrive **registered to the background**, not as portraits,
for the reason in the delivery note above.

### Missing — `docs/art-reference/masters/chain-vault/` (30 files)

```
chain-off.png          chain-pulling.png      chain-on.png
cage-raised.png        cage-lowering-1.png    cage-lowering-2.png   cage-lowered.png
plate-off.png          plate-on.png
lever-up.png           lever-pull-1.png       lever-pull-2.png      lever-down.png
gate-closed.png        gate-opening-1.png     gate-opening-2.png    gate-open.png
panel-still.png        (delivered as `wall-panel.png`; see the brief)

ambient-fire-1.png     ambient-fire-2.png     ambient-fire-3.png
ambient-chain-1.png    ambient-chain-2.png    ambient-chain-3.png
ambient-smoke-1.png    ambient-smoke-2.png    ambient-smoke-3.png   ambient-smoke-4.png
ambient-shaft-1.png    ambient-shaft-2.png
```

### What lands when they arrive

1. `npm run art` — it already knows about every file above and builds them into
   `public/assets/props/` and `public/assets/ambient/`;
2. rows in `PROP_ART` and `AMBIENT_ART` in `src/render/assets.ts`, keyed
   `brazier.out`, `chest.open`, `chain.on`, `cage.lowered`, `plate.on`,
   `gate.open`, `panel.still`, `reliquary.candle.1`, `chain-vault.smoke.3` and
   the rest;
3. for the Reliquary only, the two things that stand in for its missing states
   come *out*: the `[data-look="out"]` filter and the `chest-knock` keyframes in
   `src/style.css`, replaced by `platesFor` naming the authored frame;
4. nothing else. No state, no reducer, no view and no new test.

`test/browser/rooms.spec.ts` asserts that whatever the midground holds is a
function of the save, never takes a press, and is four distinct objects that
survive every position the room can be in — all of which stays true either way.

### What is shipping in the meantime

The Reliquary, painted: an altar on the floor in front of the steps with a
basin of old blood in it, a bell hanging over it on a chain, five candles low on
the left and a locked chest low on the right. The bell swings when it is rung,
the candles go cold when they are put out, the chest takes the knock of the
mechanism, and none of that is stored in `GameState` — every one of them is a
treatment of a settled fact, and `prefers-reduced-motion` removes all of it
without removing anything the player needed.

The Chain Vault ships **no props and no ambience at all**. `propArt` and
`ambientArt` answer nothing for it, `showProps` is handed an empty list, and
`RoomAmbience` builds no loops. `ART_DIRECTION.md`'s rule is that scenery may
degrade, and its play does not: every object is a real 44 px `<button>` carrying
its own verb, sited where the object will be painted, every unavailable action
is absent rather than greyed, and every outcome is in the word band and the
health orb.

### Budget

The payload was **3.748 MB** against a 4 MB cap, then **4.248 MB** when the two
backgrounds landed, then **5.467 MB** when the Warden became an authored family
— which is where the 5.6 MB cap came from. The Reliquary's four objects add
**70 KB** and it now sits at **5.53 MB**.

That leaves roughly **70 KB** for everything above, which is not enough for the
Chain Vault's thirty and is the point: a plate costs almost exactly its **opaque
area**, `hands/rest.png` is a full keyed 480 × 720 scene shipping in 30 KB
because 94% of it is empty, and the Reliquary's four fit in 70 KB by being 2–8%
opaque. Keep the objects tight and mostly black. If a set will not fit, **drop
ambient loops before dropping object frames** — the loops are decoration and the
frames are how a room says what state it is in. Raising the cap a third time is
a product decision, not an art one.

---

## HUMAN ART REQUIRED — the dice

The combat system was replaced end to end a second time: the War of Bones is
gone and an attack is now up to six ordinary d6s, held and rethrown, scored
against a card of hands. **No art was authored for it**, per `CLAUDE.md` § *No
art in the polish sweep*: `git diff --stat main` touches nothing under
`public/`, and no new image file exists. What the new system needs, and what it
is running on until those files land, is written out here.

This entry supersedes the *War of Bones* entry that stood here. Four bone
profiles, seven-and-eight faces, a broken state, a Pouch icon and a bay for the
enemy's line were all asked for by a system that no longer exists; none of them
is owed any more.

### What it is running on now

Bones are drawn from the **pip geometry in `src/ui/components.ts`** — the same
mechanism the game has always drawn a die face with. That is not a new stand-in;
it is the existing face renderer, and it got *smaller* rather than larger,
because a bone is an ordinary d6 again and the seventh and eighth faces are
gone. Every die states its number as data as well as as a pattern
(`aria-label`, `data-value`), and whether it is held is in `aria-pressed`, in
`data-held` and in its position, so nothing about the fight is unreadable while
the plates are outstanding.

`BONE_ART` and `SATCHEL_ART` in `src/render/assets.ts` are **deliberately
empty**. A manifest row names a file, and `test/unit/assets.test.ts` holds every
row to a real file of the declared size — so a table that promised art nobody
had drawn would fail the build rather than ship a broken `<img>` into the middle
of an attack. The gates for those families are written and **armed**: they pass
vacuously on an empty table and bite the moment a row is added, which is what
stops a family landing half-delivered.

### The bone family

One family now, and it ships whole or not at all:

| face | note |
| --- | --- |
| `1` … `6` | an ordinary d6. There is only one kind of bone in this baseline. |
| `back` | not thrown yet |

The **back** is its own state and matters more than it sounds: before the first
ROLL the crown shows *how many bones this attack has* and no face has been
decided. It has to be unmistakably **not a face**, because a face there would be
the picture claiming a number the reducer has not drawn.

A **held** state would be welcome and is not required. Today a held bone lifts
out of its bay and takes a lit rim in CSS, which reads and is not a drawing of
a bone in a fist.

### The satchel

One icon: `vial`. It sits in the first of the three bays on the right of the
tray at roughly 32 × 44 CSS px on a phone, so it is read as a silhouette. The
count badge is drawn over it.

The Charm and the Pouch are both gone, so **two of the three bays are now empty
painted recesses**. That is left showing deliberately rather than re-centring
the one control on the plate — the recesses are part of the picture — but a
repaint that re-cuts the right side for one bay instead of three would be an
improvement, not a regression.

### The tray, and the one deviation this sweep introduced

The well had to grow. The painted recess is 0.444 × 0.404 of the plate — 187 ×
84 px on a phone — which was enough for two lines of prose and is not enough for
the scorecard: eight hands, eight multipliers, a running sum, a row of live
buttons and a prompt. So `WELL` in `src/content/tray.ts` now runs to 0.51 wide
and 0.486 deep, overhanging the frame's ribs left, right and below, and carries
its own CSS scrim so the text stays readable over them.

Every edge of it is bounded by **a control it would otherwise collide with**
rather than by the painting: the top is the six 44 px die targets, which already
hang below their own bays; the sides are the orb's caption and the first satchel
bay; the bottom is the beds. `test/browser/tray.spec.ts` asserts all four.

A repaint would want: **a well roughly half the plate wide and half again as
deep**, an orb that reads as a heap of bone rather than a glass of liquid, and
the right side re-cut for one bay rather than three relic icons. Every
coordinate in `src/content/tray.ts` was measured off the current 730 × 364 file
by luminance profile; if the plate is repainted, that table is the only thing
that needs measuring again.

### The scorecard

Eight entries in a four-by-two grid, at 7 px, in about 214 × 45 px. It is
**legible and it is small**, which is the honest state of it: the same table is
printed at a readable size in MENU precisely because the tray's copy is compact
by necessity.

Nothing here needs art. What it would want, if the plate is ever repainted, is a
band the scorecard can sit in — eight shallow recesses, or one recess with seven
dividers — so the card reads as part of the reliquary rather than as text laid
over it.

### The Marrow

Its death is **staged, not painted**: `content/defeat.ts` makes the collapse out
of the one plate the encounter ships by shrinking it, dropping it and taking the
light out of it — the same treatment the Gnawing gets. The fight visibly ends,
which is the completion gate, but a thing whose whole body is other people's
bones deserves drawings of it coming apart. A five-frame family and an impact
plate (`marrow.hit`) would replace the staging with the identity, exactly as the
Warden's two painted frames already do.

### Bytes

**There is no payload cap any more**, and the § *Budget* note above is history.
The runtime art is 5.54 MB across 41 files and `npm run art` prints it per
family; nothing fails on that number. Authored state coverage comes first,
delivery architecture second, byte minimisation third — see
`docs/ART_DIRECTION.md`. Loading is staged (`src/render/loader.ts`), so a family
costs the fight that uses it rather than the title screen: **the bone plates and
a Marrow death family can land without anybody having a conversation about
megabytes.**

---

## HUMAN ART REQUIRED — the loadout

The loadout wave added four things to the tray — an iron die, up to two item
dice, a talisman bay and a caption — and **no art was authored for any of
them**, per `CLAUDE.md` § *No art in the polish sweep*: `git diff --stat main`
touches nothing under `public/`, and no new image file exists. What each of
them is running on, and what is owed, is written out here.

This entry stands alongside *the dice*; nothing in that entry is withdrawn. The
bone family and the Marrow death family are still owed exactly as written
there.

### What it is running on now

Every one of the new pieces is **CSS on the existing plate**. Nothing was
drawn, traced, recoloured or cropped:

| piece | what it is today |
| --- | --- |
| the iron die | a CSS die body in cold grey, at the crown's own pitch, one pitch left of the first painted bay |
| an item die | the same body in violet (or red on a cost face), at the right end of the same rail |
| the talisman | the second of the three painted relic bays, with a text label and its bonus |
| the iron caption | a text line at the top of the well |
| a popped number | a text node, animated up and out, anchored to the thing that made it |

Every one of them states its number as **data and as an accessible name** as
well as as a colour — `data-block`, `data-face`, `data-talisman-id`,
`aria-label` — so nothing about the loadout is unreadable while the plates are
outstanding, and nothing is conveyed by colour alone.

### The plate is painted for six bays and the rail now wants nine

This is the one real geometry debt. `public/assets/ui/tray.png` has **six**
painted die recesses. The iron die and the two item dice stand on the rail
either side of them, at the same pitch and the same baseline, **in no recess at
all**. It reads as a row of nine objects at one height, which is the intent —
the iron rolls *with* the six — but three of the nine are visibly resting on a
rib rather than in a bay.

What would fix it, in order of how much it would buy:

1. **Three more bays on the rail** — one at source x ≈ 128 for the iron, two at
   x ≈ 603 and x ≈ 670 for the items. Same 55 × 36 px interior as the six. The
   coordinates in `src/content/tray.ts` (`IRON_CENTRES`, `ITEM_CENTRES`) are
   the fractions those would land on, and they were chosen to fall on the
   existing pitch so a repaint can hit them exactly.
2. **A caption plinth under the iron bay.** The ruling is that the iron's
   caption sits *under the die*; the plate gives a 32 px bay no room for a
   sentence, so the caption is currently the first line of the well instead.
   A shallow band under the iron bay, roughly 0.05 of the plate's height and
   0.19 of its width, would let the caption sit where the ruling says it should.
   Until then the die carries the same sentence as its accessible name, so
   nothing is lost to a screen reader.
3. **Iron and item die faces.** Seven states for the iron (`0`, `3`, `5`, `7`
   and a back), and per-item faces for the flats, the blank and the cost. Not
   required — the CSS bodies read — but a piece of rusted plate and a guttering
   candle would say what the objects *are* rather than what they do.

### The right-hand bays

The Vial is in the first, the talisman is in the second, and the third is still
an empty painted recess. That is now two of three used rather than one, which
was the note left in *the dice*; the recut suggested there is less urgent and
still an improvement.

A **talisman icon** would be welcome and is not required. The bay currently
reads `PAIR` over `+12`, which is the whole mechanic in two lines and is legible
at 32 px — but a knuckle-and-wire charm is what the flavour describes and the
bay is where a player looks for their passive build.

### Nothing else moved

`BONE_ART` and `SATCHEL_ART` in `src/render/assets.ts` are still deliberately
empty and their gates are still armed: a manifest row names a file, and
`test/unit/assets.test.ts` holds every row to a real file of the declared size.
No row was added for any of the above, so nothing promises art nobody has drawn.

---

## HUMAN ART REQUIRED — the reel

The reel wave added three rooms, moved every carried thing into the world, put
the ways out into the picture and repositioned one encounter's last stage — and
**no art was authored for any of it**, per `CLAUDE.md` § *No art in the polish
sweep*. `git diff --stat main -- public/` is empty and no new image file exists.

This entry stands alongside *the Reliquary and The Chain Vault*, *the dice* and
*the loadout*. Nothing in any of them is withdrawn.

### Three rooms standing in somebody else's painting

The largest debt of the wave, and the one with a gate on it:
`test/unit/assets.test.ts` holds a **named list** of borrowed backdrops, so a
fourth cannot be added quietly.

| room | standing in | why it reads |
| --- | --- | --- |
| **The Cleft** | `rooms/shrine.png` — the Split | the painting *is* a passage dividing in front of you, and a dividing passage in the ossuary is the same fact |
| **The Confluence** | `rooms/shrine.png` — the Split, read backwards | two passages meeting rather than one dividing |
| **The Offertory** | `rooms/choir.png` plus the Reliquary's `altar`, `brazier` and `chest` portraits | a side chapel with an altar, candles and a stone recess. The chest is standing in for the recess |

What is owed, in order of how much it would buy:

1. **A bespoke Cleft**, 480 × 720. Two mouths in the ossuary, one dragged and
   fed-looking, one narrow and waxed. The exit anchors in
   `src/content/rooms.ts` are at 0.28 and 0.72 across, 0.38 down; a repaint
   should put the mouths there or those two numbers move with it.
2. **A bespoke Confluence**, 480 × 720. Two mouths arriving at one floor, with
   the way on at 0.5 / 0.8. It is the room where both branches of the run meet,
   and it currently looks exactly like the fork five rooms later — which is the
   one place a reused painting actually misleads.
3. **A bespoke Offertory**, 480 × 720, plus its three objects as portraits in
   the Reliquary's delivery shape: a slot-and-price-list altar, a candle stand,
   and a stone lid in a wall recess. The Reliquary's furniture is on the floor
   where it was staged for a different room, so the "recess" is a chest sitting
   on flagstones.

Until any of that lands, all three rooms are fully playable: every verb is a
button on the object, every outcome is in the word band, and the pictures are
real paintings rather than placeholders. **Scenery may degrade; the opponent may
not** — and no opponent is affected.

### The found thing, in the chest

Loot moved out of a full-screen card and into the room. There is a
`## HUMAN ART REQUIRED` line under each place it can now be:

| owed plate | where it goes | what it is running on |
| --- | --- | --- |
| **the found thing, in the chest** | Reliquary, 0.823 / 0.62 | a text pill carrying the thing's `short` name, and a TAKE pill under it |
| **the plate in the cage** | Chain Vault, 0.83 / 0.40 | the same, over a room with no midground at all |
| **loot beside the body** | the Hollow and the Deep Way, two spots each | the same, on the floor in front of a corpse that is not drawn either |
| **the thing in the recess** | Offertory, 0.823 / 0.62 | the same |

What each of them wants is small: a 480 × 720 scene plate per *container state*
— an open chest with something in it, a cage with a plate of iron in it, a
forced recess — and, ideally, one small object plate per found thing so a Vial
on the floor looks like a Vial. None of it is required: every pill states the
thing's short name as text, its full name and exact rule are one LOOK away in
the word band, and both are in the accessible name. Nothing about loot is
unreadable while the plates are outstanding and nothing is conveyed by colour.

**The Reliquary's chest still has no painted open state.** That was already
recorded; it matters more now, because what the chest opens onto is a thing the
player is meant to reach into.

### The bar's housing

`docs/ART_DIRECTION.md` gained a law this wave — *combat chrome obeys the art's
pixel grid and palette* — and the enemy's health bar is the first thing under
it: forty-eight cells of six pixels, square, drawn from `--blood` and `--gold`,
draining in steps.

What is owed is **a painted housing**: a shallow iron or bone trough for the bar
to sit in, at the top of the world box, 288 × 12 CSS px at the phone's scale
with a couple of pixels of frame. The bar itself can stay CSS — a repeating
one-pixel gradient reads as cells — but the box around it is currently a
two-pixel gold shadow, which is chrome pretending to be a frame.

The pile orb came under the same law and needs nothing: it already sits inside a
painted glass sphere on `ui/tray.png`.

### The Gnawing's close stage, possibly

Its `close` stance was `width 1.24 / foot 1.02` — wider than the world box with
its jaw below the bottom of it — so the last beat of the encounter was a
composition the player could only see two thirds of. It is now **0.98 / 0.99**,
first-pass and provisional, and `test/browser/chrome.spec.ts` asserts the whole
sprite sits inside the world box rather than asserting those two numbers.

`enemies/crawling-close.png` was painted at 480 × 708 to fill and overflow a
frame. At 0.98 it does not overflow, and **it may read as a step backwards from
`mid` rather than as the thing arriving.** The browser test checks that it is
still much larger than `mid`, which it is; what it cannot check is whether the
composition still lands.

If it does not, that is an **owed repaint** of `crawling-close`: the same
subject recomposed to be at its most legible when the whole of it is in frame —
jaw at the bottom edge rather than under it, and the hall gone behind it.
Nothing was traced, cropped, upscaled or repainted here; only the seat moved,
and the seat is authored content in `src/content/enemies.ts` rather than a
derived value in the pipeline.

### Nothing else moved

`BONE_ART` and `SATCHEL_ART` in `src/render/assets.ts` are still deliberately
empty and their gates are still armed: a manifest row names a file, and
`test/unit/assets.test.ts` holds every row to a real file of the declared size.
No row was added for anything above, so nothing promises art nobody has drawn.

---

## HUMAN ART REQUIRED — the legible reel

The legibility wave. Faces drawn rather than described, a strip of where the
run has been, and one grade of air per territory. **No pixel was authored,
generated, traced, recoloured, cropped or otherwise touched**, and
`test/unit/untouched.test.ts` asserts it: `public/` and the masters are byte
for byte what they were on the base commit.

Everything below is running on CSS chips and stylesheet tints over the art that
already exists. Each is a stand-in, each has a shape a painter can replace, and
each comes out the day the plate lands.

### The face strip

A carried thing's card now shows **its faces** rather than a sentence about
them: `+3 +3 +5 +5 · ·` for the Grave Candle, `0 0 3 3 5 7` for the Rustplate,
`PAIR TWO PAIR +12` for the talisman. It renders in three places — the loot
card where the thing lies, the tray slot inspection, and the MENU loadout.

What is owed is **a chip housing**: a small painted plate a figure sits in, in
the game's own metal, at the sizes the strip uses.

| | what it is | size |
| --- | --- | --- |
| `ui/chip-flat` | the plate a `+5` sits on — warm, lit | 26 × 20 |
| `ui/chip-cost` | the same, in the blood tone, for a `−2` | 26 × 20 |
| `ui/chip-blank` | a dark plate with a dim pip cut into it | 26 × 20 |
| `ui/chip-block` | cold iron, for the Rustplate's faces | 26 × 20 |
| `ui/chip-line` | wider: it carries a word (`TWO PAIR`), not a figure | 52 × 20 |

Until they land the chips are bordered boxes on the palette's tokens, square
cornered and on a whole-pixel pitch, per `ART_DIRECTION.md` § Combat chrome.

### The strip's furniture, and a MAP glyph

**MAP** opens the run's own reel: a frame per room stood in, the current one
bordered, and dark mouth-marks for the roads that were read and not taken.

| | what it is | size |
| --- | --- | --- |
| `ui/strip-frame` | a film frame, 9-sliceable, in the tray's metal | 320 × 26 |
| `ui/strip-frame-here` | the same, lit, for the room being stood in | 320 × 26 |
| `ui/strip-mouth` | a dark arch mark, for a road not taken | 44 × 26 |
| `ui/map-glyph` | a glyph for the MAP bed. A folded chart, or a thread | 44 × 44 |

Until they land, a frame is a bordered box and the bed carries the word `MAP`.

### Slot-card housing

Tapping a filled tray slot opens that thing's card. It is the same
`.reward-card` panel the loot inspection has always used, on the overlay's flat
scrim. **A painted card housing is owed** — a plate with a lip, at
`min(100%, 460px)` — and it is the same owed thing the reward card has wanted
since the dice wave; it is named here because the card is now reached three
ways rather than one.

### A painted treatment for a territory card

On first entry to a stretch of the descent, the arrival beat carries a word:
`THE THRESHOLD`, `THE OSSUARY`, `THE CHAPEL`, `THE DEEP`. It is set in the
game's type at 20px with wide tracking, and that is all it is.

What is owed is **a painted title treatment** — the four words drawn, in the
letterforms the title screen uses, as transparent plates at 480 wide. They
would be `ui/card-threshold`, `ui/card-ossuary`, `ui/card-chapel`,
`ui/card-deep`. It is the one place in the game where typography is the whole
of the image, so it is the one place where drawn letters would be worth their
bytes.

### Two regions whose paint cannot hold their text

The seating audit (`content/tray.ts` § SEATED, asserted in
`test/browser/seating.spec.ts`) measures every word on the plate against the
**painted region it lives in**. Two rows are marked `fits: false`, and they are
not code faults:

- **the relic bays.** `RELIC_BAY` is 0.0452 of a 730px plate — 19 px on a phone
  — and `VIAL` is not 19 px wide at a legible size. The word is centred on the
  bay's centre, which is the part the code can be held to, and it overhangs the
  recess left and right.
- **the three beds.** Painted 45 source px deep, about 26 CSS px, against a
  44 px touch floor. The overhang is even, top and bottom, and it is decoration
  it overhangs rather than another control.

Both want **a painted housing sized to its word** rather than a smaller font.
A squeezed font is not a fix; it is the same failure one step further on.

### What was found and fixed rather than owed

**The pile's count was off its glass.** `ORB_TEXT` ran 0.045 → 0.220 of the
plate, whose middle is 0.1325, while the orb's own middle is 0.12465 — about
five pixels of drift on a phone, which is exactly what "the words drift off
their plates" meant. The box is now the orb's own width on the orb's own
centre, and `seating.spec.ts` holds it to within a pixel.

### Nothing else moved

No manifest row was added, so nothing promises art nobody has drawn. The
ambient grades are four colours and two blend modes in `src/style.css`, each
**measured off that territory's own backdrops** and written down in
`docs/ART_DIRECTION.md` as provisional first-pass values; they tint the picture
and never repaint it.

---

## HUMAN ART REQUIRED — quiet rooms

The negative-space wave. Frames cleared of furniture and of presses, and then
quiet motion put inside the space that cleared. **No pixel was authored,
generated, traced, recoloured, cropped or otherwise touched**, and
`test/unit/untouched.test.ts` asserts it: `git diff --stat main -- public/` is
empty and `public/` and the masters are byte for byte what they were.

This entry stands alongside *the Reliquary and The Chain Vault*, *the dice*,
*the loadout*, *the reel* and *the legible reel*. Nothing in any of them is
withdrawn, and one thing in the first of them is **narrowed** — see below.

### The composed Offertory painting, and it is owed regardless

The wave's proving room. The Offertory failed the negative-space law and it
should have: **seven presses in an altar frame that holds five**, over the
Choir's backdrop with the Reliquary's altar, candle stand and chest standing on
it. The audit resolved the crowding — the carved slot merged onto the altar as
one plate carrying the price LOOK and the OFFER press, the candles' LOOK and the
recess's LOOK folded into it — and the room is now four plates and five presses,
inside its frame.

**That does not settle the debt.** A bespoke Offertory at 480 × 720 plus its
three objects as portraits in the Reliquary's delivery shape — a
slot-and-price-list altar, a candle stand, a stone lid in a wall recess — is
still owed exactly as *the reel* recorded it. The reuse was always debt and
being inside a budget is not the same as being painted.

**One deviation from the wave's own first-pass resolution, stated.** The brief
said the chest plate is removed and the recess is prose until the toll is paid.
It is not removed, and the reason is that removing it removes the PRY press with
it — a bone charged for a greedy hand, a way for the room to kill a run, and a
number this wave is explicitly forbidden to tune. So the recess keeps its plate
and its verb, and it is the LOOK on it that went. The room lands at four plates
and five presses rather than the brief's two and three; both are inside an altar
frame, and the deviation is here rather than in a commit message.

### Painted mote and ember treatments

Quiet motion ships as **treatments**, in the same family as the territory grade:
no plate, no sprite sheet, no particle texture. What each is running on, and
what would replace it:

| | what it is today | what is owed |
| --- | --- | --- |
| `flicker` | a hard-edged 56 × 72 box of `--gold` at `soft-light`, stepping through four whole quanta of opacity | an ember plate per step, 480 × 720, registered to the room it lights |
| `glow` | the same in `--ink`, 72 × 48, on an even four-step breathe | the same, slower and cooler |
| `sway` | a 40 × 120 band of `--ink-dim`, translated by one whole pixel | the hanging object's own plates, painted at each position, as the Chain Vault's set already asks for |
| `drift` | six 1 px squares of `--ink-dim` falling two pixels a step | a mote plate, or a two-frame dust sheet, at the same one-pixel size |

**The `flicker` and `glow` boxes are the ones to look at first.** They are hard
rectangles at low opacity over a dark painting, which is honest — the corners
are square and the pitch is whole, per § *Combat chrome obeys the art's pixel
grid* — and at those opacities the edge should not read. Whether it does is a
phone question and is pre-registered below. If it reads, the fix is a painted
ember rather than a softer edge: a blur would break the grid law this wave
exists to extend.

**The motes are one pixel because dust is one pixel**, and at `--ink-dim` on a
dark ossuary wall that is close to the legibility floor. The alternative was two
pixels, which reads as snow.

### The plate loop that was deleted, and what it means for the ambient manifest

`render/ambience.ts` used to drive a family of painted overlay plates and built
nothing, because none of them was delivered. That driver is **gone** and the
ticker replaced it. Which narrows one line of the Reliquary and Chain Vault
entry above:

```
ambient-candle-1..3.png   ambient-chain-1..3.png    ambient-drip-1..3.png
ambient-embers-1..4.png   ambient-window-1..2.png
ambient-fire-1..3.png     ambient-smoke-1..4.png    ambient-shaft-1..2.png
```

Those twenty-one files are **no longer owed as a loop**. `AMBIENT_ART` and the
pipeline behind them are still armed and `roomAssets` still fetches whatever is
in the table, so a painted set is not wasted — but what a room does while nobody
is pressing anything is a declaration in content and a treatment on screen now,
and a set that lands would be seated by the ticker rather than cycled by a
timer of its own. The four treatments in the table above are what is actually
owed.

### What the rooms lost, and it was hotspots rather than words

Twenty-two LOOKs lost their press. **Not one line lost a word.** Every demoted
sentence folded into its room's arrival or into the one LOOK that kept its
place, verbatim, and two tests hold it there: `test/unit/frames.test.ts` against
the library, and `test/browser/quiet.spec.ts` against what a thumb can actually
reach on a 390 × 844 phone.

The biggest cuts, and why each was the audit's call:

| room | was | now | why |
| --- | --- | --- | --- |
| the Reliquary | 5 LOOKs | 1 | four of the five sat on objects that already carry RING, PUT OUT or a TAKE |
| the Chain Vault | 5 LOOKs | 1 | the panel already draws the mechanism the other four name |
| the Offertory | 3 LOOKs | 1 | see above |
| the Cleft, the Confluence | 3 each | 1 each | the mouth-marks sat on the painted mouths the ways out pass through, and a way says what it costs before the press |
| the Font | 2 | 0 | *one object, one press, one number*, which is what the room was always described as |
| the Door | 1 | 0 | a duel frame holds the enemy and nothing else |

### Nothing else moved

No manifest row was added, so nothing promises art nobody has drawn. `BONE_ART`
and `SATCHEL_ART` are still deliberately empty and their gates are still armed.
`SAVE_VERSION` is still 11: the budgets are content law, the ambients are
content declarations plus a treatment ticker, and not one of them added a field.

---

## The phone pass — the legible reel

**Not done.** This wave was built in a remote container with no phone in it,
and the standing rule is that a pass which could not settle something says so
rather than inventing a value in its place. What ran instead is Chromium at
390 × 844 with real presses, which can prove that a beat fires in order with
the right numbers — it did, 302 times — and cannot answer whether any of it
*feels* right under a thumb, or show a dark-value failure at real brightness
on a panel that does not have the failure mode being decided.

So: the numbers below are openly marked as guesses, and the cut order is
**pre-registered here, before the phone**, so that a later tuning result is a
measurement rather than a preference wearing a measurement's coat.

### What a pass has to settle, in order of how much it matters

1. **The deep's grade, in the dark.** `#604f3b` at hard-light 55% is the only
   one of the four that is not a gentle soft-light wash, and the Chain Vault
   and the Marrow's room are the two darkest paintings in the game. The
   question is whether it crushes the darkest fifth of those walls into a flat
   block. A desktop panel will not show that. **If it does: drop the opacity
   before changing the hue** — the hue was measured off the paintings and the
   strength was not.
2. **The territory card's dwell.** `TERRITORY_HOLD` is 1250 ms from the beat
   the dark lifts, over a crossing that is itself 760 ms. It is the only new
   thing on the critical path of a press. If the run feels like it is waiting
   for a word, cut it — and it is the **first** thing to cut, before any beat
   of the attack, because it is the only one that teaches nothing.
3. **The name over a pop.** 6.5 px, wrapping, up for 760 ms while a number
   rises. If the name cannot be read in that time it is doing nothing but
   crowding the figure, and the fix is the pop's dwell rather than the type
   size — a name under its own legibility floor says less than no name.
4. **A 38 × 44 slot on the rail.** The iron and the item dice keep the crown's
   pitch, so a read target is narrower than a thumb and sits between two
   others at the same pitch. The accepted deviation is documented; whether it
   is *reachable* is a hand question.
5. **A chip at 26 × 20 with an 11 px figure.** Six of them in a row inside the
   word band, over art. Readable at arm's length, or a smear?

### The cut order, if the hand says the turn drags

The attack's beats are named constants at the top of `src/app/app.ts` and
**their order is law while their durations are not**. This wave added no beat
to the attack, so the standing order is unchanged and the card goes in front
of it:

| order | knob | now | why |
| --- | --- | --- | --- |
| 1 | `TERRITORY_HOLD` | 1250 ms | the only new thing on the critical path, and the only one that teaches nothing |
| 2 | `CROSSING.still` | 760 ms | the tail of the crossing after the picture has landed |
| 3 | `ATTACK.dice` · `DIE_POP` | 200 · 34 ms | six dice is 204 ms of stagger — the largest single block |
| 4 | `ATTACK.blow` → `rest` | 840 → 950 ms | the longest pause; *then, and only then* survives a shorter one |
| never | `ATTACK.items` · `talisman` | 520 · 660 ms | **these are the beats that teach the loadout.** A face that goes past at the speed of a die teaches nothing, and a thing the player cannot see land is a thing they cannot price |

Cut to the felt beat, then record before and after in one table. A cut with no
number beside it is a preference.

### What is still owed

The whole of it: device and OS, the served commit hash, what read, what lied,
what dragged. Until that exists, every number this wave introduced —
`TERRITORY_HOLD`, the four grade strengths, the chip and name type sizes — is
a **first-pass value, reported rather than tuned**, exactly as the balance
report's figures are.

---

## The phone pass — quiet rooms

**Not done.** This wave was built in a remote container with no phone in it,
and the standing rule is that a pass which could not settle something says so
rather than inventing a value in its place. What ran instead is Chromium at
390 × 844 with real presses — 357 of them, no skips — which can prove that a
flame steps six times a second in whole quanta with nothing easing between
them. It did. It cannot answer whether six steps a second reads as *alive* or
as *broken*, and it cannot show a 1 px mote against a real panel's black.

The five questions below are the wave's own, **pre-registered here before the
build finished**, so that a later tuning result is a measurement rather than a
preference wearing a measurement's coat.

### What a pass has to settle, in order of how much it matters

1. **Does 5 Hz read as alive, or as broken?** `AMBIENT_HZ` in
   `src/render/ambience.ts`, and every other number in the wave divides it. A
   candle at five steps a second is a deliberate stutter — a sprite cycle, not
   a dimmer — and the failure mode is that it reads as a dropped frame rather
   than as a flame. **If it does: halve the rate before touching the quanta.**
   The pattern was authored uneven on purpose and the rate was not.
2. **Does the ossuary feel cleared, or stripped?** Twenty-two LOOKs lost their
   hotspot, and the Reliquary and the Chain Vault went from five to one. The
   writing is all still there, on the arrival or on the one LOOK that kept its
   place — but a player who used to tap five things and now taps one may read
   the room as emptier rather than as calmer. **If it reads as stripped, the
   fix is a budget, not a line**: `FRAME_BUDGETS` in
   `src/content/roomResolver.ts`, one number, and the folded prose comes back
   out of the focal LOOK in the same edit.
3. **Is two-per-room the right cap, or one too many?** The Offertory is the
   only room in the game that spends both — its own candle and the ossuary's
   dust. Everywhere else it is one or none. If two reads as fussy, the cap
   drops to one and the territory ambient wins, because a stretch of the
   descent sharing air is the thing rooms cannot do for themselves.
4. **Do the motes read as dust, or as noise?** Six 1 px squares of `--ink-dim`
   against the ossuary's ochre grade. One pixel is what dust is and it is close
   to the legibility floor; two pixels reads as snow. If they are invisible the
   answer is a **painted mote**, recorded above, rather than a bigger square.
5. **Does the still threshold read as intentional?** The Split, the Confluence,
   the Door and the way out hold their breath, deliberately, while the rooms
   either side of them breathe. The intended reading is *this room is about to
   ask you something*. The failure mode is *this room is broken*.

### The knobs, and the cut order if the hand says it is wrong

The order of these is law and the values are not, exactly as the attack's beats
are. Nothing here is on the critical path of a press — ambience runs only while
the screen is idle — so this list is about feel and never about pace.

| order | knob | now | why |
| --- | --- | --- | --- |
| 1 | `AMBIENT_HZ` | 5 | the whole wave divides it, and it is the one number that can read as a fault rather than as a choice |
| 2 | the `flicker` pattern | `[2, 1, 3, 2]` quanta | the uneven one. If the flame reads as a fault rather than as a flame, flatten it before slowing it |
| 3 | `LIGHT_QUANTUM` | 0.02 | how much light one step is worth. Raise it if the flame does nothing; lower it if the box's edge shows |
| 4 | the treatment boxes | 56 × 72, 72 × 48, 40 × 120 | the hard rectangles. A visible edge is answered by a **painted ember**, never by a blur — a blur breaks the grid law this wave exists to extend |
| never | the cap of two | 2 | it is what welds quiet motion to the negative-space law. Raising it is how a room becomes a lighting cue |

### What is still owed

The whole of it: device and OS, the served commit hash, what read, what lied,
what dragged. Until that exists, every number this wave introduced —
`AMBIENT_HZ`, the four step patterns, `LIGHT_QUANTUM`, the treatment box sizes,
the seven rows of `FRAME_BUDGETS`, `CLEAR_WATER` and `FOCAL_MOAT` — is a
**first-pass value, reported rather than tuned**, exactly as the territory
grades and the balance report's figures are.
