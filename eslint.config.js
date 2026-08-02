import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    // .claude/worktrees is where the harness parks a factory agent's isolated
    // checkout. It is a whole second copy of this repo sitting inside the
    // first one, so without this line every agent lints its siblings' work and
    // the whole wave reports a red law it did not cause.
    ignores: [
      'node_modules',
      'content/bundle.json',
      'coverage',
      'dist',
      'android',
      '.claude/worktrees',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // .llm/rules/purity.mdc — src/core is pure. The law, as a lint rule.
    files: ['src/core/**/*.ts'],
    ignores: ['src/core/**/*.test.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'process', message: 'src/core is pure (.llm/rules/purity.mdc).' },
        { name: 'document', message: 'src/core has no DOM — that is the shell (P1.md).' },
        { name: 'window', message: 'src/core has no DOM — that is the shell (P1.md).' },
        { name: 'localStorage', message: 'src/core does no I/O (.llm/rules/purity.mdc).' },
        { name: 'console', message: 'src/core is pure (.llm/rules/purity.mdc).' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: 'Randomness is state as data — use seedRng/nextInt (.llm/rules/purity.mdc).',
        },
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'src/core is pure — no clock (.llm/rules/purity.mdc).',
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'src/core is pure — no clock (.llm/rules/purity.mdc).',
        },
        {
          selector: "NewExpression[callee.name=/^(Set|Map|WeakSet|WeakMap)$/]",
          message: 'GameState is JSON (.llm/rules/determinism.mdc) — use arrays.',
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.ts'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly' },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
