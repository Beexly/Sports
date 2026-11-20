// scripts/ops/autonomous-browser-finish.mjs
// Attaches to Garrett's already-logged-in Chrome (CDP on port 9222) so the operator
// finishes Latitude claim, NanoGPT Pro key retrieval, and Whop checkout link capture
// with ZERO manual clicking and writes directly to .env.local (never printing secrets).
//
// Usage:
//   1. Start Chrome with --remote-debugging-port=9222 (signed into Latitude, NanoGPT, Whop)
//   2. node scripts/ops/autonomous-browser-finish.mjs

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ENV_PATH = path.resolve(process.cwd(), ".env.local");
const CDP_URL = process.env.CHROME_CDP_URL || "http://127.0.0.1:9222";

const LATITUDE_CLAIM_URL =
  "https://console.latitude.so/claim/a3a62c112242c91fd16f80e5acd3d973212e2d38607feeed6fa10b451763c14a";
const NANOGPT_API_URL = "https://nano-gpt.com/api";
const WHOP_DASHBOARD_URL = "https://whop.com/dashboard/biz_jzvuDvevsatKWi/";

function readExistingEnv(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  }
  return out;
}

function upsertEnv(filePath, updates) {
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  for (const [key, val] of Object.entries(updates)) {
    if (!val) continue;
    const rx = new RegExp(`^${key}=.*$`, "m");
    if (rx.test(content)) {
      content = content.replace(rx, `${key}=${val}`);
    } else {
      content += (content.endsWith("\n") || content === "" ? "" : "\n") + `${key}=${val}\n`;
    }
  }
  fs.writeFileSync(filePath, content, "utf8");
}

async function main() {
  const existingEnv = readExistingEnv(ENV_PATH);
  const sentryUpdates = {};
  if (process.env.SENTRY_ORG_SLUG || existingEnv.SENTRY_ORG_SLUG) {
    sentryUpdates.SENTRY_ORG_SLUG = process.env.SENTRY_ORG_SLUG || existingEnv.SENTRY_ORG_SLUG;
  }
  if (process.env.SENTRY_AUTH_TOKEN || existingEnv.SENTRY_AUTH_TOKEN) {
    sentryUpdates.SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN || existingEnv.SENTRY_AUTH_TOKEN;
  }
  if (Object.keys(sentryUpdates).length > 0) {
    upsertEnv(ENV_PATH, sentryUpdates);
    console.log("[OK] Verified Sentry env keys present in .env.local (redacted)");
  }

  const browser = await chromium.connectOverCDP(CDP_URL);
  const context = browser.contexts()[0];
  if (!context) {
    throw new Error("No active Chrome context found on CDP " + CDP_URL);
  }

  // Task 1: Claim Latitude project gse-claude-content
  const latPage = await context.newPage();
  await latPage.goto(LATITUDE_CLAIM_URL, { waitUntil: "networkidle" });
  const claimBtn = latPage
    .locator("button:has-text('Claim'), button:has-text('Accept'), button:has-text('Continue')")
    .first();
  if (await claimBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await claimBtn.click();
    await latPage.waitForLoadState("networkidle");
    console.log("[OK] Latitude claim action triggered:", latPage.url());
  } else {
    console.log("[INFO] Latitude page state:", latPage.url());
  }

  // Task 2: NanoGPT Pro API Key (/api/subscription/v1 only, valid through Dec 5, 2026)
  const nanoPage = await context.newPage();
  await nanoPage.goto(NANOGPT_API_URL, { waitUntil: "networkidle" });
  const createKeyBtn = nanoPage
    .locator("button:has-text('Create'), button:has-text('Generate'), button:has-text('New API Key')")
    .first();
  const bodyText = await nanoPage.textContent("body");
  const existingKeyMatch = bodyText && bodyText.match(/sk-nano-[A-Za-z0-9_-]{20,}/);
  if (existingKeyMatch) {
    upsertEnv(ENV_PATH, { NANOGPT_API_KEY: existingKeyMatch[0] });
    console.log("[OK] Existing NANOGPT_API_KEY captured and saved to .env.local (redacted)");
  } else if (await createKeyBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
    await createKeyBtn.click();
    await nanoPage.waitForTimeout(2500);
    const updatedText = await nanoPage.textContent("body");
    const newKeyMatch = updatedText && updatedText.match(/sk-nano-[A-Za-z0-9_-]{20,}/);
    if (newKeyMatch) {
      upsertEnv(ENV_PATH, { NANOGPT_API_KEY: newKeyMatch[0] });
      console.log("[OK] New NANOGPT_API_KEY generated and saved to .env.local (redacted)");
    } else {
      console.log("[WARN] Clicked Create on NanoGPT but key pattern not auto-detected; inspect DOM snapshot.");
    }
  }

  // Task 3: Whop checkout links inventory (NEVER touch galaxysportsedge.com DNS settings!)
  const whopPage = await context.newPage();
  await whopPage.goto(WHOP_DASHBOARD_URL + "checkout-links/", { waitUntil: "networkidle" });
  const links = await whopPage.evaluate(() =>
    Array.from(document.querySelectorAll("a[href*='whop.com/checkout'], input[value*='whop.com/checkout']"))
      .map((el) => el.href || el.value)
      .filter(Boolean)
  );
  console.log("[INFO] Discovered Whop checkout links count:", links.length);
  fs.writeFileSync(
    path.resolve(process.cwd(), "data/engine/whop-discovered-links-2026-11-19.json"),
    JSON.stringify({ discovered_links: Array.from(new Set(links)) }, null, 2)
  );

  await browser.close();
}

main().catch((err) => {
  console.error("[ERR]", err.message);
  process.exit(1);
});
