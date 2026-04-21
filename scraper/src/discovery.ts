/**
 * DISCOVERY MODE
 *
 * Visits scores24.live pages and maps every useful network call:
 *  - XHR / fetch JSON endpoints (REST, GraphQL, Next.js data)
 *  - Inline page state (__NEXT_DATA__, __NUXT__, window.__INITIAL_STATE__)
 *  - WebSocket connections and frames
 *  - Hidden scripts with JSON embedded in HTML
 *
 * Outputs:
 *   data/raw/discovery-report.json      — full structured report
 *   data/raw/payloads/                  — raw JSON bodies for high-relevance endpoints
 *
 * Run:
 *   npm run discover
 */

import { chromium } from "playwright";
import * as path from "path";
import * as fs from "fs";
import type {
  CapturedEndpoint,
  CapturedWebSocket,
  DiscoveryReport,
  InlinePageData,
} from "./types.js";
import {
  sleep,
  sleepJitter,
  writeJson,
  ensureDir,
  detectAntiBot,
  scoreBodyRelevance,
  bodyHasTeams,
  bodyHasPredictions,
  bodyHasOdds,
  jsonSnippet,
  nowIso,
} from "./utils.js";

const BASE_URL = "https://scores24.live";
const RAW_DIR = path.resolve("data/raw");
const PAYLOAD_DIR = path.join(RAW_DIR, "payloads");

// Pages to visit during discovery.
// Ordered by expected richness — homepage first, then sport-specific.
const DISCOVERY_PAGES = [
  `${BASE_URL}/`,
  `${BASE_URL}/en`,
  `${BASE_URL}/en/predictions`,
  `${BASE_URL}/en/football`,          // NFL / soccer disambiguation common
  `${BASE_URL}/en/basketball`,
  `${BASE_URL}/en/baseball`,
  `${BASE_URL}/en/hockey`,
  `${BASE_URL}/en/american-football`,
  `${BASE_URL}/football`,
  `${BASE_URL}/basketball`,
  `${BASE_URL}/baseball`,
  `${BASE_URL}/predictions`,
  `${BASE_URL}/picks`,
];

// URL path patterns that strongly suggest an API endpoint
const API_PATH_RE = /(\/_next\/data\/|\/api\/|\/v\d+\/|\/graphql|\/predictions?|\/picks?|\/matches?|\/events?|\/games?|\/odds?|\/fixtures?|\.json)/i;

// Content-type patterns for JSON-bearing responses
const JSON_CT_RE = /application\/json|text\/json|application\/graphql/i;

// Maximum body size to read (bytes) to avoid OOM on large binary/media responses
const MAX_BODY_BYTES = 500_000;

async function run(): Promise<void> {
  const startMs = Date.now();
  ensureDir(RAW_DIR);
  ensureDir(PAYLOAD_DIR);

  const endpoints: CapturedEndpoint[] = [];
  const websockets: CapturedWebSocket[] = [];
  const inlineData: InlinePageData[] = [];
  const stabilityNotes: string[] = [];
  let totalRequests = 0;
  let jsonResponses = 0;
  let antiBotDetails: string | null = null;
  let cfPresent = false;

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    timezoneId: "America/New_York",
    extraHTTPHeaders: {
      "accept-language": "en-US,en;q=0.9",
      "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
    },
  });

  // Route handler: block heavy media to reduce noise and bandwidth
  await context.route(/\.(png|jpg|jpeg|gif|svg|woff2?|ttf|mp4|webm|css)(\?.*)?$/i, (route) =>
    route.abort()
  );

  const page = await context.newPage();

  // ── Track every outgoing request ──────────────────────────────
  page.on("request", (req) => {
    totalRequests++;
    const url = req.url();
    const method = req.method();
    if (API_PATH_RE.test(url) || JSON_CT_RE.test(req.headers()["accept"] ?? "")) {
      console.log(`  → ${method} ${url}`);
    }
  });

  // ── Capture every response ────────────────────────────────────
  page.on("response", async (res) => {
    const url = res.url();
    const status = res.status();
    const ct = (res.headers()["content-type"] ?? "").toLowerCase();

    // Only care about JSON-ish responses or API-path URLs
    const isJsonCt = JSON_CT_RE.test(ct);
    const isApiPath = API_PATH_RE.test(url);
    if (!isJsonCt && !isApiPath) return;

    // Skip tiny responses (often empty 200s or icons)
    const lengthHeader = parseInt(res.headers()["content-length"] ?? "0", 10);
    if (lengthHeader > MAX_BODY_BYTES) {
      console.log(`  ← [skip-large] ${status} ${url}`);
      return;
    }

    let bodyText = "";
    let parsed: unknown = null;
    try {
      bodyText = await res.text();
      if (isJsonCt || bodyText.trimStart().startsWith("{") || bodyText.trimStart().startsWith("[")) {
        parsed = JSON.parse(bodyText);
        jsonResponses++;
      }
    } catch {
      // Not parseable JSON — keep bodyText for anti-bot detection
    }

    // Anti-bot check
    const bot = detectAntiBot(bodyText, ct, url);
    if (bot.blocked) {
      antiBotDetails = bot.reason;
      cfPresent = (bot.reason ?? "").toLowerCase().includes("cloudflare");
      console.warn(`🚫 ANTI-BOT: ${bot.reason}`);
    }

    const relevance = scoreBodyRelevance(bodyText);
    const hasPred = bodyHasPredictions(bodyText);
    const hasOdds = bodyHasOdds(bodyText);
    const hasTeams = bodyHasTeams(bodyText);
    const hasTs = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(bodyText);

    const endpoint: CapturedEndpoint = {
      url,
      method: "GET",
      statusCode: status,
      contentType: ct,
      requestHeaders: {},
      responseSize: bodyText.length,
      hasPredictions: hasPred,
      hasOdds,
      hasTeams,
      hasTimestamps: hasTs,
      relevanceScore: relevance,
      bodyPreview: bodyText.slice(0, 800),
      bodySnippet: parsed ? jsonSnippet(parsed) : null,
      timestamp: nowIso(),
    };
    endpoints.push(endpoint);

    if (relevance >= 4) {
      console.log(
        `  ← [${status}] score=${relevance} pred=${hasPred} odds=${hasOdds} teams=${hasTeams} | ${url}`
      );
    }

    // Save high-relevance bodies to disk for offline analysis
    if (relevance >= 5 && parsed) {
      const slug = url.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").slice(0, 120);
      writeJson(path.join(PAYLOAD_DIR, `${slug}_${Date.now()}.json`), {
        url,
        status,
        contentType: ct,
        capturedAt: nowIso(),
        body: parsed,
      });
    }
  });

  // ── WebSocket tracking ────────────────────────────────────────
  page.on("websocket", (ws) => {
    const wsEntry: CapturedWebSocket = { url: ws.url(), openedAt: nowIso(), frames: [] };
    websockets.push(wsEntry);
    console.log(`  🔌 WebSocket opened: ${ws.url()}`);

    ws.on("framesent", (frame) => {
      const payload = String(frame.payload).slice(0, 1000);
      wsEntry.frames.push({ direction: "sent", payload, hasPredictions: bodyHasPredictions(payload), timestamp: nowIso() });
    });
    ws.on("framereceived", (frame) => {
      const payload = String(frame.payload).slice(0, 1000);
      const hasPred = bodyHasPredictions(payload);
      wsEntry.frames.push({ direction: "received", payload, hasPredictions: hasPred, timestamp: nowIso() });
      if (hasPred) console.log(`  🔌 WS prediction frame: ${payload.slice(0, 200)}`);
    });
    ws.on("close", () => console.log(`  🔌 WebSocket closed: ${ws.url()}`));
  });

  // ── Visit each discovery page ─────────────────────────────────
  const visitedUrls = new Set<string>();

  for (const pageUrl of DISCOVERY_PAGES) {
    if (visitedUrls.has(pageUrl)) continue;
    visitedUrls.add(pageUrl);

    console.log(`\n──────────────────────────────────────────────`);
    console.log(`📄 Visiting: ${pageUrl}`);

    try {
      const res = await page.goto(pageUrl, {
        waitUntil: "domcontentloaded",
        timeout: 25_000,
      });

      // If page redirected to a different URL, record the final URL
      const finalUrl = page.url();
      if (finalUrl !== pageUrl) {
        console.log(`  ↪ Redirected to: ${finalUrl}`);
        visitedUrls.add(finalUrl);
      }

      const status = res?.status() ?? 0;
      console.log(`  Status: ${status}`);
      if (status === 404) { await sleepJitter(500); continue; }
      if (status >= 400) console.warn(`  ⚠️  HTTP ${status}`);

      // Wait for any initial XHR burst to finish
      await sleep(3000);

      // Scroll to trigger lazy-loaded components and pagination calls
      await page.evaluate(() => {
        window.scrollTo(0, Math.floor(document.body.scrollHeight * 0.4));
      });
      await sleep(1000);
      await page.evaluate(() => {
        window.scrollTo(0, Math.floor(document.body.scrollHeight * 0.8));
      });
      await sleep(1000);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(2000);

      // ── Extract inline page state ─────────────────────────────
      const inlineResults = await extractInlineState(page, finalUrl);
      inlineData.push(...inlineResults);

      // ── Discover navigation links for sports pages ─────────────
      if (pageUrl === `${BASE_URL}/` || pageUrl === `${BASE_URL}/en`) {
        const discoveredLinks = await page.evaluate((base: string) => {
          const links = Array.from(document.querySelectorAll("a[href]")) as HTMLAnchorElement[];
          return links
            .map((a) => a.href)
            .filter((href) =>
              href.startsWith(base) &&
              !href.includes("#") &&
              !href.match(/\.(png|jpg|pdf|xml)$/)
            )
            .slice(0, 30);
        }, BASE_URL);

        console.log(`  📎 Found ${discoveredLinks.length} internal links`);

        // Add sport-like paths to visit queue (deduplicated)
        const sportPaths = discoveredLinks.filter((u) =>
          /\/(football|basketball|baseball|hockey|soccer|tennis|cricket|rugby|nfl|nba|mlb|nhl|predictions?|picks?|tips?)/i.test(u)
        );
        for (const sp of sportPaths.slice(0, 8)) {
          if (!visitedUrls.has(sp)) DISCOVERY_PAGES.push(sp);
        }
      }

      // ── Click sport/filter tabs if present ────────────────────
      await tryClickFilters(page);

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ Failed: ${msg}`);
      if (msg.includes("net::ERR_")) {
        console.error(`  Note: Network/DNS error — check if the domain resolves`);
      }
    }

    await sleepJitter(2500); // polite pause between pages
  }

  await browser.close();
  const durationMs = Date.now() - startMs;

  // ── Analyze and annotate stability ───────────────────────────
  annotateStability(endpoints, websockets, inlineData, stabilityNotes);

  // ── Build and save the report ─────────────────────────────────
  const endpointsWithPredictions = endpoints.filter((e) => e.hasPredictions || e.hasOdds).length;

  const report: DiscoveryReport = {
    target: BASE_URL,
    discoveredAt: nowIso(),
    durationMs,
    antiBot: {
      blocked: antiBotDetails !== null,
      blockDetails: antiBotDetails,
      cfPresent,
    },
    summary: {
      totalRequests,
      jsonResponses,
      endpointsWithPredictions,
      webSocketsFound: websockets.length,
      inlineDataFound: inlineData.length,
    },
    // Sort by relevance descending
    endpoints: endpoints.sort((a, b) => b.relevanceScore - a.relevanceScore),
    websockets,
    inlineData,
    stabilityNotes,
  };

  writeJson(path.join(RAW_DIR, "discovery-report.json"), report);

  console.log(`\n${"═".repeat(50)}`);
  console.log(`✅ Discovery complete in ${(durationMs / 1000).toFixed(1)}s`);
  console.log(`   Total requests:       ${totalRequests}`);
  console.log(`   JSON responses:       ${jsonResponses}`);
  console.log(`   Prediction endpoints: ${endpointsWithPredictions}`);
  console.log(`   WebSockets:           ${websockets.length}`);
  console.log(`   Inline data blocks:   ${inlineData.length}`);
  if (antiBotDetails) {
    console.log(`\n⚠️  ANTI-BOT DETECTED: ${antiBotDetails}`);
    console.log(`   Try running with HEADLESS=false or adding --wait flag`);
  }
  console.log(`\n   Report: data/raw/discovery-report.json`);
  if (endpointsWithPredictions > 0) {
    console.log(`\n   Top endpoints:`);
    endpoints
      .filter((e) => e.relevanceScore >= 4)
      .slice(0, 10)
      .forEach((e) => {
        console.log(`     [${e.relevanceScore}/10] ${e.url}`);
      });
  }
}

// ── Extract __NEXT_DATA__, __NUXT__, etc. from page HTML ──────
async function extractInlineState(
  page: import("playwright").Page,
  sourceUrl: string
): Promise<InlinePageData[]> {
  const results: InlinePageData[] = [];

  // Check for Next.js __NEXT_DATA__
  const nextData = await page.evaluate(() => {
    const el = document.getElementById("__NEXT_DATA__");
    return el?.textContent ?? null;
  });
  if (nextData) {
    try {
      const parsed = JSON.parse(nextData) as Record<string, unknown>;
      const hasPred = bodyHasPredictions(nextData);
      const keyPaths = extractKeyPaths(parsed, "", 3);
      results.push({
        url: sourceUrl,
        source: "__NEXT_DATA__",
        keyPaths,
        hasPredictions: hasPred,
        dataPreview: nextData.slice(0, 600),
        timestamp: nowIso(),
      });
      console.log(`  📦 __NEXT_DATA__ found (${nextData.length} chars, pred=${hasPred})`);
      console.log(`     Key paths: ${keyPaths.slice(0, 8).join(", ")}`);

      if (hasPred) {
        writeJson(
          path.join(PAYLOAD_DIR, `__NEXT_DATA__${sourceUrl.replace(/[^a-z0-9]/gi, "_").slice(0, 60)}_${Date.now()}.json`),
          { url: sourceUrl, source: "__NEXT_DATA__", body: parsed }
        );
      }
    } catch { /* malformed */ }
  }

  // Check for Nuxt hydration
  const nuxtData = await page.evaluate(() => {
    // @ts-expect-error runtime eval
    return typeof window.__NUXT__ !== "undefined" ? JSON.stringify(window.__NUXT__) : null;
  });
  if (nuxtData) {
    results.push({
      url: sourceUrl,
      source: "__NUXT__",
      keyPaths: [],
      hasPredictions: bodyHasPredictions(nuxtData),
      dataPreview: nuxtData.slice(0, 600),
      timestamp: nowIso(),
    });
    console.log(`  📦 __NUXT__ found (${nuxtData.length} chars)`);
  }

  // Check for window.__INITIAL_STATE__
  const initialState = await page.evaluate(() => {
    // @ts-expect-error runtime eval
    return typeof window.__INITIAL_STATE__ !== "undefined"
      // @ts-expect-error runtime eval
      ? JSON.stringify(window.__INITIAL_STATE__)
      : null;
  });
  if (initialState) {
    results.push({
      url: sourceUrl,
      source: "window.__INITIAL_STATE__",
      keyPaths: [],
      hasPredictions: bodyHasPredictions(initialState),
      dataPreview: initialState.slice(0, 600),
      timestamp: nowIso(),
    });
    console.log(`  📦 window.__INITIAL_STATE__ found (${initialState.length} chars)`);
  }

  // Check for JSON-LD structured data
  const jsonLd = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll("script[type='application/ld+json']"));
    return scripts.map((s) => s.textContent ?? "").filter(Boolean);
  });
  for (const ld of jsonLd) {
    if (bodyHasPredictions(ld) || bodyHasTeams(ld)) {
      results.push({
        url: sourceUrl,
        source: "json-ld",
        keyPaths: [],
        hasPredictions: bodyHasPredictions(ld),
        dataPreview: ld.slice(0, 600),
        timestamp: nowIso(),
      });
      console.log(`  📦 JSON-LD with prediction data found`);
    }
  }

  return results;
}

// ── Try clicking sport/filter tabs to trigger API calls ───────
async function tryClickFilters(page: import("playwright").Page): Promise<void> {
  // Look for tab/filter elements commonly found on sports prediction sites
  const selectors = [
    "nav a",
    "[data-sport]",
    "[data-tab]",
    ".sport-tab",
    ".sport-filter",
    ".tab-item",
    "button[role='tab']",
    ".nav-link",
    "ul.tabs li a",
  ];

  for (const sel of selectors) {
    try {
      const elements = await page.$$(sel);
      if (elements.length > 0 && elements.length <= 10) {
        console.log(`  🖱️  Clicking ${elements.length} "${sel}" elements`);
        for (const el of elements.slice(0, 4)) {
          try {
            await el.click({ timeout: 2000 });
            await sleep(800);
          } catch { /* not clickable, skip */ }
        }
        break; // only try the first matching selector set
      }
    } catch { /* selector not found, continue */ }
  }
}

// ── Annotate which endpoints look stable vs fragile ───────────
function annotateStability(
  endpoints: CapturedEndpoint[],
  websockets: CapturedWebSocket[],
  inlineData: InlinePageData[],
  notes: string[]
): void {
  const predEndpoints = endpoints.filter((e) => e.relevanceScore >= 5);

  if (predEndpoints.some((e) => e.url.includes("/_next/data/"))) {
    notes.push(
      "FRAGILE: /_next/data/ paths include a build hash (e.g. /_next/data/abc123/...) " +
        "that changes on every deployment. Parse the build ID from the homepage HTML and " +
        "construct paths dynamically. Alternative: use the underlying API route if one exists."
    );
  }
  if (predEndpoints.some((e) => /\/api\//i.test(e.url))) {
    notes.push(
      "STABLE: /api/ endpoints are typically versioned and stable between deployments. " +
        "Note any query parameters (sport, date, league) and replicate them in the collector."
    );
  }
  if (predEndpoints.some((e) => /\/v\d+\//i.test(e.url))) {
    notes.push(
      "MODERATE: Versioned API paths (/v1/, /v2/) are stable until the next major version bump. " +
        "Monitor for 404s that signal a version upgrade."
    );
  }
  if (websockets.some((ws) => ws.frames.some((f) => f.hasPredictions))) {
    notes.push(
      "FRAGILE (WS): WebSocket subscriptions often require auth tokens or session cookies. " +
        "The frame format may use protocol buffers or proprietary encodings. " +
        "Prefer REST polling over WebSocket for reliability."
    );
  }
  if (inlineData.some((d) => d.source === "__NEXT_DATA__" && d.hasPredictions)) {
    notes.push(
      "MODERATE: __NEXT_DATA__ contains SSR-injected props and is reliable on initial page load, " +
        "but requires a full browser round-trip (or matching the internal getServerSideProps API). " +
        "It avoids auth/CORS issues since it comes with the HTML response."
    );
  }
  if (predEndpoints.length === 0 && inlineData.filter((d) => d.hasPredictions).length === 0) {
    notes.push(
      "NO USEFUL ENDPOINTS FOUND: The site may be behind bot protection, require authentication, " +
        "or render predictions client-side via a non-standard mechanism. " +
        "Try: (1) running with headless=false, (2) adding longer waits, " +
        "(3) checking for iframe-embedded content, (4) inspecting script tags for embedded JSON."
    );
  }
}

// ── Depth-limited key path extractor ─────────────────────────
function extractKeyPaths(obj: unknown, prefix: string, maxDepth: number): string[] {
  if (maxDepth <= 0 || !obj || typeof obj !== "object") return [];
  const paths: string[] = [];
  if (Array.isArray(obj)) {
    if (obj.length > 0) paths.push(...extractKeyPaths(obj[0], `${prefix}[0]`, maxDepth - 1));
    return paths;
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const p = prefix ? `${prefix}.${k}` : k;
    paths.push(p);
    if (typeof v === "object" && v !== null) {
      paths.push(...extractKeyPaths(v, p, maxDepth - 1));
    }
  }
  return paths;
}


run().catch((err) => {
  console.error("Discovery failed:", err);
  process.exit(1);
});
