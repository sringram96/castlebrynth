// @vitest-environment jsdom
//
// H104 · the scene: the still, upscaled, and the things you may tap.
//
// Three claims, and the card's DONE WHEN is all three: hotspots 1:1 with the
// View, both the art path and the wireframe fallback, and the tap-purity proof.
//
// THE GEOMETRY IS TESTED AS ARITHMETIC. `place` and `hotspotsFor` are pure
// functions of sizes, so they are exercised with sizes written down here rather
// than measured off a jsdom box that is always 0×0. The DOM tests inject the
// same sizes through `measure`. That is not a workaround — it is the reason the
// projection was factored out of the renderer in the first place.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { newRun, view as viewOf } from "../core/api";
import { descend } from "../core/doors";
import { resolve } from "../core/resolve";
import { GRID_240, NO_ART, TAP_MIN, hotspotsFor, mountScene, place } from "./scene";
import type { RoomCard } from "../core/cards";
import type { GameState, GameView } from "../core/types";
import type { Gallery, Size, StillArt } from "./scene";

/** A phone's stage: the frame's top 62%, at 390×844 (H101 measured it). */
const STAGE: Size = { width: 390, height: 523 };

/** A 1×1 transparent GIF. The art path needs a source an <img> accepts; it does
 *  not need pixels, and there are none to have — the skeleton is wireframe. */
const PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const ART: StillArt = {
  id: "still:crossing",
  src: PIXEL,
  width: GRID_240.width,
  height: 320,
  hotspots: {
    // Small on purpose: at scale 1 this is 16×12 points, well under a thumb.
    portal: { x: 100, y: 140, width: 16, height: 12 },
    sconce: { x: 8, y: 20, width: 40, height: 60 },
    // Named by the art, absent from the view below. Must not be rendered.
    "grate:cut": { x: 0, y: 300, width: 20, height: 20 },
  },
};

const GALLERY: Gallery = (still) => (still === ART.id ? ART : null);

const VIEW: GameView = {
  still: "still:crossing",
  lines: ["The portal is cold and has been for a long time."],
  objects: [
    {
      id: "portal",
      label: "the dead ring",
      actions: [{ intent: { object: "portal", action: "reach" }, label: "REACH IN" }],
    },
    { id: "sconce", label: "a cold sconce", actions: [] },
    // In the view, named by nothing in the art: must still be tappable.
    { id: "boards", label: "loose boards", actions: [] },
  ],
  panel: { actions: [], skills: [], items: [] },
  strip: {
    hp: { current: 8, max: 10 },
    might: { current: 3, max: 3 },
    will: { current: 2, max: 4 },
    tithes: 17,
    depth: 2,
  },
  vignette: 0.4,
};

function mount(options: { gallery?: Gallery } = {}): {
  scene: ReturnType<typeof mountScene>;
  host: HTMLElement;
  select: ReturnType<typeof vi.fn>;
} {
  const host = document.createElement("section");
  host.className = "stage";
  document.body.replaceChildren(host);
  const select = vi.fn();
  const scene = mountScene(
    host,
    { select },
    { gallery: options.gallery ?? NO_ART, measure: () => STAGE, tapMin: TAP_MIN },
  );
  return { scene, host, select };
}

const boxes = (host: HTMLElement): HTMLButtonElement[] => [
  ...host.querySelectorAll<HTMLButtonElement>(".hotspot"),
];

beforeEach(() => {
  document.body.replaceChildren();
});

describe("H104 · integer upscale, crisp edges, true-black letterbox", () => {
  it("magnifies by a whole number and never by a fraction", () => {
    // 390/240 = 1.625 and 523/320 = 1.634 — a fitting scaler would take 1.625
    // and put the pixel grid on fractions of a point.
    const at = place(STAGE, ART);
    expect(at.scale).toBe(1);
    expect(Number.isInteger(at.scale)).toBe(true);

    const big = place({ width: 1200, height: 1400 }, ART);
    expect(big.scale).toBe(4);
    expect(big.width).toBe(ART.width * 4);
    expect(big.height).toBe(ART.height * 4);
  });

  it("takes the tighter of the two axes", () => {
    // Wide enough for 5×, tall enough for only 2×.
    expect(place({ width: 1200, height: 700 }, ART).scale).toBe(2);
  });

  it("crops rather than shrinking on a frame too small for one whole copy", () => {
    // Shrinking is the one thing that cannot be undone: it destroys the grid the
    // whole art direction is built on.
    const at = place({ width: 120, height: 100 }, ART);
    expect(at.scale).toBe(1);
    expect(at.width).toBe(ART.width);
  });

  it("centres the still on whole points, and letterboxes the remainder", () => {
    const at = place({ width: 401, height: 523 }, ART);

    expect(Number.isInteger(at.left)).toBe(true);
    expect(Number.isInteger(at.top)).toBe(true);
    expect(at.left).toBe(Math.floor((401 - 240) / 2));
    // The remainder is the letterbox. It is filled by `.scene`'s black.
    expect(401 - at.width - at.left).toBeGreaterThan(0);
  });

  it("never divides by a frame that has not been laid out yet", () => {
    const at = place({ width: 0, height: 0 }, ART);
    expect(at.scale).toBe(1);
    expect(Number.isFinite(at.left)).toBe(true);
  });

  it("without art, fills the frame exactly and invents no aspect ratio", () => {
    const at = place(STAGE, null);

    expect(at.grid.width).toBe(GRID_240.width);
    expect(at.scale).toBe(1);
    // No letterbox: the wireframe has no authored height to honour, so it takes
    // whatever the whole-number scale leaves.
    expect(at.left).toBe(0);
    expect(at.top).toBe(0);
    expect(at.height).toBe(STAGE.height);
  });
});

describe("H104 · hotspots are 1:1 with the View", () => {
  const at = place(STAGE, ART);

  it("gives exactly one hotspot per ViewObject, in the view's order", () => {
    const spots = hotspotsFor(VIEW, ART, at, STAGE, TAP_MIN);

    expect(spots).toHaveLength(VIEW.objects.length);
    expect(spots.map((spot) => spot.object)).toEqual(["portal", "sconce", "boards"]);
  });

  it("renders nothing for art the view does not carry", () => {
    // The art names `grate:cut`. The view does not, so the engine is not
    // offering it, so there is nothing to tap.
    const spots = hotspotsFor(VIEW, ART, at, STAGE, TAP_MIN);
    expect(spots.some((spot) => spot.object === "grate:cut")).toBe(false);
  });

  it("still places a thing the art forgot — presence IS tappability", () => {
    const spots = hotspotsFor(VIEW, ART, at, STAGE, TAP_MIN);
    const boards = spots.find((spot) => spot.object === "boards");

    expect(boards?.authored).toBe(false);
    expect(boards?.rect.width).toBeGreaterThan(0);
    // No pixel hunts (DESIGN §content laws): it is somewhere, and it is big
    // enough to hit.
    expect(boards?.rect.width).toBeGreaterThanOrEqual(TAP_MIN);
  });

  it("carries an authored rect through the still's own scale and offset", () => {
    const big = place({ width: 1200, height: 1400 }, ART);
    const spots = hotspotsFor(VIEW, ART, big, { width: 1200, height: 1400 }, TAP_MIN);
    const sconce = spots.find((spot) => spot.object === "sconce");

    // The hotspot rides the pixels it names: same scale, same letterbox offset.
    expect(sconce?.authored).toBe(true);
    expect(sconce?.rect.left).toBe(big.left + 8 * big.scale);
    expect(sconce?.rect.top).toBe(big.top + 20 * big.scale);
    expect(sconce?.rect.width).toBe(40 * big.scale);
  });

  it("grows a small rect to a thumb, about its own centre, at any art scale", () => {
    const spots = hotspotsFor(VIEW, ART, at, STAGE, TAP_MIN);
    const portal = spots.find((spot) => spot.object === "portal");

    // Authored 16×12 at scale 1. "≥44 device-independent points REGARDLESS OF
    // ART SCALE" (.llm/rules/ui.md).
    expect(portal?.rect.width).toBe(TAP_MIN);
    expect(portal?.rect.height).toBe(TAP_MIN);
    // Centred on what it names, not anchored to a corner.
    const centre = (r: { left: number; width: number }): number => r.left + r.width / 2;
    expect(centre(portal!.rect)).toBeCloseTo(at.left + 100 + 16 / 2, 0);
  });

  it("keeps a full thumb on a thing at the very edge of the frame", () => {
    const edge: StillArt = {
      ...ART,
      hotspots: { portal: { x: 0, y: 0, width: 2, height: 2 } },
    };
    const spots = hotspotsFor(VIEW, edge, place(STAGE, edge), STAGE, TAP_MIN);
    const portal = spots.find((spot) => spot.object === "portal");

    // Clamped INTO the frame rather than half hanging off it.
    expect(portal?.rect.left).toBeGreaterThanOrEqual(0);
    expect(portal?.rect.width).toBe(TAP_MIN);
  });

  it("every hotspot clears the minimum, on every path", () => {
    for (const art of [ART, null]) {
      for (const spot of hotspotsFor(VIEW, art, place(STAGE, art), STAGE, TAP_MIN)) {
        expect(spot.rect.width).toBeGreaterThanOrEqual(TAP_MIN);
        expect(spot.rect.height).toBeGreaterThanOrEqual(TAP_MIN);
      }
    }
  });

  it("lays out the same room the same way every time", () => {
    const once = hotspotsFor(VIEW, null, place(STAGE, null), STAGE, TAP_MIN);
    const twice = hotspotsFor(VIEW, null, place(STAGE, null), STAGE, TAP_MIN);
    expect(twice).toEqual(once);
  });

  it("has no hotspots for a room with nothing in it, and does not fall over", () => {
    const bare = { ...VIEW, objects: [] };
    expect(hotspotsFor(bare, ART, at, STAGE, TAP_MIN)).toEqual([]);
  });
});

describe("H104 · the art path and the wireframe fallback", () => {
  it("draws the still when there is art", () => {
    const { scene, host } = mount({ gallery: GALLERY });
    scene.render(VIEW);

    const still = host.querySelector<HTMLImageElement>(".still");
    expect(scene.hasArt()).toBe(true);
    expect(still?.getAttribute("src")).toBe(PIXEL);
    expect(still?.hidden).toBe(false);
    expect(host.querySelector<HTMLElement>(".still-wire")?.hidden).toBe(true);
  });

  it("falls back to a wireframe when the art is absent, and names what is missing", () => {
    // The skeleton's ordinary case, not an error state: no art exists yet.
    const { scene, host } = mount();
    scene.render(VIEW);

    const wire = host.querySelector<HTMLElement>(".still-wire");
    expect(scene.hasArt()).toBe(false);
    expect(wire?.hidden).toBe(false);
    expect(wire?.textContent).toBe("still:crossing");
    expect(host.querySelector<HTMLImageElement>(".still")?.hidden).toBe(true);
    expect(host.querySelector(".still")?.hasAttribute("src")).toBe(false);
  });

  it("labels every box in the wireframe, because there are no pixels to know it by", () => {
    const { scene, host } = mount();
    scene.render(VIEW);

    // IF IT'S TAPPABLE, IT CATCHES THE LIGHT (.llm/rules/art.md) — with no art
    // to catch it on, the outline and the name are the whole affordance.
    expect(boxes(host).map((box) => box.textContent)).toEqual([
      "the dead ring",
      "a cold sconce",
      "loose boards",
    ]);
    expect(boxes(host).every((box) => box.classList.contains("hotspot--laid-out"))).toBe(true);
  });

  it("marks which hotspots the art placed and which the shell had to invent", () => {
    const { scene, host } = mount({ gallery: GALLERY });
    scene.render(VIEW);

    const laidOut = boxes(host).filter((box) => box.classList.contains("hotspot--laid-out"));
    expect(laidOut.map((box) => box.dataset["object"])).toEqual(["boards"]);
  });

  it("says so when there is no room at all, rather than drawing a broken image", () => {
    const { scene, host } = mount({ gallery: GALLERY });
    scene.render({ ...VIEW, still: null, objects: [] });

    expect(scene.hasArt()).toBe(false);
    expect(host.querySelector(".still-wire")?.textContent).toBe("NO ROOM");
  });

  it("puts one button per ViewObject in the DOM, and no more", () => {
    const { scene, host } = mount({ gallery: GALLERY });
    scene.render(VIEW);

    expect(boxes(host)).toHaveLength(VIEW.objects.length);
    expect(boxes(host).map((box) => box.dataset["object"])).toEqual(
      scene.hotspots().map((spot) => spot.object),
    );
  });

  it("swaps cleanly from art to wireframe when the room changes", () => {
    const { scene, host } = mount({ gallery: GALLERY });
    scene.render(VIEW);
    scene.render({ ...VIEW, still: "still:unpainted" });

    expect(scene.hasArt()).toBe(false);
    expect(host.querySelector<HTMLElement>(".still")?.hidden).toBe(true);
    expect(host.querySelector<HTMLElement>(".still-wire")?.hidden).toBe(false);
    // Still 1:1: nothing left over from the previous draw.
    expect(boxes(host)).toHaveLength(VIEW.objects.length);
  });
});

describe("H104 · the free tap changes no state", () => {
  const CARD: RoomCard = {
    id: "room:crossing",
    tier: "T0",
    still: "still:crossing",
    line: "The portal is cold and has been for a long time.",
    doors: [
      { id: "door:down", sense: "A draught, and further down, water." },
      { id: "door:on", sense: "Tallow smoke." },
    ],
    objects: {
      portal: {
        tap: "Dead stone in a dead ring.",
        actions: {
          reach: [
            {
              say: "The ring takes the skin off two knuckles.",
              set: ["flag:touched-the-ring", "knowledge:the-ring-is-dead"],
              give: [{ id: "item:ring-flake", keep: "kept" }],
              adjust: { hp: -2, tithes: 3 },
              journal: "Put a hand in the ring. It was cold.",
            },
          ],
        },
      },
    },
  };

  /** A real state, somewhere a fresh run is not: both ledgers written, a bar
   *  moved, a door walked, the Descent's stream off draw 0. */
  function midPush(): GameState {
    const opened = newRun(8_191, { version: 1, start: "room:crossing" });
    const touched = resolve(opened, CARD, { object: "portal", action: "reach" }).state;
    const walked = descend(touched.run, CARD, "door:down", ["room:stair", "room:cistern"]);
    if (walked === null) throw new Error("fixture: the door did not open");
    return { ...touched, run: walked };
  }

  it("taps everything, twice, and changes nothing — deep-clone proven", () => {
    const state = midPush();
    const derived = viewOf(state);
    const shown: GameView = { ...derived, still: VIEW.still, objects: VIEW.objects };

    const stateBefore = structuredClone(state);
    const viewBefore = structuredClone(shown);

    const { scene, host, select } = mount({ gallery: GALLERY });
    scene.render(shown);
    for (let round = 0; round < 2; round++) {
      for (const box of boxes(host)) box.click();
      // A tap on nothing, too: the background deselects.
      host.querySelector<HTMLElement>(".scene")?.click();
      scene.render(shown);
    }

    // The taps LANDED — this is not a test that quietly clicked nothing.
    expect(select.mock.calls).toEqual([
      ["portal"], ["sconce"], ["boards"], [null],
      ["portal"], ["sconce"], ["boards"], [null],
    ]);

    // "Tap is free, always — describes, selects, surfaces actions; never
    // advances, costs, or harms" (DESIGN §the descent). Nothing this file
    // touches is a state, and here is the proof at the value level.
    expect(state).toEqual(stateBefore);
    expect(shown).toEqual(viewBefore);
    // And the picture the engine derives from that state is the same picture.
    expect(viewOf(state)).toEqual(derived);
  });

  it("selects the object it was given, and nothing else", () => {
    const { scene, host, select } = mount({ gallery: GALLERY });
    scene.render(VIEW);

    boxes(host)[0]?.click();

    // Selecting is a free tap held in the shell (H105 snaps the panel to
    // ACTIONS). No act, no intent, no engine call — this handler takes an id.
    expect(select).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledWith("portal");
  });

  it("deselects on a tap on nothing, without also selecting a thing", () => {
    const { scene, host, select } = mount({ gallery: GALLERY });
    scene.render(VIEW);

    host.querySelector<HTMLElement>(".scene")?.click();

    expect(select).toHaveBeenCalledTimes(1);
    expect(select).toHaveBeenCalledWith(null);
  });

  it("does not deselect behind a tap on a thing", () => {
    const { scene, host, select } = mount({ gallery: GALLERY });
    scene.render(VIEW);

    boxes(host)[1]?.click();

    // One answer per tap. A hotspot that let the background listener fire after
    // it would select and immediately deselect.
    expect(select.mock.calls).toEqual([["sconce"]]);
  });
});
