/**
 * Phantom-player regularization for weekly Bradley-Terry power ratings
 *
 * Research port: arXiv:2606.03805
 * Normalized lane: team_ratings | Doctrine: PROPRIETARY_EDGE
 *
 * Pure port of the paper's pseudo-game regularization: weekly BT is fit with
 * a zero-strength phantom opponent — operationalized here as rho pseudo-wins
 * AND rho pseudo-losses per team against a fixed zero-strength phantom, which
 * symmetrically shrinks ratings toward zero (extreme early-season ratings
 * are tamed while average teams stay untouched). rho is tuned by
 * leave-one-week-out cross-validation on log-loss. A ridge (L2) BT variant is
 * included as the comparison baseline from the gate.
 *
 * ACCEPTANCE GATE: Adopt phantom-player regularization for GSE's weekly
 * in-season ratings if it beats ordinary BT on remaining-season log-loss in
 * >= 17 of 24 test windows (weeks 1-8 x 2022-2024) AND beats or ties ridge
 * BT on the same windows.
 */

export interface BtGame {
  home: string;
  away: string;
  homeWon: boolean;
}

export interface BtFitOptions {
  /** phantom pseudo-games per side per team; 0 = ordinary BT */
  phantomRho?: number;
  /** L2 penalty; 0 = unpenalized */
  l2?: number;
  iters?: number;
  tol?: number;
}

function sigma(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Penalized BT log-likelihood with phantom pseudo-games. Phantom: each team
 * gets `phantomRho` pseudo-wins and `phantomRho` pseudo-losses vs a
 * zero-strength opponent (theta = 0 fixed).
 */
export function btLogLikelihood(
  games: BtGame[],
  teams: string[],
  theta: Map<string, number>,
  phantomRho = 0,
  l2 = 0,
): number {
  let ll = 0;
  for (const g of games) {
    const th = theta.get(g.home) ?? 0;
    const ta = theta.get(g.away) ?? 0;
    const p = sigma(th - ta);
    ll += g.homeWon ? Math.log(Math.max(p, 1e-12)) : Math.log(Math.max(1 - p, 1e-12));
  }
  if (phantomRho > 0) {
    for (const t of teams) {
      const th = theta.get(t) ?? 0;
      const p = sigma(th); // vs phantom at 0
      ll += phantomRho * Math.log(Math.max(p, 1e-12));
      ll += phantomRho * Math.log(Math.max(1 - p, 1e-12));
    }
  }
  if (l2 > 0) {
    for (const t of teams) {
      const th = theta.get(t) ?? 0;
      ll -= l2 * th * th;
    }
  }
  return ll;
}

/** Gradient-ascent BT fitter with backtracking line search. */
export function fitBT(games: BtGame[], teams: string[], opts: BtFitOptions = {}): Map<string, number> {
  const { phantomRho = 0, l2 = 0, iters = 500, tol = 1e-8 } = opts;
  const theta = new Map<string, number>(teams.map((t) => [t, 0]));
  const grad = new Map<string, number>();
  let prev = btLogLikelihood(games, teams, theta, phantomRho, l2);
  for (let it = 0; it < iters; it++) {
    for (const t of teams) grad.set(t, 0);
    for (const g of games) {
      const th = theta.get(g.home) ?? 0;
      const ta = theta.get(g.away) ?? 0;
      const p = sigma(th - ta);
      const r = (g.homeWon ? 1 : 0) - p;
      grad.set(g.home, (grad.get(g.home) ?? 0) + r);
      grad.set(g.away, (grad.get(g.away) ?? 0) - r);
    }
    if (phantomRho > 0) {
      for (const t of teams) {
        const th = theta.get(t) ?? 0;
        const p = sigma(th);
        // rho wins (+(1-p) each) and rho losses (-p each) vs phantom
        grad.set(t, (grad.get(t) ?? 0) + phantomRho * (1 - p) - phantomRho * p);
      }
    }
    if (l2 > 0) {
      for (const t of teams) {
        grad.set(t, (grad.get(t) ?? 0) - 2 * l2 * (theta.get(t) ?? 0));
      }
    }
    const gnorm = Math.sqrt(teams.reduce((s, t) => s + (grad.get(t) ?? 0) ** 2, 0));
    if (gnorm < tol) break;
    let step = 1;
    let improved = false;
    for (let ls = 0; ls < 20; ls++) {
      const trial = new Map<string, number>();
      for (const t of teams) trial.set(t, (theta.get(t) ?? 0) + step * (grad.get(t) ?? 0));
      // center to identify the model
      const m = teams.reduce((s, t) => s + (trial.get(t) ?? 0), 0) / Math.max(teams.length, 1);
      for (const t of teams) trial.set(t, (trial.get(t) ?? 0) - m);
      const ll = btLogLikelihood(games, teams, trial, phantomRho, l2);
      if (ll > prev) {
        for (const t of teams) theta.set(t, trial.get(t) ?? 0);
        prev = ll;
        improved = true;
        break;
      }
      step *= 0.5;
    }
    if (!improved) break;
  }
  return theta;
}

/** Mean log-loss of a rating map on games. */
export function btLogLoss(games: BtGame[], theta: Map<string, number>): number {
  if (games.length === 0) return Number.NaN;
  let s = 0;
  for (const g of games) {
    const p = sigma((theta.get(g.home) ?? 0) - (theta.get(g.away) ?? 0));
    const y = g.homeWon ? 1 : 0;
    s += -(y * Math.log(Math.max(p, 1e-12)) + (1 - y) * Math.log(Math.max(1 - p, 1e-12)));
  }
  return s / games.length;
}

export interface RhoTuneResult {
  rho: number;
  cvLogLoss: number;
}

/**
 * Leave-one-week-out CV over rho: for each held-out week, fit on the rest
 * and score log-loss on the held-out week.
 */
export function tunePhantomRho(
  weeks: BtGame[][],
  teams: string[],
  rhoGrid: number[],
): RhoTuneResult[] {
  return rhoGrid.map((rho) => {
    let total = 0;
    let n = 0;
    for (let w = 0; w < weeks.length; w++) {
      const train = weeks.filter((_, i) => i !== w).flat();
      const held = weeks[w] ?? [];
      if (held.length === 0) continue;
      const theta = fitBT(train, teams, { phantomRho: rho });
      total += btLogLoss(held, theta) * held.length;
      n += held.length;
    }
    return { rho, cvLogLoss: n === 0 ? Number.NaN : total / n };
  }).sort((a, b) => a.cvLogLoss - b.cvLogLoss);
}

export interface WindowComparison {
  window: string;
  ordinary: number;
  phantom: number;
  ridge: number;
  phantomBeatsOrdinary: boolean;
  phantomBeatsOrTiesRidge: boolean;
}

/**
 * Per-window comparison for the gate: ordinary BT vs phantom BT (CV-tuned
 * rho) vs ridge BT on remaining-season log-loss.
 */
export function compareWindows(
  windows: Array<{ name: string; train: BtGame[]; test: BtGame[] }>,
  teams: string[],
  rhoGrid: number[],
  ridgeL2 = 0.5,
): WindowComparison[] {
  return windows.map((w) => {
    // chunk train into 4 contiguous blocks for the leave-one-block-out rho tune
    const blockSize = Math.max(1, Math.floor(w.train.length / 4));
    const blocks: BtGame[][] = [];
    for (let i = 0; i < w.train.length; i += blockSize) blocks.push(w.train.slice(i, i + blockSize));
    const tuned = tunePhantomRho(blocks.length > 1 ? blocks : [w.train], teams, rhoGrid);
    const rho = tuned[0]?.rho ?? 0;
    const ordinary = btLogLoss(w.test, fitBT(w.train, teams, {}));
    const phantom = btLogLoss(w.test, fitBT(w.train, teams, { phantomRho: rho }));
    const ridge = btLogLoss(w.test, fitBT(w.train, teams, { l2: ridgeL2 }));
    return {
      window: w.name,
      ordinary,
      phantom,
      ridge,
      phantomBeatsOrdinary: phantom < ordinary,
      phantomBeatsOrTiesRidge: phantom <= ridge + 1e-12,
    };
  });
}

export const GSE_PHANTOM_BT_ENABLED = false;
