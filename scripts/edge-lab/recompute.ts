/**
 * GSE GLASS LEDGER — OPEN RECOMPUTE VERIFIER (handoff §2 Phase 2).
 *
 * Anyone can run this against a published ledger export and independently
 * reproduce every CLV figure and every integrity claim:
 *
 *   npx tsx scripts/edge-lab/recompute.ts <ledger-export.json>
 *
 * What it proves, with no trust in GSE required:
 *   - the chain of pick + settlement records is hash-linked and unbroken
 *     (editing ANY historical record breaks it visibly),
 *   - every pick's decision timestamp strictly precedes its kickoff,
 *   - every posted CLV number re-derives, within 0.5 bps, from the recorded
 *     decision price and closing price via the documented formula
 *     (clvBps = 10000 * (1/closing − 1/decision)),
 *   - the aggregate mean CLV is recomputed from raw entries, never copied.
 *
 * Closing prices can additionally be cross-checked against public odds
 * sources (e.g. nflverse's licensed closing lines) — the export carries the
 * book + market + kickoff needed to look each one up.
 *
 * Exit codes: 0 = fully reproduced · 2 = discrepancies (listed) · 3 = I/O.
 * No network, no secrets, no GSE infrastructure needed.
 */

import { readFileSync } from "node:fs";

import { recomputeLedger } from "../../packages/prediction-engine/src/edge-lab/recompute-verifier.js";
import type { LedgerEntry } from "../../packages/prediction-engine/src/edge-lab/ledger-chain.js";

function main(): number {
  const path = process.argv[2];
  if (!path) {
    console.error("usage: npx tsx scripts/edge-lab/recompute.ts <ledger-export.json>");
    return 3;
  }
  let entries: LedgerEntry[];
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    const maybe = (parsed as { entries?: unknown }).entries ?? parsed;
    if (!Array.isArray(maybe)) throw new Error("export must be an array or {entries: [...]}");
    entries = maybe as LedgerEntry[];
  } catch (err) {
    console.error(`could not read ledger export: ${err instanceof Error ? err.message : String(err)}`);
    return 3;
  }

  const report = recomputeLedger(entries);
  console.log(`chain:            ${report.chainValid ? "VALID" : `BROKEN at seq ${report.chainBrokenAt}`}`);
  console.log(`picks:            ${report.picks}`);
  console.log(`settlements:      ${report.settlements} (${report.gradedSettlements} CLV-graded)`);
  console.log(`pre-kickoff rule: ${report.kickoffViolations.length === 0 ? "HOLDS for every pick" : `VIOLATED: ${JSON.stringify(report.kickoffViolations)}`}`);
  if (report.clvDiscrepancies.length > 0) {
    console.log(`CLV discrepancies (${report.clvDiscrepancies.length}):`);
    for (const d of report.clvDiscrepancies) {
      console.log(`  seq ${d.seq} ${d.pickId}: recorded ${d.recordedBps} vs recomputed ${d.recomputedBps.toFixed(2)} (Δ ${d.deltaBps.toFixed(2)} bps)`);
    }
  } else {
    console.log(`CLV reproduction: every posted figure re-derives within 0.5 bps`);
  }
  console.log(
    `mean CLV (recomputed): ${report.recomputedMeanClvBps === null ? "n/a (nothing graded yet)" : `${report.recomputedMeanClvBps.toFixed(1)} bps over ${report.gradedSettlements} plays`}`,
  );
  console.log(report.reproduced ? "\nREPRODUCED — the record checks out." : "\nNOT REPRODUCED — see findings above.");
  return report.reproduced ? 0 : 2;
}

process.exit(main());
