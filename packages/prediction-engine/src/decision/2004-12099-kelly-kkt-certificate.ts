// ============================================================
// Kelly KKT certificate + sliding-window dominance (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: the certificate is adopted
 * unconditionally once it passes on historical data (correctness property);
 * the dominance screen needs its walk-forward gate, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2004.12099 — "Necessary and Sufficient Conditions for Frequency-Based Kelly Optimal Portfolio"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Theorem 3.1 gives necessary and sufficient KKT
 * conditions for the frequency-based Kelly-optimal portfolio:
 * E[(1+X_{n,i})/(1+K*^T X_n)] = 1 for every asset with positive weight and
 * <= 1 for every zero-weight asset. The R_{ij}(k) sliding-window statistic
 * tests pairwise dominance over time, replacing bang-bang all-in with
 * capped reallocation.
 *
 * IMPROVEMENT (from ledger): Use Theorem 3.1 as a unit-test certificate on
 * the constrained Kelly solver (assert E[(1+X_{n,i})/(1+K*^T X_n)] <= 1 +
 * tol for zero-weight picks and = 1 +/- tol for positive-weight picks on
 * the empirical distribution -- any violation fails the build); add the
 * R_{ij}(k) sliding-window dominance test over each slate's
 * mutually-exclusive/correlated picks as a walk-forward redundancy screen;
 * replace bang-bang all-in with capped reallocation under the existing
 * fractional ceiling.
 *
 * ACCEPTANCE GATE: ADOPT the certificate test unconditionally if it passes
 * on historical data (it is a correctness property, not a performance bet).
 * ADOPT the dominance screen only if it improves realized ROI/drawdown >=
 * 10% walk-forward.
 */

/**
 * Theorem 3.1 certificate: for candidate weights K* on the empirical
 * return scenarios, check E[(1+X_i)/(1+K*^T X)] <= 1+tol for zero-weight
 * picks and = 1±tol for positive-weight picks.
 */
export function kktCertificate(
  fractions: number[],
  scenarios: number[][],
  tol = 0.02,
): { passes: boolean; violations: { pick: number; value: number; weight: number }[] } {
  const n = fractions.length;
  const violations: { pick: number; value: number; weight: number }[] = [];
  const m = scenarios.length;
  if (m === 0 || n === 0) return { passes: false, violations: [{ pick: -1, value: NaN, weight: NaN }] };
  for (let i = 0; i < n; i++) {
    let acc = 0;
    let count = 0;
    for (const sc of scenarios) {
      let denom = 1;
      for (let j = 0; j < n; j++) denom += fractions[j]! * (sc[j] ?? 0);
      if (denom <= 0) continue;
      acc += (1 + (sc[i] ?? 0)) / denom;
      count++;
    }
    const value = count > 0 ? acc / count : NaN;
    const w = fractions[i]!;
    if (Number.isNaN(value)) {
      violations.push({ pick: i, value, weight: w });
    } else if (w > 1e-9) {
      if (Math.abs(value - 1) > tol) violations.push({ pick: i, value, weight: w });
    } else {
      if (value > 1 + tol) violations.push({ pick: i, value, weight: w });
    }
  }
  return { passes: violations.length === 0, violations };
}

/**
 * R_{ij}(k) sliding-window dominance statistic: over window k, the ratio of
 * mean (1+X_i)/(1+X_j). Values <= 1 sustained across windows mark i as
 * dominated by j (walk-forward redundancy screen input).
 */
export function slidingWindowDominanceRatio(
  returnsI: number[],
  returnsJ: number[],
  window: number,
): number[] {
  const n = Math.min(returnsI.length, returnsJ.length);
  const out: number[] = [];
  for (let k = 0; k + window <= n; k++) {
    let acc = 0;
    let count = 0;
    for (let t = k; t < k + window; t++) {
      const denom = 1 + returnsJ[t]!;
      if (denom <= 0) continue;
      acc += (1 + returnsI[t]!) / denom;
      count++;
    }
    out.push(count > 0 ? acc / count : Infinity);
  }
  return out;
}

/**
 * Walk-forward redundancy screen: suppress pick i when its R_{ij}(k) <= 1
 * in at least minWindows windows against some pick j, then reallocate its
 * weight under the fractional ceiling (capped reallocation, never all-in).
 */
export function walkForwardRedundancyScreen(
  pickIds: string[],
  returnsByPick: Record<string, number[]>,
  window: number,
  minWindows: number,
  fractionalCeiling: number,
): { suppressed: string[]; reallocatedCap: number } {
  const suppressed: string[] = [];
  for (let i = 0; i < pickIds.length; i++) {
    for (let j = 0; j < pickIds.length; j++) {
      if (i === j) continue;
      const ratios = slidingWindowDominanceRatio(
        returnsByPick[pickIds[i]!] ?? [],
        returnsByPick[pickIds[j]!] ?? [],
        window,
      );
      const dominatedWindows = ratios.filter((r) => r <= 1).length;
      if (dominatedWindows >= minWindows && !suppressed.includes(pickIds[i]!)) {
        suppressed.push(pickIds[i]!);
      }
    }
  }
  return { suppressed, reallocatedCap: fractionalCeiling };
}

/**
 * Capped reallocation: redistribute a suppressed pick's fraction to the
 * surviving picks pro-rata, capping every survivor at the fractional
 * ceiling (bang-bang all-in is explicitly replaced by this).
 */
export function cappedReallocate(
  fractions: Record<string, number>,
  suppressed: string[],
  fractionalCeiling: number,
): Record<string, number> {
  const survivors = Object.keys(fractions).filter((id) => !suppressed.includes(id));
  const freed = suppressed.reduce((a, id) => a + (fractions[id] ?? 0), 0);
  const out: Record<string, number> = {};
  const survivorMass = survivors.reduce((a, id) => a + (fractions[id] ?? 0), 0);
  for (const id of survivors) {
    const share = survivorMass > 0 ? (fractions[id] ?? 0) / survivorMass : 1 / Math.max(survivors.length, 1);
    out[id] = Math.min((fractions[id] ?? 0) + freed * share, fractionalCeiling);
  }
  for (const id of suppressed) out[id] = 0;
  return out;
}
