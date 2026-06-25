/**
 * NFL STAT UNIVERSE — fact supply graph + per-state acquisition view.
 *
 * This is the SUPPLY side, and it consumes the canonical grammar — there is no second taxonomy here.
 * The decision states and their required facts come from `@sports/decision-field-runtime`
 * (`DecisionState` + `STAT_CONTRACTS`). This module answers one question the evidence contract does not:
 * for each required fact, is there a REAL, rights-cleared way to obtain it, and how far along is it
 * (catalogued → adapter built → shadow → validated → live)?
 *
 * Honesty rules (a provider's marketing must never unlock a fact):
 *   • A fact is only "available" if a verified endpoint or a tested derivation supplies it.
 *   • CATALOGUED ≠ LIVE. Nothing here is LIVE yet — the ingestion pipeline isn't wired.
 *   • `route_rate` is DERIVED and not yet built: base nflverse ships snaps/targets, not route rate;
 *     participation/route data is share-alike-licensed and excluded from ingestion.
 *   • `betting_splits` has NO supplier: The Odds API's catalog does not document a splits endpoint.
 *   • Weekly/historical injury data is distinct from a real-time game-day inactive feed.
 *   • Forbidden sources (DO_NOT_USE / RIGHTS_REVIEW) supply nothing and never appear in the graph.
 *
 * Pure data + pure functions; no network, no keys, no ingestion.
 */

import type { FactType, LegalVerdict, LatencyClass } from "@sports/data-intelligence";
import {
  type DecisionState,
  type MaxPermittedStrength,
  ALL_DECISION_STATES,
  STAT_CONTRACTS,
} from "@sports/decision-field-runtime";
import { SOURCES, isForbiddenForProduction } from "./stat-definition.js";

// ── Fact supply path: per fact, per endpoint capability (the reviewer's FactSupplyPath). ──────────

export type FactSupplyMode = "DIRECT" | "DERIVED";

/** How far a supply path is from actually feeding production. CATALOGUED is the weakest; LIVE the only one that feeds a real card. */
export type SupplyActivation = "CATALOGUED" | "ADAPTER_BUILT" | "INGESTING_SHADOW" | "VALIDATED" | "LIVE";

/** Whether the data is contractually available to us right now. */
export type ContractStatus = "OPEN" | "TRIAL" | "LICENSED_ACTIVE" | "NOT_ACQUIRED";

export const ACTIVATION_ORDER: Readonly<Record<SupplyActivation, number>> = {
  CATALOGUED: 0,
  ADAPTER_BUILT: 1,
  INGESTING_SHADOW: 2,
  VALIDATED: 3,
  LIVE: 4,
};

export interface FactSupplyPath {
  readonly factType: FactType;
  readonly sourceId: string;
  readonly endpointId: string;
  readonly mode: FactSupplyMode;
  readonly activation: SupplyActivation;
  readonly cadence: string;
  readonly historyDepth: string;
  readonly latencyClass: LatencyClass;
  readonly legalStatus: LegalVerdict;
  readonly contractStatus: ContractStatus;
  /** If DERIVED, how it would be computed (and whether that derivation exists yet). */
  readonly derivation?: string;
  /** Evidence that the endpoint/derivation is real (a doc ref, a test, a dossier). */
  readonly evidenceRef?: string;
  readonly note?: string;
}

/**
 * The honest supply graph. Everything is CATALOGUED (nothing wired live yet). Forbidden sources are
 * absent by construction. Marketing claims are not entries here — only verifiable endpoints/derivations.
 */
export const FACT_SUPPLY_GRAPH: readonly FactSupplyPath[] = [
  // ── Football reality — nflverse open data (DIRECT, catalogued, not yet wired). ──
  { factType: "snap_share", sourceId: "nflverse", endpointId: "nflverse:snap_counts", mode: "DIRECT", activation: "CATALOGUED", cadence: "weekly", historyDepth: "since 2012", latencyClass: "weekly", legalStatus: "FREE_OPEN", contractStatus: "OPEN", evidenceRef: "nflverse snap_counts release" },
  { factType: "target_share", sourceId: "nflverse", endpointId: "nflverse:player_stats", mode: "DERIVED", activation: "CATALOGUED", cadence: "weekly", historyDepth: "since 1999", latencyClass: "weekly", legalStatus: "FREE_OPEN", contractStatus: "OPEN", derivation: "targets / team_pass_attempts (computed from weekly player stats)" },
  { factType: "carry_share", sourceId: "nflverse", endpointId: "nflverse:player_stats", mode: "DERIVED", activation: "CATALOGUED", cadence: "weekly", historyDepth: "since 1999", latencyClass: "weekly", legalStatus: "FREE_OPEN", contractStatus: "OPEN", derivation: "carries / team_rush_attempts" },
  { factType: "air_yards", sourceId: "nflverse", endpointId: "nflverse:player_stats", mode: "DIRECT", activation: "CATALOGUED", cadence: "weekly", historyDepth: "since 2006", latencyClass: "weekly", legalStatus: "FREE_OPEN", contractStatus: "OPEN" },
  { factType: "red_zone_touch", sourceId: "nflverse", endpointId: "nflverse:pbp", mode: "DERIVED", activation: "CATALOGUED", cadence: "weekly", historyDepth: "since 1999", latencyClass: "weekly", legalStatus: "FREE_OPEN", contractStatus: "OPEN", derivation: "filter pbp to yardline_100 <= 20, count touches" },
  // route_rate is the honesty case: NOT in base nflverse, derivation not built, source is license-excluded.
  { factType: "route_rate", sourceId: "nflverse", endpointId: "nflverse:participation", mode: "DERIVED", activation: "CATALOGUED", cadence: "weekly", historyDepth: "n/a (not ingested)", latencyClass: "weekly", legalStatus: "FREE_CAUTION", contractStatus: "NOT_ACQUIRED", derivation: "routes_run / team_dropbacks from participation/NGS — NOT in base nflverse and NOT yet built", note: "Participation/route data is share-alike-licensed and excluded from ingestion; do NOT treat route_rate as available until the derivation is built and rights-cleared." },
  // Injury — weekly/historical, explicitly NOT a real-time game-day feed.
  { factType: "injury_report", sourceId: "nflverse", endpointId: "nflverse:injuries", mode: "DIRECT", activation: "CATALOGUED", cadence: "weekly", historyDepth: "since 2009", latencyClass: "weekly", legalStatus: "FREE_OPEN", contractStatus: "OPEN", note: "Weekly practice-report status — historical/weekly, not a real-time game-day inactive feed." },
  { factType: "practice_status", sourceId: "nflverse", endpointId: "nflverse:injuries", mode: "DIRECT", activation: "CATALOGUED", cadence: "weekly", historyDepth: "since 2009", latencyClass: "weekly", legalStatus: "FREE_OPEN", contractStatus: "OPEN" },
  { factType: "depth_chart", sourceId: "nflverse", endpointId: "nflverse:depth_charts", mode: "DIRECT", activation: "CATALOGUED", cadence: "weekly", historyDepth: "since 2001", latencyClass: "weekly", legalStatus: "FREE_OPEN", contractStatus: "OPEN" },
  // Real-time game-day inactives are a DIFFERENT fact than the weekly report — no free real-time feed.
  { factType: "inactive_status", sourceId: "nflverse", endpointId: "nflverse:rosters", mode: "DIRECT", activation: "CATALOGUED", cadence: "weekly", historyDepth: "since 2002", latencyClass: "weekly", legalStatus: "FREE_OPEN", contractStatus: "OPEN", note: "Weekly roster file — NOT a ~90-minutes-before-kickoff real-time inactive feed; that requires a real-time source." },
  { factType: "weather", sourceId: "nws", endpointId: "nws:forecast", mode: "DIRECT", activation: "CATALOGUED", cadence: "hourly", historyDepth: "forecast", latencyClass: "near-real-time", legalStatus: "FREE_OPEN", contractStatus: "OPEN" },

  // ── Fantasy crowd — Sleeper / Yahoo (free, consented). ──
  { factType: "add_drop_velocity", sourceId: "sleeper", endpointId: "sleeper:trending", mode: "DIRECT", activation: "CATALOGUED", cadence: "intraday", historyDepth: "rolling", latencyClass: "near-real-time", legalStatus: "FREE_CAUTION", contractStatus: "OPEN" },
  { factType: "roster_pct", sourceId: "sleeper", endpointId: "sleeper:players", mode: "DERIVED", activation: "CATALOGUED", cadence: "daily", historyDepth: "current", latencyClass: "daily", legalStatus: "FREE_CAUTION", contractStatus: "OPEN" },
  { factType: "start_pct", sourceId: "sleeper", endpointId: "sleeper:players", mode: "DERIVED", activation: "CATALOGUED", cadence: "daily", historyDepth: "current", latencyClass: "daily", legalStatus: "FREE_CAUTION", contractStatus: "OPEN" },
  { factType: "roster_pct", sourceId: "yahoo_oauth", endpointId: "yahoo:league/rosters", mode: "DIRECT", activation: "CATALOGUED", cadence: "daily", historyDepth: "current", latencyClass: "daily", legalStatus: "FREE_CAUTION", contractStatus: "NOT_ACQUIRED", note: "Per-user data — requires that user's OAuth consent." },

  // ── Market — licensed feeds, key NOT acquired (NOT_ACQUIRED, not live). ──
  { factType: "player_prop", sourceId: "the_odds_api", endpointId: "oddsapi:event-odds/player_props", mode: "DIRECT", activation: "CATALOGUED", cadence: "intraday", historyDepth: "current", latencyClass: "near-real-time", legalStatus: "LICENSED", contractStatus: "NOT_ACQUIRED", evidenceRef: "The Odds API player-props market list" },
  { factType: "spread", sourceId: "the_odds_api", endpointId: "oddsapi:odds/spreads", mode: "DIRECT", activation: "CATALOGUED", cadence: "intraday", historyDepth: "current", latencyClass: "near-real-time", legalStatus: "LICENSED", contractStatus: "NOT_ACQUIRED" },
  { factType: "total", sourceId: "the_odds_api", endpointId: "oddsapi:odds/totals", mode: "DIRECT", activation: "CATALOGUED", cadence: "intraday", historyDepth: "current", latencyClass: "near-real-time", legalStatus: "LICENSED", contractStatus: "NOT_ACQUIRED" },
  { factType: "moneyline", sourceId: "the_odds_api", endpointId: "oddsapi:odds/h2h", mode: "DIRECT", activation: "CATALOGUED", cadence: "intraday", historyDepth: "current", latencyClass: "near-real-time", legalStatus: "LICENSED", contractStatus: "NOT_ACQUIRED" },
  { factType: "alt_prop", sourceId: "the_odds_api", endpointId: "oddsapi:event-odds/alternate", mode: "DIRECT", activation: "CATALOGUED", cadence: "intraday", historyDepth: "current", latencyClass: "near-real-time", legalStatus: "LICENSED", contractStatus: "NOT_ACQUIRED" },
  { factType: "odds_history", sourceId: "the_odds_api", endpointId: "oddsapi:historical", mode: "DIRECT", activation: "CATALOGUED", cadence: "snapshot", historyDepth: "since 2020 (paid tier)", latencyClass: "historical", legalStatus: "LICENSED", contractStatus: "NOT_ACQUIRED", evidenceRef: "The Odds API historical endpoint (paid tier)" },
  { factType: "closing_line", sourceId: "the_odds_api", endpointId: "oddsapi:historical", mode: "DERIVED", activation: "CATALOGUED", cadence: "snapshot", historyDepth: "since 2020", latencyClass: "historical", legalStatus: "LICENSED", contractStatus: "NOT_ACQUIRED", derivation: "last pre-kickoff snapshot from odds_history" },
  // Second market observer (book-lag triangulation).
  { factType: "player_prop", sourceId: "sportsgameodds", endpointId: "sgo:odds/player_props", mode: "DIRECT", activation: "CATALOGUED", cadence: "intraday", historyDepth: "current", latencyClass: "near-real-time", legalStatus: "LICENSED", contractStatus: "NOT_ACQUIRED" },
  { factType: "odds_history", sourceId: "sportsgameodds", endpointId: "sgo:odds/history", mode: "DIRECT", activation: "CATALOGUED", cadence: "snapshot", historyDepth: "current-season", latencyClass: "historical", legalStatus: "LICENSED", contractStatus: "NOT_ACQUIRED" },
  // NOTE: betting_splits has NO supply path — The Odds API's catalog does not document a public-splits
  // endpoint. Until a verified endpoint/contract exists, no source unlocks betting_splits.

  // ── Fantasy projections / DFS — paid, not acquired. ──
  { factType: "platform_projection", sourceId: "fantasydata", endpointId: "fantasydata:projections", mode: "DIRECT", activation: "CATALOGUED", cadence: "daily", historyDepth: "current", latencyClass: "daily", legalStatus: "PAID_REQUIRED", contractStatus: "NOT_ACQUIRED" },
  { factType: "adp", sourceId: "fantasydata", endpointId: "fantasydata:adp", mode: "DIRECT", activation: "CATALOGUED", cadence: "daily", historyDepth: "current", latencyClass: "daily", legalStatus: "PAID_REQUIRED", contractStatus: "NOT_ACQUIRED" },
  { factType: "dfs_salary", sourceId: "fantasydata", endpointId: "fantasydata:dfs/slates", mode: "DIRECT", activation: "CATALOGUED", cadence: "daily", historyDepth: "current", latencyClass: "daily", legalStatus: "PAID_REQUIRED", contractStatus: "NOT_ACQUIRED", evidenceRef: "FantasyData DFS slates endpoint" },
  { factType: "dfs_slate", sourceId: "fantasydata", endpointId: "fantasydata:dfs/slates", mode: "DIRECT", activation: "CATALOGUED", cadence: "daily", historyDepth: "current", latencyClass: "daily", legalStatus: "PAID_REQUIRED", contractStatus: "NOT_ACQUIRED" },
  { factType: "ownership_projection", sourceId: "fantasydata", endpointId: "fantasydata:dfs/ownership", mode: "DIRECT", activation: "CATALOGUED", cadence: "daily", historyDepth: "current", latencyClass: "daily", legalStatus: "PAID_REQUIRED", contractStatus: "NOT_ACQUIRED" },
  { factType: "platform_projection", sourceId: "sportsdataio", endpointId: "sportsdataio:projections", mode: "DIRECT", activation: "CATALOGUED", cadence: "daily", historyDepth: "current", latencyClass: "daily", legalStatus: "PAID_REQUIRED", contractStatus: "NOT_ACQUIRED" },
  { factType: "dfs_salary", sourceId: "sportsdataio", endpointId: "sportsdataio:dfs", mode: "DIRECT", activation: "CATALOGUED", cadence: "daily", historyDepth: "current", latencyClass: "daily", legalStatus: "PAID_REQUIRED", contractStatus: "NOT_ACQUIRED" },
  { factType: "ownership_projection", sourceId: "sportsdataio", endpointId: "sportsdataio:dfs", mode: "DIRECT", activation: "CATALOGUED", cadence: "daily", historyDepth: "current", latencyClass: "daily", legalStatus: "PAID_REQUIRED", contractStatus: "NOT_ACQUIRED" },
];

// ── Supply queries (used by the per-state acquisition view). ──────────────────────────────────────

/** A supply path is usable for production only if its source is not forbidden (DO_NOT_USE / RIGHTS_REVIEW). */
function pathIsProductionUsable(p: FactSupplyPath): boolean {
  const src = SOURCES[p.sourceId];
  return !!src && !isForbiddenForProduction(src);
}

/** Every production-usable supply path for a fact (forbidden sources are excluded). */
export function supplyPathsFor(fact: FactType): FactSupplyPath[] {
  return FACT_SUPPLY_GRAPH.filter((p) => p.factType === fact && pathIsProductionUsable(p));
}

/** Distinct production-usable sources that can supply a fact. */
export function sourcesSupplying(fact: FactType): string[] {
  return [...new Set(supplyPathsFor(fact).map((p) => p.sourceId))];
}

/** The strongest activation any production path has reached for a fact (or null if none). */
export function bestActivation(fact: FactType): SupplyActivation | null {
  const paths = supplyPathsFor(fact);
  if (paths.length === 0) return null;
  return paths.reduce<SupplyActivation>(
    (best, p) => (ACTIVATION_ORDER[p.activation] > ACTIVATION_ORDER[best] ? p.activation : best),
    "CATALOGUED",
  );
}

/** Is a fact actually LIVE (a wired, validated, production feed)? Honest default today: false for all. */
export function isFactLive(fact: FactType): boolean {
  return supplyPathsFor(fact).some((p) => p.activation === "LIVE");
}

// ── Per-state acquisition view: ask the supply graph about the CANONICAL contract's required facts. ──

export interface RequiredGroupSupply {
  readonly label: string;
  readonly anyOf: readonly FactType[];
  /** At least one fact in the group has a production-usable supplier (any activation). */
  readonly catalogued: boolean;
  /** At least one fact in the group is LIVE. */
  readonly live: boolean;
  readonly bestActivation: SupplyActivation | null;
  readonly suppliers: readonly string[];
}

export interface StateAcquisitionView {
  readonly decisionState: DecisionState;
  readonly requiredGroups: readonly RequiredGroupSupply[];
  /** Every required group has at least a catalogued, non-forbidden supplier. */
  readonly catalogueReady: boolean;
  /** Every required group has a LIVE supplier (today: false — nothing is wired live). */
  readonly liveReady: boolean;
  /** The strongest a card may be if its required groups are NOT all satisfiable from supply. */
  readonly maxStrengthIfUnsupplied: MaxPermittedStrength;
  readonly note: string;
}

/** Build the acquisition view for a state by asking the supply graph about its CANONICAL required facts. */
export function acquisitionViewFor(state: DecisionState): StateAcquisitionView {
  const contract = STAT_CONTRACTS[state];
  const requiredGroups: RequiredGroupSupply[] = contract.requiredGroups.map((g) => {
    const suppliers = [...new Set(g.anyOf.flatMap((f) => sourcesSupplying(f)))];
    const acts = g.anyOf.map((f) => bestActivation(f)).filter((a): a is SupplyActivation => a !== null);
    const best = acts.length > 0 ? acts.reduce((b, a) => (ACTIVATION_ORDER[a] > ACTIVATION_ORDER[b] ? a : b)) : null;
    return {
      label: g.label,
      anyOf: g.anyOf,
      catalogued: suppliers.length > 0,
      live: g.anyOf.some((f) => isFactLive(f)),
      bestActivation: best,
      suppliers,
    };
  });
  const catalogueReady = requiredGroups.every((g) => g.catalogued);
  const liveReady = requiredGroups.every((g) => g.live);
  // The weakest required group's cap is the ceiling when supply is missing.
  const maxStrengthIfUnsupplied = contract.requiredGroups.reduce<MaxPermittedStrength>(
    (acc, g) => (acc === "INFO_ONLY" ? acc : g.capIfMissing),
    "PUBLIC_ACTION",
  );
  return {
    decisionState: state,
    requiredGroups,
    catalogueReady,
    liveReady,
    maxStrengthIfUnsupplied,
    note: liveReady
      ? "Every required fact has a live supplier."
      : catalogueReady
        ? "Every required fact is catalogued, but none is wired live yet — cards stay capped until a path reaches LIVE."
        : "At least one required fact has no production-usable supplier — acquisition needed.",
  };
}

/** The acquisition view for every canonical decision state (keyed by the single source of truth). */
export const DECISION_STATE_ACQUISITION: Readonly<Record<DecisionState, StateAcquisitionView>> = Object.fromEntries(
  ALL_DECISION_STATES.map((s) => [s, acquisitionViewFor(s)]),
) as Record<DecisionState, StateAcquisitionView>;
