/**
 * Payout simulator — portfolio ROI vs a simulated DFS field.
 *
 * Pure + deterministic (seeded mulberry32 — no repo imports).
 * (Beexly/Sports#795.)
 *
 * Model: every entry pays `entryFee`. A pay table maps finishing rank
 * (1 = best) to a prize multiple of the entry fee. A portfolio of lineup
 * scores is ranked against a simulated field of scores; prizes are looked
 * up per lineup and aggregated into ROI distribution + ITM rate.
 */

/** Prize table: rank (1-based) -> payout multiple of entry fee. */
export type PayTable = {
  readonly name: string;
  readonly payouts: Readonly<Record<number, number>>;
  /** Highest paid rank. Ranks above this pay 0. */
  readonly paidSpots: number;
};

const toTable = (name: string, payouts: Record<number, number>): PayTable => {
  const ranks = Object.keys(payouts).map(Number);
  return { name, payouts, paidSpots: ranks.length ? Math.max(...ranks) : 0 };
};

/**
 * Flat payout: top `paidSpots` each pay `mult`× entry fee.
 * e.g. double-ups: half the field doubles.
 */
export function flatPayoutTable(paidSpots: number, mult = 2): PayTable {
  const payouts: Record<number, number> = {};
  for (let r = 1; r <= Math.max(0, Math.floor(paidSpots)); r++) payouts[r] = mult;
  return toTable(`flat-top${paidSpots}x${mult}`, payouts);
}

/**
 * Top-heavy GPP-style table. Winner-take-most, geometrically decaying
 * prizes down to `paidSpots`. Rank 1 pays `topMult`×, each subsequent
 * rank pays 1/`decay` of the previous (floored at `minMult`).
 */
export function topHeavyPayoutTable(
  paidSpots = 10,
  topMult = 100,
  decay = 2,
  minMult = 1.5,
): PayTable {
  const payouts: Record<number, number> = {};
  let m = topMult;
  for (let r = 1; r <= Math.max(0, Math.floor(paidSpots)); r++) {
    payouts[r] = Math.max(minMult, m);
    m /= Math.max(1, decay);
  }
  return toTable(`topheavy-top${paidSpots}`, payouts);
}

/** Prize multiple for a rank; 0 when out of the money (rank < 1 or unpaid). */
export function payoutForRank(rank: number, table: PayTable): number {
  if (!Number.isInteger(rank) || rank < 1) return 0;
  return table.payouts[rank] ?? 0;
}

// ── seeded RNG (mulberry32) + Box–Muller normal ──────────────────────────────

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const normalPair = (rng: () => number): [number, number] => {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  const r = Math.sqrt(-2 * Math.log(u1));
  return [r * Math.cos(2 * Math.PI * u2), r * Math.sin(2 * Math.PI * u2)];
};

/** Deterministic field of `n` total scores ~ Normal(mean, sd). */
export function simulateFieldScores(
  n: number,
  mean: number,
  sd: number,
  seed = 42,
): number[] {
  const count = Math.max(0, Math.floor(n));
  const rng = mulberry32(seed);
  const out: number[] = [];
  while (out.length < count) {
    const [z0, z1] = normalPair(rng);
    out.push(mean + Math.max(0, sd) * z0);
    if (out.length < count) out.push(mean + Math.max(0, sd) * z1);
  }
  return out;
}

/** 1-based rank of `score` within `fieldScores` (1 = best). Ties share the best rank. */
export function rankScore(score: number, fieldScores: readonly number[]): number {
  return fieldScores.filter((s) => s > score).length + 1;
}

export type PortfolioResult = {
  readonly perLineup: ReadonlyArray<{
    readonly score: number;
    readonly rank: number;
    readonly payoutMult: number;
    readonly payout: number;
    readonly profit: number;
  }>;
  readonly invested: number;
  readonly returned: number;
  /** (returned − invested) / invested; 0 when nothing invested. */
  readonly roi: number;
  /** Fraction of lineups returning any prize. */
  readonly itmRate: number;
  /** ROI distribution across lineups: per-lineup (payout − fee) / fee. */
  readonly roiDist: { readonly mean: number; readonly p50: number; readonly p90: number; readonly min: number; readonly max: number };
};

const quantile = (sorted: readonly number[], q: number): number => {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * Math.min(1, Math.max(0, q));
  const loIdx = Math.floor(pos);
  const hiIdx = Math.ceil(pos);
  const lo = sorted[loIdx] ?? 0;
  const hi = sorted[hiIdx] ?? 0;
  return lo + (hi - lo) * (pos - loIdx);
};

/**
 * Rank each portfolio score against the field (field excludes the portfolio
 * itself), pay per the table, aggregate ROI + ITM.
 */
export function simulatePortfolio(
  portfolioScores: readonly number[],
  fieldScores: readonly number[],
  table: PayTable,
  entryFee = 1,
): PortfolioResult {
  const fee = Math.max(0, entryFee);
  const perLineup = portfolioScores.map((score) => {
    const rank = rankScore(score, fieldScores);
    const payoutMult = payoutForRank(rank, table);
    const payout = payoutMult * fee;
    return { score, rank, payoutMult, payout, profit: payout - fee };
  });
  const invested = fee * portfolioScores.length;
  const returned = perLineup.reduce((s, l) => s + l.payout, 0);
  const roi = invested > 0 ? (returned - invested) / invested : 0;
  const itmRate = perLineup.length
    ? perLineup.filter((l) => l.payout > 0).length / perLineup.length
    : 0;
  const rois = perLineup
    .map((l) => (fee > 0 ? l.profit / fee : 0))
    .sort((a, b) => a - b);
  const mean = rois.length ? rois.reduce((s, r) => s + r, 0) / rois.length : 0;
  return {
    perLineup,
    invested,
    returned,
    roi,
    itmRate,
    roiDist: {
      mean,
      p50: quantile(rois, 0.5),
      p90: quantile(rois, 0.9),
      min: rois.length ? (rois[0] ?? 0) : 0,
      max: rois.length ? (rois[rois.length - 1] ?? 0) : 0,
    },
  };
}
