#!/usr/bin/env node
/**
 * diagnostics.mjs — Workstream-K reality-engine OFFLINE diagnostics runner (slice B+D).
 *
 * Reads the exported JSON (data/reality-engine/inputs/settled-picks.json), calls the
 * PURE aggregator (apps/web/lib/reality/diagnostics.ts → buildDiagnosticsReport), and
 * writes a human-readable report to reports/reality-engine/latest-diagnostics.md.
 *
 * It is ANALYSIS ONLY — offline, batch, npm-scripted, NEVER imported into the Next.js
 * request path, NO new dependency. It reads files and writes one markdown report; it
 * touches no database, no gate, no MODEL_VERSION, no live scoring/display path.
 *
 * ── How to run ──────────────────────────────────────────────────────────────
 *   npm run reality:diagnostics
 *
 * The npm script runs it with `npx tsx` so the TypeScript aggregator can be imported
 * directly (same pattern as scripts/calibration/fit-and-validate.mjs). The no-INPUT
 * graceful path runs under bare `node` too: when the export file is missing, the script
 * prints a clear message and exits 0 BEFORE importing any TypeScript — so
 * `node scripts/reality/diagnostics.mjs` degrades cleanly with no input.
 */

import process from "node:process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const INPUT_PATH = resolve(ROOT, "data/reality-engine/inputs/settled-picks.json");
const OUTPUT_PATH = resolve(ROOT, "reports/reality-engine/latest-diagnostics.md");
const AGGREGATOR_PATH = resolve(ROOT, "apps/web/lib/reality/diagnostics.ts");

const out = (s = "") => process.stdout.write(s + "\n");

async function readInput() {
  let raw;
  try {
    raw = await readFile(INPUT_PATH, "utf8");
  } catch {
    return null; // no export present
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    out(`Export file is not valid JSON (${err instanceof Error ? err.message : String(err)}).`);
    return null;
  }
}

/** Render the structured DiagnosticsReport into honest markdown. */
function renderMarkdown(report, meta) {
  const L = [];
  const pct = (x) => (typeof x === "number" ? `${Math.round(x * 1000) / 10}%` : "n/a");
  const num = (x) => (x == null ? "n/a" : String(x));

  L.push("# Reality-Engine Diagnostics — latest");
  L.push("");
  L.push(`_Generated: ${new Date().toISOString()}_`);
  if (meta?.exportedAt) L.push(`_Source export: ${meta.exportedAt}_`);
  L.push("");
  L.push(
    "OFFLINE, READ-ONLY diagnostics over PUBLISHED settled picks. Confidence remains the " +
      "heuristic sum in scoring.ts; nothing here is wired into live confidence, schema, or any gate.",
  );
  L.push("");

  L.push("## Sample");
  L.push("");
  L.push(`- Total exported records: **${report.totalRecords}**`);
  L.push(`- Decided (WIN/LOSS) records: **${report.decidedRecords}**`);
  L.push(`- CLV-graded records: **${report.clvGradedRecords}**`);
  L.push("");

  L.push("## Calibration readiness (honest)");
  L.push("");
  L.push(report.calibration.statusLine);
  L.push("");
  L.push(
    `- Eligible learning sample: **${num(report.calibration.eligibleSampleSize) === "n/a" ? "unknown" : report.calibration.eligibleSampleSize}** ` +
      `/ floor **${report.calibration.floor}** — meets floor: **${report.calibration.meetsFloor ? "yes" : "no"}**`,
  );
  L.push("");

  L.push("## CLV by segment (sport / market / time-to-close / confidence band / unit)");
  L.push("");
  if (report.clvBySegment.length === 0) {
    L.push("_No CLV-graded picks in this export — CLV begins accruing once picks are graded against a closing line._");
  } else {
    L.push("| Segment | Unit | n | beat-close | lost-close | avg CLV | note |");
    L.push("|---|---|---|---|---|---|---|");
    for (const seg of report.clvBySegment) {
      const s = seg.summary;
      const label = seg.suppressed ? `${seg.segmentKey} _(collecting)_` : seg.segmentKey;
      L.push(
        `| ${label} | ${seg.unit} | ${s.sampleSize} | ${pct(s.beatCloseRate)} | ${pct(s.lostToCloseRate)} | ${num(s.averageClv)} | ${s.note} |`,
      );
    }
  }
  L.push("");
  L.push("### Global CLV rollup by unit (points and probability never mixed)");
  L.push("");
  if (report.clvGlobalByUnit.length === 0) {
    L.push("_No graded CLV yet._");
  } else {
    for (const g of report.clvGlobalByUnit) {
      L.push(`- **${g.unit}**: n=${g.summary.sampleSize}, beat-close ${pct(g.summary.beatCloseRate)}, avg CLV ${num(g.summary.averageClv)} — ${g.summary.note}`);
    }
  }
  L.push("");

  L.push("## Edge significance (over the decided sample)");
  L.push("");
  if (report.edgeSignificance) {
    const e = report.edgeSignificance;
    L.push(`- Picks: **${e.picks}**, observed wins: **${e.observedWins}**, no-edge expected wins: **${e.expectedWins}**`);
    L.push(`- p-value (sim wins ≥ observed | null): **${e.winRatePValue}** over ${e.trials} trials`);
    L.push(`- Significant at α=0.05: **${e.significant ? "yes" : "no"}**`);
  } else {
    L.push("_Not computed._");
  }
  L.push(`- ${report.edgeSignificanceNote}`);
  L.push("");

  L.push("## Edge-type counts (hypothesis tags, not proof of edge)");
  L.push("");
  L.push("| Edge type | count | detectable now |");
  L.push("|---|---|---|");
  for (const c of report.edgeTypeCounts) {
    L.push(`| ${c.type} | ${c.count} | ${c.detectableNow ? "yes" : "no"} |`);
  }
  L.push("");

  L.push("## Autopsy-class counts (process not scoreboard)");
  L.push("");
  if (report.autopsyCounts.length === 0) {
    L.push("_No classifiable settled picks._");
  } else {
    L.push("| Autopsy class | count |");
    L.push("|---|---|");
    for (const c of report.autopsyCounts) {
      L.push(`| ${c.cls} | ${c.count} |`);
    }
  }
  L.push("");

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
  out(`No export found at ${INPUT_PATH}.`);
  out("Run `npm run reality:export` first (it is read-only and exits cleanly without a DB).");
  const md = [
    "# Reality-Engine Diagnostics — latest",
    "",
    `_Generated: ${new Date().toISOString()}_`,
    "",
    "**No input.** No settled-pick export was found at " +
      "`data/reality-engine/inputs/settled-picks.json`.",
    "",
    "Run `npm run reality:export` (read-only; exits cleanly with no DB), then re-run " +
      "`npm run reality:diagnostics`.",
    "",
    "## Standing caveats (always on)",
    "",
    "- Building the record: confidence remains the heuristic sum in scoring.ts; nothing here " +
      "is wired into live confidence. These diagnostics are a read-only mirror.",
    "- No-bet ledger not yet wired: we do not yet log the markets we considered and rejected, " +
      "so no-bet (gate-quality) alpha cannot be measured here. This report covers only PUBLISHED picks.",
    "",
  ].join("\n");
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, md, "utf8");
  out(`Wrote graceful no-input report → ${OUTPUT_PATH}`);
}

async function main() {
  out("");
  out("=== Reality-engine diagnostics (Workstream-K, slice B+D) ===");
  out("OFFLINE. Reads exported JSON, writes a markdown report. No DB, no gate, no model change.");
  out("");

  const input = await readInput();

  // No-INPUT graceful path FIRST — runs under bare `node` (never imports TypeScript).
  if (input === null) {
    await writeNoInputReport();
    out("");
    process.exit(0);
  }

  // Input present → import the PURE aggregator (TS, resolved by tsx via the npm script).
  let buildDiagnosticsReport;
  try {
    ({ buildDiagnosticsReport } = await import(AGGREGATOR_PATH));
  } catch (err) {
    out("Could not load the TypeScript aggregator under the current runtime.");
    out("Run via `npm run reality:diagnostics` (it uses tsx). Falling back to no-input report.");
    out(`(${err instanceof Error ? err.message : String(err)})`);
    await writeNoInputReport();
    process.exit(0);
  }

  const records = Array.isArray(input.records) ? input.records : [];
  const readiness = { eligibleSampleSize: input.eligibleSampleSize ?? null };

  const report = buildDiagnosticsReport(records, readiness);
  const md = renderMarkdown(report, input);

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, md, "utf8");

  out(`Built diagnostics over ${report.totalRecords} records → ${OUTPUT_PATH}`);
  out(`  decided=${report.decidedRecords}, clv-graded=${report.clvGradedRecords}, segments=${report.clvBySegment.length}`);
  out("");
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`Unexpected diagnostics error: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
