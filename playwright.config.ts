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
    { name: "mobile", use: { ...devices["iPhone 12"], viewport: { width: 390, height: 844 } } },
    { name: "safari", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: "npm run dev --workspace=apps/web",
    url: "http://localhost:3000",
    reuseExistingServer: false,
    // Run the dev server in stub mode: no real DATABASE_URL and with
    // DEV_FAKE_ADMIN=true so auth() returns a synthetic session without hitting
    // Prisma. This makes checkout/API routes fail closed (503) instantly via
    // requireDurableWriteStore instead of hanging on Prisma retry backoff
    // against the unreachable Neon URL in .env.local. Next.js does not override
    // process.env values that are already set, so webServer.env takes precedence
    // over .env.local.
    env: {
      DATABASE_URL: "stub",
      DEV_FAKE_ADMIN: "true",
      STRIPE_SECRET_KEY: "",
    },
    // A cold `next dev` compile of this app's home route has run past two
    // minutes before; give it real headroom rather than a flaky retry.
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
