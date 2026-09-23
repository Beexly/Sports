/**
 * arXiv:2607.18299 — APMM: Automated Parlay Market Maker
 *
 * Correlation-aware SGP fair-value layer: prices same-game parlays from per-leg marginals plus shared
 * pairwise (order<=2) interaction parameters instead of independence multiplication, with hub-concentration
 * exposure throttles.
 *
 * Improvement: Build a correlation-aware SGP fair-value layer that prices every same-game parlay from GSE's per-leg marginals plus shared pairwise (order<=2) interaction parameters instead of independence multiplication, with hub-concentration exposure throttles against concentrated low-order informed flow.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: Gate (ADAPT): the correlation-discount mechanism is real and quantified (0.6%-6.2% trader price improvement by order, pooled 0.978; near-zero aggregate maker loss in replay). Improvement: fit the hierarchy on NFL same-game props instead of NBA and extend to order-3 interactions.
 */

/** One parlay leg with its marginal probability. */
export interface SgpLeg {
  id: string;
  p: number; // marginal hit probability
}

/**
 * Fair SGP price with pairwise interactions: log-price = sum log p_i +
 * sum_{i<j} theta_{ij}, where theta captures the correlation adjustment.
 * Falls back to independence when no thetas are given.
 */
export function sgpFairPrice(
  legs: readonly SgpLeg[],
  thetas: ReadonlyMap<string, number>, // key "idA|idB" (sorted)
): number {
  if (legs.length === 0) throw new Error("sgpFairPrice: no legs");
  for (const l of legs) {
    if (l.p <= 0 || l.p > 1) throw new Error("sgpFairPrice: p in (0,1]");
  }
  let lp = legs.reduce((s, l) => s + Math.log(l.p), 0);
  const ids = legs.map((l) => l.id).sort();
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      lp += thetas.get(`${ids[i]}|${ids[j]}`) ?? 0;
    }
  }
  return Math.min(1, Math.exp(lp));
}

/** Correlation discount: independence price minus interaction-aware price. */
export function correlationDiscount(
  legs: readonly SgpLeg[],
  thetas: ReadonlyMap<string, number>,
): number {
  const indep = legs.reduce((s, l) => s * l.p, 1);
  return indep - sgpFairPrice(legs, thetas);
}

/**
 * Hub-concentration throttle: scale the stake by 1/(1 + hubExposure), where
 * hubExposure is the share of open liability on the shared hub leg.
 */
export function hubThrottle(stake: number, hubExposure: number): number {
  if (stake < 0 || hubExposure < 0) throw new Error("hubThrottle: non-negative");
  return stake / (1 + hubExposure);
}
