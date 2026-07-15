import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.GSE_QA_BASE_URL ?? "http://localhost:3017";
const outputDir = resolve("reports", "visual", "frontier-recovery");
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
const redirectPaths = ["/fantasy/draft", "/fantasy/props", "/optimizer"];

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(`${baseUrl}/fantasy`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.waitForTimeout(750);

    const pageState = await page.evaluate(() => ({
      bodyLength: document.body.innerText.trim().length,
      h1Count: document.querySelectorAll("h1").length,
      hasExpectedHeading: document.body.innerText.includes(
        "Fantasy tools stay closed until every player row is real.",
      ),
      hasManifest: document.body.innerText.includes("Data clearance manifest"),
      hasOverlay: Boolean(
        document.querySelector(
          "[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay",
        ),
      ),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      mainLabel: document.querySelector("main")?.getAttribute("id") ?? null,
    }));

    const redirects = [];
    for (const pathname of redirectPaths) {
      await page.goto(`${baseUrl}${pathname}`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      redirects.push({
        pathname,
        finalUrl: page.url(),
        gateNotice: (await page.locator("body").innerText()).includes(
          "The tool you requested uses an illustrative fallback today",
        ),
      });
    }

    await page.goto(`${baseUrl}/fantasy`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page
      .getByRole("heading", {
        level: 1,
        name: "Fantasy tools stay closed until every player row is real.",
      })
      .waitFor({ state: "visible", timeout: 30_000 });
    await page.waitForTimeout(500);
    const screenshot = resolve(outputDir, `fantasy-gate-${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });

    const failures = [
      response?.status() !== 200 ? `status:${response?.status() ?? "none"}` : null,
      pageState.bodyLength === 0 ? "blank" : null,
      pageState.h1Count !== 1 ? `h1:${pageState.h1Count}` : null,
      !pageState.hasExpectedHeading ? "heading-missing" : null,
      !pageState.hasManifest ? "manifest-missing" : null,
      pageState.hasOverlay ? "error-overlay" : null,
      pageState.horizontalOverflow ? "horizontal-overflow" : null,
      pageState.mainLabel !== "main-content" ? "main-landmark-missing" : null,
      consoleErrors.length > 0 ? `console:${consoleErrors.join(" | ")}` : null,
      pageErrors.length > 0 ? `page:${pageErrors.join(" | ")}` : null,
      redirects.some((item) => !new URL(item.finalUrl).pathname.startsWith("/fantasy"))
        ? "redirect-target"
        : null,
      redirects.some((item) => !item.gateNotice) ? "redirect-notice" : null,
    ].filter(Boolean);

    results.push({
      viewport,
      screenshot,
      pageState,
      redirects,
      consoleErrors,
      pageErrors,
      failures,
    });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));
if (results.some((result) => result.failures.length > 0)) process.exitCode = 1;
