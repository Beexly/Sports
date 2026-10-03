/**
 * Bayesian / MAP Platt = logistic regression on logit(score).
 * Offline R&D only — does NOT write production maps or enable adjustments.
 *
 * Model: P(y=1|p) = sigmoid(A * logit(p) + B [+ u_g])
 * Prior: A ~ N(1, σA²), B ~ N(0, σB²); optional group intercept u_g ~ N(0, σg²).
 * Fit: Newton–IRLS (tangent logistic / local quadratic). Optional Laplace at MAP.
 * Hierarchical: u_g ~ N(0,τ²) with Empirical Bayes τ clamped [0.05,2].
 */

import {
  clampTau,
  fitEmpiricalBayesTau,
  fitTauFromLaplaceGroupMaps,
  TAU_MAX,
  TAU_MIN,
} from "@/lib/calibration/hierarchical-eb-tau";

export interface PlattParams {
  readonly A: number;
  readonly B: number;
}

export interface ProbOutcome {
  readonly p: number;
  readonly y: 0 | 1;
}

export interface PlattMapFitResult {
  readonly params: PlattParams;
  readonly method: "irls-map" | "irls-mle" | "gd-fallback";
  readonly iterations: number;
  /** Laplace approx: inverse Hessian diagonal/variances when available. */
  readonly laplace: {
    readonly varA: number;
    readonly varB: number;
    readonly covAB: number;
    /** log det of posterior precision (info only). */
    readonly logDetPrecision: number;
  } | null;
  readonly note: string;
}

function clampP(p: number): number {
  return Math.min(1 - 1e-6, Math.max(1e-6, p));
}

export function logit(p: number): number {
  const x = clampP(p);
  return Math.log(x / (1 - x));
}

export function sigmoid(z: number): number {
  if (z >= 0) {
    const ez = Math.exp(-z);
    return 1 / (1 + ez);
  }
  const ez = Math.exp(z);
  return ez / (1 + ez);
}

export function applyPlatt(p: number, params: PlattParams): number {
  return sigmoid(params.A * logit(p) + params.B);
}

/**
 * Newton–IRLS for MAP/MLE Platt (2-parameter logistic on logit features).
 * H = X'WX + Σ⁻¹ ; g = X'(μ−y) + Σ⁻¹(θ−θ0)
 */
export function fitPlattIrls(
  samples: readonly ProbOutcome[],
  options?: {
    readonly map?: boolean;
    readonly sigmaA?: number;
    readonly sigmaB?: number;
    readonly maxIter?: number;
    readonly tol?: number;
  },
): PlattMapFitResult {
  const map = options?.map !== false; // default MAP
  const sigmaA = options?.sigmaA ?? 1.0;
  const sigmaB = options?.sigmaB ?? 1.0;
  const maxIter = options?.maxIter ?? 25;
  const tol = options?.tol ?? 1e-8;

  let A = 1;
  let B = 0;
  if (samples.length === 0) {
    return {
      params: { A, B },
      method: "irls-map",
      iterations: 0,
      laplace: null,
      note: "Empty sample — identity prior params.",
    };
  }

  const xs = samples.map((s) => logit(s.p));
  const ys = samples.map((s) => s.y);
  const invVarA = map ? 1 / (sigmaA * sigmaA) : 0;
  const invVarB = map ? 1 / (sigmaB * sigmaB) : 0;
  const priorA = 1;
  const priorB = 0;

  let iterations = 0;
  for (let it = 0; it < maxIter; it++) {
    iterations = it + 1;
    let gA = 0;
    let gB = 0;
    let hAA = invVarA;
    let hBB = invVarB;
    let hAB = 0;

    for (let i = 0; i < samples.length; i++) {
      const x = xs[i]!;
      const y = ys[i]!;
      const z = A * x + B;
      const mu = sigmoid(z);
      const w = Math.max(1e-12, mu * (1 - mu));
      const r = mu - y;
      gA += r * x;
      gB += r;
      hAA += w * x * x;
      hBB += w;
      hAB += w * x;
    }
    // Prior gradient: Σ⁻¹ (θ − θ0)
    gA += invVarA * (A - priorA);
    gB += invVarB * (B - priorB);

    // Solve 2x2: H Δ = g  →  Δ = H^{-1} g
    const det = hAA * hBB - hAB * hAB;
    if (!Number.isFinite(det) || Math.abs(det) < 1e-18) break;
    const dA = (hBB * gA - hAB * gB) / det;
    const dB = (hAA * gB - hAB * gA) / det;
    A -= dA;
    B -= dB;
    if (Math.abs(dA) + Math.abs(dB) < tol) break;
  }

  // Laplace at MAP: posterior ≈ N(θ, H^{-1})
  let laplace: PlattMapFitResult["laplace"] = null;
  {
    let hAA = invVarA;
    let hBB = invVarB;
    let hAB = 0;
    for (let i = 0; i < samples.length; i++) {
      const x = xs[i]!;
      const z = A * x + B;
      const mu = sigmoid(z);
      const w = Math.max(1e-12, mu * (1 - mu));
      hAA += w * x * x;
      hBB += w;
      hAB += w * x;
    }
    const det = hAA * hBB - hAB * hAB;
    if (Number.isFinite(det) && Math.abs(det) > 1e-18) {
      laplace = {
        varA: hBB / det,
        varB: hAA / det,
        covAB: -hAB / det,
        logDetPrecision: Math.log(Math.abs(det)),
      };
    }
  }

  return {
    params: { A, B },
    method: map ? "irls-map" : "irls-mle",
    iterations,
    laplace,
    note: map
      ? "MAP Platt via Newton–IRLS; A~N(1,1), B~N(0,1) default. Laplace optional for internal uncertainty only — not ROI."
      : "MLE Platt via Newton–IRLS (no prior).",
  };
}

/** Predictive probability under Laplace: E[sigmoid(z)] ≈ sigmoid(m / sqrt(1+π v/8)) (approx). */
export function plattPredictiveMean(
  p: number,
  fit: PlattMapFitResult,
): number {
  const x = logit(p);
  const m = fit.params.A * x + fit.params.B;
  if (!fit.laplace) return sigmoid(m);
  const v =
    x * x * fit.laplace.varA +
    fit.laplace.varB +
    2 * x * fit.laplace.covAB;
  const scale = Math.sqrt(1 + (Math.PI / 8) * Math.max(0, v));
  return sigmoid(m / scale);
}

/** Fit Platt; map:true → MAP IRLS, else MLE IRLS. Prefer fitPlattMap / fitPlattIrls. */
export function fitPlatt(
  samples: readonly ProbOutcome[],
  options?: {
    readonly map?: boolean;
    readonly sigmaA?: number;
    readonly sigmaB?: number;
    readonly steps?: number;
    readonly lr?: number;
  },
): PlattParams {
  return fitPlattIrls(samples, {
    map: options?.map === true,
    sigmaA: options?.sigmaA,
    sigmaB: options?.sigmaB,
  }).params;
}

/** MAP fit via Newton–IRLS + Laplace (preferred API for R&D). */
export function fitPlattMap(
  samples: readonly ProbOutcome[],
  options?: { readonly sigmaA?: number; readonly sigmaB?: number },
): PlattParams {
  return fitPlattIrls(samples, { map: true, ...options }).params;
}

export function fitPlattMapFull(
  samples: readonly ProbOutcome[],
  options?: { readonly sigmaA?: number; readonly sigmaB?: number },
): PlattMapFitResult {
  return fitPlattIrls(samples, { map: true, ...options });
}

/**
 * Hierarchical ridge: shared A,B + group intercepts u_g ~ N(0, σg²).
 * Alternating: fix u fit A,B; fix A,B shrink u. Offline only.
 */
export function fitPlattMapHierarchical(
  samples: readonly (ProbOutcome & { readonly groupKey: string })[],
  options?: {
    readonly sigmaA?: number;
    readonly sigmaB?: number;
    /** Fixed τ override; if omitted, Empirical Bayes τ is estimated and clamped. */
    readonly sigmaG?: number;
    readonly rounds?: number;
    readonly tauMethod?: "moment" | "laplace";
  },
): {
  readonly global: PlattParams;
  readonly groupIntercept: Readonly<Record<string, number>>;
  /** Non-centered scale: u_g = τ z_g conceptually; we store u_g directly. */
  readonly tau: number;
  readonly tauMethod: string;
  readonly tauClamp: { readonly min: number; readonly max: number };
  readonly laplace: PlattMapFitResult["laplace"];
  readonly note: string;
} {
  const rounds = options?.rounds ?? 5;
  // Initial τ
  let tau = options?.sigmaG != null ? clampTau(options.sigmaG) : 0.5;
  let tauMethod = options?.sigmaG != null ? "fixed" : "moment-eb";
  let invG = 1 / (tau * tau);

  const groups = new Map<string, ProbOutcome[]>();
  for (const s of samples) {
    const arr = groups.get(s.groupKey) ?? [];
    arr.push(s);
    groups.set(s.groupKey, arr);
  }
  const u: Record<string, number> = {};
  for (const g of groups.keys()) u[g] = 0;

  let global: PlattParams = { A: 1, B: 0 };
  let laplace: PlattMapFitResult["laplace"] = null;

  // Seed global MAP ignoring groups
  global = fitPlattIrls(samples, {
    map: true,
    sigmaA: options?.sigmaA,
    sigmaB: options?.sigmaB,
  }).params;

  if (options?.sigmaG == null) {
    const stats = [...groups.entries()].map(([groupKey, rows]) => {
      let sum = 0;
      for (const s of rows) {
        const pred = applyPlatt(s.p, global);
        sum += s.y - pred;
      }
      return {
        groupKey,
        residualMean: rows.length ? sum / rows.length : 0,
        n: rows.length,
      };
    });
    const eb = fitEmpiricalBayesTau(stats);
    tau = eb.tau;
    tauMethod = eb.method;
    invG = 1 / (tau * tau);
  }

  for (let r = 0; r < rounds; r++) {
    // Residualized pseudo-outcomes via offset u_g: fit A,B on adjusted labels through weighted IRLS
    // Equivalent: z = A x + B + u_g → fit with offsets
    const adjusted: ProbOutcome[] = samples.map((s) => s); // keep p,y; offset applied in custom loop
    // Custom one Newton step for A,B with offsets
    {
      let A = global.A;
      let B = global.B;
      const invVarA = 1 / ((options?.sigmaA ?? 1) ** 2);
      const invVarB = 1 / ((options?.sigmaB ?? 1) ** 2);
      for (let it = 0; it < 10; it++) {
        let gA = 0,
          gB = 0,
          hAA = invVarA,
          hBB = invVarB,
          hAB = 0;
        for (const s of samples) {
          const x = logit(s.p);
          const z = A * x + B + (u[s.groupKey] ?? 0);
          const mu = sigmoid(z);
          const w = Math.max(1e-12, mu * (1 - mu));
          const resid = mu - s.y;
          gA += resid * x;
          gB += resid;
          hAA += w * x * x;
          hBB += w;
          hAB += w * x;
        }
        gA += invVarA * (A - 1);
        gB += invVarB * B;
        const det = hAA * hBB - hAB * hAB;
        if (Math.abs(det) < 1e-18) break;
        A -= (hBB * gA - hAB * gB) / det;
        B -= (hAA * gB - hAB * gA) / det;
      }
      global = { A, B };
      const full = fitPlattIrls(
        samples.map((s) => {
          // fold intercept into B for Laplace snapshot of global only (approx)
          return s;
        }),
        { map: true, sigmaA: options?.sigmaA, sigmaB: options?.sigmaB },
      );
      laplace = full.laplace;
      void adjusted;
    }

    // Update u_g: one-dimensional ridge logistic residual
    for (const [g, rows] of groups) {
      if (rows.length < 10) {
        u[g] = 0;
        continue;
      }
      // eslint-disable-next-line prefer-const -- ug updated in IRLS loop
      let ug = u[g] ?? 0;
      for (let it = 0; it < 8; it++) {
        let gU = invG * ug;
        let hU = invG;
        for (const s of rows) {
          const x = logit(s.p);
          const z = global.A * x + global.B + ug;
          const mu = sigmoid(z);
          const w = Math.max(1e-12, mu * (1 - mu));
          gU += mu - s.y;
          hU += w;
        }
        if (hU < 1e-18) break;
        ug -= gU / hU;
      }
      u[g] = ug;
    }
  }

  // Optional Laplace-marginal EB τ refresh from group MAP curvatures
  if (options?.sigmaG == null && (options?.tauMethod === "laplace" || options?.tauMethod == null)) {
    const lapGroups = [...groups.entries()].map(([g, rows]) => {
      const ug = u[g] ?? 0;
      let hU = invG;
      for (const s of rows) {
        const x = logit(s.p);
        const z = global.A * x + global.B + ug;
        const mu = sigmoid(z);
        hU += Math.max(1e-12, mu * (1 - mu));
      }
      return { uMap: ug, hessianU: hU, n: rows.length };
    });
    if (options?.tauMethod === "laplace") {
      const ebL = fitTauFromLaplaceGroupMaps(lapGroups);
      tau = ebL.tau;
      tauMethod = ebL.method;
    }
  }

  return {
    global,
    groupIntercept: u,
    tau,
    tauMethod,
    tauClamp: { min: TAU_MIN, max: TAU_MAX },
    laplace,
    note:
      "Hierarchical MAP Platt: A~N(1,1), B~N(0,1), u_g~N(0,τ²) with EB τ clamped [0.05,2]. " +
      "Offline R&D only — not a production map. No Dirichlet process in path.",
  };
}

/** @deprecated alias for residual shrink version */
export function fitPlattMapWithGroupIntercepts(
  samples: readonly (ProbOutcome & { readonly groupKey: string })[],
  options?: { readonly sigmaA?: number; readonly sigmaB?: number; readonly sigmaG?: number },
): { readonly global: PlattParams; readonly groupIntercept: Readonly<Record<string, number>> } {
  const h = fitPlattMapHierarchical(samples, options);
  return { global: h.global, groupIntercept: h.groupIntercept };
}
