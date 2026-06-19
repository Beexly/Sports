import { test, expect, type Page } from "@playwright/test";

/**
 * The LOCKED 10-second test (reports/consolidation/SURFACE_CONSOLIDATION_MAP.md §1).
 *
 * A first-time visitor, within 10 seconds on `/`, can state:
 *   - What GSE is: sports intelligence, not a sportsbook — checkable signal.
 *   - Who it's for: people who make sports decisions and want the reasoning.
 *   - Where to click, by intent: (1) Enter today's board, (2) See a sample read,
 *     (3) Join the Founding Desk.
 *
 * The home page opens with a self-gating cinematic cold-open; we dismiss it the
 * way a returning visitor's browser would (localStorage flag) so the assertions
 * and screenshots capture the hero itself, then prove the hero answers all three
 * questions above-the-fold.
 */

async function gotoHome(page: Page): Promise<void> {
  // The home page opens with a self-gating cinematic cold-open. It supports a
  // first-class bypass via the ?intro=skip query param (cinematic-entrance.tsx),
  // which is exactly how a deep-link / returning visitor reaches the hero —
  // so the assertions and screenshots capture the hero itself.
  await page.goto("/?intro=skip", { waitUntil: "domcontentloaded" });
}

test.describe("front door — locked 10-second test", () => {
  test("hero answers what / who / where-to-click", async ({ page }) => {
    await gotoHome(page);

    // WHAT: the plain positioning line + the noise→signal thesis.
    await expect(page.getByText("Sports intelligence — not a sportsbook")).toBeVisible();
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
    await expect(h1).toContainText("noise");
    await expect(h1).toContainText("signal");

    // WHERE TO CLICK (by intent): the three primary doors.
    await expect(page.getByRole("link", { name: /Enter today.?s board/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /See a sample read/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Join the Founding Desk/i })).toBeVisible();

    // WHY TRUST IT: the three-reason trust strip.
    await expect(page.getByText(/Closing-line value/i)).toBeVisible();
    await expect(page.getByText(/Calibrated confidence/i)).toBeVisible();
    await expect(page.getByText(/No-Bet gate/i)).toBeVisible();
  });

  test("primary CTAs point at the canonical destinations", async ({ page }) => {
    await gotoHome(page);
    await expect(page.getByRole("link", { name: /Enter today.?s board/i })).toHaveAttribute("href", "/board");
    await expect(page.getByRole("link", { name: /See a sample read/i })).toHaveAttribute("href", "/sample-desk");
    await expect(page.getByRole("link", { name: /Join the Founding Desk/i })).toHaveAttribute("href", "/founding-desk");
  });

  test("PASSIVE first visit reaches the three intents within 10s (cold-open does not hide the front door)", async ({ page }) => {
    // A genuine first-time visitor: no skip param, fresh storage. The cinematic
    // cold-open plays, but it must hand off to a clear front door (identity + the
    // three intent CTAs) inside the locked 10-second window — without any click.
    await page.addInitScript(() => {
      try {
        window.localStorage.removeItem("gse-entrance-seen-v1");
        window.localStorage.removeItem("gse-intro-disabled");
      } catch {
        /* ignore */
      }
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // "Within 10 seconds ON /" — measure from arrival, not network time.
    const start = Date.now();
    // Do NOT click Skip. Wait for the three locked intents to be visible.
    await expect(page.getByRole("link", { name: /Enter today.?s board/i }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: /See a sample read/i }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: /Join the Founding Desk/i }).first()).toBeVisible({ timeout: 10_000 });
    const elapsed = Date.now() - start;
    expect(elapsed, `three intents visible in ${elapsed}ms (must be < 10s)`).toBeLessThan(10_000);
  });

  test("capture first-screen evidence", async ({ page }, testInfo) => {
    await gotoHome(page);
    await page.locator("h1").first().waitFor({ state: "visible" });
    // Let the aurora/starfield settle a beat for a representative still.
    await page.waitForTimeout(800);
    const file = `docs/visual-qa/2026-06-18/home-hero-${testInfo.project.name}.png`;
    await page.screenshot({ path: file, fullPage: false });
    await testInfo.attach("home-hero", { path: file, contentType: "image/png" });
  });
});
