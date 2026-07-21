# Playwright: End-to-End Browser Testing

> Source: `microsoft/playwright` (MIT, 71k★)
> Purpose: Browser-level tests for the flows that Vitest unit tests fundamentally cannot cover

## What This Solves

GSN has 10,281 Vitest unit tests. They test pure functions, mocks, and isolated modules.
What they cannot test:

- **Checkout flow**: does Stripe actually render? does the success redirect work?
- **Auth flow**: does NextAuth login/logout work in a real browser? does session persist across navigations?
- **Picks display**: do picks actually render when the DB has data? does the paywall block correctly?
- **Community features**: do moderation actions actually appear in the UI?
- **ELITE tier**: does subscribing actually unlock premium picks in the UI?

These flows can fail in production while every Vitest test passes. Playwright catches the gap.

**Critical insight**: Playwright is already pre-installed at `/opt/pw-browsers/chromium` in the development environment. Zero setup cost to start running tests.

## Why Not Cypress?

| | Playwright | Cypress |
|---|---|---|
| Speed | Parallel, multi-browser | Single browser, slower |
| Next.js support | First-class (RSC, streaming) | RSC not fully supported |
| API mocking | `page.route()` — network-level | `cy.intercept()` — similar |
| Component testing | Yes (`@playwright/experimental-ct-react`) | Yes (separate) |
| Auth state | Persistent storage state (fast) | Manual cookie management |
| Pre-installed here | Yes | No |

## Installation

```bash
npm install -D @playwright/test

# playwright.config.ts already uses pre-installed browsers:
# executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium'
```

## Configuration

**`playwright.config.ts`** (root of Sports repo):
```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html"], ["line"]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    // Use pre-installed Chromium (no download)
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
    },
  },

  projects: [
    // Auth setup — runs once, stores session state
    { name: "setup", testMatch: /.*\.setup\.ts/ },

    // Authenticated tests (reuse stored session)
    {
      name: "chromium-auth",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },

    // Public (unauthenticated) tests
    {
      name: "chromium-public",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev --workspace=apps/web",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

## Auth Setup (Run Once Per Test Suite)

**`e2e/auth.setup.ts`**:
```typescript
import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

setup("authenticate as test user", async ({ page }) => {
  await page.goto("/sign-in");

  // NextAuth credentials provider (test user created in seed)
  await page.getByLabel("Email").fill(process.env.E2E_TEST_EMAIL!);
  await page.getByLabel("Password").fill(process.env.E2E_TEST_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL("/dashboard");

  // Save session state for all subsequent tests
  await page.context().storageState({ path: authFile });
});
```

## GSN Use Case 1: Picks Display (Critical Path)

**`e2e/picks.spec.ts`**:
```typescript
import { test, expect } from "@playwright/test";

test.describe("picks display", () => {
  test("FREE tier user sees picks with paywall on premium content", async ({ page }) => {
    await page.goto("/picks");
    await expect(page.getByTestId("picks-list")).toBeVisible();

    // At least some picks are visible without subscription
    const picks = page.getByTestId("pick-card");
    await expect(picks.first()).toBeVisible();

    // Premium picks are gated server-side — content is replaced, not hidden
    const premiumPick = page.getByTestId("pick-card-premium").first();
    await expect(premiumPick.getByTestId("paywall-gate")).toBeVisible();

    // CRITICAL: the actual pick selection is NOT in the DOM for FREE users
    // (server-side enforcement — frontend-only paywalls are forbidden per CLAUDE.md)
    await expect(premiumPick.getByTestId("pick-selection")).not.toBeAttached();
  });

  test("PRO tier user sees all PRO picks without paywall", async ({ page }) => {
    // Uses auth state from pro-user.setup.ts
    await page.goto("/picks");
    const proPickCards = page.getByTestId("pick-card-pro");
    const firstPro = proPickCards.first();
    await expect(firstPro.getByTestId("pick-selection")).toBeVisible();
    await expect(firstPro.getByTestId("paywall-gate")).not.toBeAttached();
  });

  test("picks refresh without full page reload when status updates", async ({ page }) => {
    await page.goto("/picks");
    // Trigger a soft navigation
    await page.getByRole("button", { name: /refresh/i }).click();
    // Picks list re-renders; no full reload (URL stays the same)
    await expect(page).toHaveURL("/picks");
    await expect(page.getByTestId("picks-list")).toBeVisible();
  });
});
```

## GSN Use Case 2: Checkout Flow (Stripe Integration)

**`e2e/checkout.spec.ts`**:
```typescript
import { test, expect } from "@playwright/test";

test.describe("stripe checkout", () => {
  test("PRO upgrade flow renders Stripe checkout and redirects on success", async ({ page }) => {
    await page.goto("/upgrade");

    // Click PRO tier button
    await page.getByTestId("upgrade-pro-button").click();

    // Should redirect to Stripe checkout (external URL)
    await page.waitForURL(/checkout\.stripe\.com/);
    expect(page.url()).toContain("checkout.stripe.com");

    // Stripe checkout page loads (not a 404 or error)
    await expect(page.getByText(/pay/i)).toBeVisible({ timeout: 10_000 });
  });

  test("checkout button is disabled while session is loading", async ({ page }) => {
    await page.goto("/upgrade");
    // Verify no double-click vulnerability during loading
    const button = page.getByTestId("upgrade-pro-button");
    // Button is enabled once session loads
    await expect(button).toBeEnabled({ timeout: 5_000 });
  });
});
```

## GSN Use Case 3: Auth Flow (NextAuth)

**`e2e/auth.spec.ts`**:
```typescript
import { test, expect } from "@playwright/test";

// These run unauthenticated
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("auth flows", () => {
  test("unauthenticated user is redirected to sign-in from protected routes", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("sign-in with valid credentials redirects to dashboard", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(process.env.E2E_TEST_EMAIL!);
    await page.getByLabel("Password").fill(process.env.E2E_TEST_PASSWORD!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL("/dashboard", { timeout: 8_000 });
  });

  test("sign-out clears session and redirects to home", async ({ page }) => {
    // Start authenticated
    await page.goto("/dashboard");
    await page.getByTestId("sign-out-button").click();
    await expect(page).toHaveURL("/");
    // Revisiting a protected route now redirects
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
```

## GSN Use Case 4: API Route Mocking (Fast, No Real DB)

For tests that need specific DB state without seeding:

```typescript
import { test, expect } from "@playwright/test";

test("picks page handles empty state gracefully", async ({ page }) => {
  // Mock the API response — no DB needed
  await page.route("/api/picks*", (route) =>
    route.fulfill({ json: { picks: [], total: 0 } })
  );

  await page.goto("/picks");
  await expect(page.getByTestId("empty-picks-message")).toBeVisible();
  await expect(page.getByText(/no picks available/i)).toBeVisible();
});

test("picks page shows error state when API fails", async ({ page }) => {
  await page.route("/api/picks*", (route) =>
    route.fulfill({ status: 500, json: { error: "Internal server error" } })
  );

  await page.goto("/picks");
  await expect(page.getByTestId("error-boundary")).toBeVisible();
});
```

## CI Integration

Add to `.github/workflows/ci.yml`:

```yaml
  e2e:
    name: Playwright E2E
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.E2E_DATABASE_URL }}
      E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
      E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
      PLAYWRIGHT_CHROMIUM_PATH: /opt/pw-browsers/chromium
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1"
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - run: npm ci --no-audit --no-fund
      - run: npx playwright test --project=chromium-public --project=chromium-auth
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Running Locally

```bash
# Run all E2E tests
npx playwright test

# Run with UI (headed browser — watch tests live)
npx playwright test --ui

# Run specific test file
npx playwright test e2e/picks.spec.ts

# Debug a specific test (headed, with breakpoints)
npx playwright test e2e/checkout.spec.ts --debug

# Show last test report
npx playwright show-report
```

## Priority Test Matrix (Start Here)

| Flow | Risk if broken | Test file |
|---|---|---|
| Server-side paywall enforcement | CRITICAL (revenue) | `e2e/picks.spec.ts` |
| Stripe checkout redirect | CRITICAL (revenue) | `e2e/checkout.spec.ts` |
| NextAuth sign-in/out | HIGH | `e2e/auth.spec.ts` |
| Admin-only routes blocked for non-admin | HIGH (security) | `e2e/admin.spec.ts` |
| Picks display after subscription upgrade | HIGH | `e2e/upgrade.spec.ts` |
| Community moderation actions | MEDIUM | `e2e/community.spec.ts` |
| Watchlist add/remove | MEDIUM | `e2e/watchlist.spec.ts` |

## Status

- [ ] `npm install -D @playwright/test` in root workspace
- [ ] Create `playwright.config.ts` with pre-installed Chromium path
- [ ] Create `e2e/auth.setup.ts` (auth state setup)
- [ ] Write `e2e/picks.spec.ts` — paywall enforcement (CRITICAL first)
- [ ] Write `e2e/checkout.spec.ts` — Stripe redirect
- [ ] Write `e2e/auth.spec.ts` — NextAuth sign-in/out
- [ ] Add E2E job to `.github/workflows/ci.yml`
- [ ] Set `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` in GitHub secrets
- [ ] Add `data-testid` attributes to key components (picks-list, paywall-gate, etc.)
