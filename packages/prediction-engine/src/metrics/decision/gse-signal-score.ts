import { metricDriver, sortedDrivers, type MetricDriver } from "../core/driver.js";
import { requireMetricBirthCertificate, type GseMetricBirthCertificate } from "../core/metric-birth-certificate.js";
import { clamp01, clampScore, round, sigmoid } from "../core/math.js";
import type { MetricLifecycleStatus } from "../core/validation.js";

export type GseSignalGrade = "HARD_PASS" | "PASS" | "WATCH" | "LEAN" | "SPEAK" | "STRONG";

export interface GseSignalScoreInput {
  readonly edgeQualityScore: number;
  readonly signalIntegrityIndex: number;
  readonly marketGravityIndex: number;
  readonly proprietaryPlayerSignal: number;
  readonly calibrationIntegrityGrade: number;
  readonly portfolioFitScore: number;
  readonly noBetPressure: number;
  readonly driftPressure: number;
  readonly calibrationDebt: number;
  readonly playableWindowScore?: number;
  readonly modelAgreement?: number;
  readonly staleLineRiskScore?: number;
  readonly roleVolatility?: number;
  readonly playerPropExposure?: number;
}

export interface GseSignalScore {
  readonly metricId: "gse-signal-score";
  readonly score: number;
  readonly grade: GseSignalGrade;
  readonly confidenceScore: number;
  readonly confidenceMeaning: "DECISION_QUALITY_NOT_WIN_PROBABILITY";
  readonly probability: null;
  readonly status: MetricLifecycleStatus;
  readonly drivers: readonly MetricDriver[];
  readonly birthCertificate: GseMetricBirthCertificate;
}

/**
 * GSE Signal Score — the engine's top-level "should we act on this?" decision-quality
 * composite (birth certificate `metricId` "gse-signal-score", family "decision", status SHADOW).
 *
 * Answers the target question "Is this signal high-quality enough to act on?" by folding the
 * upstream component metrics (edge, trust, market state, calibration, portfolio fit) and the
 * refusal/penalty pressures (no-bet, drift, calibration debt, stale-line, role churn) into a
 * single 0–100 band. It is a DECISION-QUALITY score, not a win probability or EV estimate.
 *
 * Units / inputs — every component is a 0–100 score; `normalizeScore` clamps to [0,100] and
 * rescales to [0,1] before it enters the logit. `modelAgreement` is already a [0,1] fraction
 * (clamped). Optional inputs default to a neutral/absent value so the metric degrades gracefully
 * when a component is unavailable:
 *   - playableWindowScore  0–100, default 50 (neutral readiness)
 *   - modelAgreement       0–1,   default 0.65
 *   - staleLineRiskScore   0–100, default 0  (assume fresh)
 *   - roleVolatility       0–100, default 0
 *   - playerPropExposure   0–100, default 0
 *
 * Score — `raw` is a hand-fit logit: an intercept plus six additive component terms
 * (edge, integrity, market, player, calibration, portfolio), four interaction terms
 * (edge×integrity, market×playableWindow, player×modelAgreement, calibration×(1−drift)) and the
 * penalty terms (no-bet, no-bet×stale-line, role-volatility×prop-exposure, calibration debt, drift).
 * `score = clampScore(100 · sigmoid(raw))`, a 0–100 band where higher = higher decision quality.
 * The coefficients/normalizers are protected components (see birth certificate) and are not exposed.
 *
 * Honesty gates —
 *   - `probability` is ALWAYS null: this metric never emits a win probability; probability claims
 *     are gated separately (birth certificate `sourceRightsRequired`).
 *   - `confidenceScore` (0–100) is a SEPARATE evidence-trust blend computed from the RAW inputs
 *     (not the normalized ones): 0.45·signalIntegrity + 0.30·calibrationIntegrity +
 *     0.25·(100 − driftPressure). `confidenceMeaning` is DECISION_QUALITY_NOT_WIN_PROBABILITY — it
 *     measures how trustworthy the decision-quality read is, not P(win).
 *   - Refusal-pressure veto: noBetPressure ≥ 85 forces grade HARD_PASS regardless of `score` (a
 *     strong apparent edge cannot override a hard refusal); a score ≤ 24 also floors to HARD_PASS.
 *
 * Grade ladder (see `gradeSignal`): HARD_PASS (noBetPressure ≥ 85 OR score ≤ 24) · PASS (≤ 44) ·
 * WATCH (≤ 59) · LEAN (≤ 72) · SPEAK (≤ 84) · STRONG (> 84).
 *
 * Limitations —
 *   - The `drivers` trail surfaces the seven named component drivers only; it is an illustrative
 *     factor trail, not an exhaustive attribution of `score`. The interaction terms and the
 *     player/portfolio/stale-line/role-volatility×prop-exposure penalties are not itemized, so
 *     driver contributions do not reconcile to the emitted `score`.
 *   - Direction convention is asymmetric by design: positive-polarity drivers report a fixed "UP"
 *     even when their contribution is 0 (direction encodes the factor's polarity), whereas the
 *     pressure drivers collapse to "NEUTRAL" when their input is 0.
 *   - `grade` is derived from the full-precision internal score while the returned `score` is
 *     rounded to 2 dp, so at an exact band boundary the displayed score can sit on the cutoff of
 *     the adjacent band.
 *
 * Deterministic and pure: the output depends only on `input` (no clock, no I/O).
 */
export function gseSignalScore(input: GseSignalScoreInput): GseSignalScore {
  const edge = normalizeScore(input.edgeQualityScore);
  const integrity = normalizeScore(input.signalIntegrityIndex);
  const market = normalizeScore(input.marketGravityIndex);
  const player = normalizeScore(input.proprietaryPlayerSignal);
  const calibration = normalizeScore(input.calibrationIntegrityGrade);
  const portfolio = normalizeScore(input.portfolioFitScore);
  const noBet = normalizeScore(input.noBetPressure);
  const drift = normalizeScore(input.driftPressure);
  const calibrationDebt = normalizeScore(input.calibrationDebt);
  const playableWindow = normalizeScore(input.playableWindowScore ?? 50);
  const modelAgreement = clamp01(input.modelAgreement ?? 0.65);
  const staleLineRisk = normalizeScore(input.staleLineRiskScore ?? 0);
  const roleVolatility = normalizeScore(input.roleVolatility ?? 0);
  const playerPropExposure = normalizeScore(input.playerPropExposure ?? 0);
  const raw =
    -1.2 +
    1.05 * edge +
    0.95 * integrity +
    0.42 * market +
    0.5 * player +
    0.62 * calibration +
    0.42 * portfolio +
    0.38 * edge * integrity +
    0.24 * market * playableWindow +
    0.28 * player * modelAgreement +
    0.34 * calibration * (1 - drift) -
    1.2 * noBet -
    0.45 * noBet * staleLineRisk -
    0.35 * roleVolatility * playerPropExposure -
    0.52 * calibrationDebt -
    0.42 * drift;
  const score = clampScore(100 * sigmoid(raw));
  // Evidence-trust blend on the RAW inputs — deliberately separate from `score`; it reports how
  // trustworthy the decision-quality read is, not P(win) (see DECISION_QUALITY_NOT_WIN_PROBABILITY).
  const confidenceScore = clampScore(0.45 * input.signalIntegrityIndex + 0.3 * input.calibrationIntegrityGrade + 0.25 * (100 - input.driftPressure));
  // Illustrative factor trail (not an exhaustive attribution of `score`). Positive-polarity drivers
  // carry a fixed "UP"; pressure drivers gate to "NEUTRAL" at 0 — the asymmetry is intentional.
  const drivers = sortedDrivers([
    metricDriver({ contribution: edge * 30, direction: "UP", explanation: "Edge quality raises decision quality.", name: "edge_quality" }),
    metricDriver({ contribution: integrity * 25, direction: "UP", explanation: "Signal integrity raises decision quality.", name: "signal_integrity" }),
    metricDriver({ contribution: market * 15, direction: "UP", explanation: "Market gravity can support decision quality when not stale.", name: "market_gravity" }),
    metricDriver({ contribution: calibration * 10, direction: "UP", explanation: "Calibration integrity raises decision quality.", name: "calibration_integrity" }),
    metricDriver({
      contribution: -noBet * 35,
      direction: noBet > 0 ? "DOWN" : "NEUTRAL",
      explanation: "No-bet pressure suppresses decision quality.",
      name: "no_bet_pressure",
    }),
    metricDriver({
      contribution: -drift * 18,
      direction: drift > 0 ? "DOWN" : "NEUTRAL",
      explanation: "Drift pressure suppresses decision quality.",
      name: "drift_pressure",
    }),
    metricDriver({
      contribution: -calibrationDebt * 16,
      direction: calibrationDebt > 0 ? "DOWN" : "NEUTRAL",
      explanation: "Calibration debt suppresses decision quality.",
      name: "calibration_debt",
    }),
  ]);

  return {
    birthCertificate: requireMetricBirthCertificate("gse-signal-score"),
    confidenceMeaning: "DECISION_QUALITY_NOT_WIN_PROBABILITY",
    confidenceScore: round(confidenceScore, 2),
    drivers,
    // Graded on the full-precision `score`; the emitted `score` below is rounded to 2 dp, so at an
    // exact band boundary the displayed value can appear to sit on the adjacent band's cutoff.
    grade: gradeSignal(score, input.noBetPressure),
    metricId: "gse-signal-score",
    probability: null,
    score: round(score, 2),
    status: "SHADOW",
  };
}

/** Clamp a 0–100 component score into the [0,1] range the logit consumes. */
function normalizeScore(value: number): number {
  return clampScore(value) / 100;
}

/**
 * Map the full-precision 0–100 `score` to a grade band. The refusal-pressure veto is checked FIRST:
 * a noBetPressure ≥ 85 (a hard refusal) or a score ≤ 24 forces HARD_PASS before any band ladder,
 * so a high apparent score can never upgrade a hard refusal. Bands are upper-inclusive.
 */
function gradeSignal(score: number, noBetPressure: number): GseSignalGrade {
  if (noBetPressure >= 85 || score <= 24) return "HARD_PASS";
  if (score <= 44) return "PASS";
  if (score <= 59) return "WATCH";
  if (score <= 72) return "LEAN";
  if (score <= 84) return "SPEAK";
  return "STRONG";
}
