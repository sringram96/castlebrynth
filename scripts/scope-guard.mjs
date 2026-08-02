#!/usr/bin/env node
// scope-guard (H210) — scope enforcement, mechanical.
//
// Reads a PR body and the list of files that PR changes, and fails if
// the body does not declare a task id and a scope, or if a changed
// file falls outside the declared scope.
//
// Plain Node ESM. No dependencies. Nothing here touches the network,
// the filesystem (beyond an explicit --*-file), or git — the caller
// supplies both inputs, so the same code runs in CI and locally.
//
// The PR body must contain, verbatim:
//
//     Task: H210
//     Scope:
//     - .github/workflows
//     - scripts/scope-guard.mjs
//
// How a `Scope:` entry matches a changed file (this is the contract;
// it is reprinted on every failure so a worker can self-correct):
//
//   - an entry naming a file matches that one file, exactly;
//   - an entry naming a directory covers every file beneath it, at
//     any depth, on a path-segment boundary — `.github/workflows`
//     covers `.github/workflows/ci.yml`, `scripts/scope` covers
//     nothing;
//   - entries are repo-relative and forward-slashed; `..`, absolute
//     paths, backslashes, globs and `.` are rejected outright.
//
// Usage:
//   gh api "repos/$REPO/pulls/$PR/files" --paginate --jq '.[].filename' \
//     | node scripts/scope-guard.mjs --body-env PR_BODY
//   node scripts/scope-guard.mjs --body-file body.md --files-file changed.txt
//
// Exit codes: 0 pass, 1 scope violation, 2 usage error.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const TASK_ID = /^[A-Z]{1,4}[0-9]{1,4}$/;
const BULLET = /^[ \t]*[-*][ \t]+(.+?)[ \t]*$/;

export const MATCHING_RULES = [
  "a `Scope:` entry naming a file matches that file exactly",
  "a `Scope:` entry naming a directory covers every file beneath it, at any depth",
  "entries are repo-relative and forward-slashed; `..`, absolute paths and globs are rejected",
];

/** Strip decoration a human might wrap a path in. */
function clean(raw) {
  return raw
    .trim()
    .replace(/[,;]+$/, "")
    .replace(/^[`'"]+/, "")
    .replace(/[`'"]+$/, "")
    .trim();
}

/** Pull the `Task: <ID>` line out of the body. */
export function parseTaskId(body) {
  const m = /^[ \t]*Task:[ \t]*(.*)$/m.exec(body ?? "");
  if (!m) {
    return {
      ok: false,
      reason: "the PR body has no `Task: <ID>` line (expected e.g. `Task: H210`)",
    };
  }
  const id = clean(m[1]);
  if (!TASK_ID.test(id)) {
    return {
      ok: false,
      reason: id
        ? `the \`Task:\` line reads "${id}" — expected exactly one task id, e.g. \`Task: H210\``
        : "the `Task:` line is empty — expected e.g. `Task: H210`",
    };
  }
  return { ok: true, id };
}

/**
 * Pull the `Scope:` block out of the body. The block starts at a line
 * that is exactly `Scope:` and runs over the bullet lines beneath it,
 * ending at the first line that is not a bullet (a blank line ends it,
 * so a later bullet list — "rules obeyed", say — is never swallowed).
 */
export function parseScopeBlock(body) {
  const lines = (body ?? "").split(/\r?\n/);
  const start = lines.findIndex((l) => /^[ \t]*Scope:/.test(l));
  if (start === -1) {
    return {
      ok: false,
      reason: "the PR body has no `Scope:` block listing the paths this task may touch",
    };
  }
  const trailing = clean(/^[ \t]*Scope:[ \t]*(.*)$/.exec(lines[start])[1]);
  if (trailing) {
    return {
      ok: false,
      reason:
        `the \`Scope:\` line carries trailing text ("${trailing}") — it must read ` +
        "`Scope:` alone, with one `- path` bullet per line beneath it",
    };
  }
  const entries = [];
  for (let i = start + 1; i < lines.length; i++) {
    const bullet = BULLET.exec(lines[i]);
    if (!bullet) break;
    entries.push(bullet[1]);
  }
  if (entries.length === 0) {
    return {
      ok: false,
      reason: "the `Scope:` block lists no paths — expected one `- path` bullet per line beneath it",
    };
  }
  return { ok: true, entries };
}

/** Normalise one scope entry, rejecting anything ambiguous or escaping. */
export function normalizeEntry(raw) {
  const entry = clean(raw);
  const bad = (why) => ({ ok: false, reason: `scope entry \`${raw.trim()}\`: ${why}` });
  if (!entry) return bad("empty path");
  if (entry.includes("\\")) return bad("backslashes are not allowed — use forward slashes");
  if (/[*?[\]{}]/.test(entry)) {
    return bad("globs are not supported — name the directory itself, it covers everything beneath it");
  }
  if (entry.startsWith("/") || /^[A-Za-z]:/.test(entry)) {
    return bad("absolute paths are not allowed — scope entries are repo-relative");
  }
  if (entry === "." || entry === "./") {
    return bad("`.` (the whole repo) is not a scope — list the paths the task actually touches");
  }
  const value = entry.replace(/^\.\//, "").replace(/\/+$/, "");
  const segments = value.split("/");
  if (segments.includes("..")) return bad("`..` is not allowed — scope entries may not escape the repo");
  if (segments.some((s) => s === "" || s === ".")) return bad("malformed path");
  return { ok: true, value };
}

/** Normalise a changed-file path as reported by git or the GitHub API. */
export function normalizeFile(raw) {
  return raw.trim().replace(/^\.\//, "").replace(/\/+$/, "");
}

/** A file is covered by an entry if it IS the entry, or lives beneath it. */
export function covers(entry, file) {
  return file === entry || file.startsWith(entry + "/");
}

/**
 * The whole decision. `files` is the list of paths the PR changes.
 * Returns { ok, taskId, scope, uncovered, errors }.
 */
export function checkScope({ body, files }) {
  const errors = [];
  const changed = (files ?? []).map(normalizeFile).filter(Boolean);

  const task = parseTaskId(body);
  if (!task.ok) errors.push(task.reason);

  const block = parseScopeBlock(body);
  const scope = [];
  if (!block.ok) {
    errors.push(block.reason);
  } else {
    for (const raw of block.entries) {
      const entry = normalizeEntry(raw);
      if (entry.ok) scope.push(entry.value);
      else errors.push(entry.reason);
    }
  }

  const uncovered =
    scope.length > 0 ? changed.filter((f) => !scope.some((e) => covers(e, f))) : [];
  for (const file of uncovered) {
    errors.push(`changed file \`${file}\` is not covered by any \`Scope:\` entry`);
  }
  if (block.ok && errors.length === 0 && changed.length === 0) {
    errors.push("the PR changes no files — nothing to check, and nothing to land");
  }

  return { ok: errors.length === 0, taskId: task.ok ? task.id : null, scope, uncovered, errors };
}

/** Human-facing report. Failure names every offending file and why. */
export function formatReport(result, changed = []) {
  const out = [];
  if (result.ok) {
    out.push(`scope-guard: PASS — ${result.taskId}, ${changed.length} file(s) within the declared scope.`);
    const unused = result.scope.filter((e) => !changed.some((f) => covers(e, normalizeFile(f))));
    if (unused.length) out.push(`  note: declared but untouched: ${unused.join(", ")}`);
    return out.join("\n");
  }
  out.push("scope-guard: FAIL");
  out.push("");
  for (const err of result.errors) out.push(`  - ${err}`);
  out.push("");
  if (result.scope.length) {
    out.push("Declared scope (from the PR body):");
    for (const entry of result.scope) out.push(`  - ${entry}`);
    out.push("");
  }
  out.push("How a `Scope:` entry matches:");
  for (const rule of MATCHING_RULES) out.push(`  - ${rule}`);
  out.push("");
  out.push("The PR body must begin with, verbatim:");
  out.push("");
  out.push("  Task: <ID>");
  out.push("  Scope:");
  out.push("  - <path>");
  out.push("  - <path>");
  out.push("");
  out.push("`Scope:` is copied from the Asana task's SCOPE. If a changed file is");
  out.push("not in the task's SCOPE, do not widen the PR body — the change belongs");
  out.push("to a different task.");
  return out.join("\n");
}

// ---------------------------------------------------------------- CLI

function usage(message) {
  console.error(`scope-guard: ${message}`);
  console.error("usage: scope-guard.mjs [--body-env NAME | --body-file PATH] [--files-file PATH]");
  console.error("       changed files are read from stdin when --files-file is absent");
  process.exit(2);
}

async function readStdin() {
  if (process.stdin.isTTY) return "";
  let text = "";
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

export async function main(argv) {
  let bodyEnv = null;
  let bodyFile = null;
  let filesFile = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--body-env") bodyEnv = argv[++i];
    else if (arg === "--body-file") bodyFile = argv[++i];
    else if (arg === "--files-file") filesFile = argv[++i];
    else usage(`unknown argument "${arg}"`);
  }
  if (bodyEnv && bodyFile) usage("pass --body-env or --body-file, not both");
  if (!bodyEnv && !bodyFile) bodyEnv = "PR_BODY";

  // The PR body is untrusted text from a contributor: it is read from
  // the environment or a file, never interpolated into a shell.
  let body;
  if (bodyFile) {
    try {
      body = readFileSync(bodyFile, "utf8");
    } catch {
      usage(`cannot read --body-file ${bodyFile}`);
    }
  } else {
    body = process.env[bodyEnv];
    if (body === undefined) usage(`environment variable ${bodyEnv} is not set`);
  }

  let filesText;
  if (filesFile) {
    try {
      filesText = readFileSync(filesFile, "utf8");
    } catch {
      usage(`cannot read --files-file ${filesFile}`);
    }
  } else {
    filesText = await readStdin();
  }
  const files = filesText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const result = checkScope({ body, files });
  const report = formatReport(result, files);
  if (result.ok) console.log(report);
  else console.error(report);
  process.exit(result.ok ? 0 : 1);
}

const invoked = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invoked) await main(process.argv.slice(2));
