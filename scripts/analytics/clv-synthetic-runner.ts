/**
 * clv-synthetic-runner.ts — Wave 4 runner (decision D2).
 *
 * Injects a SEEDED SYNTHETIC open around each closing line and runs the CLV
 * harness end to end, so the pipeline is proven ready for a real archive.
 * EVERY line of output concerns synthetic entries: they measure nothing.
 *
 *   NODE_OPTIONS=--use-system-ca npx tsx scripts/analytics/clv-synthetic-runner.ts
 *
 * What a REAL archive must supply is printed at the end and encoded in
 * packages/prediction-engine/src/clv-harness.ts (requiredArchiveColumns).
 */

import { assertIngestible, fetchNflverse } from "../../packages/data-ingestion/src/index.js";
import { buildSyntheticOpen, clvFromEntry, formatSyntheticOpenWarning, requiredArchiveColumns } from "../../packages/prediction-engine/src/clv-harness.js";
import { summarizeClv, type ClvVerdict } from "../../packages/prediction-engine/src/clv.js";
import { toRawRow } from "../backfill/historical-settlement-backfill.js";

const MAX_JITTER = 1.0; // points; spreads/totals only
const SEASON_CAP = 3; // seasons to process — the sample size is meaningless by design
const SEED = 20260904;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 14), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main(): Promise<void> {
  const source = assertIngestible("nflverse");
  console.log(formatSyntheticOpenWarning());
  console.log(`legality: nflverse OK (${source.verdict}). ${source.attributionText}`);

  const { records } = await fetchNflverse("schedules", 0);
  const rng = mulberry32(SEED);

  const spreadItems: { value: number; verdict: ClvVerdict }[] = [];
  const totalItems: { value: number; verdict: ClvVerdict }[] = [];
  let unmeasurable = 0;

  const seasonOrder: number[] = []; // distinct seasons in encounter order (newest first)
  for (const r of records) {
    const raw = toRawRow(r);
    if (!raw || (raw.gameType ?? "REG") !== "REG") continue;
    if (raw.spreadLine == null || raw.totalLine == null) continue;
    if (!seasonOrder.includes(raw.season)) {
      if (seasonOrder.length >= SEASON_CAP) break; // cap = distinct seasons, not games
      seasonOrder.push(raw.season);
    }

    // Synthetic open = seeded jitter AROUND THE CLOSE. Entry price for spreads
    // is the standard -110 (the corpus has no per-entry price — exactly the
    // degeneracy that makes real CLV impossible here).
    const openSpread = buildSyntheticOpen(raw.spreadLine, MAX_JITTER, { seed: Math.floor(rng() * 2 ** 31) });
    const spreadRes = clvFromEntry(
      { market: "SPREAD", openHomeLine: openSpread, closeHomeLine: raw.spreadLine, side: "HOME" },
      { syntheticOpen: true },
    );
    if (spreadRes.unmeasurable || !spreadRes.points) unmeasurable++;
    else spreadItems.push({ value: spreadRes.points.clvPoints, verdict: spreadRes.points.verdict });

    const openTotal = buildSyntheticOpen(raw.totalLine, MAX_JITTER, { seed: Math.floor(rng() * 2 ** 31) });
    const totalRes = clvFromEntry(
      { market: "TOTAL", openTotal, closeTotal: raw.totalLine, side: "OVER" },
      { syntheticOpen: true },
    );
    if (totalRes.unmeasurable || !totalRes.points) unmeasurable++;
    else totalItems.push({ value: totalRes.points.clvPoints, verdict: totalRes.points.verdict });
  }

  console.log(`\n${formatSyntheticOpenWarning()}`);
  console.log(`\nSPREAD (HOME side), synthetic opens, seasons capped at ${SEASON_CAP}:`);
  const s = summarizeClv(spreadItems);
  console.log(`  n=${s.sampleSize}  beat ${s.beatCloseRate.toFixed(3)}  lost ${s.lostToCloseRate.toFixed(3)}  mean ${s.averageClv?.toFixed(3) ?? "null"} pts`);
  console.log(`TOTAL (OVER side), synthetic opens:`);
  const t = summarizeClv(totalItems);
  console.log(`  n=${t.sampleSize}  beat ${t.beatCloseRate.toFixed(3)}  lost ${t.lostToCloseRate.toFixed(3)}  mean ${t.averageClv?.toFixed(3) ?? "null"} pts`);
  console.log(`  unmeasurable entries: ${unmeasurable}`);
  console.log(`\n${formatSyntheticOpenWarning()}`);

  console.log(`\nA REAL CLV number requires an archive with these columns:`);
  for (const c of requiredArchiveColumns()) {
    console.log(`  ${c.required ? "REQUIRED" : "optional"}  ${c.name.padEnd(16)} ${c.description}`);
  }
  console.log(`\nNote: entry_line must be observable BEFORE kickoff and able to differ from`);
  console.log(`close_line. An archive where entry == close by construction yields CLV = 0`);
  console.log(`everywhere (degenerate) — that is the replay corpus's known limitation.`);
}

main().catch((err) => {
  console.error("\nclv-synthetic-runner fatal:", err);
  process.exit(1);
});
