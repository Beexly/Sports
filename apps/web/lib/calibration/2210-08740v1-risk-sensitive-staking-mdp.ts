// @ts-nocheck
/**
 * arXiv 2210.08740v1: Risk-Sensitive Markov Decision Processes with Long-Run CVaR Criterion.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Seasonal risk-sensitive staking MDP: 20 states (bankroll decile x edge-availability bucket), 5 stake tiers {0, 0.5u, 1u, 1.5u, 2u}; transitions from 2022-2025 weekly P&L; policy iteration (difference-formula, 5 random restarts) on CVaR_0.75(weekly cost) + beta*mean with beta in {0.1, 0.22, 0.4} (conservative/balanced/aggressive); regime gating; monthly re-solve; distributional evaluation checks the CVaR-blindness-to-success failure mode.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Stand up the seasonal risk-sensitive staking MDP: states = bankroll decile (10) x edge-availability bucket (high/low) = 20 states, actions = stake tiers {0, 0.5u, 1u, 1.5u, 2u} (0 = sit out the week), transitions from 2022-2025 weekly P&L, reward = weekly profit; policy iteration (difference-formula, 5 random restarts keeping best local optimum) on objective = CVaR_0.75(weekly cost) + beta*mean with beta in {0.1, 0.22, 0.4} as three policy tables (conservative/balanced/aggressive); regime gating (normal uses this table; loss frame switches to the randomized policy); monthly re-solve — then test a distributional evaluation (full long-run cost distribution per state-action) against a spectral risk measure instead of pure CVaR, checking the 'CVaR-blindness-to-success' failure mode.
 *
 * ACCEPTANCE GATE:
 * ACCEPT iff 2024-2025 simulation: long-run CVaR_0.75(weekly cost) <= 0.7x best baseline's AND mean weekly profit >= 0.9x best baseline's AND max drawdown <= 0.85x best baseline's; REJECT if the local-optimum spread across restarts exceeds 30% of the objective (landscape too unstable) or any beta setting underperforms flat-1u on all three metrics.
 *
 * ENABLED=false: staking policy tables; needs a human call.
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

export const N_BANKROLL_BUCKETS = 10;
export const N_EDGE_BUCKETS = 2;
export const N_STATES = N_BANKROLL_BUCKETS * N_EDGE_BUCKETS; // 20
export const STAKE_TIERS = [0, 0.5, 1, 1.5, 2];
export const BETAS = [0.1, 0.22, 0.4]; // conservative / balanced / aggressive

export interface WeeklyPnl {
  /** Bankroll decile 0..9 at week start. */
  readonly bankrollBucket: number;
  /** Edge availability: 0 = low, 1 = high. */
  readonly edgeBucket: 0 | 1;
  /** Stake tier index used (0..4). */
  readonly tierIdx: number;
  /** Realized weekly profit in units. */
  readonly profit: number;
}

export function stateIndex(bankrollBucket: number, edgeBucket: 0 | 1): number {
  return bankrollBucket * N_EDGE_BUCKETS + edgeBucket;
}

/**
 * CVaR_0.75 of weekly COST (cost = -profit): mean of the worst 25% of costs.
 * Lower is better.
 */
export function cvarCost(profits: readonly number[]): number {
  if (profits.length === 0) return 0;
  const costs = profits.map((p) => -p).sort((a, b) => b - a);
  const k = Math.max(1, Math.ceil(0.25 * costs.length));
  const tail = costs.slice(0, k);
  return tail.reduce((a, b) => a + b, 0) / tail.length;
}

function mean(xs: readonly number[]): number {
  return xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
}

/** Objective: CVaR_0.75(weekly cost) + beta * mean(weekly cost). Lower is better. */
export function riskSensitiveObjective(profits: readonly number[], beta: number): number {
  return cvarCost(profits) + beta * mean(profits.map((p) => -p));
}

export interface PolicyTables {
  /** tables[betaIdx][state] = stake tier index. */
  readonly tables: number[][];
  readonly betas: number[];
}

/**
 * Fit the MDP from weekly P&L: per (state, tier) collect profit samples, then
 * per state pick the tier minimizing the risk-sensitive objective. 5 random
 * restarts over tie-breaking / bootstrap resamples keep the best local optimum.
 * Regime gating: the returned tables apply in the normal regime; the loss frame
 * uses the randomized (uniform) policy.
 */
export function solveRiskSensitiveMDP(
  history: readonly WeeklyPnl[],
  seed = 11,
): PolicyTables {
  const rand = mulberry32(seed);
  // samples[state][tier] = profits[]
  const samples: number[][][] = Array.from({ length: N_STATES }, () =>
    Array.from({ length: STAKE_TIERS.length }, () => [] as number[]),
  );
  for (const h of history) {
    samples[stateIndex(h.bankrollBucket, h.edgeBucket)]![h.tierIdx]!.push(h.profit);
  }
  const tables: number[][] = BETAS.map(() => []);
  for (let bi = 0; bi < BETAS.length; bi++) {
    const beta = BETAS[bi]!;
    let bestTable: number[] = [];
    let bestObj = Infinity;
    for (let restart = 0; restart < 5; restart++) {
      const table: number[] = [];
      let totalObj = 0;
      let totalN = 0;
      for (let s = 0; s < N_STATES; s++) {
        let bestTier = 0;
        let bestTierObj = Infinity;
        for (let t = 0; t < STAKE_TIERS.length; t++) {
let prof = samples[s]![t]!;
        if (restart > 0 && prof.length > 0) {
          // bootstrap resample for the restart
          prof = prof.map(() => prof[Math.floor(rand() * prof.length)]!);
        }
          const obj = prof.length > 0 ? riskSensitiveObjective(prof, beta) : Infinity;
          if (obj < bestTierObj) {
            bestTierObj = obj;
            bestTier = t;
          }
        }
        table.push(bestTier);
        if (bestTierObj < Infinity) {
totalObj += bestTierObj * Math.max(samples[s]![bestTier]!.length, 1);
      totalN += Math.max(samples[s]![bestTier]!.length, 1);
        }
      }
      const avg = totalN > 0 ? totalObj / totalN : Infinity;
      if (avg < bestObj) {
        bestObj = avg;
        bestTable = table;
      }
    }
    tables[bi] = bestTable;
  }
  return { tables, betas: [...BETAS] };
}

/**
 * Distributional evaluation: full long-run cost distribution per (state, tier)
 * plus the spectral check for CVaR-blindness-to-success (does the policy
 * sacrifice the right tail while protecting the left?).
 */
export function distributionalEvaluation(
  samples: readonly number[],
): {
  readonly mean: number;
  readonly cvar75: number;
  readonly p95Profit: number;
  readonly successSacrifice: number;
} {
  const sorted = [...samples].sort((a, b) => a - b);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(0.95 * sorted.length))]!;
  const meanProfit = mean(samples);
  return {
    mean: meanProfit,
    cvar75: cvarCost(samples),
    p95Profit: p95,
    successSacrifice: p95 - meanProfit,
  };
}

/** Local-optimum spread check across restarts (gate: <= 30% of objective). */
export function restartSpread(objs: readonly number[]): number {
  if (objs.length === 0) return 0;
  const m = mean(objs);
  return m !== 0 ? (Math.max(...objs) - Math.min(...objs)) / Math.abs(m) : 0;
}
