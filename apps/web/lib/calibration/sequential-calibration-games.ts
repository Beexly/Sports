/**
 * Game-theoretic sequential calibration — arXiv 2509.04203v1
 * ("Game-Theoretic Sequential Calibration...").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes
 * published probabilities and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: treat sequential calibration as a game between the
 * forecaster and an adversary choosing outcomes; the forecaster plays a
 * Blackwell-approachability strategy that drives the vector of
 * group-conditional calibration violations toward the nonpositive
 * orthant. Groups = market segments (spread buckets, total buckets, primetime
 * flag, divisional flag): multicalibration requires calibration not just
 * overall but within every group the adversary can name. Serving-time math:
 * expected calibration error (ECE), worst-group violation, and the
 * approachability correction applied to the next forecast.
 *
 * ACCEPTANCE GATE (improvement-ledger): ADAPT iff the Blackwell strategy
 * drives worst-group ECE below 2pp on the 2025 walk-forward with overall
 * ECE no worse than the baseline recalibrator's, at <=110% of its
 * compute.
 */

/** Expected calibration error with equal-width bins. */
export function expectedCalibrationError(
  predicted: readonly number[],
  actual: ReadonlyArray<0 | 1>,
  bins = 10,
): number {
  const n = predicted.length;
  if (n === 0) return 0;
  let ece = 0;
  for (let b = 0; b < bins; b++) {
    const lo = b / bins;
    const hi = (b + 1) / bins;
    let sp = 0;
    let sa = 0;
    let cnt = 0;
    for (let i = 0; i < n; i++) {
      const p = predicted[i]!;
      if (p >= lo && (p < hi || (b === bins - 1 && p <= hi))) {
        sp += p;
        sa += actual[i]!;
        cnt++;
      }
    }
    if (cnt > 0) ece += (cnt / n) * Math.abs(sp / cnt - sa / cnt);
  }
  return ece;
}

/**
 * Multicalibration violation: max ECE over groups. Groups are parallel
 * arrays of group labels aligned with predicted/actual.
 */
export function worstGroupViolation(
  predicted: readonly number[],
  actual: ReadonlyArray<0 | 1>,
  groups: readonly string[],
  bins = 10,
): { readonly group: string; readonly ece: number } {
  const byGroup = new Map<string, { p: number[]; a: Array<0 | 1> }>();
  for (let i = 0; i < predicted.length; i++) {
    const g = groups[i] ?? "";
    let e = byGroup.get(g);
    if (!e) {
      e = { p: [], a: [] };
      byGroup.set(g, e);
    }
    e.p.push(predicted[i]!);
    e.a.push(actual[i]!);
  }
  let worst = { group: "", ece: 0 };
  for (const [g, e] of byGroup) {
    const v = expectedCalibrationError(e.p, e.a, bins);
    if (v > worst.ece) worst = { group: g, ece: v };
  }
  return worst;
}

/**
 * Blackwell approachability correction: move the next forecast against
 * the current violation vector. correction = -stepSize * violation, added
 * to the raw forecast for members of the violating group, then clamped to
 * [0,1] by the caller.
 */
export function approachabilityCorrection(
  groupViolation: number,
  stepSize: number,
): number {
  const c = -stepSize * groupViolation;
  return c === 0 ? 0 : c; // normalize -0 to 0
}

/**
 * Apply the correction to forecasts in the violating group.
 */
export function applyGroupCorrection(
  predicted: readonly number[],
  groups: readonly string[],
  violatingGroup: string,
  correction: number,
): number[] {
  return predicted.map((p, i) =>
    groups[i] === violatingGroup
      ? Math.min(Math.max(p + correction, 0), 1)
      : p,
  );
}
