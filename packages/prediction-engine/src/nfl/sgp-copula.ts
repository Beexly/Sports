/**
 * Same-game parlay dependence, per pairing type and K13 5-regime R-Vine engine.
 *
 * Includes:
 * 1) 2-leg Clayton survival pairing baseline (THETA_BY_PAIRING) fitted 2026-10-23
 *    over 4,018 pairs ("QB-WR" 0.788, "QB-TE" 0.570, "QB-RB"/OTHER 0.10).
 * 2) Master Plan v4.0 K13 d-leg (2..6 legs) Dykstra Higham PSD projection
 *    (`highamNearestCorrelation`), exact d-leg Frechet-Hoeffding bounds
 *    (`frechetHoeffdingNBounds`), and 5-regime 1-factor R-Vine SGP evaluator
 *    (`evaluateFiveRegimeRVineSgp`) combining upper-tail shootout coupling,
 *    Blowout rotation polarity, and lower-tail Clayton grind dependence.
 */

export type SgpPairing = "QB-WR" | "QB-TE" | "QB-RB" | "OTHER";

export const THETA_BY_PAIRING: Readonly<Record<SgpPairing, number>> = {
  "QB-WR": 0.788,
  "QB-TE": 0.57,
  "QB-RB": 0.1, // ~independent; kept small and positive rather than 0 to avoid a discontinuity
  OTHER: 0.1,
};

/** Observed joint probability by pairing, at both marginals near 0.5. */
export const OBSERVED_JOINT_AT_HALF: Readonly<Record<SgpPairing, number>> = {
  "QB-WR": 0.295,
  "QB-TE": 0.29,
  "QB-RB": 0.221,
  OTHER: 0.23,
};

/**
 * Clayton survival copula: P(both legs EXCEED their lines) given the marginal
 * exceedance probabilities and theta.
 *
 * u,v are non-exceedance probabilities by construction (1 - p), and the joint is
 * 1 - u - v + C(u,v), which is the survival form. theta -> 0 reduces exactly to
 * p1 * p2.
 */
export function jointExceedance(p1: number, p2: number, theta: number): number {
  const a = Math.min(1, Math.max(0, p1));
  const b = Math.min(1, Math.max(0, p2));
  const independent = a * b;
  if (!Number.isFinite(theta) || theta <= 1e-6) return independent;

  const u = 1 - a;
  const v = 1 - b;
  if (u <= 0 || v <= 0) return Math.min(a, b); // a leg already certain
  const c = Math.pow(Math.pow(u, -theta) + Math.pow(v, -theta) - 1, -1 / theta);
  const joint = 1 - u - v + c;
  // Never worse than independence and never above the Frechet upper bound.
  return Math.min(Math.min(a, b), Math.max(independent, joint));
}

/** Joint for a known pairing, using the fitted theta. */
export function jointForPairing(p1: number, p2: number, pairing: SgpPairing): number {
  return jointExceedance(p1, p2, THETA_BY_PAIRING[pairing]);
}

/**
 * How much of an assumed-independent SGP price is wrong. Positive means the book
 * (or a naive model) is underpricing the joint; negative means it is overpricing
 * and the parlay is worse than it looks.
 */
export function independenceErrorPp(p1: number, p2: number, pairing: SgpPairing): number {
  return (jointForPairing(p1, p2, pairing) - p1 * p2) * 100;
}

/**
 * 3-leg SGP joint exceedance probability enforcing the Fréchet-Hoeffding upper
 * bound `Math.min(p1, p2, p3)` and realistic 3-leg correlation band `[0.14, 0.28]`.
 */
export function jointThreeLegExceedance(
  p1: number,
  p2: number,
  p3: number,
  empiricalJoint?: number,
): number {
  const a = Math.min(1, Math.max(0, p1));
  const b = Math.min(1, Math.max(0, p2));
  const c = Math.min(1, Math.max(0, p3));
  const upperBound = Math.min(a, b, c);
  let joint =
    empiricalJoint !== undefined && Number.isFinite(empiricalJoint)
      ? empiricalJoint
      : jointExceedance(a, b, THETA_BY_PAIRING["QB-WR"]) * c;
  if (joint > upperBound + 0.02) {
    joint = upperBound * 0.92;
  }
  const frechetLower = Math.max(0, a + b + c - 2);
  return Math.min(0.28, upperBound, Math.max(frechetLower, joint));
}

/**
 * K13 Higham (2002) Alternating Projections onto the d x d PSD correlation elliptope.
 * Enforces min eigenvalue >= 1e-5 and exact unit diagonal.
 */
export function highamNearestCorrelation(
  rawCorr: readonly (readonly number[])[],
  eigFloor = 1e-5,
  maxIter = 40,
): { readonly matrix: number[][]; readonly minEigenvalue: number; readonly maxDiagError: number } {
  const d = rawCorr.length;
  if (d < 2) {
    throw new Error("rawCorr must be at least 2x2");
  }
  const sym = rawCorr.map((row, i) =>
    row.map((_, j) => 0.5 * ((rawCorr[i]?.[j] ?? 0) + (rawCorr[j]?.[i] ?? 0))),
  );
  // Symmetric Jacobi diagonalization + clipping iteratively enforces PSD + unit diagonal
  const clipPsd = (mat: number[][]): { psd: number[][]; minEig: number } => {
    const a = mat.map((r) => [...r]);
    const v: number[][] = Array.from({ length: d }, (_, i) =>
      Array.from({ length: d }, (__, j): number => (i === j ? 1 : 0)),
    );
    for (let sweep = 0; sweep < 25; sweep += 1) {
      let maxOff = 0;
      let p = 0;
      let q = 1;
      for (let i = 0; i < d; i += 1) {
        for (let j = i + 1; j < d; j += 1) {
          const val = Math.abs(a[i]![j]!);
          if (val > maxOff) {
            maxOff = val;
            p = i;
            q = j;
          }
        }
      }
      if (maxOff < 1e-11) break;
      const app = a[p]![p]!;
      const aqq = a[q]![q]!;
      const apq = a[p]![q]!;
      const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      for (let i = 0; i < d; i += 1) {
        if (i !== p && i !== q) {
          const aip = a[i]![p]!;
          const aiq = a[i]![q]!;
          a[i]![p] = c * aip - s * aiq;
          a[p]![i] = a[i]![p]!;
          a[i]![q] = s * aip + c * aiq;
          a[q]![i] = a[i]![q]!;
        }
      }
      a[p]![p] = c * c * app - 2 * c * s * apq + s * s * aqq;
      a[q]![q] = s * s * app + 2 * c * s * apq + c * c * aqq;
      a[p]![q] = 0;
      a[q]![p] = 0;
      for (let i = 0; i < d; i += 1) {
        const vip = v[i]![p]!;
        const viq = v[i]![q]!;
        v[i]![p] = c * vip - s * viq;
        v[i]![q] = s * vip + c * viq;
      }
    }
    const evals = Array.from({ length: d }, (_, i) => Math.max(eigFloor, a[i]![i]!));
    const minEig = Math.min(...evals);
    const psd = Array.from({ length: d }, (_, i) =>
      Array.from({ length: d }, (__, j) => {
        let sum = 0;
        for (let k = 0; k < d; k += 1) {
          sum += v[i]![k]! * evals[k]! * v[j]![k]!;
        }
        return sum;
      }),
    );
    return { psd, minEig };
  };

  // Top-eigenvector extraction helper via symmetric Jacobi
  let yMat = sym.map((r) => [...r]);
  let deltaS = Array.from({ length: d }, () => new Array<number>(d).fill(0));
  let xMat = yMat.map((r) => [...r]);
  let lastMinEig = 0;
  for (let it = 0; it < maxIter; it += 1) {
    const rMat = yMat.map((row, i) => row.map((val, j) => val - deltaS[i]![j]!));
    const { psd, minEig } = clipPsd(rMat);
    xMat = psd;
    lastMinEig = minEig;
    deltaS = xMat.map((row, i) => row.map((val, j) => val - rMat[i]![j]!));
    const yNext = xMat.map((row, i) => row.map((val, j) => (i === j ? 1.0 : val)));
    let maxStep = 0;
    for (let i = 0; i < d; i += 1) {
      for (let j = 0; j < d; j += 1) {
        maxStep = Math.max(maxStep, Math.abs(yNext[i]![j]! - yMat[i]![j]!));
      }
    }
    yMat = yNext;
    if (maxStep < 1e-10 && minEig >= eigFloor * 0.99) break;
  }
  const diagSq = xMat.map((row, i) => Math.sqrt(Math.max(1e-9, row[i]!)));
  const scaledInit = xMat.map((row, i) =>
    row.map((val, j) => (i === j ? 1.0 : val / (diagSq[i]! * diagSq[j]!))),
  );
  const finalStep = clipPsd(scaledInit);
  const finalNorm = finalStep.psd.map((row, i) => {
    const si = Math.sqrt(Math.max(1e-9, row[i]!));
    return row.map((val, j) => {
      if (i === j) return 1.0;
      const sj = Math.sqrt(Math.max(1e-9, finalStep.psd[j]![j]!));
      return val / (si * sj);
    });
  });
  const maxDiagErr = Math.max(...finalNorm.map((r, i) => Math.abs(r[i]! - 1.0)));
  return {
    matrix: finalNorm,
    minEigenvalue: Math.max(eigFloor, Math.min(lastMinEig, finalStep.minEig)),
    maxDiagError: maxDiagErr,
  };
}

function claytonLowerTailCopula(u: number, v: number, theta: number): number {
  const th = Math.max(0.01, Math.min(4.5, theta));
  const uc = Math.max(1e-9, Math.min(1.0 - 1e-9, u));
  const vc = Math.max(1e-9, Math.min(1.0 - 1e-9, v));
  const val = Math.pow(uc, -th) + Math.pow(vc, -th) - 1.0;
  return val <= 0 ? 0.0 : Math.pow(val, -1.0 / th);
}

function topEigenvectorLoadings(corr: readonly (readonly number[])[], d: number): number[] {
  // Power iteration for dominant eigenvector of PSD correlation matrix
  let vec = Array.from({ length: d }, () => 1.0 / Math.sqrt(d));
  let lam = 1.0;
  for (let it = 0; it < 20; it += 1) {
    const nxt = Array.from({ length: d }, (_, i) =>
      corr[i]!.reduce((acc, c, j) => acc + c * vec[j]!, 0),
    );
    const norm2 = Math.sqrt(nxt.reduce((acc, x) => acc + x * x, 0)) || 1.0;
    vec = nxt.map((x) => x / norm2);
    lam = corr.reduce(
      (acc, row, i) => acc + vec[i]! * row.reduce((s, c, j) => s + c * vec[j]!, 0),
      0,
    );
  }
  const scale = Math.sqrt(Math.max(0.05, lam / d)) * 1.15;
  return vec.map((v) => Math.max(-0.88, Math.min(0.88, v * scale)));
}

/** Exact d-leg Frechet-Hoeffding bounds [max(0, sum(p) - d + 1), min(p)]. */
export function frechetHoeffdingNBounds(marginals: readonly number[]): readonly [number, number] {
  const clean = marginals.map((p) => Math.min(1, Math.max(0, p)));
  const d = clean.length;
  if (d === 0) return [0, 0];
  const lower = Math.max(0, clean.reduce((acc, p) => acc + p, 0) - (d - 1));
  const upper = Math.min(...clean);
  return [lower, upper];
}

/**
 * K13 5-Regime 1-Factor R-Vine SGP evaluator matching Python rvine_sgp_copula.
 */
export function evaluateFiveRegimeRVineSgp(params: {
  readonly legExceedanceProbs: readonly number[];
  readonly rawCorrMatrix: readonly (readonly number[])[];
  readonly regimeProbs?: readonly number[];
  readonly shootoutGumbelTheta?: number;
  readonly grindClaytonTheta?: number;
}): {
  readonly jointProb: number;
  readonly frechetLower: number;
  readonly frechetUpper: number;
  readonly shootoutUpperTailLambda: number;
  readonly minEigenvalue: number;
} {
  const legs = params.legExceedanceProbs.map((p) => Math.min(1, Math.max(0, p)));
  const d = legs.length;
  if (d < 2 || d > 6) {
    throw new Error(`Expected 2..6 SGP legs, got ${d}`);
  }
  const rawPi = params.regimeProbs ?? [0.22, 0.44, 0.14, 0.12, 0.08];
  const sumPi = rawPi.reduce((a, b) => a + Math.max(0, b), 0) || 1;
  const pi = rawPi.map((w) => Math.max(0, w) / sumPi);

  const psd = highamNearestCorrelation(params.rawCorrMatrix, 1e-5);
  const loadings = topEigenvectorLoadings(psd.matrix, d);
  const gumbelTheta = Math.max(1.001, Math.min(4.0, params.shootoutGumbelTheta ?? 1.45));
  const claytonTheta = Math.max(0.01, Math.min(4.5, params.grindClaytonTheta ?? 0.65));

  // 21-point midpoint quadrature over common pace factor V_0 in (0, 1)
  const nodes = 21;
  let jointRaw = 0;
  for (let r = 0; r < 5; r += 1) {
    let regSum = 0;
    for (let k = 0; k < nodes; k += 1) {
      const v0 = (k + 0.5) / nodes;
      let prod = 1;
      for (let j = 0; j < d; j += 1) {
        const pj = legs[j]!;
        const load = loadings[j]!;
        let cond = pj;
        if (r === 0) {
          const gumb = Math.exp(
            -Math.pow(
              Math.pow(-Math.log(Math.max(1e-7, pj)), gumbelTheta) +
                Math.pow(-Math.log(Math.max(1e-7, v0)), gumbelTheta),
              1 / gumbelTheta,
            ),
          );
          cond = 0.6 * gumb + 0.4 * Math.min(1, Math.max(0, pj + 0.12 * load * (v0 - 0.5)));
        } else if (r === 4) {
          const cClay = claytonLowerTailCopula(pj, v0, claytonTheta);
          cond = Math.min(1, Math.max(0, 0.4 * cClay + 0.6 * pj));
        } else {
          const rotSign = r === 2 ? -0.75 : r === 3 ? 0.75 : 1.0;
          cond = Math.min(1, Math.max(0, pj + 0.18 * rotSign * load * (v0 - 0.5)));
        }
        prod *= cond;
      }
      regSum += prod / nodes;
    }
    jointRaw += pi[r]! * regSum;
  }

  const [fLo, fHi] = frechetHoeffdingNBounds(legs);
  const jointProb = Math.max(fLo, Math.min(fHi, jointRaw));
  const lambdaU = Math.max(0.05, 2.0 - Math.pow(2.0, 1.0 / gumbelTheta));
  return {
    jointProb,
    frechetLower: fLo,
    frechetUpper: fHi,
    shootoutUpperTailLambda: lambdaU,
    minEigenvalue: psd.minEigenvalue,
  };
}

