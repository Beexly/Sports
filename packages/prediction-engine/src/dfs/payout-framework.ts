/**
 * Two-stage tournament payout framework (GSE product IP).
 *
 * Stage 1: fit the power-law ideal to GSE's contest pool/entry/first-prize
 * parameters via binary search on α — payout share of rank r ∝ r^(−α).
 * Stage 2: the bucketing heuristic with GSE's nice-number preferences for
 * contests, promotions, pick'em pools, and subscriber tournaments.
 * A method-soundness gate: there is no prediction to validate, only the
 * framework's fidelity to the paper's construction.
 *
 * @see arXiv:1601.04203v2 — "Determining Tournament Payout Structures for Daily Fantasy Sports"
 *
 * ACCEPTANCE GATE: ADAPT iff the reimplementation reproduces the paper's
 * qualitative claims (power-law ideal via binary search; heuristic within 5%
 * of exact optimum on small contests; sub-second runtime at N=100k scale).
 * The gate is a construction concern; this module is the pure payout kernel,
 * not wired into any live path.
 */

/**
 * Binary-search α so the winner's share of a power-law payout matches the
 * target top prize: share_1 = 1 / Σ_{r=1..nPaid} r^(−α).
 */
export function fitPowerLawAlpha(
  nPaid: number,
  targetWinnerShare: number,
  tol = 1e-9,
): number {
  if (!(nPaid >= 1)) throw new Error("fitPowerLawAlpha: nPaid ≥ 1");
  if (!(targetWinnerShare > 0 && targetWinnerShare <= 1)) {
    throw new Error("fitPowerLawAlpha: targetWinnerShare ∈ (0,1]");
  }
  const winnerShare = (alpha: number): number => {
    let s = 0;
    for (let r = 1; r <= nPaid; r++) s += Math.pow(r, -alpha);
    return 1 / s;
  };
  // winnerShare increases in α; bracket [0, 10].
  let lo = 0;
  let hi = 10;
  if (winnerShare(hi) < targetWinnerShare) return hi;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (winnerShare(mid) < targetWinnerShare) lo = mid;
    else hi = mid;
    if (hi - lo < tol) break;
  }
  return (lo + hi) / 2;
}

/** Power-law payout shares for ranks 1..nPaid (sums to 1). */
export function powerLawShares(nPaid: number, alpha: number): number[] {
  if (!(nPaid >= 1)) throw new Error("powerLawShares: nPaid ≥ 1");
  const raw: number[] = [];
  for (let r = 1; r <= nPaid; r++) raw.push(Math.pow(r, -alpha));
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((x) => x / total);
}

/**
 * Bucketing heuristic: merge adjacent ranks into GSE nice-number buckets
 * ($5/$10/$25/…) keeping each bucket's total within `tolerance` of the
 * power-law ideal. Returns { rankStart, rankEnd, prizePerWinner }[].
 */
export function bucketPayouts(
  totalPrize: number,
  nPaid: number,
  alpha: number,
  tolerance = 0.05,
): Array<{ rankStart: number; rankEnd: number; prizePerWinner: number }> {
  const shares = powerLawShares(nPaid, alpha);
  const buckets: Array<{ rankStart: number; rankEnd: number; prizePerWinner: number }> = [];
  let start = 1;
  let acc = 0;
  let count = 0;
  for (let r = 1; r <= nPaid; r++) {
    acc += (shares[r - 1] ?? 0) * totalPrize;
    count++;
    const perWinner = acc / count;
    const nice = niceNumber(perWinner);
    const lastBucket = r === nPaid;
    if (lastBucket || Math.abs(nice - perWinner) / perWinner <= tolerance) {
      buckets.push({ rankStart: start, rankEnd: r, prizePerWinner: nice });
      start = r + 1;
      acc = 0;
      count = 0;
    }
  }
  return buckets;
}

/** Round down to a GSE "nice number" ($1/$2/$5 × 10^k ladder). */
export function niceNumber(x: number): number {
  if (!(x > 0)) return 0;
  const exp = Math.floor(Math.log10(x));
  const base = Math.pow(10, exp);
  const mantissa = x / base;
  const nice = mantissa >= 5 ? 5 : mantissa >= 2 ? 2 : 1;
  return nice * base;
}
