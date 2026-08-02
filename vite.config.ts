import { defineConfig } from 'vite'

// H101 · the build. Vite is here because Capacitor wraps built web assets, so
// something has to build them (P1.md) — not because the shell wants a
// framework. There is none, and package.json is checked for one.
//
// The root is the repo root, so `index.html` is the entry where it already
// lives and `content/bundle.json` stays reachable as a static asset. The one
// module tag in that file is `/src/shell/main.ts`, so the entry graph is
// whatever main.ts reaches — nothing else is configured in.
export default defineConfig({
  build: {
    // Capacitor's `webDir` (H112) reads from here. The name is the contract
    // between the two cards, so it is spelled out rather than left to default.
    outDir: 'dist',
    emptyOutDir: true,
  },
})
