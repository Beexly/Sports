/**
 * CFSC cross-block fine-grained semantic cascade config (per-level lambda)
 *
 * Research port: arXiv:2404.19383
 * Normalized lane: sports_cv | Doctrine: PROPRIETARY_EDGE
 *
 * Adds the cross-block fine-grained semantic cascade (CFSC) to the skeleton-based action-recognition lane: learns a per-level lambda_v (attention over cascade depths) instead of a scalar lambda, compared against the fixed-lambda baseline. Config + combination math only.
 *
 * ACCEPTANCE GATE: Adopt CFSC only if it delivers >=+1.5pp top-1 on the strong-backbone setting with <=10% inference-cost increase; else keep fixed-lambda.
 */

export interface CfscConfig {
  /** per-level attention weights over cascade depths; must sum to 1 */
  lambdaV: number[];
  levels: number;
}

export const CFSC_TOP1_LIFT_PP = 1.5;
export const CFSC_MAX_COST_INCREASE = 0.1;

/** Build a uniform-lambda config (the fixed-lambda baseline equivalent). */
export function uniformCfsc(levels: number): CfscConfig {
  if (levels <= 0) return { lambdaV: [], levels: 0 };
  return { lambdaV: new Array(levels).fill(1 / levels), levels };
}

/** Normalize arbitrary per-level weights into a valid lambda_v. */
export function normalizeLambda(weights: number[]): CfscConfig {
  const s = weights.reduce((a, b) => a + b, 0);
  if (s <= 0 || weights.length === 0) return uniformCfsc(Math.max(1, weights.length));
  return { lambdaV: weights.map((w) => Math.max(0, w) / s), levels: weights.length };
}

/** Fuse per-level logits with the cascade attention weights. */
export function fuseCascade(logitsPerLevel: number[][], cfg: CfscConfig): number[] {
  if (logitsPerLevel.length === 0) return [];
  const dim = (logitsPerLevel[0] ?? []).length;
  const out = new Array(dim).fill(0);
  for (let l = 0; l < logitsPerLevel.length && l < cfg.lambdaV.length; l++) {
    const w = cfg.lambdaV[l] ?? 0;
    const lv = logitsPerLevel[l] ?? [];
    for (let d = 0; d < dim; d++) out[d] = (out[d] ?? 0) + w * (lv[d] ?? 0);
  }
  return out;
}

/** Gate: >=1.5pp top-1 lift AND <=10% inference-cost increase. */
export function cfscGatePasses(top1LiftPp: number, costIncrease: number): boolean {
  return top1LiftPp >= CFSC_TOP1_LIFT_PP && costIncrease <= CFSC_MAX_COST_INCREASE;
}


/** Live-data gate: stays off until CFSC cascade validated on GSE data. */
export const GSE_CFSC_ENABLED = false;
