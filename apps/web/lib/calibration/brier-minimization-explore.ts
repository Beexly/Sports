/**
 * Brier score minimization — what actually moves the number.
 *
 * Brier = mean((p − y)²)
 * Murphy (binned): Brier ≈ REL − RES + UNC
 *
 * To lower Brier honestly:
 *  A) Raise RES  — better ranking (separate wins from losses)
 *  B) Lower REL  — better calibration (maps: Platt/Temp/Isotonic)
 *  C) UNC is fixed by base rate — not a lever
 *
 * With live RES≈0.002 and REL≈0.026, UNC≈0.25:
 *   Brier is dominated by UNC − tiny RES + small REL.
 *   Cutting REL alone (maps) cannot reach Brier≤0.22 if RES stays ~0 and UNC~0.25.
 *   Need RES up (selective + better modelProb) and/or lower UNC via harder filters
 *   that change the outcome mix (careful: must not cherry-pick after seeing results).
 */

export type BrierLever = {
  readonly lever: string;
  readonly targets: "RES" | "REL" | "UNC" | "sample";
  readonly effect: string;
  readonly autonomous: boolean;
  readonly unlocksProven: boolean;
};

export const BRIER_MINIMIZATION_LEVERS: readonly BrierLever[] = [
  {
    lever: "Selective publish |p−0.5|≥δ + pause dead groups",
    targets: "RES",
    effect: "Keep only forecasts that separate outcomes; raises conditional Res",
    autonomous: true,
    unlocksProven: true,
  },
  {
    lever: "Independent modelProb (edge engine / sport models) instead of confidence/100",
    targets: "RES",
    effect: "Real ranking signal; largest honest path to Res lift",
    autonomous: true,
    unlocksProven: true,
  },
  {
    lever: "Market-relative edge when lines exist",
    targets: "RES",
    effect: "Aligns publish set with CLV story; filters noise",
    autonomous: true,
    unlocksProven: true,
  },
  {
    lever: "Platt / Temp / Isotonic / Beta maps",
    targets: "REL",
    effect: "Lowers reliability error and log loss only; apply OFF until Res moves",
    autonomous: false, // gated flag
    unlocksProven: false,
  },
  {
    lever: "Lower floors or invent metrics",
    targets: "sample",
    effect: "FORBIDDEN — theater, not skill",
    autonomous: false,
    unlocksProven: false,
  },
];

/**
 * Back-of-envelope: if REL→0 and UNC fixed, Brier ≈ UNC − RES.
 * Live UNC≈0.25 → need RES ≳ 0.03 just to approach 0.22 before residual REL.
 */
export function resNeededForBrierFloor(
  uncertainty: number,
  brierFloor = 0.22,
  residualRel = 0.02,
): number {
  // brier ≈ rel - res + unc  →  res ≈ rel + unc - brierFloor
  return Math.max(0, residualRel + uncertainty - brierFloor);
}

export function explainLiveMurphy(terms: {
  readonly brier: number;
  readonly reliability: number;
  readonly resolution: number;
  readonly uncertainty: number;
}): string {
  const need = resNeededForBrierFloor(terms.uncertainty);
  return (
    `Brier ${terms.brier.toFixed(4)} ≈ REL ${terms.reliability.toFixed(4)} − RES ${terms.resolution.toFixed(4)} + UNC ${terms.uncertainty.toFixed(4)}. ` +
    `To reach Brier≤0.22 with residual REL~0.02, need Murphy RES ≳ ${need.toFixed(3)} (live ${terms.resolution.toFixed(4)}). ` +
    `Maps shrink REL; only ranking raises RES.`
  );
}
