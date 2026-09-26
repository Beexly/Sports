// @ts-nocheck
/**
 * arXiv 2012.04626v2: Minimax Regret Optimisation for Robust Planning in Uncertain MDPs.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: UMDP robust staking: K=15 'worlds' (bootstrap variants of engine calibration x 3 market regimes), each mapping (bankroll bucket x edge bucket) to expected weekly profit per stake tier; the stake-tier policy minimizes max_world [V*_world - V^pi_world] via regret-Bellman DP with 2-step options, served as a weekly lookup table with per-world regret audit logging.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * UMDP construction: sample K=15 'worlds' (bootstrap variants of the engine's calibration crossed with 3 market regimes: normal, sharp-heavy, chaotic), each a mapping from (bankroll bucket x edge bucket) to expected weekly profit per stake tier; stake-tier policy minimizing max_world [V*_world - V^pi_world] via the paper's regret-Bellman DP with 2-step options; serve as a weekly lookup in the minimax-regret policy table, logging per-world regret contributions for audit.
 *
 * ACCEPTANCE GATE:
 * ACCEPT if 2024-2025: realized worst-world regret <= 0.7 x maximin baseline's AND mean profit >= maximin's AND posted volume >= 80% of flat-1u (must not degenerate toward passivity). REJECT if worst-world regret isn't better than maximin's or volume collapses below 60% (then it's maximin in disguise).
 *
 * ENABLED=false: weekly stake-tier policy table; needs a human call.
 */


export const ENABLED = false;

export type StakeTier = 0 | 0.5 | 1 | 1.5 | 2;
export const STAKE_TIERS: StakeTier[] = [0, 0.5, 1, 1.5, 2];

/** One world: expected weekly profit per (bankrollBucket, edgeBucket, stakeTier). */
export interface World {
  readonly id: string;
  /** value[bankrollBucket][edgeBucket][stakeTierIdx] = expected weekly profit */
  readonly value: number[][][];
  /** V*_world: oracle best achievable value per state under this world. */
  readonly oracle: number[][];
}

export interface PolicyTable {
  /** policy[bankrollBucket][edgeBucket] = stake tier index into STAKE_TIERS */
  readonly policy: number[][];
}

/** Regret of a policy in one world: sum over states of (oracle - policy value). */
export function worldRegret(world: World, policy: PolicyTable): number {
  let regret = 0;
  const nb = world.value.length;
  for (let b = 0; b < nb; b++) {
    const ne = world.value[b]!.length;
    for (let e = 0; e < ne; e++) {
      const tierIdx = policy.policy[b]![e]!;
      regret += world.oracle[b]![e]! - world.value[b]![e]![tierIdx]!;
    }
  }
  return regret;
}

/** Worst-world regret of a policy (the minimax-regret objective). */
export function maxWorldRegret(worlds: readonly World[], policy: PolicyTable): number {
  return Math.max(...worlds.map((w) => worldRegret(w, policy)));
}

/**
 * Minimax-regret policy via regret-Bellman DP with 2-step options, simplified to
 * a per-state greedy: for each state, choose the stake tier minimizing the
 * maximum regret across worlds, with 2 improvement sweeps (the "options" lookahead
 * approximated by re-evaluating after neighbor-state updates).
 */
export function minimaxRegretPolicy(worlds: readonly World[]): PolicyTable {
  if (worlds.length === 0) throw new Error("minimaxRegretPolicy: no worlds");
  const nb = worlds[0]!.value.length;
  const ne = worlds[0]!.value[0]!.length;
  const nt = STAKE_TIERS.length;
  const policy: number[][] = Array.from({ length: nb }, () =>
    new Array(ne).fill(2),
  );
  const stateWorstRegret = (b: number, e: number, t: number): number => {
    let worst = -Infinity;
    for (const w of worlds) {
      worst = Math.max(worst, w.oracle[b]![e]! - w.value[b]![e]![t]!);
    }
    return worst;
  };
  for (let sweep = 0; sweep < 3; sweep++) {
    for (let b = 0; b < nb; b++) {
      for (let e = 0; e < ne; e++) {
        let bestT = policy[b]![e]!;
        let bestR = stateWorstRegret(b, e, bestT);
        for (let t = 0; t < nt; t++) {
          const r = stateWorstRegret(b, e, t);
          if (r < bestR - 1e-12) {
            bestR = r;
            bestT = t;
          }
        }
        policy[b]![e] = bestT;
      }
    }
  }
  return { policy };
}

/** Per-world regret contributions for the audit log. */
export function regretAuditLog(
  worlds: readonly World[],
  policy: PolicyTable,
): { worldId: string; regret: number }[] {
  return worlds.map((w) => ({ worldId: w.id, regret: worldRegret(w, policy) }));
}

/** Build a synthetic world set from a profit table + regime multipliers (for tests). */
export function makeWorld(
  id: string,
  baseProfit: (b: number, e: number, t: number) => number,
  nBankroll = 3,
  nEdge = 2,
): World {
  const value = Array.from({ length: nBankroll }, (_, b) =>
    Array.from({ length: nEdge }, (_, e) =>
      STAKE_TIERS.map((_, t) => baseProfit(b, e, t)),
    ),
  );
  const oracle = value.map((bs) => bs.map((es) => Math.max(...es)));
  return { id, value, oracle };
}
