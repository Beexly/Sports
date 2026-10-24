/**
 * packages/prediction-engine/src/player-feature-vector.ts
 * 50-Feature Player x Situational State Interaction Model
 * Crosses base tracking/usage measurements (SOE, separation, aDOT, shrunk target share,
 * TPRR, air-yard share, RYOE, snap share, route participation) with coverage shell
 * (two-high rate, man coverage rate), pass-rush pressure rate, injury/vacated state,
 * and game-script trailing probability.
 */

export interface PlayerBase {
  soe_yd: number;
  avg_separation: number;
  adot: number;
  target_share: number;
  targets_per_route_run: number;
  air_yard_share: number;
  ryoe: number;
  snap_share: number;
  route_participation: number;
}

export interface SituationalState {
  two_high_rate: number;          // 0-1
  man_coverage_rate: number;      // 0-1
  pressure_rate: number;          // 0-1
  primary_defender_out: boolean;
  wr1_out: boolean;
  trailing_prob: number;          // 0-1 from margin distribution
  short_week: boolean;
  is_home: boolean;
}

export const PLAYER_INTERACTION_FEATURE_NAMES: readonly string[] = Object.freeze([
  // Base (9)
  "soe_yd",
  "avg_separation",
  "adot",
  "target_share",
  "tprr",
  "air_yard_share",
  "ryoe",
  "snap_share",
  "route_participation",
  // Coverage & Pressure Interactions (12)
  "soe_x_two_high",
  "soe_x_man",
  "sep_x_two_high",
  "sep_x_man",
  "adot_x_two_high",
  "tprr_x_two_high",
  "air_x_two_high",
  "soe_x_pressure",
  "sep_x_pressure",
  "tprr_x_pressure",
  "adot_x_pressure",
  "air_x_pressure",
  // Injury / Vacated Interactions (6)
  "target_share_x_wr1_out",
  "tprr_x_wr1_out",
  "air_x_wr1_out",
  "soe_x_def_out",
  "sep_x_def_out",
  "ryoe_x_def_out",
  // Script Interactions (8)
  "target_share_x_trail",
  "tprr_x_trail",
  "ryoe_x_trail",
  "snap_x_trail",
  "adot_x_trail",
  "sep_x_trail",
  "soe_x_trail",
  "air_x_trail",
  // Additional Crossings (10)
  "ryoe_x_two_high",
  "ryoe_x_man",
  "snap_x_two_high",
  "route_x_two_high",
  "route_x_man",
  "route_x_pressure",
  "target_share_x_man",
  "target_share_x_pressure",
  "tprr_x_man",
  "snap_x_pressure",
  // Residuals & Context (5)
  "soe_residual_two_high",
  "tprr_residual_trail",
  "short_week",
  "is_home",
  "trailing_prob",
]);

export function buildPlayerFeatureVector(
  base: PlayerBase,
  state: SituationalState,
): Record<string, number> {
  const f: Record<string, number> = {};

  // Base (9)
  f["soe_yd"] = base.soe_yd;
  f["avg_separation"] = base.avg_separation;
  f["adot"] = base.adot;
  f["target_share"] = base.target_share;
  f["tprr"] = base.targets_per_route_run;
  f["air_yard_share"] = base.air_yard_share;
  f["ryoe"] = base.ryoe;
  f["snap_share"] = base.snap_share;
  f["route_participation"] = base.route_participation;

  // Coverage & Pressure Interactions (12)
  f["soe_x_two_high"] = base.soe_yd * state.two_high_rate;
  f["soe_x_man"] = base.soe_yd * state.man_coverage_rate;
  f["sep_x_two_high"] = base.avg_separation * state.two_high_rate;
  f["sep_x_man"] = base.avg_separation * state.man_coverage_rate;
  f["adot_x_two_high"] = base.adot * state.two_high_rate;
  f["tprr_x_two_high"] = base.targets_per_route_run * state.two_high_rate;
  f["air_x_two_high"] = base.air_yard_share * state.two_high_rate;
  f["soe_x_pressure"] = base.soe_yd * state.pressure_rate;
  f["sep_x_pressure"] = base.avg_separation * state.pressure_rate;
  f["tprr_x_pressure"] = base.targets_per_route_run * state.pressure_rate;
  f["adot_x_pressure"] = base.adot * state.pressure_rate;
  f["air_x_pressure"] = base.air_yard_share * state.pressure_rate;

  // Injury / Vacated Interactions (6)
  const wr1Out = state.wr1_out ? 1 : 0;
  const defOut = state.primary_defender_out ? 1 : 0;
  f["target_share_x_wr1_out"] = base.target_share * wr1Out;
  f["tprr_x_wr1_out"] = base.targets_per_route_run * wr1Out;
  f["air_x_wr1_out"] = base.air_yard_share * wr1Out;
  f["soe_x_def_out"] = base.soe_yd * defOut;
  f["sep_x_def_out"] = base.avg_separation * defOut;
  f["ryoe_x_def_out"] = base.ryoe * defOut;

  // Script Interactions (8)
  const trail = state.trailing_prob;
  f["target_share_x_trail"] = base.target_share * trail;
  f["tprr_x_trail"] = base.targets_per_route_run * trail;
  f["ryoe_x_trail"] = base.ryoe * trail;
  f["snap_x_trail"] = base.snap_share * trail;
  f["adot_x_trail"] = base.adot * trail;
  f["sep_x_trail"] = base.avg_separation * trail;
  f["soe_x_trail"] = base.soe_yd * trail;
  f["air_x_trail"] = base.air_yard_share * trail;

  // Additional Crossings (10)
  f["ryoe_x_two_high"] = base.ryoe * state.two_high_rate;
  f["ryoe_x_man"] = base.ryoe * state.man_coverage_rate;
  f["snap_x_two_high"] = base.snap_share * state.two_high_rate;
  f["route_x_two_high"] = base.route_participation * state.two_high_rate;
  f["route_x_man"] = base.route_participation * state.man_coverage_rate;
  f["route_x_pressure"] = base.route_participation * state.pressure_rate;
  f["target_share_x_man"] = base.target_share * state.man_coverage_rate;
  f["target_share_x_pressure"] = base.target_share * state.pressure_rate;
  f["tprr_x_man"] = base.targets_per_route_run * state.man_coverage_rate;
  f["snap_x_pressure"] = base.snap_share * state.pressure_rate;

  // Residuals & Context (5)
  f["soe_residual_two_high"] = base.soe_yd * (1 - state.two_high_rate);
  f["tprr_residual_trail"] = base.targets_per_route_run * (1 - trail);
  f["short_week"] = state.short_week ? 1 : 0;
  f["is_home"] = state.is_home ? 1 : 0;
  f["trailing_prob"] = trail;

  return f;
}

export function playerVectorContribution(
  base: PlayerBase,
  state: SituationalState,
  weights: Record<string, number> = {},
): number {
  const features = buildPlayerFeatureVector(base, state);
  let sum = 0;
  for (const [k, v] of Object.entries(features)) {
    sum += (weights[k] ?? 0.01) * v;
  }
  return sum;
}
