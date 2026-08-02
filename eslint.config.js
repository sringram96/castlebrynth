import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['node_modules', 'content/bundle.json', 'coverage'],
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
    // RULES.md §1 — src/core is pure. The law, as a lint rule.
    files: ['src/core/**/*.ts'],
    ignores: ['src/core/**/*.test.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'process', message: 'src/core is pure (RULES.md §1).' },
        { name: 'console', message: 'src/core is pure (RULES.md §1).' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: 'Randomness is state as data — use seedRng/nextInt (RULES.md §1).',
        },
        {
          selector: "NewExpression[callee.name='Date']",
          message: 'src/core is pure — no clock (RULES.md §1).',
        },
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'src/core is pure — no clock (RULES.md §1).',
        },
        {
          selector: "NewExpression[callee.name=/^(Set|Map|WeakSet|WeakMap)$/]",
          message: 'GameState is JSON (RULES.md §2) — use arrays.',
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
