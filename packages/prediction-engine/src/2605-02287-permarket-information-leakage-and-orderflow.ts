/**
 * arXiv:2605.02287 — Per-Market Information Leakage and Order-Flow Skill: Two Methodological Lenses on Informed Trading in Decentralized Prediction Markets
 *
 * Skilled-flow watchlist: the 10,000-draw sign-randomization test identifies skilled accounts; per-market
 * pre-kickoff front-loading (ILS) weights GSE's line-move signals by watchlist origin.
 *
 * Improvement: Build a skilled-flow watchlist on Polymarket NFL markets: replicate the 10,000-draw sign-randomization test to identify skilled accounts, compute per-market pre-kickoff front-loading (ILS), and weight GSE's line-move signals by whether they originate from watchlist accounts.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT is confirmed if, on 2024 Polymarket NFL data, the sports-only replication achieves ≥35% out-of-sample retention of the skilled-winner label AND high-ILS markets show ≥4pp better move→outcome prediction than unflagged markets.
 */

/**
 * Sign-randomization test: under H0 (no skill) each account's P&L sign is
 * random; the p-value is the fraction of draws beating the observed P&L.
 * Deterministic LCG draws keep the test reproducible.
 */
export function signRandomizationPValue(
  pnl: readonly number[],
  observedTotal: number,
  nDraws: number,
  seed: number,
): number {
  if (pnl.length === 0) throw new Error("signRandomizationPValue: no pnl");
  let s = seed >>> 0;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
  let beats = 0;
  for (let d = 0; d < nDraws; d++) {
    let tot = 0;
    for (const v of pnl) tot += rand() < 0.5 ? v : -v;
    if (tot >= observedTotal) beats++;
  }
  return (beats + 1) / (nDraws + 1);
}

/** Pre-kickoff front-loading (ILS): share of volume in the first window. */
export function frontLoadingIls(
  volumes: readonly number[],
  frontWindow: number,
): number {
  if (volumes.length === 0) throw new Error("frontLoadingIls: no volumes");
  const total = volumes.reduce((a, b) => a + b, 0);
  if (total <= 0) return 0;
  const front = volumes.slice(0, Math.max(0, frontWindow)).reduce((a, b) => a + b, 0);
  return front / total;
}

/** Watchlist membership: skilled (p < 0.05) AND high front-loading. */
export function watchlistMember(pValue: number, ils: number, ilsCut = 0.5): boolean {
  return pValue < 0.05 && ils >= ilsCut;
}
