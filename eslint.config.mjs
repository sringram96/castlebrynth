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
  { files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { process: "readonly", console: "readonly" } } }
);
