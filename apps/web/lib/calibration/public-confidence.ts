// NOTE: server-only by construction (imports @sports/db / Prisma, which cannot
// run in a client bundle). The explicit `import "server-only"` is omitted
// because the repo's vitest config does not stub it and this module is pulled
// into the picks-route tests; the db import is the effective guard.
import { db } from "@sports/db";
import { buildCalibrator, type Calibrator } from "@sports/prediction-engine";

export { honestConfidence, type HonestConfidence } from "./honest-confidence";

/**
 * Public confidence calibration (Thread 2).
 *
 * Turns the raw heuristic confidence score into an HONEST, calibrated display
 * for public surfaces — but only when the audited calibrator is genuinely
 * active. The calibrator is self-suppressing: `buildCalibrator` returns an
 * inactive identity map unless there is a ≥100 settled sample AND the fitted
 * map does not worsen calibration. The held-out validation that justified
 * activation (ECE 0.198 → 0.044) is recorded in
 * docs/calibration-proposals/2026-06-22-calibration-activation-v5.1.0.md.
 *
 * Server-only. The calibrator is fit from learning-eligible settled (WIN/LOSS)
 * picks — the same gate the cockpit calibration view and the calibration report
 * use — and memoised with a short TTL so the hot picks path does not refit per
 * request.
 */

interface SettledRow {
  readonly confidence: number;
  readonly result: string;
}

let cached: { calibrator: Calibrator; at: number } | null = null;
const TTL_MS = 10 * 60 * 1000; // refit at most every 10 minutes

/** Build (or reuse) the public calibrator from learning-eligible settled picks. */
export async function getPublicCalibrator(now: number = Date.now()): Promise<Calibrator> {
  if (cached && now - cached.at < TTL_MS) return cached.calibrator;
  const rows: SettledRow[] = await db.pick
    .findMany({
      where: {
        result: { in: ["WIN", "LOSS"] },
        isBootstrap: false,
        signalSnapshot: { is: { eligibleForLearning: true } },
      },
      select: { confidence: true, result: true },
      orderBy: { settledAt: "desc" },
      take: 2000,
    })
    .catch(() => [] as SettledRow[]);
  const samples = rows.map((r) => ({
    p: Math.max(0, Math.min(1, r.confidence / 100)),
    y: (r.result === "WIN" ? 1 : 0) as 0 | 1,
  }));
  const calibrator = buildCalibrator(samples);
  cached = { calibrator, at: now };
  return calibrator;
}

/** Reset the memo — test-only. */
export function __resetPublicCalibratorCache(): void {
  cached = null;
}
