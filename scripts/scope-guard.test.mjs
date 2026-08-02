// Fixtures for scope-guard (H210). Both directions must hold: a PR
// touching an undeclared file FAILS, a conforming PR PASSES.
//
// This lives beside the script, not under src/ — src/ is engine code
// and this is factory tooling. `npm run law` runs `vitest run src`, so
// it does NOT run this file; .github/workflows/scope.yml runs
// `npx vitest run scripts` on every pull request, immediately before
// it runs the guard itself.
import { describe, expect, test } from "vitest";
import { checkScope, covers, formatReport, normalizeEntry, parseTaskId } from "./scope-guard.mjs";

const CONFORMING_BODY = `Task: H210
Scope:
- .github/workflows
- scripts/scope-guard.mjs
- AGENTS.md

Built the scope guard.

Rules obeyed:
- .llm/rules/README.md
`;

describe("a conforming PR passes", () => {
  test("every changed file sits inside the declared scope", () => {
    const result = checkScope({
      body: CONFORMING_BODY,
      files: [".github/workflows/scope.yml", "scripts/scope-guard.mjs", "AGENTS.md"],
    });
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.taskId).toBe("H210");
    expect(formatReport(result, [])).toMatch(/PASS/);
  });

  test("a directory entry covers files at any depth beneath it", () => {
    const result = checkScope({
      body: CONFORMING_BODY,
      files: [".github/workflows/nested/deep/thing.yml"],
    });
    expect(result.ok).toBe(true);
  });

  test("the scope block stops before a later bullet list", () => {
    const result = checkScope({ body: CONFORMING_BODY, files: [] });
    expect(result.scope).toEqual([".github/workflows", "scripts/scope-guard.mjs", "AGENTS.md"]);
  });
});

describe("a PR touching an undeclared file fails", () => {
  test("the offending file is named, and only it", () => {
    const result = checkScope({
      body: CONFORMING_BODY,
      files: ["scripts/scope-guard.mjs", "src/core/index.ts"],
    });
    expect(result.ok).toBe(false);
    expect(result.uncovered).toEqual(["src/core/index.ts"]);
    const report = formatReport(result, ["scripts/scope-guard.mjs", "src/core/index.ts"]);
    expect(report).toContain("src/core/index.ts");
    expect(report).toContain("not covered by any `Scope:` entry");
    expect(report).not.toContain("`scripts/scope-guard.mjs` is not covered");
  });

  test("a sibling that merely shares a prefix is not covered", () => {
    expect(covers("scripts/scope", "scripts/scope-guard.mjs")).toBe(false);
    expect(covers("scripts", "scripts/scope-guard.mjs")).toBe(true);
    expect(covers("scripts/scope-guard.mjs", "scripts/scope-guard.mjs")).toBe(true);
  });

  test("a file entry does not cover its neighbours", () => {
    const result = checkScope({
      body: CONFORMING_BODY,
      files: ["scripts/scope-guard.test.mjs"],
    });
    expect(result.ok).toBe(false);
    expect(result.uncovered).toEqual(["scripts/scope-guard.test.mjs"]);
  });
});

describe("the body itself must be well formed", () => {
  test("no Task: line", () => {
    const result = checkScope({ body: "Scope:\n- AGENTS.md\n", files: ["AGENTS.md"] });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("no `Task: <ID>` line");
  });

  test("malformed task id", () => {
    const result = checkScope({ body: "Task: whoops\nScope:\n- AGENTS.md\n", files: ["AGENTS.md"] });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("expected exactly one task id");
  });

  test("no Scope: block", () => {
    const result = checkScope({ body: "Task: H210\n\nbuilt a thing\n", files: ["AGENTS.md"] });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("no `Scope:` block");
  });

  test("an empty Scope: block", () => {
    const result = checkScope({ body: "Task: H210\nScope:\n\nbuilt a thing\n", files: ["AGENTS.md"] });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain("lists no paths");
  });

  test("an empty PR body fails on both counts", () => {
    const result = checkScope({ body: "", files: ["AGENTS.md"] });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  test("ids may be short or long", () => {
    expect(parseTaskId("Task: V7").id).toBe("V7");
    expect(parseTaskId("Task: `H000`").id).toBe("H000");
  });
});

describe("path-escape tricks are rejected", () => {
  test.each([
    ["../secrets", "may not escape"],
    ["scripts/../../etc", "may not escape"],
    ["/etc/passwd", "absolute paths are not allowed"],
    ["src/**", "globs are not supported"],
    ["src/*.ts", "globs are not supported"],
    ["scripts\\win", "backslashes are not allowed"],
    [".", "the whole repo"],
  ])("%s is rejected", (entry, because) => {
    const rejected = normalizeEntry(entry);
    expect(rejected.ok).toBe(false);
    expect(rejected.reason).toContain(because);
  });

  test("a rejected entry fails the whole PR rather than being ignored", () => {
    const result = checkScope({ body: "Task: H210\nScope:\n- ../etc\n", files: ["AGENTS.md"] });
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("may not escape");
  });

  test("harmless decoration is tolerated", () => {
    expect(normalizeEntry("`./scripts/`").value).toBe("scripts");
    expect(normalizeEntry("- scripts/x.mjs,".replace("- ", "")).value).toBe("scripts/x.mjs");
  });
});
