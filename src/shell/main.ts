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
 * The frame opens EMPTY and says so. `frame--empty` draws the two regions as
 * labelled wireframe boxes — that is the whole visible result of this card, and
 * it is deliberately ugly: an empty frame that looked finished would be a claim
 * this card has not earned. H104 and H105 clear the class as they fill the
 * regions.
 */
export function mountFrame(host: HTMLElement): Frame {
  const owner = host.ownerDocument;
  const root = element(owner, "div", "frame frame--empty");
  const stage = element(owner, "section", "stage");
  const lines = element(owner, "p", "stage-lines");
  const panel = element(owner, "section", "panel");

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

/**
 * Start the shell.
 *
 * Separate from `mountFrame` because a test wants the frame WITHOUT the entry's
 * side effects, and the entry wants to fail quietly rather than throw into a
 * blank page: no `#app`, nothing mounted, null back.
 *
 * Everything a running game needs is wired here as the later cards land —
 * H108 restores the save, H105 renders the panel, H104 the still. Today it
 * mounts the empty frame, which is exactly what this card claims.
 */
export function boot(document_: Document): Frame | null {
  const host = document_.getElementById(APP_ID);
  return host === null ? null : mountFrame(host);
}

// The entry point. Guarded by `#app`'s existence, so importing this module in a
// jsdom test that has not built a host does nothing at all.
boot(document);
