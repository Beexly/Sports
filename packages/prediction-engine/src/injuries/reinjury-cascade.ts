/**
 * Re-injury cascade feature (arXiv 2210.11802).
 *
 * Prospective cohort design on NFL data: player-weeks with a "minor
 * non-time-loss" designation (limited/questionable on the injury report
 * but plays) vs matched healthy controls; outcome = subsequent
 * time-loss injury (missed games) within the next 8 weeks, adjusted for
 * age, position, and prior-season injuries, with concentration in
 * soft-tissue injuries. Served as "re-injury risk" annotations on
 * injury-report content and availability-risk adjustments in fantasy
 * projections.
 *
 * ACCEPTANCE GATE: ADAPT iff the NFL replication shows adjusted OR >=
 * 2.0 for subsequent time-loss injury within 8 weeks of a minor
 * designation (p < 0.05); REJECT if OR < 1.3.
 *
 * Research-only module. Not wired into any live injury path.
 */

export interface PlayerWeek {
  /** 1 if the player carried a minor non-time-loss designation. */
  exposed: number;
  /** 1 if a subsequent time-loss injury occurred within 8 weeks. */
  outcome: number;
  /** Covariates: age, prior-season injuries, soft-tissue flag, ... */
  covariates: number[];
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Logistic regression by IRLS: logit(P(outcome)) = b0 + b1*exposed +
 * b2..*covariates. Returns coefficients, standard errors, and the
 * adjusted odds ratio for the exposure with its Wald 95% CI and p-value.
 */
export function fitCascade(
  rows: readonly PlayerWeek[],
  maxIter = 100,
): {
  oddsRatio: number;
  ciLo: number;
  ciHi: number;
  pValue: number;
  coef: number[];
} {
  if (rows.length === 0) throw new Error("fitCascade: no data");
  const k = 1 + 1 + (rows[0]?.covariates.length ?? 0); // intercept + exposure + covariates
  const X = rows.map((r) => [1, r.exposed, ...r.covariates]);
  const y = rows.map((r) => r.outcome);
  let beta = new Array<number>(k).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    const grad = new Array<number>(k).fill(0);
    const H = Array.from({ length: k }, () => new Array<number>(k).fill(0));
    for (let i = 0; i < rows.length; i++) {
      const xi = X[i] as number[];
      const eta = xi.reduce((s, x, j) => s + x * (beta[j] as number), 0);
      const p = sigmoid(eta);
      const w = Math.max(1e-9, p * (1 - p));
      const r = (y[i] as number) - p;
      for (let a = 0; a < k; a++) {
        grad[a] = (grad[a] as number) + (xi[a] as number) * r;
        for (let b = 0; b < k; b++) {
          H[a]![b] = (H[a]![b] as number) + (xi[a] as number) * w * (xi[b] as number);
        }
      }
    }
    const step = solveLinear(H, grad);
    let maxStep = 0;
    for (let j = 0; j < k; j++) {
      beta[j] = (beta[j] as number) + (step[j] as number);
      maxStep = Math.max(maxStep, Math.abs(step[j] as number));
    }
    if (maxStep < 1e-8) break;
  }
  // Standard errors from the final Hessian.
  const H = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  for (let i = 0; i < rows.length; i++) {
    const xi = X[i] as number[];
    const eta = xi.reduce((s, x, j) => s + x * (beta[j] as number), 0);
    const p = sigmoid(eta);
    const w = Math.max(1e-9, p * (1 - p));
    for (let a = 0; a < k; a++) {
      for (let b = 0; b < k; b++) {
        H[a]![b] = (H[a]![b] as number) + (xi[a] as number) * w * (xi[b] as number);
      }
    }
  }
  const inv = invertMatrix(H);
  const se = Math.sqrt(Math.max(1e-12, inv[1]![1] as number));
  const b1 = beta[1] as number;
  const z = b1 / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  return {
    oddsRatio: Math.exp(b1),
    ciLo: Math.exp(b1 - 1.96 * se),
    ciHi: Math.exp(b1 + 1.96 * se),
    pValue,
    coef: beta,
  };
}

/** Gate verdict: adopt iff OR >= 2.0 with p < 0.05; reject iff OR < 1.3. */
export function cascadeVerdict(
  oddsRatio: number,
  pValue: number,
): "adopt" | "reject" | "inconclusive" {
  if (oddsRatio >= 2.0 && pValue < 0.05) return "adopt";
  if (oddsRatio < 1.3) return "reject";
  return "inconclusive";
}

/** Availability-risk multiplier for fantasy projections (OR -> probability lift). */
export function availabilityMultiplier(oddsRatio: number, baseRate: number): number {
  if (baseRate <= 0 || baseRate >= 1) throw new Error("availabilityMultiplier: baseRate in (0,1)");
  const odds = (baseRate / (1 - baseRate)) * oddsRatio;
  const p = odds / (1 + odds);
  return p / baseRate;
}

function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i] as number]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(M[r]![c] as number) > Math.abs(M[piv]![c] as number)) piv = r;
    }
    [M[c], M[piv]] = [M[piv] as number[], M[c] as number[]];
    const d = M[c]![c] as number;
    if (Math.abs(d) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = (M[r]![c] as number) / d;
      for (let k = c; k <= n; k++) M[r]![k] = ((M[r]![k] as number) - f * (M[c]![k] as number));
    }
  }
  return M.map((row, i) => (row[n] as number) / (Math.abs(row[i] as number) < 1e-12 ? 1 : (row[i] as number)));
}

function invertMatrix(A: number[][]): number[][] {
  const n = A.length;
  const M = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(M[r]![c] as number) > Math.abs(M[piv]![c] as number)) piv = r;
    }
    [M[c], M[piv]] = [M[piv] as number[], M[c] as number[]];
    const d = (M[c]![c] as number) || 1e-12;
    for (let k = 0; k < 2 * n; k++) M[c]![k] = (M[c]![k] as number) / d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r]![c] as number;
      for (let k = 0; k < 2 * n; k++) M[r]![k] = (M[r]![k] as number) - f * (M[c]![k] as number);
    }
  }
  return M.map((row) => row.slice(n));
}

function normalCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t) *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
