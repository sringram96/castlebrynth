# The asset brief — what to generate, at what size, and where it lands

> **Delivered so far** (the ossuary art pass): the hall, the reliquary frame,
> the ritual knife, and a seven-piece ossuary dressing kit — wall, niche,
> pillar, archway, hanging cluster, skull pile, candle ledge. **Repainted since**
> (the ossuary repaint): niche, pillar, archway, hanging cluster and skull pile
> came back denser and warmer and replaced their originals in place; the wall
> and the ledge were not in that delivery and stand as first painted. Two new
> slots came with it — `ossuary.shrine`, a built reliquary with a skull set in
> it, and `ossuary.gate`, a barred crypt door composed as a whole 2:3 scene the
> way `ossuary.hall` is. Both are registered and **neither is placed**: one is
> a hero and the other is a threshold, and where each stands is a design
> decision rather than a dressing choice (arts 37, 104). **Still owed:**
> the Marrow hero plate, the six bone die faces, the iron trinket die, and the
> three candle-flame patch frames. Their slots are declared and flagged
> `awaiting`; until they land the game falls back, and the Marrow is drawn as
> the authored body in `src/content/plates/bestiary.ts`.
>
> Two numbers moved against what is written below, and the code follows the
> paintings rather than the brief: the reliquary arrived at **1619 × 971**
> (drawn at 1.5 : 1, a deliberate tenth of a stretch so the live controls fit),
> and the knife at **1024 × 1536**. A taller reliquary would remove the stretch
> and is the one art fix this pass would most like.

`canonical-screen.png` is the target. This file is how that target gets built
out of separately generated images so the game can move them: the horror has
to come closer, the weapon has to change when you equip one, and the dice have
to be three or six or eight (art. 128). A single flat picture cannot do any of
those, so the picture is authored in **eight kinds of file** and the engine
composites them in the order art. 127 declares.

Everything below is exact. Sizes are pixels, positions are fractions, and the
fractions are what the code uses — so an asset built to this brief drops in
without anyone touching a number.

---

## The screen, as the engine builds it

Portrait, phone first. The stage is at most 460 CSS pixels wide and fills the
viewport height.

```
┌───────────────────────────────┐  ← stage width SW = min(460, viewport)
│ ░ the word (overlaid, fades) ░ │
│                               │
│                               │
│        THE WORLD BAND         │   height = viewport − tray
│                               │
│   backdrop · horror · weapon  │
│                               │
├───────────────────────────────┤
│        THE TRAY BAND          │   height = min(SW ÷ 1.3333, 36% of viewport)
│   frame art + live controls   │
└───────────────────────────────┘
```

| device | stage | tray band | world band | world aspect |
| --- | --- | --- | --- | --- |
| iPhone 14/15 · 390×844 | 390 | 390×293 | 390×552 | 0.707 |
| Pro Max · 428×926 | 428 | 428×321 | 428×605 | 0.707 |
| Pixel · 412×915 | 412 | 412×309 | 412×606 | 0.680 |
| small Android · 360×640 | 360 | 360×230 | 360×410 | 0.879 |
| tall narrow · 360×900 | 360 | 360×270 | 360×630 | 0.571 |
| desktop (stage max) | 460 | 460×345 | 460×655 | 0.702 |

**Why the tray is 4:3 and not the reference's proportion.** The reference's
tray is 1088 × 333 — three and a quarter to one. At 390 px that is a band 120
px tall, and the live tray has to hold a rail, up to eight dice at a size a
thumb can hit, a running total and three verbs. Measured, that needs about 265
px. So the tray art is **4:3**, which gives 293 px on the commonest phone, and
it is capped at 36% of the viewport so a short screen does not lose its world.

The world band's aspect therefore ranges about **0.57 → 0.88**. The backdrop
is authored at **0.667 (2:3)** and cover-fitted, which crops the top and bottom
on a short screen and the sides on a tall narrow one. That gives the safe zone
below, and it is the single most important constraint in this file.

---

## 1 · `ossuary.hall` — the room

**File** `public/assets/visual/regions/ossuary/hall.png`
**Size** **exactly 1024 × 1536** (2:3)
**Alpha** none — fully opaque
**Layer** 2 (material), painted over the computed box, under everything else

### The safe zone — non-negotiable

```
        ← 7% →                     ← 7% →
      ┌────┬───────────────────────┬────┐   ↑ 12%   cropped on a short screen
      │////│░░░░░░░░░░░░░░░░░░░░░░░│////│   ↓
      │////├───────────────────────┤////│
      │////│                       │////│
      │////│      A L W A Y S      │////│
      │////│      V I S I B L E    │////│   central 86% × 76%
      │////│                       │////│
      │////├───────────────────────┤////│
      │////│░░░░░░░░░░░░░░░░░░░░░░░│////│   ↑ 12%   cropped on a short screen
      └────┴───────────────────────┴────┘   ↓
       cropped on a tall narrow screen
```

- Everything that must be seen — the corridor, its vanishing point, the
  doorways, the niches, the candle — lives inside the central **86% of width
  and 76% of height**.
- The outer margin is atmosphere only: more wall, more dark, more ceiling.
- **The word band overlays the top ~14%** behind a dark scrim, and **the weapon
  covers the lower right quarter**. Nothing essential in either.

### What is in it

The canonical screen's room, and only the room:

> A first-person view down a wet stone ossuary corridor. Left wall: a deep
> arched funerary niche holding a full skeleton in relief, carved stone frame,
> old dried blood streaks down the masonry. Right wall: a hanging dark red
> banner with a worn gold reliquary cross, an iron sconce with a lit candle
> throwing warm light onto the stone beside it, a human skull set in the wall
> lower down. Centre: a tall pointed arch opening onto a receding vaulted
> corridor that fades to near-black, hanging chains and iron rings, water
> stains, a wet flagstone floor catching the candlelight in shallow puddles,
> loose stone and debris. Very dark, warm candlelight against cold blue-grey
> depth, heavy detailed pixel art, painterly texture, no characters, no
> creature, no user interface, no text, no weapon, no hands.

### What must NOT be in it

- **No creature.** The horror is asset 2 and it moves.
- **No hand, arm or weapon.** That is asset 3 and it changes.
- **No tray, frame, dice, icons or text of any kind.**
- Nothing that reads as a foreground object in the bottom-right eighth.

---

## 2 · `horror.marrow` — the thing in the room

**File** `public/assets/visual/horrors/marrow.png`
**Size** **exactly 896 × 1152** (0.778) — the size it is drawn at when it has
arrived, so it is never upscaled
**Alpha** **required** — transparent background, cut out cleanly
**Layer** 5 (hero) · **one per room, and nothing else may be on this band**

### How it is placed

The engine draws it twice as big when a fight opens (art. 30 — there is no
battle screen, the thing simply comes close):

| state | width, as a fraction of the world band | where its feet land |
| --- | --- | --- |
| standing off, down the corridor | 0.22 | 0.62 of band height |
| arrived, in a fight | 0.70 | 1.02 (its feet go past the bottom edge) |

So it is drawn about **86 px wide** at the far end of the corridor and about
**273 px wide** (819 device pixels at DPR 3) in your face. **Both have to
work**, which is the hardest thing in this brief:

- The **silhouette** must be unmistakable at 86 px — a skull on a barred
  ribcage, long asymmetric limbs. Squint at it: if it becomes a blob, it fails.
- The **detail** must reward arrival — eye sockets, teeth, finger joints, rib
  bindings, wet strands.
- **Two hot points in the skull** (kindled sockets) are what survive the far
  state. Keep them.

### Composition rules

- **Its feet are on the bottom edge of the image.** The bottom row of pixels is
  where it meets the floor. No empty margin underneath.
- Centred horizontally, with the widest reach (a hand, a shoulder) touching
  neither side edge — leave about 4% clear each side.
- Lit from the lower left, warm, to match the candle in the room.

> Full-body grotesque skeletal horror, cut out on a fully transparent
> background. A small high-detail skull with two faint burning points in the
> eye sockets, set on a barred ribcage; one shoulder hunched and higher than
> the other; long asymmetric arms reaching forward and down, ending in long
> bony fingers with visible joints; rusted wire and chain binding one forearm;
> torn wet strands hanging from the ribs; two long thin legs. Bone is dry warm
> ochre and grey, deep near-black in the cage's interior, lit from the lower
> left. Heavy detailed pixel art, painterly texture. No background, no ground
> shadow, no scenery, no text.

---

## 3 · `weapon.knife` — what you are holding

**File** `public/assets/visual/ui/knife.png`
**Size** **exactly 896 × 1152** (0.778)
**Alpha** **required**
**Layer** 9 (first-person) · anchored to the frame, never to the room

Drawn at **0.52 of the world band's width**, bottom-right corner, its own
bottom edge on the band's bottom edge. Hand and forearm are part of this file,
so a different weapon is a different file in the same pose — the grip is
authored once and every weapon matches it.

- The **fist and the sleeve occupy the bottom-right corner** of the image.
- The **blade points up and to the left**, its tip near the image's top-left.
- Nothing in the top-right or bottom-left quadrants — those are transparent.

> A first-person view of a gloved fist gripping a long worn dagger, seen from
> the holder's own eye. Wrapped leather sleeve and forearm entering from the
> bottom right corner; the blade angled up and to the left with a pierced
> engraved fuller, dried blood along the edge, oxidised iron and old brass.
> Lit warm from the left. Cut out on a fully transparent background. Heavy
> detailed pixel art. No background, no scenery, no text.

**Later weapons**: same file size, same pose, same grip position, same anchor.
Name them `weapon.<thing>` and they drop straight in.

---

## 4 · `tray.reliquary` — the carved frame the interface sits in

**File** `public/assets/visual/ui/reliquary.png`
**Size** **exactly 1536 × 1152** (4:3) — this aspect sets the tray band's
height, so of every number here it is the one that may not drift
**Alpha** none along the bottom and sides; the **top edge may fade to
transparent** so the room's darkness runs into it
**Layer** 10 (HUD) — it is the background of the DOM tray

On a short screen the band is capped and the plate is cropped **from its
sides**, so keep the outer 4% of the width free of anything that has to be
seen — the frame's own moulding is exactly what belongs there.

### This is a frame with empty recesses. The live interface goes in them.

Nothing may be drawn inside a recess — no dice, no icons, no numbers. The
recesses are dark, deep and empty, and the engine fills them.

```
 x→  0            .25          .5           .75            1
 y                                                              
 0  ┌────────────────── carved lip / top edge ──────────────────┐
.04 ├──────────┬────────────────────────────────────────────────┤
    │  FLASK   │            T A B S   (4 plaques)               │  RAIL
.27 ├──────────┴────────────────────────────────────────────────┤
.30 │ ┌────────────────────────────────────────────────────────┐│
    │ │                                                        ││
    │ │            T H E   W E L L   (empty, deep)             ││  DICE
    │ │                                                        ││
.71 │ └────────────────────────────────────────────────────────┘│
.74 ├────────────┬──────────────┬───────────────────────────────┤
    │  bed 1     │    bed 2     │        bed 3                  │  VERBS
.95 └────────────┴──────────────┴───────────────────────────────┘
```

Exact rectangles, as fractions of the art's own width and height:

| region | x0 | y0 | x1 | y1 | what goes in it |
| --- | --- | --- | --- | --- | --- |
| flask recess | 0.030 | 0.055 | 0.240 | 0.265 | health and armour, live |
| tab plaques | 0.280 | 0.055 | 0.970 | 0.265 | four carved name plates |
| **the well** | 0.045 | 0.300 | 0.955 | 0.710 | **the dice — leave empty** |
| verb bed 1 | 0.050 | 0.740 | 0.340 | 0.950 | a plain-verb button |
| verb bed 2 | 0.355 | 0.740 | 0.645 | 0.950 | a plain-verb button |
| verb bed 3 | 0.660 | 0.740 | 0.950 | 0.950 | a plain-verb button |

**Why the well is the full width**: the hand can be three dice or eight
(art. 128), and eight dice at a size a thumb can hit need 89% of a 390 px
phone. The reference's flask-left / dice-centre / slots-right layout is an
illustration at 1088 px and does not survive a phone. The flask stays; the
right-hand item slots move into the well beside the dice.

> A carved bone and oxidised iron reliquary panel, seen straight on, filling
> the frame. A raised lip along the top edge. Below it a narrow rail with a
> recessed glass flask cradle on the left and four flat carved name plaques
> across the rest. Below that a single wide deep empty recess running almost
> the full width, its interior in near-black shadow with a worn iron rail
> along its bottom lip. Below that three shallow rectangular button beds
> separated by carved bosses, with a small skull boss centred between them.
> Bone, tarnished brass, oxidised iron, wax, worn edges, near-black negative
> space. Heavy detailed pixel art. **Every recess is empty** — no dice, no
> bottles, no icons, no symbols, no letters or numbers anywhere.

---

## 5 · `die.bone.1` … `die.bone.6` — the six faces

**Files** `public/assets/visual/ui/die-1.png` … `die-6.png`
**Size** **exactly 256 × 256** each
**Alpha** **required** — transparent around the die's silhouette
**Drawn at** 40–60 CSS px (120–180 device pixels), so never upscaled

- **One die body, six faces.** Same silhouette, same lighting, same wear, in
  all six files, pixel for pixel — only the pips change. Generate them as one
  sheet if that is easier and say so; splitting is my problem, not yours.
- Warm bone, rounded worn corners, the die reading as an **object standing in
  the well** rather than a UI chip.
- Pips are **drilled holes**: dark, with a lit lower rim.
- Pips must read at arm's length. Big and few beats small and fussy.
- The die sits square to the viewer. No perspective, no shadow underneath.

> A single worn bone die seen straight on, filling the frame, cut out on a
> fully transparent background. Warm aged ivory, chipped rounded corners,
> hairline cracks, dark drilled pips with a lit lower rim. Heavy detailed
> pixel art, lit from the upper left. Showing exactly **N** pips in the
> standard arrangement. No background, no shadow, no text.

## 6 · `die.iron` — a carried good, which is a different material on purpose

**File** `public/assets/visual/ui/die-iron.png` · **exactly 256 × 256** · alpha required

Cold bevelled iron, eight-sided body, **blank face** — the engine draws the
glyph on it. The bar it has to clear: a player must tell an iron one from a
bone one with the screen upside down. Different shape, different hue, different
finish.

---

## 7 · `patch.candle.a` / `.b` / `.c` — the only thing in the room that moves

**Files** `public/assets/visual/patches/candle-a.png`, `-b`, `-c`
**Size** **exactly 128 × 192** each · **alpha required**

Three frames of a candle flame, and **nothing but the flame** — no candle, no
wax, no sconce, those are painted into the room. The flame's outline must be
in the **same cells in all three**; what changes is the fire moving inside it
(art. 107: a loop's frames share one silhouette, or it smears).

Placed at the candle in `ossuary.hall`; I will give you the exact fraction
once the room art exists.

---

## 8 · Optional, and only if the first seven land well

- `regions/ossuary/hall-far.png` — the same corridor with the arch further
  away, so a second ossuary room is not the same picture.
- `weapon.<other>` — one file per weapon, same pose, same size.
- `ui/word-plaque.png` — a soft dark vignette behind the word band. A CSS
  gradient does this today and does it acceptably.

---

## Format and weight

- **PNG**, 8-bit RGBA (or RGB where no alpha is asked for). Non-interlaced.
- Transparency is a real alpha channel, not a matted colour. A white or
  magenta background is not a cut-out and cannot be recovered cleanly.
- Rough budget: the room is the heavy one at 2–5 MB; everything else should be
  under 500 KB. I will compress and, where it helps, transcode — do not
  pre-optimise, send the best quality you have.
- **No text, no letters, no numerals, in any asset.** Every word on the screen
  is a live string in the player's language and in his voice (rules/voice.md).

## Where they go

Drop each file at the path named above, under `public/assets/visual/`. The
manifest in `src/content/visual/assets.ts` is the only place a filename is
written down, and it already expects these ids. **A file that has not arrived
is not an error** — the band stays empty and the room renders as the computed
box it always was (art. 126), so they can land one at a time.
