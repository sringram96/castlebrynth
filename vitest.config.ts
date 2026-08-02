import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    // Same reason as eslint.config.js: an agent's isolated checkout lives
    // under .claude/worktrees and must not be collected as this repo's tests.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/worktrees/**'],
    environment: 'node',
    // Determinism is the product (.llm/rules/purity.mdc). Concurrency that reorders
    // nothing is still concurrency that hides ordering bugs.
    sequence: { shuffle: false },
  },
})
