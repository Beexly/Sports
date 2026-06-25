/**
 * ConformalDecisionGate / RefusalEngine — make abstention a principled, measurable act.
 *
 * From the research dark-corner inventory. The ApertureStateMachine consumes a
 * `model.refused` boolean; this module is where that boolean earns its truth. Given a
 * modeled probability, its conformal uncertainty interval, and calibration health, it
 * decides whether the model is entitled to take a side at all — or must abstain because
 * the prediction set straddles the decision boundary at the target risk level.
 *
 * Refusal is not a failure; it is the correct output when the evidence cannot support a
 * confident side. Pure, no I/O.
 */

export interface ConformalInput {
  /** Modeled probability of the "over"/home side, in [0,1]. */
  readonly probability: number;
  /** Lower / upper bound of the conformal interval on that probability, in [0,1]. */
  readonly intervalLow: number;
  readonly intervalHigh: number;
  /** Calibration health in [0,1] — how trustworthy the probability is. */
  readonly calibrationHealth: number;
}

export interface ConformalConfig {
  /** The decision boundary the interval must clear to take a side. Default 0.5. */
  readonly boundary: number;
  /** Min margin between the boundary and the near interval edge to ACT. Default 0.02. */
  readonly minMargin: number;
  /** Below this calibration health, always abstain. Default 0.4. */
  readonly minCalibrationHealth: number;
  /** Above this interval width, the band is too wide to act. Default 0.5. */
  readonly maxIntervalWidth: number;
}

export const DEFAULT_CONFORMAL_CONFIG: ConformalConfig = {
  boundary: 0.5,
  minMargin: 0.02,
  minCalibrationHealth: 0.4,
  maxIntervalWidth: 0.5,
};

export type DecisionSide = "over" | "under" | null;

export interface ConformalDecision {
  /** True when the model must NOT take a side. */
  readonly abstain: boolean;
  /** The side the model is entitled to, or null when abstaining. */
  readonly side: DecisionSide;
  /** Distance from the boundary to the nearer interval edge (negative = straddles). */
  readonly margin: number;
  readonly reason: string;
}

/**
 * Decide whether the model may take a side. It abstains when calibration is too low, the
 * interval is too wide, or the conformal interval straddles (or hugs) the boundary. Only
 * an interval that lies entirely on one side of the boundary by `minMargin` earns a side.
 */
export function conformalDecision(
  input: ConformalInput,
  config: ConformalConfig = DEFAULT_CONFORMAL_CONFIG,
): ConformalDecision {
  const low = Math.min(input.intervalLow, input.intervalHigh);
  const high = Math.max(input.intervalLow, input.intervalHigh);
  const width = high - low;
  const { boundary, minMargin, minCalibrationHealth, maxIntervalWidth } = config;

  if (input.calibrationHealth < minCalibrationHealth) {
    return { abstain: true, side: null, margin: 0, reason: `Calibration health ${input.calibrationHealth.toFixed(2)} below ${minCalibrationHealth} — abstain.` };
  }
  if (width > maxIntervalWidth) {
    return { abstain: true, side: null, margin: 0, reason: `Conformal interval width ${width.toFixed(2)} exceeds ${maxIntervalWidth} — too uncertain to act.` };
  }
  if (low > boundary + minMargin) {
    return { abstain: false, side: "over", margin: low - boundary, reason: `Interval [${low.toFixed(2)}, ${high.toFixed(2)}] clears the boundary above — over.` };
  }
  if (high < boundary - minMargin) {
    return { abstain: false, side: "under", margin: boundary - high, reason: `Interval [${low.toFixed(2)}, ${high.toFixed(2)}] clears the boundary below — under.` };
  }
  return { abstain: true, side: null, margin: -(Math.min(boundary - low, high - boundary)), reason: `Interval straddles/hugs the boundary ${boundary} — no confident side, abstain.` };
}

/** Convenience: does this input force a refusal? (feeds ModelState.refused honestly). */
export function shouldRefuse(input: ConformalInput, config: ConformalConfig = DEFAULT_CONFORMAL_CONFIG): boolean {
  return conformalDecision(input, config).abstain;
}
