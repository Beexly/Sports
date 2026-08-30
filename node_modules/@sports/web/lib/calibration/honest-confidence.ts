import type { Calibrator } from "@sports/prediction-engine";
import { confidenceLabel } from "@/lib/utils";

/**
 * Pure mapping from a raw heuristic confidence to its honest, calibrated
 * display (Thread 2). No I/O — split out from public-confidence.ts (which owns
 * the server-only calibrator build) so this logic is unit-testable.
 */

export interface HonestConfidence {
  /** Calibrated win probability, 0–100. */
  readonly pct: number;
  /** Honest qualitative label (Strong / Good / Moderate / Lean). */
  readonly label: string;
}

/**
 * Map a raw 0–100 confidence to its honest calibrated display.
 *
 * Returns null when calibration must NOT be applied — the gate is off
 * (`canApply` false), the confidence is hidden (`rawConfidence` null), or the
 * calibrator is inactive (insufficient or non-improving sample). Callers fall
 * back to the raw value (clearly the uncalibrated heuristic) in that case.
 */
export function honestConfidence(
  rawConfidence: number | null,
  calibrator: Calibrator,
  canApply: boolean,
): HonestConfidence | null {
  if (rawConfidence == null || !canApply || !calibrator.isActive) return null;
  const p = calibrator.apply(rawConfidence).probability;
  const pct = Math.round(p * 100);
  return { pct, label: confidenceLabel(pct).label };
}
