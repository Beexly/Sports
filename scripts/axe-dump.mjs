// One-off: dump serious/critical axe violations for specific surfaces.
// Usage: node scripts/axe-dump.mjs "/?intro=skip" "/pricing"
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const paths = process.argv.slice(2);
const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch();
const mobile = process.env.MOBILE === "1";
const context = await browser.newContext(
  mobile
    ? { reducedMotion: "reduce", viewport: { width: 393, height: 851 }, isMobile: true, deviceScaleFactor: 2.75, userAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36" }
    : { reducedMotion: "reduce", viewport: { width: 1280, height: 900 } },
);
console.log(`viewport: ${mobile ? "mobile 393" : "desktop 1280"}`);
for (const path of paths) {
  const page = await context.newPage();
  await page.goto(base + path, { waitUntil: "load", timeout: 120000 });
  await page.locator("main, body").first().waitFor({ state: "visible" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(1800);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const sc = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  console.log(`\n=== ${path} : ${sc.length} serious/critical ===`);
  for (const v of sc) {
    console.log(`\n[${v.impact}] ${v.id} — ${v.help}`);
    for (const n of v.nodes.slice(0, 6)) {
      console.log("  target:", JSON.stringify(n.target));
      const msg = (n.failureSummary ?? "").replace(/\s+/g, " ").trim();
      console.log("  why:", msg.slice(0, 240));
      console.log("  html:", (n.html ?? "").replace(/\s+/g, " ").slice(0, 200));
    }
    if (v.nodes.length > 6) console.log(`  ...and ${v.nodes.length - 6} more node(s)`);
  }
  await page.close();
}
await browser.close();
