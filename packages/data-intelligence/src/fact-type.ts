/**
 * DATA INTELLIGENCE MESH — Fact taxonomy.
 *
 * GSE organizes source strategy by FACT CLASS, not by vendor. Every provider is an observer of the
 * same universe; what matters is which facts it sees, at what grain, and with what latency. Pure
 * type definitions + a deterministic classifier. No I/O.
 */

export type FactClass = "market" | "football_reality" | "fantasy_market" | "dfs" | "attention" | "identity";

export type FactType =
  // market
  | "moneyline" | "spread" | "total" | "team_total" | "player_prop" | "alt_prop" | "futures"
  | "live_odds" | "odds_history" | "book_update" | "closing_line" | "betting_splits"
  // football reality
  | "play_by_play" | "snap_share" | "route_rate" | "target_share" | "carry_share" | "air_yards"
  | "red_zone_touch" | "goal_line_touch" | "depth_chart" | "inactive_status" | "injury_report"
  | "practice_status" | "weather" | "venue" | "officials" | "schedule_rest"
  // fantasy market
  | "platform_projection" | "analyst_rank" | "adp" | "bestball_adp" | "roster_pct" | "start_pct"
  | "add_drop_velocity" | "waiver_claim" | "faab_bid" | "trade_offer" | "league_settings"
  // dfs
  | "dfs_salary" | "dfs_slate" | "position_eligibility" | "ownership_projection" | "actual_ownership"
  | "late_swap" | "field_duplication" | "contest_payout"
  // attention
  | "beat_report" | "team_news" | "transaction_wire" | "coach_quote" | "weather_alert"
  | "social_trend" | "search_interest"
  // identity
  | "player_id" | "team_id" | "game_id" | "book_id" | "market_id" | "league_id"
  | "fantasy_league_id" | "dfs_slate_id";

export type Grain =
  | "game" | "play" | "player-week" | "player-play" | "team-week"
  | "odds-snapshot" | "prop-ladder" | "fantasy-league-event";

export type LatencyClass = "real-time" | "near-real-time" | "daily" | "weekly" | "historical";

const CLASS_MEMBERS: Record<FactClass, readonly FactType[]> = {
  market: ["moneyline", "spread", "total", "team_total", "player_prop", "alt_prop", "futures", "live_odds", "odds_history", "book_update", "closing_line", "betting_splits"],
  football_reality: ["play_by_play", "snap_share", "route_rate", "target_share", "carry_share", "air_yards", "red_zone_touch", "goal_line_touch", "depth_chart", "inactive_status", "injury_report", "practice_status", "weather", "venue", "officials", "schedule_rest"],
  fantasy_market: ["platform_projection", "analyst_rank", "adp", "bestball_adp", "roster_pct", "start_pct", "add_drop_velocity", "waiver_claim", "faab_bid", "trade_offer", "league_settings"],
  dfs: ["dfs_salary", "dfs_slate", "position_eligibility", "ownership_projection", "actual_ownership", "late_swap", "field_duplication", "contest_payout"],
  attention: ["beat_report", "team_news", "transaction_wire", "coach_quote", "weather_alert", "social_trend", "search_interest"],
  identity: ["player_id", "team_id", "game_id", "book_id", "market_id", "league_id", "fantasy_league_id", "dfs_slate_id"],
};

const FACT_TO_CLASS: ReadonlyMap<FactType, FactClass> = new Map(
  (Object.entries(CLASS_MEMBERS) as Array<[FactClass, readonly FactType[]]>).flatMap(([cls, members]) => members.map((m) => [m, cls] as const)),
);

/** Classify a fact type into its fact class. */
export function factClassOf(t: FactType): FactClass {
  return FACT_TO_CLASS.get(t) ?? "identity";
}

/** All fact types belonging to a class. */
export function factTypesOf(cls: FactClass): readonly FactType[] {
  return CLASS_MEMBERS[cls];
}
