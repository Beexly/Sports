/**
 * CalibrationEligibility engine — pure.
 *
 * GREEN only when LIVE metrics (canonical samples) meet all floors AND
 * consecutiveGreen ≥ K. Never lowers floors. Never uses demo N or commencedTotal.
 */

export type EligibilityStatus = "GREEN" | "RED";

export interface MurphyTerms {
  readonly reliability: number;
  readonly resolution: number;
  readonly uncertainty: number;
}

export interface CalibrationEligibilityFloors {
  /** Min live map sample size (WIN/LOSS calibration n). */
  readonly n: number;
  /** Brier upper bound (lower is better). */
  readonly brier: number;
  /** ECE upper bound. */
  readonly ece: number;
  /** Murphy reliability upper bound (lower is better). */
  readonly murphyReliability: number;
}

export interface LiveCalibrationMetrics {
  readonly n: number;
  readonly brier: number | null;
  readonly ece: number | null;
  readonly mce: number | null;
  readonly murphy: MurphyTerms | null;
  readonly modelVersion: string | null;
  readonly dateRange: string | null;
  readonly generatedAt: string | null;
}

export interface CalibrationEligibilityInput {
  readonly metrics: LiveCalibrationMetrics | null;
  readonly canonicalSettled: number;
  readonly minSettledForLearning: number;
  readonly settlementHealthy: boolean;
  /** Prior consecutive GREEN *runs* before this evaluation (durable). */
  readonly consecutiveGreenPrior: number;
  /** Required streak length K (default 3). */
  readonly streakRequired: number;
  readonly floors?: Partial<CalibrationEligibilityFloors>;
}

export interface CalibrationEligibilityReport {
  readonly status: EligibilityStatus;
  /** This run met single-run floors (before streak). */
  readonly runMeetsFloors: boolean;
  readonly reasons: readonly string[];
  readonly n: number;
  readonly brier: number | null;
  readonly ece: number | null;
  readonly mce: number | null;
  readonly murphy: MurphyTerms | null;
  readonly floors: CalibrationEligibilityFloors;
  readonly consecutiveGreen: number;
  readonly streakRequired: number;
  readonly modelVersion: string | null;
  readonly dateRange: string | null;
  readonly generatedAt: string | null;
  readonly operatorHint: string;
}

export const DEFAULT_CALIBRATION_FLOORS: CalibrationEligibilityFloors = {
  n: 100,
  brier: 0.22,
  ece: 0.05,
  murphyReliability: 0.05,
};

export function resolveCalibrationFloors(
  partial: Partial<CalibrationEligibilityFloors> | undefined,
  minSettledForLearning: number,
): CalibrationEligibilityFloors {
  const baseN = Math.max(1, minSettledForLearning || DEFAULT_CALIBRATION_FLOORS.n);
  return {
    n: Math.max(1, partial?.n ?? baseN),
    brier: partial?.brier ?? DEFAULT_CALIBRATION_FLOORS.brier,
    ece: partial?.ece ?? DEFAULT_CALIBRATION_FLOORS.ece,
    murphyReliability:
      partial?.murphyReliability ?? DEFAULT_CALIBRATION_FLOORS.murphyReliability,
  };
}

export function evaluateCalibrationEligibility(
  input: CalibrationEligibilityInput,
): CalibrationEligibilityReport {
  const floors = resolveCalibrationFloors(input.floors, input.minSettledForLearning);
  const streakRequired = Math.max(1, Math.floor(input.streakRequired));
  const prior = Math.max(0, Math.floor(input.consecutiveGreenPrior));
  const reasons: string[] = [];

  const m = input.metrics;
  const n = m?.n ?? 0;
  const brier = m?.brier ?? null;
  const ece = m?.ece ?? null;
  const mce = m?.mce ?? null;
  const murphy = m?.murphy ?? null;

  if (!input.settlementHealthy) {
    reasons.push("Settlement not healthy");
  }
  if (input.canonicalSettled < input.minSettledForLearning) {
    reasons.push(
      `Canonical settled ${input.canonicalSettled}/${input.minSettledForLearning}`,
    );
  }
  if (!m || n <= 0) {
    reasons.push("No live calibration metrics artifact");
  } else {
    if (n < floors.n) reasons.push(`Map n ${n} < floor ${floors.n}`);
    if (brier == null || !Number.isFinite(brier)) reasons.push("Brier missing");
    else if (brier > floors.brier) reasons.push(`Brier ${brier.toFixed(4)} > ${floors.brier}`);
    if (ece == null || !Number.isFinite(ece)) reasons.push("ECE missing");
    else if (ece > floors.ece) reasons.push(`ECE ${ece.toFixed(4)} > ${floors.ece}`);
    if (!murphy || !Number.isFinite(murphy.reliability)) {
      reasons.push("Murphy reliability missing");
    } else if (murphy.reliability > floors.murphyReliability) {
      reasons.push(
        `Murphy reliability ${murphy.reliability.toFixed(4)} > ${floors.murphyReliability}`,
      );
    }
  }

  const runMeetsFloors = reasons.length === 0;
  const consecutiveGreen = runMeetsFloors ? prior + 1 : 0;
  const status: EligibilityStatus =
    runMeetsFloors && consecutiveGreen >= streakRequired ? "GREEN" : "RED";

  if (runMeetsFloors && status === "RED") {
    reasons.push(
      `Streak ${consecutiveGreen}/${streakRequired} — need ${streakRequired - consecutiveGreen} more consecutive GREEN run(s)`,
    );
  }

  let operatorHint: string;
  if (status === "GREEN") {
    operatorHint = `Eligibility GREEN (${consecutiveGreen}≥${streakRequired}). Publish automation may promote when CALIBRATION_AUTO_PUBLISH=true.`;
  } else if (runMeetsFloors) {
    operatorHint = `Floors met this run; streak ${consecutiveGreen}/${streakRequired}. Keep calibration-metrics cron running.`;
  } else {
    operatorHint = `Eligibility RED: ${reasons.slice(0, 3).join("; ")}. Do not publish performance claims.`;
  }

  return {
    status,
    runMeetsFloors,
    reasons,
    n,
    brier,
    ece,
    mce,
    murphy,
    floors,
    consecutiveGreen,
    streakRequired,
    modelVersion: m?.modelVersion ?? null,
    dateRange: m?.dateRange ?? null,
    generatedAt: m?.generatedAt ?? null,
    operatorHint,
  };
}
