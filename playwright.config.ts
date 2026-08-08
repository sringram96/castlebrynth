import { defineConfig, devices } from '@playwright/test'

/**
 * The acceptance suite.
 *
 * These are the tests the pre-reset repository most conspicuously lacked: it
 * could prove thousands of logical facts while an overlay ate every tap on the
 * bottom row. A green unit suite is not completion; this is.
 *
 * One project, and it is a phone. 390x844 is the viewport every layout claim
 * in ART_DIRECTION.md is made about.
 */
export default defineConfig({
  testDir: './test/browser',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: process.env['CI'] ? [['github'], ['list']] : [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'phone',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        // Some environments ship a Chromium that Playwright did not download
        // itself. Point at it when it is there; otherwise use the managed one.
        ...(process.env['CHROMIUM_PATH']
          ? { launchOptions: { executablePath: process.env['CHROMIUM_PATH'] } }
          : {}),
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env['CI'],
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
