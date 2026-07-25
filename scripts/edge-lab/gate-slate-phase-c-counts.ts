/**
 * Phase C — how much calibration volume actually survives the strict filters.
 *
 * WHY THIS EXISTS. `/board/gate` must not be wired to the live slate on the
 * strength of unit tests. Six join defects shipped in #210's review round were
 * every one of them invisible to a unit test and obvious the moment you reason
 * about real rows: null team relations, one-odds-row-per-market, stale retained
 * quotes, line movement, post-kickoff PENDING. This script measures the thing
 * those defects distorted — how many rows genuinely clear the bar — so the
 * public flip is a decision about evidence rather than a hope.
 *
 * WHAT IT REFUSES TO DO. It does not reimplement the join. It imports the same
 * `GATE_SLATE_INCLUDE` and the same `partitionGateSlate` normalizer that
 * production uses, so a divergence between what this measures and what the page
 * would render is impossible by construction. A second query shape here would
 * make the counts a claim about this script rather than about the product.
 *
 * It also does not invent numbers. With no database it exits non-zero and says
 * so. An empty database would print zeros, and zeros presented as counts are
 * worse than no counts — they look like a measurement.
 *
 * EXPECTED RESULT. `INSUFFICIENT_CALIBRATION` dominating is SUCCESS. A stratum
 * needs MIN_STRATUM_CALIBRATION settled, learning-eligible, same-model-version
 * rows before the gate will fire in it, and a young product does not have that
 * yet. The honest reading of a small number here is "we cannot judge most of
 * this", which is exactly what the product claims.
 *
 * Usage:  DATABASE_URL=... npx tsx scripts/edge-lab/gate-slate-phase-c-counts.ts
 */

import { db, isStubMode } from "@sports/db";
import { MIN_STRATUM_CALIBRATION } from "@sports/prediction-engine/src/edge-lab/selective-gate.js";
import {
  GATE_SLATE_INCLUDE,
  partitionGateSlate,
  type GateSlatePick,
} from "../../apps/web/lib/board/load-gate-slate";

/** Cap the read so a large history cannot blow up memory on a laptop. */
const SETTLED_LIMIT = 50_000;
const PENDING_LIMIT = 5_000;

function bar(): string {
  return "─".repeat(64);
}

async function main(): Promise<void> {
  if (isStubMode()) {
    console.error(
      [
        "REFUSING TO REPORT COUNTS: no database is configured (stub Prisma client active).",
        "",
        "Every query would return empty and this script would print five zeros.",
        "Zeros presented as Phase C counts are worse than no counts — they read as",
        "a measurement of a young product rather than an absence of measurement.",
        "",
        "Run again with DATABASE_URL pointed at staging or a read-only replica:",
        "  DATABASE_URL=postgres://... npx tsx scripts/edge-lab/gate-slate-phase-c-counts.ts",
      ].join("\n"),
    );
    process.exit(1);
  }

  const now = new Date();

  // RAW settled: WIN/LOSS published picks, before any learning-provenance
  // filter. This is the denominator that makes the admitted count meaningful —
  // "412 admitted" says nothing until you know whether the pool was 500 or
  // 50,000.
  const settledRaw = await db.pick.findMany({
    where: { isPublished: true, result: { in: ["WIN", "LOSS"] } },
    orderBy: { settledAt: "desc" },
    take: SETTLED_LIMIT,
    include: GATE_SLATE_INCLUDE,
  });

  // RAW pending: every published PENDING pick, deliberately WITHOUT the
  // post-kickoff and freshness filters, so the drop those rules cause is
  // visible rather than assumed.
  const pendingRaw = await db.pick.findMany({
    where: { isPublished: true, result: "PENDING" },
    orderBy: { generatedAt: "desc" },
    take: PENDING_LIMIT,
    include: GATE_SLATE_INCLUDE,
  });

  // The SAME normalizer production uses. Not a second implementation.
  const part = partitionGateSlate(
    [
      ...(settledRaw as unknown as GateSlatePick[]),
      ...(pendingRaw as unknown as GateSlatePick[]),
    ],
    { now },
  );

  const byStratum = new Map<string, number>();
  for (const row of part.calibration.rows) {
    byStratum.set(row.stratum, (byStratum.get(row.stratum) ?? 0) + 1);
  }
  const strataAtFloor = [...byStratum.values()].filter(
    (n) => n >= MIN_STRATUM_CALIBRATION,
  ).length;

  console.log(bar());
  console.log("PHASE C — gate slate under production-strict filters");
  console.log(`measured at ${now.toISOString()}`);
  console.log(`calibration floor: ${MIN_STRATUM_CALIBRATION} rows per stratum`);
  console.log(bar());
  console.log(`(1) settled_raw_win_loss          ${settledRaw.length}`);
  console.log(`(2) settled_calibration_admitted  ${part.calibration.rows.length}`);
  console.log(`(3) pending_candidates_raw        ${pendingRaw.length}`);
  console.log(`(4) pending_candidates_evaluable  ${part.candidates.rows.length}`);
  console.log(`(5) strata_at_or_above_floor      ${strataAtFloor}`);
  console.log(bar());

  if (settledRaw.length === SETTLED_LIMIT || pendingRaw.length === PENDING_LIMIT) {
    console.log(
      "NOTE: a read limit was reached, so (1)/(3) are truncated, not totals.",
    );
    console.log(bar());
  }

  // Why rows were dropped. A bare count of survivors invites the reader to
  // assume the losses were uninteresting; naming them is the whole point of the
  // inputProblems channel.
  const reasonCounts = new Map<string, number>();
  for (const ex of [...part.calibration.excluded, ...part.candidates.excluded]) {
    for (const reason of ex.missing) {
      // Collapse to the parenthetical-free head so counts group sensibly.
      const key = reason.split(" (")[0] ?? reason;
      reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1);
    }
  }

  console.log("EXCLUSION REASONS (row-reason pairs, so a row may appear twice)");
  const reasons = [...reasonCounts.entries()].sort((a, b) => b[1] - a[1]);
  if (reasons.length === 0) console.log("  (none)");
  for (const [reason, n] of reasons) console.log(`  ${String(n).padStart(7)}  ${reason}`);
  console.log(`  ${String(part.undescribable).padStart(7)}  undescribable (row could not be described at all)`);
  console.log(bar());

  console.log("TOP STRATA BY ADMITTED CALIBRATION (sport|pickType|modelVersion)");
  const top = [...byStratum.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25);
  if (top.length === 0) console.log("  (no stratum admitted a single row)");
  for (const [stratum, n] of top) {
    const clears = n >= MIN_STRATUM_CALIBRATION ? "  <= at/above floor" : "";
    console.log(`  ${String(n).padStart(7)}  ${stratum}${clears}`);
  }
  console.log(bar());

  if (strataAtFloor === 0) {
    console.log(
      [
        "READING: no stratum clears the floor, so the gate would return",
        "INSUFFICIENT_CALIBRATION for everything. That is the honest state of a",
        "young product, not a defect — and it is a reason NOT to flip",
        "LIVE_BOARD_GATE_SLATE yet, since a live board that declines every row",
        "for want of history says less to a reader than the labelled",
        "illustrative page does.",
      ].join("\n"),
    );
  } else {
    console.log(
      `READING: ${strataAtFloor} stratum/strata clear the floor, so the gate can` +
        " genuinely evaluate there. Everything else returns" +
        " INSUFFICIENT_CALIBRATION, which is the truthful answer.",
    );
  }
  console.log(bar());
}

main()
  .catch((err: unknown) => {
    console.error("Phase C measurement failed:", err);
    process.exit(1);
  })
  .finally(() => {
    void db.$disconnect();
  });
