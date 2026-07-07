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
  const confidenceScore = clampScore(0.45 * input.signalIntegrityIndex + 0.3 * input.calibrationIntegrityGrade + 0.25 * (100 - input.driftPressure));
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
    grade: gradeSignal(score, input.noBetPressure),
    metricId: "gse-signal-score",
    probability: null,
    score: round(score, 2),
    status: "SHADOW",
  };
}

function normalizeScore(value: number): number {
  return clampScore(value) / 100;
}

function gradeSignal(score: number, noBetPressure: number): GseSignalGrade {
  if (noBetPressure >= 85 || score <= 24) return "HARD_PASS";
  if (score <= 44) return "PASS";
  if (score <= 59) return "WATCH";
  if (score <= 72) return "LEAN";
  if (score <= 84) return "SPEAK";
  return "STRONG";
}
