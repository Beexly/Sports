/**
 * Own/ally/enemy attribution schema for NFL skill positions
 *
 * Research port: arXiv:2403.04873
 * Normalized lane: team_ratings | Doctrine: SITUATIONAL
 *
 * Attribution framework schema: own model (e.g. WR yards/route = beta_0 + b_scheme + b_player + epsilon with scheme/team random effect), ally model (residual attribution to supporting cast), enemy model (defensive attribution). Defines the record shapes and the residual decomposition; model fitting is a live-data gate.
 *
 * ACCEPTANCE GATE: Adopt the attribution framework only if the own-effect model beats raw EPA/dropback on out-of-sample prediction RMSE (train 2020-2023, predict 2024-2025 player efficiency). Live-data gate -> GSE_ATTRIBUTION_ENABLED flag (default false).
 */

export type AttributionLayer = "own" | "ally" | "enemy";

export interface AttributionRecord {
  playerId: string;
  position: "WR" | "RB" | "TE" | "QB";
  teamId: string;
  schemeId: string;
  /** observed efficiency, e.g. yards per route */
  observed: number;
  /** fitted components; ally/enemy may be absent for the own-only pass */
  components: Partial<Record<AttributionLayer, number>>;
  residual: number;
}

/** Decompose observed = beta0 + bScheme + bPlayer + bAlly + bEnemy + residual. */
export function decomposeAttribution(args: {
  playerId: string;
  position: AttributionRecord["position"];
  teamId: string;
  schemeId: string;
  observed: number;
  beta0: number;
  bScheme: number;
  bPlayer: number;
  bAlly?: number;
  bEnemy?: number;
}): AttributionRecord {
  const bAlly = args.bAlly ?? 0;
  const bEnemy = args.bEnemy ?? 0;
  const fitted = args.beta0 + args.bScheme + args.bPlayer + bAlly + bEnemy;
  return {
    playerId: args.playerId,
    position: args.position,
    teamId: args.teamId,
    schemeId: args.schemeId,
    observed: args.observed,
    components: { own: args.beta0 + args.bScheme + args.bPlayer, ally: bAlly, enemy: bEnemy },
    residual: args.observed - fitted,
  };
}

/** Player's own-effect estimate (beta0 + scheme + player), the quantity benchmarked vs raw EPA. */
export function ownEffect(r: AttributionRecord): number {
  return r.components.own ?? r.observed - r.residual;
}

/** RMSE of a prediction list vs observed. */
export function rmse(predicted: number[], observed: number[]): number {
  if (predicted.length === 0 || predicted.length !== observed.length) return Infinity;
  const mse = predicted.reduce((a, p, i) => a + (p - (observed[i] ?? p)) ** 2, 0) / predicted.length;
  return Math.sqrt(mse);
}

/** Live-data gate: own-effect RMSE must beat raw EPA/dropback out of sample. */
export const GSE_ATTRIBUTION_ENABLED = false;

