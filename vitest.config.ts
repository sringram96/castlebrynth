import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    environment: 'node',
    // H101 · the shell draws, so its tests need a document — but src/core is
    // pure (.llm/rules/purity.mdc) and the way it proves that is by passing
    // under node, where there is no `document` to lean on by accident. So the
    // DOM is granted per path rather than to the whole suite. happy-dom rather
    // than jsdom because it is already a devDependency here, and a dependency
    // you did not need is one you own forever (.llm/rules/no-dead-scaffolding).
    environmentMatchGlobs: [['src/shell/**', 'happy-dom']],
    // Determinism is the product (.llm/rules/purity.mdc). Concurrency that reorders
    // nothing is still concurrency that hides ordering bugs.
    sequence: { shuffle: false },
  },
})
