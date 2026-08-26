// scripts/ops/fetch-market-quotes.mjs
// NOTE: Inline parsing duplicated from packages/prediction-engine/src/edge-lab/features/market-quote-adapters.ts
// (reimplemented here so a plain .mjs can run without TS loader/import machinery).
// Same rules: Manifold BINARY only (probability field), Polymarket Gamma outcomePrices[0] as P(YES).

const QUOTES_FILE = "data/quotes/quotes.jsonl";

function ensureDir(p) {
  const d = path.dirname(p);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function unitInterval(v) {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 1) {
    throw new Error(`price not a finite value in [0,1]: ${String(v)}`);
  }
  return n;
}

function parseManifoldRow(raw) {
  if (typeof raw !== "object" || raw == null) throw new Error("manifold row must be an object");
  const m = raw;
  if (m.outcomeType !== "BINARY") return null;
  if (typeof m.id !== "string" || typeof m.question !== "string") throw new Error("manifold row missing id/question");
  return {
    fetchedAt: new Date().toISOString(),
    platform: "manifold",
    marketId: m.id,
    question: m.question,
    yesProb: unitInterval(m.probability),
    bestBid: null,
    bestAsk: null,
    url: typeof m.url === "string" ? m.url : `https://manifold.markets/market/${m.id}`,
    volume: typeof m.volume === "number" ? m.volume : null,
    liquidity: typeof m.liquidity === "number" ? m.liquidity : null,
  };
}

function parsePolymarketRow(raw) {
  if (typeof raw !== "object" || raw == null) throw new Error("gamma row must be an object");
  const m = raw;
  // Binary filter: outcomes array length 2 (binary yes/no). Parse JSON-string outcomes if needed.
  let outcomes = m.outcomes;
  if (typeof outcomes === "string") {
    try { outcomes = JSON.parse(outcomes); } catch (e) { return null; }
  }
  if (!Array.isArray(outcomes) || outcomes.length !== 2) return null;
  if (typeof m.id === "undefined" || typeof m.question !== "string") throw new Error("gamma row missing id/question");
  let prices = m.outcomePrices;
  if (typeof prices === "string") {
    try { prices = JSON.parse(prices); } catch (e) { return null; }
  }
  if (!Array.isArray(prices) || prices.length < 1) return null;
  const bid = m.bestBid == null ? null : unitInterval(m.bestBid);
  const ask = m.bestAsk == null ? null : unitInterval(m.bestAsk);
  return {
    fetchedAt: new Date().toISOString(),
    platform: "polymarket",
    marketId: String(m.id),
    question: m.question,
    yesProb: unitInterval(prices[0]),
    bestBid: bid,
    bestAsk: ask,
    url: typeof m.slug === "string" ? `https://polymarket.com/market/${m.slug}` : "",
    volume: typeof m.volume === "number" ? m.volume : (m.volume24hr == null ? null : Number(m.volume24hr)),
    liquidity: typeof m.liquidity === "number" ? m.liquidity : null,
  };
}

import fs from "fs";
import path from "path";

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} at ${url}`);
  return res.text();
}

async function run() {
  ensureDir(QUOTES_FILE);
  const records = new Map(); // dedupe within run by marketId keeping latest
  const statuses = [];

  // Manifold endpoint
  try {
    const text = await fetchText("https://api.manifold.markets/v0/markets?sort=last-bet-time&limit=50");
    const payload = JSON.parse(text);
    if (!Array.isArray(payload)) throw new Error("manifold payload not array");
    for (const row of payload) {
      try {
        const q = parseManifoldRow(row);
        if (q) records.set(q.marketId, q);
      } catch (e) {
        console.error("manifold parse error:", e.message);
      }
    }
    statuses.push({ endpoint: "manifold", status: "ok", count: payload.length, recordCount: [...records.values()].filter(r => r.platform === "manifold").length });
  } catch (e) {
    console.error("manifold fetch error:", e.message || String(e));
    statuses.push({ endpoint: "manifold", status: "error", error: e.message || String(e), count: 0, recordCount: 0 });
  }

  // Polymarket endpoint
  try {
    const text = await fetchText("https://gamma-api.polymarket.com/markets?closed=false&limit=50&order=volume24hr");
    const payload = JSON.parse(text);
    if (!Array.isArray(payload)) throw new Error("polymarket payload not array");
    for (const row of payload) {
      try {
        const q = parsePolymarketRow(row);
        if (q) records.set(q.marketId, q);
      } catch (e) {
        console.error("polymarket parse error:", e.message);
      }
    }
    statuses.push({ endpoint: "polymarket", status: "ok", count: payload.length, recordCount: [...records.values()].filter(r => r.platform === "polymarket").length });
  } catch (e) {
    console.error("polymarket fetch error:", e.message || String(e));
    statuses.push({ endpoint: "polymarket", status: "error", error: e.message || String(e), count: 0, recordCount: 0 });
  }

  // Append only; never rewrite existing lines
  for (const q of records.values()) {
    fs.appendFileSync(QUOTES_FILE, JSON.stringify(q) + "\n");
  }

  console.log("statuses:", JSON.stringify(statuses, null, 2));
  console.log("appended records:", records.size);
  console.log("file lines:", fs.existsSync(QUOTES_FILE) ? fs.readFileSync(QUOTES_FILE, "utf8").trim().split("\n").length : 0);
}

run();
