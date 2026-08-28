#!/usr/bin/env node
// Kalshi NFL market quote capture — appends to data/quotes/kalshi.jsonl
// Parse rules independent of market-quote-adapters.ts (Kalshi schema differs).
// Usage: node scripts/ops/fetch-kalshi-quotes.mjs
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const OUT = join(__dirname, "..", "..", "data", "quotes", "kalshi.jsonl");
mkdirSync(dirname(OUT), { recursive: true });
const URL_ = "https://api.elections.kalshi.com/trade-api/v2/markets?series_ticker=KXNFLGAME&limit=100";

const seen = new Set();
if (existsSync(OUT)) {
  for (const line of readFileSync(OUT, "utf8").split("\n")) {
    if (!line.trim()) continue;
    try { seen.add(JSON.parse(line).ticker); } catch {}
  }
}

const res = await fetch(URL_);
if (!res.ok) {
  console.error(`kalshi fetch failed: HTTP ${res.status}`);
  process.exit(1);
}
const { markets = [] } = await res.json();
let written = 0;
const now = new Date().toISOString();
for (const m of markets) {
  const bid = m.yes_bid_dollars ?? null;
  const ask = m.yes_ask_dollars ?? null;
  if (bid == null && ask == null) continue; // no tradable two-sided quote yet
  if (seen.has(m.ticker)) continue; // append-only: first snapshot per market kept for now
  const rec = {
    fetchedAt: now,
    platform: "kalshi",
    ticker: m.ticker,
    eventTicker: m.event_ticker,
    title: m.title ?? null,
    yesBid: bid,
    yesAsk: ask,
    lastPrice: m.last_price_dollars ?? null,
    liquidity: m.liquidity_dollars ?? null,
    closeTime: m.close_time ?? null,
  };
  appendFileSync(OUT, JSON.stringify(rec) + "\n");
  seen.add(m.ticker);
  written++;
}
console.log(`kalshi: ${markets.length} markets fetched, ${written} new records appended`);
