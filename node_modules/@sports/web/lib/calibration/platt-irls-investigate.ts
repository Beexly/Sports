/**
 * Investigate Platt scaling via IRLS (MAP) — educational + offline fit diagnostics.
 * Does NOT enable production map apply.
 *
 * Model: P(y=1|s) = σ(A·s + B), s = logit(p_raw)
 * Prior: A ~ N(1,1), B ~ N(0,1)  →  MAP = IRLS on NLL + (1/2) prec·(θ−θ0)²
 *
 * Newton step each iter:
 *   g = X'(p − y) + Σ₀⁻¹ (θ − θ₀)
 *   H = X' W X + Σ₀⁻¹,  W = diag(p(1−p))
 *   θ ← θ − H⁻¹ g
 */

import { fitPlattIrlS, logit, applyPlattToProb, sigmoid } from "@/lib/calibration/platt-scaling";

export type PlattInvestigateReport = {
  readonly A: number;
  readonly B: number;
  readonly n: number;
  readonly interpretation: {
    readonly A_means: string;
    readonly B_means: string;
    readonly rescale: "compress" | "expand" | "near_identity" | "flip_risk";
  };
  readonly exampleMapped: readonly { readonly pRaw: number; readonly pCal: number }[];
  readonly applyAllowed: false;
  readonly note: string;
};

export function investigatePlattIrlS(
  samples: readonly { p: number; y: 0 | 1 }[],
): PlattInvestigateReport {
  const { A, B } = fitPlattIrlS(
    samples.map((s) => ({ score: logit(s.p), outcome: s.y })),
  );

  let rescale: PlattInvestigateReport["interpretation"]["rescale"] = "near_identity";
  if (A < 0) rescale = "flip_risk";
  else if (A < 0.7) rescale = "compress";
  else if (A > 1.3) rescale = "expand";

  const grid = [0.2, 0.35, 0.5, 0.65, 0.8];
  return {
    A,
    B,
    n: samples.length,
    interpretation: {
      A_means:
        "A scales logit(p): A<1 pulls probabilities toward 0.5 (overconfident raw); A>1 sharpens.",
      B_means:
        "B shifts logit: B>0 raises all calibrated probs (raw underconfident on average).",
      rescale,
    },
    exampleMapped: grid.map((pRaw) => ({
      pRaw,
      pCal: applyPlattToProb(pRaw, A, B),
    })),
    applyAllowed: false,
    note:
      "Platt fixes reliability (levels), not resolution (ranking). With live Res≈0, enabling apply will not unlock PROVEN.",
  };
}

export { sigmoid, logit };
