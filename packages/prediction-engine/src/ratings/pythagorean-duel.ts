/**
 * Pythagorean duel: Tullock vs difference-form win expectancy (arXiv 2112.14846).
 *
 * Fit both contest-success forms on NFL team-seasons by fractional logit
 * (not OLS on win%):
 *   Tullock:    W% = PF^alpha / (PF^alpha + PA^alpha)
 *   Difference: W% = 1 / (1 + exp(alpha * (PA - PF)))
 * plus the game-level extension (ratio forms blow up on shutouts):
 *   EWP = 1 / (1 + exp(-(alpha*PD + beta*HFA + gamma*rest_edge)))
 * fit directly on game outcomes.
 *
 * ACCEPTANCE GATE: adopt the difference-form CSF iff it beats the Tullock
 * form on out-of-sample RMSE by >= 0.005 win-proportion points on
 * 2020-2024 team-seasons AND wins the 4-game rolling-window stress test
 * (lower RMSE in >= 60% of windows).
 *
 * Research-only module. Not wired into any live rating path.
 */

export interface TeamSeason {
  pf: number;
  pa: number;
  wins: number;
  games: number;
}

function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Tullock (ratio) form. */
export function tullock(pf: number, pa: number, alpha: number): number {
  if (pf <= 0 || pa <= 0) throw new Error("tullock: points must be positive");
  const a = Math.pow(pf, alpha);
  const b = Math.pow(pa, alpha);
  return a / (a + b);
}

/** Difference (logistic) form. */
export function differenceForm(pf: number, pa: number, alpha: number): number {
  return logistic(alpha * (pf - pa));
}

/**
 * Fractional-logit fit of alpha: Newton-Raphson on the Bernoulli
 * quasi-log-likelihood sum_i [w_i log p_i + (g_i - w_i) log(1 - p_i)].
 * form: "tullock" | "difference".
 */
export function fitAlpha(
  seasons: readonly TeamSeason[],
  form: "tullock" | "difference",
  init = 2,
): number {
  if (seasons.length === 0) throw new Error("fitAlpha: no data");
  let alpha = init;
  for (let iter = 0; iter < 100; iter++) {
    let grad = 0;
    let hess = 0;
    for (const s of seasons) {
      const p =
        form === "tullock"
          ? tullock(s.pf, s.pa, alpha)
          : differenceForm(s.pf, s.pa, alpha);
      const dp =
        form === "tullock"
          ? p * (1 - p) * Math.log(s.pf / s.pa)
          : p * (1 - p) * (s.pf - s.pa);
      const w = s.wins / s.games;
      grad += ((w - p) / Math.max(1e-12, p * (1 - p))) * dp;
      hess -= (dp * dp) / Math.max(1e-12, p * (1 - p));
    }
    if (Math.abs(hess) < 1e-12) break;
    const step = grad / hess;
    alpha -= step;
    if (alpha <= 0) alpha = 0.05;
    if (Math.abs(step) < 1e-10) break;
  }
  return alpha;
}

/** Win-proportion RMSE of a fitted form on team-seasons. */
export function winRmse(
  seasons: readonly TeamSeason[],
  form: "tullock" | "difference",
  alpha: number,
): number {
  let s = 0;
  for (const t of seasons) {
    const p = form === "tullock" ? tullock(t.pf, t.pa, alpha) : differenceForm(t.pf, t.pa, alpha);
    const w = t.wins / t.games;
    s += (p - w) ** 2;
  }
  return Math.sqrt(s / Math.max(1, seasons.length));
}

export interface GameRow {
  /** Point differential (home - away). */
  pd: number;
  /** 1 if home team, -1 if away (perspective of pd). */
  hfa: number;
  /** Rest edge in days (positive favors the pd side). */
  restEdge: number;
  /** 1 if the pd side won. */
  won: number;
}

/**
 * Game-level EWP: 1 / (1 + exp(-(alpha*PD + beta*HFA + gamma*rest_edge)))
 * fit by Newton-Raphson logistic regression on game outcomes.
 */
export function fitGameEwp(
  games: readonly GameRow[],
): { alpha: number; beta: number; gamma: number } {
  if (games.length === 0) throw new Error("fitGameEwp: no data");
  let coef = [0.1, 0.2, 0.0];
  const xs = games.map((g) => [g.pd, g.hfa, g.restEdge]);
  for (let iter = 0; iter < 100; iter++) {
    const grad = [0, 0, 0];
    const hess = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (let i = 0; i < games.length; i++) {
      const x = xs[i] as number[];
      const z = coef[0]! * x[0]! + coef[1]! * x[1]! + coef[2]! * x[2]!;
      const p = logistic(z);
      const r = (games[i] as GameRow).won - p;
      const v = Math.max(1e-12, p * (1 - p));
      for (let a = 0; a < 3; a++) {
        grad[a]! += r * x[a]!;
        for (let b = 0; b < 3; b++) hess[a]![b]! -= v * x[a]! * x[b]!;
      }
    }
    // Solve hess * step = grad via 3x3 Cramer-free Gaussian elimination.
    const step = solve3(hess, grad);
    let maxStep = 0;
    for (let a = 0; a < 3; a++) {
      coef[a]! -= step[a]!;
      maxStep = Math.max(maxStep, Math.abs(step[a]!));
    }
    if (maxStep < 1e-10) break;
  }
  return { alpha: coef[0]!, beta: coef[1]!, gamma: coef[2]! };
}

function solve3(A: number[][], b: number[]): number[] {
  const M = A.map((row, i) => [...row, b[i] as number]);
  for (let col = 0; col < 3; col++) {
    let piv = col;
    for (let r = col + 1; r < 3; r++) {
      if (Math.abs(M[r]![col] as number) > Math.abs(M[piv]![col] as number)) piv = r;
    }
    const tmp = M[col] as number[];
    M[col] = M[piv] as number[];
    M[piv] = tmp;
    const diag = M[col]![col] as number;
    if (Math.abs(diag) < 1e-12) return [0, 0, 0];
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = (M[r]![col] as number) / diag;
      for (let c = col; c <= 3; c++) M[r]![c] = (M[r]![c] as number) - f * (M[col]![c] as number);
    }
  }
  return M.map((row, i) => (row[3] as number) / (row[i] as number));
}

/** Game-level expected win probability from fitted coefficients. */
export function gameEwp(
  pd: number,
  hfa: number,
  restEdge: number,
  coef: { alpha: number; beta: number; gamma: number },
): number {
  return logistic(coef.alpha * pd + coef.beta * hfa + coef.gamma * restEdge);
}
