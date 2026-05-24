#!/usr/bin/env node
/**
 * Daily session digest builder.
 *
 * Pure-template — no Claude call, no spend. Reads what already exists on
 * disk and assembles a markdown digest for an operator's end-of-day skim:
 *
 *   - CHANGELOG entries dated today
 *   - Telemetry totals for today (calls, errors, cache hit, USD)
 *   - Drafts written to _drafts/ today
 *
 * Writes `_digests/<YYYY-MM-DD>.md`. Intended for the daily-digest GH
 * Action which opens a PR with the file. Operator skims, merges (or
 * not — DRAFT-only).
 */

import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const REPO_ROOT = process.cwd();
const CHANGELOG = resolve(REPO_ROOT, "_logs", "CHANGELOG.md");
const TELEMETRY_LOG = resolve(REPO_ROOT, "_logs", "claude-usage.log");
const DRAFTS_DIR = resolve(REPO_ROOT, "_drafts");
const DIGESTS_DIR = resolve(REPO_ROOT, "_digests");
const MAX_LOG_BYTES = 5 * 1024 * 1024;

const today = (process.env.DIGEST_DATE_UTC ?? new Date().toISOString().slice(0, 10));
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
  console.error(`[daily-digest] invalid DIGEST_DATE_UTC=${today}`);
  process.exit(2);
}

// Inline pricing — mirrored from apps/web/lib/cockpit/ai-cost.ts. Update both.
const PRICING = {
  "claude-opus-4-7": { in: 15, cr: 1.5, cc: 18.75, out: 75 },
  "claude-sonnet-4-6": { in: 3, cr: 0.3, cc: 3.75, out: 15 },
  "claude-haiku-4-5": { in: 1, cr: 0.1, cc: 1.25, out: 5 },
};
const UNKNOWN_PRICING = PRICING["claude-sonnet-4-6"];

function numericOr(v, f = 0) {
  return typeof v === "number" && Number.isFinite(v) ? v : f;
}

async function readChangelogToday() {
  try {
    const text = await readFile(CHANGELOG, "utf8");
    const lines = text.split(/\r?\n/);
    return lines.filter((l) => l.startsWith(`${today} ·`));
  } catch {
    return [];
  }
}

async function readTelemetryToday() {
  let text = "";
  try {
    const s = await stat(TELEMETRY_LOG);
    if (s.size > MAX_LOG_BYTES) {
      const { open } = await import("node:fs/promises");
      const fh = await open(TELEMETRY_LOG, "r");
      try {
        const buf = Buffer.alloc(MAX_LOG_BYTES);
        await fh.read(buf, 0, MAX_LOG_BYTES, s.size - MAX_LOG_BYTES);
        text = buf.toString("utf8");
      } finally {
        await fh.close();
      }
    } else {
      text = await readFile(TELEMETRY_LOG, "utf8");
    }
  } catch {
    return null;
  }

  const rows = [];
  for (const raw of text.split(/\r?\n/)) {
    const t = raw.trim();
    if (!t) continue;
    try {
      const obj = JSON.parse(t);
      if (typeof obj.callSite !== "string" || typeof obj.model !== "string") continue;
      const ts = typeof obj.ts === "string" ? obj.ts : "";
      if (ts.slice(0, 10) !== today) continue;
      rows.push({
        callSite: obj.callSite,
        model: obj.model,
        inputTokens: numericOr(obj.inputTokens),
        cacheCreationInputTokens: numericOr(obj.cacheCreationInputTokens),
        cacheReadInputTokens: numericOr(obj.cacheReadInputTokens),
        outputTokens: numericOr(obj.outputTokens),
        latencyMs: numericOr(obj.latencyMs),
        status: obj.status === "error" ? "error" : "ok",
      });
    } catch {
      /* ignore */
    }
  }

  if (rows.length === 0) return { rows: 0, calls: 0, errors: 0, totalUsd: 0, bySite: [], cacheHitRate: 0 };

  const bySite = new Map();
  let totalUsd = 0;
  let totalInputs = 0;
  let totalCacheReads = 0;
  let errors = 0;
  for (const r of rows) {
    const p = PRICING[r.model] ?? UNKNOWN_PRICING;
    const usd = (r.inputTokens * p.in + r.cacheReadInputTokens * p.cr + r.cacheCreationInputTokens * p.cc + r.outputTokens * p.out) / 1_000_000;
    totalUsd += usd;
    totalInputs += r.inputTokens + r.cacheReadInputTokens;
    totalCacheReads += r.cacheReadInputTokens;
    if (r.status === "error") errors += 1;
    const b = bySite.get(r.callSite) ?? { calls: 0, usd: 0 };
    b.calls += 1;
    b.usd += usd;
    bySite.set(r.callSite, b);
  }

  return {
    rows: rows.length,
    calls: rows.length,
    errors,
    totalUsd,
    cacheHitRate: totalInputs > 0 ? totalCacheReads / totalInputs : 0,
    bySite: Array.from(bySite.entries())
      .map(([callSite, v]) => ({ callSite, calls: v.calls, usd: v.usd }))
      .sort((a, b) => b.usd - a.usd),
  };
}

async function readDraftsToday() {
  try {
    const entries = await readdir(DRAFTS_DIR);
    const matched = entries.filter((f) => f.startsWith(today));
    return matched.sort();
  } catch {
    return [];
  }
}

function renderTelemetryBlock(t) {
  if (t === null) {
    return "_Telemetry log not present — no Claude calls have run on this host yet._";
  }
  if (t.rows === 0) {
    return "_No Claude telemetry rows recorded today._";
  }
  const hitRatePct = `${Math.round(t.cacheHitRate * 1000) / 10}%`;
  const usd = `$${t.totalUsd.toFixed(4)}`;
  const lines = [
    `- **${t.calls} calls** (${t.errors} error${t.errors === 1 ? "" : "s"})`,
    `- **Spend: ${usd}** · cache hit rate ${hitRatePct}`,
    "",
    "| Call site | Calls | USD |",
    "| --- | ---: | ---: |",
  ];
  for (const s of t.bySite) {
    lines.push(`| \`${s.callSite}\` | ${s.calls} | $${s.usd.toFixed(4)} |`);
  }
  return lines.join("\n");
}

function renderChangelogBlock(entries) {
  if (entries.length === 0) {
    return "_No CHANGELOG entries dated today._";
  }
  return entries.map((line) => `- ${line.replace(/^[^·]+·\s*/, "")}`).join("\n");
}

function renderDraftsBlock(files) {
  if (files.length === 0) return "_No draft files written today._";
  return files.map((f) => `- \`_drafts/${f}\``).join("\n");
}

const [changelog, telemetry, drafts] = await Promise.all([
  readChangelogToday(),
  readTelemetryToday(),
  readDraftsToday(),
]);

const body = `# Daily digest · ${today}

Auto-generated by \`scripts/build-daily-digest.mjs\`. **Operator review only — nothing publishes.**

## What shipped

${renderChangelogBlock(changelog)}

## Claude activity

${renderTelemetryBlock(telemetry)}

## Drafts written

${renderDraftsBlock(drafts)}

---

_Generated ${new Date().toISOString()}_
`;

await mkdir(DIGESTS_DIR, { recursive: true });
const outPath = resolve(DIGESTS_DIR, `${today}.md`);
await writeFile(outPath, body, "utf8");

console.log(JSON.stringify({
  date: today,
  outPath,
  changelogEntries: changelog.length,
  telemetryRows: telemetry?.rows ?? 0,
  telemetryUsd: telemetry?.totalUsd ?? 0,
  draftFiles: drafts.length,
}));

console.log(`[daily-digest] wrote ${outPath}`);
