import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Audit the accessible baseline: prefers-reduced-motion users see no mid-fade
// transient states (the universal reduced-motion reset lands animations on
// their final, fully-opaque frame), so contrast is measured on the settled DOM.
test.use({ reducedMotion: "reduce" });

/**
 * AA+ accessibility gate (Phase 2): zero serious/critical axe violations on the
 * four launch-critical surfaces. WCAG 2 A + AA rules. The home page is scanned
 * with the cold-open bypassed (?intro=skip) so we audit the resting front door.
 */
const SURFACES: ReadonlyArray<{ path: string; label: string }> = [
  { path: "/?intro=skip", label: "home" },
  { path: "/board", label: "board" },
  { path: "/founding-desk", label: "founding-desk" },
  { path: "/pricing", label: "pricing" },
];

for (const { path, label } of SURFACES) {
  test(`a11y: ${label} has no serious/critical axe violations`, async ({ page }) => {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.locator("main, body").first().waitFor({ state: "visible" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    const summary = seriousOrCritical.map(
      (v) => `[${v.impact}] ${v.id} — ${v.help} (${v.nodes.length} node(s))`,
    );
    expect(seriousOrCritical, `${label} serious/critical violations:\n${summary.join("\n")}`).toEqual([]);
  });
}
