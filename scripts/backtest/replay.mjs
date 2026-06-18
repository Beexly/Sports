#!/usr/bin/env node
/**
 * replay.mjs — Workstream A4 OFFLINE backtest runner.
 *
 * Reads settled picks from either:
 *   1. The JSON written by `scripts/reality/export-picks.mjs`
 *      (data/reality-engine/inputs/settled-picks.json), or
 *   2. A read-only SELECT against the database when DATABASE_URL is set and the
 *      JSON export is not present.
 *
 * Calls the PURE `runBacktest` aggregator (apps/web/lib/reality/backtest.ts)
 * and writes a human-readable report to reports/reality-engine/latest-backtest.md.
 *
 * OFFLINE ONLY:
 *   - No schema change, no gate flip, no MODEL_VERSION bump.
 *   - No scoring change.
 *   - Read-only database access (zero writes, two SELECTs at most).
 *   - Never imported into the Next.js request path.
 *   - No new dependency (reuses already-present `pg` driver when needed).
 *
 * Graceful exit 0 on no DATABASE_URL / no input — mirrors the pattern in
 * `scripts/reality/diagnostics.mjs`.
 *
 * ── How to run ──────────────────────────────────────────────────────────────
 *   npm run backtest:replay
 *
 * The npm script uses `npx tsx` so the TypeScript aggregator can be imported
 * directly. Bare `node scripts/backtest/replay.mjs` also works for the no-input
 * graceful path (it exits 0 before importing any TypeScript).
 */

import process from "node:process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const JSON_INPUT_PATH = resolve(ROOT, "data/reality-engine/inputs/settled-picks.json");
const OUTPUT_PATH = resolve(ROOT, "reports/reality-engine/latest-backtest.md");
const BACKTEST_PATH = resolve(ROOT, "apps/web/lib/reality/backtest.ts");

const out = (s = "") => process.stdout.write(s + "\n");

/** Try reading the exported JSON from the reality export step. Returns null on miss. */
async function readJsonExport() {
  let raw;
  try {
    raw = await readFile(JSON_INPUT_PATH, "utf8");
  } catch {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.records) ? parsed.records : null;
  } catch (err) {
    out(`Export JSON is not valid (${err instanceof Error ? err.message : String(err)}). Skipping.`);
    return null;
  }
}

/**
 * Read settled picks from the database via a strictly read-only SELECT.
 * Returns null on any unavailability (no DATABASE_URL, no pg, unreachable).
 * Mirrors the graceful-exit posture of scripts/reality/export-picks.mjs.
 */
async function readPicksFromDb() {
  if (!process.env.DATABASE_URL) {
    out("DATABASE_URL is not set — no settled picks available in this environment.");
    out("This is expected outside production. Exiting cleanly.");
    return null;
  }

  let pg;
  try {
    pg = await import("pg");
  } catch {
    out("`pg` is not installed — cannot read settled picks from the DB.");
    out("Treating as no-input (not an error). Exiting cleanly.");
    return null;
  }

  const client = new pg.default.Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
  } catch (err) {
    out(`Database unreachable: ${err instanceof Error ? err.message : String(err)}`);
    out("Cannot read settled picks. Exiting cleanly.");
    try { await client.end(); } catch { /* ignore */ }
    return null;
  }

  try {
    // READ-ONLY SELECT: settled picks with the fields `runBacktest` requires.
    const result = await client.query(
      `SELECT p."modelVersion"       AS model_version,
              p."generatedAt"        AS generated_at,
              p."confidence"         AS confidence,
              p."result"             AS result,
              p."clvVerdict"         AS clv_verdict,
              p."clvValue"           AS clv_value,
              s."key"                AS sport,
              p."pickType"           AS market
         FROM picks p
         JOIN games g  ON g."id" = p."gameId"
         JOIN sports s ON s."id" = g."sportId"
        WHERE p."result" IN ('WIN','LOSS','PUSH','VOID')
        ORDER BY p."generatedAt" ASC NULLS LAST`,
    );

    return result.rows.map((r) => ({
      modelVersion: r.model_version ?? null,
      generatedAt: r.generated_at ? new Date(r.generated_at).toISOString() : null,
      confidence: r.confidence != null ? Number(r.confidence) : null,
      result: r.result ?? null,
      clvVerdict: r.clv_verdict ?? null,
      clvValue: r.clv_value != null ? Number(r.clv_value) : null,
      sport: r.sport ?? null,
      market: r.market ?? null,
    }));
  } catch (err) {
    out(`DB query failed: ${err instanceof Error ? err.message : String(err)}`);
    out("Treating as no-input (not an error). Exiting cleanly.");
    return null;
  } finally {
    try { await client.end(); } catch { /* ignore */ }
  }
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

/** Render a BacktestReport to honest markdown. */
function renderMarkdown(report) {
  const L = [];
  const pct = (x) => (typeof x === "number" ? `${(x * 100).toFixed(1)}%` : "n/a");
  const num = (x, digits = 4) => (typeof x === "number" ? x.toFixed(digits) : "n/a");
  const flag = (b) => (b === true ? "yes" : b === false ? "no" : "n/a");

  L.push("# Reality-Engine Backtest — latest");
  L.push("");
  L.push(`_Generated: ${new Date().toISOString()}_`);
  L.push("");
  L.push(
    "OFFLINE, READ-ONLY out-of-sample validation over SETTLED picks. " +
      "No scoring change, no schema change, no gate flip, no MODEL_VERSION bump. " +
      "Confidence remains the heuristic sum in scoring.ts.",
  );
  L.push("");

  if (report.status === "INSUFFICIENT_SAMPLE") {
    L.push("## Status: INSUFFICIENT SAMPLE");
    L.push("");
    L.push(`> ${report.insufficientSampleNote}`);
    L.push("");
    L.push("## Standing caveats (always on)");
    L.push("");
    for (const c of report.caveats) {
      L.push(`- ${c}`);
    }
    L.push("");
    return L.join("\n");
  }

  L.push("## Summary");
  L.push("");
  L.push(`- Total records: **${report.totalRecords}**`);
  L.push(`- Decided (WIN/LOSS): **${report.decidedRecords}**`);
  L.push(`- Holdout fraction: **${pct(report.options.holdoutFraction)}**`);
  L.push(`- Rolling windows: **${report.options.rollingWindowSizes.join(", ")}**`);
  L.push("");

  // Helper to render a SliceMetrics block.
  function renderSlice(metrics, label) {
    L.push(`### ${label}`);
    L.push("");
    L.push(`- n (total / decided): **${metrics.sampleSize}** / **${metrics.decidedSize}**`);
    L.push(
      `- Win rate: **${pct(metrics.winRate)}** ` +
        `(break-even at −110: **${pct(metrics.breakEvenRate)}** — ` +
        `clears break-even: **${flag(metrics.clearsBreakEven)}**)`
    );
    L.push(
      `- Edge over vig: **${metrics.edgeOverVig !== null ? (metrics.edgeOverVig >= 0 ? "+" : "") + (metrics.edgeOverVig * 100).toFixed(1) + "pp" : "n/a"}**`,
    );
    L.push(
      `  ⚠️ Raw win rate is NOT profit. A win rate above 52.38% is required at −110 to cover vig.`,
    );
    L.push(`- CLV beat-close rate: **${pct(metrics.clvBeatCloseRate)}** ← leading edge indicator`);
    L.push(`- Brier score: **${num(metrics.brierScore)}** (lower = better; 0 = perfect)`);
    L.push(
      `- ECE: **${num(metrics.ece)}** — calibration holds (ECE < 0.05): **${flag(metrics.calibrationHolds)}**`,
    );
    if (metrics.edgeSignificance) {
      const e = metrics.edgeSignificance;
      L.push(
        `- Edge significance: p=${e.winRatePValue} over ${e.trials} trials — ` +
          `significant at α=0.05: **${flag(e.significant)}** ` +
          `(${e.observedWins}/${e.picks} wins vs expected ${e.expectedWins})`,
      );
    } else {
      L.push(`- Edge significance: n/a — ${metrics.edgeSignificanceNote}`);
    }
    L.push("");
  }

  // Overall full-sample.
  L.push("## Overall metrics (all records, all versions)");
  L.push("");
  renderSlice(report.overallMetrics, "Full sample");

  // Out-of-sample split.
  L.push("## Out-of-sample split (overall)");
  L.push("");
  L.push(
    "> The holdout is the chronological tail — the model has NOT seen these picks. " +
      "In-sample calibration is optimistic by construction. The holdout is the honest number.",
  );
  L.push("");
  const oos = report.overallOutOfSample;
  L.push(`- Train / holdout sizes: **${oos.trainSize}** / **${oos.holdoutSize}**`);
  L.push(
    `- Calibration holds out-of-sample (holdout ECE ≤ in-sample ECE): **${flag(oos.calibrationHoldsOutOfSample)}**`,
  );
  L.push("");
  renderSlice(oos.holdoutMetrics, "Holdout (out-of-sample — the honest number)");
  renderSlice(oos.inSampleMetrics, "In-sample (training — optimistic by construction)");

  // Rolling windows.
  if (report.overallRollingWindows.length > 0) {
    L.push("## Rolling windows (overall — trailing N picks)");
    L.push("");
    L.push(
      "> Rolling windows surface strategy drift. A full-sample win rate can hide recency degradation.",
    );
    L.push("");
    L.push("| Window (N) | n decided | Win rate | Clears break-even | CLV beat-close | ECE |");
    L.push("|---|---|---|---|---|---|");
    for (const w of report.overallRollingWindows) {
      const m = w.metrics;
      L.push(
        `| trailing-${w.windowSize} | ${m.decidedSize} | ${pct(m.winRate)} | ${flag(m.clearsBreakEven)} | ${pct(m.clvBeatCloseRate)} | ${num(m.ece)} |`,
      );
    }
    L.push("");
  }

  // Per-modelVersion.
  if (report.byModelVersion.length > 0) {
    L.push("## Per-modelVersion breakdown");
    L.push("");
    for (const mv of report.byModelVersion) {
      L.push(`### Model version: \`${mv.modelVersion}\``);
      L.push("");
      renderSlice(mv.fullSampleMetrics, "Full sample");

      // OOS for this version.
      const mvOos = mv.outOfSample;
      L.push(
        `- OOS calibration holds: **${flag(mvOos.calibrationHoldsOutOfSample)}** ` +
          `(train=${mvOos.trainSize}, holdout=${mvOos.holdoutSize})`,
      );
      L.push(
        `  - Holdout win rate: **${pct(mvOos.holdoutMetrics.winRate)}** (in-sample: **${pct(mvOos.inSampleMetrics.winRate)}**)`,
      );
      L.push(
        `  - Holdout ECE: **${num(mvOos.holdoutMetrics.ece)}** (in-sample: **${num(mvOos.inSampleMetrics.ece)}**)`,
      );
      L.push("");

      // Rolling windows for this version.
      if (mv.rollingWindows.length > 0) {
        L.push("**Rolling windows:**");
        L.push("");
        L.push("| Window (N) | n decided | Win rate | Clears break-even | CLV beat-close | ECE |");
        L.push("|---|---|---|---|---|---|");
        for (const w of mv.rollingWindows) {
          const m = w.metrics;
          L.push(
            `| trailing-${w.windowSize} | ${m.decidedSize} | ${pct(m.winRate)} | ${flag(m.clearsBreakEven)} | ${pct(m.clvBeatCloseRate)} | ${num(m.ece)} |`,
          );
        }
        L.push("");
      }

      // Autopsy distribution.
      if (mv.autopsyCounts.length > 0) {
        L.push("**Autopsy distribution (process not scoreboard):**");
        L.push("");
        L.push("| Class | Count |");
        L.push("|---|---|");
        for (const c of mv.autopsyCounts) {
          L.push(`| ${c.cls} | ${c.count} |`);
        }
        L.push("");
      }

      // Edge-type distribution.
      if (mv.edgeTypeCounts.length > 0) {
        L.push("**Edge-type distribution (hypothesis tags, not proof):**");
        L.push("");
        L.push("| Type | Count |");
        L.push("|---|---|");
        for (const c of mv.edgeTypeCounts) {
          L.push(`| ${c.type} | ${c.count} |`);
        }
        L.push("");
      }
    }
  }

  L.push("## Standing caveats (always on)");
  L.push("");
  for (const c of report.caveats) {
    L.push(`- ${c}`);
  }
  L.push("");

  return L.join("\n");
}

/** Write a graceful no-input report and exit 0. Runs under bare node (no TS import). */
async function writeNoInputReport() {
  const md = [
    "# Reality-Engine Backtest — latest",
    "",
    `_Generated: ${new Date().toISOString()}_`,
    "",
    "**No input.** No settled-pick data was available.",
    "",
    "To run with data:",
    "1. Run `npm run reality:export` (read-only; exits cleanly with no DB) to write",
    "   `data/reality-engine/inputs/settled-picks.json`, then re-run `npm run backtest:replay`.",
    "2. Or set `DATABASE_URL` and run `npm run backtest:replay` directly.",
    "",
    "## Standing caveats (always on)",
    "",
    "- NEVER read raw win rate as profit: break-even at standard −110 juice is 52.38%.",
    "- Rolling windows exist because a strategy that worked once may stop.",
    "- The out-of-sample holdout is the honest calibration number; in-sample is optimistic.",
    "- CLV beat-close rate is the LEADING indicator of real edge.",
    "- This harness is READ-ONLY and OFFLINE. No scoring change, no schema change, no gate flip.",
    "",
  ].join("\n");
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, md, "utf8");
  out(`Wrote graceful no-input report → ${OUTPUT_PATH}`);
}

async function main() {
  out("");
  out("=== Reality-engine backtest (Workstream A4) ===");
  out("OFFLINE. Reads settled picks, runs out-of-sample validation, writes markdown report.");
  out("No DB write, no gate flip, no scoring change.");
  out("");

  // Step 1: Try the JSON export first (cheapest, no DB needed).
  let records = await readJsonExport();

  if (records !== null) {
    out(`Loaded ${records.length} records from JSON export at ${JSON_INPUT_PATH}.`);
  } else {
    // Step 2: Try the database.
    records = await readPicksFromDb();
  }

  // No input available → graceful no-input report and exit 0.
  if (records === null) {
    await writeNoInputReport();
    out("");
    process.exit(0);
  }

  // Input present → import the PURE backtest aggregator (TS, resolved by tsx via npm script).
  let runBacktest;
  try {
    ({ runBacktest } = await import(BACKTEST_PATH));
  } catch (err) {
    out("Could not load the TypeScript backtest aggregator under the current runtime.");
    out("Run via `npm run backtest:replay` (it uses tsx). Falling back to no-input report.");
    out(`(${err instanceof Error ? err.message : String(err)})`);
    await writeNoInputReport();
    process.exit(0);
  }

  const report = runBacktest(records);
  const md = renderMarkdown(report);

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, md, "utf8");

  out(`Backtest over ${report.totalRecords} records → ${OUTPUT_PATH}`);
  if (report.status === "INSUFFICIENT_SAMPLE") {
    out(`  Status: INSUFFICIENT_SAMPLE — ${report.insufficientSampleNote}`);
  } else {
    const m = report.overallMetrics;
    out(`  decided=${report.decidedRecords}, win rate=${m.winRate !== null ? (m.winRate * 100).toFixed(1) + "%" : "n/a"}, break-even=52.4%`);
    out(`  CLV beat-close=${m.clvBeatCloseRate !== null ? (m.clvBeatCloseRate * 100).toFixed(1) + "%" : "n/a"}, ECE=${m.ece !== null ? m.ece : "n/a"}`);
    out(`  out-of-sample calibration holds: ${report.overallOutOfSample.calibrationHoldsOutOfSample ?? "n/a"}`);
  }
  out("");
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`Unexpected backtest error: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
