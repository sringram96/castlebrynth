import { defineConfig } from 'vitest/config'

// The URL is the whole install: no backend, no framework, everything
// client-side.
export default defineConfig({
  build: { target: 'es2022' },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
})
