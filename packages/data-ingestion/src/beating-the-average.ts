/**
 * Beating the average: how to generate profit by exploiting the inefficiencies of soccer betting
 *
 * arXiv:2303.16648v1 · lane:experimental · owner:Motif-lab
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build a 'coverage calculator' for GSE contest products (survivor pools, pick'em pools,
 * correlated parlay portfolios): given m published picks with heterogeneous per-pick hit rates p_i
 * from GSE's calibrated probabilities, payout tiers, entry cost, and desired safety Q, output the
 * number of portfolio entries and their construction - generalizing the paper's eq 15 to
 * heterogeneous p_i via the Poisson-binomial, adding a variance-aware gate (Sharpe ratio of the
 * coverage strategy over the 1.5-year return distribution instead of expected profit alone), and
 * sizing entries to expected closing-line value of each pick subject to the coverage constraint.
 *
 * ACCEPTANCE GATE: Adopt the coverage calculator if, on the 10,000-draw simulation using GSE's calibrated per-pick
 * probabilities, empirical coverage at the computed n matches the target Q within +/-1 pp across Q
 * in {90%, 99%, 99.9%} AND the expected-profit sign matches the formula's prediction on historical
 * pick'em data; reject if heterogeneity in p_i breaks the approximation beyond +/-3 pp.
 *
 * Ingest role: schemas (market inefficiency study: ROI audit schema + inefficiency detectors).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "2303.16648v1" as const;
export const LANE = "experimental" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `Adopt the coverage calculator if, on the 10,000-draw simulation using GSE's calibrated per-pick
 * probabilities, empirical coverage at the computed n matches the target Q within +/-1 pp across Q
 * in {90%, 99%, 99.9%} AND the expected-profit sign matches the formula's prediction on historical
 * pick'em data; reject if heterogeneity in p_i breaks the approximation beyond +/-3 pp.`;

export const CONFIG = {
  enabled: false,
  study: "soccer betting inefficiencies",
  roiGate: 0.0,
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface PricedBet {
  readonly betId: string;
  readonly decimalOdds: number;
  readonly stake: number;
  readonly won: boolean;
  readonly market: string;
}

export function isPricedBet(x: unknown): x is PricedBet {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o["betId"] === "string" &&
    isFiniteNumber(o["decimalOdds"]) && (o["decimalOdds"] as number) > 1 &&
    isFiniteNumber(o["stake"]) && (o["stake"] as number) > 0 &&
    typeof o["won"] === "boolean" &&
    typeof o["market"] === "string"
  );
}

/** ROI of a bet set. */
export function roi(bets: readonly unknown[]): number | null {
  const v: PricedBet[] = [];
  for (const b of bets) if (isPricedBet(b)) v.push(b);
  if (v.length === 0) return null;
  const staked = v.reduce((s, b) => s + b.stake, 0);
  const returned = v.reduce((s, b) => s + (b.won ? b.stake * b.decimalOdds : 0), 0);
  return (returned - staked) / staked;
}

/** ROI per market (inefficiency localization). */
export function roiByMarket(bets: readonly unknown[]): Record<string, { n: number; roi: number | null }> {
  const groups = new Map<string, PricedBet[]>();
  for (const b of bets) {
    if (!isPricedBet(b)) continue;
    const g = groups.get(b.market) ?? [];
    g.push(b);
    groups.set(b.market, g);
  }
  const out: Record<string, { n: number; roi: number | null }> = {};
  for (const [m, bs] of groups) out[m] = { n: bs.length, roi: roi(bs) };
  return out;
}

/** Favorite-longshot bias check: ROI of short-odds vs long-odds buckets. */
export function favoriteLongshot(bets: readonly unknown[], cutoff = 2.0): { favRoi: number | null; dogRoi: number | null } {
  const v: PricedBet[] = [];
  for (const b of bets) if (isPricedBet(b)) v.push(b);
  return {
    favRoi: roi(v.filter((b) => b.decimalOdds < cutoff)),
    dogRoi: roi(v.filter((b) => b.decimalOdds >= cutoff)),
  };
}

/** t-stat of ROI vs 0 (is the edge real?). */
export function roiTStat(bets: readonly unknown[]): number | null {
  const v: PricedBet[] = [];
  for (const b of bets) if (isPricedBet(b)) v.push(b);
  if (v.length < 2) return null;
  const per = v.map((b) => (b.won ? b.decimalOdds - 1 : -1) * b.stake);
  const m = per.reduce((a, x) => a + x, 0) / per.length;
  const sd = Math.sqrt(per.reduce((a, x) => a + (x - m) * (x - m), 0) / (per.length - 1));
  if (sd === 0) return null;
  return m / (sd / Math.sqrt(per.length));
}
