// castlebrynth · the panel — three pages over one permanent strip. (H105)
//
// DESIGN §frame: "fixed bottom panel paged ◂ ACTIONS · SKILLS · ITEMS ▸ over a
// permanent strip (HP · Might · Will · ◎ tithes · depth)". Every clause of that
// sentence is a law here, and .llm/rules/ui.md adds the one that binds them:
// "Nothing collapses or hides: the strip is always visible; panes page, never
// stack."
//
// ─────────────────────────────────────────────────────── nothing collapses ──
//
// Said three ways, because "collapse" has three spellings and only one of them
// looks like a bug:
//
//   the STRIP    is built once and never removed, re-created or emptied. It is
//                re-rendered in place, on every page, in every state.
//   the PAGER    always carries all three labels. A page that has nothing in it
//                is still reachable and still says its own name; it does not
//                grey out and it does not disappear from the strip of labels.
//   the PAGE     keeps the panel's height when it is empty, and says what is
//                empty in words. A panel that shrank when a page emptied would
//                move every control under the thumb that was reaching for it.
//
// ───────────────────────────────────────────────── this file changes nothing ──
//
// Paging and selecting are FREE TAPS: "Paging ◂ ACTIONS · SKILLS · ITEMS ▸ and
// selecting an object are free taps, so the shell does both without asking the
// engine and therefore without mutating anything" (types.ts `GameView.panel`).
// So the page and the selection are held HERE, in the shell, and neither one
// has a route to a state. The only thing in this file that can change anything
// is `handlers.act`, and it is reached by pressing a named action — never by
// paging, never by selecting, never by rendering.
//
// ────────────────────────────────────────────────────── no sanity, anywhere ──
//
// `Strip` (types.ts) has five fields and none of them is sanity, and this file
// renders the five. "No sanity bar exists anywhere" (DESIGN §frame) therefore
// costs nothing to keep: there is nothing here to draw it with. The vignette is
// the stage's (H104), not the panel's — .llm/rules/ui.md: it "never occludes
// the panel".
//
// NO THEME. H102 is paused past H180; the panel's look is wireframe, in
// shell.css, and meant to be deleted rather than tuned.

import type { ActionOption, GameView, Id, Intent, Pool, Strip } from "../core/types";

/**
 * The three pages, in the order DESIGN §frame writes them. The order is what
 * ◂ and ▸ walk, so it is data and not three branches.
 */
export const PAGES = ["ACTIONS", "SKILLS", "ITEMS"] as const;

export type Page = (typeof PAGES)[number];

/** The page a selection snaps to, and the page the panel opens on. */
export const HOME: Page = "ACTIONS";

export interface PanelHandlers {
  /**
   * An act, addressed. The ONE thing in this panel that may change a state, and
   * it is reached only by pressing a named action (DESIGN §the descent: "Named
   * investigation actions ... carry the risk").
   */
  readonly act: (intent: Intent) => void;
}

export interface Panel {
  /** The element this panel owns, inside the frame's panel region. */
  readonly element: HTMLElement;
  /** Draw this view. Total: any view, any page, any selection. */
  render(view: GameView): void;
  /** Which page is showing. */
  page(): Page;
  /** Turn to a page directly (the labels are tappable too). */
  show(page: Page): void;
  /** ◂ (-1) and ▸ (+1). Wraps — see `turn`. */
  turn(by: 1 | -1): void;
  /** What is selected, or null for the room itself. */
  selection(): Id | null;
  /**
   * Select an object, or clear it with null. SNAPS TO ACTIONS — see `select`.
   * A free tap: nothing is asked of the engine.
   */
  select(object: Id | null): void;
}

// ────────────────────────────────────────────────────────────── the strip ──

/** A pool, as the strip says it. `current/max`, uniformly: `Strip` makes no
 *  distinction between the bar and the two stats, and inventing one here would
 *  be the panel deciding what a Pool means. */
const poolText = (pool: Pool): string => `${pool.current}/${pool.max}`;

/** The five fields of `Strip`, in DESIGN §frame's order, with the glyphs that
 *  sentence uses. A sixth entry is not a widening of the strip — it would be a
 *  field on `Strip`, and there is no field to add. */
const STRIP_CELLS: readonly {
  readonly key: string;
  readonly label: string;
  readonly read: (strip: Strip) => string;
}[] = [
  { key: "hp", label: "HP", read: (s) => poolText(s.hp) },
  { key: "might", label: "MIGHT", read: (s) => poolText(s.might) },
  { key: "will", label: "WILL", read: (s) => poolText(s.will) },
  { key: "tithes", label: "◎", read: (s) => String(s.tithes) },
  { key: "depth", label: "DEPTH", read: (s) => String(s.depth) },
];

// ───────────────────────────────────────────────────────────── the panel ──

function element(owner: Document, tag: string, className: string): HTMLElement {
  const node = owner.createElement(tag);
  node.className = className;
  return node;
}

function button(owner: Document, className: string, label: string): HTMLButtonElement {
  const node = owner.createElement("button");
  node.className = className;
  node.type = "button";
  node.textContent = label;
  return node;
}

/**
 * Build the panel into `host` — the frame's panel region (main.ts `Frame`).
 *
 * The DOM is built ONCE and re-rendered in place. Not a performance choice: it
 * is how "nothing collapses" is kept honest. A panel that rebuilt itself each
 * frame could drop the strip on a state nobody tested, and nobody would notice
 * until a player was reading an empty bar mid-fight. Here there is no code path
 * that removes it, because the only thing that ever changes is text.
 */
export function mountPanel(host: HTMLElement, handlers: PanelHandlers): Panel {
  const owner = host.ownerDocument;

  const element_ = element(owner, "div", "panel-body");

  // ── the paged region: pager, then the page. Over the strip.
  const pages = element(owner, "div", "panel-pages");
  const pager = element(owner, "nav", "pager");
  pager.setAttribute("aria-label", "pages");

  const back = button(owner, "pager-arrow", "◂");
  const forward = button(owner, "pager-arrow", "▸");
  back.setAttribute("aria-label", "previous page");
  forward.setAttribute("aria-label", "next page");

  const tabs = element(owner, "div", "pager-tabs");
  const tabOf = new Map<Page, HTMLButtonElement>();
  for (const name of PAGES) {
    const tab = button(owner, "pager-tab", name);
    tab.dataset["page"] = name;
    tab.addEventListener("click", () => show(name));
    tabOf.set(name, tab);
    tabs.append(tab);
  }

  pager.append(back, tabs, forward);

  const page = element(owner, "div", "page");
  // The page is a live region: turning a page or selecting a thing changes what
  // is under the thumb without the thumb having moved.
  page.setAttribute("aria-live", "polite");

  // What the ACTIONS page is showing the actions OF. Always present, so the
  // page's height does not change when a selection arrives.
  const subject = element(owner, "p", "page-subject");
  const options = element(owner, "ul", "page-options");
  const empty = element(owner, "p", "page-empty");
  page.append(subject, options, empty);
  pages.append(pager, page);

  // ── the permanent strip. Built once; never removed, never emptied.
  const strip = element(owner, "div", "strip");
  strip.setAttribute("aria-label", "condition");
  const stripValue = new Map<string, HTMLElement>();
  for (const cell of STRIP_CELLS) {
    const box = element(owner, "div", "strip-cell");
    box.dataset["cell"] = cell.key;
    const label = element(owner, "span", "strip-label");
    label.textContent = cell.label;
    const value = element(owner, "span", "strip-value");
    box.append(label, value);
    stripValue.set(cell.key, value);
    strip.append(box);
  }

  element_.append(pages, strip);
  host.replaceChildren(element_);

  // ── the shell's own two pieces of state. Neither reaches the engine.
  let showing: Page = HOME;
  let selected: Id | null = null;
  let shown: GameView | null = null;

  /**
   * What the ACTIONS page offers right now.
   *
   * Nothing selected → the room's own actions (`PanelView.actions`, which
   * types.ts defines as "offered when nothing is selected"). Something
   * selected → that object's named investigation actions.
   *
   * A SELECTION THAT IS NO LONGER IN THE VIEW OFFERS NOTHING. An object can
   * leave a room (`removeObject`, with a cause), and continuing to offer the
   * actions of a thing that is gone would let a player act on it. The selection
   * is dropped by `render` instead — see below.
   */
  function actionsNow(view: GameView): readonly ActionOption[] {
    if (selected === null) return view.panel.actions;
    return view.objects.find((object) => object.id === selected)?.actions ?? [];
  }

  function optionsOf(view: GameView): readonly ActionOption[] {
    if (showing === "SKILLS") return view.panel.skills;
    if (showing === "ITEMS") return view.panel.items;
    return actionsNow(view);
  }

  /** What the page says when it has nothing in it. It SAYS it: an empty page is
   *  still a page, and it keeps its place (see the header). */
  function emptyText(): string {
    if (showing === "SKILLS") return "No skills.";
    if (showing === "ITEMS") return "Nothing carried.";
    return selected === null ? "Nothing to do here." : "Nothing to do with this.";
  }

  function subjectOf(view: GameView): string {
    if (showing !== "ACTIONS" || selected === null) return "";
    return view.objects.find((object) => object.id === selected)?.label ?? "";
  }

  function draw(): void {
    const view = shown;

    for (const [name, tab] of tabOf) {
      const current = name === showing;
      tab.classList.toggle("pager-tab--on", current);
      // The pager is a set of tabs to anything that is not a thumb.
      tab.setAttribute("aria-current", current ? "page" : "false");
    }

    // THE STRIP, ALWAYS. Before any view has arrived it shows the dashes of a
    // strip with nothing to say — never an absent strip.
    for (const cell of STRIP_CELLS) {
      const value = stripValue.get(cell.key);
      if (value !== undefined) value.textContent = view === null ? "—" : cell.read(view.strip);
    }

    if (view === null) {
      subject.textContent = "";
      options.replaceChildren();
      empty.textContent = "";
      return;
    }

    subject.textContent = subjectOf(view);
    empty.textContent = "";

    const offered = optionsOf(view);
    if (offered.length === 0) {
      options.replaceChildren();
      empty.textContent = emptyText();
      return;
    }

    const rows = offered.map((option) => {
      const row = owner.createElement("li");
      row.className = "page-option";
      const press = button(owner, "option-press", option.label);
      press.dataset["object"] = option.intent.object;
      press.dataset["action"] = option.intent.action;
      // The one route out of this file that changes anything.
      press.addEventListener("click", () => handlers.act(option.intent));
      row.append(press);
      return row;
    });
    options.replaceChildren(...rows);
  }

  function show(next: Page): void {
    showing = next;
    draw();
  }

  /**
   * ◂ and ▸. WRAPS, deliberately.
   *
   * Three pages and two arrows: at either end one arrow would otherwise be a
   * control that looks pressable and does nothing, which under one-thumb
   * portrait reads as a broken frame rather than as an edge. Wrapping is a
   * shell decision and not a claim about DESIGN §frame — the design's sentence
   * is satisfied either way, and reversing this changes one modulo.
   */
  function turn(by: 1 | -1): void {
    const at = PAGES.indexOf(showing);
    show(PAGES[(at + by + PAGES.length) % PAGES.length] as Page);
  }

  back.addEventListener("click", () => turn(-1));
  forward.addEventListener("click", () => turn(1));

  // Drawn once at mount, before any state exists. The strip must be readable on
  // the first frame of a boot — a strip that only appears once a view has
  // arrived is a strip that is absent every time the game opens.
  draw();

  /**
   * SELECT SNAPS TO ACTIONS.
   *
   * A tap on a thing is a question — "what can I do with this?" — and the
   * answer is on one page. Landing a player on ITEMS because that is where they
   * left the pager makes them page back to read the answer to the question they
   * just asked.
   *
   * Clearing a selection (null) snaps too: the room's own actions are on the
   * same page, and the rule is easier to hold as "selecting shows ACTIONS" than
   * as "selecting sometimes shows ACTIONS".
   *
   * A FREE TAP. Nothing is asked of the engine and nothing is written.
   */
  function select(object: Id | null): void {
    selected = object;
    showing = HOME;
    draw();
  }

  return {
    element: element_,
    render(view: GameView): void {
      shown = view;
      // A selection outlives a re-render only while the thing is still in the
      // room. When it goes — `removeObject`, with a cause — the panel falls
      // back to the room rather than offering the actions of something absent.
      if (selected !== null && !view.objects.some((object) => object.id === selected)) {
        selected = null;
      }
      draw();
    },
    page: () => showing,
    show,
    turn,
    selection: () => selected,
    select,
  };
}
