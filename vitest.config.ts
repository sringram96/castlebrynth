import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    // Determinism is the product (RULES.md §1). Concurrency that reorders
    // nothing is still concurrency that hides ordering bugs.
    sequence: { shuffle: false },
  },
})
