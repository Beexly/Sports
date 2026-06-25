/**
 * NFL STAT UNIVERSE — Decision-State Stat Matrix.
 *
 * The deepest expression of "data-hungry without being data-chaotic": for EVERY decision state, exactly
 * which facts are required, which strengthen it, the free vs paid source, the legal floor, the strongest
 * card it can be when the primary fact is missing, and which surface goes dark without it — plus a
 * provider-unlock map (which source unlocks which fact). This is the demand-and-supply spec that turns a
 * missing stat into a concrete owner acquisition decision. Pure data; aligns with the clearance engine.
 */

import type { FactType, LegalVerdict } from "@sports/data-intelligence";
import type { MaxPermittedStrength } from "@sports/decision-field-runtime";
import { SOURCES, isForbiddenForProduction } from "./stat-definition.js";

/** The matrix covers the runtime decision states PLUS the market/DFS/fantasy states the product needs. */
export type DecisionStateKey =
  | "ROLE_UP_FANTASY_LATE"
  | "GOOD_IDEA_BAD_PRICE"
  | "PUBLIC_OVERREACTION"
  | "ROLE_MASS_MISALLOCATED"
  | "DATA_CONFLICT"
  | "TOO_LATE"
  | "NEEDS_LIVE_DATA"
  | "TRAP"
  | "WATCHLIST"
  | "ACTIONABLE"
  | "DFS_SALARY_LAG"
  | "OWNERSHIP_OVERREACTION"
  | "PLAYER_PROP_MARKET_LAG"
  | "INJURY_SOURCE_CONFLICT";

export interface DecisionStateContract {
  readonly state: DecisionStateKey;
  readonly requiredFacts: readonly FactType[];
  readonly optionalFacts: readonly FactType[];
  readonly freeSource: string | null;
  readonly paidSource: string | null;
  readonly legalFloor: readonly LegalVerdict[];
  /** The strongest a card may be if a required fact is missing. */
  readonly maxStrengthIfMissing: MaxPermittedStrength;
  readonly blockedSurfaceIfMissing: readonly string[];
  readonly publicLanguageLimits: readonly string[];
}

const FREE: readonly LegalVerdict[] = ["FREE_OPEN", "FREE_CAUTION", "LICENSED"];
const PAID: readonly LegalVerdict[] = ["FREE_OPEN", "FREE_CAUTION", "LICENSED", "PAID_REQUIRED"];

export const DECISION_STATE_MATRIX: Readonly<Record<DecisionStateKey, DecisionStateContract>> = {
  ROLE_UP_FANTASY_LATE: { state: "ROLE_UP_FANTASY_LATE", requiredFacts: ["route_rate", "platform_projection"], optionalFacts: ["target_share", "add_drop_velocity", "player_prop", "injury_report"], freeSource: "nflverse", paidSource: "fantasydata", legalFloor: PAID, maxStrengthIfMissing: "WATCH", blockedSurfaceIfMissing: ["gameplan", "today"], publicLanguageLimits: ["name the role source"] },
  GOOD_IDEA_BAD_PRICE: { state: "GOOD_IDEA_BAD_PRICE", requiredFacts: ["snap_share", "player_prop"], optionalFacts: ["odds_history", "closing_line"], freeSource: "nflverse", paidSource: "the_odds_api", legalFloor: PAID, maxStrengthIfMissing: "WATCH", blockedSurfaceIfMissing: ["edge"], publicLanguageLimits: ["name the price that kills it"] },
  PUBLIC_OVERREACTION: { state: "PUBLIC_OVERREACTION", requiredFacts: ["betting_splits", "snap_share"], optionalFacts: ["player_prop", "roster_pct"], freeSource: "nflverse", paidSource: "the_odds_api", legalFloor: PAID, maxStrengthIfMissing: "WATCH", blockedSurfaceIfMissing: ["edge", "today"], publicLanguageLimits: [] },
  ROLE_MASS_MISALLOCATED: { state: "ROLE_MASS_MISALLOCATED", requiredFacts: ["snap_share", "carry_share"], optionalFacts: ["target_share", "air_yards"], freeSource: "nflverse", paidSource: null, legalFloor: FREE, maxStrengthIfMissing: "INFO_ONLY", blockedSurfaceIfMissing: ["gameplan"], publicLanguageLimits: [] },
  DATA_CONFLICT: { state: "DATA_CONFLICT", requiredFacts: ["injury_report", "practice_status"], optionalFacts: ["snap_share"], freeSource: "nflverse", paidSource: null, legalFloor: FREE, maxStrengthIfMissing: "INFO_ONLY", blockedSurfaceIfMissing: ["today"], publicLanguageLimits: ["surface the disagreement; don't resolve it as fact"] },
  TOO_LATE: { state: "TOO_LATE", requiredFacts: ["closing_line", "odds_history"], optionalFacts: [], freeSource: null, paidSource: "the_odds_api", legalFloor: PAID, maxStrengthIfMissing: "INFO_ONLY", blockedSurfaceIfMissing: ["edge"], publicLanguageLimits: [] },
  NEEDS_LIVE_DATA: { state: "NEEDS_LIVE_DATA", requiredFacts: [], optionalFacts: [], freeSource: null, paidSource: null, legalFloor: FREE, maxStrengthIfMissing: "INFO_ONLY", blockedSurfaceIfMissing: ["today", "edge", "gameplan"], publicLanguageLimits: ["say plainly it needs live data"] },
  TRAP: { state: "TRAP", requiredFacts: ["snap_share"], optionalFacts: ["route_rate"], freeSource: "nflverse", paidSource: null, legalFloor: FREE, maxStrengthIfMissing: "INFO_ONLY", blockedSurfaceIfMissing: ["today"], publicLanguageLimits: [] },
  WATCHLIST: { state: "WATCHLIST", requiredFacts: ["snap_share"], optionalFacts: ["player_prop"], freeSource: "nflverse", paidSource: null, legalFloor: FREE, maxStrengthIfMissing: "WATCH", blockedSurfaceIfMissing: ["today"], publicLanguageLimits: [] },
  ACTIONABLE: { state: "ACTIONABLE", requiredFacts: ["snap_share", "player_prop"], optionalFacts: ["odds_history", "injury_report"], freeSource: "nflverse", paidSource: "the_odds_api", legalFloor: PAID, maxStrengthIfMissing: "WATCH", blockedSurfaceIfMissing: ["today", "edge"], publicLanguageLimits: ["no certainty language"] },
  DFS_SALARY_LAG: { state: "DFS_SALARY_LAG", requiredFacts: ["dfs_salary", "route_rate"], optionalFacts: ["ownership_projection", "dfs_slate"], freeSource: null, paidSource: "fantasydata", legalFloor: ["LICENSED", "PAID_REQUIRED"], maxStrengthIfMissing: "INFO_ONLY", blockedSurfaceIfMissing: ["gameplan_dfs"], publicLanguageLimits: ["requires a licensed salary feed"] },
  OWNERSHIP_OVERREACTION: { state: "OWNERSHIP_OVERREACTION", requiredFacts: ["ownership_projection", "snap_share"], optionalFacts: ["actual_ownership", "dfs_salary"], freeSource: null, paidSource: "fantasydata", legalFloor: ["LICENSED", "PAID_REQUIRED"], maxStrengthIfMissing: "WATCH", blockedSurfaceIfMissing: ["gameplan_dfs"], publicLanguageLimits: [] },
  PLAYER_PROP_MARKET_LAG: { state: "PLAYER_PROP_MARKET_LAG", requiredFacts: ["player_prop", "odds_history", "snap_share"], optionalFacts: ["alt_prop", "target_share"], freeSource: "nflverse", paidSource: "the_odds_api", legalFloor: PAID, maxStrengthIfMissing: "WATCH", blockedSurfaceIfMissing: ["edge"], publicLanguageLimits: ["needs timestamped book snapshots"] },
  INJURY_SOURCE_CONFLICT: { state: "INJURY_SOURCE_CONFLICT", requiredFacts: ["injury_report", "practice_status"], optionalFacts: ["depth_chart", "inactive_status"], freeSource: "nflverse", paidSource: null, legalFloor: FREE, maxStrengthIfMissing: "INFO_ONLY", blockedSurfaceIfMissing: ["today"], publicLanguageLimits: ["surface the disagreement; don't resolve it as fact"] },
};

/** Which facts each provider unlocks for production. A forbidden source unlocks NOTHING. */
export const PROVIDER_UNLOCKS: Readonly<Record<string, readonly FactType[]>> = {
  nflverse: ["play_by_play", "snap_share", "route_rate", "target_share", "carry_share", "air_yards", "red_zone_touch", "injury_report", "practice_status", "depth_chart", "inactive_status"],
  nws: ["weather"],
  sleeper: ["add_drop_velocity", "roster_pct", "start_pct"],
  yahoo_oauth: ["league_settings", "roster_pct"],
  the_odds_api: ["player_prop", "spread", "total", "moneyline", "odds_history", "alt_prop", "closing_line", "betting_splits"],
  sportsgameodds: ["player_prop", "spread", "total", "moneyline", "odds_history", "alt_prop", "closing_line"],
  fantasydata: ["platform_projection", "adp", "roster_pct", "start_pct", "dfs_salary", "dfs_slate", "ownership_projection", "injury_report"],
  sportsdataio: ["platform_projection", "adp", "dfs_salary", "dfs_slate", "ownership_projection"],
  sportradar: ["play_by_play", "snap_share", "route_rate"],
  draftkings_unofficial: [], // forbidden — unlocks nothing for production
  pfr_scrape: [], // rights-review — unlocks nothing for production
};

/** Which production-usable sources can unlock a given fact. */
export function sourcesUnlocking(fact: FactType): string[] {
  return Object.entries(PROVIDER_UNLOCKS)
    .filter(([sourceId, facts]) => facts.includes(fact) && !(SOURCES[sourceId] && isForbiddenForProduction(SOURCES[sourceId]!)))
    .map(([sourceId]) => sourceId);
}

export const ALL_DECISION_STATES: readonly DecisionStateKey[] = Object.keys(DECISION_STATE_MATRIX) as DecisionStateKey[];
