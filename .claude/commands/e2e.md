# /e2e — Playwright End-to-End Test Runner

Run Playwright E2E browser tests against the running app. Requires the Next.js dev server on port 3000.

## Usage

```
/e2e                          # Run all E2E tests
/e2e picks                    # Run picks paywall tests
/e2e checkout                 # Run Stripe checkout redirect tests
/e2e auth                     # Run NextAuth sign-in/out tests
/e2e --ui                     # Open Playwright UI (headed, watch tests live)
/e2e --debug <file>           # Debug a specific spec with breakpoints
```

## Prerequisites

1. Start the dev server: `npm run dev --workspace=apps/web`
2. Run tests: `npx playwright test [options]`

Playwright uses the pre-installed Chromium at `/opt/pw-browsers/chromium` — no download needed.

## Test Files

| File | Covers | Risk |
|---|---|---|
| `e2e/picks.spec.ts` | Paywall enforcement (FREE/PRO/ELITE) | **CRITICAL** — revenue |
| `e2e/checkout.spec.ts` | Stripe checkout redirect | **CRITICAL** — revenue |
| `e2e/auth.spec.ts` | NextAuth sign-in, sign-out, redirect | HIGH |
| `e2e/admin.spec.ts` | Admin-only routes blocked for non-admin | HIGH (security) |
| `e2e/upgrade.spec.ts` | Post-upgrade picks unlock | HIGH |

## What This Catches That Vitest Cannot

- Does the Stripe checkout actually redirect to `checkout.stripe.com`?
- Is the paywall enforced **server-side** (pick content not in DOM for FREE users)?
- Does NextAuth session persist across page navigations?
- Do protected routes redirect unauthenticated users to `/sign-in`?

## Environment Variables

```bash
E2E_TEST_EMAIL=...       # Test account email (FREE tier user)
E2E_TEST_PASSWORD=...    # Test account password
E2E_PRO_EMAIL=...        # PRO tier test user
E2E_ELITE_EMAIL=...      # ELITE tier test user
```

## Workflow Steps

1. Confirm `playwright.config.ts` exists at repo root
2. Run `npm install -D @playwright/test` if not installed
3. Start dev server: `npm run dev --workspace=apps/web`
4. Run target test(s) using `npx playwright test [spec]`
5. On failure: run `npx playwright show-report` for the HTML report with traces

## CI Integration

E2E tests run in `.github/workflows/ci.yml` under the `e2e` job:

```bash
npx playwright test --project=chromium-public --project=chromium-auth
```

Uses `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` + `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium`.

## First Test to Write (Priority 1)

Paywall enforcement — the most critical path in the codebase:

```typescript
// e2e/picks.spec.ts
test("pick selection is NOT in DOM for FREE tier users", async ({ page }) => {
  await page.goto("/picks");
  const premiumPick = page.getByTestId("pick-card-premium").first();
  // Server-side enforcement: content must not exist in DOM, not just hidden
  await expect(premiumPick.getByTestId("pick-selection")).not.toBeAttached();
  await expect(premiumPick.getByTestId("paywall-gate")).toBeVisible();
});
```
