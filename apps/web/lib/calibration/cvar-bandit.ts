/**
 * Bernstein-UCB CVaR bandit for weekly pick-category allocation —
 * arXiv 2302.03201v2 ("Near-Minimax-Optimal Risk-Sensitive Reinforcement
 * Learning with CVaR").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes the
 * published slate and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: arms = pick categories (spread-high-conf, spread-mid,
 * ML-dog, total-over, total-under, prop-tier); reward r_k = realized profit
 * in units mapped to [0,1]; per-category empirical shortfall with Bernstein
 * bonus (delta=0.05, tau=0.25); weekly: compute optimistic CVaR f-hat_k per
 * category and soft-allocate posting slots to top-f-hat categories (top-3,
 * not winner-take-all, to keep exploration); sliding 8-week window for
 * N_k and mu-hat_k (sports are not stationary, the paper assumes
 * stationarity); f-hat_k values serve as the audit trail ("why we leaned
 * totals this week"). Contextual extension (per-category quantile
 * regression on game context) is documented as follow-up work.
 *
 * ACCEPTANCE GATE (improvement-ledger): ACCEPT iff on the 2022-2025
 * walk-forward: realized CVaR_0.25(weekly profit) >= 1.15x best baseline AND
 * mean weekly profit >= 0.9x the post-all baseline AND posted picks >= 60%
 * of post-all volume; REJECT if the bonus dominates selection for >50% of
 * weeks (pure exploration).
 */

export interface CategoryStats {
  readonly category: string;
  /** Weekly realized profits in units, most recent last. */
  readonly rewards: readonly number[];
}

/**
 * Lower-tail CVaR at level tau: mean of the worst tau-fraction of samples.
 * Rewards are mapped to [0,1] by the caller (profit in units, rescaled).
 */
export function empiricalCvar(samples: readonly number[], tau: number): number {
  const t = Math.min(Math.max(tau, 0), 1);
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const k = Math.max(1, Math.ceil(t * sorted.length));
  let s = 0;
  for (let i = 0; i < k; i++) s += sorted[i]!;
  return s / k;
}

/** Sample variance (unbiased). */
export function sampleVariance(samples: readonly number[]): number {
  const n = samples.length;
  if (n < 2) return 0;
  const mean = samples.reduce((a, b) => a + b, 0) / n;
  let s = 0;
  for (const x of samples) s += (x - mean) * (x - mean);
  return s / (n - 1);
}

/**
 * Bernstein bonus for the CVaR estimate: sqrt(2 V log(1/delta)/n) +
 * 3 log(1/delta)/n, with V the sample variance of the tail samples.
 */
export function bernsteinBonus(
  tailSamples: readonly number[],
  n: number,
  delta: number,
): number {
  if (n <= 0) return Number.POSITIVE_INFINITY;
  const v = sampleVariance(tailSamples);
  const c = Math.log(1 / Math.max(delta, 1e-12));
  return Math.sqrt((2 * v * c) / n) + (3 * c) / n;
}

/**
 * Optimistic CVaR f-hat_k = empirical CVaR + Bernstein bonus. The bonus
 * drives exploration of under-sampled categories; the empirical shortfall
 * drives exploitation.
 */
export function optimisticCvar(
  samples: readonly number[],
  tau: number,
  delta: number,
): number {
  const n = samples.length;
  if (n === 0) return Number.POSITIVE_INFINITY; // unexplored: maximal optimism
  const cvar = empiricalCvar(samples, tau);
  const sorted = [...samples].sort((a, b) => a - b);
  const k = Math.max(1, Math.ceil(Math.min(Math.max(tau, 0), 1) * n));
  return cvar + bernsteinBonus(sorted.slice(0, k), n, delta);
}

/** Sliding 8-week window: most recent `weeks` rewards. */
export function slidingWindow(
  rewards: readonly number[],
  weeks = 8,
): number[] {
  return rewards.slice(Math.max(0, rewards.length - weeks));
}

/**
 * Soft allocation of posting slots to the top-K categories by f-hat
 * (proportional to max(f-hat, 0); ties split evenly). Not winner-take-all:
 * exploration is preserved across the top-K.
 */
export function allocateSlots(
  fHats: ReadonlyArray<{ readonly category: string; readonly fHat: number }>,
  totalSlots: number,
  topK = 3,
): ReadonlyArray<{ readonly category: string; readonly slots: number }> {
  if (fHats.length === 0 || totalSlots <= 0) return [];
  const ranked = [...fHats].sort((a, b) => b.fHat - a.fHat).slice(0, topK);
  const weights = ranked.map((r) => Math.max(r.fHat, 0));
  const wSum = weights.reduce((a, b) => a + b, 0);
  if (wSum === 0) {
    const each = Math.floor(totalSlots / ranked.length);
    return ranked.map((r, i) => ({
      category: r.category,
      slots: each + (i < totalSlots % ranked.length ? 1 : 0),
    }));
  }
  let assigned = 0;
  const out = ranked.map((r, i) => {
    const slots =
      i === ranked.length - 1
        ? totalSlots - assigned
        : Math.floor((weights[i]! / wSum) * totalSlots);
    assigned += slots;
    return { category: r.category, slots };
  });
  return out;
}

/** Fraction of weeks where the bonus term dominated the f-hat ranking. */
export function bonusDominanceFraction(
  weeklyBonusDominated: readonly boolean[],
): number {
  if (weeklyBonusDominated.length === 0) return 0;
  return weeklyBonusDominated.filter(Boolean).length / weeklyBonusDominated.length;
}
