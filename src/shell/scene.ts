// castlebrynth · the scene — the still, upscaled, and the things you may tap.
// (H104)
//
// DESIGN §frame: "Full-bleed pixel still". DESIGN §art direction: "Canvas
// 240-wide portrait, integer upscale, true-black letterbox". .llm/rules/ui.md:
// "The art frame renders at the asset grid profile's logical size, INTEGER
// upscale only, crisp edges, true-black letterbox filling the remainder."
//
// ───────────────────────────────────────────────────────── the three spaces ──
//
// .llm/rules/art.md forbids leaking one space into another, and this file is
// where all three meet, so they are named in every signature:
//
//   GRID space      the asset grid profile's logical pixels. `GRID_240` below is
//                   that named profile, and it is the ONLY place in src/shell
//                   where a raw pixel count is written — which is exactly the
//                   exemption art.md grants ("Raw pixel constants are FORBIDDEN
//                   everywhere except inside a named ASSET GRID PROFILE").
//   FRAME space     fractions of the frame. shell.css holds these.
//   PHYSICAL space  device-independent points. Everything this file computes
//                   comes out here, as plain numbers; the unit `px` is written
//                   once, in CSS, against a custom property. TS carries numbers,
//                   CSS carries units.
//
// ──────────────────────────────────────────── authored rects, derived hotspots ──
//
// art.md's long-run law is that a hotspot is DERIVED: "OBJECTS ARE DECLARATIVE:
// placed at world (X, z) with world sizes; screen position, scale, contact
// shadow, and TAP HOTSPOT are all derived by projection, never hand-placed."
// There is no projector yet and no world geometry to run one on — a `RoomCard`
// (cards.ts) carries objects with lines and actions and not one coordinate — so
// the rects arrive AUTHORED, on the art asset, in that asset's own GRID space.
//
// The law that matters is kept either way: nothing in this file hand-places a
// rect in device space. A grid rect goes through the same whole-number scale and
// the same letterbox offset as the pixels it sits on, so the hotspot cannot
// drift from the art it names. When the projector lands, what changes is where
// the grid rect comes FROM (world coordinates instead of an author's hand); the
// contract below — grid rect in, screen rect derived — does not change at all.
//
// ─────────────────────────────────────────────── the hotspots are the View's ──
//
// EXACTLY ONE HOTSPOT PER `ViewObject`, always, in the view's order. Not "one
// per authored rect": presence in the view IS tappability (types.ts
// `ViewObject`), so an object the art forgot still gets a place to be tapped —
// laid out by the fallback — and a rect the art declares for something not in
// the view is not rendered. Anything else would be a pixel hunt (DESIGN §content
// laws: "no pixel hunts (visible objects, min hit size)") or an affordance the
// engine never offered.
//
// EVERY HOTSPOT IS AT LEAST A THUMB. "every tap target ≥44 device-independent
// points (≈7mm) REGARDLESS OF ART SCALE" (.llm/rules/ui.md) — so a small rect at
// a small upscale is grown, about its own centre, to the minimum, and clamped
// inside the frame. The art keeps its size; the touch target does not.
//
// ────────────────────────────────────────────── the free tap changes nothing ──
//
// "Tap is free, always — describes, selects, surfaces actions; never advances,
// costs, or harms" (DESIGN §the descent). A tap here reaches `handlers.select`
// and nothing else: no engine call, no act, no write. The proof is in
// scene.test.ts and it is a deep clone of a whole `GameState`, not of a view.
//
// ─────────────────────────────────────────────────────── deliberately absent ──
//
//   the VIGNETTE   "Sanity is the vignette closing in" (DESIGN §frame), an
//                  ordered-dither aperture on the logical pixel grid
//                  (.llm/rules/ui.md). `GameView.vignette` is on the view this
//                  file is handed and is deliberately NOT drawn: a dithered
//                  aperture is its own piece of work with its own laws (never a
//                  smooth gradient, never occluding the panel), it is not in
//                  this card's scope, and a smooth CSS gradient dropped in to
//                  "have something" would break the rule that names it.
//   ANIMATION      plates stay still; motion ships as region patches
//                  (.llm/rules/animation.md). None of that is here.
//   CINEMA         the letterboxed close-up register is its own still and its
//                  own asset grid (CINE-480). This card renders the ROOM
//                  register.

import type { GameView, Id } from "../core/types";

// ────────────────────────────────────────────────── the asset grid profile ──

/**
 * GRID-240 — the ROOM register's asset grid profile (.llm/rules/art.md).
 *
 * "rooms author on GRID-240 ... Canvas 240-wide portrait". The width is the
 * profile's; the HEIGHT is the asset's, because a portrait canvas's height is
 * an authoring choice per still and not a law. The wireframe, which has no
 * asset, derives its height from the frame instead — see `place`.
 *
 * Profiles "are product choices, not law": changing this number re-authors the
 * register's art and changes no rule and no code but this line.
 */
export const GRID_240 = { name: "GRID-240", width: 240 } as const;

/** The value shell.css declares for `--tap-min`. Read from the stylesheet at
 *  mount; this is the fallback for when no stylesheet has loaded (jsdom, or a
 *  first paint), and shell.css stays the source of truth. */
export const TAP_MIN = 44;

// ───────────────────────────────────────────────────────────────── the art ──

/** A rectangle in the asset's GRID space: logical pixels, origin top-left. */
export interface GridRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A rectangle in PHYSICAL space: device-independent points, relative to the
 *  stage. Plain numbers — the unit is written once, in CSS. */
export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/**
 * One authored still: the pixels, their logical size, and where the things in
 * them are.
 *
 * `hotspots` is keyed by OBJECT ID, so the art and the room card meet on the
 * engine's own name for a thing and nowhere else. An id the view does not carry
 * is not rendered; a view object the art does not name still gets a hotspot.
 */
export interface StillArt {
  readonly id: Id;
  /** Where the pixels are. Any source an `<img>` accepts. */
  readonly src: string;
  /** Logical size in GRID space. `width` is the profile's; `height` is this
   *  asset's own. */
  readonly width: number;
  readonly height: number;
  readonly hotspots: { readonly [object: string]: GridRect };
}

/** How the shell finds art. `null` for anything not painted yet — which, in the
 *  skeleton, is everything, and is why the wireframe path is not a fallback for
 *  emergencies but the ordinary case. */
export type Gallery = (still: Id) => StillArt | null;

/** The empty gallery: no art exists. The skeleton's default. */
export const NO_ART: Gallery = () => null;

// ──────────────────────────────────────────────────────────── the placement ──

export interface Size {
  readonly width: number;
  readonly height: number;
}

/**
 * Where the still sits in the frame, and by how much it is magnified.
 *
 * `grid` is the logical canvas the hotspots are measured against — the art's own
 * size when there is art, and a frame-shaped canvas when there is not.
 */
export interface Placement {
  /** WHOLE NUMBER, ≥ 1. Never fractional: a half-pixel is a blurred pixel. */
  readonly scale: number;
  /** True-black letterbox offset, in device-independent points. */
  readonly left: number;
  readonly top: number;
  /** The magnified still's size, in device-independent points. */
  readonly width: number;
  readonly height: number;
  /** The logical canvas, in GRID space. */
  readonly grid: Size;
}

/**
 * Fit a still into a frame by a whole number, and centre it.
 *
 * INTEGER UPSCALE ONLY. `floor`, and a floor of 1: on a frame too small for one
 * whole copy of the canvas, the still is CROPPED by the stage's overflow rather
 * than shrunk to a fraction. Shrinking is the one thing that cannot be undone —
 * it destroys the grid the whole art direction is built on — and a phone
 * narrower than 240 points does not exist.
 *
 * WITHOUT ART, THE CANVAS IS DERIVED FROM THE FRAME. The wireframe has no
 * authored height to honour, so it takes the profile's width, the whole-number
 * scale that width implies, and whatever height that scale leaves — which fills
 * the stage exactly, with no letterbox, and invents no aspect ratio that later
 * art would have to live with.
 *
 * TOTAL: a frame of zero (jsdom, or a first paint before layout) answers scale 1
 * rather than dividing by nothing.
 */
export function place(frame: Size, still: Size | null): Placement {
  if (still === null) {
    const scale = Math.max(1, Math.floor(frame.width / GRID_240.width));
    const grid: Size = {
      width: GRID_240.width,
      height: Math.max(1, Math.floor(frame.height / scale)),
    };
    return {
      scale,
      left: 0,
      top: 0,
      width: grid.width * scale,
      height: grid.height * scale,
      grid,
    };
  }

  const scale = Math.max(
    1,
    Math.floor(Math.min(frame.width / still.width, frame.height / still.height)),
  );
  const width = still.width * scale;
  const height = still.height * scale;
  return {
    scale,
    // Centred, and on whole points: an odd remainder split in half would put the
    // pixel grid on a half point and undo the crisp edges the scale bought.
    left: Math.floor((frame.width - width) / 2),
    top: Math.floor((frame.height - height) / 2),
    width,
    height,
    grid: { width: still.width, height: still.height },
  };
}

// ─────────────────────────────────────────────────────────────── hotspots ──

/** A thing you may tap: the object it names, and where the thumb must land. */
export interface Hotspot {
  readonly object: Id;
  readonly label: string;
  /** PHYSICAL space, relative to the stage. Already grown to the tap minimum. */
  readonly rect: Rect;
  /** True when the art did not name this object and the rect was laid out
   *  rather than derived from the still. */
  readonly authored: boolean;
}

/** A grid rect, carried through the placement's own scale and offset. Whole
 *  numbers in, whole numbers out — the hotspot lands on the same points the
 *  pixels did. */
function projected(rect: GridRect, at: Placement): Rect {
  return {
    left: at.left + rect.x * at.scale,
    top: at.top + rect.y * at.scale,
    width: rect.width * at.scale,
    height: rect.height * at.scale,
  };
}

/**
 * Grow a rect about its centre to at least `minimum` on each axis, then clamp it
 * inside the frame.
 *
 * "≥44 device-independent points REGARDLESS OF ART SCALE" (.llm/rules/ui.md).
 * The art keeps its size — this moves the TOUCH target only. Clamping comes
 * second so that a thing at the edge of the frame keeps its full thumb instead
 * of half of one hanging off the screen.
 */
function atLeast(rect: Rect, minimum: number, frame: Size): Rect {
  const width = Math.max(rect.width, minimum);
  const height = Math.max(rect.height, minimum);
  const left = rect.left - (width - rect.width) / 2;
  const top = rect.top - (height - rect.height) / 2;
  return {
    left: Math.round(Math.min(Math.max(left, 0), Math.max(frame.width - width, 0))),
    top: Math.round(Math.min(Math.max(top, 0), Math.max(frame.height - height, 0))),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Lay out the objects the art did not name, in a deterministic grid over the
 * frame.
 *
 * This is the WIREFRAME's whole layout and it is also the patch for a half-
 * painted still, and it is the same code for both on purpose: an object with no
 * rect must be tappable and VISIBLE either way, or it is a pixel hunt.
 *
 * Square-ish, row-major, in the view's order — so the same room lays out the
 * same way every time it is drawn, and a playtester's note about "the second
 * box" means something.
 */
function slots(count: number, frame: Size): readonly Rect[] {
  if (count === 0) return [];
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const cellWidth = frame.width / columns;
  const cellHeight = frame.height / rows;
  // A tenth of the smaller cell edge, so the boxes read as separate things
  // rather than as one grid of lines.
  const gutter = Math.min(cellWidth, cellHeight) / 10;
  return Array.from({ length: count }, (_, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      left: Math.round(column * cellWidth + gutter),
      top: Math.round(row * cellHeight + gutter),
      width: Math.round(cellWidth - gutter * 2),
      height: Math.round(cellHeight - gutter * 2),
    };
  });
}

/**
 * The hotspots for this view: EXACTLY ONE PER `ViewObject`, in the view's order.
 *
 * An object the art named is projected off the still. An object it did not is
 * given a slot from the fallback grid — and the grid is laid out over only the
 * unnamed ones, so a mostly-painted room does not scatter its one missing thing
 * across the whole frame.
 *
 * Overlap is possible once rects are grown to a thumb, and it is resolved by
 * ORDER: the hotspots are stacked in the view's order, so a later object is on
 * top. That is the DOM's own rule, and this list is what the DOM is built from.
 */
export function hotspotsFor(
  view: GameView,
  art: StillArt | null,
  at: Placement,
  frame: Size,
  tapMin: number,
): readonly Hotspot[] {
  const unnamed = view.objects.filter(
    (object) => art === null || art.hotspots[object.id] === undefined,
  );
  const fallback = slots(unnamed.length, frame);
  const slotOf = new Map<Id, Rect>();
  unnamed.forEach((object, index) => {
    const rect = fallback[index];
    if (rect !== undefined) slotOf.set(object.id, rect);
  });

  return view.objects.map((object) => {
    const authored = art === null ? undefined : art.hotspots[object.id];
    const rect = authored === undefined ? slotOf.get(object.id) : projected(authored, at);
    return {
      object: object.id,
      label: object.label,
      rect: atLeast(rect ?? { left: 0, top: 0, width: 0, height: 0 }, tapMin, frame),
      authored: authored !== undefined,
    };
  });
}

// ────────────────────────────────────────────────────────────── the scene ──

export interface SceneHandlers {
  /**
   * A free tap: this object, or null for the room itself (a tap on nothing).
   *
   * It SELECTS. It does not act, it does not advance, it does not cost or harm
   * (DESIGN §the descent). The shell hands it to the panel, which snaps to
   * ACTIONS (H105) — and the panel's selection is shell state, so the engine is
   * never asked anything at all.
   */
  readonly select: (object: Id | null) => void;
}

export interface SceneOptions {
  /** Where art comes from. Defaults to `NO_ART` — the skeleton has none. */
  readonly gallery?: Gallery;
  /** The stage's size in device-independent points. Defaults to measuring the
   *  host, which is what the browser wants and what jsdom cannot do. */
  readonly measure?: () => Size;
  /** The tap minimum. Defaults to `--tap-min` from the stylesheet, then to
   *  `TAP_MIN`. */
  readonly tapMin?: number;
}

export interface Scene {
  readonly element: HTMLElement;
  /** Draw this view. Total: art or no art, objects or none. */
  render(view: GameView): void;
  /** The hotspots as last drawn — one per `ViewObject`, in the view's order. */
  hotspots(): readonly Hotspot[];
  /** Whether the last render found art for the still. */
  hasArt(): boolean;
}

/** `--tap-min` as the stylesheet declares it, or `TAP_MIN` when no stylesheet
 *  has loaded. Parsed once, at mount. */
function tapMinimum(host: HTMLElement): number {
  const owner = host.ownerDocument.defaultView;
  if (owner === null) return TAP_MIN;
  const declared = owner.getComputedStyle(host).getPropertyValue("--tap-min");
  const parsed = Number.parseFloat(declared);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : TAP_MIN;
}

/**
 * Build the scene into `host` — the frame's stage region (main.ts `Frame`).
 *
 * The still, the hotspot layer, and a tap on the background. Built once and
 * re-rendered in place, for the same reason the panel is (panel.ts): the parts
 * that must always be there have no code path that removes them.
 */
export function mountScene(
  host: HTMLElement,
  handlers: SceneHandlers,
  options: SceneOptions = {},
): Scene {
  const owner = host.ownerDocument;
  const gallery = options.gallery ?? NO_ART;
  const tapMin = options.tapMin ?? tapMinimum(host);
  const measure =
    options.measure ??
    ((): Size => {
      const box = host.getBoundingClientRect();
      return { width: box.width, height: box.height };
    });

  const scene = owner.createElement("div");
  scene.className = "scene";

  // The still. An <img> and not a background, so the pixels have a size the
  // layout can be asked about and `image-rendering` has something to apply to.
  const still = owner.createElement("img");
  still.className = "still";
  still.alt = "";
  still.decoding = "sync";

  // The wireframe stands in for the still when there is no art. It is not an
  // error state — in the skeleton it is every room.
  const wire = owner.createElement("div");
  wire.className = "still-wire";

  const layer = owner.createElement("div");
  layer.className = "hotspots";

  scene.append(wire, still, layer);
  host.replaceChildren(scene);

  // A TAP ON NOTHING DESELECTS. The room is what you are looking at when you are
  // not looking at a thing in it, and the panel's ACTIONS page says so
  // (types.ts `PanelView.actions`: "offered when nothing is selected").
  scene.addEventListener("click", () => handlers.select(null));

  let drawn: readonly Hotspot[] = [];
  let art: StillArt | null = null;

  function render(view: GameView): void {
    const frame = measure();
    art = view.still === null ? null : gallery(view.still);
    const at = place(frame, art);

    // TS carries numbers; CSS carries the unit. Every length below is derived —
    // from the asset grid, the whole-number scale, and the frame — and none of
    // them is written down anywhere.
    scene.style.setProperty("--scale", String(at.scale));
    scene.style.setProperty("--still-left", String(at.left));
    scene.style.setProperty("--still-top", String(at.top));
    scene.style.setProperty("--still-width", String(at.width));
    scene.style.setProperty("--still-height", String(at.height));

    if (art === null) {
      still.removeAttribute("src");
      still.hidden = true;
      wire.hidden = false;
      wire.textContent = view.still === null ? "NO ROOM" : view.still;
    } else {
      still.src = art.src;
      still.hidden = false;
      wire.hidden = true;
      wire.textContent = "";
    }

    drawn = hotspotsFor(view, art, at, frame, tapMin);
    layer.replaceChildren(
      ...drawn.map((hotspot) => {
        const press = owner.createElement("button");
        press.type = "button";
        press.className = hotspot.authored ? "hotspot" : "hotspot hotspot--laid-out";
        press.dataset["object"] = hotspot.object;
        // The label is the writing's name for the thing (types.ts `ViewObject`).
        // Shown in the wireframe, where there are no pixels to recognise it by;
        // over real art it is the accessible name and nothing more.
        press.setAttribute("aria-label", hotspot.label);
        press.textContent = art === null ? hotspot.label : "";
        press.style.setProperty("--left", String(hotspot.rect.left));
        press.style.setProperty("--top", String(hotspot.rect.top));
        press.style.setProperty("--width", String(hotspot.rect.width));
        press.style.setProperty("--height", String(hotspot.rect.height));
        press.addEventListener("click", (event) => {
          // The background listener would otherwise deselect immediately after.
          event.stopPropagation();
          handlers.select(hotspot.object);
        });
        return press;
      }),
    );
  }

  return {
    element: scene,
    render,
    hotspots: () => drawn,
    hasArt: () => art !== null,
  };
}
