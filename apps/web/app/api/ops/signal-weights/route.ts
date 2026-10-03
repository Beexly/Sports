/**
 * GET /api/ops/signal-weights — the signal WEIGHTS, fitted against outcomes.
 *
 * THE GAP THIS CLOSES. `docs/ops/wiring-backlog-2026-10-01.md` Tier 1 item 4
 * recorded the measurement: "`tuneSignalWeights` + team crosswalk — the 'weight'
 * step. Zero non-test callers (barrel export only)." So the engine's per-signal
 * weight had exactly one value available to it — the flat `CATEGORY_PRIORS`
 * HEALTH 1.0 / PRODUCTION 1.0 — which `signal-scale-fit.ts` showed asserts ten
 * keys spanning 103x in standard deviation contribute equally. That route's
 * sibling, `/api/ops/signal-ledger-state`, already answers "is the table
 * populated"; this one answers "does any signal earn weight, and which".
 *
 * IT IS THE CALLER, NOT A VIEW OF ONE. Nothing else in the product invoked
 * `tuneSignalWeights`. This route does, through
 * `tuneSignalWeightsFromLedger` -> `measureSignalWeights` -> `tuneSignalWeights`.
 *
 * LAWS OBSERVED:
 * - CRON_SECRET bearer auth, default `bearer_only` (GSE-SEC-016). This route
 *   opts into NO relaxed mode.
 * - READ-ONLY. Selects from `signals` and `player_game_stats`; writes nothing to
 *   any table. Persisting a fitted weight into the ledger is a separate,
 *   founder-gated step — see the module header's "WHY IT DOES NOT WRITE".
 * - No env flag, no gate, no schema change, no MODEL_VERSION change.
 * - NEVER fabricates a weight. A key with no joinable settled outcome is
 *   reported at weight 0 with the reason attached, never defaulted to a
 *   plausible-looking number.
 *
 * The response carries the table, the drop counts that produced it, and a
 * plain-text report. An empty table on an empty `signals` table is a real
 * answer (`success: true`, `measuredCount: 0`), not an error and not a failure.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import { captureError } from "@/lib/observability/sentry";
import {
  toJsonEntry,
  tuneSignalWeightsFromLedger,
} from "@/lib/ops/signal-weight-tuner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request): Promise<NextResponse> {
  const denied = await cronAuthError(req);
  if (denied) return denied;

  try {
    const report = await tuneSignalWeightsFromLedger(db, {
      // Provenance strings, recorded ON the table so a weight can be traced to
      // the fit that produced it. A bare float with no source is the flat-1.0
      // defect wearing a different hat.
      version: "live-fit",
      source: `signals x player_game_stats, fitted live against next-week PPR above the REG median`,
    });

    return NextResponse.json({
      success: true,
      data: {
        version: report.version,
        source: report.source,
        signalsRead: report.signalsRead,
        outcomesRead: report.outcomesRead,
        sampleSize: report.sampleSize,
        outcomeThreshold: Number.isFinite(report.outcomeThreshold)
          ? Number(report.outcomeThreshold.toFixed(4))
          : null,
        outcomeBaseRate: Number.isFinite(report.outcomeBaseRate)
          ? Number(report.outcomeBaseRate.toFixed(4))
          : null,
        measuredCount: report.measuredCount,
        earnedCount: report.earnedCount,
        zeroWeightCount: report.zeroWeightCount,
        weights: report.weights,
        entries: report.entries.map(toJsonEntry),
        // Why observations are missing, counted by reason. A key here is an
        // UNJOINED key, not a dead producer, and the two have opposite fixes.
        drops: {
          teamLevel: report.droppedTeamLevel,
          seasonRollover: report.droppedSeasonRollover,
          noOutcome: report.droppedNoOutcome,
          noEntityStats: report.droppedNoEntityStats,
          nonRegSeasonTypes: report.excludedNonRegOutcomes,
        },
        keysPresent: report.keysPresent,
        unjoinableKeys: report.unjoinableKeys,
        reportText: report.reportText,
      },
      note:
        "READ-ONLY. No weight was written to `signals` or any other table. " +
        "A key at weight 0 is present and honest — it either had no joinable settled outcome " +
        "or did not clear the 100-distinct-fixture evidence floor — and it is NOT a dead producer. " +
        "Evidence is counted in DISTINCT FIXTURES, not rows, because the repo has measured that " +
        "rows inside one fixture are restatements of a single observation.",
    });
  } catch (error) {
    captureError(error, { tags: { surface: "signal-weights" } });
    return NextResponse.json(
      {
        success: false,
        error: "tuning failed",
        detail: error instanceof Error ? error.message : "unknown",
        note: "No weight was written and no table was persisted. A failed fit is silence, not a default.",
      },
      { status: 500 },
    );
  }
}