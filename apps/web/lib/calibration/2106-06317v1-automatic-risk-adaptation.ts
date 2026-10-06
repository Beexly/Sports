// @ts-nocheck
/**
 * arXiv 2106.06317v1: Automatic Risk Adaptation in Distributional RL.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Automatic risk adaptation around pick/stake decisions: per-game novelty u(game) from a lightweight RND pair trained on the engine's residual stream ('ways the engine is wrong', not raw features); CVaR distortion with alpha = e^{-u} (familiar game -> full aggression, unprecedented -> pass or quarter-stake); psi learned as a monotone u->alpha map via isotonic regression on u-deciles maximizing realized CVaR of weekly profit.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Wrap the engine's pick/stake decisions in automatic risk adaptation: train a lightweight RND pair on the engine's game-feature vectors (spread, total, team ratings, injuries, weather flags, rest days) over historical seasons; per-game novelty u(game) = normalized prediction error; apply CVaR distortion with alpha = e^{-u} to the engine's outcome distribution for post/stake decisions (familiar divisional game -> full aggression; unprecedented situation -> pass or quarter-stake) — then learn psi instead of fixing e^{-u}: fit a monotone map from u to alpha via isotonic regression on u-deciles maximizing realized CVaR of weekly profit, and measure novelty in 'ways the engine is wrong' (RND on the engine's residual stream, not raw features).
 *
 * ACCEPTANCE GATE:
 * ACCEPT if walk-forward: policy B's worst-week loss (5th percentile of weekly P&L) is >=25% smaller (less negative) than the best fixed-alpha policy's, AND season profit >= 0.95 x best fixed-alpha season profit, AND the u-decile stratification shows monotonically decreasing stake with increasing u.
 *
 * ENABLED=false: wraps pick/stake decisions; needs a human call.
 */


export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ENABLED = false;

/**
 * Novelty score u(game) in [0, +inf): normalized RND prediction error on the
 * engine's residual stream. 0 = completely familiar, large = unprecedented.
 */
export function noveltyScore(rndError: number, errorScale: number): number {
  return Math.max(rndError, 0) / Math.max(errorScale, 1e-9);
}

/** Fixed risk-distortion map: alpha = e^{-u}. Familiar -> 1 (full aggression). */
export function alphaFromNovelty(u: number): number {
  return Math.exp(-Math.max(u, 0));
}

/** PAVA isotonic regression (nonincreasing variant for the u -> alpha map). */
export function isotonicDecreasing(ys: readonly number[]): number[] {
  // Fit nondecreasing on -y, then negate.
  const neg = ys.map((y) => -y);
  const fitted = pavaNondecreasing(neg);
  return fitted.map((v) => -v);
}

function pavaNondecreasing(y: readonly number[]): number[] {
  const n = y.length;
  const fitted = [...y];
  const starts: number[] = [];
  const sums: number[] = [];
  const counts: number[] = [];
  for (let i = 0; i < n; i++) {
    starts.push(i);
    sums.push(y[i]!);
    counts.push(1);
    while (
      sums.length >= 2 &&
      sums[sums.length - 2]! / counts[counts.length - 2]! >
        sums[sums.length - 1]! / counts[counts.length - 1]!
    ) {
      starts.pop();
      const s = sums.pop()! + sums[sums.length - 1]!;
      const c = counts.pop()! + counts[counts.length - 1]!;
      sums[sums.length - 1] = s;
      counts[counts.length - 1] = c;
    }
  }
  let b = 0;
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1] : n;
    const m = sums[b]! / counts[b]!;
    for (let j = starts[i]!; j < end!; j++) fitted[j] = m;
    b++;
  }
  return fitted;
}

/**
 * Learn psi: monotone nonincreasing map from novelty u to distortion alpha.
 * Inputs are (u-decile, realized CVaR of weekly profit at that decile); the map
 * is normalized to (0, 1] so familiar games keep full aggression.
 */
export function fitPsiMonotone(
  uDeciles: readonly number[],
  decileCvar: readonly number[],
): (u: number) => number {
  const order = uDeciles.map((_, i) => i).sort((a, b) => uDeciles[a]! - uDeciles[b]!);
  const sortedU = order.map((i) => uDeciles[i]!);
  const sortedCvar = order.map((i) => decileCvar[i]!);
  // Higher novelty should map to lower alpha: isotonic decreasing on the CVaR.
  const fitted = isotonicDecreasing(sortedCvar!);
  const maxF = Math.max(...fitted, 1e-9);
  const norm = fitted.map((v) => Math.min(Math.max(v / maxF, 0), 1));
  return (u: number): number => {
    if (u <= sortedU[0]!) return norm[0]!;
    for (let i = 1; i < sortedU.length; i++) {
      if (u <= sortedU[i]!) {
        const t = (u - sortedU[i - 1]!) / (sortedU[i]! - sortedU[i - 1]! || 1);
        return norm[i - 1]! + t * (norm[i]! - norm[i - 1]!);
      }
    }
    return norm[norm.length - 1]!;
  };
}

/**
 * CVaR-distorted stake: alpha near 1 -> full base stake; alpha near 0 ->
 * quarter-stake/pass. Maps alpha in [0,1] to a stake multiplier in [0,1]
 * with the paper's asymmetric posture (pass below 0.15).
 */
export function distortedStakeMultiplier(alpha: number, baseStake: number): number {
  const a = Math.min(Math.max(alpha, 0), 1);
  if (a < 0.15) return 0; // pass: unprecedented situation
  const mult = 0.25 + 0.75 * ((a - 0.15) / 0.85); // 0.25x .. 1x
  return baseStake * mult;
}

/** Gate helper: stakes must decrease monotonically with novelty decile. */
export function stakesMonotoneDecreasing(stakesByDecile: readonly number[]): boolean {
  for (let i = 1; i < stakesByDecile.length; i++) {
    if (stakesByDecile[i]! > stakesByDecile[i - 1]! + 1e-9) return false;
  }
  return true;
}
