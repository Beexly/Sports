export type CalibrationContractStatus =
  | "VALIDATED"
  | "WATCH"
  | "INSUFFICIENT_SAMPLE"
  | "DRIFTING"
  | "BLOCKED";

export interface CalibrationContractInput {
  readonly sampleCount: number;
  readonly minSampleCount?: number;
  readonly expectedCalibrationError?: number;
  readonly maxExpectedCalibrationError?: number;
  readonly brierScore?: number;
  readonly baselineBrierScore?: number;
  readonly driftScore?: number;
  readonly maxDriftScore?: number;
}

export interface CalibrationContractResult {
  readonly status: CalibrationContractStatus;
  readonly probabilityClaimsAllowed: boolean;
  readonly scoreModifier: number;
  readonly reasons: readonly string[];
}

export function assessCalibrationContract(input: CalibrationContractInput): CalibrationContractResult {
  const minSampleCount = input.minSampleCount ?? 250;
  const maxEce = input.maxExpectedCalibrationError ?? 0.06;
  const maxDrift = input.maxDriftScore ?? 0.1;
  const reasons: string[] = [];

  if (input.sampleCount < minSampleCount) {
    reasons.push(`Calibration sample ${input.sampleCount} is below required ${minSampleCount}.`);
    return {
      probabilityClaimsAllowed: false,
      reasons,
      scoreModifier: -18,
      status: "INSUFFICIENT_SAMPLE",
    };
  }

  if (input.expectedCalibrationError === undefined || !Number.isFinite(input.expectedCalibrationError)) {
    reasons.push("Expected calibration error is missing.");
    return {
      probabilityClaimsAllowed: false,
      reasons,
      scoreModifier: -25,
      status: "BLOCKED",
    };
  }

  if ((input.driftScore ?? 0) > maxDrift) {
    reasons.push(`Calibration drift ${round4(input.driftScore ?? 0)} exceeds ${maxDrift}.`);
    return {
      probabilityClaimsAllowed: false,
      reasons,
      scoreModifier: -22,
      status: "DRIFTING",
    };
  }

  if (input.expectedCalibrationError > maxEce) {
    reasons.push(`ECE ${round4(input.expectedCalibrationError)} exceeds ${maxEce}.`);
    return {
      probabilityClaimsAllowed: false,
      reasons,
      scoreModifier: -12,
      status: "WATCH",
    };
  }

  if (
    input.brierScore !== undefined &&
    input.baselineBrierScore !== undefined &&
    input.brierScore > input.baselineBrierScore
  ) {
    reasons.push("Brier score is worse than baseline.");
    return {
      probabilityClaimsAllowed: false,
      reasons,
      scoreModifier: -10,
      status: "WATCH",
    };
  }

  reasons.push("Calibration sample, ECE, drift, and baseline checks are within local thresholds.");
  return {
    probabilityClaimsAllowed: true,
    reasons,
    scoreModifier: 8,
    status: "VALIDATED",
  };
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
