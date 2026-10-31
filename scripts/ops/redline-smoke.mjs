import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { checks: {}, errors: [], failedResponses: [] };
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on("pageerror", (error) => report.errors.push(error.message));
    page.on("response", (response) => {
      if (response.status() >= 400) report.failedResponses.push(`${response.status()} ${response.url()}`);
    });
    const response = await page.goto("http://127.0.0.1:3000/redline", { waitUntil: "networkidle" });
    report.checks[`status${width}`] = response.status();
    report.checks[`title${width}`] = await page.title();
    report.checks[`headline${width}`] = await page.locator("h1").textContent();
    report.checks[`overflow${width}`] = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    report.checks[`brokenImages${width}`] = await page.evaluate(() => [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src));
    if (width === 390) {
      report.checks.ogImage = await page.locator('meta[property="og:image"]').getAttribute("content");
      for (const relative of ["assets/og/gse-redline-og.png", "assets/social/gse-dfs-portrait.png", "assets/social/gse-redline-story.mp4", "assets/cards/gse-dfs-card.png"]) {
        const asset = await page.request.get(`http://127.0.0.1:3000/${relative}`);
        report.checks[relative] = asset.status();
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
if (report.errors.length || report.failedResponses.length) process.exit(1);
for (const [key, value] of Object.entries(report.checks)) {
  if (key.startsWith("status") && value !== 200) process.exit(1);
  if (key.startsWith("assets/") && value !== 200) process.exit(1);
  if (key.startsWith("overflow") && value) process.exit(1);
  if (key.startsWith("brokenImages") && value.length) process.exit(1);
}
if (report.checks.ogImage !== "https://www.galaxysportsedge.com/assets/og/gse-redline-og.png") process.exit(1);
