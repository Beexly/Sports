/**
 * King Standard — computed public scoring for /stats and /stats/proof.
 *
 * Replaces the literal `KING_DIMENSIONS` scores and `proofScore = 61` that
 * previously rendered on those pages (see reports/audits/public-number-audit-
 * 2026-07-16.md, findings #1-2: a hardcoded, non-computed score presented
 * with visual specificity on the page whose stated purpose is "the honest
 * proof layer"). Every dimension here is either:
 *
 *   - `{ score, basis }`      — a real number computed from a real, named
 *                               input, with the computation stated inline.
 *   - `{ notMeasured, reason }` — no honest runtime signal exists yet
 *                               (unreachable DB, missing snapshot, etc). This
 *                               is NEVER collapsed to 0 or any other literal;
 *                               a 0 is a real (bad) measurement, not the same
 *                               thing as "we could not check."
 *
 * This module is the PURE, I/O-free core: every function is a deterministic
 * transform of its explicit inputs, so it is fully unit-testable without a
 * database or filesystem. The thin server loader that gathers those real
 * inputs (Prisma queries, StatKing snapshot reads, the prediction-engine
 * metrics catalog) lives in `king-standard-loader.ts` — kept as a SEPARATE
 * file (not merged into this one) specifically so this pure core stays
 * importable from Vitest (jsdom) without pulling in `@sports/db` or Node
 * `fs`, matching how `lib/calibration/compute.ts` is split from
 * `lib/calibration/report.ts` elsewhere in this codebase.
 */

import { auditStatCoverage } from "@/lib/statking/stat-coverage-auditor";
import { classifyRefreshFreshness, REFRESH_STALE_AFTER_MINUTES } from "@/lib/data-reliability/refresh-sla";

// ---------------------------------------------------------------------------
// Shared dimension types
// ---------------------------------------------------------------------------

export interface MeasuredDimension {
  readonly score: number; // 0-100
  readonly basis: string; // one-line, human-readable "computed from X"
}

export interface NotMeasuredDimension {
  readonly notMeasured: true;
  readonly reason: string; // why no honest signal exists right now
}

export type KingDimension = MeasuredDimension | NotMeasuredDimension;

export function isMeasured(dimension: KingDimension): dimension is MeasuredDimension {
  return !("notMeasured" in dimension);
}

export type KingStandardDimensionKey = "sourceCoverage" | "liveFeeds" | "proofArchive" | "metricDepth";

export const KING_DIMENSION_LABELS: Record<KingStandardDimensionKey, string> = {
  sourceCoverage: "Source Coverage",
  liveFeeds: "Live Feeds",
  proofArchive: "Proof Archive",
  metricDepth: "Metric Depth",
};

// Exported so pages render dimensions in one canonical order instead of each
// hardcoding (and risking drift from) the same four keys.
export const KING_DIMENSION_ORDER: readonly KingStandardDimensionKey[] = [
  "sourceCoverage",
  "liveFeeds",
  "proofArchive",
  "metricDepth",
];

const DIMENSION_ORDER = KING_DIMENSION_ORDER;

export type KingStandardDimensions = Record<KingStandardDimensionKey, KingDimension>;

export interface KingStandardOverall {
  readonly measuredCount: number;
  readonly totalDimensions: number;
  /** null only when measuredCount is 0 — no dimension has a live signal. */
  readonly score: number | null;
  readonly basis: string;
}

export interface KingStandardResult {
  readonly overall: KingStandardOverall;
  readonly dimensions: KingStandardDimensions;
}

// ---------------------------------------------------------------------------
// Local numeric helpers (mirrors the local `round`/clamp pattern already used
// in lib/calibration/compute.ts rather than reaching into
// @sports/prediction-engine's internal math module for two one-line helpers).
// ---------------------------------------------------------------------------

function round(value: number): number {
  return Math.round(value);
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, value));
}

// ---------------------------------------------------------------------------
// Source Coverage — implemented-vs-required ratio from the stat-coverage
// auditor (lib/statking/stat-coverage-auditor.ts: auditStatCoverage).
// Deterministic: identical inputs always produce an identical score.
// ---------------------------------------------------------------------------

export function computeSourceCoverage(
  requiredStats: readonly string[],
  implementedStats: readonly string[],
): KingDimension {
  if (requiredStats.length === 0) {
    return {
      notMeasured: true,
      reason:
        "no required data-type catalog is available to audit coverage against " +
        "(the StatKing coverage snapshot is missing or empty)",
    };
  }

  const gaps = auditStatCoverage(requiredStats, implementedStats);
  const implementedCount = requiredStats.length - gaps.length;
  const score = clampScore(round((implementedCount / requiredStats.length) * 100));
  const gapList = gaps.map((gap) => gap.statKey).join(", ");

  return {
    score,
    basis:
      `computed from the stat-coverage auditor: ${implementedCount}/${requiredStats.length} ` +
      `required data types implemented` +
      (gaps.length > 0 ? ` (gaps: ${gapList})` : " (no gaps)"),
  };
}

// ---------------------------------------------------------------------------
// Metric Depth — size of the real, code-defined metrics catalog in the
// prediction engine (packages/prediction-engine/src/metrics/core/metric-
// birth-certificate-registry.ts, re-exported as
// GSE_PROPRIETARY_METRIC_BIRTH_CERTIFICATES). Every entry there is a real,
// tested metric module, not a fixture, so this is a compile-time constant
// with no failure mode — always measured, never notMeasured.
// ---------------------------------------------------------------------------

export function computeMetricDepth(catalogCount: number): MeasuredDimension {
  const count = Math.max(0, Math.round(catalogCount));
  const score = clampScore(count);
  return {
    score,
    basis:
      `computed from ${count} registered metric module${count === 1 ? "" : "s"} in the ` +
      "prediction-engine metrics catalog (packages/prediction-engine/src/metrics) — " +
      "1 point per module, capped at 100",
  };
}

// ---------------------------------------------------------------------------
// Proof Archive — real DB counts: settled/graded canonical picks, normalized
// against the platform's own settled-sample readiness floor
// (MIN_SETTLED_PICKS_FOR_LEARNING / minSettledPicksForLearning, default 100 —
// the same floor /performance uses before it will publish a win rate), plus
// the calibration report's publish/collecting state for context.
// notMeasured whenever the DB was not reachable at render time.
// ---------------------------------------------------------------------------

export interface ProofArchiveSignal {
  readonly reachable: boolean;
  readonly settledCount?: number;
  readonly settledThreshold?: number;
  readonly calibrationGateOpen?: boolean;
}

export function computeProofArchive(signal: ProofArchiveSignal): KingDimension {
  if (!signal.reachable || signal.settledCount === undefined) {
    return {
      notMeasured: true,
      reason:
        "database not reachable at render time (stub Prisma client or build-time render) — " +
        "settled/graded pick counts require a live DB connection",
    };
  }

  const threshold =
    signal.settledThreshold !== undefined && signal.settledThreshold > 0 ? signal.settledThreshold : 100;
  const settled = Math.max(0, signal.settledCount);
  const score = clampScore(round((settled / threshold) * 100));
  const gateNote = signal.calibrationGateOpen ? "publishing" : "collecting (below the performance-stats gate)";

  return {
    score,
    basis:
      `computed from ${settled} settled/graded canonical pick${settled === 1 ? "" : "s"} vs the ` +
      `${threshold}-pick platform readiness floor (MIN_SETTLED_PICKS_FOR_LEARNING) — ` +
      `calibration report: ${gateNote}`,
  };
}

// ---------------------------------------------------------------------------
// Live Feeds — real ingestion freshness against the shared Refresh SLA
// (lib/data-reliability/refresh-sla.ts), the same clock /api/health and the
// stale-data kill switch use. notMeasured whenever the DB was not reachable
// at render time; a real "never succeeded" ingestion history scores 0 (a
// genuine measurement), not notMeasured.
// ---------------------------------------------------------------------------

export interface LiveFeedsSignal {
  readonly reachable: boolean;
  readonly lastSuccessAt?: Date | null;
}

export function computeLiveFeeds(signal: LiveFeedsSignal, now: Date = new Date()): KingDimension {
  if (!signal.reachable) {
    return {
      notMeasured: true,
      reason:
        "ingestion status not reachable at render time (stub Prisma client or build-time render) — " +
        "freshness requires a live DB connection",
    };
  }

  const freshness = classifyRefreshFreshness(signal.lastSuccessAt ?? null, now);

  if (freshness.ageMinutes === null) {
    return {
      score: 0,
      basis: "computed from ingestion history: no successful odds-inserting ingestion run has ever completed",
    };
  }

  const score = clampScore(round(100 - (freshness.ageMinutes / REFRESH_STALE_AFTER_MINUTES) * 100));

  return {
    score,
    basis:
      `computed from the last successful odds ingestion ${freshness.ageMinutes} minute` +
      `${freshness.ageMinutes === 1 ? "" : "s"} ago vs the ${REFRESH_STALE_AFTER_MINUTES}-minute stale ` +
      `threshold (status: ${freshness.status})`,
  };
}

// ---------------------------------------------------------------------------
// Overall — equal-weighted mean over MEASURED dimensions only. Judgment call:
// "weighted mean" per spec, weighted EQUALLY across whichever dimensions are
// measured (1/N each) rather than inventing per-dimension importance weights
// that would themselves be undocumented, unauditable numbers of exactly the
// kind this module exists to eliminate. Labeled "computed from N of 4
// dimensions" so a partial read is never mistaken for a full one.
// ---------------------------------------------------------------------------

export function computeOverall(dimensions: KingStandardDimensions): KingStandardOverall {
  const totalDimensions = DIMENSION_ORDER.length;
  const measured = DIMENSION_ORDER.map((key) => ({ key, dimension: dimensions[key] })).filter(
    (entry): entry is { key: KingStandardDimensionKey; dimension: MeasuredDimension } =>
      isMeasured(entry.dimension),
  );

  if (measured.length === 0) {
    return {
      measuredCount: 0,
      totalDimensions,
      score: null,
      basis: `not yet measured — 0 of ${totalDimensions} dimensions have a live signal`,
    };
  }

  const mean = measured.reduce((sum, entry) => sum + entry.dimension.score, 0) / measured.length;
  const score = clampScore(round(mean));
  const detail = measured.map((entry) => `${KING_DIMENSION_LABELS[entry.key]} ${entry.dimension.score}`).join(", ");

  return {
    measuredCount: measured.length,
    totalDimensions,
    score,
    basis: `computed from ${measured.length} of ${totalDimensions} dimensions (equal-weighted mean): ${detail}`,
  };
}
