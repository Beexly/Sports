import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.GSE_QA_BASE_URL ?? "http://localhost:3017";
const pathname = process.env.GSE_QA_PLAYBACK_PATH;
if (!pathname?.startsWith("/")) {
  throw new Error("GSE_QA_PLAYBACK_PATH must name a Game Room or explicitly labeled local QA route");
}

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

    const startedAt = performance.now();
    const response = await page.goto(`${baseUrl}${pathname}`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    const navigationMs = Math.round(performance.now() - startedAt);
    const heading = page.getByRole("heading", { name: "Intelligence Playback" });
    await heading.waitFor({ state: "visible", timeout: 30_000 });

    await page.getByRole("button", { name: "Next event" }).click();
    const nextState = await page.locator('[aria-live="polite"]').innerText();
    await page.keyboard.press("ArrowRight");
    const keyboardState = await page.locator('[aria-live="polite"]').innerText();
    await page.getByRole("slider", { name: "Playback time" }).fill("3");
    const scrubbedState = await page.locator('[aria-live="polite"]').innerText();
    await page.getByRole("button", { name: "Stop playback" }).click();
    const stoppedState = await page.locator('[aria-live="polite"]').innerText();

    await page.getByRole("button", { name: "Play playback" }).focus();
    const focusedControl = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? null);
    await page.addScriptTag({ path: resolve("node_modules", "axe-core", "axe.min.js") });
    const axeViolations = await page.evaluate(async () => {
      if (!globalThis.axe) throw new Error("axe-core did not initialize");
      const results = await globalThis.axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      });
      return results.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.length,
      }));
    });
    const state = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const normalizedText = bodyText.toLowerCase();
      return {
        bodyLength: bodyText.trim().length,
        headingCount: document.querySelectorAll("h1, h2").length,
        hasTranscript: normalizedText.includes("accessible transcript"),
        hasTable: Boolean(document.querySelector('table[aria-label="Intelligence event data"]')),
        hasDelta: normalizedText.includes("what changed?"),
        hasDecisionCertificate: normalizedText.includes("why did the decision change?"),
        disclaimsCausality: normalizedText.includes("causality is not inferred"),
        hasEventCitations: normalizedText.includes("event citations"),
        hasSupporting: normalizedText.includes("supporting evidence"),
        hasWeakening: normalizedText.includes("weakening evidence"),
        rawMarkerPresent: normalizedText.includes("rawinternaloutput"),
        hasOverlay: Boolean(document.querySelector("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay")),
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        mainLabel: document.querySelector("main")?.getAttribute("id") ?? null,
        reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      };
    });
    const zoomState = await page.evaluate(async () => {
      const root = document.documentElement;
      root.style.fontSize = "200%";
      await new Promise((resolveFrame) => window.requestAnimationFrame(() => resolveFrame()));
      const result = {
        bodyVisible: document.body.innerText.trim().length > 0,
        horizontalOverflow: root.scrollWidth > window.innerWidth,
      };
      root.style.fontSize = "";
      return result;
    });

    const screenshot = resolve(outputDir, `intelligence-playback-renderer-qa-${viewport.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    const failures = [
      response?.status() !== 200 ? `status:${response?.status() ?? "none"}` : null,
      state.bodyLength === 0 ? "blank" : null,
      !state.hasTranscript ? "transcript-missing" : null,
      !state.hasTable ? "table-missing" : null,
      !state.hasDelta ? "epistemic-delta-missing" : null,
      !state.hasDecisionCertificate ? "decision-certificate-missing" : null,
      !state.disclaimsCausality ? "causality-disclaimer-missing" : null,
      !state.hasEventCitations ? "event-citations-missing" : null,
      !state.hasSupporting ? "supporting-evidence-missing" : null,
      !state.hasWeakening ? "weakening-evidence-missing" : null,
      state.rawMarkerPresent ? "raw-marker-present" : null,
      state.hasOverlay ? "error-overlay" : null,
      state.horizontalOverflow ? "horizontal-overflow" : null,
      state.mainLabel !== "main-content" ? "main-landmark-missing" : null,
      !state.reducedMotion ? "reduced-motion-not-emulated" : null,
      axeViolations.length > 0 ? `axe:${axeViolations.map((violation) => violation.id).join(",")}` : null,
      !zoomState.bodyVisible ? "zoom-200-blank" : null,
      zoomState.horizontalOverflow ? "zoom-200-horizontal-overflow" : null,
      nextState !== "OBSERVED" ? `next:${nextState}` : null,
      keyboardState !== "SCORED" ? `keyboard:${keyboardState}` : null,
      scrubbedState !== "PUBLISHED" ? `scrubber:${scrubbedState}` : null,
      stoppedState !== "UNKNOWN" ? `stop:${stoppedState}` : null,
      focusedControl !== "Play playback" ? `focus:${focusedControl ?? "none"}` : null,
      consoleErrors.length > 0 ? `console:${consoleErrors.join(" | ")}` : null,
      pageErrors.length > 0 ? `page:${pageErrors.join(" | ")}` : null,
    ].filter(Boolean);

    results.push({ viewport, pathname, navigationMs, screenshot, state, zoomState, axeViolations, consoleErrors, pageErrors, failures });
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));
if (results.some((result) => result.failures.length > 0)) process.exitCode = 1;
