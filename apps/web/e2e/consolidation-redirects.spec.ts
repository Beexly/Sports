import { test, expect } from "@playwright/test";

/**
 * Phase-0 consolidation redirects, verified end-to-end in a real browser:
 * the merged front doors land on their canonical surface with no broken flow.
 * (reports/consolidation/SURFACE_CONSOLIDATION_MAP.md §3 / §5)
 */
const MERGES: ReadonlyArray<[string, string]> = [
  ["/picks", "/board"],
  ["/stats/players", "/players"],
  ["/gsn", "/the-beat"],
  ["/brief", "/founding-desk"],
];

for (const [from, to] of MERGES) {
  test(`${from} → ${to}`, async ({ page }) => {
    await page.goto(from, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`${to.replace(/\//g, "\\/")}(\\?.*)?$`));
  });
}

test("/today is gated behind auth (redirects to signin)", async ({ page }) => {
  await page.goto("/today", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/auth\/signin\?callbackUrl=%2Ftoday/);
});
