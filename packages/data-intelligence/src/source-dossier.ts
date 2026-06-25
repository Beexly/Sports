/**
 * DATA INTELLIGENCE MESH — Source Dossiers.
 *
 * A typed, honest dossier per candidate source: legal status, rights risk, cost class, coverage,
 * which GSE modules it unlocks, the registry action required, the integration boundary, and a
 * recommendation. Per the non-negotiables: scrapers are RIGHTS_REVIEW or DO_NOT_USE, paid feeds are
 * PAID_EVALUATION / ENTERPRISE_DOSSIER, and nothing is "USE_NOW" without a clear legal lane. These
 * are evaluation records, NOT wired integrations. No keys, no calls.
 */

import type { LegalVerdict } from "./source-genome.js";
import type { Recommendation } from "./acquisition-governor.js";

export type SourceType = "open_data" | "low_cost_api" | "paid_specialist" | "enterprise" | "fantasy_platform" | "weather" | "scraper_candidate";
export type CostClass = "free" | "low" | "mid" | "enterprise";

export interface SourceDossier {
  readonly sourceId: string;
  readonly provider: string;
  readonly sourceType: SourceType;
  readonly legalStatus: LegalVerdict;
  readonly dataRightsRisk: number; // 0..1
  readonly costClass: CostClass;
  readonly coverageClasses: readonly string[];
  readonly gseModulesUnlocked: readonly string[];
  readonly registryAction: string;
  readonly integrationBoundary: string;
  readonly recommendation: Recommendation;
}

export const SOURCE_DOSSIERS: readonly SourceDossier[] = [
  // ── Tier 0 — free / open / high leverage ─────────────────────────────────────────────────────
  { sourceId: "nflverse", provider: "nflverse-data", sourceType: "open_data", legalStatus: "FREE_OPEN", dataRightsRisk: 0.05, costClass: "free", coverageClasses: ["football_reality"], gseModulesUnlocked: ["Role State Vector", "Opportunity Conservation", "Replay Lake"], registryAction: "registered (CC-BY-4.0)", integrationBoundary: "direct Node adapter already exists — expand into replay lake", recommendation: "EXPAND_EXISTING" },
  { sourceId: "nws-weather", provider: "NWS / weather.gov", sourceType: "weather", legalStatus: "FREE_OPEN", dataRightsRisk: 0.02, costClass: "free", coverageClasses: ["attention", "football_reality"], gseModulesUnlocked: ["Information Light Cone", "Narrative Gravity"], registryAction: "cleared (US gov public domain)", integrationBoundary: "wire to game venue/time", recommendation: "USE_NOW" },
  { sourceId: "sleeper", provider: "Sleeper API", sourceType: "fantasy_platform", legalStatus: "FREE_CAUTION", dataRightsRisk: 0.3, costClass: "free", coverageClasses: ["fantasy_market"], gseModulesUnlocked: ["Fantasy Absorption", "Manager DNA", "League Economy"], registryAction: "use-with-caution (free, read-only, no token)", integrationBoundary: "read-only adapter, stay < 1000 calls/min", recommendation: "ADD_ADAPTER" },
  { sourceId: "yahoo-fantasy", provider: "Yahoo Fantasy Sports API", sourceType: "fantasy_platform", legalStatus: "FREE_CAUTION", dataRightsRisk: 0.3, costClass: "free", coverageClasses: ["fantasy_market"], gseModulesUnlocked: ["League Twin", "Manager DNA"], registryAction: "OAuth user-authorization required for private league data", integrationBoundary: "OAuth skeleton, user-consented data only", recommendation: "ADD_ADAPTER" },
  // ── Tier 1 — low-cost APIs ───────────────────────────────────────────────────────────────────
  { sourceId: "the-odds-api", provider: "The Odds API", sourceType: "low_cost_api", legalStatus: "LICENSED", dataRightsRisk: 0.1, costClass: "low", coverageClasses: ["market"], gseModulesUnlocked: ["Book DNA", "Market Twin", "Absorption Half-Life", "Tradability", "CLV"], registryAction: "registered (licensed)", integrationBoundary: "existing exporter — raise quota / add historical + props", recommendation: "USE_NOW" },
  { sourceId: "balldontlie", provider: "BALLDONTLIE", sourceType: "low_cost_api", legalStatus: "PAID_REQUIRED", dataRightsRisk: 0.2, costClass: "low", coverageClasses: ["market", "football_reality"], gseModulesUnlocked: ["multi-sport breadth", "webhooks"], registryAction: "evaluate paid tier", integrationBoundary: "adapter on paid tier; free tier for trial", recommendation: "PAID_EVALUATION" },
  { sourceId: "api-sports", provider: "API-SPORTS / API-Football", sourceType: "low_cost_api", legalStatus: "PAID_REQUIRED", dataRightsRisk: 0.2, costClass: "low", coverageClasses: ["market", "football_reality"], gseModulesUnlocked: ["global sports breadth", "live odds/events"], registryAction: "evaluate paid tier", integrationBoundary: "adapter; free 100 req/day for trial", recommendation: "PAID_EVALUATION" },
  { sourceId: "sportsgameodds", provider: "SportsGameOdds", sourceType: "low_cost_api", legalStatus: "RIGHTS_REVIEW", dataRightsRisk: 0.4, costClass: "low", coverageClasses: ["market"], gseModulesUnlocked: ["odds breadth"], registryAction: "review terms before ingestion", integrationBoundary: "rights review first", recommendation: "RIGHTS_REVIEW" },
  { sourceId: "opticodds", provider: "OpticOdds", sourceType: "low_cost_api", legalStatus: "PAID_REQUIRED", dataRightsRisk: 0.3, costClass: "mid", coverageClasses: ["market"], gseModulesUnlocked: ["dense odds / props"], registryAction: "evaluate paid tier", integrationBoundary: "adapter on paid tier", recommendation: "PAID_EVALUATION" },
  // ── Tier 2 — paid specialist (fantasy/DFS) ───────────────────────────────────────────────────
  { sourceId: "sportsdataio", provider: "SportsDataIO", sourceType: "paid_specialist", legalStatus: "PAID_REQUIRED", dataRightsRisk: 0.2, costClass: "mid", coverageClasses: ["dfs", "fantasy_market", "football_reality", "market"], gseModulesUnlocked: ["DFS Leverage Lab", "Fantasy Absorption", "ID mapping"], registryAction: "registered (paid-required) — evaluate minimum plan", integrationBoundary: "licensed adapter; DFS salary/slate/projections/news", recommendation: "PAID_EVALUATION" },
  { sourceId: "fantasydata", provider: "FantasyData", sourceType: "paid_specialist", legalStatus: "PAID_REQUIRED", dataRightsRisk: 0.2, costClass: "mid", coverageClasses: ["dfs", "fantasy_market"], gseModulesUnlocked: ["DFS salary", "projections", "ADP", "news"], registryAction: "registered (paid-required) — evaluate trial", integrationBoundary: "licensed adapter", recommendation: "PAID_EVALUATION" },
  { sourceId: "rotowire", provider: "RotoWire", sourceType: "paid_specialist", legalStatus: "PAID_REQUIRED", dataRightsRisk: 0.3, costClass: "mid", coverageClasses: ["attention", "fantasy_market"], gseModulesUnlocked: ["news timing", "injury/practice context"], registryAction: "evaluate commercial feed", integrationBoundary: "licensed news feed only", recommendation: "PAID_EVALUATION" },
  { sourceId: "fantasypros", provider: "FantasyPros", sourceType: "paid_specialist", legalStatus: "PAID_REQUIRED", dataRightsRisk: 0.3, costClass: "mid", coverageClasses: ["fantasy_market"], gseModulesUnlocked: ["projections", "ADP", "ranks consensus"], registryAction: "verify commercial license", integrationBoundary: "licensed adapter only", recommendation: "PAID_EVALUATION" },
  // ── Tier 3 — enterprise ──────────────────────────────────────────────────────────────────────
  { sourceId: "sportradar", provider: "Sportradar", sourceType: "enterprise", legalStatus: "PAID_REQUIRED", dataRightsRisk: 0.2, costClass: "enterprise", coverageClasses: ["market", "football_reality"], gseModulesUnlocked: ["enterprise breadth/latency", "official-data posture"], registryAction: "enterprise dossier", integrationBoundary: "enterprise contract; do not buy before a revenue tier needs it", recommendation: "ENTERPRISE_DOSSIER" },
  { sourceId: "stats-perform", provider: "Stats Perform / Opta", sourceType: "enterprise", legalStatus: "PAID_REQUIRED", dataRightsRisk: 0.2, costClass: "enterprise", coverageClasses: ["football_reality", "market"], gseModulesUnlocked: ["advanced metrics", "tracking", "predictions"], registryAction: "enterprise dossier", integrationBoundary: "enterprise contract", recommendation: "ENTERPRISE_DOSSIER" },
  { sourceId: "genius-sports", provider: "Genius Sports", sourceType: "enterprise", legalStatus: "PAID_REQUIRED", dataRightsRisk: 0.3, costClass: "enterprise", coverageClasses: ["market"], gseModulesUnlocked: ["official-data lane", "integrity constraints"], registryAction: "enterprise dossier", integrationBoundary: "official-data licensing", recommendation: "ENTERPRISE_DOSSIER" },
  { sourceId: "pff", provider: "Pro Football Focus", sourceType: "enterprise", legalStatus: "PAID_REQUIRED", dataRightsRisk: 0.3, costClass: "enterprise", coverageClasses: ["football_reality"], gseModulesUnlocked: ["player grading", "charting (route/coverage/pressure)"], registryAction: "custom commercial license only", integrationBoundary: "licensed; no scraping", recommendation: "ENTERPRISE_DOSSIER" },
  // ── Open multi-sport backfill (later) ────────────────────────────────────────────────────────
  { sourceId: "retrosheet", provider: "Retrosheet", sourceType: "open_data", legalStatus: "FREE_OPEN", dataRightsRisk: 0.1, costClass: "free", coverageClasses: ["football_reality"], gseModulesUnlocked: ["MLB replay backfill"], registryAction: "registered (attribution)", integrationBoundary: "backfill lake; later sport", recommendation: "RESEARCH_ONLY" },
  { sourceId: "lahman", provider: "Lahman Baseball DB", sourceType: "open_data", legalStatus: "FREE_OPEN", dataRightsRisk: 0.1, costClass: "free", coverageClasses: ["football_reality"], gseModulesUnlocked: ["MLB historical backfill"], registryAction: "registered (attribution)", integrationBoundary: "backfill lake; later sport", recommendation: "RESEARCH_ONLY" },
  { sourceId: "moneypuck", provider: "MoneyPuck", sourceType: "open_data", legalStatus: "FREE_CAUTION", dataRightsRisk: 0.2, costClass: "free", coverageClasses: ["football_reality"], gseModulesUnlocked: ["NHL backfill"], registryAction: "registered (attribution, caution)", integrationBoundary: "backfill lake; later sport", recommendation: "RESEARCH_ONLY" },
  { sourceId: "openfootball", provider: "OpenFootball", sourceType: "open_data", legalStatus: "FREE_OPEN", dataRightsRisk: 0.1, costClass: "free", coverageClasses: ["football_reality"], gseModulesUnlocked: ["soccer backfill"], registryAction: "registered (open license)", integrationBoundary: "backfill lake; later sport", recommendation: "RESEARCH_ONLY" },
  { sourceId: "nba-api", provider: "NBA.com / nba_api", sourceType: "scraper_candidate", legalStatus: "RIGHTS_REVIEW", dataRightsRisk: 0.6, costClass: "free", coverageClasses: ["football_reality"], gseModulesUnlocked: ["NBA expansion (pending review)"], registryAction: "rights review (NBA.com ToS)", integrationBoundary: "no ingestion until legal review", recommendation: "RIGHTS_REVIEW" },
  { sourceId: "mlb-stats-api", provider: "MLB Stats API", sourceType: "scraper_candidate", legalStatus: "RIGHTS_REVIEW", dataRightsRisk: 0.6, costClass: "free", coverageClasses: ["football_reality"], gseModulesUnlocked: ["MLB live (pending review)"], registryAction: "rights review (license unclear)", integrationBoundary: "no ingestion until legal review", recommendation: "RIGHTS_REVIEW" },
  { sourceId: "nhl-api", provider: "NHL API", sourceType: "scraper_candidate", legalStatus: "RIGHTS_REVIEW", dataRightsRisk: 0.6, costClass: "free", coverageClasses: ["football_reality"], gseModulesUnlocked: ["NHL live (pending review)"], registryAction: "rights review", integrationBoundary: "no ingestion until legal review", recommendation: "RIGHTS_REVIEW" },
  { sourceId: "espn-fantasy", provider: "ESPN Fantasy", sourceType: "fantasy_platform", legalStatus: "RIGHTS_REVIEW", dataRightsRisk: 0.6, costClass: "free", coverageClasses: ["fantasy_market"], gseModulesUnlocked: ["League Twin (pending review)"], registryAction: "user-auth / rights review only", integrationBoundary: "no unofficial ingestion", recommendation: "RIGHTS_REVIEW" },
  { sourceId: "underdog-adp", provider: "Underdog ADP", sourceType: "scraper_candidate", legalStatus: "RIGHTS_REVIEW", dataRightsRisk: 0.6, costClass: "free", coverageClasses: ["fantasy_market"], gseModulesUnlocked: ["best-ball ADP (pending review)"], registryAction: "rights review", integrationBoundary: "no ingestion until legal review", recommendation: "RIGHTS_REVIEW" },
  { sourceId: "draftkings-unofficial", provider: "DraftKings (unofficial)", sourceType: "scraper_candidate", legalStatus: "DO_NOT_USE", dataRightsRisk: 0.95, costClass: "free", coverageClasses: ["market", "dfs"], gseModulesUnlocked: [], registryAction: "forbidden — circumvents access controls", integrationBoundary: "NONE — never wire", recommendation: "DO_NOT_USE" },
];

/** All dossiers carrying a given recommendation. */
export function dossiersByRecommendation(rec: Recommendation): SourceDossier[] {
  return SOURCE_DOSSIERS.filter((d) => d.recommendation === rec);
}

/** Lookup a dossier by source id. */
export function dossier(sourceId: string): SourceDossier | null {
  return SOURCE_DOSSIERS.find((d) => d.sourceId === sourceId) ?? null;
}
