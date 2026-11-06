/**
 * model-prob-bridge — the honest path from "we have settled history" to a REAL
 * modelProb committed into a PickProofReceipt, so Brier/ECE can exist.
 *
 * THE PROBLEM THIS SOLVES
 * ----------------------
 * `PickProofInput.modelProb` has been committed as the literal string "none" since
 * the receipt shipped, because at every mint site (process-sport.ts, the historical
 * backfill) the field was hardcoded `modelProb: null`:
 *
 *     modelProb: null, // honest: no calibrated prob exists; never confidence/100
 *
 * That comment was correct at the time and stays correct unless something maps a
 * HEURISTIC confidence onto a PROBABILITY and proves, out-of-sample, that the map
 * helps. The consumer already exists and is waiting:
 * eval/edge-lab/run-clv-report.ts joins `proofReceipt.modelProb` and refuses to
 * report Brier/ECE until a settled pick carries a real number:
 *
 *     "No settled pick carries a real modelProb yet ... Brier/ECE are not
 *      computable — and we will NOT fabricate them."
 *
 * So the missing link is exactly one function: given the settled, learning-eligible
 * corpus and a pick's published confidence, return a calibrated probability — or
 * `null`, honestly, when no such probability can be defended.
 *
 * WHY NOT confidence/100
 * ----------------------
 * `confidence` is a 0–100 heuristic CONVICTION score, not a probability. It is
 * computed from edge/dispersion factors, so it is overconfident by construction and
 * is NOT on a probability scale (a "70 confidence" pick does not win 70% of the
 * time — measured base rate on the 2023 W1-2 backfill corpus is ~47%). Writing
 * `confidence/100` into modelProb would (a) fabricate a calibration claim, and
 * (b) poison every downstream Brier score with a number we know is miscalibrated
 * before it is even measured. The receipt builder cannot detect this: 0.7 is a
 * legal probability. The refusal has to live HERE, at the only place that knows
 * whether a validated map exists.
 *
 * WHY THIS IS SAFE TO CALL AT MINT TIME
 * -------------------------------------
 * `resolveModelProb` is PURE and self-suppressing in the same posture as
 * `buildCalibrator` / `buildCalibrationLadder`: with no samples it returns
 * `{ modelProb: null }`. Nothing here can be tricked into emitting a number — the
 * ladder's own activation gate (`isActive`) is the sole authority, and an inactive
 * ladder's identity fallback (confidence/100) is explicitly discarded rather than
 * passed through.
 *
 * Deliberately NOT wired into live scoring by this module: activation is a founder-
 * gated MODEL_VERSION step (see platform-config.calibrationAdjustmentsEnabled and
 * docs/calibration-proposals/FROZEN.md). This module only makes the number
 * AVAILABLE and PROVEN; it does not decide that the fleet should start using it.
 */

import {
  buildCalibrationLadder,
  type CalibrationLadder,
} from "./calibration-ladder.js";
import type { CalibrationSample } from "./probability-calibration.js";

/**
 * Why a resolved modelProb is absent. Surfaced so an operator reading a mint log
 * sees the reason rather than a silent null. Never fabricated.
 */
export type ModelProbRefusalReason =
  | "no-settled-samples"
  | "ladder-inactive"
  | "gate-closed"
  | "non-finite-confidence"
  | "out-of-range-probability";

export interface ResolvedModelProb {
  /**
   * A genuinely calibrated win probability in (0,1), or null when none can be
   * defended. `null` is the honest default and must be passed straight through to
   * `buildPickProofReceipt`, which commits it as "none".
   */
  readonly modelProb: number | null;
  /** Calibration method that produced the number ("platt" / "isotonic" / "binned"). */
  readonly method: string;
  /** Settled samples that backed the fit. */
  readonly sampleSize: number;
  /** Held-out ECE per candidate method, so the choice is auditable at mint time. */
  readonly heldOutEce: Readonly<Record<string, number>>;
  /** Empty when modelProb is present; otherwise the refusal reason. */
  readonly refusal: ModelProbRefusalReason | null;
  /**
   * True only when a validated map was actually applied. Mirrors the calibrator's
   * own `calibrated` flag so no caller can mistake the identity fallback for a
   * calibrated number.
   */
  readonly calibrated: boolean;
}

const REFUSE = (
  reason: ModelProbRefusalReason,
  ladder: Pick<CalibrationLadder, "method" | "sampleSize" | "heldOutEce">,
): ResolvedModelProb => ({
  modelProb: null,
  method: ladder.method,
  sampleSize: ladder.sampleSize,
  heldOutEce: ladder.heldOutEce,
  refusal: reason,
  calibrated: false,
});

/**
 * Resolve the model probability for ONE pick from the settled calibration corpus.
 *
 * `samples` MUST be chronological (oldest → newest): `buildCalibrationLadder`
 * splits them time-ordered so the method is selected against a HELD-OUT FUTURE,
 * not in-sample. Passing an unordered sample silently manufactures out-of-sample
 * performance that does not exist.
 *
 * `gateOpen` is the caller's audited activation decision (see
 * platform-config.calibrationAdjustmentsEnabled). It defaults to CLOSED so adding
 * this call to a mint path cannot by itself start writing numbers.
 *
 * Returns `{ modelProb: null }` — never a fabricated probability — whenever:
 *   - the gate is closed,
 *   - there are no settled samples,
 *   - the ladder did not genuinely activate (too few samples, or no method beat
 *     the raw forecast on held-out data),
 *   - the resulting probability is not strictly inside (0,1).
 */
export function resolveModelProb(
  confidence0to100: number,
  samples: readonly CalibrationSample[],
  opts: { readonly gateOpen?: boolean } = {},
): ResolvedModelProb {
  const gateOpen = opts.gateOpen === true;

  // Build the ladder even when the gate is closed, so the refusal report still
  // carries the true sample size and held-out ECE an operator needs to decide.
  const ladder =
    samples.length === 0
      ? buildCalibrationLadder([])
      : buildCalibrationLadder(samples);

  if (!gateOpen) return REFUSE("gate-closed", ladder);
  if (ladder.sampleSize === 0) return REFUSE("no-settled-samples", ladder);
  // The ladder's identity fallback returns confidence/100 with calibrated:false.
  // That is precisely the fabricated number this module exists to refuse, so an
  // inactive ladder stops here rather than falling through to apply().
  if (!ladder.isActive) return REFUSE("ladder-inactive", ladder);
  if (!Number.isFinite(confidence0to100)) return REFUSE("non-finite-confidence", ladder);

  const applied = ladder.apply(confidence0to100);
  // Belt-and-braces: apply() is contractually calibrated:true when isActive, but
  // the receipt is a tamper-evident commitment and a wrong number here is permanent.
  if (!applied.calibrated) return REFUSE("ladder-inactive", ladder);
  if (!Number.isFinite(applied.probability) || applied.probability <= 0 || applied.probability >= 1) {
    return REFUSE("out-of-range-probability", ladder);
  }

  return {
    modelProb: applied.probability,
    method: applied.method,
    sampleSize: ladder.sampleSize,
    heldOutEce: ladder.heldOutEce,
    refusal: null,
    calibrated: true,
  };
}

/**
 * The settled corpus a mint path must query to feed `resolveModelProb`.
 *
 * Documented here so the query is written once, identically, wherever the map is
 * fit. The predicate is deliberately the SAME learning-eligibility gate the public
 * calibrator and the cockpit calibration view already use — a map fit from a
 * looser corpus would be a second, un-audited interpretation of "settled history":
 *
 *   - result IN (WIN, LOSS)      PUSH/VOID carry no binary outcome to score against
 *   - isBootstrap = false         bootstrap picks are excluded from canonical metrics
 *   - signalSnapshot.eligibleForLearning   the row is fit-eligible (see schema note)
 *   - modelVersion != v5.0.0-seed  the seed version is not a real forecast
 *   - orderBy settledAt ASC       chronological, for the time-ordered held-out split
 *
 * `confidence` is the forecast basis (p = confidence/100) because that is the only
 * forecast the receipt commits alongside modelProb — it is what the calibration map
 * is learning to correct.
 */
export const MODEL_PROB_CORPUS_WHERE = {
  result: { in: ["WIN", "LOSS"] },
  isBootstrap: false,
  signalSnapshot: { is: { eligibleForLearning: true } },
  NOT: { modelVersion: "v5.0.0-seed" },
} as const;

export const MODEL_PROB_CORPUS_ORDER_BY = { settledAt: "asc" } as const;