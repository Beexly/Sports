/**
 * COLLECTION MODE
 *
 * Two-phase collection strategy:
 *
 *   Phase 1 — Direct API (preferred):
 *     If discovery-report.json lists endpoints with relevanceScore >= 5,
 *     hit them directly with fetch, no browser needed.
 *
 *   Phase 2 — Browser interception (fallback):
 *     Navigate pages with Playwright, intercept every JSON response,
 *     normalize whatever is captured.
 *
 *   Phase 3 — DOM extraction (last resort):
 *     If neither phase yields picks, fall back to CSS-selector scraping.
 *
 * Outputs:
 *   data/raw/<sport>_<timestamp>.json        — raw API payloads
 *   data/normalized/picks.json              — deduplicated NormalizedPick[]
 *
 * Run:
 *   npm run collect
 *   npm run collect -- --sport nba
 *   npm run collect -- --date 2025-01-15
 */

import { chromium } from "playwright";
import * as path from "path";
import type { NormalizedPick, DiscoveryReport } from "./types.js";
import {
  sleep,
  sleepJitter,
  withRetry,
  deduplicatePicks,
  writeJson,
  readJsonIfExists,
  ensureDir,
  detectAntiBot,
  scoreBodyRelevance,
  bodyHasPredictions,
  nowIso,
} from "./utils.js";
import { normalizePayload, extractFromDom } from "./normalizer.js";

const BASE_URL = "https://scores24.live";
const RAW_DIR = path.resolve("data/raw");
const NORMALIZED_DIR = path.resolve("data/normalized");
const REPORT_PATH = path.join(RAW_DIR, "discovery-report.json");

// Minimum relevance score to consider an endpoint worth hitting directly
const MIN_DIRECT_API_SCORE = 5;

// Polite rate limit: never exceed 20 requests/min from any single IP
const DELAY_BETWEEN_REQUESTS_MS = 3500;
const DELAY_BETWEEN_PAGES_MS = 4000;

// Sports to collect if no --sport flag provided
const DEFAULT_SPORTS = [
  { key: "football", label: "NFL" },
  { key: "basketball", label: "NBA" },
  { key: "baseball", label: "MLB" },
  { key: "hockey", label: "NHL" },
];

// ── CLI arg parsing ───────────────────────────────────────────
function parseArgs(): { sport: string | null; date: string | null } {
  const args = process.argv.slice(2);
  const sportIdx = args.indexOf("--sport");
  const dateIdx = args.indexOf("--date");
  return {
    sport: sportIdx !== -1 ? (args[sportIdx + 1] ?? null) : null,
    date: dateIdx !== -1 ? (args[dateIdx + 1] ?? null) : null,
  };
}

async function run(): Promise<void> {
  const { sport: sportFilter, date: dateFilter } = parseArgs();
  ensureDir(RAW_DIR);
  ensureDir(NORMALIZED_DIR);

  console.log(`\n${"═".repeat(54)}`);
  console.log(`🏀 scores24.live collector`);
  console.log(`   sport filter : ${sportFilter ?? "all"}`);
  console.log(`   date filter  : ${dateFilter ?? "today"}`);
  console.log(`${"═".repeat(54)}\n`);

  const sports = sportFilter
    ? DEFAULT_SPORTS.filter((s) => s.key.toLowerCase() === sportFilter.toLowerCase() ||
                                   s.label.toLowerCase() === sportFilter.toLowerCase())
    : DEFAULT_SPORTS;

  if (sports.length === 0) {
    console.error(`Unknown sport: ${sportFilter}. Valid: ${DEFAULT_SPORTS.map((s) => s.key).join(", ")}`);
    process.exit(1);
  }

  // Load discovery report to check for known API endpoints
  const report = readJsonIfExists<DiscoveryReport>(REPORT_PATH);
  const directEndpoints = report
    ? report.endpoints.filter((e) => e.relevanceScore >= MIN_DIRECT_API_SCORE)
    : [];

  if (directEndpoints.length > 0) {
    console.log(`📋 Discovery report found — ${directEndpoints.length} high-relevance endpoints available`);
    console.log(`   Will try direct API first\n`);
  } else {
    console.log(`📋 No discovery report (or no high-relevance endpoints found)`);
    console.log(`   Run 'npm run discover' first for best results`);
    console.log(`   Falling back to browser interception mode\n`);
  }

  const allPicks: NormalizedPick[] = [];

  for (const sport of sports) {
    console.log(`\n── ${sport.label} (${sport.key}) ──────────────────────────`);

    // Filter direct endpoints that match this sport
    const sportEndpoints = directEndpoints.filter(
      (e) =>
        e.url.toLowerCase().includes(sport.key) ||
        e.url.toLowerCase().includes(sport.label.toLowerCase())
    );

    let picks: NormalizedPick[] = [];

    if (sportEndpoints.length > 0) {
      // Phase 1: Direct API
      picks = await collectViaDirectApi(sportEndpoints, sport.key, sport.label, dateFilter);
    }

    if (picks.length === 0 && directEndpoints.length > 0) {
      // Phase 1b: Try generic direct endpoints (not sport-specific)
      const genericEndpoints = directEndpoints.filter(
        (e) => !DEFAULT_SPORTS.some((s) => e.url.toLowerCase().includes(s.key))
      );
      if (genericEndpoints.length > 0) {
        picks = await collectViaDirectApi(genericEndpoints, sport.key, sport.label, dateFilter);
      }
    }

    if (picks.length === 0) {
      // Phase 2: Browser interception
      picks = await collectViaBrowser(sport.key, sport.label, dateFilter);
    }

    console.log(`  ✅ ${picks.length} picks collected for ${sport.label}`);
    allPicks.push(...picks);
    await sleepJitter(DELAY_BETWEEN_PAGES_MS);
  }

  // Deduplicate and save
  const deduplicated = deduplicatePicks(allPicks);
  const outputPath = path.join(NORMALIZED_DIR, "picks.json");

  writeJson(outputPath, {
    generatedAt: nowIso(),
    total: deduplicated.length,
    sports: [...new Set(deduplicated.map((p) => p.sport))],
    picks: deduplicated,
  });

  console.log(`\n${"═".repeat(54)}`);
  console.log(`✅ Collection complete`);
  console.log(`   Raw total  : ${allPicks.length}`);
  console.log(`   Dedupd     : ${deduplicated.length}`);
  console.log(`   Output     : ${outputPath}`);
}

// ── Phase 1: Direct API fetch (no browser) ───────────────────

async function collectViaDirectApi(
  endpoints: DiscoveryReport["endpoints"],
  sport: string,
  label: string,
  dateFilter: string | null
): Promise<NormalizedPick[]> {
  const picks: NormalizedPick[] = [];

  for (const endpoint of endpoints.slice(0, 5)) {
    console.log(`  🌐 Direct API: ${endpoint.url}`);

    try {
      const raw = await withRetry(
        `fetch ${endpoint.url}`,
        async () => {
          // Inject date param if known and relevant
          let url = endpoint.url;
          if (dateFilter && /date|day|from/i.test(url)) {
            const u = new URL(url);
            u.searchParams.set("date", dateFilter);
            url = u.toString();
          }

          const res = await fetch(url, {
            headers: {
              "user-agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              accept: "application/json, text/plain, */*",
              "accept-language": "en-US,en;q=0.9",
              referer: BASE_URL + "/",
            },
          });

          const text = await res.text();
          const ct = res.headers.get("content-type") ?? "";

          const botCheck = detectAntiBot(text, ct, url);
          if (botCheck.blocked) {
            throw new Error(`Anti-bot block: ${botCheck.reason}`);
          }
          if (!res.ok) {
            throw new Error(`HTTP ${res.status} from ${url}`);
          }

          return JSON.parse(text) as unknown;
        },
        2,
        DELAY_BETWEEN_REQUESTS_MS
      );

      // Save raw payload
      const slug = endpoint.url.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
      writeJson(path.join(RAW_DIR, `${label}_${slug}_${Date.now()}.json`), {
        url: endpoint.url,
        capturedAt: nowIso(),
        body: raw,
      });

      const normalized = normalizePayload(raw, {
        sourceUrl: endpoint.url,
        pageType: "api-direct",
        sport: label,
        league: label,
      });

      console.log(`    → ${normalized.length} picks normalized`);
      picks.push(...normalized);
      await sleep(DELAY_BETWEEN_REQUESTS_MS);

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`    ⚠️  Failed: ${msg}`);
    }
  }

  return picks;
}

// ── Phase 2: Browser interception ────────────────────────────

async function collectViaBrowser(
  sport: string,
  label: string,
  dateFilter: string | null
): Promise<NormalizedPick[]> {
  const pagesToVisit = buildPageList(sport, dateFilter);
  const picks: NormalizedPick[] = [];

  console.log(`  🌍 Browser mode: ${pagesToVisit.length} pages`);

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    timezoneId: "America/New_York",
  });

  await context.route(/\.(png|jpg|jpeg|gif|svg|woff2?|ttf|mp4|webm|css)(\?.*)?$/i, (r) => r.abort());

  const page = await context.newPage();

  // Capture every JSON response
  const capturedBodies: Array<{ url: string; data: unknown }> = [];

  page.on("response", async (res) => {
    const url = res.url();
    const ct = res.headers()["content-type"] ?? "";
    const isJson = /application\/json/i.test(ct);
    const looksLikeApi = /\/(api|v\d+|data|predictions?|picks?|matches?|events?|games?)[\/?]/i.test(url);

    if (!isJson && !looksLikeApi) return;

    try {
      const text = await res.text();
      const score = scoreBodyRelevance(text);
      if (score < 3) return;

      const data = JSON.parse(text) as unknown;

      // Save high-relevance raw payload
      if (score >= 5) {
        const slug = url.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
        writeJson(path.join(RAW_DIR, `${label}_${slug}_${Date.now()}.json`), {
          url,
          capturedAt: nowIso(),
          score,
          body: data,
        });
      }

      capturedBodies.push({ url, data });
      console.log(`    ← [score=${score}] ${url}`);
    } catch { /* not JSON or too large */ }
  });

  for (const pageUrl of pagesToVisit) {
    console.log(`  📄 ${pageUrl}`);

    try {
      const res = await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 25_000 });
      const status = res?.status() ?? 0;

      if (status === 404) { console.log(`    skip (404)`); continue; }

      const antiBot = detectAntiBot(await page.content(), "text/html", pageUrl);
      if (antiBot.blocked) {
        console.warn(`    🚫 BLOCKED: ${antiBot.reason}`);
        console.warn(`    Stopping browser collection — try headless=false or longer delays`);
        break;
      }

      await sleep(2500);

      // Scroll to trigger lazy loading
      await page.evaluate(() => {
        window.scrollTo(0, Math.floor(document.body.scrollHeight / 2));
      });
      await sleep(1000);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(2000);

      // Check __NEXT_DATA__ inline
      const nextData = await page.evaluate(() => {
        const el = document.getElementById("__NEXT_DATA__");
        return el?.textContent ?? null;
      });
      if (nextData && bodyHasPredictions(nextData)) {
        const parsed = JSON.parse(nextData) as unknown;
        capturedBodies.push({ url: pageUrl, data: parsed });
        console.log(`    📦 __NEXT_DATA__ with prediction data`);
      }

      // Phase 3 DOM fallback if nothing captured so far for this page
      const beforeCount = capturedBodies.length;
      await sleep(500); // brief settle
      if (capturedBodies.length === beforeCount) {
        console.log(`    ⚠️  No JSON captured — trying DOM extraction`);
        const domPicks = await extractFromDom(page, pageUrl, label);
        if (domPicks.length > 0) {
          console.log(`    📋 DOM: ${domPicks.length} picks extracted`);
          picks.push(...domPicks);
        }
      }

    } catch (err) {
      console.error(`    ❌ ${(err as Error).message}`);
    }

    await sleepJitter(DELAY_BETWEEN_PAGES_MS);
  }

  await browser.close();

  // Normalize all captured JSON bodies
  for (const { url, data } of capturedBodies) {
    const normalized = normalizePayload(data, {
      sourceUrl: url,
      pageType: "browser-intercept",
      sport: label,
      league: label,
    });
    picks.push(...normalized);
  }

  return picks;
}

// ── Build page list for a sport ───────────────────────────────

function buildPageList(sport: string, dateFilter: string | null): string[] {
  const base = `${BASE_URL}`;
  const dateParam = dateFilter ? `?date=${dateFilter}` : "";

  return [
    `${base}/${sport}${dateParam}`,
    `${base}/en/${sport}${dateParam}`,
    `${base}/en/predictions/${sport}${dateParam}`,
    `${base}/predictions/${sport}${dateParam}`,
    `${base}/${sport}/predictions${dateParam}`,
  ];
}

run().catch((err) => {
  console.error("Collector failed:", err);
  process.exit(1);
});
