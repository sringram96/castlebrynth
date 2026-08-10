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

## HUMAN ART REQUIRED — The War of Bones

The combat system was replaced end to end. **No art was authored for it**, per
`CLAUDE.md` § *No art in the polish sweep*: `git diff --stat main` touches
nothing under `public/`, and no new image file exists. What the new system
needs, and what it is running on until those files land, is written out here.

### What it is running on now

Bones are drawn from the **pip geometry in `src/ui/components.ts`** — the same
mechanism the game has always drawn a die face with, extended to seven and
eight. That is not a new stand-in; it is the existing face renderer being given
two more values. Every bone states its number as text as well as as a pattern
(`aria-label`, `data-value`, and a printed numeral above six), so nothing about
the fight is unreadable while the plates are outstanding.

`BONE_ART` and `SATCHEL_ART` in `src/render/assets.ts` are **deliberately
empty**. A manifest row names a file, and `test/unit/assets.test.ts` holds every
row to a real file of the declared size — so a table that promised art nobody
had drawn would fail the build rather than ship a broken `<img>` into the middle
of a smash. The gates for those families are written and **armed**: they pass
vacuously on an empty table and bite the moment a row is added, which is what
stops a family landing half-delivered.

### The bone families

Four profiles, and each one ships whole or not at all:

| profile | faces needed | material note |
| --- | --- | --- |
| `common` | back, 1–6, broken | the anonymous pile. It should look like nothing. |
| `wrong` | back, 2–7, broken | pale, cold, one step off |
| `cruel` | back, 3–7, broken | the Cinderbone. Visible sigil. |
| `heavy` | back, 4–8, broken | the Knuckle. Visible sigil. |

Duplicate numeric faces may reuse one plate — `cruel` has two sevens and they
resolve identically — but **the family is back + every distinct value + broken**,
and a `heavy.8` that ships while `heavy.7` does not silently falls back to a
drawn face, putting two different kinds of object in one line.

**Seven and eight must be readable at arm's length without a tooltip.** No die
anybody has held has those faces, so there is no pattern to recognise. The
current renderer prints the numeral over the pips; a painted plate has to solve
the same problem, not assume it away.

The **back** is its own state and matters more than it sounds: it is the phase
between FIELD and THROW, the one moment in a round when the player has committed
and does not yet know to what. It has to be unmistakably *not a face*.

### The satchel

Two icons, and both or neither: `vial`, `pouch`. They sit in the first two of
the three bays on the right of the tray at roughly 32 × 44 CSS px on a phone,
so they are read as silhouettes. The count badge is drawn over them.

The Charm is gone, so the third bay is now an empty painted recess. That is
left showing deliberately rather than re-centring the pair on it — the recess
is part of the picture — but a repaint that re-cuts the right side for two bays
instead of three would be an improvement, not a regression.

### Clash FX

One authored collision/shatter family that can be staged over a bone body, or
per-material shatter states if the art direction wants them. **A CSS fracture is
not the final broken-bone state** — what ships now is a darkened, dropped face
with a hard diagonal across it, which reads and is not what a bone breaking
looks like.

### The tray

The enemy's line used to float above the plate at `top: -54px`, over the bottom
of the world, because the painted frame has no bay for it. On a dark floor that
was four unreadable objects, so it moved **into the well** — the one painted
recess wide enough to hold a row, already dark, and now the only region the
fight's two lines both live in.

It is seated at the crown's pitch rather than the well's, because lane N under
lane N is the whole smash rule and the column is how a player reads a pairing.
The cost is that the outer two bones overhang the recess by about 18 px a side
and rest on the painted frame. It reads; it is not what a bay looks like.

A repaint would want: **the well widened to 0.532 of the plate** so the enemy's
six sit inside it at the crown's pitch, an orb that reads as a **heap of bone**
rather than a glass of liquid, and the right side re-cut for two bays — Vial and
Pouch — rather than three relic icons. Every coordinate in `src/content/tray.ts`
was measured off the current 730 × 364 file by luminance profile; if the plate
is repainted, that table is the only thing that needs measuring again.

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
