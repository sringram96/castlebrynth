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

    expect(frame.root.classList.contains("frame--empty")).toBe(true);
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
    const frame = boot(document);

    expect(frame).not.toBeNull();
    expect(document.getElementById(APP_ID)?.firstElementChild).toBe(frame?.root);
  });
});
