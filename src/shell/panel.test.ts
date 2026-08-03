// @vitest-environment jsdom
//
// H105 · the panel: three pages over one permanent strip.
//
// DESIGN §frame's sentence, clause by clause — the fixed panel, the permanent
// strip (HP · Might · Will · ◎ · depth), the ◂ ▸ pager over ACTIONS · SKILLS ·
// ITEMS, and select-snaps-to-ACTIONS — plus .llm/rules/ui.md's binding rule:
// nothing collapses.
//
// Geometry is not asserted (jsdom computes none). What is asserted is what a
// collapse would look like in the DOM: an absent strip, a missing tab, an
// emptied page that says nothing. shell.css carries the sizes, and the
// playtester's screenshots carry the look (AGENTS.md).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HOME, PAGES, mountPanel } from "./panel";
import type { GameView, Intent } from "../core/types";
import type { Panel, PanelHandlers } from "./panel";

const VIEW: GameView = {
  still: "still:crossing",
  lines: ["The portal is cold and has been for a long time."],
  objects: [
    {
      id: "portal",
      label: "the dead ring",
      actions: [
        { intent: { object: "portal", action: "reach" }, label: "REACH IN" },
        { intent: { object: "portal", action: "peer" }, label: "PEER" },
      ],
    },
    { id: "sconce", label: "a cold sconce", actions: [] },
  ],
  panel: {
    actions: [{ intent: { object: "room", action: "listen" }, label: "LISTEN" }],
    skills: [{ intent: { object: "skill:steady", action: "use" }, label: "STEADY HAND" }],
    items: [{ intent: { object: "item:knife", action: "use" }, label: "rusted knife" }],
  },
  strip: {
    hp: { current: 8, max: 10 },
    might: { current: 3, max: 3 },
    will: { current: 2, max: 4 },
    tithes: 17,
    depth: 2,
  },
  vignette: 0.4,
};

/** A view with a page emptied, to prove an empty page is still a page. */
const BARE: GameView = { ...VIEW, panel: { actions: [], skills: [], items: [] } };

function mount(handlers?: Partial<PanelHandlers>): {
  panel: Panel;
  host: HTMLElement;
  act: ReturnType<typeof vi.fn>;
} {
  const host = document.createElement("section");
  host.className = "panel";
  document.body.replaceChildren(host);
  const act = vi.fn();
  const panel = mountPanel(host, { act: handlers?.act ?? act });
  return { panel, host, act };
}

const stripText = (host: HTMLElement): string[] =>
  [...host.querySelectorAll(".strip-cell")].map((cell) => cell.textContent ?? "");

const optionLabels = (host: HTMLElement): string[] =>
  [...host.querySelectorAll(".option-press")].map((node) => node.textContent ?? "");

const press = (host: HTMLElement, label: string): void => {
  const found = [...host.querySelectorAll<HTMLButtonElement>(".option-press")].find(
    (node) => node.textContent === label,
  );
  if (found === undefined) throw new Error(`no option "${label}"`);
  found.click();
};

const tab = (host: HTMLElement, page: string): HTMLButtonElement => {
  const found = host.querySelector<HTMLButtonElement>(`.pager-tab[data-page="${page}"]`);
  if (found === null) throw new Error(`no tab "${page}"`);
  return found;
};

beforeEach(() => {
  document.body.replaceChildren();
});

describe("H105 · the permanent strip", () => {
  it("carries DESIGN §frame's five fields, in its order", () => {
    const { panel, host } = mount();
    panel.render(VIEW);

    expect([...host.querySelectorAll(".strip-cell")].map((c) => c.getAttribute("data-cell"))).toEqual([
      "hp",
      "might",
      "will",
      "tithes",
      "depth",
    ]);
    expect(stripText(host)).toEqual(["HP8/10", "MIGHT3/3", "WILL2/4", "◎17", "DEPTH2"]);
  });

  it("is there before any view has arrived", () => {
    const { host } = mount();

    // A strip that only exists once a state does is a strip that is absent on
    // the first frame of every boot.
    expect(host.querySelectorAll(".strip-cell")).toHaveLength(5);
    expect(stripText(host).every((text) => text.endsWith("—"))).toBe(true);
  });

  it("survives every page and every selection", () => {
    const { panel, host } = mount();
    panel.render(VIEW);

    for (const page of PAGES) {
      panel.show(page);
      expect(host.querySelectorAll(".strip-cell")).toHaveLength(5);
      expect(stripText(host)[0]).toBe("HP8/10");
    }
    panel.select("portal");
    expect(stripText(host)[0]).toBe("HP8/10");
    panel.render(BARE);
    expect(host.querySelectorAll(".strip-cell")).toHaveLength(5);
  });

  it("draws no sanity, in any form", () => {
    const { panel, host } = mount();
    panel.render(VIEW);

    // DESIGN §frame: "no sanity bar exists anywhere". `Strip` has no field for
    // it, so this cannot regress by accident — but the vignette IS on the view
    // this panel is handed, and rendering it here would be the same repeal by a
    // different door.
    const rendered = host.textContent ?? "";
    expect(rendered.toLowerCase()).not.toContain("sanity");
    expect(rendered).not.toContain("0.4");
    expect(host.querySelector("[data-cell='sanity']")).toBeNull();
    expect(host.querySelector(".vignette")).toBeNull();
  });
});

describe("H105 · the pager", () => {
  it("opens on ACTIONS", () => {
    const { panel } = mount();
    expect(panel.page()).toBe(HOME);
    expect(HOME).toBe("ACTIONS");
  });

  it("always carries all three labels, and marks the one showing", () => {
    const { panel, host } = mount();
    panel.render(VIEW);

    for (const page of PAGES) {
      panel.show(page);
      // Nothing collapses: a page that is not showing is still on the pager and
      // still pressable.
      expect([...host.querySelectorAll(".pager-tab")].map((t) => t.textContent)).toEqual([
        "ACTIONS",
        "SKILLS",
        "ITEMS",
      ]);
      expect(tab(host, page).getAttribute("aria-current")).toBe("page");
      expect(tab(host, page).classList.contains("pager-tab--on")).toBe(true);
    }
  });

  it("walks ▸ and ◂ in DESIGN's order, and wraps rather than dead-ending", () => {
    const { panel, host } = mount();
    panel.render(VIEW);
    const forward = host.querySelector<HTMLButtonElement>(".pager-arrow[aria-label='next page']");
    const back = host.querySelector<HTMLButtonElement>(".pager-arrow[aria-label='previous page']");

    forward?.click();
    expect(panel.page()).toBe("SKILLS");
    forward?.click();
    expect(panel.page()).toBe("ITEMS");
    // At the end, ▸ still does something: an arrow that looks pressable and is
    // not reads as a broken frame under one thumb.
    forward?.click();
    expect(panel.page()).toBe("ACTIONS");
    back?.click();
    expect(panel.page()).toBe("ITEMS");
  });

  it("pages by pressing a label too", () => {
    const { panel, host } = mount();
    panel.render(VIEW);
    tab(host, "ITEMS").click();
    expect(panel.page()).toBe("ITEMS");
    expect(optionLabels(host)).toEqual(["rusted knife"]);
  });

  it("shows the page it is on, and only that page — panes page, never stack", () => {
    const { panel, host } = mount();
    panel.render(VIEW);
    expect(optionLabels(host)).toEqual(["LISTEN"]);
    panel.show("SKILLS");
    expect(optionLabels(host)).toEqual(["STEADY HAND"]);
    panel.show("ITEMS");
    expect(optionLabels(host)).toEqual(["rusted knife"]);
  });
});

describe("H105 · select snaps to ACTIONS", () => {
  it("snaps from SKILLS", () => {
    const { panel, host } = mount();
    panel.render(VIEW);
    panel.show("SKILLS");

    panel.select("portal");

    // The tap on a thing is a question; the answer is on ACTIONS. Landing a
    // player on the page they happened to leave the pager on makes them page
    // back to read the answer to the question they just asked.
    expect(panel.page()).toBe("ACTIONS");
    expect(optionLabels(host)).toEqual(["REACH IN", "PEER"]);
    expect(host.querySelector(".page-subject")?.textContent).toBe("the dead ring");
  });

  it("snaps from ITEMS", () => {
    const { panel } = mount();
    panel.render(VIEW);
    panel.show("ITEMS");
    panel.select("portal");
    expect(panel.page()).toBe("ACTIONS");
  });

  it("snaps when the selection is cleared, too", () => {
    const { panel, host } = mount();
    panel.render(VIEW);
    panel.select("portal");
    panel.show("ITEMS");

    panel.select(null);

    expect(panel.page()).toBe("ACTIONS");
    expect(panel.selection()).toBeNull();
    // Nothing selected → the room's own actions (types.ts `PanelView.actions`).
    expect(optionLabels(host)).toEqual(["LISTEN"]);
    expect(host.querySelector(".page-subject")?.textContent).toBe("");
  });

  it("drops a selection when the thing leaves the room", () => {
    const { panel, host } = mount();
    panel.render(VIEW);
    panel.select("portal");

    // `removeObject` fired somewhere, with a cause. The panel must not keep
    // offering the actions of a thing that is no longer there.
    panel.render({ ...VIEW, objects: VIEW.objects.filter((o) => o.id !== "portal") });

    expect(panel.selection()).toBeNull();
    expect(optionLabels(host)).toEqual(["LISTEN"]);
  });
});

describe("H105 · nothing collapses", () => {
  it("keeps an empty page, and says what is empty", () => {
    const { panel, host } = mount();
    panel.render(BARE);

    for (const [page, said] of [
      ["ACTIONS", "Nothing to do here."],
      ["SKILLS", "No skills."],
      ["ITEMS", "Nothing carried."],
    ] as const) {
      panel.show(page);
      expect(host.querySelector(".page")).not.toBeNull();
      expect(host.querySelector(".page-empty")?.textContent).toBe(said);
      // The panel is still a panel: pager, page, strip.
      expect(host.querySelector(".pager")).not.toBeNull();
      expect(host.querySelectorAll(".strip-cell")).toHaveLength(5);
    }
  });

  it("says a selected thing affords nothing, rather than showing the room's actions", () => {
    const { panel, host } = mount();
    panel.render(VIEW);
    panel.select("sconce");

    // The sconce is tappable — presence IS tappability (types.ts `ViewObject`)
    // — and affords no named action. Falling back to the room's LISTEN here
    // would offer an act the player did not address to anything.
    expect(optionLabels(host)).toEqual([]);
    expect(host.querySelector(".page-empty")?.textContent).toBe("Nothing to do with this.");
  });
});

describe("H105 · free taps change nothing", () => {
  it("pages and selects without calling the engine, and without touching the view", () => {
    const { panel, act } = mount();
    const before = structuredClone(VIEW);
    panel.render(VIEW);

    panel.turn(1);
    panel.turn(-1);
    panel.show("ITEMS");
    panel.select("portal");
    panel.select(null);
    panel.render(VIEW);

    // "Free tap NEVER mutates state" (.llm/rules/ui.md). Paging and selecting
    // are free taps — held in the shell, never asked of the engine.
    expect(act).not.toHaveBeenCalled();
    expect(VIEW).toEqual(before);
  });

  it("acts only when a named action is pressed, and passes the intent whole", () => {
    const { panel, host, act } = mount();
    panel.render(VIEW);
    panel.select("portal");

    press(host, "REACH IN");

    const expected: Intent = { object: "portal", action: "reach" };
    expect(act).toHaveBeenCalledTimes(1);
    expect(act).toHaveBeenCalledWith(expected);
  });

  it("addresses a room action to the room, not to the selection", () => {
    const { panel, host, act } = mount();
    panel.render(VIEW);
    press(host, "LISTEN");
    expect(act).toHaveBeenCalledWith({ object: "room", action: "listen" });
  });
});
