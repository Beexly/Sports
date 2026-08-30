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
 * production uses, so no row is CLASSIFIED differently here than on the page.
 * A second query shape here would make the counts a claim about this script
 * rather than about the product.
 *
 * WHERE THAT SHARING STOPS — read this before acting on (5b). The normalizer is
 * shared; the READ WINDOW is not. An earlier version of this comment claimed
 * divergence was "impossible by construction". That was an overclaim:
 *
 *   this script                 production (`loadGateSlate`)
 *   SETTLED_LIMIT  = 50_000     settledLimit   = 5_000   (load-gate-slate.ts:538)
 *   PENDING_LIMIT  =  5_000     candidateLimit =   200   (load-gate-slate.ts:539)
 *   no sport filter             caller-scoped
 *
 * The pending window here is 25x wider than the board's, and neither window
 * dominates the other, so counts can differ in both directions. The consequence
 * that matters: (5b) can be satisfied by a candidate the board would never
 * load, so a non-zero (5b) is NOT by itself proof that the rendered page would
 * have anything to show. The truncation warning below guards only against THIS
 * script's caps, never against production's tighter ones.
 *
 * The wider window is deliberate — this script measures the whole history, not
 * the newest page — but it makes (5b) a measurement of the DATA, not a
 * prediction of the RENDER. Confirm against the real page before flipping
 * anything on the strength of it.
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
  const atFloor = [...byStratum.entries()].filter(
    ([, n]) => n >= MIN_STRATUM_CALIBRATION,
  );
  const strataAtFloor = atFloor.length;

  // Strata at the floor that a CURRENT candidate actually belongs to.
  //
  // The bare count is misleading on its own: 100 historical nfl|SPREAD|v1 rows
  // with only nba|MONEYLINE|v2 on today's board reports one stratum at the
  // floor, which reads as "the gate can evaluate" — while every row on the
  // board still returns INSUFFICIENT_CALIBRATION. The intersection is the
  // number that answers the question anyone is actually asking.
  const candidateStrata = new Set(part.candidates.rows.map((r) => r.stratum));
  const strataAtFloorWithCandidates = atFloor.filter(([s]) =>
    candidateStrata.has(s),
  ).length;

  // Either cap being hit truncates the READ, which means every count derived
  // from it — admitted calibration, evaluable candidates, strata at floor — is
  // a lower bound rather than a total. Saying "no stratum clears the floor"
  // from a truncated read would be exactly the kind of confident wrong answer
  // this script exists to avoid.
  const truncated =
    settledRaw.length === SETTLED_LIMIT || pendingRaw.length === PENDING_LIMIT;
  const q = truncated ? ">=" : "  ";

  console.log(bar());
  console.log("PHASE C — gate slate under production-strict filters");
  console.log(`measured at ${now.toISOString()}`);
  console.log(`calibration floor: ${MIN_STRATUM_CALIBRATION} rows per stratum`);
  console.log(bar());
  console.log(`(1) settled_raw_win_loss          ${q} ${settledRaw.length}`);
  console.log(`(2) settled_calibration_admitted  ${q} ${part.calibration.rows.length}`);
  console.log(`(3) pending_candidates_raw        ${q} ${pendingRaw.length}`);
  console.log(`(4) pending_candidates_evaluable  ${q} ${part.candidates.rows.length}`);
  console.log(`(5) strata_at_or_above_floor      ${q} ${strataAtFloor}`);
  console.log(`(5b) ...of those, with a current candidate: ${strataAtFloorWithCandidates}`);
  console.log(bar());

  // Stated at the point of decision, not only in the file header: (5b) is the
  // number the LIVE_BOARD go/no-go is read off, and it is measured over a
  // deliberately WIDER window than the board itself loads. An operator seeing
  // (5b) >= 1 must not read it as "the page would render something".
  console.log(
    [
      `SCOPE: measured over up to ${SETTLED_LIMIT.toLocaleString()} settled /`,
      `${PENDING_LIMIT.toLocaleString()} pending rows with no sport filter.`,
      "Production `loadGateSlate` reads 5,000 settled / 200 candidates and is",
      "caller-scoped, so (5b) is a claim about the DATA, not a prediction of the",
      "RENDER. Confirm against the real page before flipping anything.",
    ].join(" "),
  );
  console.log(bar());

  if (truncated) {
    console.log(
      [
        "PARTIAL READ: a read limit was reached, so EVERY count above is a lower",
        "bound, not a total — (2), (4) and (5) are derived from the capped arrays",
        "just as (1) and (3) are. Raise SETTLED_LIMIT / PENDING_LIMIT or paginate",
        "before treating any of these as a measurement.",
      ].join("\n"),
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

  // The reading is deliberately withheld on a truncated read. A definitive
  // "no stratum clears the floor" from a partial scan could be flatly wrong,
  // and a confident wrong conclusion is worse than no conclusion.
  if (truncated) {
    console.log(
      [
        "READING WITHHELD: the read was truncated, so neither conclusion is",
        "supportable from these numbers. Re-run with higher limits.",
      ].join("\n"),
    );
  } else if (strataAtFloorWithCandidates === 0) {
    console.log(
      [
        "READING: no stratum with a current candidate clears the floor, so every",
        "row on today's board would return INSUFFICIENT_CALIBRATION. That is the",
        "honest state of a young product, not a defect — and it is a reason NOT",
        "to flip LIVE_BOARD_GATE_SLATE yet, since a live board that declines",
        "every row for want of history says less to a reader than the labelled",
        "illustrative page does.",
        strataAtFloor > 0
          ? `NOTE: ${strataAtFloor} stratum/strata DO clear the floor, but no current` +
            " candidate belongs to them, so that history cannot help today's board."
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
  } else {
    console.log(
      `READING: ${strataAtFloorWithCandidates} stratum/strata with a current` +
        " candidate clear the floor, so the gate can genuinely evaluate there." +
        " Everything else returns INSUFFICIENT_CALIBRATION, which is the" +
        " truthful answer.",
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
