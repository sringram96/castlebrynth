// castlebrynth · vite config — the dev server and the bundle. (H101)
//
// Deliberately almost empty. The frame is CSS and DOM, the engine is plain
// TypeScript, and there is no framework: anything configured here that is not
// forced by the platform is a decision this card has no authority over.
//
// NO THEME PLUGIN, NO CSS PIPELINE. H102 (theme + frame tokens) is paused past
// H180 by the skeleton directive; `src/shell/shell.css` holds the two platform
// constants law already demands and nothing else.
import { defineConfig } from "vite";

export default defineConfig({
  // The repo root is the app root: index.html sits beside package.json.
  root: ".",
  // Relative, so the built frame opens from a file:// or any sub-path — there
  // is no server behind this game.
  base: "./",
  server: {
    // Bound wide on purpose: the DONE WHEN for this card is a PHONE viewport,
    // and a phone reaches this machine over the LAN, not over localhost.
    host: true,
    port: 5173,
  },
  build: {
    outDir: "dist",
    // The art is pixel data; inlining it as base64 would cost a third of its
    // size for no request we care about saving.
    assetsInlineLimit: 0,
  },
});
