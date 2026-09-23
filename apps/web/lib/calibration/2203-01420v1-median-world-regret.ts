/**
 * arXiv 2203.01420v1: Minimax Decision Rules for Planning Under Uncertainty.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: Median-world (trimmed-mean / top-k-dropped) regret aggregation instead of max-world regret: scenario worlds from a fixed, versioned, seeded bootstrap protocol; policies under median regret with a 75th- percentile compromise variant; monthly leave-one-world-out sensitivity audits (flip > 20% -> scenario-fragile fallback) plus an adversarial red-team world search.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Adopt median-world (or trimmed-mean/top-k-dropped) regret aggregation for GSE's policy computation instead of max-world regret: generate scenario worlds via a fixed, versioned, seeded bootstrap protocol (no hand-added/removed worlds without a logged amendment), compute policies under median regret with a 75th-percentile compromise variant; monthly leave-one-world-out sensitivity audit — if dropping one world flips >20% of the policy table, flag as scenario-fragile and fall back; plus an adversarial red-team search for the world that maximally flips the policy, then harden against it.
 *
 * ACCEPTANCE GATE:
 * ACCEPT iff: the injection experiment confirms scenario sensitivity is real for GSE's world set (flip rate >20% under max-regret) AND median-regret cuts it by >=50% AND backtested worst-world regret is within 10% of max-regret's; REJECT if median-regret sacrifices >15% of worst-world protection.
 *
 * ENABLED=false: policy-computation change; needs a human call.
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

/** One scenario world: regret per policy action. */
export interface ScenarioWorld {
  readonly id: string;
  readonly version: string;
  readonly seed: number;
  /** regret[actionIdx] = V*_world - V^pi_world for that action. */
  readonly regret: readonly number[];
}

/** Max-world (minimax) regret aggregation. */
export function maxRegret(worlds: readonly ScenarioWorld[], actionIdx: number): number {
  return Math.max(...worlds.map((w) => w.regret[actionIdx]!));
}

/** Median-world regret aggregation (robust to one adversarial world). */
export function medianRegret(worlds: readonly ScenarioWorld[], actionIdx: number): number {
  const rs = worlds.map((w) => w.regret[actionIdx]!).sort((a, b) => a - b);
  const n = rs.length;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? rs[mid]! : (rs[mid - 1]! + rs[mid]!) / 2;
}

/** 75th-percentile compromise variant. */
export function percentileRegret(
  worlds: readonly ScenarioWorld[],
  actionIdx: number,
  q = 0.75,
): number {
  const rs = worlds.map((w) => w.regret[actionIdx]!).sort((a, b) => a - b);
  const idx = Math.min(rs.length - 1, Math.floor(q * rs.length));
  return rs[idx]!;
}

/** Trimmed-mean regret (drop top-k worst worlds). */
export function trimmedMeanRegret(
  worlds: readonly ScenarioWorld[],
  actionIdx: number,
  dropTopK = 1,
): number {
  const rs = worlds.map((w) => w.regret[actionIdx]!).sort((a, b) => a - b);
  const kept = rs.slice(0, Math.max(rs.length - dropTopK, 1));
  return kept.reduce((a, b) => a + b, 0) / kept.length;
}

export type Aggregator = (worlds: readonly ScenarioWorld[], actionIdx: number) => number;

/** Policy = argmin over actions of the aggregated regret. */
export function policyUnder(
  worlds: readonly ScenarioWorld[],
  nActions: number,
  agg: Aggregator,
): number {
  let best = 0;
  let bestR = Infinity;
  for (let a = 0; a < nActions; a++) {
    const r = agg(worlds, a);
    if (r < bestR) {
      bestR = r;
      best = a;
    }
  }
  return best;
}

/**
 * Leave-one-world-out sensitivity audit: fraction of worlds whose removal flips
 * the policy. Flip rate > 0.20 -> flag as scenario-fragile.
 */
export function leaveOneWorldOutFlipRate(
  worlds: readonly ScenarioWorld[],
  nActions: number,
  agg: Aggregator,
): { flipRate: number; fragile: boolean } {
  const full = policyUnder(worlds, nActions, agg);
  let flips = 0;
  for (let i = 0; i < worlds.length; i++) {
    const rest = worlds.filter((_, j) => j !== i);
    if (policyUnder(rest, nActions, agg) !== full) flips++;
  }
  const flipRate = worlds.length > 0 ? flips / worlds.length : 0;
  return { flipRate, fragile: flipRate > 0.2 };
}

/**
 * Adversarial red-team search: random-restart search over candidate worlds for
 * the one that maximally flips the policy table, so it can be hardened against.
 */
export function adversarialWorldSearch(
  worlds: readonly ScenarioWorld[],
  nActions: number,
  agg: Aggregator,
  candidate: (rand: () => number) => readonly number[],
  nRestarts = 200,
  seed = 99,
): { worstFlip: boolean; worstRegret: readonly number[] } {
  const rand = mulberry32(seed);
  const base = policyUnder(worlds, nActions, agg);
  let worstFlip = false;
  let worstRegret: readonly number[] = [];
  for (let r = 0; r < nRestarts; r++) {
    const reg = candidate(rand);
    const redTeam: ScenarioWorld = {
      id: "redteam-" + r,
      version: "redteam",
      seed,
      regret: reg,
    };
    if (policyUnder([...worlds, redTeam], nActions, agg) !== base) {
      worstFlip = true;
      worstRegret = reg;
    }
  }
  return { worstFlip, worstRegret };
}
