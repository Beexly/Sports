import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp, clamp01, clampScore, round } from "../core/math.js";
import { rightsCleanliness, type MetricLifecycleStatus, type MetricSourceStatus } from "../core/validation.js";

/**
 * Reliability grade derived from the 0–100 score (see {@link gradeReliability}).
 * `BLOCKED` is overloaded and carries two distinct meanings — rights-blocked
 * (source status does not permit modeling) or reliability-blocked (score < 25).
 */
export type DataReliabilityGrade = "HIGH" | "MEDIUM" | "LOW" | "BLOCKED";

export interface DataReliabilityInput {
  /**
   * Age of the freshest source observation, in minutes, measured at ingestion.
   * Optional: `undefined` / non-finite is treated as *unknown* freshness and
   * scores 0 (worst tier) rather than being assumed fresh.
   */
  readonly sourceAgeMinutes?: number;
  /** Freshness time-to-live, in minutes. Floored to `>= 1` to avoid divide/tier degeneracy at 0. */
  readonly ttlMinutes: number;
  /** Distinct sources actually present for this datum (count). */
  readonly sourceCount: number;
  /** Sources expected for full coverage (count). `<= 0` (or non-finite counts) yields 0 coverage, not neutral. */
  readonly expectedSourceCount: number;
  /** Provider-trust prior in [0, 1]; clamped to that range, non-finite coerced to 0 (untrusted). */
  readonly providerTrustScore: number;
  /** Source-rights posture; mapped to a 0/0.6/1 cleanliness factor by {@link rightsCleanliness}. */
  readonly rightsStatus: MetricSourceStatus;
  /** Count of cross-source contradictions. Each costs 0.2 of raw score, capped at 0.5 total. */
  readonly contradictionCount?: number;
  /** Count of missing required fields. Each costs 0.08 of raw score, capped at 0.4 total. */
  readonly missingRequiredFields?: number;
}

export interface DataReliabilityIndex {
  readonly metricId: "data-reliability-index";
  readonly score: number;
  readonly grade: DataReliabilityGrade;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
}

/**
 * Data Reliability Index (DRI) — a composite 0–100 confidence score for *how
 * trustworthy the underlying data is*, independent of what it predicts. It
 * answers "should a decision be allowed to lean on this datum at all?", not
 * "what is the edge?".
 *
 * Scoring (all component factors are in [0, 1]; raw is clamped to [0, 1] and
 * scaled to a 0–100 `score`):
 *
 *   raw = 0.38 * freshness   // recency vs. TTL — the single heaviest factor
 *       + 0.22 * coverage    // sourceCount / expectedSourceCount, clamped [0,1]
 *       + 0.20 * providerTrust
 *       + 0.20 * rightsCleanliness
 *       - contradictionPenalty  // 0.2 per contradiction, capped at 0.5
 *       - missingPenalty        // 0.08 per missing field, capped at 0.4
 *
 * Freshness tiers (see {@link freshness}), using `ttl = max(1, ttlMinutes)`:
 *   - age <= 0.5 * ttl        → 1.00 (fresh)
 *   - 0.5 * ttl < age <= ttl  → 0.65 (aging but in-window)
 *   - age > ttl               → 0.15 (stale — a floor, never 0)
 *   - age unknown/non-finite  → 0.00 (no honest freshness signal)
 * Note the asymmetry the floor creates: stale-but-otherwise-perfect data still
 * lands at raw 0.677 → score 67.7 → MEDIUM, whereas *unknown* age (0) scores
 * worse than known-stale. That is deliberate — we distinguish "we measured it
 * and it is old" from "we have no freshness evidence at all".
 *
 * Grade bands (see {@link gradeReliability}):
 *   - HIGH    : score >= 75
 *   - MEDIUM  : 50 <= score < 75
 *   - LOW     : 25 <= score < 50 (and rights are non-zero)
 *   - BLOCKED : rightsCleanliness == 0  OR  score < 25
 * `BLOCKED` therefore has two distinct causes that a consumer must not conflate:
 *   (1) rights-blocked — the source status forbids modeling regardless of how
 *       clean/fresh the numbers are; and
 *   (2) reliability-blocked — rights are fine but the composite score is too low
 *       (< 25) to be leaned on. The `rights_cleanliness` driver disambiguates
 *       which cause fired.
 *
 * Edge-case contract (all intentionally honest-over-optimistic):
 *   - Missing/non-finite `sourceAgeMinutes` → freshness 0 (not assumed fresh).
 *   - `expectedSourceCount <= 0` or non-finite counts → coverage 0 (not neutral),
 *     so an unconfigured expectation cannot inflate reliability.
 *   - Non-finite `providerTrustScore` → 0 (untrusted, not fabricated).
 *   - `ttlMinutes <= 0` is floored to 1 so the metric never NaNs or divides by 0.
 *
 * Guarantees: `score` is always finite and in [0, 100] (see the NaN-guard test);
 * `drivers` are ranked by |contribution| so gating factors (e.g. blocked rights,
 * contribution -20) outrank smaller positive factors. Every weighted factor and
 * every applied penalty is represented in the driver trail, so the drivers
 * reconcile to the pre-clamp raw score.
 *
 * Limitation / status: this metric ships at `SHADOW` status — it is computed and
 * auditable but not yet wired into live pricing. It is a data-quality gate, not a
 * predictive signal; the factors are hand-weighted, not fit against outcomes.
 */
export function dataReliabilityIndex(input: DataReliabilityInput): DataReliabilityIndex {
  const ttl = Math.max(1, input.ttlMinutes);
  const freshnessScore = freshness(input.sourceAgeMinutes, ttl);
  const coverageScore =
    !Number.isFinite(input.sourceCount) || !Number.isFinite(input.expectedSourceCount) || input.expectedSourceCount <= 0
      ? 0
      : clamp01(input.sourceCount / input.expectedSourceCount);
  const providerTrustScore = clamp01(Number.isFinite(input.providerTrustScore) ? input.providerTrustScore : 0);
  const rightsScore = rightsCleanliness(input.rightsStatus);
  const contradictionPenalty = Math.min(0.5, 0.2 * Math.max(0, input.contradictionCount ?? 0));
  const missingPenalty = Math.min(0.4, 0.08 * Math.max(0, input.missingRequiredFields ?? 0));
  const raw =
    0.38 * freshnessScore +
    0.22 * coverageScore +
    0.2 * providerTrustScore +
    0.2 * rightsScore -
    contradictionPenalty -
    missingPenalty;
  const score = clampScore(100 * clamp(raw, 0, 1));
  const grade = gradeReliability(score, rightsScore);
  const drivers = sortedDrivers([
    metricDriver({ contribution: freshnessScore * 38, direction: "UP", explanation: "Freshness raises reliability when data is inside its TTL.", name: "freshness" }),
    metricDriver({ contribution: coverageScore * 22, direction: "UP", explanation: "More expected sources covered raises reliability.", name: "coverage" }),
    metricDriver({ contribution: providerTrustScore * 20, direction: "UP", explanation: "Provider trust raises reliability.", name: "provider_trust" }),
    metricDriver({
      contribution: (rightsScore - 1) * 20,
      direction: rightsScore < 1 ? "DOWN" : "NEUTRAL",
      explanation: "Source-rights cleanliness controls whether data can influence decisions.",
      name: "rights_cleanliness",
    }),
    metricDriver({
      contribution: -contradictionPenalty * 100,
      direction: contradictionPenalty > 0 ? "DOWN" : "NEUTRAL",
      explanation: "Contradictions reduce reliability.",
      name: "contradictions",
    }),
    metricDriver({
      contribution: -missingPenalty * 100,
      direction: missingPenalty > 0 ? "DOWN" : "NEUTRAL",
      explanation: "Missing required fields reduce reliability.",
      name: "missing_required_fields",
    }),
  ]);

  return {
    birthCertificate: requireMetricBirthCertificate("data-reliability-index"),
    drivers,
    grade,
    metricId: "data-reliability-index",
    score: round(score, 2),
    status: "SHADOW",
  };
}

/**
 * Freshness factor in {0, 0.15, 0.65, 1}. Unknown age (`undefined`/non-finite)
 * scores 0 — we do NOT assume fresh. Known-stale (past TTL) floors at 0.15 so
 * that having a real, aged observation still beats having none at all.
 * `ttlMinutes` is expected to already be floored to `>= 1` by the caller.
 */
function freshness(sourceAgeMinutes: number | undefined, ttlMinutes: number): number {
  if (sourceAgeMinutes === undefined || !Number.isFinite(sourceAgeMinutes)) return 0;
  if (sourceAgeMinutes <= 0.5 * ttlMinutes) return 1;
  if (sourceAgeMinutes <= ttlMinutes) return 0.65;
  return 0.15; // stale floor — non-zero because a measured-old datum still carries some signal
}

/**
 * Maps the 0–100 `score` and the rights-cleanliness factor to a grade band.
 * The rights/score gate is checked FIRST: `rightsScore <= 0` (rights forbid
 * modeling) OR `score < 25` (reliability too low) both yield `BLOCKED`, so a
 * `BLOCKED` grade alone does not tell you which condition fired — inspect the
 * `rights_cleanliness` driver to disambiguate. Bands: HIGH >= 75, MEDIUM >= 50,
 * otherwise LOW.
 */
function gradeReliability(score: number, rightsScore: number): DataReliabilityGrade {
  if (rightsScore <= 0 || score < 25) return "BLOCKED";
  if (score >= 75) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}
