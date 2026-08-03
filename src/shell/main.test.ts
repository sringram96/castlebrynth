// @vitest-environment jsdom
//
// H101 · the frame, mounted.
//
// The card's DONE WHEN is a phone viewport with `npm run dev`, and that is a
// human's check — a screenshot, not an assertion. What is worth freezing here
// is the STRUCTURE that check looked at, because every later shell card renders
// into it: two regions, the writing inside the stage, and an entry that fails
// quietly instead of throwing into a blank page.
//
// Layout is NOT asserted. jsdom computes no geometry — every box is 0×0 — so a
// test that claimed "the panel is the bottom 38%" here would be asserting the
// CSS text, not the layout. That belongs to the playtester's screenshots
// (AGENTS.md), and shell.css says the fraction in one place so there is one
// thing for them to look at.
import { beforeEach, describe, expect, it } from "vitest";
import { APP_ID, boot, mountFrame } from "./main";
import type { GameView } from "../core/types";

function host(): HTMLElement {
  const node = document.createElement("div");
  node.id = APP_ID;
  document.body.replaceChildren(node);
  return node;
}

beforeEach(() => {
  document.body.replaceChildren();
});

describe("H101 · the frame", () => {
  it("mounts the design's two regions, and the writing inside the stage", () => {
    const frame = mountFrame(host());

    // DESIGN §frame: a full-bleed still, and a fixed bottom panel. Two.
    expect(frame.root.children).toHaveLength(2);
    expect(frame.root.children[0]).toBe(frame.stage);
    expect(frame.root.children[1]).toBe(frame.panel);

    // "1–2 lines of writing ON TOP" — over the art, so inside the stage. A
    // sibling of the stage would be a third region and a different design.
    expect(frame.lines.parentElement).toBe(frame.stage);
  });

  it("opens empty, and says so rather than looking finished", () => {
    const frame = mountFrame(host());

    // Each region carries its OWN wireframe mark, cleared by the card that
    // fills it. One shared class would let the first card to land claim the
    // other's region as finished.
    expect(frame.stage.classList.contains("stage--empty")).toBe(true);
    expect(frame.panel.classList.contains("panel--empty")).toBe(true);
    expect(frame.stage.textContent).toBe("");
    expect(frame.panel.children).toHaveLength(0);
  });

  it("is idempotent: two boots leave one frame, not two panels on one thumb", () => {
    const node = host();
    mountFrame(node);
    const second = mountFrame(node);

    expect(node.children).toHaveLength(1);
    expect(node.children[0]).toBe(second.root);
    expect(node.querySelectorAll(".panel")).toHaveLength(1);
  });

  it("builds from the host's own document, never a global one", () => {
    const other = document.implementation.createHTMLDocument("other");
    const node = other.createElement("div");
    other.body.append(node);

    const frame = mountFrame(node);

    expect(frame.root.ownerDocument).toBe(other);
    expect(document.querySelector(".frame")).toBeNull();
  });

  it("boots to nothing when there is no host, instead of throwing", () => {
    expect(boot(document)).toBeNull();
    expect(document.querySelector(".frame")).toBeNull();
  });

  it("boots into the host index.html reserves", () => {
    host();
    const shell = boot(document);

    expect(shell).not.toBeNull();
    expect(document.getElementById(APP_ID)?.firstElementChild).toBe(shell?.frame.root);
  });

  it("draws the still, the writing and the panel from ONE view (H104)", () => {
    host();
    const shell = boot(document, { measure: () => ({ width: 390, height: 523 }) });
    if (shell === null) throw new Error("expected a shell");

    const view: GameView = {
      still: "still:crossing",
      lines: ["The portal is cold.", "Something dripped, once."],
      objects: [{ id: "portal", label: "the dead ring", actions: [] }],
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
    shell.render(view);

    // One call, three regions: there is no state of the world in which the
    // strip has been updated and the art has not.
    expect(shell.frame.stage.classList.contains("stage--empty")).toBe(false);
    expect(shell.frame.lines.textContent).toBe("The portal is cold. Something dripped, once.");
    expect(shell.scene.hotspots()).toHaveLength(1);
    expect(document.querySelector("[data-cell='depth'] .strip-value")?.textContent).toBe("2");

    // A tap on the art selects, and the panel snaps to ACTIONS (H105) — the
    // whole route runs through the shell without asking the engine anything.
    shell.panel.show("ITEMS");
    document.querySelector<HTMLButtonElement>(".hotspot")?.click();
    expect(shell.panel.selection()).toBe("portal");
    expect(shell.panel.page()).toBe("ACTIONS");
  });

  it("boots with the panel already in the frame, strip and all (H105)", () => {
    host();
    const shell = boot(document);

    // The permanent strip is permanent from the first frame of the boot, before
    // there is any state to put in it (.llm/rules/ui.md).
    expect(shell?.frame.panel.contains(shell.panel.element)).toBe(true);
    expect(document.querySelectorAll(".strip-cell")).toHaveLength(5);
    expect(shell?.frame.panel.classList.contains("panel--empty")).toBe(false);
    // The stage is still a wireframe: H104 has not landed.
    expect(shell?.frame.stage.classList.contains("stage--empty")).toBe(true);
  });
});
