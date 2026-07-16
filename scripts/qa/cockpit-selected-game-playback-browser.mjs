import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.GSE_QA_BASE_URL ?? "http://127.0.0.1:3210";
const gameId = process.env.GSE_QA_GAME_ID;
if (!gameId) throw new Error("GSE_QA_GAME_ID must identify a persisted game selected by the operator");

const outputDir = resolve("reports", "visual", "frontier-recovery");
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const pathname = `/cockpit/market-twin/${encodeURIComponent(gameId)}`;
    const response = await page.goto(`${baseUrl}${pathname}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await page.getByRole("heading", { name: "Playback unavailable" }).waitFor({
      state: "visible",
      timeout: 30_000,
    });
    const backLink = page.getByRole("link", { name: "← Market Twin", exact: true });
    await backLink.focus();
    const focusedLink = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? null);

    await page.addScriptTag({ path: resolve("node_modules", "axe-core", "axe.min.js") });
    const axeViolations = await page.evaluate(async () => {
      if (!globalThis.axe) throw new Error("axe-core did not initialize");
      const report = await globalThis.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      });
      return report.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.length,
      }));
    });
    const state = await page.evaluate(() => {
      const normalizedText = document.body.innerText.toLowerCase();
      return {
        hasMain: Boolean(document.querySelector("main")),
        hasSingleH1: document.querySelectorAll("h1").length === 1,
        hasUnavailableReason: normalizedText.includes("game not found"),
        hasUnavailableMessage: normalizedText.includes("no persisted game matched this id"),
        hasBrainAnswer: normalizedText.includes("deterministic brain answer"),
        hasAutopsyProjection: normalizedText.includes("postgame autopsy projection"),
        hasStudioPackage: normalizedText.includes("draft-only studio package"),
        hasRawMarker: normalizedText.includes("raw_private_vector") || normalizedText.includes("rawinternaloutput"),
        hasOverlay: Boolean(document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay")),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      };
    });
    const zoomState = await page.evaluate(async () => {
      const root = document.documentElement;
      root.style.fontSize = "200%";
      await new Promise((resolveFrame) => window.requestAnimationFrame(resolveFrame));
      const measured = {
        bodyVisible: document.body.innerText.trim().length > 0,
        horizontalOverflow: root.scrollWidth > window.innerWidth,
        overflowNodes: [...document.querySelectorAll("body *")]
          .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
          .slice(0, 8)
          .map((element) => ({
            tag: element.tagName,
            className: element.getAttribute("class"),
            text: element.textContent?.trim().slice(0, 80) ?? "",
            right: Math.round(element.getBoundingClientRect().right),
          })),
      };
      root.style.fontSize = "";
      return measured;
    });

    const screenshot = resolve(outputDir, `cockpit-selected-game-unavailable-${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    const failures = [
      response?.status() !== 200 ? `status:${response?.status() ?? "none"}` : null,
      !state.hasMain ? "main-landmark-missing" : null,
      !state.hasSingleH1 ? "single-h1-missing" : null,
      !state.hasUnavailableReason ? "reason-missing" : null,
      !state.hasUnavailableMessage ? "message-missing" : null,
      state.hasBrainAnswer ? "invented-brain-answer" : null,
      state.hasAutopsyProjection ? "invented-autopsy-projection" : null,
      state.hasStudioPackage ? "invented-studio-package" : null,
      state.hasRawMarker ? "raw-output-marker" : null,
      state.hasOverlay ? "framework-overlay" : null,
      state.horizontalOverflow ? "horizontal-overflow" : null,
      !state.reducedMotion ? "reduced-motion-not-emulated" : null,
      focusedLink !== "← Market Twin" ? `focus:${focusedLink ?? "none"}` : null,
      axeViolations.length > 0 ? `axe:${axeViolations.map((violation) => violation.id).join(",")}` : null,
      !zoomState.bodyVisible ? "zoom-200-blank" : null,
      zoomState.horizontalOverflow ? "zoom-200-horizontal-overflow" : null,
      consoleErrors.length > 0 ? `console:${consoleErrors.join(" | ")}` : null,
      pageErrors.length > 0 ? `page:${pageErrors.join(" | ")}` : null,
    ].filter(Boolean);

    results.push({ viewport, pathname, screenshot, state, zoomState, axeViolations, failures });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));
if (results.some((result) => result.failures.length > 0)) process.exitCode = 1;
