/**
 * arXiv 1109.2825v2: Random Walk Picture of Basketball Scoring
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * MECHANISM (paper):
 * In-game scoring as a random walk with two documented deviations: scoring
events are antipersistent (q = P(same team scores next | just scored) < 1/2)
and there is a lead-dependent restoring force, P(next score | lead L) =
1/2 + a - bL with b > 0. The live model simulates rest-of-game scoring events
as P(next score by A) = I_A - c1*r - c2*Delta, with I_A from the pregame
rating, producing live win probability plus live spread/total distributions.
 *
 * IMPROVEMENT (wiring-wave2 slice, verbatim):
 * Build a rest-of-game live model from the paper's in-game random walk: estimate NFL scoring-event antipersistence q = P(same team scores next | team just scored) and a lead-dependent restoring force P(next score | lead L) = 1/2 + a - bL from nflverse play-by-play, then simulate rest-of-game scoring events as P(next score by A) = I_A - c_1*r - c_2*Delta with I_A from GSE's pregame rating to produce live win probability plus live spread/total distributions.
 *
 * ACCEPTANCE GATE (verbatim):
 * ADAPT if Test 1 passes -- a statistically significant lead-dependent scoring rate (restoring coefficient b significantly != 0, p < 0.01, expected sign) is a real, novel term for GSE's live models.
 *
 * Gate status: NOT EVALUATED. The gate requires historical walk-forward data
 * not available in this environment; it is documented here for future
 * evaluation. Pure functions below are exercised on synthetic data in the
 * adjacent test file.
 *
 * owner: Hermes | bucket: MODEL | lane: team_ratings | verdict: ADAPT | doctrine: PROPRIETARY_EDGE
 */
export const ENABLED = false; // Gate needs nflverse play-by-play (Test 1: b != 0, p < 0.01).

export type Scorer = "A" | "B";

/** Antipersistence: q = P(same team scores next | that team just scored). */
export function estimateAntipersistence(events: Scorer[]): { q: number; transitions: number } {
  let same = 0;
  let n = 0;
  for (let i = 1; i < events.length; i++) {
    n++;
    if (events[i] === events[i - 1]) same++;
  }
  return { q: n === 0 ? 0.5 : same / n, transitions: n };
}

function normCdf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + (x < 0 ? -1 : 1) * erf);
}

export interface RestoringFit {
  a: number;
  b: number;
  bT: number;
  bP: number;
  n: number;
}

/**
 * Fit P(leader scores next | lead L) = 1/2 + a - bL by OLS on z = y - 1/2
 * regressed on [1, -L]; returns b with t-stat and two-sided normal p-value.
 */
export function fitRestoringForce(
  leadAtEvent: number[],
  leaderScoredNext: boolean[],
): RestoringFit {
  const n = leadAtEvent.length;
  let s01 = 0;
  let s11 = 0;
  let s0z = 0;
  let s1z = 0;
  for (let i = 0; i < n; i++) {
    const x1 = -leadAtEvent[i]!;
    const z = (leaderScoredNext[i]! ? 1 : 0) - 0.5;
    s01 += x1;
    s11 += x1 * x1;
    s0z += z;
    s1z += x1 * z;
  }
  const det = n * s11 - s01 * s01;
  const a = (s11 * s0z - s01 * s1z) / det;
  const b = (n * s1z - s01 * s0z) / det;
  let rss = 0;
  for (let i = 0; i < n; i++) {
    const z = (leaderScoredNext[i]! ? 1 : 0) - 0.5;
    const r = z - (a + b * -leadAtEvent[i]!);
    rss += r * r;
  }
  const s2 = rss / Math.max(n - 2, 1);
  const seB = Math.sqrt(Math.max((s2 * n) / det, 1e-18));
  const t = b / seB;
  return { a, b, bT: t, bP: 2 * (1 - normCdf(Math.abs(t))), n };
}

export interface LiveParams {
  /** Pregame-implied per-scoring-event probability A scores next. */
  perEventProbA: number;
  /** Antipersistence shift applied against whoever just scored. */
  antipersistShift: number;
  /** Restoring-force coefficient on A's lead. */
  restoringCoef: number;
  pointsPerEvent: number;
  expectedEvents: number;
}

/** P(next score by A) = I_A - c1*r - c2*Delta; r = +1 if A just scored else -1. */
export function nextScoreProbA(leadA: number, aJustScored: boolean, p: LiveParams): number {
  const r = aJustScored ? 1 : -1;
  const raw = p.perEventProbA - p.antipersistShift * r - p.restoringCoef * leadA;
  return Math.min(0.98, Math.max(0.02, raw));
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RestOfGameResult {
  winProbA: number;
  spreadMean: number;
  spreadSd: number;
  totalMean: number;
  totalSd: number;
  sims: number;
}

/** Monte-Carlo rest-of-game: simulate scoring events to get live win prob + spread/total distributions. */
export function simulateRestOfGame(
  leadA: number,
  aJustScored: boolean,
  params: LiveParams,
  sims: number,
  seed: number,
): RestOfGameResult {
  const rand = mulberry32(seed);
  const nEvents = Math.max(1, Math.round(params.expectedEvents));
  let wins = 0;
  const spreads: number[] = [];
  const totals: number[] = [];
  for (let s = 0; s < sims; s++) {
    let lead = leadA;
    let justA = aJustScored;
    let total = 0;
    for (let e = 0; e < nEvents; e++) {
      const pa = nextScoreProbA(lead, justA, params);
      if (rand() < pa) {
        lead += params.pointsPerEvent;
        justA = true;
      } else {
        lead -= params.pointsPerEvent;
        justA = false;
      }
      total += params.pointsPerEvent;
    }
    if (lead > 0) wins++;
    spreads.push(lead);
    totals.push(total);
  }
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const sd = (a: number[], m: number) =>
    Math.sqrt(a.reduce((x, y) => x + (y - m) * (y - m), 0) / a.length);
  const sm = mean(spreads);
  const tm = mean(totals);
  return {
    winProbA: wins / sims,
    spreadMean: sm,
    spreadSd: sd(spreads, sm),
    totalMean: tm,
    totalSd: sd(totals, tm),
    sims,
  };
}
