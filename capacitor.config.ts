import type { CapacitorConfig } from '@capacitor/cli'

// P107 · the phone wrapper. Capacitor ships the built web assets inside a
// native shell; it adds no runtime the shell talks to, so there is nothing
// here but the three names the native project needs.
//
// `webDir` is the contract with vite.config.ts's `outDir` — `cap sync` copies
// that directory into android/app/src/main/assets/public, so the two must
// agree or the app boots to a blank WebView.
const config: CapacitorConfig = {
  appId: 'com.castlebrynth.app',
  appName: 'Castle Brynth',
  webDir: 'dist',
}

export default config
