/**
 * Platform-scheduler liveness — distinguishes "the platform stopped firing
 * crons at all" from "a job ran and legitimately found nothing to do".
 *
 * Incident context (2026-08-10): ingestion sat stale for 13+ hours. Every
 * downstream surface (`/api/health`, calibration eligibility, settlement)
 * reported the *symptom* — stale, frozen, degraded — but nothing said
 * whether the platform cron scheduler itself had gone dark, vs. a quiet
 * board with nothing new to ingest. Those look identical from any single
 * job's own logs; only cross-referencing multiple independent cadences
 * tells them apart.
 *
 * External Cron (`external-cron.yml`) is documented as a non-scheduler right
 * now (no GitHub Actions runner minutes on this private repo) — Vercel's
 * platform cron is the sole source of truth. When it silently stops (plan
 * cron caps, a disabled cron, a billing lapse), this is the only signal
 * that would ever say so.
 *
 * Method: three crons land a durable `IngestionRun` on every SUCCESS run,
 * even an empty one — free-spine-health (120m), refresh-player-stats (30m),
 * refresh-odds (15m, via the shared `processSport()` pipeline). Any ONE of
 * them firing resets the clock, so silence across all three for multiple
 * multiples of the loosest cadence is a strong, low-false-positive signal
 * that the scheduler — not the data — is the problem.
 */
import { db, isStubMode } from "@sports/db";
import { findCronEntry } from "./cron-schedule-manifest";

/**
 * Crons whose SUCCESS is durably observable via IngestionRun, regardless of
 * sport/oddsInserted/gamesUpserted — free-spine-health and
 * refresh-player-stats via `recordFreeIngestionRun`, refresh-odds via the
 * shared `processSport()` pipeline (packages/ingestion-pipeline).
 */
const INGESTION_OBSERVABLE_PATHS = [
  "/api/cron/refresh-odds",
  "/api/cron/free-spine-health",
  "/api/cron/refresh-player-stats",
] as const;

/** Missed the tightest cadence at least once — early heads-up, not alarm. */
const DEGRADED_THRESHOLD_MINUTES = 60;

/**
 * Silence past the loosest observable cadence (free-spine @120m) plus
 * generous jitter room. Chosen high enough that a single job's own retry
 * window or a brief platform blip cannot trip it — this verdict is meant to
 * be trusted at face value, not double-checked.
 */
const DEAD_THRESHOLD_MINUTES = 180;

export type SchedulerLivenessStatus = "healthy" | "degraded" | "dead" | "unknown";

export interface SchedulerLivenessResult {
  readonly status: SchedulerLivenessStatus;
  /** Most recent SUCCESS across any ingestion-observable cron, if any. */
  readonly lastAnyIngestionSuccessAt: string | null;
  readonly ageMinutes: number | null;
  /** Tightest declared cadence among the observable crons (minutes). */
  readonly tightestExpectedGapMinutes: number;
  readonly degradedThresholdMinutes: number;
  readonly deadThresholdMinutes: number;
  readonly operatorHint: string;
}

const FALLBACK_TIGHTEST_GAP_MINUTES = 15;

/** Tightest expected gap among the ingestion-observable crons, from the manifest. */
function tightestObservableGapMinutes(): number {
  let tightest: number | null = null;
  for (const path of INGESTION_OBSERVABLE_PATHS) {
    const gap = findCronEntry(path)?.expectedMaxGapMinutes;
    if (typeof gap === "number" && (tightest === null || gap < tightest)) tightest = gap;
  }
  return tightest ?? FALLBACK_TIGHTEST_GAP_MINUTES;
}

function buildResult(
  status: SchedulerLivenessStatus,
  lastAnyIngestionSuccessAt: string | null,
  ageMinutes: number | null,
  tightestExpectedGapMinutes: number,
  operatorHint: string,
): SchedulerLivenessResult {
  return {
    status,
    lastAnyIngestionSuccessAt,
    ageMinutes,
    tightestExpectedGapMinutes,
    degradedThresholdMinutes: DEGRADED_THRESHOLD_MINUTES,
    deadThresholdMinutes: DEAD_THRESHOLD_MINUTES,
    operatorHint,
  };
}

/**
 * Assess whether the platform cron scheduler is actually firing.
 * Never throws — this is diagnostic evidence, not a hard dependency.
 */
export async function assessSchedulerLiveness(
  nowMs: number = Date.now(),
): Promise<SchedulerLivenessResult> {
  const tightest = tightestObservableGapMinutes();

  if (isStubMode()) {
    return buildResult(
      "unknown",
      null,
      null,
      tightest,
      "Stub DB mode — scheduler liveness cannot be assessed (no durable IngestionRun store).",
    );
  }

  try {
    const lastSuccess = await db.ingestionRun.findFirst({
      where: { status: "SUCCESS" },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    });

    if (!lastSuccess?.completedAt) {
      return buildResult(
        "unknown",
        null,
        null,
        tightest,
        "No successful IngestionRun ever recorded — scheduler may never have fired, or DB is freshly seeded.",
      );
    }

    const ageMinutes = Math.round((nowMs - lastSuccess.completedAt.getTime()) / 60000);
    const isoTimestamp = lastSuccess.completedAt.toISOString();

    if (ageMinutes > DEAD_THRESHOLD_MINUTES) {
      return buildResult(
        "dead",
        isoTimestamp,
        ageMinutes,
        tightest,
        `No cron across any cadence (tightest ${tightest}m) has completed successfully in ${ageMinutes}m — ` +
          `well past the loosest observable interval. This reads as the platform scheduler not firing, not a quiet board. ` +
          `External Cron backstop is non-functional (no Actions runner minutes) — Vercel platform cron is the only ` +
          "scheduler; verify it in the Vercel dashboard, or fire a founder one-shot with CRON_SECRET to confirm the routes still work.",
      );
    }
    if (ageMinutes > DEGRADED_THRESHOLD_MINUTES) {
      return buildResult(
        "degraded",
        isoTimestamp,
        ageMinutes,
        tightest,
        `Last cron SUCCESS was ${ageMinutes}m ago — past the ${tightest}m tightest cadence but not yet conclusive. Watch for recovery.`,
      );
    }
    return buildResult(
      "healthy",
      isoTimestamp,
      ageMinutes,
      tightest,
      `Last cron SUCCESS ${ageMinutes}m ago — within expected cadence.`,
    );
  } catch {
    return buildResult(
      "unknown",
      null,
      null,
      tightest,
      "Failed to query IngestionRun — cannot assess scheduler liveness this request.",
    );
  }
}
