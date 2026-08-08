# Polish sweep: clarity, motion, tray

Working branch: `claude/polish-clarity-motion-tray-cvvq2h`.

> The specification named `polish/clarity-motion-tray`. This session is pinned
> to the branch above by its harness and may not push anywhere else, so the
> name differs and nothing else does.

**No art is authored in this sweep.** See `CLAUDE.md` § *No art in the polish
sweep*. Every change below is layout, motion, copy, or rules — the pixels in
`public/assets/` are untouched, and `git diff --stat` on that directory is
empty at every commit.

---

## Baseline — `main` at `7d7d653`

The specification was written against `4582847` (the product reset). `main` has
one commit on top of it, `7d7d653`, which restores the build's commit stamp in
`vite.config.ts` and touches nothing this sweep is about. Nothing in the file
map moved.

```
npm run typecheck   clean
npm test            5 files, 77 tests passed
npm run build       clean, 36.04 kB js / 11.16 kB css
npx playwright test 38 passed          (needs CHROMIUM_PATH=/opt/pw-browsers/chromium
                                        in this container: the managed download is
                                        build 1234, the image ships 1194)
```

Baseline screenshots: `npm run shots -- baseline`, written to
`screens/baseline/` (gitignored — they are evidence for the person reading
this, not repository content).

---

## Measured plate geometry

`src/content/tray.ts` used to carry coordinates "measured off the master".
Several of them had drifted from the shipped `public/assets/ui/tray.png`, which
is the direct cause of complaint 5. Everything was re-measured off the actual
730×364 file by luminance profile (the ribs of the frame are bright, the bays
are dark), cross-checked against 3× crops.

| thing | painted (source px) | was | now |
| --- | --- | --- | --- |
| crown ribs | 170, 236.7, 303.3, 370, 436.7, 503.3, 570 | pitch 0.101 | pitch 0.09132 |
| first die centre | 203.3 → 0.2785 | 0.236 | 0.2785 |
| crown bay interior | y 52–88, 55 × 36 | y 21–96 | y 52–88 |
| relic bay centres | 566.5, 621.5, 678 | 0.788 / 0.864 / 0.940 | 0.776 / 0.851 / 0.929 |
| relic bay interior | y 166–256 | y 157–244 | y 166–256 |
| action beds | x 113–263, 275–452, 463–611; y 301–346 | y 291–342 | y 301–346 |
| well | x 200–524, y 108–255 | x 182–533, y 104–260 | x 200–524, y 108–255 |

The old first-die centre was 31 source px left of its bay and the old bay was
23 px too tall, which is why the row read as six dice sitting on the crown
rather than in it.

### Reference images supplied mid-sweep

Two annotated layout images were provided. The **zone model** in them is
adopted verbatim as the vocabulary of `src/content/tray.ts` — top rail, dice
zone, main well, footer — and the structure (orb left, six bays, three right
slots, three footer beds) matches the shipped plate.

Two things in those images are *not* used, deliberately:

1. **The numeric dice-slot table** (`Slot 0: (0.14, 0.10) w 0.11 …`) disagrees
   with the dashed boxes drawn in the same image, and with the shipped PNG. On
   `tray.png`, x 0.14 is the health orb and x 0.84–0.95 is the second and third
   relic bay — those numbers would put die 1 on the orb and die 6 in a relic
   slot. The drawn boxes span ≈0.27–0.72, which agrees with the measurement
   table above. Measurement wins.
2. **The footer tabs** (`Acts / Map / Pouch`) are pre-reset nouns. The reset
   deleted the tab bar and this sweep may not reintroduce a screen mode. The
   footer stays `MENU · primary · secondary`.

If the plate itself is repainted later, only the table in `src/content/tray.ts`
needs remeasuring; nothing else reads a coordinate.

---

## P0 — Guardrails and baseline
Status: DONE
Files changed: `POLISH_PROGRESS.md` (new), `CLAUDE.md`
Tests added/changed: none — no runtime behaviour changed
Behavior verified: all four gates green at `7d7d653`, counts recorded above
Deviations from spec: branch name, as noted at the top
Human decision needed: none

## P1 — Rename global INSPECT to MENU and reserve inspect semantics
Status: NOT STARTED

## P2 — Make tray geometry fit at phone size
Status: NOT STARTED

## P3 — Carried relics in the right-hand tray slots, inspectable
Status: NOT STARTED

## P4 — Restore dice roll / reroll / score / hit animation
Status: NOT STARTED

## P5 — Make upgrades rarer
Status: NOT STARTED

## P6 — Rewrite special-die copy for literal comprehension
Status: NOT STARTED

## P7 — Rewrite relic copy for literal comprehension
Status: NOT STARTED

## P8 — Rewrite general room / action / reward copy
Status: NOT STARTED

## P9 — Browser, motion, and regression acceptance
Status: NOT STARTED

## P10 — Human playtest handoff
Status: NOT STARTED
