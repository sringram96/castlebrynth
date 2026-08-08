# Reset progress

Tracking document for the rebuild specified by `Castlebrynth_Reset_Blueprint.docx`.
The blueprint is authoritative over everything that used to be in `DESIGN.md`,
`CHRONICLE.md` and `.claude/rules` — all of which now live under `archive/`.

**Current phase: 0 — preserve and quarantine (complete)**

---

## Completed phases

### Phase 0 — Preserve and quarantine ✅

**Tag.** `legacy-v0-pre-reset` points at `eb0159e`, the pre-reset `main`. No git
history was rewritten or deleted; every file removed below is one `git show`
away.

**Branch.** Work happens on `claude/castlebrynth-reset-ho4fls`.
*Deviation:* the blueprint (§21 Phase A) names the branch `reset/vertical-slice`.
The session's operating instructions pin a different branch name, and they win.
Nothing else about Phase A changes.

**Quarantined** (moved, not deleted):

| From | To |
| --- | --- |
| `.claude/rules/` (128 articles, 6 files) | `archive/legacy-design/rules/` |
| `.claude/agents/` (4 specialist agents) | `archive/legacy-design/agents/` |
| `DESIGN.md` | `archive/legacy-design/DESIGN.md` |
| `CHRONICLE.md` (234 KB of wave journals) | `archive/legacy-design/CHRONICLE.md` |
| `AGENTS.md` | `archive/legacy-design/AGENTS.md` |
| `reference/GAME.md`, `reference/the-gnawing-fight.md` | `archive/legacy-design/` |
| `reference/*.html` (4 signed-off prototypes) | `archive/prototypes/` |
| `reference/visual/`, `reference/*.png` | `docs/art-reference/` |
| `public/assets/visual/regions/`, `.../ui/` (46 MB of masters) | `docs/art-reference/masters/` |

**Deleted from the active path** (recoverable at the tag):

- `src/` — all 27,719 lines. `main.ts` alone was 3,921 lines and imported
  content, descent, gen, hinge, lots, state, room, visual, tray, screens, save,
  animation and DOM (blueprint §7.3).
- `test/` — 71 spec files. Most existed to preserve articles that the reset
  repeals (blueprint §18: *"Do not retain tests that make removed behavior
  harder to delete."*).
- `index.html` — 713 lines of shell markup and CSS.
- `tools/masters.mjs`, `tools/plates.mjs`, `tools/preview.mjs` — the old plate
  pipeline.

**Reused** (the only things carried across):

| Kept | Why |
| --- | --- |
| `tools/png.mjs` | A dependency-free PNG encoder/decoder. Nothing about it is tied to the old architecture, and the new art pipeline is built on it. |
| The reliquary zone map from `src/content/ui/reliquary.ts` | Measured coordinates of the painted tray's orb, crown, well and beds. Data, not architecture; re-authored into `src/content/tray.ts`. |
| The art masters | The pixel-horror scenes are the product. They are now source material under `docs/art-reference/`, not runtime payload. |

Everything else was rewritten from the blueprint rather than adapted.

**New: the art pipeline.** `tools/art.mjs` (`npm run art`) turns masters into
runtime assets. It fixed the P0 the blueprint calls out in §5.2 — *"you cannot
see the bad guy"* — which was not a polish gap but a **content gap**: the old
build declared `horror.marrow` as a plated horror and **shipped no enemy image
at all**. `public/assets/enemies/` now holds three cut-out sprites with binary
alpha, keyed out of the territory masters:

| Enemy | Size | Silhouette coverage |
| --- | --- | --- |
| `gnawing.png` | 242×253 | 49% |
| `marrow.png` | 348×679 | 45% |
| `warden.png` | 357×568 | 53% |

Runtime art payload went from **49 MB to 2.0 MB** (blueprint §14.3).

---

## Pending phases

- **Phase 1** — new skeleton, one authoritative design doc set, explicit state
  machine, browser tests.
- **Phase 2** — the canonical loop, and nothing outside it.
- **Phase 3** — dice.
- **Phase 4** — presentation.
- **Phase 5** — reliability.
- **Phase 6** — balance.

## Deviations from the blueprint

1. **Branch name** — `claude/castlebrynth-reset-ho4fls` rather than
   `reset/vertical-slice`; the session's operating instructions pin it.

## Unresolved human-design decisions

*(none recorded yet)*

## Browser tests passing

*(none yet — Playwright arrives in Phase 1)*
