/**
 * Holdout significance tests — GSE ranking path only.
 *
 * Purpose: decide which sport|market groups are statistically dead vs
 * merely noisy, so pause/selective logic is evidence-backed — not vibes.
 *
 * Does NOT change eligibility floors, publish flags, or public copy.
 * Does NOT invent significance from win rate alone.
 *
 * Tests:
 *  1) Welch t on excess residual e = y − p  (group vs global)
 *  2) Two-proportion z: observed win rate vs mean forecast in-group
 *  3) Separation t: p|win vs p|loss within group
 *
 * Innovation vs generic Becker ports: tests are defined on *our* shown p
 * (rankingP preferred), attach pauseRecommendation, and feed RES path
 * without requiring maker/taker microstructure.
 */

export type HoldoutRow = {
  readonly groupKey: string;
  readonly p: number;
  readonly y: 0 | 1;
};

export type GroupSignificance = {
  readonly groupKey: string;
  readonly n: number;
  readonly meanP: number;
  readonly winRate: number;
  readonly meanExcess: number;
  /** Welch t: group excess vs global excess (H0 equal means). */
  readonly welchT: number;
  readonly welchP: number;
  /** Two-proportion style z: winRate vs meanP. */
  readonly calibZ: number;
  readonly calibP: number;
  /** Separation: mean p among wins minus mean p among losses. */
  readonly separation: number;
  readonly separationT: number;
  readonly separationP: number;
  readonly cohensD: number;
  /** True when ranking power is not distinguishable from noise. */
  readonly pauseRecommendation: boolean;
  readonly reasons: readonly string[];
};

export type HoldoutSignificanceArtifact = {
  readonly generatedAt: string;
  readonly nTotal: number;
  readonly globalMeanExcess: number;
  readonly groups: readonly GroupSignificance[];
  readonly pauseCandidates: readonly string[];
  readonly note: string;
};

function erfApprox(x: number): number {
  // Abramowitz & Stegun 7.1.26
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

/** Two-tailed p from standard normal |z|. */
export function normalTwoTailP(z: number): number {
  const az = Math.abs(z);
  if (!Number.isFinite(az)) return 1;
  return Math.max(0, Math.min(1, 1 - erfApprox(az / Math.SQRT2)));
}

/** Approximate two-tailed Welch / Student p via normal (large n) or crude t. */
export function studentTwoTailP(t: number, df: number): number {
  if (!Number.isFinite(t) || !Number.isFinite(df) || df <= 0) return 1;
  // For n≥20 this is fine for pause gating; not a claim of exact Student.
  if (df >= 30) return normalTwoTailP(t);
  // simple heavy-tail inflate for small df
  const inflate = Math.sqrt(df / (df - 2 + 1e-9));
  return normalTwoTailP(t / Math.max(1, inflate));
}

function mean(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function sampleVar(xs: readonly number[], m: number): number {
  if (xs.length < 2) return 0;
  let s = 0;
  for (const x of xs) {
    const d = x - m;
    s += d * d;
  }
  return s / (xs.length - 1);
}

export function welchTTest(
  a: readonly number[],
  b: readonly number[],
): { t: number; df: number; p: number } {
  if (a.length < 2 || b.length < 2) return { t: 0, df: 1, p: 1 };
  const ma = mean(a);
  const mb = mean(b);
  const va = sampleVar(a, ma);
  const vb = sampleVar(b, mb);
  const se = Math.sqrt(va / a.length + vb / b.length);
  if (se < 1e-18) return { t: 0, df: a.length + b.length - 2, p: 1 };
  const t = (ma - mb) / se;
  const num = (va / a.length + vb / b.length) ** 2;
  const den =
    (va / a.length) ** 2 / Math.max(1, a.length - 1) +
    (vb / b.length) ** 2 / Math.max(1, b.length - 1);
  const df = den > 0 ? num / den : a.length + b.length - 2;
  return { t, df, p: studentTwoTailP(t, df) };
}

/** Two-proportion z: observed rate vs predicted mean p (calibration null). */
export function calibrationZTest(
  wins: number,
  n: number,
  meanP: number,
): { z: number; p: number } {
  if (n < 5 || !Number.isFinite(meanP)) return { z: 0, p: 1 };
  const p0 = Math.min(1 - 1e-9, Math.max(1e-9, meanP));
  const phat = wins / n;
  const se = Math.sqrt((p0 * (1 - p0)) / n);
  if (se < 1e-18) return { z: 0, p: 1 };
  const z = (phat - p0) / se;
  return { z, p: normalTwoTailP(z) };
}

export function cohensD(a: readonly number[], b: readonly number[]): number {
  if (a.length < 2 || b.length < 2) return 0;
  const ma = mean(a);
  const mb = mean(b);
  const va = sampleVar(a, ma);
  const vb = sampleVar(b, mb);
  const pooled = Math.sqrt(
    ((a.length - 1) * va + (b.length - 1) * vb) /
      Math.max(1, a.length + b.length - 2),
  );
  return pooled > 0 ? (ma - mb) / pooled : 0;
}

/**
 * Build significance artifact for holdout rows.
 * minGroupN default 20 — matches resolution-by-group.
 * pause when separation insignificant AND |meanExcess| not meaningful,
 * or n thin with near-zero separation.
 */
export function computeHoldoutSignificance(
  rows: readonly HoldoutRow[],
  options?: {
    readonly minGroupN?: number;
    readonly alpha?: number;
    readonly minAbsSeparation?: number;
  },
): HoldoutSignificanceArtifact {
  const minGroupN = options?.minGroupN ?? 20;
  const alpha = options?.alpha ?? 0.05;
  const minAbsSeparation = options?.minAbsSeparation ?? 0.02;

  const globalExcess = rows.map((r) => r.y - r.p);
  const globalMeanExcess = mean(globalExcess);

  const by = new Map<string, HoldoutRow[]>();
  for (const r of rows) {
    const arr = by.get(r.groupKey) ?? [];
    arr.push(r);
    by.set(r.groupKey, arr);
  }

  const groups: GroupSignificance[] = [];
  for (const [groupKey, gr] of by) {
    if (gr.length < minGroupN) continue;
    const n = gr.length;
    const meanP = mean(gr.map((r) => r.p));
    const wins = gr.reduce((s, r) => s + r.y, 0);
    const winRate = wins / n;
    const excess = gr.map((r) => r.y - r.p);
    const meanExcess = mean(excess);

    const welch = welchTTest(excess, globalExcess);
    const calib = calibrationZTest(wins, n, meanP);

    const pWin = gr.filter((r) => r.y === 1).map((r) => r.p);
    const pLoss = gr.filter((r) => r.y === 0).map((r) => r.p);
    const separation =
      pWin.length && pLoss.length ? mean(pWin) - mean(pLoss) : 0;
    const sepT =
      pWin.length >= 2 && pLoss.length >= 2
        ? welchTTest(pWin, pLoss)
        : { t: 0, df: 1, p: 1 };
    const d = cohensD(pWin, pLoss);

    const reasons: string[] = [];
    let pause = false;
    if (Math.abs(separation) < minAbsSeparation) {
      pause = true;
      reasons.push(`|separation| ${separation.toFixed(4)} < ${minAbsSeparation}`);
    }
    if (sepT.p > alpha && Math.abs(separation) < 0.05) {
      pause = true;
      reasons.push(`separation not significant (p=${sepT.p.toFixed(3)})`);
    }
    if (n < 30 && Math.abs(meanExcess) < 0.02) {
      pause = true;
      reasons.push("thin n with near-zero excess");
    }
    if (!pause) reasons.push("ranking signal detectable on holdout");

    groups.push({
      groupKey,
      n,
      meanP,
      winRate,
      meanExcess,
      welchT: welch.t,
      welchP: welch.p,
      calibZ: calib.z,
      calibP: calib.p,
      separation,
      separationT: sepT.t,
      separationP: sepT.p,
      cohensD: d,
      pauseRecommendation: pause,
      reasons,
    });
  }

  groups.sort((a, b) => Math.abs(b.separation) - Math.abs(a.separation));
  const pauseCandidates = groups
    .filter((g) => g.pauseRecommendation)
    .map((g) => g.groupKey);

  return {
    generatedAt: new Date().toISOString(),
    nTotal: rows.length,
    globalMeanExcess,
    groups,
    pauseCandidates,
    note:
      "Significance supports pause/selective quality only. " +
      "PROVEN still requires Brier/ECE/RES floors on shown p — not p-values.",
  };
}
