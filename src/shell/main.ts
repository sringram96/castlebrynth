// castlebrynth · the shell's bootstrap — the frame, mounted. (H101)
//
// DESIGN §frame is two regions and one law about each: a full-bleed pixel
// still with 1–2 lines of writing on top, and a FIXED bottom panel that pages
// over a permanent strip. This card builds those regions and nothing that goes
// in them — the still is H104's, the panel H105's, persistence H108's.
//
// THE FRAME IS BUILT HERE, NOT IN index.html. Two reasons, and both are about
// the tests the later cards owe: a jsdom test must be able to mount the SAME
// frame the browser mounts, and the only way to guarantee that is to have one
// function that builds it. index.html holds an empty `#app` and a script tag.
//
// NO THEME. H102 (theme + frame tokens) is paused past H180 by the skeleton
// directive. shell.css carries the two platform/asset constants law already
// demands (.llm/rules/ui.md, .llm/rules/art.md) and wireframe greys that are
// meant to be deleted, not tuned.

import { mountEnd } from "./end";
import { mountPanel } from "./panel";
import { mountScene } from "./scene";
import type { Emission } from "../core/resolve";
import type { GameView, Id } from "../core/types";
import type { EndCard } from "./end";
import type { Panel } from "./panel";
import type { Scene, SceneOptions } from "./scene";

/** The id `index.html` reserves for the shell. */
export const APP_ID = "app";

/**
 * The two regions, and the writing between them.
 *
 * Handed out as elements rather than as a class, because every later card
 * renders INTO one of them and none of them needs to own the frame. The stage
 * and the panel are the design's two regions; `lines` sits inside the stage
 * because the writing is on top of the art, not beside it.
 */
export interface Frame {
  /** The grid that holds both regions. */
  readonly root: HTMLElement;
  /** Full-bleed pixel still (H104 draws here). */
  readonly stage: HTMLElement;
  /** 1–2 lines of writing, over the art, at native resolution. */
  readonly lines: HTMLElement;
  /** Fixed bottom panel: pager over a permanent strip (H105 fills this). */
  readonly panel: HTMLElement;
}

/** Built from the HOST's own document, never from a global `document`. A shell
 *  that reached for the global would work in the browser and quietly build its
 *  frame in the wrong document under any test that mounts more than one. */
function element(owner: Document, tag: string, className: string): HTMLElement {
  const node = owner.createElement(tag);
  node.className = className;
  return node;
}

/**
 * Build the frame into `host`, replacing whatever was there.
 *
 * TOTAL and idempotent: mounting twice leaves one frame, so a boot that runs
 * after a hot reload does not stack two panels on one thumb.
 *
 * EACH REGION SAYS IT IS EMPTY UNTIL SOMETHING FILLS IT. `stage--empty` and
 * `panel--empty` draw labelled wireframe boxes, and each is cleared by the card
 * that fills that region — H104 the stage, H105 the panel. One class for both
 * would mean the first card to land silently claimed the other's region as
 * finished.
 */
export function mountFrame(host: HTMLElement): Frame {
  const owner = host.ownerDocument;
  const root = element(owner, "div", "frame");
  const stage = element(owner, "section", "stage stage--empty");
  const lines = element(owner, "p", "stage-lines");
  const panel = element(owner, "section", "panel panel--empty");

  // The regions are landmarks, not decoration: a screen reader meets the same
  // two places a thumb does.
  stage.setAttribute("aria-label", "room");
  stage.setAttribute("data-wireframe", "STAGE");
  panel.setAttribute("aria-label", "panel");
  panel.setAttribute("data-wireframe", "PANEL");

  stage.append(lines);
  root.append(stage, panel);

  host.replaceChildren(root);
  return { root, stage, lines, panel };
}

/** The shell, running: the frame, and what has been mounted into it. */
export interface Shell {
  readonly frame: Frame;
  readonly scene: Scene;
  readonly panel: Panel;
  readonly end: EndCard;
  /**
   * Draw a view. THE SHELL'S ONE DRAW CALL.
   *
   * The still, the writing over it, and the panel, from one `GameView` — so
   * there is no state of the world in which the strip has been updated and the
   * art has not. A second entry point would be a second answer to "what is on
   * screen".
   */
  render(view: GameView): void;
  /**
   * Look at what an act emitted.
   *
   * Today it reaches the end card and nothing else — `goto`, `fight`, `prompt`
   * and the object changes belong to the state loop, which is not this lane's.
   * It is here so that the layering law has ONE route: emissions in, end card
   * up, and no path from a state to this decision (end.ts).
   */
  consider(emissions: readonly Emission[]): void;
}

/** What `boot` needs from whoever owns the run. */
export interface BootOptions extends SceneOptions {
  /** Begin again from an ending. The rebirth transition is the lifecycle's, not
   *  the shell's; without one the card simply goes down. */
  readonly beginAgain?: (ending: Id) => void;
}

/**
 * Start the shell.
 *
 * Separate from `mountFrame` because a test wants the frame WITHOUT the entry's
 * side effects, and the entry wants to fail quietly rather than throw into a
 * blank page: no `#app`, nothing mounted, null back.
 *
 * Everything a running game needs is wired here as the cards land. Today: the
 * frame (H101), the panel (H105), the scene (H104) and the end card (H114).
 * There is no state loop in this lane — no bundle is loaded and no act is
 * resolved — so `act` is left as the one honest stub in this file rather than
 * given a body that pretends. It is unreachable in any case: a panel with no
 * view offers nothing to press.
 *
 * NOT WIRED YET, and each for the same missing reason. Persistence (H108,
 * storage.ts) and the fight screen (D006, fight.ts) are landed and tested, but
 * both hang off a state loop: `persisting` wraps a transition, and a fight opens
 * from a `fight` emission. Until something here produces a state, there is
 * nothing to wrap and nothing to open, so they are left unreferenced rather than
 * called from a boot that has no run behind it.
 */
export function boot(document_: Document, options: BootOptions = {}): Shell | null {
  const host = document_.getElementById(APP_ID);
  if (host === null) return null;

  const frame = mountFrame(host);
  const panel = mountPanel(frame.panel, {
    act: () => {
      /* The state loop is not this lane's. Unreachable until a view renders. */
    },
  });
  frame.panel.classList.remove("panel--empty");

  // A tap on a thing SELECTS, and the panel snaps to ACTIONS (H105). The whole
  // route from a tap on the art to an offered action runs through the shell and
  // never asks the engine anything — which is what makes the tap free.
  const scene = mountScene(frame.stage, { select: (object) => panel.select(object) }, options);

  const beginAgain = options.beginAgain;
  const end = mountEnd(frame.root, {
    beginAgain: (ending) => beginAgain?.(ending),
  });

  return {
    frame,
    scene,
    panel,
    end,
    render(view: GameView): void {
      // The stage stops being a wireframe box the moment it has something to
      // draw — and not before.
      frame.stage.classList.remove("stage--empty");
      scene.render(view);
      // 1–2 lines of writing on top (DESIGN §frame), at native resolution.
      frame.lines.textContent = view.lines.join(" ");
      panel.render(view);
    },
    consider(emissions: readonly Emission[]): void {
      end.consider(emissions);
    },
  };
}

// The entry point. Guarded by `#app`'s existence, so importing this module in a
// jsdom test that has not built a host does nothing at all.
boot(document);
