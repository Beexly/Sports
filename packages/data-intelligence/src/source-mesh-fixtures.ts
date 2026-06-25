/**
 * DATA INTELLIGENCE MESH — Deterministic fixtures.
 *
 * Hand-built source genomes, endpoint genomes, entity mappings, and temporal facts for tests and
 * docs. Fixture-only: no keys, no network, no live data. Numbers are reasonable priors for
 * illustration, not measured values.
 */

import type { SourceGenome } from "./source-genome.js";
import type { EndpointGenome } from "./endpoint-genome.js";
import type { ExternalEntityMapping } from "./entity-spine.js";
import type { TemporalFact } from "./temporal-fact.js";

export const GENOME_NFLVERSE: SourceGenome = {
  sourceId: "nflverse", provider: "nflverse-data", legalVerdict: "FREE_OPEN", attributionRequired: true, rightsRisk: 0.05,
  sportCoverage: ["nfl"], marketCoverage: [], fantasyCoverage: [], dfsCoverage: [], historyDepth: "decade_plus",
  updateLatencyMs: null, snapshotCadence: "bulk_release", endpointReliability: 0.9, schemaStability: 0.85, entityKeyQuality: 0.85, timestampQuality: 0.7,
  costPerMonth: 0, costPerUsefulFact: 0.02, uniqueFacts: ["snap_share", "route_rate", "ngs"], duplicateFacts: ["schedule"],
  knownBlindSpots: ["live timing", "props"], knownBiases: [], decisionLeverage: 0.7, proofValue: 0.8, calibrationValue: 0.8, productValue: 0.6,
};

export const GENOME_ODDS_API: SourceGenome = {
  sourceId: "the-odds-api", provider: "The Odds API", legalVerdict: "LICENSED", attributionRequired: false, rightsRisk: 0.1,
  sportCoverage: ["multi"], marketCoverage: ["moneyline", "spread", "total", "props", "alt_lines", "live", "history"], fantasyCoverage: [], dfsCoverage: [], historyDepth: "multi_season",
  updateLatencyMs: 60_000, snapshotCadence: "intraday", endpointReliability: 0.9, schemaStability: 0.9, entityKeyQuality: 0.8, timestampQuality: 0.85,
  costPerMonth: 119, costPerUsefulFact: 0.05, uniqueFacts: ["odds_history", "player_prop", "book_update"], duplicateFacts: ["scores"],
  knownBlindSpots: ["per-book limits"], knownBiases: [], decisionLeverage: 0.85, proofValue: 0.7, calibrationValue: 0.8, productValue: 0.7,
};

export const GENOME_SPORTSDATAIO: SourceGenome = {
  sourceId: "sportsdataio", provider: "SportsDataIO", legalVerdict: "PAID_REQUIRED", attributionRequired: false, rightsRisk: 0.2,
  sportCoverage: ["nfl", "nba", "mlb", "nhl"], marketCoverage: ["moneyline", "spread", "total"], fantasyCoverage: ["projections", "ranks", "news"], dfsCoverage: ["salary", "slate"], historyDepth: "multi_season",
  updateLatencyMs: 300_000, snapshotCadence: "intraday", endpointReliability: 0.88, schemaStability: 0.85, entityKeyQuality: 0.9, timestampQuality: 0.8,
  costPerMonth: 500, costPerUsefulFact: 0.1, uniqueFacts: ["dfs_salary", "dfs_slate", "player_news"], duplicateFacts: ["scores"],
  knownBlindSpots: ["ownership"], knownBiases: [], decisionLeverage: 0.7, proofValue: 0.6, calibrationValue: 0.6, productValue: 0.8,
};

export const GENOME_SLEEPER: SourceGenome = {
  sourceId: "sleeper", provider: "Sleeper API", legalVerdict: "FREE_CAUTION", attributionRequired: false, rightsRisk: 0.3,
  sportCoverage: ["nfl"], marketCoverage: [], fantasyCoverage: ["roster_pct", "league_sync"], dfsCoverage: [], historyDepth: "season",
  updateLatencyMs: 600_000, snapshotCadence: "intraday", endpointReliability: 0.8, schemaStability: 0.8, entityKeyQuality: 0.75, timestampQuality: 0.7,
  costPerMonth: 0, costPerUsefulFact: 0.05, uniqueFacts: ["add_drop_velocity", "league_transactions"], duplicateFacts: ["rosters"],
  knownBlindSpots: ["projections", "salary"], knownBiases: ["platform population"], decisionLeverage: 0.6, proofValue: 0.5, calibrationValue: 0.5, productValue: 0.7,
};

/** Broad coverage, low decision leverage — "sports trivia" that looks big but changes few decisions. */
export const GENOME_TRIVIA: SourceGenome = {
  sourceId: "broad-trivia", provider: "Broad Sports Trivia API", legalVerdict: "FREE_OPEN", attributionRequired: false, rightsRisk: 0.1,
  sportCoverage: ["multi"], marketCoverage: ["futures"], fantasyCoverage: [], dfsCoverage: [], historyDepth: "season",
  updateLatencyMs: 86_400_000, snapshotCadence: "daily", endpointReliability: 0.7, schemaStability: 0.7, entityKeyQuality: 0.6, timestampQuality: 0.5,
  costPerMonth: 0, costPerUsefulFact: 0.4, uniqueFacts: [], duplicateFacts: ["scores", "standings", "futures"],
  knownBlindSpots: ["everything decision-relevant"], knownBiases: [], decisionLeverage: 0.15, proofValue: 0.2, calibrationValue: 0.2, productValue: 0.2,
};

export const GENOME_FORBIDDEN: SourceGenome = {
  sourceId: "draftkings-unofficial", provider: "DraftKings (unofficial scrape)", legalVerdict: "DO_NOT_USE", attributionRequired: false, rightsRisk: 0.95,
  sportCoverage: ["multi"], marketCoverage: ["live", "props"], fantasyCoverage: [], dfsCoverage: ["salary", "ownership"], historyDepth: "none",
  updateLatencyMs: 1000, snapshotCadence: "real_time", endpointReliability: 0.6, schemaStability: 0.4, entityKeyQuality: 0.5, timestampQuality: 0.6,
  costPerMonth: 0, costPerUsefulFact: 0.0, uniqueFacts: ["live_ownership"], duplicateFacts: [],
  knownBlindSpots: [], knownBiases: [], decisionLeverage: 0.9, proofValue: 0.1, calibrationValue: 0.1, productValue: 0.1, // high apparent leverage — irrelevant, it's forbidden
};

export const GENOME_ENTERPRISE: SourceGenome = {
  sourceId: "sportradar", provider: "Sportradar", legalVerdict: "PAID_REQUIRED", attributionRequired: true, rightsRisk: 0.2,
  sportCoverage: ["multi"], marketCoverage: ["moneyline", "spread", "total", "live"], fantasyCoverage: [], dfsCoverage: [], historyDepth: "decade_plus",
  updateLatencyMs: 5000, snapshotCadence: "real_time", endpointReliability: 0.95, schemaStability: 0.9, entityKeyQuality: 0.95, timestampQuality: 0.9,
  costPerMonth: 8000, costPerUsefulFact: 0.3, uniqueFacts: ["official_feed"], duplicateFacts: ["scores", "odds"],
  knownBlindSpots: [], knownBiases: [], decisionLeverage: 0.5, proofValue: 0.6, calibrationValue: 0.5, productValue: 0.6,
};

// ── Endpoints ────────────────────────────────────────────────────────────────────────────────
export const ENDPOINTS_ODDS_API: readonly EndpointGenome[] = [
  { endpointId: "odds-api:historical", sourceId: "the-odds-api", factTypes: ["odds_history", "player_prop", "alt_prop", "book_update", "closing_line"], grain: "prop-ladder", updateFrequency: "on-demand", latencyClass: "historical", pointInTimeSafe: true, entityResolutionDifficulty: 0.3, freshnessSlaMinutes: null, historicalReplayValue: 0.9, liveDecisionValue: 0.3, costWeight: 0.4, ingestionMode: "LIVE_API" },
  { endpointId: "odds-api:live", sourceId: "the-odds-api", factTypes: ["live_odds", "moneyline", "spread", "total"], grain: "odds-snapshot", updateFrequency: "1-15min", latencyClass: "near-real-time", pointInTimeSafe: true, entityResolutionDifficulty: 0.3, freshnessSlaMinutes: 15, historicalReplayValue: 0.4, liveDecisionValue: 0.8, costWeight: 0.5, ingestionMode: "LIVE_API" },
];

export const ENDPOINTS_SPORTSDATAIO: readonly EndpointGenome[] = [
  { endpointId: "sdio:dfs", sourceId: "sportsdataio", factTypes: ["dfs_salary", "dfs_slate", "position_eligibility"], grain: "fantasy-league-event", updateFrequency: "daily", latencyClass: "daily", pointInTimeSafe: true, entityResolutionDifficulty: 0.2, freshnessSlaMinutes: 120, historicalReplayValue: 0.7, liveDecisionValue: 0.7, costWeight: 0.5, ingestionMode: "LIVE_API" },
  { endpointId: "sdio:projections", sourceId: "sportsdataio", factTypes: ["platform_projection", "analyst_rank", "injury_report"], grain: "player-week", updateFrequency: "daily", latencyClass: "daily", pointInTimeSafe: true, entityResolutionDifficulty: 0.2, freshnessSlaMinutes: 120, historicalReplayValue: 0.6, liveDecisionValue: 0.6, costWeight: 0.5, ingestionMode: "LIVE_API" },
];

export const ENDPOINTS_NFLVERSE: readonly EndpointGenome[] = [
  { endpointId: "nflverse:weekly", sourceId: "nflverse", factTypes: ["snap_share", "route_rate", "target_share", "carry_share", "air_yards", "red_zone_touch", "play_by_play"], grain: "player-week", updateFrequency: "weekly", latencyClass: "weekly", pointInTimeSafe: true, entityResolutionDifficulty: 0.2, freshnessSlaMinutes: null, historicalReplayValue: 0.95, liveDecisionValue: 0.3, costWeight: 0.1, ingestionMode: "BULK_RELEASE" },
];

export const ENDPOINTS_TRIVIA: readonly EndpointGenome[] = [
  { endpointId: "trivia:daily", sourceId: "broad-trivia", factTypes: ["futures", "search_interest"], grain: "game", updateFrequency: "daily", latencyClass: "daily", pointInTimeSafe: false, entityResolutionDifficulty: 0.6, freshnessSlaMinutes: 1440, historicalReplayValue: 0.2, liveDecisionValue: 0.1, costWeight: 0.1, ingestionMode: "LIVE_API" },
];

// ── Entity mappings (one clean, one collision) ─────────────────────────────────────────────────
export const MAPPINGS_FIXTURE: readonly ExternalEntityMapping[] = [
  { gseId: "player:ceedee_lamb", provider: "nflverse", providerEntityId: "00-0036322", providerEntityName: "CeeDee Lamb", sport: "nfl", confidence: 0.98, firstSeenAt: "2024-09-01T00:00:00Z", lastConfirmedAt: "2026-01-01T00:00:00Z", collisionRisk: 0.05 },
  { gseId: "player:ceedee_lamb", provider: "sportsdataio", providerEntityId: "18877", providerEntityName: "CeeDee Lamb", sport: "nfl", confidence: 0.95, firstSeenAt: "2024-09-01T00:00:00Z", lastConfirmedAt: "2026-01-01T00:00:00Z", collisionRisk: 0.05 },
  // a collision: one provider id mapped to two canonical entities (e.g. a Jr./Sr. ambiguity)
  { gseId: "player:michael_pittman", provider: "trivia", providerEntityId: "MP-1", providerEntityName: "Michael Pittman", sport: "nfl", confidence: 0.6, firstSeenAt: "2025-09-01T00:00:00Z", lastConfirmedAt: "2025-09-01T00:00:00Z", collisionRisk: 0.7 },
  { gseId: "player:michael_pittman_sr", provider: "trivia", providerEntityId: "MP-1", providerEntityName: "Michael Pittman", sport: "nfl", confidence: 0.55, firstSeenAt: "2025-09-01T00:00:00Z", lastConfirmedAt: "2025-09-01T00:00:00Z", collisionRisk: 0.7 },
];

// ── Temporal facts (one knowable pre-decision, one future-leaked) ──────────────────────────────
export const FACTS_FIXTURE: readonly TemporalFact[] = [
  { factId: "f-snap-1", entityIds: [{ id: "player:ceedee_lamb", kind: "player" }], factType: "snap_share", value: 0.92, sourceId: "nflverse", endpointId: "nflverse:weekly", observedAt: "2026-01-04T20:00:00Z", fetchedAt: "2026-01-06T08:00:00Z", firstSeenByGseAt: "2026-01-06T08:00:00Z", sourcePayloadHash: "abc123", confidence: 0.95, rightsStatus: "FREE_OPEN", attribution: "nflverse (CC-BY-4.0)" },
  { factId: "f-inactive-leak", entityIds: [{ id: "player:ceedee_lamb", kind: "player" }], factType: "inactive_status", value: "active", sourceId: "sportsdataio", endpointId: "sdio:projections", observedAt: "2026-01-04T17:30:00Z", fetchedAt: "2026-01-04T17:30:00Z", firstSeenByGseAt: "2026-01-04T17:30:00Z", sourcePayloadHash: "def456", confidence: 0.9, rightsStatus: "PAID_REQUIRED" },
];
