/**
 * Calibration compute — stub. Exposes the same named exports as the
 * original so callers compile.
 */

export type CalibrationProposalKind =
  | "CONFIDENCE_SHIFT"
  | "WEIGHT_ADJUSTMENT"
  | "THRESHOLD_CHANGE"
  | "FEATURE_DEPRECATION";

export interface CalibrationProposal {
  readonly id: string;
  readonly kind: CalibrationProposalKind;
  readonly title: string;
  readonly rationale: string;
  readonly sampleSize: number;
}

export interface CalibrationBucket {
  readonly label: string;
  readonly confidenceMin: number;
  readonly confidenceMax: number;
  readonly sampleSize: number;
  readonly observedWinRate: number;
  readonly expectedWinRate: number;
  readonly delta: number;
}

export interface CalibrationReport {
  readonly buckets: readonly CalibrationBucket[];
  readonly proposals: readonly CalibrationProposal[];
  readonly sampleSize: number;
  readonly note: string;
}

export function computeCalibration(_input?: unknown): CalibrationReport {
  return {
    buckets: [],
    proposals: [],
    sampleSize: 0,
    note: "Calibration compute is being rebuilt. No proposals are issued until restored.",
  };
}

export function computeCalibrationProposals(): readonly CalibrationProposal[] {
  return [];
}
