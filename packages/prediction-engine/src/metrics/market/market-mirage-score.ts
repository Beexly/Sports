import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp01, clampScore, round, weightedMean } from "../core/math.js";
import {
  rightsCleanliness,
  sourcePoliciesAllowed,
  uncertaintyFromEvidence,
  type MetricLifecycleStatus,
  type MetricSourcePolicy,
  type MetricUncertaintyBand,
} from "../core/validation.js";

/**
 * Mirage-risk band derived from the 0–100 score (see {@link classifyMirage}).
 * `BLOCK` is not a score band: it is forced by any hard-block gate (see
 * {@link hardBlockReasons}) regardless of the numeric score, and coincides with
 * `marketInterpretationAllowed === false`.
 */
export type MarketMirageBand = "LOW" | "WATCH" | "HIGH" | "BLOCK";
/**
 * Source-rights posture for the inputs this read is built on: `CLEAN` (all
 * policies clean and modeling-allowed), `REVIEW` (allowed but some rights
 * uncertainty raises review pressure), or `BLOCKED` (policy disallows modeling).
 */
export type MarketMirageSourcePosture = "CLEAN" | "REVIEW" | "BLOCKED";

export interface MarketMirageScoreInput {
  /** 0–100 market-gravity strength (pull toward a side). High gravity with low explainability is the core mirage driver. */
  readonly marketGravityIndex: number;
  /** 0–100 stale-line risk (see {@link import("./stale-line-risk-score.js").staleLineRiskScore}). A value >= 85 hard-blocks. */
  readonly staleLineRiskScore: number;
  /** Upstream freshness/rights gate from the stale-line metric; `false` hard-blocks the read. */
  readonly marketSignalAllowed: boolean;
  /** 0–100 public narrative / attention intensity (attention is not verified signal). */
  readonly publicNarrativeHeat: number;
  /** 0–100 cross-source disagreement pressure. */
  readonly sourceContradictionPressure: number;
  /** 0–100 dispersion of prices across books (one line may not represent the market). */
  readonly bookDispersionIndex: number;
  /** 0–100 how well the market move is explained by known factors; high explainability earns the credit that lowers the score. */
  readonly explainabilityScore: number;
  /** 0–100 no-bet / decision-discipline pressure. A value >= 85 hard-blocks. */
  readonly noBetPressure: number;
  /** 0–100 model-drift pressure. A value >= 80 hard-blocks; below that it feeds `pressure` at weight 0.06 but is NOT surfaced as a driver. */
  readonly driftPressure: number;
  /** 0–100 calibration debt (uncalibrated recent history). A value >= 80 hard-blocks; below that it feeds `pressure` at weight 0.05 but is NOT surfaced as a driver. */
  readonly calibrationDebt: number;
  /** Source rights/policy list backing this read; empty or modeling-disallowed hard-blocks (fail-closed). */
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

export interface MarketMirageScore {
  readonly metricId: "market-mirage-score";
  readonly score: number;
  readonly band: MarketMirageBand;
  readonly marketInterpretationAllowed: boolean;
  readonly probability: null;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "EVIDENCE_QUALITY_NOT_EDGE_PROBABILITY_OR_PICK";
  readonly uncertaintyBand: MetricUncertaintyBand;
  readonly sourcePosture: MarketMirageSourcePosture;
  readonly blockReasons: readonly string[];
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
  readonly sourcePolicy: readonly MetricSourcePolicy[];
}

/**
 * Market Mirage Score — a composite 0–100 risk score for *how likely the
 * observable market picture is an illusion* rather than a clean, corroborated
 * signal. Higher = more mirage risk (trust the line less). It never emits a
 * probability or a pick: `probability` is always `null` and `confidenceScore`
 * reports evidence quality, not edge (`confidenceMeaning ===
 * "EVIDENCE_QUALITY_NOT_EDGE_PROBABILITY_OR_PICK"`).
 *
 * All nine pressure inputs are 0–100 sub-scores (see {@link MarketMirageScoreInput});
 * each is clamped to [0, 100] and rescaled to [0, 1] by {@link normalizeScore}
 * before use. The score is a weighted mean of pressure terms, less an
 * explainability credit:
 *
 *   pressure = 0.22 * staleRisk         // stale line masquerading as movement
 *            + 0.16 * narrativeHeat      // attention without verified signal
 *            + 0.14 * contradiction      // sources disagree
 *            + 0.12 * dispersion         // books disagree
 *            + 0.12 * noBet              // decision discipline says pass
 *            + 0.10 * unexplainedGravity // marketGravity * (1 - explainability)
 *            + 0.06 * drift              // model-drift pressure
 *            + 0.05 * calibrationDebt    // uncalibrated recent history
 *            + 0.03 * sourceRisk         // unclean/blocked source posture
 *   credit  = marketGravity * explainability * (1 - max(staleRisk, contradiction, dispersion))
 *   score   = clampScore(100 * clamp01(pressure - 0.18 * credit))   // rounded to 2 dp
 *
 * The nine weights sum to 1.0, so `pressure` is a true [0, 1] mean; `credit`
 * rewards market gravity that is explainable AND fresh AND uncontested.
 *
 * Score bands (see {@link classifyMirage}): LOW (< 40), WATCH ([40, 75)),
 * HIGH (>= 75).
 *
 * Hard-block gates (see {@link hardBlockReasons}) force `band = "BLOCK"`,
 * `marketInterpretationAllowed = false`, `uncertaintyBand = "HIGH"`, and floor
 * the reported `score` to `max(85, rawScore)` so a blocked read can never
 * display as low risk. A block fires when any of:
 *   - market signal is stale/disallowed (`!marketSignalAllowed` or staleLineRiskScore >= 85)
 *   - source policy disallows modeling (`sourcePoliciesAllowed === false`, incl. an empty policy list)
 *   - noBetPressure >= 85, driftPressure >= 80, or calibrationDebt >= 80
 *
 * Driver-trail limitation (auditability caveat): the `drivers` array is a
 * ranked explanation of the dominant factors, NOT an exhaustive attribution of
 * `score` — driver contributions do not sum to it. Six of the nine pressure
 * terms are surfaced (stale, narrative, contradiction, dispersion, no-bet,
 * unexplained gravity), along with the explainability credit and the
 * source-posture term (weight 0.03). `drift` (0.06) and `calibrationDebt`
 * (0.05) are NOT surfaced as individual drivers even though both outweigh the
 * source-posture term: below their 80 hard-block gates they still move `score`
 * through `pressure` (up to ~6 and ~5 points respectively), and at/above 80
 * they surface via `blockReasons` instead. Consumers of the trail must not read
 * it as complete coverage of every score-moving input.
 *
 * Lifecycle `status` is always "SHADOW": this metric is observed, not yet priced.
 */
export function marketMirageScore(input: MarketMirageScoreInput): MarketMirageScore {
  const marketGravity = normalizeScore(input.marketGravityIndex);
  const staleRisk = normalizeScore(input.staleLineRiskScore);
  const narrativeHeat = normalizeScore(input.publicNarrativeHeat);
  const contradiction = normalizeScore(input.sourceContradictionPressure);
  const dispersion = normalizeScore(input.bookDispersionIndex);
  const explainability = normalizeScore(input.explainabilityScore);
  const noBet = normalizeScore(input.noBetPressure);
  const drift = normalizeScore(input.driftPressure);
  const calibrationDebt = normalizeScore(input.calibrationDebt);
  const sourceAllowed = sourcePoliciesAllowed(input.sourcePolicy);
  const sourceRisk = sourcePostureRisk(input.sourcePolicy);
  const unexplainedGravity = marketGravity * (1 - explainability);
  const blockReasons = hardBlockReasons({
    calibrationDebt: input.calibrationDebt,
    driftPressure: input.driftPressure,
    marketSignalAllowed: input.marketSignalAllowed,
    noBetPressure: input.noBetPressure,
    sourceAllowed,
    staleLineRiskScore: input.staleLineRiskScore,
  });

  // Weighted mean of the nine normalized pressure terms. Weights sum to 1.0, so
  // `pressure` stays in [0, 1]; `drift` (0.06) and `calibrationDebt` (0.05) are
  // included here even though they are not emitted as individual drivers below.
  const pressure = weightedMean([
    { value: staleRisk, weight: 0.22 },
    { value: narrativeHeat, weight: 0.16 },
    { value: contradiction, weight: 0.14 },
    { value: dispersion, weight: 0.12 },
    { value: noBet, weight: 0.12 },
    { value: unexplainedGravity, weight: 0.1 },
    { value: drift, weight: 0.06 },
    { value: calibrationDebt, weight: 0.05 },
    { value: sourceRisk, weight: 0.03 },
  ]);
  const explainableMarketCredit = marketGravity * explainability * (1 - Math.max(staleRisk, contradiction, dispersion));
  const rawScore = clampScore(100 * clamp01(pressure - 0.18 * explainableMarketCredit));
  // Policy floor: any hard block forces the reported score to at least 85 so a
  // blocked read can never present as low mirage risk, overriding the raw score.
  const score = round(blockReasons.length > 0 ? Math.max(85, rawScore) : rawScore, 2);
  const uncertaintyBand = uncertaintyFromEvidence({
    driftPressure: Math.max(input.driftPressure, input.calibrationDebt, sourceRisk * 100),
    proxyCount: 2,
    sampleSize: Math.max(1, 100 - input.staleLineRiskScore) * 3,
    sourcePolicy: input.sourcePolicy,
  });
  return {
    band: blockReasons.length > 0 ? "BLOCK" : classifyMirage(score),
    birthCertificate: requireMetricBirthCertificate("market-mirage-score"),
    blockReasons,
    confidenceMeaning: "EVIDENCE_QUALITY_NOT_EDGE_PROBABILITY_OR_PICK",
    confidenceScore: confidenceFromEvidence(uncertaintyBand, Math.max(sourceRisk, staleRisk, contradiction, dispersion)),
    // Ranked driver trail (sorted by |contribution|). This is an explanation of
    // the dominant factors, not a complete attribution: `drift` and
    // `calibrationDebt` feed `pressure` above but are intentionally not surfaced
    // as individual drivers here (they show up via `blockReasons` once they cross
    // their 80 hard-block gates). See the function docstring for the caveat.
    drivers: sortedDrivers([
      metricDriver({
        contribution: staleRisk * 22,
        direction: staleRisk > 0 ? "UP" : "NEUTRAL",
        explanation: "Stale line risk can make market movement look cleaner than it is.",
        name: "stale_line_mirage_pressure",
      }),
      metricDriver({
        contribution: narrativeHeat * 16,
        direction: narrativeHeat > 0 ? "UP" : "NEUTRAL",
        explanation: "Public narrative heat can create attention without verified signal.",
        name: "public_narrative_heat",
      }),
      metricDriver({
        contribution: contradiction * 14,
        direction: contradiction > 0 ? "UP" : "NEUTRAL",
        explanation: "Contradictory sources raise mirage risk.",
        name: "source_contradiction_pressure",
      }),
      metricDriver({
        contribution: dispersion * 12,
        direction: dispersion > 0 ? "UP" : "NEUTRAL",
        explanation: "Book dispersion raises risk that a single line is not a clean market signal.",
        name: "book_dispersion_mirage_pressure",
      }),
      metricDriver({
        contribution: noBet * 12,
        direction: noBet > 0 ? "UP" : "NEUTRAL",
        explanation: "No-bet pressure means the market look should not override decision discipline.",
        name: "no_bet_pressure",
      }),
      metricDriver({
        contribution: unexplainedGravity * 10,
        direction: unexplainedGravity > 0 ? "UP" : "NEUTRAL",
        explanation: "Strong market gravity without clear explanation can be mirage-prone.",
        name: "unexplained_market_gravity",
      }),
      metricDriver({
        contribution: -explainableMarketCredit * 18,
        direction: explainableMarketCredit > 0 ? "DOWN" : "NEUTRAL",
        explanation: "Explainable, fresh, corroborated market movement reduces mirage risk.",
        name: "explainable_market_credit",
      }),
      metricDriver({
        contribution: sourceRisk * 3,
        direction: sourceRisk > 0 ? "UP" : "NEUTRAL",
        explanation: "Unclear or blocked source posture increases review pressure.",
        name: "source_posture_review_pressure",
      }),
    ]),
    marketInterpretationAllowed: blockReasons.length === 0,
    metricId: "market-mirage-score",
    probability: null,
    score,
    sourcePolicy: input.sourcePolicy,
    sourcePosture: sourcePosture(sourceRisk, sourceAllowed),
    status: "SHADOW",
    uncertaintyBand: blockReasons.length > 0 ? "HIGH" : uncertaintyBand,
  };
}

function hardBlockReasons(input: {
  readonly calibrationDebt: number;
  readonly driftPressure: number;
  readonly marketSignalAllowed: boolean;
  readonly noBetPressure: number;
  readonly sourceAllowed: boolean;
  readonly staleLineRiskScore: number;
}): readonly string[] {
  const reasons: string[] = [];
  if (!input.marketSignalAllowed || input.staleLineRiskScore >= 85) reasons.push("Market signal is stale or blocked.");
  if (!input.sourceAllowed) reasons.push("Source policy blocks modeling.");
  if (input.noBetPressure >= 85) reasons.push("No-bet pressure is too high.");
  if (input.driftPressure >= 80) reasons.push("Drift pressure is too high.");
  if (input.calibrationDebt >= 80) reasons.push("Calibration debt is too high.");
  return reasons;
}

function classifyMirage(score: number): MarketMirageBand {
  if (score >= 75) return "HIGH";
  if (score >= 40) return "WATCH";
  return "LOW";
}

function confidenceFromEvidence(uncertaintyBand: MetricUncertaintyBand, reviewRisk: number): number {
  const base = uncertaintyBand === "LOW" ? 82 : uncertaintyBand === "MEDIUM" ? 60 : 34;
  return round(Math.max(0, Math.min(100, base - reviewRisk * 16)), 2);
}

function normalizeScore(value: number): number {
  return clampScore(value) / 100;
}

function sourcePostureRisk(policies: readonly MetricSourcePolicy[]): number {
  if (policies.length === 0) return 1;
  const totalCleanliness = policies.reduce((sum, policy) => {
    const modelingMultiplier = policy.allowedForModeling ? 1 : 0;
    return sum + rightsCleanliness(policy.status) * modelingMultiplier;
  }, 0);
  return 1 - clamp01(totalCleanliness / policies.length);
}
function sourcePosture(sourceRisk: number, sourceAllowed: boolean): MarketMirageSourcePosture {
  if (!sourceAllowed) return "BLOCKED";
  if (sourceRisk > 0) return "REVIEW";
  return "CLEAN";
}
