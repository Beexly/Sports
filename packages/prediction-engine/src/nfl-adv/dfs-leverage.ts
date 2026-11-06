/**
 * DFS ownership leverage — AGENTS.md ENGINE BENCHMARK: DFS OWNERSHIP LEVERAGE.
 *
 * leverage = optimalLineupShare − projectedOwnership, both in [0, 1].
 * Positive = underowned vs the optimizer. Ownership data is not in nflverse;
 * this module never fabricates it. Non-finite or out-of-range → refuse.
 */

import { round } from "../expected-metrics/numeric.js";

export const DFS_LEVERAGE_METHOD_TAG = "gse-dfs-ownership-leverage-v1" as const;

export interface DfsLeverageInput {
  readonly playerId: string;
  /** Optimizer share in [0, 1]. */
  readonly optimalLineupShare: number;
  /** Projected ownership in [0, 1]. */
  readonly projectedOwnership: number;
}

export type DfsLeverageResult =
  | {
      readonly ok: true;
      readonly method: typeof DFS_LEVERAGE_METHOD_TAG;
      readonly playerId: string;
      readonly optimalLineupShare: number;
      readonly projectedOwnership: number;
      readonly leverage: number;
    }
  | {
      readonly ok: false;
      readonly method: typeof DFS_LEVERAGE_METHOD_TAG;
      readonly reason: "non_finite_or_out_of_range";
      readonly playerId: string;
    };

function inUnit(x: number): boolean {
  return Number.isFinite(x) && x >= 0 && x <= 1;
}

export function dfsOwnershipLeverage(input: DfsLeverageInput): DfsLeverageResult {
  if (!inUnit(input.optimalLineupShare) || !inUnit(input.projectedOwnership)) {
    return {
      ok: false,
      method: DFS_LEVERAGE_METHOD_TAG,
      reason: "non_finite_or_out_of_range",
      playerId: input.playerId,
    };
  }
  return {
    ok: true,
    method: DFS_LEVERAGE_METHOD_TAG,
    playerId: input.playerId,
    optimalLineupShare: input.optimalLineupShare,
    projectedOwnership: input.projectedOwnership,
    leverage: round(input.optimalLineupShare - input.projectedOwnership, 6),
  };
}
