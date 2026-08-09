/**
 * Empirical Bayes τ for hierarchical group intercepts u_g ~ N(0, τ²).
 * Offline R&D only. Clamp τ ∈ [0.05, 2.0]. No Dirichlet process in prod path.
 */

export const TAU_MIN = 0.05;
export const TAU_MAX = 2.0;

export function clampTau(tau: number): number {
  if (!Number.isFinite(tau)) return 0.5;
  return Math.min(TAU_MAX, Math.max(TAU_MIN, tau));
}

/**
 * Moment EB: from residual means per group (after global fit),
 * excess variance ≈ between-group var of ū_g, then τ² ≈ max(0, var(ū) − mean(se²)).
 */
export function fitEmpiricalBayesTau(
  groupStats: readonly {
    readonly groupKey: string;
    readonly residualMean: number;
    readonly n: number;
  }[],
  options?: { readonly method?: "moment" | "default" },
): { readonly tau: number; readonly method: string; readonly nGroups: number } {
  const usable = groupStats.filter((g) => g.n >= 5);
  if (usable.length < 2) {
    return { tau: clampTau(0.5), method: "default-sparse", nGroups: usable.length };
  }

  const means = usable.map((g) => g.residualMean);
  const grand = means.reduce((a, b) => a + b, 0) / means.length;
  let between = 0;
  for (const m of means) between += (m - grand) ** 2;
  between /= Math.max(1, means.length - 1);

  // Rough within noise: Bernoulli residual var ~ 0.25 / n
  const meanWithin =
    usable.reduce((s, g) => s + 0.25 / Math.max(1, g.n), 0) / usable.length;

  const tau2 = Math.max(0, between - meanWithin);
  const tau = clampTau(Math.sqrt(tau2));
  return {
    tau,
    method: options?.method === "default" ? "default" : "moment-eb",
    nGroups: usable.length,
  };
}

/**
 * Laplace-marginal style: if each group has MAP u_g and curvature h_g,
 * approximate τ from shrunk magnitudes. Falls back to moment if empty.
 */
export function fitTauFromLaplaceGroupMaps(
  groups: readonly {
    readonly uMap: number;
    readonly hessianU: number;
    readonly n: number;
  }[],
): { readonly tau: number; readonly method: string } {
  const usable = groups.filter((g) => g.n >= 5 && g.hessianU > 1e-8);
  if (usable.length < 2) {
    return { tau: clampTau(0.5), method: "default-sparse-laplace" };
  }
  // Posterior var of u ≈ 1/h; E[u²] ≈ τ² * h/(h+1/τ²) roughly → iterate once
  let tau = 0.5;
  for (let i = 0; i < 8; i++) {
    const invT2 = 1 / (tau * tau);
    let num = 0;
    let den = 0;
    for (const g of usable) {
      // shrunk MAP under current τ: u / (1 + h^{-1} τ^{-2}) style
      const postVar = 1 / (g.hessianU + invT2);
      const uPost = g.uMap * (g.hessianU * postVar); // rough
      num += uPost * uPost + postVar;
      den += 1;
    }
    tau = clampTau(Math.sqrt(num / Math.max(1, den)));
  }
  return { tau, method: "laplace-marginal-eb" };
}
