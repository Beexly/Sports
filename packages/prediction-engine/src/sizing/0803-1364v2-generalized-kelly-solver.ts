/**
 * arXiv 0803.1364v2: Diversification and limited information in the Kelly game
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * The paper studies Kelly betting under limited information: the unsaturated
approximation linearizes expected log-growth so simultaneous stakes solve a
quadratic program (f = M^-1 e, Markowitz-like), highly-correlated slates are
shrunk by the leading eigenvalue of the pick correlation matrix, and
Laplace-smoothed posteriors (w+1)/(N+2) replace raw win rates. An L_min gate
refuses Kelly sizing when backtest N < 1/(2*G_K(p_hat)).
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build a generalized multi-pick Kelly solver for decimal odds (numerically maximize log-growth over the outcome space from the unsaturated approximation) with a correlation haircut that shrinks simultaneous slates by the leading-eigenvalue factor of the pick correlation matrix, and size on Laplace-smoothed posteriors (w+1)/(L+2) with an L_min gate that refuses to Kelly-size any pick type whose backtest N < 1/[2*G_K(p_hat)].
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT if on the 2024 walk-forward (a) the generalized multi-pick Kelly solver beats independent per-pick Kelly on log-growth AND has lower max drawdown, AND (b) Laplace-smoothed sizing (Eq. 16) beats raw-p-hat Kelly on log-growth.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: sizing | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */
export const ENABLED = false; // Gate needs 2024 walk-forward data; pure functions testable on synthetic data.

export interface KellyPick {
  /** Model win probability. */
  p: number;
  /** Decimal odds (e.g. 2.10). */
  decimalOdds: number;
  /** Backtest sample size for this pick type (for the L_min gate). */
  backtestN?: number;
}

export interface SizedSlate {
  fractions: number[];
  haircut: number;
  /** Unsaturated-approximation expected log-growth of the sized slate. */
  expectedLogGrowth: number;
  sized: boolean;
  reason: string;
}

/** Laplace-smoothed posterior (w+1)/(N+2); the record writes (w+1)/(L+2) with L = total trials. */
export function laplaceSmoothed(wins: number, trials: number): number {
  if (trials < 0 || wins < 0 || wins > trials) throw new Error("invalid (wins, trials)");
  return (wins + 1) / (trials + 2);
}

/** Kelly log-growth rate G_K(p) at the exact Kelly fraction for decimal odds. */
export function kellyGrowthRate(p: number, decimalOdds: number): number {
  const b = decimalOdds - 1;
  if (b <= 0) return 0;
  const f = (p * decimalOdds - 1) / b;
  if (f <= 0) return 0;
  return p * Math.log(1 + f * b) + (1 - p) * Math.log(1 - f);
}

/** L_min gate: refuse Kelly sizing when backtest N < 1 / (2 * G_K(p_hat)). */
export function lMinGatePasses(backtestN: number, pHat: number, decimalOdds: number): boolean {
  const g = kellyGrowthRate(pHat, decimalOdds);
  if (!(g > 0)) return false;
  return backtestN >= 1 / (2 * g);
}

function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  );
}

function edges(picks: KellyPick[]): number[] {
  return picks.map((k) => k.p * k.decimalOdds - 1);
}

/**
 * Second-moment matrix of per-pick returns r_i in {d_i - 1, -1}:
 * M_ii = E[r_i^2], M_ij = e_i e_j + rho_ij sigma_i sigma_j.
 */
function secondMomentMatrix(picks: KellyPick[], corr: number[][]): number[][] {
  const n = picks.length;
  const e = edges(picks);
  const sig = picks.map((k, i) => {
    const ei = e[i]!;
    const m2 = k.p * (k.decimalOdds - 1) ** 2 + (1 - k.p);
    return Math.sqrt(Math.max(m2 - ei * ei, 1e-12));
  });
  const M: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        const ei = e[i]!;
        row.push(sig[i]! ** 2 + ei * ei);
      } else {
        row.push(e[i]! * e[j]! + corr[i]![j]! * sig[i]! * sig[j]!);
      }
    }
    M.push(row);
  }
  return M;
}

/** Solve A x = b by Gauss-Jordan elimination with partial pivoting. */
export function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(M[r]![c]!) > Math.abs(M[piv]![c]!)) piv = r;
    }
    const tmp = M[c]!;
    M[c] = M[piv]!;
    M[piv] = tmp;
    const d = M[c]![c]!;
    if (Math.abs(d) < 1e-12) throw new Error("singular matrix");
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r]![c]! / d;
      for (let k = c; k <= n; k++) M[r]![k] = M[r]![k]! - f * M[c]![k]!;
    }
  }
  return M.map((row, i) => row[n]! / row[i]!);
}

/**
 * Generalized multi-pick Kelly solver. Maximizes the unsaturated approximation
 * of expected log-growth, E[log(1+x)] ~= E[x] - E[x^2]/2, i.e. solves
 * M f = e over the nonneg orthant via an active-set loop (no shorting).
 */
export function solveGeneralizedKelly(picks: KellyPick[], corr?: number[][]): number[] {
  const n = picks.length;
  const C = corr ?? identity(n);
  const e = edges(picks);
  const M = secondMomentMatrix(picks, C);
  const active = picks.map((_, i) => e[i]! > 0);
  const f = new Array<number>(n).fill(0);
  for (let iter = 0; iter <= n; iter++) {
    const idx = active.map((a, i) => (a ? i : -1)).filter((i) => i >= 0);
    if (idx.length === 0) break;
    const Ms = idx.map((i) => idx.map((j) => M[i]![j]!));
    const es = idx.map((i) => e[i]!);
    let sol: number[];
    try {
      sol = solveLinear(Ms, es);
    } catch {
      break;
    }
    let allPos = true;
    for (let k = 0; k < idx.length; k++) {
      if (sol[k]! <= 0) {
        active[idx[k]!] = false;
        allPos = false;
      }
    }
    if (allPos) {
      for (let k = 0; k < idx.length; k++) f[idx[k]!] = Math.max(sol[k]!, 0);
      break;
    }
  }
  return f;
}

/** Independent per-pick exact Kelly fractions (baseline the gate compares against). */
export function independentKellyFractions(picks: KellyPick[]): number[] {
  return picks.map((k) => {
    const b = k.decimalOdds - 1;
    if (b <= 0) return 0;
    return Math.max((k.p * k.decimalOdds - 1) / b, 0);
  });
}

/** Unsaturated-approximation expected log-growth: e.f - 1/2 f' M f. */
export function unsaturatedLogGrowth(f: number[], picks: KellyPick[], corr?: number[][]): number {
  const n = picks.length;
  const C = corr ?? identity(n);
  const e = edges(picks);
  const M = secondMomentMatrix(picks, C);
  let lin = 0;
  let quad = 0;
  for (let i = 0; i < n; i++) {
    lin += f[i]! * e[i]!;
    for (let j = 0; j < n; j++) quad += f[i]! * M[i]![j]! * f[j]!;
  }
  return lin - 0.5 * quad;
}

function leadingEigenvalue(A: number[][], iters = 300): number {
  const n = A.length;
  let v = new Array<number>(n).fill(1 / Math.sqrt(n));
  for (let t = 0; t < iters; t++) {
    const w = A.map((row) => row.reduce((s, a, j) => s + a * v[j]!, 0));
    const norm = Math.sqrt(w.reduce((s, x) => s + x * x, 0)) || 1;
    v = w.map((x) => x / norm);
  }
  const Av = A.map((row) => row.reduce((s, a, j) => s + a * v[j]!, 0));
  return Av.reduce((s, x, i) => s + x * v[i]!, 0);
}

/** Correlation haircut: shrink the whole slate by 1 / lambda_max(correlation). */
export function correlationHaircut(corr: number[][]): number {
  return 1 / Math.max(leadingEigenvalue(corr), 1);
}

/**
 * Full pipeline: Laplace-smooth probs from backtest counts, enforce the L_min
 * gate per pick type, solve the generalized Kelly program, apply the
 * correlation haircut.
 */
export function sizeSlate(
  picks: KellyPick[],
  corr?: number[][],
  wins?: number[],
  trials?: number[],
): SizedSlate {
  const smoothed = picks.map((k, i) => {
    if (wins && trials && trials[i] !== undefined && wins[i] !== undefined) {
      return { ...k, p: laplaceSmoothed(wins[i]!, trials[i]!) };
    }
    return k;
  });
  for (let i = 0; i < smoothed.length; i++) {
    const k = smoothed[i]!;
    if (k.backtestN !== undefined && !lMinGatePasses(k.backtestN, k.p, k.decimalOdds)) {
      return {
        fractions: smoothed.map(() => 0),
        haircut: 1,
        expectedLogGrowth: 0,
        sized: false,
        reason: `L_min gate refused pick ${i}: backtestN=${k.backtestN}`,
      };
    }
  }
  const C = corr ?? identity(smoothed.length);
  const haircut = correlationHaircut(C);
  const fractions = solveGeneralizedKelly(smoothed, C).map((f) => f * haircut);
  return {
    fractions,
    haircut,
    expectedLogGrowth: unsaturatedLogGrowth(fractions, smoothed, C),
    sized: true,
    reason: "ok",
  };
}
