/**
 * NFL STAT UNIVERSE — Stat Category ontology.
 *
 * 28 categories spanning the full surface of knowable NFL reality, from identity to derived
 * intelligence to proof/governance. Each maps onto a data-intelligence FactClass so the stat universe
 * and the mesh share one notion of "what kind of fact is this." Pure type definitions.
 */

import type { FactClass } from "@sports/data-intelligence";

export type StatCategory =
  | "IDENTITY"
  | "SCHEDULE_CONTEXT"
  | "VENUE_WEATHER"
  | "OFFICIATING"
  | "GAME_RESULT"
  | "PLAY_BY_PLAY"
  | "DRIVE"
  | "TEAM_EFFICIENCY"
  | "PLAYER_BOX"
  | "PLAYER_USAGE"
  | "ROLE_STATE"
  | "PASSING_DETAIL"
  | "RUSHING_DETAIL"
  | "RECEIVING_DETAIL"
  | "OFFENSIVE_LINE"
  | "DEFENSIVE_DETAIL"
  | "SPECIAL_TEAMS"
  | "INJURY_AVAILABILITY"
  | "DEPTH_CHART"
  | "TRANSACTION_CONTRACT"
  | "MARKET_ODDS"
  | "PLAYER_PROPS"
  | "ALT_LINES"
  | "FANTASY_MARKET"
  | "DFS_MARKET"
  | "NEWS_ATTENTION"
  | "DERIVED_INTELLIGENCE"
  | "PROOF_GOVERNANCE";

export const ALL_STAT_CATEGORIES: readonly StatCategory[] = [
  "IDENTITY", "SCHEDULE_CONTEXT", "VENUE_WEATHER", "OFFICIATING", "GAME_RESULT", "PLAY_BY_PLAY",
  "DRIVE", "TEAM_EFFICIENCY", "PLAYER_BOX", "PLAYER_USAGE", "ROLE_STATE", "PASSING_DETAIL",
  "RUSHING_DETAIL", "RECEIVING_DETAIL", "OFFENSIVE_LINE", "DEFENSIVE_DETAIL", "SPECIAL_TEAMS",
  "INJURY_AVAILABILITY", "DEPTH_CHART", "TRANSACTION_CONTRACT", "MARKET_ODDS", "PLAYER_PROPS",
  "ALT_LINES", "FANTASY_MARKET", "DFS_MARKET", "NEWS_ATTENTION", "DERIVED_INTELLIGENCE", "PROOF_GOVERNANCE",
];

/** Map a category onto the mesh's fact class. */
export function factClassOfCategory(c: StatCategory): FactClass {
  switch (c) {
    case "IDENTITY":
      return "identity";
    case "MARKET_ODDS":
    case "PLAYER_PROPS":
    case "ALT_LINES":
      return "market";
    case "FANTASY_MARKET":
      return "fantasy_market";
    case "DFS_MARKET":
      return "dfs";
    case "NEWS_ATTENTION":
      return "attention";
    case "DERIVED_INTELLIGENCE":
    case "PROOF_GOVERNANCE":
      return "football_reality"; // derived from facts; treated as reality-grade for class purposes
    default:
      return "football_reality";
  }
}
