/**
 * NFL-overtime analog of the penalty-shootout fairness tests
 *
 * Research port: arXiv:2510.17641
 * Normalized lane: team_ratings | Doctrine: PROPRIETARY_EDGE
 *
 * Pure statistical test harness porting the paper's shootout-vs-coin-toss
 * battery to the NFL overtime analog: an exact two-sided binomial test on the
 * first-possession win rate, and a logistic regression of OT outcome on
 * first-possession plus Elo difference with a Wald significance test on the
 * first-possession coefficient. No data bundled — the operator supplies the
 * 2012-2025 OT sample; this module only decides whether the gate's two
 * significance conditions are met.
 *
 * ACCEPTANCE GATE: ADOPT an OT first-possession/toss adjustment in the GSE
 * sim only if the first-possession win rate differs from 50% at 5%
 * significance on the 2012-2025 sample AND the logistic first-possession
 * coefficient is significant at 5% after controlling for Elo difference.
 */

export interface BinomialResult {
  k: number;
  n: number;
  p0: number;
  /** exact two-sided p-value */
  pValue: number;
  significantAt5: boolean;
}

function logChoose(n: number, k: number): number {
  if (k < 0 || k > n) return Number.NEGATIVE_INFINITY;
  let s = 0;
  const kk = Math.min(k, n - k);
  for (let i = 1; i <= kk; i++) s += Math.log(n - kk + i) - Math.log(i);
  return s;
}

function binomPmf(n: number, k: number, p: number): number {
  if (p <= 0 || p >= 1 || k < 0 || k > n) return 0;
  return Math.exp(logChoose(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

/** Exact two-sided binomial p-value (probability of outcomes at most as likely as k). */
export function binomialTwoSided(k: number, n: number, p0 = 0.5): BinomialResult {
  if (!Number.isInteger(k) || !Number.isInteger(n) || n <= 0 || k < 0 || k > n) {
    return { k, n, p0, pValue: Number.NaN, significantAt5: false };
  }
  const obs = binomPmf(n, k, p0);
  let p = 0;
  for (let i = 0; i <= n; i++) {
    if (binomPmf(n, i, p0) <= obs + 1e-12) p += binomPmf(n, i, p0);
  }
  return { k, n, p0, pValue: Math.min(1, p), significantAt5: p < 0.05 };
}

/** Standard normal CDF via Abramowitz-Stegun erf approximation. */
export function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (z > 0) p = 1 - p;
  return p;
}

export interface LogisticFit {
  coefficients: number[];
  standardErrors: number[];
  waldZ: number[];
  pValues: number[];
  converged: boolean;
  iterations: number;
}

function solveLinear(a: number[][], b: number[]): number[] | undefined {
  const n = a.length;
  const m = a.map((row, i) => [...row, b[i] ?? 0]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(m[r]?.[col] ?? 0) > Math.abs(m[pivot]?.[col] ?? 0)) pivot = r;
    }
    const pivRow = m[pivot];
    const curRow = m[col];
    if (!pivRow || !curRow || Math.abs(pivRow[col] ?? 0) < 1e-12) return undefined;
    m[pivot] = curRow;
    m[col] = pivRow;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const row = m[r];
      const crow = m[col];
      if (!row || !crow) continue;
      const factor = (row[col] ?? 0) / (crow[col] ?? 1);
      for (let c = col; c <= n; c++) row[c] = (row[c] ?? 0) - factor * (crow[c] ?? 0);
    }
  }
  return m.map((row, i) => (row[n] ?? 0) / (row[i] ?? 1));
}

function invertMatrix(a: number[][]): number[][] | undefined {
  const n = a.length;
  const inv: number[][] = [];
  for (let i = 0; i < n; i++) {
    const e = new Array<number>(n).fill(0);
    e[i] = 1;
    const col = solveLinear(a, e);
    if (!col) return undefined;
    inv.push(col);
  }
  // solveLinear returns rows; transpose to get columns as rows
  return inv[0]?.map((_, c) => inv.map((row) => row[c] ?? 0)) ?? [];
}

/**
 * Logistic regression via Newton-Raphson. X rows must include the intercept
 * column explicitly. Returns coefficients, SEs, Wald z and two-sided p-values.
 */
export function logisticFit(X: number[][], y: number[], maxIter = 100): LogisticFit {
  const n = X.length;
  const p = X[0]?.length ?? 0;
  const fail: LogisticFit = {
    coefficients: [],
    standardErrors: [],
    waldZ: [],
    pValues: [],
    converged: false,
    iterations: 0,
  };
  if (n === 0 || p === 0 || y.length !== n) return fail;
  let beta = new Array<number>(p).fill(0);
  let converged = false;
  let iter = 0;
  for (iter = 0; iter < maxIter; iter++) {
    const grad = new Array<number>(p).fill(0);
    const hess: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
    for (let i = 0; i < n; i++) {
      const row = X[i] ?? [];
      const lin = row.reduce((s, x, j) => s + x * (beta[j] ?? 0), 0);
      const mu = 1 / (1 + Math.exp(-lin));
      const r = (y[i] ?? 0) - mu;
      const w = Math.max(mu * (1 - mu), 1e-12);
      for (let j = 0; j < p; j++) {
        grad[j] = (grad[j] ?? 0) + (row[j] ?? 0) * r;
        for (let k = 0; k < p; k++) {
          const hrow = hess[j];
          if (hrow) hrow[k] = (hrow[k] ?? 0) + (row[j] ?? 0) * (row[k] ?? 0) * w;
        }
      }
    }
    const step = solveLinear(hess, grad);
    if (!step) return fail;
    const maxStep = Math.max(...step.map(Math.abs));
    beta = beta.map((b, j) => b + (step[j] ?? 0));
    if (maxStep < 1e-8) {
      converged = true;
      break;
    }
  }
  // Final Hessian for standard errors.
  const hess: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  for (let i = 0; i < n; i++) {
    const row = X[i] ?? [];
    const lin = row.reduce((s, x, j) => s + x * (beta[j] ?? 0), 0);
    const mu = 1 / (1 + Math.exp(-lin));
    const w = Math.max(mu * (1 - mu), 1e-12);
    for (let j = 0; j < p; j++)
      for (let k = 0; k < p; k++) {
        const hrow = hess[j];
        if (hrow) hrow[k] = (hrow[k] ?? 0) + (row[j] ?? 0) * (row[k] ?? 0) * w;
      }
  }
  const inv = invertMatrix(hess);
  if (!inv) return fail;
  const se = inv.map((row, j) => Math.sqrt(Math.max(row[j] ?? 0, 0)));
  const waldZ = beta.map((b, j) => b / Math.max(se[j] ?? 0, 1e-12));
  const pValues = waldZ.map((z) => 2 * (1 - normalCdf(Math.abs(z))));
  return { coefficients: beta, standardErrors: se, waldZ, pValues, converged, iterations: iter + 1 };
}

export interface OtAnalogDecision {
  binomial: BinomialResult;
  /** Wald p-value of the first-possession coefficient (index 1) */
  firstPossessionPValue: number;
  adoptAdjustment: boolean;
}

export interface OtTeamGame {
  /** did this team win the OT game */
  won: boolean;
  /** did this team have first possession in OT */
  hadFirstPossession: boolean;
  /** pre-game Elo difference, this team minus opponent */
  eloDiff: number;
}

/**
 * Runs the paper's two-condition gate on the 2012-2025 OT sample, one row per
 * team-game (two rows per OT game):
 * (1) first-possession win rate != 50% at 5% (exact binomial);
 * (2) logistic first-possession coefficient significant at 5% controlling
 * for Elo difference.
 */
export function otAnalogGate(rows: OtTeamGame[]): OtAnalogDecision {
  const fpRows = rows.filter((r) => r.hadFirstPossession);
  const n = fpRows.length;
  const k = fpRows.filter((r) => r.won).length;
  const binomial = binomialTwoSided(k, n, 0.5);
  const X = rows.map((r) => [1, r.hadFirstPossession ? 1 : 0, r.eloDiff]);
  const y = rows.map((r) => (r.won ? 1 : 0));
  const fit = logisticFit(X, y);
  const fpP = fit.pValues[1] ?? Number.NaN;
  const adoptAdjustment =
    binomial.significantAt5 && fit.converged && Number.isFinite(fpP) && fpP < 0.05;
  return { binomial, firstPossessionPValue: fpP, adoptAdjustment };
}

export const GSE_OT_ANALOG_ENABLED = false;
