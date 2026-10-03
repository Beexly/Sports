/**
 * Database-backed calibration snapshots for regression detection.
 *
 * Thin wrapper: fetches settled picks the same way
 * `apps/web/lib/calibration/report.ts` does (same eligibility filter, so this
 * never disagrees with the public dashboard about which picks count), converts
 * confidence to a probability with the SAME clamp `computeCalibration` uses
 * (`confidence/100` clamped to [0.01, 0.99]), and hands the result to
 * `buildCalibrationSnapshot` from `@sports/prediction-engine` — the same
 * `brierDecomposition` used everywhere else in this codebase for Brier/RES, so
 * this is not a second, potentially-inconsistent scorer.
 *
 * PUSH results are excluded (not encoded as 0.5): `brierDecomposition`
 * requires a strictly binary `y`, and a push is a non-event for a proper
 * scoring rule, not a half-outcome.
 */

import { db } from "@sports/db";
import { buildCalibrationSnapshot, type CalibrationSnapshot } from "@sports/prediction-engine";
import type { CalibrationSample } from "@sports/prediction-engine";

function confidenceToProbability(confidence: number): number {
  return Math.max(0.01, Math.min(0.99, confidence / 100));
}

export interface WindowedSnapshotOptions {
  readonly windowDays?: number;
  readonly bins?: number;
}

/**
 * Snapshot over settled, eligible-for-learning, non-bootstrap picks with
 * `settledAt` in `[now - windowDays, now)`. Returns `null` on a DB error —
 * fails open, matching `loadPublicCalibrationReport`'s convention, so a
 * transient DB blip surfaces as "no verdict" rather than a false regression
 * alarm or a crash.
 */
export async function getRecentCalibrationSnapshot(
  now: Date = new Date(),
  options: WindowedSnapshotOptions = {},
): Promise<CalibrationSnapshot | null> {
  const windowDays = Number.isFinite(options.windowDays) && (options.windowDays as number) > 0
    ? (options.windowDays as number)
    : 14;
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const picks = await db.pick
    .findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: ["WIN", "LOSS"] },
        signalSnapshot: { is: { eligibleForLearning: true } },
        settledAt: { gte: windowStart, lt: now },
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      select: { confidence: true, result: true },
    })
    .catch(() => null);

  if (picks === null) return null;

  const samples: CalibrationSample[] = picks.map((pick) => ({
    p: confidenceToProbability(pick.confidence),
    y: pick.result === "WIN" ? 1 : 0,
  }));

  const label = `${windowStart.toISOString().slice(0, 10)}..${now.toISOString().slice(0, 10)}`;
  return buildCalibrationSnapshot(samples, label, options.bins ?? 10);
}
