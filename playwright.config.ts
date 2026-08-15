import { defineConfig, devices } from "@playwright/test";

/**
 * e2e smoke/journey suite. Unlike the abandoned worktree's config (which
 * assumed a dev server was already running and never managed one), this
 * boots and tears down Next.js itself via webServer — nothing is left
 * running after the run ends, and CI/an unattended agent can run this
 * unattended without hand-managing a server process.
 */
export default defineConfig({
  testDir: "apps/web/e2e",
  fullyParallel: true,
  forbidOnly: true,
  retries: 1,
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost:3000",
    trace: "off",
    screenshot: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: "npm run dev --workspace=apps/web",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    // A cold `next dev` compile of this app's home route has run past two
    // minutes before; give it real headroom rather than a flaky retry.
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
