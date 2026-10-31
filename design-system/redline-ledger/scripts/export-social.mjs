import { createRequire } from "node:module";
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(new URL("../site/package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const root = path.resolve(import.meta.dirname, "..");
const base = "http://127.0.0.1:4173/social.html";
const jobs = [
  ["og", "assets/og/gse-redline-og.png"],
  ["pickX", "assets/social/gse-pick-x.png"],
  ["dfsPortrait", "assets/social/gse-dfs-portrait.png"],
  ["heldSquare", "assets/social/gse-held-square.png"],
  ["productX", "assets/social/gse-product-x.png"],
  ["dfsCard", "assets/cards/gse-dfs-card.png"],
  ["story", "assets/social/gse-pick-story.png"],
];

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1700, height: 2000 }, deviceScaleFactor: 1 });
  for (const [template, relative] of jobs) {
    const output = path.join(root, relative);
    await mkdir(path.dirname(output), { recursive: true });
    await page.goto(`${base}?template=${template}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.locator("#card").screenshot({ path: output });
    const publicOutput = path.join(root, "site", "public", relative);
    await mkdir(path.dirname(publicOutput), { recursive: true });
    await copyFile(output, publicOutput);
    console.log(`Exported ${relative}`);
  }
} finally {
  await browser.close();
}
