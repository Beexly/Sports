/**
 * GET /api/cron/signal-ledger-census
 *
 * THE CALL SITE #924 NEVER HAD. `signals` has held 0 rows since it was
 * created and `composeLedger` had no production reader; the populator
 * (V3-350), the census (V3-351) and the grouped tuner (V3-352) were reachable
 * only from tests. This job is the reader: it loads the four populated entity
 * tables, measures the anchor per signal key, and reports what the ledger
 * could hold today.
 *
 * LAWS OBSERVED:
 * - CRON_SECRET bearer auth only (`bearer_only`; this route is read-only but
 *   defaults to the strict mode rather than opting into the spoofable header).
 * - WRITES NOTHING. Not to `signals`, not to any table, not to disk except the
 *   ops artifact. Making the ledger writable is a SEPARATE, founder-gated step;
 *   see the "why this does not write" note below.
 * - No env flag, no gate, no schema change, no MODEL_VERSION change.
 * - Never fabricates an anchor: a key below the census floor is REPORTED as
 *   insufficient, never defaulted to a plausible number.
 *
 * WHY IT DOES NOT WRITE `signals`. Three reasons, in order of force:
 *  1. The repo's own lesson — `gate_decisions` has had three readers and no
 *     writer for 94 days, and code that reads a source nothing writes is worse
 *     than no code. A writer is a real commitment and deserves a real
 *     verification run, not a first-fire cron.
 *  2. The anchor scale is measured from a population that changes daily. A
 *     first write would persist today's baseline as if it were a constant.
 *  3. The publish path is a separate surface with its own review.
 * The report is the deliverable. If the census reads clean on real rows, the
 * write step is a small, obvious follow-up with the evidence already banked.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import { loadSignalLedger, type LedgerLoadReport } from "@/lib/ops/signal-ledger-loader";
import { captureError } from "@/lib/observability/sentry";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request): Promise<NextResponse> {
  const denied = await cronAuthError(req);
  if (denied) return denied;

  let report: LedgerLoadReport;
  try {
    report = await loadSignalLedger(db);
  } catch (error) {
    captureError(error, { tags: { surface: "signal-ledger-census" } });
    return NextResponse.json(
      {
        success: false,
        error: "load failed",
        detail: error instanceof Error ? error.message : "unknown",
        note: "No anchor was written and no candidate was persisted. A failed census is silence, not a default.",
      },
      { status: 500 },
    );
  }

  const { census, candidates, rowsRead, anchors } = report;

  // What the ledger could hold TODAY, stated as a count rather than a claim.
  const measuredKeys = Object.keys(anchors).filter((k) => k !== "injury.availability");

  return NextResponse.json({
    success: true,
    data: {
      rowsRead,
      candidateCount: candidates.length,
      // The declared (not fitted) ordinal scale, called out so it is never
      // mistaken for a measurement in a later diff.
      declaredScales: ["injury.availability"],
      measuredKeys,
      census: census.entries.map((e) => ({
        key: e.key,
        n: e.n,
        coverage: Number(e.coverage.toFixed(4)),
        status: e.status,
        anchor: Number.isFinite(e.anchor) ? Number(e.anchor.toFixed(6)) : null,
        spread: Number.isFinite(e.spread) ? Number(e.spread.toFixed(6)) : null,
      })),
      skipped: census.skipped,
      censusText: report.censusText,
    },
    note:
      "READ-ONLY census. Nothing was written to `signals` or any other table. " +
      "A key listed as insufficient-rows has a measured row count below the floor, NOT a missing producer. " +
      "Sample a candidate with: /api/ops/signal-ledger-census.",
  });
}
