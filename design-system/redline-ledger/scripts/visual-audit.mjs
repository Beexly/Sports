import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(new URL("../site/package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const axePath = require.resolve("axe-core/axe.min.js");
const root = path.resolve(import.meta.dirname, "..");
const report = { viewports: [], interactions: {}, downloads: {}, reducedMotion: {} };
const browser = await chromium.launch({ channel: "chrome", headless: true });

async function auditViewport(width, reducedMotion = "no-preference") {
  const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion });
  const page = await context.newPage();
  const errors = [];
  const failedResponses = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.evaluate(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const numericSelector = ".num,.salary,.primary-number,.num-col,.projection,.score,.edge,.ownership,.lineup-table td:nth-child(n+3)";
    return {
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
      smallTargets: [...document.querySelectorAll("a,button,input,select,textarea,[role=button]")].filter((element) => visible(element) && getComputedStyle(element).display !== "inline").filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      }).map((element) => element.outerHTML.slice(0, 140)),
      duplicateIds: [...document.querySelectorAll("[id]")].map((element) => element.id).filter((id, index, ids) => ids.indexOf(id) !== index),
      badNumeric: [...document.querySelectorAll(numericSelector)].filter((element) => !getComputedStyle(element).fontVariantNumeric.includes("tabular-nums")).map((element) => element.textContent.trim()),
      badNumericFont: [...document.querySelectorAll(numericSelector)].filter((element) => !getComputedStyle(element).fontFamily.includes("IBM Plex Sans")).map((element) => element.textContent.trim()),
      badNumericAlignment: [...document.querySelectorAll(".primary-number,.salary,.num-col,.pick-price")].filter((element) => {
        const style = getComputedStyle(element);
        return style.textAlign !== "right" || style.whiteSpace !== "nowrap";
      }).map((element) => element.textContent.trim()),
      heroImageMismatch: (() => {
        const container = document.querySelector(".hero-visual").getBoundingClientRect();
        const image = document.querySelector(".hero-visual img").getBoundingClientRect();
        return Math.abs(container.height - image.height) > 2.1;
      })(),
      previewObjectFit: [...document.querySelectorAll(".asset-preview img")].map((image) => getComputedStyle(image).objectFit),
      priceLayout: getComputedStyle(document.querySelector(".pick-identity h3")).display,
      fonts: {
        display: document.fonts.check('700 16px "Big Shoulders"'),
        data: document.fonts.check('400 16px "IBM Plex Sans"'),
      },
    };
  });
  let axe = [];
  if (width === 390 || width === 1440) {
    await page.addScriptTag({ path: axePath });
    axe = await page.evaluate(async () => {
      const result = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
      return result.violations.map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.length, targets: violation.nodes.slice(0, 4).map((node) => node.target.join(" ")) }));
    });
  }
  const suffix = reducedMotion === "reduce" ? "-reduced" : "";
  await page.screenshot({ path: path.join(root, `reviews/site-${width}${suffix}.png`), fullPage: true });
  if (width === 390) await page.screenshot({ path: path.join(root, `reviews/mobile-fold${suffix}.png`), fullPage: false });
  const result = { width, reducedMotion, ...metrics, axe, errors, failedResponses };
  if (reducedMotion === "reduce") {
    await page.locator(".primary-action").hover();
    result.reducedHoverTransform = await page.locator(".primary-action").evaluate((element) => getComputedStyle(element).transform);
  }
  if (reducedMotion === "reduce") report.reducedMotion = result;
  else report.viewports.push(result);

  if (width === 390 && reducedMotion !== "reduce") {
    await page.getByRole("button", { name: "DFS", exact: true }).click();
    report.interactions.dfsVisible = await page.getByRole("table", { name: /13-game flagship GPP/i }).first().isVisible();
    report.interactions.dfsAxe = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => `${node.target.join(" ")}: ${node.failureSummary}`) })));
    await page.getByRole("button", { name: "Held", exact: true }).click();
    report.interactions.heldPressed = await page.getByRole("button", { name: "Held", exact: true }).getAttribute("aria-pressed");
    report.interactions.heldAxe = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map((violation) => ({ id: violation.id, targets: violation.nodes.map((node) => `${node.target.join(" ")}: ${node.failureSummary}`) })));
    await page.getByRole("button", { name: "Board", exact: true }).click();
    report.interactions.boardVisible = await page.getByText("CHI ML").first().isVisible();
    for (const relative of ["assets/og/gse-redline-og.png", "assets/social/gse-dfs-portrait.png", "assets/social/gse-redline-story.mp4"]) {
      const response = await page.request.get(`http://127.0.0.1:4173/${relative}`);
      report.downloads[relative] = response.status();
    }
  }
  await context.close();
}

async function auditSocial() {
  const page = await browser.newPage({ viewport: { width: 1700, height: 2000 } });
  await page.goto("http://127.0.0.1:4173/social.html?template=og", { waitUntil: "networkidle" });
  report.social = { ogHeaderBackground: await page.locator(".og .social-brand").evaluate((element) => getComputedStyle(element).backgroundColor) };
  await page.goto("http://127.0.0.1:4173/social.html?template=story", { waitUntil: "networkidle" });
  report.social.storyObjectPosition = await page.locator(".story-image img").evaluate((element) => getComputedStyle(element).objectPosition);
  await page.goto("http://127.0.0.1:4173/social.html?template=dfsCard", { waitUntil: "networkidle" });
  report.social.dfsTitleClass = await page.locator(".dfs-card-title h1").getAttribute("class");
  report.social.dfsTitleFont = await page.locator(".dfs-card-title h1").evaluate((element) => getComputedStyle(element).fontFamily);
  await page.close();
}

try {
  for (const width of [320, 390, 768, 1024, 1440]) await auditViewport(width);
  await auditViewport(390, "reduce");
  await auditSocial();
} finally {
  await browser.close();
}
await writeFile(path.join(root, "reviews/browser-audit.json"), JSON.stringify(report, null, 2));
const failures = [];
for (const result of [...report.viewports, report.reducedMotion]) {
  for (const key of ["overflow", "duplicateIds", "badNumeric", "badNumericFont", "badNumericAlignment", "brokenImages", "smallTargets", "axe", "errors", "failedResponses"]) {
    const value = result[key];
    if (value === true || (Array.isArray(value) && value.length)) failures.push(`${result.width}${result.reducedMotion === "reduce" ? " reduced" : ""}: ${key}=${JSON.stringify(value)}`);
  }
  if (!result.fonts.display || !result.fonts.data) failures.push(`${result.width}: font loading failed`);
  if (result.heroImageMismatch) failures.push(`${result.width}: hero image does not fill its container`);
  if (result.previewObjectFit.some((fit) => fit !== "contain")) failures.push(`${result.width}: asset previews crop meaningful content`);
  if (result.priceLayout !== "flex") failures.push(`${result.width}: pick prices are not in a shared numeric column`);
  if (result.reducedHoverTransform && result.reducedHoverTransform !== "none") failures.push(`Reduced motion hover transform: ${result.reducedHoverTransform}`);
}
if (report.social.ogHeaderBackground !== "rgb(8, 9, 12)") failures.push(`OG header lacks solid ground: ${report.social.ogHeaderBackground}`);
if (report.social.storyObjectPosition !== "50% 100%") failures.push(`Story crop is not bottom-positioned: ${report.social.storyObjectPosition}`);
if (!report.social.dfsTitleClass?.includes("num") || !report.social.dfsTitleFont?.includes("IBM Plex Sans")) failures.push("DFS social total is not IBM Plex tabular data type");
for (const key of ["dfsAxe", "heldAxe"]) if (report.interactions[key]?.length) failures.push(`Dynamic ${key}: ${JSON.stringify(report.interactions[key])}`);
if (!report.interactions.dfsVisible || report.interactions.heldPressed !== "true" || !report.interactions.boardVisible) failures.push("Interactive views failed");
for (const [name, status] of Object.entries(report.downloads)) if (status !== 200) failures.push(`${name}: HTTP ${status}`);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Responsive, accessibility, reduced-motion, font, numeric, interaction, and download checks passed");
