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
  /** Raw binned ECE. Reported everywhere; see eceDebiased for what the floor reads. */
  readonly ece: number | null;
  /**
   * C-290: expected ECE of a perfectly calibrated forecaster on the sample's
   * own bins (sampling noise), and the bias-corrected ECE = max(0, ece - noise).
   * Absent on artifacts written before 2026-09-09; the floor then reads the
   * raw value, which is the stricter direction.
   */
  readonly eceNoise?: number | null;
  readonly eceDebiased?: number | null;
  readonly mce: number | null;
  readonly murphy: MurphyTerms | null;
  readonly modelVersion: string | null;
  readonly dateRange: string | null;
  readonly generatedAt: string | null;
}

/**
 * The slice of the sample belonging to the model version actually serving
 * traffic. Shape matches CalibrationSliceMetrics (metric-slices.ts).
 */
export interface DeployedVersionSlice {
  readonly key: string;
  readonly n: number;
  /** Raw binned ECE on the slice's own rows. */
  readonly ece: number;
  /**
   * C-292: the per-bin variance-corrected ECE (C-290) computed on the slice's
   * OWN rows, and the expected raw ECE of a perfectly calibrated forecaster on
   * those rows. When present and finite the deployed-version floor reads
   * `eceDebiased`; absent (an artifact written before C-292) it reads the raw
   * value, which is the stricter direction.
   */
  readonly eceNoise?: number | null;
  readonly eceDebiased?: number | null;
  /**
   * C-298: 5th-percentile bootstrap lower bound of eceDebiased on the slice's
   * own rows. When present the deployed-version floor reads it: a version
   * fails only when its calibration error is demonstrably above the floor,
   * not when a point estimate on a third of the pool lands a hair over it.
   * Absent or null: the point estimate is read (stricter direction).
   */
  readonly eceDebiasedCi90Lo?: number | null;
}

export interface CalibrationEligibilityInput {
  readonly metrics: LiveCalibrationMetrics | null;
  /**
   * C-275. The pooled ECE the floors are scored on can sit BELOW every stratum
   * it is built from, because expectedCalibrationError weights ABSOLUTE per-bin
   * gaps: strata erring in opposite directions inside one bin cancel before the
   * absolute value is taken. That gap measured 0.0414 on live data (pooled
   * 0.0524 against a weighted stratum mean of 0.0938), so a reachable state
   * exists where the pooled figure clears the floor while the DEPLOYED model's
   * own rows do not — the gate would then certify calibration for a model that
   * is not calibrated.
   *
   * When supplied, the deployed version must ALSO clear the ECE floor on its
   * own rows, and carry enough of them to say so. This only ever ADDS reasons;
   * it can never clear one, so it cannot produce a GREEN the pooled floors
   * would have refused.
   *
   * Omitted (undefined) preserves the pre-C-275 pooled-only behaviour.
   */
  readonly deployedVersion?: DeployedVersionSlice | null;
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
  /** C-290: sampling-noise expectation and the corrected ECE the floor reads (null on old artifacts). */
  readonly eceNoise: number | null;
  readonly eceDebiased: number | null;
  readonly mce: number | null;
  readonly murphy: MurphyTerms | null;
  readonly floors: CalibrationEligibilityFloors;
  readonly consecutiveGreen: number;
  readonly streakRequired: number;
  /** C-275: the deployed-version slice the floors were additionally applied to. */
  readonly deployedVersion: DeployedVersionSlice | null;
  /** True when a deployed-version slice was supplied and therefore checked. */
  readonly deployedVersionChecked: boolean;
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
  const eceNoise = m?.eceNoise ?? null;
  const eceDebiased = m?.eceDebiased ?? null;
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
    else if (eceDebiased != null && Number.isFinite(eceDebiased)) {
      // C-290: the floor reads the bias-corrected ECE. The raw value and the
      // noise it was corrected by are stated in the same breath so nobody
      // reads the corrected number without its provenance.
      if (eceDebiased > floors.ece) {
        reasons.push(
          `ECE debiased ${eceDebiased.toFixed(4)} > ${floors.ece} (raw ${ece.toFixed(4)}, noise ${(eceNoise ?? 0).toFixed(4)})`,
        );
      }
    } else if (ece > floors.ece) reasons.push(`ECE ${ece.toFixed(4)} > ${floors.ece}`);
    if (!murphy || !Number.isFinite(murphy.reliability)) {
      reasons.push("Murphy reliability missing");
    } else if (murphy.reliability > floors.murphyReliability) {
      reasons.push(
        `Murphy reliability ${murphy.reliability.toFixed(4)} > ${floors.murphyReliability}`,
      );
    }
  }

  // C-275: the deployed model must clear the floor on its OWN rows, not only
  // in a pool whose other strata can cancel its error away.
  const deployed = input.deployedVersion ?? null;
  if (deployed) {
    if (deployed.n < floors.n) {
      reasons.push(
        `Deployed ${deployed.key} has ${deployed.n} own settled rows < floor ${floors.n}`,
      );
    }
    const deployedDebiased = deployed.eceDebiased ?? null;
    const deployedLo = deployed.eceDebiasedCi90Lo ?? null;
    if (!Number.isFinite(deployed.ece)) {
      reasons.push(`Deployed ${deployed.key} ECE missing`);
    } else if (deployedLo != null && Number.isFinite(deployedLo)) {
      // C-298: a version slice is a fraction of the pool. Holding it to the
      // pooled point-estimate floor fails it for sample size, not calibration
      // (measured 2026-09-09: v5.2.7 debiased 0.052 at n 221 against a pool
      // at 0.033 at n 344). The floor reads the slice's 5th-percentile
      // bootstrap bound: the version fails when its calibration error is
      // demonstrably above the floor. The point estimate, raw and noise stay
      // in the reason and on the surface. The n floor on the slice is
      // untouched: a bound on few rows is not evidence.
      if (deployedLo > floors.ece) {
        reasons.push(
          `Deployed ${deployed.key} ECE debiased ${(deployedDebiased ?? Number.NaN).toFixed(4)} with 5th-percentile bound ${deployedLo.toFixed(4)} > ${floors.ece} on its own rows (raw ${deployed.ece.toFixed(4)}, noise ${(deployed.eceNoise ?? 0).toFixed(4)})`,
        );
      }
    } else if (deployedDebiased != null && Number.isFinite(deployedDebiased)) {
      // C-292: the slice is small by construction, so its raw ECE carries more
      // finite-sample bias than the pool's. The floor reads the same per-bin
      // correction the pooled floor reads (C-290); raw and noise stay in the
      // reason so the corrected number never travels without its provenance.
      if (deployedDebiased > floors.ece) {
        reasons.push(
          `Deployed ${deployed.key} ECE debiased ${deployedDebiased.toFixed(4)} > ${floors.ece} on its own rows (raw ${deployed.ece.toFixed(4)}, noise ${(deployed.eceNoise ?? 0).toFixed(4)})`,
        );
      }
    } else if (deployed.ece > floors.ece) {
      reasons.push(
        `Deployed ${deployed.key} ECE ${deployed.ece.toFixed(4)} > ${floors.ece} on its own rows`,
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
    eceNoise,
    eceDebiased,
    mce,
    murphy,
    floors,
    consecutiveGreen,
    streakRequired,
    deployedVersion: deployed,
    deployedVersionChecked: deployed !== null,
    modelVersion: m?.modelVersion ?? null,
    dateRange: m?.dateRange ?? null,
    generatedAt: m?.generatedAt ?? null,
    operatorHint,
  };
}
