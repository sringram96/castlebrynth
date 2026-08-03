// .llm/rules, executable. Core purity + layering.
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
        message: "core is pure — .llm/rules/engine.md"
      }]}],
      "no-restricted-globals": ["error",
        { name: "Date", message: "No clocks in core — .llm/rules/engine.md" }],
      "no-restricted-properties": ["error",
        { object: "Math", property: "random", message: "Inject RNG — .llm/rules/engine.md" }],
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
  {
    // H101 · NO PIXEL LITERALS IN LAYOUT CODE (.llm/rules/ui.md).
    //
    // The rule already exists in prose — "NUMERIC PIXEL LITERALS IN LAYOUT CODE
    // ARE A LINT ERROR — if you type 'px', it belongs in a token derived from
    // frame size or platform constants" — and prose is exactly what a shell
    // card under deadline steps over. So it is executable now that there is a
    // shell to run it against.
    //
    // The escape hatch is not a comment, it is a FILE: shell.css names the two
    // constants law allows (the tap minimum, the asset grid width), and TS
    // reads them back through custom properties. Anything else is either a
    // fraction of the frame or a number the projector derived.
    files: ["src/shell/**/*.ts"],
    languageOptions: { globals: { document: "readonly", window: "readonly", localStorage: "readonly" } },
    rules: {
      "no-restricted-syntax": ["error",
        { selector: "Literal[value=/[0-9]\\s*px/]",
          message: "Layout in frame fractions or platform constants, never pixels — .llm/rules/ui.md" },
        { selector: "TemplateElement[value.raw=/[0-9]\\s*px/]",
          message: "Layout in frame fractions or platform constants, never pixels — .llm/rules/ui.md" }],
    }
  },
  { files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { process: "readonly", console: "readonly" } } }
);
