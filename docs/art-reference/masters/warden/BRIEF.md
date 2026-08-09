# The Warden — asset brief

**Delivered.** Ten plates, all at 1024 × 1536, sitting beside this file. They
are the masters and are never served: `npm run art` builds the runtime plates
from them, and `docs/ART_DIRECTION.md` § *The pipeline* is where that is
described.

They replace `docs/art-reference/visual/territory-gate-warden.png`, which was a
whole composition with the figure painted into a corridor and had to be cut out
of it by a luminance key. That file is kept as history and is no longer runtime
art. These are authored the other way round — the subject alone on flat
`#000000` — so the key needs no seeds, no radial threshold and nothing set by
eye, exactly as the Crawling One's plates do.

## The one framing rule

Every file below is the **same frame at the same pixel size**: 1024 × 1536,
portrait, 2:3, subject on flat `#000000`, no HUD, no text, no border, no room
behind it.

The frames register with each other pixel for pixel, and **the pipeline keeps
that registration**: a Warden plate is never trimmed to its own silhouette. It
is keyed, resampled whole to 480 × 720 and cover-fitted by the compositor
exactly as the backdrop is — so the empty part of the canvas is positioning
data, and swapping `idle` for `attack` changes the drawing inside the frame and
nothing about where the frame is.

Trimming each pose and then sizing each trimmed result to one CSS width is the
failure this rule exists to prevent: the poses have different silhouettes, so
that would make the skeleton change size every time the pose changed.

## The plates

| file | what it is |
| --- | --- |
| `warden-idle-full-1.png` | standing, hands clasped, upright and whole |
| `warden-idle-full-2.png` | the same, one beat later |
| `warden-idle-mid-1.png` | settled, dimmer, hood lower over the face |
| `warden-idle-mid-2.png` | the same, one beat later |
| `warden-idle-low-1.png` | bowed, the robe going to strips |
| `warden-idle-low-2.png` | head down, shoulders sagging, bare feet showing |
| `warden-attack.png` | arms flung wide, hands open — STRIKE and JUDGE |
| `warden-defense.png` | arms crossed over the chest — RAISE |
| `warden-defeat-1.png` | still standing, but giving way: arms loose, head lolling |
| `warden-defeat-2.png` | down, collapsed into its own robe, held |

The three idle pairs are a health ladder rather than three moods: `full` above
two thirds, `mid` between a third and two thirds, `low` at or below a third.
The ladder is legible in the posture — the head sits lower in every pair than
in the one before it — and `src/content/enemyPresentation.ts` is the only place
that says which band a plate belongs to.

## Which delivered file became which plate

Eleven files were supplied and ten are used. The four action poses are
unambiguous; the seven standing portraits were sorted into the three idle pairs
by how far the head has dropped, which is the deterioration the ladder is
showing:

| plate | head sits at |
| --- | --- |
| `idle-full-1`, `idle-full-2` | y 97, y 98 |
| `idle-mid-1`, `idle-mid-2` | y 111, y 112 |
| `idle-low-1`, `idle-low-2` | y 118, y 138 |

The eleventh file is a near-duplicate of `warden-idle-mid-1.png` — the two
silhouettes differ less than any other pair in the set — and is not shipped. If
any of this sorting is wrong, the fix is to rename the files in this folder and
re-run `npm run art`: no code names a band's file, and nothing outside
`src/render/assets.ts` names a file at all.
