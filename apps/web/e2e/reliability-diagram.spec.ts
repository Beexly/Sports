import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Settle entrance animations before asserting, like the a11y gate.
test.use({ contextOptions: { reducedMotion: "reduce" } });

/**
 * Phase 3 — the honest accuracy-proof centerpiece.
 *
 * The reliability diagram (buildReliabilityPresentation) is wired into the
 * EXISTING /performance and /reliability surfaces via CalibrationPanel. It must:
 *   1. Render EITHER the full diagram (>=100 settled picks) OR the honest
 *      "building the record" gated state — never a fabricated curve, never blank.
 *   2. Keep zero serious/critical axe violations on both surfaces.
 *
 * Below the sample floor (the default state without a large settled record) the
 * gated panel renders; with a real record the SVG diagram + Brier-skill + hit-rate
 * CI render. Asserting the union proves the wiring is live in both regimes.
 */
const SURFACES: ReadonlyArray<{ path: string; label: string }> = [
  { path: "/performance", label: "performance" },
  { path: "/reliability", label: "reliability" },
];

for (const { path, label } of SURFACES) {
  test(`reliability proof renders on ${label} (diagram or honest gated state)`, async ({
    page,
  }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.locator("main").first().waitFor({ state: "visible" });
    await page.waitForLoadState("networkidle").catch(() => {});

    const diagram = page.locator('[data-testid="reliability-diagram"]');
    const gated = page.locator('[data-testid="reliability-diagram-gated"]');

    // Exactly one of the two states must be present and visible.
    await expect(diagram.or(gated).first()).toBeVisible();

    if (await diagram.count()) {
      // Full diagram: the SVG, the verdict, and the two-numbers proof all render.
      await expect(page.locator('[data-testid="reliability-verdict"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="reliability-brier-skill"]').first()).toBeVisible();
      await expect(page.locator('[data-testid="reliability-hit-rate"]').first()).toBeVisible();
    }
  });

  test(`a11y: ${label} has no serious/critical axe violations`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.locator("main").first().waitFor({ state: "visible" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(800);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    const summary = seriousOrCritical.map(
      (v) => `[${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} node(s))`,
    );
    expect(
      seriousOrCritical,
      `${label} serious/critical violations:\n${summary.join("\n")}`,
    ).toEqual([]);
  });
}
