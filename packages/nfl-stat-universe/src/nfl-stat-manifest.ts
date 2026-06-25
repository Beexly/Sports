/**
 * NFL STAT UNIVERSE — the seeded manifest.
 *
 * A representative-but-real inventory covering every StatCategory, each stat declaring a legal source
 * path or a GSE derivation, its authority ceiling, and the surfaces it gates. The GSE-derived
 * meta-stats reuse @sports/engine math (role/market/fantasy/ghost) — declared here, computed there.
 * Pure data. Expand, never fork.
 */

import type { NflStatDefinition } from "./stat-definition.js";
import { SOURCES } from "./stat-definition.js";

function def(
  d: Partial<NflStatDefinition> & Pick<NflStatDefinition, "statKey" | "displayName" | "category">,
): NflStatDefinition {
  return {
    factTypes: [],
    grain: "player-week",
    legalSourceOptions: [],
    derivableByGSE: false,
    latencyNeed: "daily",
    decisionStatesSupported: [],
    maxAuthority: "INTERNAL_SIGNAL",
    blockedSurfacesIfMissing: [],
    proofRisk: 0.3,
    ...d,
  };
}

export const NFL_STAT_MANIFEST: readonly NflStatDefinition[] = [
  def({ statKey: "player_id", displayName: "Player identity", category: "IDENTITY", factTypes: ["player_id"], grain: "player-week", legalSourceOptions: [SOURCES.nflverse!], maxAuthority: "PUBLIC_CARD", proofRisk: 0.02 }),
  def({ statKey: "rest_days", displayName: "Rest / schedule context", category: "SCHEDULE_CONTEXT", factTypes: ["schedule_rest"], grain: "team-week", legalSourceOptions: [SOURCES.nflverse!], maxAuthority: "PUBLIC_CARD" }),
  def({ statKey: "game_wind", displayName: "Wind / weather", category: "VENUE_WEATHER", factTypes: ["weather"], grain: "game", legalSourceOptions: [SOURCES.nws!], maxAuthority: "PUBLIC_CARD", latencyNeed: "intraday" }),
  def({ statKey: "ref_crew", displayName: "Officiating crew tendencies", category: "OFFICIATING", factTypes: ["officials"], grain: "game", legalSourceOptions: [SOURCES.nflverse!], maxAuthority: "INTERNAL_SIGNAL", proofRisk: 0.5 }),
  def({ statKey: "final_score", displayName: "Game result", category: "GAME_RESULT", factTypes: ["play_by_play"], grain: "game", legalSourceOptions: [SOURCES.nflverse!], maxAuthority: "PUBLIC_CARD", proofRisk: 0.02 }),
  def({ statKey: "pbp_events", displayName: "Play-by-play", category: "PLAY_BY_PLAY", factTypes: ["play_by_play"], grain: "player-play", legalSourceOptions: [SOURCES.nflverse!], maxAuthority: "PUBLIC_CARD" }),
  def({ statKey: "drive_success_rate", displayName: "Drive success rate", category: "DRIVE", factTypes: ["play_by_play"], grain: "team-week", derivableByGSE: true, derivedFrom: ["pbp_events"], requiredInputs: ["pbp_events"], maxAuthority: "PUBLIC_CARD" }),
  def({ statKey: "epa_per_play", displayName: "EPA / play (team efficiency)", category: "TEAM_EFFICIENCY", factTypes: ["play_by_play"], grain: "team-week", derivableByGSE: true, derivedFrom: ["pbp_events"], requiredInputs: ["pbp_events"], maxAuthority: "PUBLIC_CARD" }),
  def({ statKey: "rec_yards", displayName: "Receiving yards (box)", category: "PLAYER_BOX", factTypes: ["play_by_play"], legalSourceOptions: [SOURCES.nflverse!], maxAuthority: "PUBLIC_CARD", proofRisk: 0.05 }),
  def({ statKey: "snap_share", displayName: "Snap share", category: "PLAYER_USAGE", factTypes: ["snap_share"], legalSourceOptions: [SOURCES.nflverse!], maxAuthority: "PUBLIC_CARD", decisionStatesSupported: ["ROLE_UP_FANTASY_LATE", "PUBLIC_OVERREACTION"] }),
  def({ statKey: "role_state_score", displayName: "Role State Score (GSE)", category: "ROLE_STATE", factTypes: ["snap_share", "route_rate", "target_share"], derivableByGSE: true, derivedFrom: ["snap_share", "route_rate", "target_share"], requiredInputs: ["snap_share", "route_rate"], maxAuthority: "PUBLIC_CARD", decisionStatesSupported: ["ROLE_UP_FANTASY_LATE"], blockedSurfacesIfMissing: ["gameplan", "today"] }),
  def({ statKey: "air_yards", displayName: "Air yards", category: "PASSING_DETAIL", factTypes: ["air_yards"], legalSourceOptions: [SOURCES.nflverse!], maxAuthority: "PUBLIC_CARD" }),
  def({ statKey: "carry_share", displayName: "Carry share", category: "RUSHING_DETAIL", factTypes: ["carry_share"], legalSourceOptions: [SOURCES.nflverse!], maxAuthority: "PUBLIC_CARD", decisionStatesSupported: ["ROLE_UP_FANTASY_LATE"] }),
  def({ statKey: "target_share", displayName: "Target share", category: "RECEIVING_DETAIL", factTypes: ["target_share"], legalSourceOptions: [SOURCES.nflverse!], maxAuthority: "PUBLIC_CARD", decisionStatesSupported: ["ROLE_UP_FANTASY_LATE"] }),
  def({ statKey: "pass_block_win_rate", displayName: "OL pass-block win rate", category: "OFFENSIVE_LINE", factTypes: ["play_by_play"], grain: "team-week", legalSourceOptions: [SOURCES.sportradar!], maxAuthority: "INTERNAL_SIGNAL", proofRisk: 0.4 }),
  def({ statKey: "pressure_rate", displayName: "Pressure rate (defense)", category: "DEFENSIVE_DETAIL", factTypes: ["play_by_play"], grain: "team-week", derivableByGSE: true, derivedFrom: ["pbp_events"], requiredInputs: ["pbp_events"], legalSourceOptions: [SOURCES.nflverse!], maxAuthority: "PUBLIC_CARD" }),
  def({ statKey: "fg_distance", displayName: "Field-goal distance / special teams", category: "SPECIAL_TEAMS", factTypes: ["play_by_play"], legalSourceOptions: [SOURCES.nflverse!], maxAuthority: "PUBLIC_CARD" }),
  def({ statKey: "injury_status", displayName: "Injury / practice status", category: "INJURY_AVAILABILITY", factTypes: ["injury_report", "practice_status"], legalSourceOptions: [SOURCES.nflverse!], maxAuthority: "PUBLIC_CARD", latencyNeed: "intraday", decisionStatesSupported: ["DATA_CONFLICT", "ROLE_UP_FANTASY_LATE"], blockedSurfacesIfMissing: ["today"] }),
  def({ statKey: "depth_chart_rank", displayName: "Depth chart rank", category: "DEPTH_CHART", factTypes: ["depth_chart"], legalSourceOptions: [SOURCES.nflverse!], maxAuthority: "PUBLIC_CARD" }),
  def({ statKey: "transaction", displayName: "Roster transaction / contract", category: "TRANSACTION_CONTRACT", factTypes: ["transaction_wire"], legalSourceOptions: [SOURCES.nflverse!], maxAuthority: "PUBLIC_CARD" }),
  def({ statKey: "spread_line", displayName: "Spread line", category: "MARKET_ODDS", factTypes: ["spread", "odds_history"], grain: "odds-snapshot", legalSourceOptions: [SOURCES.the_odds_api!, SOURCES.sportsgameodds!], maxAuthority: "PUBLIC_CARD", latencyNeed: "real_time", decisionStatesSupported: ["GOOD_IDEA_BAD_PRICE"] }),
  def({ statKey: "receiving_prop", displayName: "Receiving yards prop", category: "PLAYER_PROPS", factTypes: ["player_prop", "odds_history"], grain: "prop-ladder", legalSourceOptions: [SOURCES.the_odds_api!, SOURCES.sportsgameodds!], maxAuthority: "PUBLIC_CARD", latencyNeed: "real_time", decisionStatesSupported: ["GOOD_IDEA_BAD_PRICE", "ROLE_UP_FANTASY_LATE"] }),
  def({ statKey: "alt_prop_ladder", displayName: "Alternate prop ladder", category: "ALT_LINES", factTypes: ["alt_prop"], grain: "prop-ladder", legalSourceOptions: [SOURCES.the_odds_api!], maxAuthority: "PUBLIC_CARD", latencyNeed: "real_time" }),
  def({ statKey: "platform_projection", displayName: "Platform fantasy projection", category: "FANTASY_MARKET", factTypes: ["platform_projection", "roster_pct", "add_drop_velocity"], legalSourceOptions: [SOURCES.fantasydata!, SOURCES.sleeper!], maxAuthority: "PUBLIC_CARD", latencyNeed: "intraday", decisionStatesSupported: ["ROLE_UP_FANTASY_LATE"], blockedSurfacesIfMissing: ["gameplan"] }),
  def({ statKey: "dfs_salary", displayName: "DFS salary / slate / ownership", category: "DFS_MARKET", factTypes: ["dfs_salary", "dfs_slate", "ownership_projection"], grain: "fantasy-league-event", legalSourceOptions: [SOURCES.fantasydata!, SOURCES.sportsdataio!], maxAuthority: "ACTION_RECOMMENDATION", latencyNeed: "intraday", decisionStatesSupported: ["GOOD_IDEA_BAD_PRICE"], blockedSurfacesIfMissing: ["gameplan_dfs"] }),
  def({ statKey: "beat_report", displayName: "Beat-writer report / team news", category: "NEWS_ATTENTION", factTypes: ["beat_report", "team_news"], legalSourceOptions: [SOURCES.nflverse!], maxAuthority: "INTERNAL_SIGNAL", proofRisk: 0.6, latencyNeed: "real_time" }),
  def({ statKey: "market_absorption_half_life", displayName: "Market Absorption Half-Life (GSE)", category: "DERIVED_INTELLIGENCE", factTypes: ["odds_history", "player_prop"], grain: "odds-snapshot", derivableByGSE: true, derivedFrom: ["receiving_prop", "spread_line"], requiredInputs: ["odds_history"], maxAuthority: "PUBLIC_CARD", decisionStatesSupported: ["GOOD_IDEA_BAD_PRICE"] }),
  def({ statKey: "fantasy_lag_index", displayName: "Fantasy Lag Index (GSE)", category: "DERIVED_INTELLIGENCE", factTypes: ["platform_projection"], derivableByGSE: true, derivedFrom: ["platform_projection", "role_state_score"], requiredInputs: ["platform_projection"], maxAuthority: "PUBLIC_CARD", decisionStatesSupported: ["ROLE_UP_FANTASY_LATE"] }),
  def({ statKey: "box_score_fraud", displayName: "Box-Score Fraud (GSE)", category: "DERIVED_INTELLIGENCE", factTypes: ["snap_share", "route_rate"], derivableByGSE: true, derivedFrom: ["role_state_score", "rec_yards"], requiredInputs: ["snap_share"], maxAuthority: "PUBLIC_CARD", decisionStatesSupported: ["PUBLIC_OVERREACTION"] }),
  def({ statKey: "rights_snapshot", displayName: "Rights snapshot / proof governance", category: "PROOF_GOVERNANCE", factTypes: ["player_id"], derivableByGSE: true, derivedFrom: ["player_id"], requiredInputs: ["player_id"], maxAuthority: "OBSERVE_ONLY", proofRisk: 0.05 }),
];

/** The GSE-derived meta-stats (a view over the manifest). Each declares its required inputs. */
export const DERIVED_GSE_STATS: readonly NflStatDefinition[] = NFL_STAT_MANIFEST.filter((s) => s.derivableByGSE);

/** Look up a stat by key. */
export function statByKey(statKey: string): NflStatDefinition | undefined {
  return NFL_STAT_MANIFEST.find((s) => s.statKey === statKey);
}
