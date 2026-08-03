// RULES.md, executable. Core purity + layering.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules", "dist", "content/bundle.json", "mock"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ["**/*.ts"], rules: {} },
  {
    files: ["src/core/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{
        group: ["**/shell/**", "**/platform/**"],
        message: "core is pure — RULES.md 1"
      }]}],
      "no-restricted-globals": ["error",
        { name: "Date", message: "No clocks in core — RULES.md 2" }],
      "no-restricted-properties": ["error",
        { object: "Math", property: "random", message: "Inject RNG — RULES.md 2" }],
      "no-console": "error"
    }
  },
  {
    // D001 · DEATH MAY ONLY TOUCH THE RUN BRANCH (.llm/rules/engine.md).
    //
    // types.ts already says this with `DeathTransition`: run branch in, run
    // branch out, so death cannot be HANDED the campaign ledger. But a type
    // only binds the code that wears it — a helper in this file typed
    // `(s: GameState) => GameState`, or a signature widened in a hurry, walks
    // straight past it and DICE SURVIVE DEATH stops being law. So the rule is
    // said a second time, structurally, over the file itself: death.ts may not
    // name the campaign branch at all. Nothing to reach it with, nothing to
    // widen.
    //
    // death.test.ts is deliberately NOT covered: proving the campaign ledger
    // came through death untouched requires naming it.
    files: ["src/core/death.ts"],
    rules: {
      "no-restricted-syntax": ["error",
        { selector: "ImportSpecifier[imported.name='CampaignBranch']",
          message: "Death may only touch the run branch — .llm/rules/engine.md" },
        { selector: "ImportSpecifier[imported.name='GameState']",
          message: "Death takes a RunBranch, never the whole state — .llm/rules/engine.md" },
        { selector: "TSTypeReference[typeName.name='CampaignBranch']",
          message: "Death may only touch the run branch — .llm/rules/engine.md" },
        { selector: "MemberExpression[property.name='campaign']",
          message: "DICE SURVIVE DEATH: the campaign ledger is not death's to read or write." }],
    }
  },
  { files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { process: "readonly", console: "readonly" } } }
);
