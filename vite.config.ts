import { defineConfig } from 'vite'

// P101 · the build. Vite is here because Capacitor wraps built web assets, so
// something has to build them (P1.md) — not because the shell wants a
// framework. There is none, and package.json is checked for one.
//
// The root is the repo root, so `index.html` is the entry where it already
// lives and `content/bundle.json` stays reachable as a static asset.
export default defineConfig({
  build: {
    // Capacitor's `webDir` (P107) reads from here. The name is the contract
    // between the two cards, so it is spelled out rather than left to default.
    outDir: 'dist',
    emptyOutDir: true,
  },
})
