/**
 * GET /api/ops/signal-weight-tuning — READ-ONLY weight-tuning report.
 *
 * WHY. `tuneSignalWeights` (packages/prediction-engine/src/tune-signal-weights.ts)
 * derives signal weight multipliers from SETTLED OUTCOMES — the mechanism the
 * strategy doc demands ("tuned against outcomes... not guessed"). Until this
 * route existed it had only test callers: no production path ever fed it real
 * data, so no weight was ever earned from outcomes.
 *
 * WHAT IT DOES. Loads `pick_signal_snapshots` rows with
 * `eligibleForLearning = true`, projects the decisively-settled ones (WIN/LOSS;
 * PUSH excluded) into the tuner's `KeyOutcome[]` sample via
 * `lib/ops/tuning-sample.ts`, runs the tuner, and returns the per-key
 * verdicts. The sample is bounded (10,000 newest eligible snapshots) so the
 * report stays a report, not a full-table scan.
 *
 * LAWS OBSERVED:
 * - READS ONLY. No weight is persisted anywhere; applying tuned weights is
 *   the later weight/calibrate phase, behind its own gate. This route cannot
 *   move a single published number.
 * - CRON_SECRET Bearer <redacted>, same as the other ops routes.
 * - An empty eligible set is reported as `snapshotsUsed: 0` with an explicit
 *   note — a real state, not an error, and never papered over.
 * - No gate, no env flag, no schema change.
 */

import { NextResponse } from "next/server";
import { cronAuthError } from "@/lib/cron/authorize";
import { db } from "@sports/db";
import { tuneFromSnapshots, type TuningSnapshot } from "@/lib/ops/tuning-sample";
import { captureError } from "@/lib/observability/sentry";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Bounded sample: the report must stay a report, not a full-table scan. */
const MAX_SNAPSHOTS = 10_000;

export async function GET(req: Request): Promise<NextResponse> {
  const denied = await cronAuthError(req);
  if (denied) return denied;

  try {
    const rows = await db.pickSignalSnapshot.findMany({
      where: { eligibleForLearning: true },
      select: {
        pickId: true,
        settlementResult: true,
        hadLineMovementSignal: true,
        lineMovementDelta: true,
        hadRestSignal: true,
        restAdvantageNet: true,
        hadOddsSignal: true,
        hadScheduleSignal: true,
        hadAtsFormSignal: true,
        hadH2HSignal: true,
        hadVenueSignal: true,
        hadWeatherSignal: true,
        hadInjurySignal: true,
        hadRatingsSignal: true,
        hadPlayerSignal: true,
        hadOfficialsSignal: true,
        hadVenueEnvironmentSignal: true,
        hadPaceSignal: true,
        hadMilestoneSignal: true,
      },
      orderBy: { capturedAt: "desc" },
      take: MAX_SNAPSHOTS,
    });

    const snapshots: TuningSnapshot[] = rows.map((r) => ({
      pickId: r.pickId,
      settlementResult: r.settlementResult,
      hadLineMovementSignal: r.hadLineMovementSignal,
      lineMovementDelta: r.lineMovementDelta,
      hadRestSignal: r.hadRestSignal,
      restAdvantageNet: r.restAdvantageNet,
      hadOddsSignal: r.hadOddsSignal,
      hadScheduleSignal: r.hadScheduleSignal,
      hadAtsFormSignal: r.hadAtsFormSignal,
      hadH2HSignal: r.hadH2HSignal,
      hadVenueSignal: r.hadVenueSignal,
      hadWeatherSignal: r.hadWeatherSignal,
      hadInjurySignal: r.hadInjurySignal,
      hadRatingsSignal: r.hadRatingsSignal,
      hadPlayerSignal: r.hadPlayerSignal,
      hadOfficialsSignal: r.hadOfficialsSignal,
      hadVenueEnvironmentSignal: r.hadVenueEnvironmentSignal,
      hadPaceSignal: r.hadPaceSignal,
      hadMilestoneSignal: r.hadMilestoneSignal,
    }));

    const report = tuneFromSnapshots(snapshots);

    return NextResponse.json({
      success: true,
      data: {
        eligibleSnapshotsRead: rows.length,
        sampleBound: MAX_SNAPSHOTS,
        snapshotsUsed: report.snapshotsUsed,
        snapshotsSkippedUnsettled: report.snapshotsSkippedUnsettled,
        keyOutcomes: report.keyOutcomes,
        weights: report.weights.map((w) => ({
          key: w.key,
          n: w.n,
          correlation: Number(w.correlation.toFixed(4)),
          multiplier: Number(w.multiplier.toFixed(4)),
          verdict: w.verdict,
        })),
        keysWithoutReading: report.keysWithoutReading,
      },
      note:
        "READ-ONLY tuning report. Weights are COMPUTED from settled outcomes, never " +
        "persisted here — applying them is the later weight/calibrate phase behind " +
        "its own gate. snapshotsUsed: 0 means the settlement flow has not marked any " +
        "snapshot eligible yet, which is a real state, not an error.",
    });
  } catch (error) {
    captureError(error, { route: "ops/signal-weight-tuning" });
    return NextResponse.json(
      { success: false, error: "signal-weight-tuning failed" },
      { status: 500 },
    );
  }
}
