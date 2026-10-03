/**
 * arXiv:2608.09887v1 — Space-Creating versus Dead Possession: An Off-Ball Possession-Quality Index for Broadcast Football
 *
 * NFL junk-offense index: drive-value efficiency, junk-open share in tied-or-losing game states, and a
 * sterile-possession index, with an NGS safety-depth-displacement spatial layer — validated by
 * leave-one-week-out prediction of next-game point differential and a joint regression controlling for
 *
 * Improvement: Build an NFL junk-offense index (drive-value efficiency, junk-open share in tied-or-losing game states, sterile index) as a matchup content and predictive feature, with an NGS-based safety-depth-displacement spatial layer predicting second-half scoring from early-game off-ball space creation.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the NFL junk-offense index for GSE matchup content if: leave-one-week-out team mean junk-open predicts next-game point differential with |r| >= 0.15 AND the joint regression shows junk-open significant (p < 0.05) controlling for EPA/play; REJECT if the index adds nothing beyond EPA.
 */

/** Arithmetic mean. */
export function mean(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error("mean: empty");
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/** Population standard deviation. */
export function std(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error("std: empty");
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
}

/** One play with space-creation and game-state tags. */
export interface IndexedPlay {
  junkOpen: boolean; // space-creating vs dead possession
  tiedOrLosing: boolean;
  epa: number;
}

/** Junk-open share restricted to tied-or-losing game states. */
export function junkOpenShare(plays: readonly IndexedPlay[]): number {
  const rel = plays.filter((p) => p.tiedOrLosing);
  if (rel.length === 0) throw new Error("junkOpenShare: no tied-or-losing plays");
  return rel.filter((p) => p.junkOpen).length / rel.length;
}

/** Drive-value efficiency: points per drive vs league expectation. */
export function driveValueEfficiency(points: readonly number[], leagueAvg: number): number {
  if (points.length === 0) throw new Error("driveValueEfficiency: no drives");
  if (leagueAvg <= 0) throw new Error("driveValueEfficiency: leagueAvg > 0");
  return mean(points) / leagueAvg;
}

/** Sterile index: share of possessions with non-positive EPA. */
export function sterileIndex(plays: readonly IndexedPlay[]): number {
  if (plays.length === 0) throw new Error("sterileIndex: no plays");
  return plays.filter((p) => p.epa <= 0).length / plays.length;
}

/** Safety depth displacement: mean change in safety depth pre->post snap. */
export function safetyDisplacement(pre: readonly number[], post: readonly number[]): number {
  if (pre.length !== post.length || pre.length === 0) throw new Error("safetyDisplacement: mismatch or empty");
  return mean(post.map((d, i) => d - (pre[i] ?? 0)));
}

/** Pearson correlation. */
export function pearsonC(xs: readonly number[], ys: readonly number[]): number {
  if (xs.length !== ys.length || xs.length < 3) throw new Error("pearsonC: need >= 3 pairs");
  const mx = mean(xs);
  const my = mean(ys);
  const cov = mean(xs.map((x, i) => (x - mx) * ((ys[i] ?? 0) - my)));
  const vx = mean(xs.map((x) => (x - mx) ** 2));
  const vy = mean(ys.map((y) => (y - my) ** 2));
  return vx === 0 || vy === 0 ? 0 : cov / Math.sqrt(vx * vy);
}

/**
 * Leave-one-week-out: for each week w, correlate team mean junk-open over
 * other weeks with week-w point differential. Returns the LOWO correlations.
 */
export function lowoCorrelations(
  weeklyJunk: number[][], // teams x weeks
  weeklyDiff: number[][], // teams x weeks point differential
): number[] {
  const nTeams = weeklyJunk.length;
  if (nTeams === 0) throw new Error("lowoCorrelations: no teams");
  const nWeeks = weeklyJunk[0]?.length ?? 0;
  const out: number[] = [];
  for (let w = 0; w < nWeeks; w++) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let t = 0; t < nTeams; t++) {
      const jw = weeklyJunk[t] ?? [];
      const dw = weeklyDiff[t] ?? [];
      const others = jw.filter((_, k) => k !== w);
      if (others.length === 0) continue;
      xs.push(mean(others));
      ys.push(dw[w] ?? 0);
    }
    if (xs.length >= 3) out.push(pearsonC(xs, ys));
  }
  return out;
}

/** Normal CDF (Abramowitz-Stegun). */
function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-0.5 * x * x);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x >= 0 ? 1 - p : p;
}

/**
 * Joint OLS regression: diff ~ junkOpen + epaPlay. Returns the junk-open
 * coefficient, its t-stat, and two-sided p-value.
 */
export function jointRegression(
  junk: readonly number[],
  epaPlay: readonly number[],
  diff: readonly number[],
): { betaJunk: number; tStat: number; pValue: number } {
  const n = diff.length;
  if (n < 4 || junk.length !== n || epaPlay.length !== n) {
    throw new Error("jointRegression: need >= 4 rows");
  }
  // Normal equations for [1, junk, epa]
  const XtX = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const Xty = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const x = [1, junk[i] ?? 0, epaPlay[i] ?? 0];
    for (let a = 0; a < 3; a++) {
      Xty[a] = (Xty[a] ?? 0) + x[a]! * (diff[i] ?? 0);
      for (let b = 0; b < 3; b++) XtX[a]![b] = (XtX[a]?.[b] ?? 0) + (x[a] ?? 0) * (x[b] ?? 0);
    }
  }
  // 3x3 inverse via adjugate
  const det =
    (XtX[0]?.[0] ?? 0) * ((XtX[1]?.[1] ?? 0) * (XtX[2]?.[2] ?? 0) - (XtX[1]?.[2] ?? 0) * (XtX[2]?.[1] ?? 0)) -
    (XtX[0]?.[1] ?? 0) * ((XtX[1]?.[0] ?? 0) * (XtX[2]?.[2] ?? 0) - (XtX[1]?.[2] ?? 0) * (XtX[2]?.[0] ?? 0)) +
    (XtX[0]?.[2] ?? 0) * ((XtX[1]?.[0] ?? 0) * (XtX[2]?.[1] ?? 0) - (XtX[1]?.[1] ?? 0) * (XtX[2]?.[0] ?? 0));
  if (Math.abs(det) < 1e-12) throw new Error("jointRegression: singular");
  const inv = (r: number, c: number): number => {
    const m2 = (a: number, b: number, d2: number, e2: number): number =>
      (XtX[a]?.[b] ?? 0) * (XtX[d2]?.[e2] ?? 0) - (XtX[a]?.[e2] ?? 0) * (XtX[d2]?.[b] ?? 0);
    const sgn = ((r + c) % 2 === 0 ? 1 : -1);
    const [a, d2] = [0, 1, 2].filter((v) => v !== r) as [number, number];
    const [b, e2] = [0, 1, 2].filter((v) => v !== c) as [number, number];
    return (sgn * m2(a, b, d2, e2)) / det;
  };
  const beta = [0, 1, 2].map((r) => inv(r, 0) * (Xty[0] ?? 0) + inv(r, 1) * (Xty[1] ?? 0) + inv(r, 2) * (Xty[2] ?? 0));
  const resid = diff.map((y, i) => y - ((beta[0] ?? 0) + (beta[1] ?? 0) * (junk[i] ?? 0) + (beta[2] ?? 0) * (epaPlay[i] ?? 0)));
  const s2 = resid.reduce((s, r) => s + r * r, 0) / (n - 3);
  const seJunk = Math.sqrt(Math.max(1e-18, s2 * inv(1, 1)));
  const tStat = (beta[1] ?? 0) / seJunk;
  return { betaJunk: beta[1] ?? 0, tStat, pValue: 2 * (1 - normCdf(Math.abs(tStat))) };
}
