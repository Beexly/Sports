import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp01, normalizeClamped, round } from "../core/math.js";
import { rightsCleanliness, type MetricLifecycleStatus, type MetricSourceStatus } from "../core/validation.js";

/**
 * Stale-line risk band derived from the 0–100 score (see {@link classifyRisk}).
 * `BLOCK` is not a score band: it is forced by a hard-block gate — a stale line
 * snapshot (`lineAge >= ttl`) or a hard-deny rights status (`blocked`/`excluded`)
 * — regardless of the numeric score, and coincides with
 * `marketSignalAllowed === false`.
 */
export type StaleLineRiskBand = "LOW" | "WATCH" | "HIGH" | "BLOCK";

export interface StaleLineRiskInput {
  /** Minutes elapsed since the line snapshot was captured. Negative values are floored to 0. */
  readonly lineAgeMinutes: number;
  /** Freshness budget in minutes; the line is `stale` once `lineAgeMinutes >= this`. Floored to >= 1 for division safety. */
  readonly freshnessTtlMinutes: number;
  /** Number of books/sources that contributed to the current line. Negative values are floored to 0. */
  readonly sourceCount: number;
  /** Number of sources expected for full coverage; the denominator is floored to >= 1. */
  readonly expectedSourceCount: number;
  /** Count of sources contradicting the consensus line. Defaults to 0; risk saturates at 3. */
  readonly contradictionCount?: number;
  /** Source-rights posture; defaults to `"unknown"`. `"blocked"`/`"excluded"` hard-deny (force BLOCK); see {@link rightsCleanliness}. */
  readonly rightsStatus?: MetricSourceStatus;
  /** Prices/lines observed across books, used for cross-book dispersion. Needs >= 2 entries to contribute. */
  readonly bookLines?: readonly number[];
  /** Opening line for the market. Movement risk is 0 unless both `openingLine` and `currentLine` are provided. */
  readonly openingLine?: number;
  /** Current line for the market. Paired with `openingLine` to measure open-to-current movement. */
  readonly currentLine?: number;
  /** Market type; defaults to `"spread"`. Sets the normalization scale for dispersion and movement (see {@link scaleForMarket}). */
  readonly marketType?: "spread" | "total" | "moneyline" | "prop";
}

export interface StaleLineRiskScore {
  readonly metricId: "stale-line-risk-score";
  readonly score: number;
  readonly band: StaleLineRiskBand;
  readonly stale: boolean;
  readonly marketSignalAllowed: boolean;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
}

/**
 * Stale-Line Risk Score — a composite 0–100 risk score for *how much the
 * observed line should be distrusted as an input to market-signal reads*.
 * Higher = riskier (older, thinly sourced, contradicted, rights-unclean, or
 * dispersed/moving lines). It is a data-quality gate, not an edge or a pick: it
 * emits no probability and its `score` measures snapshot risk, not value.
 *
 * Each of the six component risks is a unit-interval [0, 1] pressure term:
 *   - `ageRisk`            = min(1, lineAge / ttl)               // saturates at the TTL
 *   - `sourceCoverageRisk` = 1 - min(1, sourceCount / expected)  // missing books
 *   - `contradictionRisk`  = min(1, contradictionCount / 3)      // sources disagree
 *   - `rightsRisk`         = 1 - rightsCleanliness(status)        // 0 clean, 0.4 review, 1 unclean
 *   - `dispersionRisk`     = stddev(bookLines) / (scale/2), clamped  // 0 if < 2 books
 *   - `movementRisk`       = |current - open| / scale, clamped       // 0 if either line missing
 *
 * where `scale` is market-type dependent (see {@link scaleForMarket}). The
 * weighted mean of these terms, rescaled to 0–100, is the `baseRisk`:
 *
 *   baseRisk = 100 * clamp01(
 *                0.40 * ageRisk              // freshness dominates
 *              + 0.18 * sourceCoverageRisk   // coverage breadth
 *              + 0.17 * contradictionRisk    // source agreement
 *              + 0.17 * rightsRisk           // rights cleanliness
 *              + 0.05 * dispersionRisk        // cross-book spread
 *              + 0.03 * movementRisk)         // open-to-current drift
 *
 * The six weights sum to 1.0, so `baseRisk` is a true [0, 100] weighted mean.
 * Freshness is weighted heaviest (0.40) because a stale snapshot is the
 * strongest reason to distrust a line; movement is weighted lightest (0.03)
 * because on a fresh, well-sourced line movement is usually genuine price
 * discovery rather than a data defect.
 *
 * Score bands (see {@link classifyRisk}): LOW (< 45), WATCH ([45, 75)),
 * HIGH (>= 75).
 *
 * Hard-block gate: a stale line (`lineAge >= ttl`) OR a hard-deny rights status
 * (`"blocked"`/`"excluded"`) forces `band = "BLOCK"`, sets
 * `marketSignalAllowed = false`, and floors the reported `score` to
 * `max(85, baseRisk)`. The 85 floor is a deliberate policy override, not a
 * computed value: it guarantees a blocked read can never display as low/medium
 * risk even when the underlying `baseRisk` is small (e.g. a line just past its
 * TTL with everything else clean). `marketSignalAllowed` and `BLOCK` are
 * therefore staleness- and rights-hard-deny-driven, independent of the numeric
 * bands. Merely-`"unknown"` rights do NOT hard-block — they raise `rightsRisk`
 * to 1 and stay graduated through the score.
 *
 * Driver-trail limitation (auditability caveat): each driver's contribution is
 * `componentRisk * (weight * 100)`, so the six driver contributions sum exactly
 * to `baseRisk` — but NOT necessarily to the emitted `score`. When the hard-block
 * floor is applied and `baseRisk < 85`, the reported `score` is 85 while the
 * drivers still sum to the lower `baseRisk`. This divergence is intentional: the
 * driver trail attributes the *risk that was measured*, while the 85 floor
 * expresses the *policy decision to block*. Consumers reconciling drivers
 * against the score must account for the floor.
 *
 * Lifecycle `status` is always `"SHADOW"`: this metric is observed, not yet
 * priced. The emitted `score` is rounded to 2 decimal places.
 */
export function staleLineRiskScore(input: StaleLineRiskInput): StaleLineRiskScore {
  const ttl = Math.max(1, input.freshnessTtlMinutes);
  const lineAge = Math.max(0, input.lineAgeMinutes);
  const stale = lineAge >= ttl;
  const ageRisk = normalizeClamped(lineAge, 0, ttl);
  const sourceCoverage = clamp01(Math.max(0, input.sourceCount) / Math.max(1, input.expectedSourceCount));
  const sourceCoverageRisk = 1 - sourceCoverage;
  const contradictionRisk = normalizeClamped(input.contradictionCount ?? 0, 0, 3);
  const rightsRisk = 1 - rightsCleanliness(input.rightsStatus ?? "unknown");
  const dispersionRisk = dispersionForMarket(input.bookLines ?? [], input.marketType ?? "spread");
  const movementRisk = movementForMarket(input.openingLine, input.currentLine, input.marketType ?? "spread");

  const baseRisk =
    100 *
    clamp01(
      0.4 * ageRisk +
        0.18 * sourceCoverageRisk +
        0.17 * contradictionRisk +
        0.17 * rightsRisk +
        0.05 * dispersionRisk +
        0.03 * movementRisk,
    );
  const rightsHardDeny = input.rightsStatus === "blocked" || input.rightsStatus === "excluded";
  const hardBlock = stale || rightsHardDeny;
  // Policy floor: a blocked read is forced to >= 85 so it can never display as
  // low/medium risk, even when baseRisk is small. This intentionally overrides
  // the driver-summed baseRisk (see the driver-trail caveat in the JSDoc above).
  const score = hardBlock ? Math.max(85, baseRisk) : baseRisk;
  const band = hardBlock ? "BLOCK" : classifyRisk(score);
  const drivers = sortedDrivers([
    metricDriver({
      contribution: ageRisk * 40,
      direction: ageRisk > 0 ? "UP" : "NEUTRAL",
      explanation: "Older line snapshots increase stale-line risk and can block market-signal use.",
      name: "line_age_staleness",
    }),
    metricDriver({
      contribution: sourceCoverageRisk * 18,
      direction: sourceCoverageRisk > 0 ? "UP" : "NEUTRAL",
      explanation: "Low source coverage raises the risk that the current line is not representative.",
      name: "source_coverage_gap",
    }),
    metricDriver({
      contribution: contradictionRisk * 17,
      direction: contradictionRisk > 0 ? "UP" : "NEUTRAL",
      explanation: "Contradictory line sources increase market-state uncertainty.",
      name: "source_contradiction_pressure",
    }),
    metricDriver({
      contribution: rightsRisk * 17,
      direction: rightsRisk > 0 ? "UP" : "NEUTRAL",
      explanation: "Unclear or blocked source rights raise risk and prevent clean downstream use.",
      name: "source_rights_risk",
    }),
    metricDriver({
      contribution: dispersionRisk * 5,
      direction: dispersionRisk > 0 ? "UP" : "NEUTRAL",
      explanation: "Book dispersion raises stale-line risk because a single line may not represent the market.",
      name: "book_dispersion_risk",
    }),
    metricDriver({
      contribution: movementRisk * 3,
      direction: movementRisk > 0 ? "UP" : "NEUTRAL",
      explanation: "Large movement between open and current line raises audit pressure when freshness is weak.",
      name: "line_movement_audit_pressure",
    }),
  ]);

  return {
    band,
    birthCertificate: requireMetricBirthCertificate("stale-line-risk-score"),
    drivers,
    marketSignalAllowed: band !== "BLOCK",
    metricId: "stale-line-risk-score",
    score: round(score, 2),
    stale,
    status: "SHADOW",
  };
}

/**
 * Map a 0–100 risk score to its non-blocking band. `BLOCK` is never returned
 * here — it is applied by the hard-block gate in {@link staleLineRiskScore}.
 */
function classifyRisk(score: number): StaleLineRiskBand {
  if (score >= 75) return "HIGH";
  if (score >= 45) return "WATCH";
  return "LOW";
}

/**
 * Open-to-current line movement as a [0, 1] risk term: the absolute delta
 * normalized against the market's full-scale swing. Returns 0 when either the
 * opening or current line is missing (movement is unknown, not zero-risk).
 */
function movementForMarket(
  openingLine: number | undefined,
  currentLine: number | undefined,
  marketType: NonNullable<StaleLineRiskInput["marketType"]>,
): number {
  if (openingLine === undefined || currentLine === undefined) return 0;
  return normalizeClamped(Math.abs(currentLine - openingLine), 0, scaleForMarket(marketType));
}

/**
 * Cross-book dispersion as a [0, 1] risk term: the standard deviation of book
 * lines normalized against half the market's full-scale swing. Returns 0 with
 * fewer than two book lines (dispersion is undefined for a single quote).
 */
function dispersionForMarket(
  bookLines: readonly number[],
  marketType: NonNullable<StaleLineRiskInput["marketType"]>,
): number {
  if (bookLines.length < 2) return 0;
  return normalizeClamped(standardDeviation(bookLines), 0, scaleForMarket(marketType) / 2);
}

/**
 * Full-scale reference swing (in line units) used to normalize dispersion and
 * movement per market type. Wider markets (moneyline prices) need a larger
 * scale than tight ones (props) so equal *proportional* moves map to equal risk.
 */
function scaleForMarket(marketType: NonNullable<StaleLineRiskInput["marketType"]>): number {
  if (marketType === "moneyline") return 80;
  if (marketType === "prop") return 2.5;
  if (marketType === "total") return 5;
  return 4;
}

/** Population standard deviation of `values`; returns 0 for fewer than two values. */
function standardDeviation(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
