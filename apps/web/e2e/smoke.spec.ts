import { test, expect } from "@playwright/test";

/**
 * The one test this harness must never lose: the site boots and the
 * homepage is reachable by a real browser. Everything else in Phase 9.5
 * builds on this working.
 */
test.describe("smoke", () => {
  test("homepage returns 200 and renders the expected title", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/.+/);
  });
});
