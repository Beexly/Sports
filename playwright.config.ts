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
  // Cold `next dev` compile of / has been measured at 70s+ locally. Keep the
  // paywall assertions; give navigation room so the first pass is not a flake.
  workers: 1,
  timeout: 120_000,
  reporter: [["list"]],
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost:3000",
    trace: "off",
    screenshot: "off",
    actionTimeout: 15_000,
    navigationTimeout: 90_000,
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
    // Run the dev server in stub mode: no real DATABASE_URL, so checkout/API
    // routes fail closed (503) instantly via requireDurableWriteStore instead of
    // hanging on Prisma retry backoff against the unreachable Neon URL in
    // .env.local. Next.js does not override process.env values that are already
    // set, so webServer.env takes precedence over .env.local.
    //
    // DEV_FAKE_ADMIN IS DELIBERATELY *NOT* SET HERE — do not add it back.
    // It was added on 2026-08-16 to stop a checkout timeout and removed the same
    // day. It makes every auth() call return a synthetic ADMIN session
    // (lib/auth.ts:108) entitled to ELITE (lib/entitlements.ts:20), which means
    // the whole e2e suite would run as an authenticated, fully-entitled admin.
    // That silently guts the tests that matter most: journey-anonymous.spec.ts
    // exists to prove premium selection/line/confidence do NOT reach an
    // anonymous visitor, and it cannot prove that while the "anonymous" browser
    // is an ELITE admin. It is also the flag that legitimately blocks the
    // production build (P7-07) precisely because it bypasses the paywall.
    // Per AGENTS.md Law 9: never weaken a guard to make a test pass.
    env: {
      DATABASE_URL: "stub",
      STRIPE_SECRET_KEY: "",
      // Auth.js requires a secret to construct a session even for anonymous
      // visitors. Dummy only — not DEV_FAKE_ADMIN (that would entitle the
      // browser as ELITE and gut journey-anonymous).
      NEXTAUTH_SECRET: "e2e-not-a-production-secret",
      AUTH_SECRET: "e2e-not-a-production-secret",
    },
    // A cold `next dev` compile of this app's home route has run past two
    // minutes before; give it real headroom rather than a flaky retry.
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
