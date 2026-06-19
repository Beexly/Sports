import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the launch-hardening verification suite.
 *
 * Assumes a dev server is already running on http://localhost:3000
 * (started by the local session). It does NOT manage the server itself,
 * so the same warm instance can be reused across runs.
 *
 * Specs live in apps/web/e2e and prove front-door clarity (the locked
 * 10-second test) + the Phase-0 consolidation redirects in a real browser.
 */
export default defineConfig({
  testDir: "apps/web/e2e",
  fullyParallel: true,
  forbidOnly: true,
  retries: 1,
  // The home route is component-heavy; a cold Next dev compile can exceed the
  // default per-test timeout on first hit. Generous timeouts keep the proof
  // reliable in dev; against a production build it returns near-instantly.
  timeout: 150_000,
  reporter: [["list"]],
  outputDir: "docs/visual-qa/2026-06-18/_artifacts",
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost:3000",
    trace: "off",
    screenshot: "off",
    actionTimeout: 20_000,
    navigationTimeout: 120_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
