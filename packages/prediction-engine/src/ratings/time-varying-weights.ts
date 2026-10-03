/**
 * Time-varying coefficient (TVC) logistic regression for game outcomes.
 *
 * Research source: arXiv:1807.01623v1 — "Modeling outcomes of soccer matches".
 *
 * The paper's Eq. 4 reduces to logistic regression with {week x feature}
 * interactions: feature weights drift linearly with the week number, e.g.
 * prior-season power ratings matter less as games accumulate. Ports:
 *   lambda-weight w_k(week_t) = alpha_k + beta_k * week_t
 * as a plain logistic model on the expanded feature vector [x, week * x],
 * plus the NFL-specific regime-break extension (post-bye / playoff-race
 * indicators shifting weights discontinuously).
 *
 * ACCEPTANCE GATE: ADAPT iff time-varying weights earn a permanent slot in
 * the rating stack — TVC must win on mean log-loss by >= 0.005 over the
 * static model with a jackknife CI excluding zero on NFL data. REJECT only
 * if TVC interactions are uniformly zero (weights truly stationary).
 *
 * Additive research module — not wired into any live prediction path.
 */

export interface TVCGame {
  /** Feature vector (same length for every game). */
  features: number[];
  /** Week number (1-based); drives the time-varying weights. */
  week: number;
  /** True when the home (or reference) side won. */
  homeWin: boolean;
  /** Optional regime flags for discontinuous weight shifts. */
  regimes?: Record<string, boolean>;
}

export interface TVCModel {
  /** Static weights alpha_k on [x, regime dummies]. */
  alpha: number[];
  /** Drift weights beta_k on [week * x]. */
  beta: number[];
  /** Regime names in alpha order (after the base features). */
  regimeNames: string[];
  nFeatures: number;
}

function sigmoid(z: number): number {
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

function expand(g: TVCGame, regimeNames: string[], nFeatures: number): number[] {
  const regimes = regimeNames.map((r) => (g.regimes?.[r] ? 1 : 0));
  const base = [...g.features, ...regimes];
  return [...base, ...g.features.map((x) => g.week * x)];
}

function regimeNamesOf(games: readonly TVCGame[]): string[] {
  const s = new Set<string>();
  for (const g of games) {
    for (const k of Object.keys(g.regimes ?? {})) s.add(k);
  }
  return [...s].sort();
}

/**
 * Fit the TVC logistic model by IRLS with L2 regularization.
 * Returns null when there is nothing to fit.
 */
export function fitTVC(
  games: readonly TVCGame[],
  opts: { l2?: number; iters?: number } = {},
): TVCModel | null {
  if (games.length === 0) return null;
  const first = games[0] as TVCGame;
  const nFeatures = first.features.length;
  if (games.some((g) => g.features.length !== nFeatures)) {
    throw new Error("fitTVC: inconsistent feature lengths");
  }
  const regimes = regimeNamesOf(games);
  const nBase = nFeatures + regimes.length;
  const p = nBase + nFeatures; // [base..., week*x...]
  const l2 = opts.l2 ?? 1e-4;
  const iters = opts.iters ?? 100;
  const X = games.map((g) => expand(g, regimes, nFeatures));
  const y = games.map((g) => (g.homeWin ? 1 : 0));

  let w = new Array<number>(p).fill(0);
  for (let it = 0; it < iters; it++) {
    const grad = new Array<number>(p).fill(0);
    const H: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
    for (let i = 0; i < X.length; i++) {
      const Xi = X[i] as number[];
      const z = Xi.reduce((a: number, x, j) => a + x * (w[j] ?? 0), 0);
      const mu = sigmoid(z);
      const r = (y[i] ?? 0) - mu;
      const v = Math.max(1e-9, mu * (1 - mu));
      for (let j = 0; j < p; j++) {
        const xij = Xi[j] ?? 0;
        grad[j] = (grad[j] ?? 0) + xij * r;
        const Hj = H[j] as number[];
        for (let k = 0; k < p; k++) Hj[k] = (Hj[k] ?? 0) + xij * (Xi[k] ?? 0) * v;
      }
    }
    for (let j = 0; j < p; j++) {
      grad[j] = (grad[j] ?? 0) - l2 * (w[j] ?? 0);
      const Hj = H[j] as number[];
      Hj[j] = (Hj[j] ?? 0) + l2;
    }
    const step = solveLinear(H, grad);
    let maxStep = 0;
    for (let j = 0; j < p; j++) {
      const s = step[j] ?? 0;
      w[j] = (w[j] ?? 0) + s;
      maxStep = Math.max(maxStep, Math.abs(s));
    }
    if (maxStep < 1e-8) break;
  }
  return {
    alpha: w.slice(0, nBase),
    beta: w.slice(nBase),
    regimeNames: regimes,
    nFeatures,
  };
}

/** Solve A x = b by Gaussian elimination with partial pivoting. */
function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M: number[][] = A.map((row, i) => [...row, b[i] ?? 0]);
  const row = (i: number): number[] => M[i] as number[];
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(row(r)[col] ?? 0) > Math.abs(row(piv)[col] ?? 0)) piv = r;
    }
    if (Math.abs(row(piv)[col] ?? 0) < 1e-12) continue;
    const tmp = M[col] as number[];
    M[col] = M[piv] as number[];
    M[piv] = tmp;
    const d = row(col)[col] ?? 0;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = (row(r)[col] ?? 0) / d;
      for (let c = col; c <= n; c++) row(r)[c] = (row(r)[c] ?? 0) - f * (row(col)[c] ?? 0);
    }
  }
  return M.map((r, i) => {
    const diag = r[i] ?? 0;
    return Math.abs(diag) < 1e-12 ? 0 : (r[n] ?? 0) / diag;
  });
}

/** Win probability for the reference side at a given week. */
export function predictTVC(
  model: TVCModel,
  features: number[],
  week: number,
  regimes: Record<string, boolean> = {},
): number {
  if (features.length !== model.nFeatures) {
    throw new Error("predictTVC: feature length mismatch");
  }
  const regVals = model.regimeNames.map((r) => (regimes[r] ? 1 : 0));
  let z = 0;
  for (let k = 0; k < model.nFeatures; k++) {
    const fk = features[k] ?? 0;
    z += (model.alpha[k] ?? 0) * fk + (model.beta[k] ?? 0) * week * fk;
  }
  for (let r = 0; r < regVals.length; r++) {
    z += (model.alpha[model.nFeatures + r] ?? 0) * (regVals[r] ?? 0);
  }
  return sigmoid(z);
}

/** Effective weight of feature k at a given week: alpha_k + beta_k * week. */
export function effectiveWeight(model: TVCModel, k: number, week: number): number {
  return (model.alpha[k] ?? 0) + (model.beta[k] ?? 0) * week;
}

/** Mean binary log-loss of a model over games. */
export function meanLogLoss(
  model: TVCModel,
  games: readonly TVCGame[],
): number {
  let s = 0;
  for (const g of games) {
    const p = Math.min(1 - 1e-9, Math.max(1e-9, predictTVC(model, g.features, g.week, g.regimes)));
    s += g.homeWin ? -Math.log(p) : -Math.log(1 - p);
  }
  return s / Math.max(1, games.length);
}

/**
 * Static-weight ablation: the same IRLS fit with week pinned to 0, so
 * beta terms vanish — the paper's stationary-weight baseline.
 */
export function fitStatic(
  games: readonly TVCGame[],
  opts: { l2?: number; iters?: number } = {},
): TVCModel | null {
  const pinned = games.map((g) => ({ ...g, week: 0 }));
  return fitTVC(pinned, opts);
}
