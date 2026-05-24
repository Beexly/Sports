#!/usr/bin/env node
/**
 * AI daily cost ceiling guardrail.
 *
 * Reads `_logs/claude-usage.log`, estimates per-day Anthropic spend
 * using the published rates, and exits non-zero when any day in
 * the configured window exceeds AI_DAILY_COST_CEILING_USD (default $2).
 *
 * Designed for two contexts:
 *   1. CI / pre-commit — runs after npm test to catch a runaway
 *      test or local dev session.
 *   2. The nightly content workflow — invoked as a post-step so
 *      the operator gets the same fail-fast signal in production.
 *
 * Honors AI_DAILY_COST_WINDOW_DAYS (default 7) to clip the window.
 * Exits:
 *   0 — no breach in window
 *   1 — at least one day over ceiling
 *   2 — config / IO failure (distinct so CI doesn't treat config
 *       problems as actual breaches)
 */

import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const LOG_PATH = resolve(process.cwd(), "_logs", "claude-usage.log");
const DEFAULT_CEILING_USD = 2;
const DEFAULT_WINDOW_DAYS = 7;
const MAX_LOG_BYTES = 5 * 1024 * 1024;

const ceilingUsd = Number(process.env.AI_DAILY_COST_CEILING_USD ?? DEFAULT_CEILING_USD);
const windowDays = Number(process.env.AI_DAILY_COST_WINDOW_DAYS ?? DEFAULT_WINDOW_DAYS);

if (!Number.isFinite(ceilingUsd) || ceilingUsd <= 0) {
  console.error(`[ai-daily-cost] AI_DAILY_COST_CEILING_USD must be > 0 (got ${process.env.AI_DAILY_COST_CEILING_USD ?? "unset"})`);
  process.exit(2);
}
if (!Number.isFinite(windowDays) || windowDays <= 0) {
  console.error(`[ai-daily-cost] AI_DAILY_COST_WINDOW_DAYS must be > 0`);
  process.exit(2);
}

async function loadLogText() {
  let s;
  try {
    s = await stat(LOG_PATH);
  } catch {
    // No log yet — that's fine, nothing to check
    console.log(`[ai-daily-cost] no log at ${LOG_PATH} — nothing to check (exit 0)`);
    return null;
  }
  if (s.size > MAX_LOG_BYTES) {
    const { open } = await import("node:fs/promises");
    const fh = await open(LOG_PATH, "r");
    try {
      const buf = Buffer.alloc(MAX_LOG_BYTES);
      await fh.read(buf, 0, MAX_LOG_BYTES, s.size - MAX_LOG_BYTES);
      return buf.toString("utf8");
    } finally {
      await fh.close();
    }
  }
  return await readFile(LOG_PATH, "utf8");
}

const logText = await loadLogText();
if (logText === null) process.exit(0);

// Lazy-load the TS module via a workspace-relative path. apps/web is the
// canonical TS workspace; we import the compiled JS-shaped fns from src.
const moduleUrl = pathToFileURL(
  resolve(process.cwd(), "apps/web/lib/cockpit/ai-cost.ts")
).toString();

let aggregateDailyCost, findCeilingBreaches, parseTelemetryLog;
try {
  // Use a runtime TS loader if available; otherwise inline the JS shapes.
  // For the guardrail we re-implement the minimum logic inline so this
  // script has zero npm install requirement beyond node 20.
  const inline = await import(new URL("./_inline-ai-cost.mjs", import.meta.url).toString())
    .catch(() => null);
  if (inline) {
    aggregateDailyCost = inline.aggregateDailyCost;
    findCeilingBreaches = inline.findCeilingBreaches;
    parseTelemetryLog = inline.parseTelemetryLog;
  }
} catch {
  // fall through to inline below
}

if (!aggregateDailyCost) {
  // Inline minimum logic so the guardrail runs without a TS toolchain.
  // Keep these in sync with apps/web/lib/cockpit/ai-cost.ts (the
  // ai-daily-cost.test.ts asserts they match).
  const PRICING = {
    "claude-opus-4-7": { in: 15, cr: 1.5, cc: 18.75, out: 75 },
    "claude-sonnet-4-6": { in: 3, cr: 0.3, cc: 3.75, out: 15 },
    "claude-haiku-4-5": { in: 1, cr: 0.1, cc: 1.25, out: 5 },
  };
  const UNKNOWN = PRICING["claude-sonnet-4-6"];
  const numericOr = (v, f = 0) => (typeof v === "number" && Number.isFinite(v) ? v : f);

  parseTelemetryLog = (text) => {
    const out = [];
    for (const raw of text.split(/\r?\n/)) {
      const t = raw.trim();
      if (!t) continue;
      try {
        const obj = JSON.parse(t);
        if (typeof obj.callSite !== "string" || typeof obj.model !== "string") continue;
        out.push({
          ts: obj.ts,
          callSite: obj.callSite,
          model: obj.model,
          inputTokens: numericOr(obj.inputTokens),
          cacheCreationInputTokens: numericOr(obj.cacheCreationInputTokens),
          cacheReadInputTokens: numericOr(obj.cacheReadInputTokens),
          outputTokens: numericOr(obj.outputTokens),
        });
      } catch {
        /* ignore */
      }
    }
    return out;
  };

  const estimateRowCost = (row) => {
    const p = PRICING[row.model] ?? UNKNOWN;
    return (
      (row.inputTokens * p.in +
        row.cacheReadInputTokens * p.cr +
        row.cacheCreationInputTokens * p.cc +
        row.outputTokens * p.out) /
      1_000_000
    );
  };

  aggregateDailyCost = (rows) => {
    const byDay = new Map();
    for (const row of rows) {
      const ts = typeof row.ts === "string" ? row.ts : "";
      if (ts.length < 10) continue;
      const day = ts.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
      const cost = estimateRowCost(row);
      const bucket = byDay.get(day) ?? { calls: 0, totalUsd: 0 };
      bucket.calls += 1;
      bucket.totalUsd += cost;
      byDay.set(day, bucket);
    }
    return Array.from(byDay.entries())
      .map(([date, v]) => ({ date, calls: v.calls, totalUsd: v.totalUsd }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  };

  findCeilingBreaches = (daily, ceiling) =>
    daily.filter((d) => d.totalUsd > ceiling);
}

void moduleUrl; // referenced for future ts-loader paths

const rows = parseTelemetryLog(logText);

// Clip to the configured window.
const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
const cutoffKey = cutoff.toISOString().slice(0, 10);
const recent = aggregateDailyCost(rows).filter((d) => d.date >= cutoffKey);
const breaches = findCeilingBreaches(recent, ceilingUsd);

console.log(
  JSON.stringify({
    window: { days: windowDays, since: cutoffKey },
    ceilingUsd,
    totalDaysObserved: recent.length,
    breachCount: breaches.length,
    days: recent.map((d) => ({
      date: d.date,
      calls: d.calls,
      totalUsd: Math.round(d.totalUsd * 10000) / 10000,
    })),
  })
);

if (breaches.length > 0) {
  console.error(`[ai-daily-cost] FAIL — ${breaches.length} day(s) exceeded $${ceilingUsd}:`);
  for (const b of breaches) {
    console.error(`  ${b.date}: $${b.totalUsd.toFixed(4)} (${b.calls} calls)`);
  }
  process.exit(1);
}

console.log(`[ai-daily-cost] OK — no day in the last ${windowDays}d exceeded $${ceilingUsd}`);
process.exit(0);
