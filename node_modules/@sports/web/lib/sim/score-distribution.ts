import { poissonPmf } from "@sports/prediction-engine";

/**
 * Score-margin distribution — the math behind the Simulation Cloud.
 *
 * Given two expected-points rates, a Poisson model gives the full distribution
 * of final margins, not a single "who wins" number. This is the honest shape
 * of an outcome: a cloud, not a point. It is an ILLUSTRATIVE teaching tool on
 * transparent math (same posture as Parlay MRI / Cost of Noise) — the inputs
 * are user-chosen rates, NOT a live game projection, and it touches no model
 * pick output.
 *
 * Pure, no I/O. poissonPmf is ungated math (no team-rates assertion).
 */

export interface MarginBar {
  /** Home margin (home points − away points); negative = away ahead. */
  readonly margin: number;
  readonly probability: number;
}

export interface ScoreDistribution {
  readonly bars: readonly MarginBar[];
  readonly homeWinProb: number;
  readonly tieProb: number;
  readonly awayWinProb: number;
  /** Most likely single margin. */
  readonly modalMargin: number;
  /** Narrowest margin band covering ≥80% of outcomes — the "cloud" width. */
  readonly p80Low: number;
  readonly p80High: number;
}

const MAX_GOALS = 12;

/**
 * Build the margin distribution from two Poisson rates. Rates are clamped to a
 * sane sports range so the tool can't be driven into nonsense.
 */
export function scoreDistribution(lambdaHome: number, lambdaAway: number): ScoreDistribution {
  const lh = clampRate(lambdaHome);
  const la = clampRate(lambdaAway);

  const homePmf = pmfVector(lh);
  const awayPmf = pmfVector(la);

  const marginProb = new Map<number, number>();
  let homeWin = 0;
  let tie = 0;
  let awayWin = 0;
  for (let x = 0; x <= MAX_GOALS; x++) {
    for (let y = 0; y <= MAX_GOALS; y++) {
      const p = homePmf[x]! * awayPmf[y]!;
      const margin = x - y;
      marginProb.set(margin, (marginProb.get(margin) ?? 0) + p);
      if (margin > 0) homeWin += p;
      else if (margin === 0) tie += p;
      else awayWin += p;
    }
  }

  const total = homeWin + tie + awayWin || 1;
  const bars: MarginBar[] = [...marginProb.entries()]
    .map(([margin, probability]) => ({ margin, probability: probability / total }))
    .sort((a, b) => a.margin - b.margin);

  const modalMargin = bars.reduce((best, b) => (b.probability > best.probability ? b : best), bars[0]!).margin;
  const [p80Low, p80High] = centralBand(bars, 0.8);

  return {
    bars,
    homeWinProb: round4(homeWin / total),
    tieProb: round4(tie / total),
    awayWinProb: round4(awayWin / total),
    modalMargin,
    p80Low,
    p80High,
  };
}

function pmfVector(lambda: number): number[] {
  const v: number[] = [];
  for (let k = 0; k <= MAX_GOALS; k++) v.push(poissonPmf(k, lambda));
  return v;
}

/** Narrowest contiguous margin band (around the mode) covering ≥ `mass`. */
function centralBand(bars: readonly MarginBar[], mass: number): [number, number] {
  if (bars.length === 0) return [0, 0];
  const modeIdx = bars.reduce((bi, b, i) => (b.probability > bars[bi]!.probability ? i : bi), 0);
  let lo = modeIdx;
  let hi = modeIdx;
  let acc = bars[modeIdx]!.probability;
  while (acc < mass && (lo > 0 || hi < bars.length - 1)) {
    const left = lo > 0 ? bars[lo - 1]!.probability : -1;
    const right = hi < bars.length - 1 ? bars[hi + 1]!.probability : -1;
    if (right >= left) {
      hi += 1;
      acc += bars[hi]!.probability;
    } else {
      lo -= 1;
      acc += bars[lo]!.probability;
    }
  }
  return [bars[lo]!.margin, bars[hi]!.margin];
}

// Poisson is the model for low-count scoring EVENTS (goals, scoring drives),
// not raw football points — rates are clamped to that valid domain so the
// distribution stays meaningful and the factorial math never overflows.
function clampRate(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(8, x));
}
function round4(x: number): number {
  return Number(x.toFixed(4));
}
