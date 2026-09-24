/**
 * Triple CSF comparison: Tullock vs difference vs serial (arXiv 2201.01168).
 *
 * Fit all three contest-success forms on NFL points-for/points-against by
 * OLS alpha and compare LOOCV RMSE vs the current Pythagorean exponent:
 *   Tullock:    W% = PF^alpha / (PF^alpha + PA^alpha)
 *   Difference: W% = 1 / (1 + exp(alpha * (PA - PF)))
 *   Serial:     W% = Phi(alpha * (PF - PA))   (probit/difference analog;
 *               the paper's serial CSF operationalized as the normal-CDF
 *               of the point differential)
 * If the serial form wins, it replaces the exponent form in the ratings
 * prior and is tested on per-game spread residuals as a 'luck'
 * (actual minus expected wins) regression-to-mean feature.
 *
 * ACCEPTANCE GATE: adopt the serial CSF iff on 2015-2024 NFL data its
 * LOOCV win-RMSE beats optimized Tullock by >= 0.2 wins with p < 0.05;
 * keep Tullock otherwise; reconsider only with a hierarchical version
 * pooling alpha across teams.
 *
 * Research-only module. Not wired into any live rating path.
 */

export type CsfForm = "tullock" | "difference" | "serial";

export interface TeamSeason {
  pf: number;
  pa: number;
  wins: number;
  games: number;
}

function erf(x: number): number {
  if (x === 0) return 0;
  const s = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
    0.284496736) * t + 0.254829592) * t;
  return s * (1 - poly * Math.exp(-ax * ax));
}

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Expected win share under each CSF form. */
export function csf(pf: number, pa: number, alpha: number, form: CsfForm): number {
  if (pf <= 0 || pa <= 0) throw new Error("csf: points must be positive");
  switch (form) {
    case "tullock": {
      const a = Math.pow(pf, alpha);
      const b = Math.pow(pa, alpha);
      return a / (a + b);
    }
    case "difference":
      return logistic(alpha * (pf - pa));
    case "serial":
      return normalCdf(alpha * (pf - pa));
  }
}

/**
 * OLS-alpha fit: minimize sum of squared errors between win share and
 * the CSF prediction. Golden-section search on alpha in [lo, hi].
 */
export function fitAlphaOls(
  seasons: readonly TeamSeason[],
  form: CsfForm,
  lo = 0.05,
  hi = 10,
): number {
  if (seasons.length === 0) throw new Error("fitAlphaOls: no data");
  const sse = (alpha: number): number => {
    let s = 0;
    for (const t of seasons) {
      const e = t.wins / t.games - csf(t.pf, t.pa, alpha, form);
      s += e * e;
    }
    return s;
  };
  const gr = (Math.sqrt(5) - 1) / 2;
  let a = lo;
  let b = hi;
  let c = b - gr * (b - a);
  let d = a + gr * (b - a);
  for (let i = 0; i < 80; i++) {
    if (sse(c) < sse(d)) b = d;
    else a = c;
    c = b - gr * (b - a);
    d = a + gr * (b - a);
  }
  return (a + b) / 2;
}

/** Leave-one-out CV RMSE in win-share units. */
export function loocvRmse(seasons: readonly TeamSeason[], form: CsfForm): number {
  const n = seasons.length;
  if (n < 3) throw new Error("loocvRmse: need >= 3 seasons");
  let s = 0;
  for (let i = 0; i < n; i++) {
    const train = seasons.filter((_, j) => j !== i);
    const alpha = fitAlphaOls(train, form);
    const held = seasons[i] as TeamSeason;
    const e = held.wins / held.games - csf(held.pf, held.pa, alpha, form);
    s += e * e;
  }
  return Math.sqrt(s / n);
}

/**
 * Compare all three forms by LOOCV RMSE; also runs the paired
 * differences through a normal-approx test for the gate's p < 0.05.
 */
export function compareCsf(
  seasons: readonly TeamSeason[],
): {
  rmse: Record<CsfForm, number>;
  alpha: Record<CsfForm, number>;
  winner: CsfForm;
  serialVsTullock: { diffWins: number; pValue: number };
} {
  const forms: CsfForm[] = ["tullock", "difference", "serial"];
  const rmse = {} as Record<CsfForm, number>;
  const alpha = {} as Record<CsfForm, number>;
  for (const f of forms) {
    rmse[f] = loocvRmse(seasons, f);
    alpha[f] = fitAlphaOls(seasons, f);
  }
  const winner = forms.reduce((a, b) => (rmse[a] as number) <= (rmse[b] as number) ? a : b);
  // Paired LOOCV squared-error differences, serial vs tullock, in wins^2.
  const n = seasons.length;
  const diffs: number[] = [];
  for (let i = 0; i < n; i++) {
    const train = seasons.filter((_, j) => j !== i);
    const aS = fitAlphaOls(train, "serial");
    const aT = fitAlphaOls(train, "tullock");
    const held = seasons[i] as TeamSeason;
    const g = held.games;
    const eS = held.wins - g * csf(held.pf, held.pa, aS, "serial");
    const eT = held.wins - g * csf(held.pf, held.pa, aT, "tullock");
    diffs.push(eT * eT - eS * eS);
  }
  const m = diffs.reduce((a, d) => a + d, 0) / n;
  const sd = Math.sqrt(diffs.reduce((a, d) => a + (d - m) ** 2, 0) / Math.max(1, n - 1));
  const z = sd > 0 ? m / (sd / Math.sqrt(n)) : 0;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  return {
    rmse,
    alpha,
    winner,
    serialVsTullock: { diffWins: m, pValue },
  };
}
