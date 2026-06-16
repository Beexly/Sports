/**
 * CFB / NFL data-source CANDIDATES — owner-review intake (gated).
 *
 * These are evaluation candidates surfaced for College Football / NFL coverage.
 * They are NOT approved. None may be used in public claims, StatKing evidence,
 * Airwave feeds, or any automation until they pass the source-provider + clearance
 * gates and are promoted into `source-rights-registry.ts` with real, verified terms.
 *
 * GATE ENFORCED AT THE TYPE LEVEL: the three approval flags are the literal `false`,
 * so a candidate physically cannot be marked approved here. Promotion = remove from
 * this list and add a verified entry to the main rights registry.
 *
 * SECRETS: `apiKeyEnvVar` is the NAME of an environment variable only. Never store a
 * key value here or anywhere in the repo (CLAUDE.md rule #4). Keys live in env/secrets.
 *
 * NO FABRICATION: free-tier limits / coverage below are transcribed from owner-provided
 * intake. Endpoint schemas, terms, and uncertain homepages must be verified live before
 * any adapter is written (no guessed columns — the no-fake-data rule).
 */

export type CandidateAccessModel =
  | "free_no_key"
  | "free_key"
  | "free_trial"
  | "marketplace_freemium";

export type CandidatePriority = "high" | "medium" | "low" | "evaluation";

export type SportsDataCandidate = {
  readonly id: string;
  readonly name: string;
  readonly homepage: string | null;
  readonly coverage: string;
  readonly accessModel: CandidateAccessModel;
  readonly freeTier: string;
  readonly keyRequired: boolean;
  /** Environment-variable NAME only — never a value. Null when no key is needed. */
  readonly apiKeyEnvVar: string | null;
  readonly priority: CandidatePriority;
  readonly oddsOnly: boolean;

  // ── Gate (type-locked to false) ────────────────────────────────────────────
  readonly automationApproved: false;
  readonly commercialUseApproved: false;
  readonly productionApproved: false;

  /** True if a corresponding entry already exists in source-rights-registry.ts. */
  readonly inMainRegistry: boolean;
  readonly registrySourceId: string | null;

  readonly verificationSteps: readonly string[];
  readonly notes: string;
};

const GATE = {
  automationApproved: false,
  commercialUseApproved: false,
  productionApproved: false,
} as const;

/** Standard verification gate every candidate must clear before promotion. */
const STANDARD_STEPS: readonly string[] = [
  "Obtain the API key and store it ONLY as the named environment variable (never in code).",
  "Read the provider Terms & Conditions; confirm our commercial display + storage use is permitted.",
  "Verify each endpoint's real schema live before building an adapter (no guessed columns).",
  "Record rate limits / freshness and confirm they meet the no-stale-data rule.",
  "On clearance: add a verified entry to source-rights-registry.ts and remove from this candidate list.",
];

export const SPORTS_DATA_CANDIDATES: readonly SportsDataCandidate[] = [
  {
    id: "fpl",
    name: "Fantasy Premier League API",
    homepage: "https://fantasy.premierleague.com/api/bootstrap-static/",
    coverage: "English Premier League FACTS: 20 teams (played/W/D/L/points/position), 380 fixtures (gameweek, scores, results, kickoff), 800+ players' factual season stats (minutes, goals, assists, clean sheets, cards, starts). Schema verified live 2026-06-15. We extract FACTS ONLY — never FPL's proprietary strength/ICT/form/expected-points metrics.",
    accessModel: "free_no_key",
    freeTier: "No key. Public JSON endpoints (bootstrap-static, fixtures). Be polite: cache + low request rate.",
    keyRequired: false,
    apiKeyEnvVar: null,
    priority: "medium",
    oddsOnly: false,
    ...GATE,
    inMainRegistry: false,
    registrySourceId: null,
    verificationSteps: [
      "Read FPL/Premier League terms; confirm commercial display + storage of these facts is permitted (sport facts are generally not copyrightable, but the Terms must be checked).",
      "Confirm we extract FACTS only and never republish FPL's proprietary derived metrics (strength, ICT, form, expected points).",
      "Add a verified entry to source-rights-registry.ts on clearance and remove from this candidate list.",
    ],
    notes: "Free, no-key EPL depth (player-level facts + fixtures) ESPN covers thinly. Adapter built (lib/data-sources/free-adapters/fpl.ts, facts-only, fixture-tested) but GATED: no ingestion/public use until terms are read. EPL is not yet a core Sport type, so this is intentionally not in the free-first source-router.",
  },
  {
    id: "cfbd",
    name: "CollegeFootballData (CFBD)",
    homepage: "https://collegefootballdata.com",
    coverage: "Real college-football data (not just odds): games, teams, box scores, win probability, SP+, trends. Official Python/TypeScript/C# libraries + exporter workflows.",
    accessModel: "free_key",
    freeTier: "Free tier listed at 1,000 API calls/month (paid tiers raise the limit).",
    keyRequired: true,
    apiKeyEnvVar: "CFBD_API_KEY",
    priority: "high",
    oddsOnly: false,
    ...GATE,
    inMainRegistry: true,
    registrySourceId: "collegefootballdata",
    verificationSteps: STANDARD_STEPS,
    notes: "Highest-priority free CFB stats source. Already a vendor_candidate in the rights registry; terms page is JS-rendered and needs a human/legal read before flipping flags. OWNER-APPROVED to start gated work: terms-read checklist (docs/legal/VENDOR_QUESTIONNAIRE_CFBD.md) + adapter scaffold against a verified schema — ingestion stays blocked until terms clear.",
  },
  {
    id: "henrygd-ncaa",
    name: "henrygd NCAA API",
    homepage: "https://github.com/henrygd/ncaa-api",
    coverage: "NCAA.com-derived: scores, stats, rankings, standings, schedules, logos, news, box scores, play-by-play, scoring summaries, team stats.",
    accessModel: "free_no_key",
    freeTier: "No key required. Public demo limited to 5 requests/sec/IP; maintainer recommends self-hosting for reliability.",
    keyRequired: false,
    apiKeyEnvVar: null,
    priority: "medium",
    oddsOnly: false,
    ...GATE,
    inMainRegistry: false,
    registrySourceId: null,
    verificationSteps: STANDARD_STEPS,
    notes: "Useful no-key fallback. Derived from NCAA.com — confirm the redistribution posture of NCAA.com-sourced facts and prefer self-hosting before any reliance. OWNER-APPROVED as the FREE-FIRST primary for NCAA facts (cost-policy tier free_unlimited): exhaust this before spending on any paid source; self-host to drop the public-demo rate cap.",
  },
  {
    id: "balldontlie-ncaaf",
    name: "BALLDONTLIE NCAAF",
    homepage: "https://www.balldontlie.io",
    coverage: "Free: conferences, teams, players, active players, standings. Paid/trial: games, rankings, play-by-play, stats, betting odds.",
    accessModel: "free_key",
    freeTier: "Free account key; true free tier limited to ~5 requests/min on the free endpoints.",
    keyRequired: true,
    apiKeyEnvVar: "BALLDONTLIE_API_KEY",
    priority: "medium",
    oddsOnly: false,
    ...GATE,
    inMainRegistry: false,
    registrySourceId: null,
    verificationSteps: STANDARD_STEPS,
    notes: "Good roster/identity supplement, not a main engine. Owner labeled an inbound key 'balldontlie' but a screenshot showed a StoryStats key — see the storystats candidate; confirm which key maps to which provider.",
  },
  {
    id: "highlightly",
    name: "Highlightly NFL/NCAA API",
    homepage: null,
    coverage: "NCAA FBS + NFL: live scores, game data, standings, player data, team data/logos; odds on higher tiers.",
    accessModel: "free_key",
    freeTier: "Self-serve free key, 100 requests/day, no credit card.",
    keyRequired: true,
    apiKeyEnvVar: "HIGHLIGHTLY_API_KEY",
    priority: "medium",
    oddsOnly: false,
    ...GATE,
    inMainRegistry: false,
    registrySourceId: null,
    verificationSteps: STANDARD_STEPS,
    notes: "Broad live-score/check source. Verify homepage + terms during review.",
  },
  {
    id: "api-sports",
    name: "API-SPORTS NFL & NCAA",
    homepage: "https://api-sports.io",
    coverage: "NFL + NCAA via documented API-key auth.",
    accessModel: "free_key",
    freeTier: "Free API key via dashboard; free plan 100 requests/day.",
    keyRequired: true,
    apiKeyEnvVar: "API_SPORTS_KEY",
    priority: "medium",
    oddsOnly: false,
    ...GATE,
    inMainRegistry: false,
    registrySourceId: null,
    verificationSteps: STANDARD_STEPS,
    notes: "Secondary source — validate CFB depth before relying on it.",
  },
  {
    id: "bigballs",
    name: "Big Balls Sports Data",
    homepage: null,
    coverage: "NFL + NCAAF scores, odds, stats, standings, historical data; NCAAF schedules/records.",
    accessModel: "free_key",
    freeTier: "Self-serve key; free tier claims 1,000 requests/day (2,000 with GitHub), no credit card.",
    keyRequired: true,
    apiKeyEnvVar: "BIGBALLS_API_KEY",
    priority: "medium",
    oddsOnly: false,
    ...GATE,
    inMainRegistry: false,
    registrySourceId: null,
    verificationSteps: STANDARD_STEPS,
    notes: "Promising but unverified — confirm coverage depth and terms before production.",
  },
  {
    id: "the-odds-api-ncaaf",
    name: "The Odds API (NCAAF)",
    homepage: "https://the-odds-api.com",
    coverage: "NCAA football via sport key americanfootball_ncaaf: live/upcoming games, teams, start times, bookmaker odds (moneyline, spreads, totals).",
    accessModel: "free_key",
    freeTier: "Free odds key, 500 credits/month.",
    keyRequired: true,
    apiKeyEnvVar: "THE_ODDS_API_KEY",
    priority: "high",
    oddsOnly: true,
    ...GATE,
    inMainRegistry: true,
    registrySourceId: "the-odds-api",
    verificationSteps: STANDARD_STEPS,
    notes: "Provider already approved_api in the rights registry and wired via THE_ODDS_API_KEY. OWNER-APPROVED: americanfootball_ncaaf is ALREADY active in SUPPORTED_SPORTS (every refresh iterates it), so CFB odds ride the existing license at no new integration cost. Cost caveat: the free tier is 500 credits/mo across all sports — recommend gating refreshes to in-season sports to conserve credits.",
  },
  {
    id: "therundown",
    name: "TheRundown",
    homepage: null,
    coverage: "College Football odds: pre-match odds, schedules/reference data; 3 sportsbooks; 5-minute delay.",
    accessModel: "free_key",
    freeTier: "Free odds key, no credit card, 20,000 data points/day.",
    keyRequired: true,
    apiKeyEnvVar: "THERUNDOWN_API_KEY",
    priority: "medium",
    oddsOnly: true,
    ...GATE,
    inMainRegistry: false,
    registrySourceId: null,
    verificationSteps: STANDARD_STEPS,
    notes: "Good market baseline, not live premium trading (5-min delay).",
  },
  {
    id: "sharpapi-ncaaf",
    name: "SharpAPI NCAAF Odds",
    homepage: null,
    coverage: "NCAAF odds; 2 sportsbooks.",
    accessModel: "free_key",
    freeTier: "Free NCAAF odds key, 12 requests/min, no credit card.",
    keyRequired: true,
    apiKeyEnvVar: "SHARPAPI_KEY",
    priority: "low",
    oddsOnly: true,
    ...GATE,
    inMainRegistry: false,
    registrySourceId: null,
    verificationSteps: STANDARD_STEPS,
    notes: "Useful as a second odds check against The Odds API / TheRundown.",
  },
  {
    id: "sportsgameodds",
    name: "SportsGameOdds",
    homepage: null,
    coverage: "College Football odds: live/upcoming games, player stats, player props, spreads, totals, moneylines; WebSocket on paid tiers.",
    accessModel: "free_trial",
    freeTier: "Free trial / key path; page emphasizes 'Start Free Trial' over 'free forever'.",
    keyRequired: true,
    apiKeyEnvVar: "SPORTSGAMEODDS_API_KEY",
    priority: "evaluation",
    oddsOnly: false,
    ...GATE,
    inMainRegistry: false,
    registrySourceId: null,
    verificationSteps: STANDARD_STEPS,
    notes: "Evaluation only — confirm whether a durable free tier exists before counting on it.",
  },
  {
    id: "sports-game-data",
    name: "Sports Game Data",
    homepage: null,
    coverage: "College Football: live scores, game status, team/player stats, box scores, odds, spreads, moneylines, totals, props, alt lines.",
    accessModel: "free_key",
    freeTier: "Free plan: 2,500 objects/month, 10 requests/min, 10-minute update frequency.",
    keyRequired: true,
    apiKeyEnvVar: "SPORTSGAMEDATA_API_KEY",
    priority: "medium",
    oddsOnly: false,
    ...GATE,
    inMainRegistry: false,
    registrySourceId: null,
    verificationSteps: STANDARD_STEPS,
    notes: "10-minute update frequency — validate against the no-stale-data rule for any live use.",
  },
  {
    id: "sportsdataio-cfb",
    name: "SportsDataIO College Football",
    homepage: "https://sportsdata.io",
    coverage: "D1 FBS scores, stats, odds, projections, news, images, rosters, depth charts, line movement, live scores, in-play odds, fantasy stats, final stats.",
    accessModel: "free_trial",
    freeTier: "Free-trial key; strong commercial feed — do NOT assume free production use.",
    keyRequired: true,
    apiKeyEnvVar: "SPORTSDATAIO_API_KEY",
    priority: "high",
    oddsOnly: false,
    ...GATE,
    inMainRegistry: false,
    registrySourceId: null,
    verificationSteps: STANDARD_STEPS,
    notes: "Use for testing + future licensing analysis. Images are graphics (not extractable as facts). Production use requires a paid license.",
  },
  {
    id: "sportradar-ncaaf-v7",
    name: "Sportradar NCAA Football v7",
    homepage: "https://sportradar.com",
    coverage: "Enterprise NCAA Football v7 feed.",
    accessModel: "free_trial",
    freeTier: "Trial key via Sportradar Marketplace (add trial, copy unique API key).",
    keyRequired: true,
    apiKeyEnvVar: "SPORTRADAR_API_KEY",
    priority: "evaluation",
    oddsOnly: false,
    ...GATE,
    inMainRegistry: false,
    registrySourceId: null,
    verificationSteps: STANDARD_STEPS,
    notes: "Enterprise-grade, likely future-paid. Worth testing for reference architecture; proprietary feed carries independent ToS.",
  },
  {
    id: "rolling-insights",
    name: "Rolling Insights / DataFeeds",
    homepage: null,
    coverage: "NCAA Football data feeds.",
    accessModel: "free_trial",
    freeTier: "30-day free trial key; paid plans begin after trial.",
    keyRequired: true,
    apiKeyEnvVar: "ROLLING_INSIGHTS_API_KEY",
    priority: "evaluation",
    oddsOnly: false,
    ...GATE,
    inMainRegistry: false,
    registrySourceId: null,
    verificationSteps: STANDARD_STEPS,
    notes: "Evaluation only (trial expires).",
  },
  {
    id: "rapidapi-cfb-listings",
    name: "RapidAPI NCAA / College Football listings",
    homepage: "https://rapidapi.com",
    coverage: "Freemium marketplace entries (e.g. 'College Football (CFF)', 'NCAA SPORTS') with Basic/free plans.",
    accessModel: "marketplace_freemium",
    freeTier: "Varies per listing; Basic/free plans shown in search results.",
    keyRequired: true,
    apiKeyEnvVar: "RAPIDAPI_KEY",
    priority: "evaluation",
    oddsOnly: false,
    ...GATE,
    inMainRegistry: false,
    registrySourceId: null,
    verificationSteps: STANDARD_STEPS,
    notes: "Experimental only — marketplace APIs vary heavily in quality, legality, uptime, and freshness. Each listing needs its own rights review.",
  },
  {
    id: "storystats",
    name: "StoryStats API",
    homepage: null,
    coverage: "Multi-sport stats API (per the account dashboard screenshot).",
    accessModel: "free_key",
    freeTier: "Free tier: 10 requests/day across all sports; subscribing to a sport unlocks 120 requests/min.",
    keyRequired: true,
    apiKeyEnvVar: "STORYSTATS_API_KEY",
    priority: "evaluation",
    oddsOnly: false,
    ...GATE,
    inMainRegistry: false,
    registrySourceId: null,
    verificationSteps: STANDARD_STEPS,
    notes: "Owner shared a StoryStats key in chat (dashboard says 'Keep this key secret'). Treat the shared value as compromised: rotate it, then store the new key only as STORYSTATS_API_KEY. Confirm sport coverage + terms before any use.",
  },
];

// ─── Accessors ────────────────────────────────────────────────────────────────

export function getCandidate(id: string): SportsDataCandidate | undefined {
  return SPORTS_DATA_CANDIDATES.find((c) => c.id === id);
}

export function getCandidatesByPriority(priority: CandidatePriority): readonly SportsDataCandidate[] {
  return SPORTS_DATA_CANDIDATES.filter((c) => c.priority === priority);
}

/** Distinct env-var NAMES that must be provisioned (never values). */
export function requiredApiKeyEnvVars(): readonly string[] {
  return Array.from(
    new Set(
      SPORTS_DATA_CANDIDATES.map((c) => c.apiKeyEnvVar).filter((v): v is string => v !== null),
    ),
  ).sort();
}

/**
 * Returns the ids of any candidate that violates the gate (claims automation,
 * commercial, or production approval). MUST be empty — asserted by tests.
 */
export function findUngatedCandidates(): readonly string[] {
  return SPORTS_DATA_CANDIDATES.filter(
    (c) =>
      (c.automationApproved as boolean) ||
      (c.commercialUseApproved as boolean) ||
      (c.productionApproved as boolean),
  ).map((c) => c.id);
}

export function getCandidateSummary() {
  return {
    total: SPORTS_DATA_CANDIDATES.length,
    byPriority: {
      high: getCandidatesByPriority("high").length,
      medium: getCandidatesByPriority("medium").length,
      low: getCandidatesByPriority("low").length,
      evaluation: getCandidatesByPriority("evaluation").length,
    },
    alreadyRegistered: SPORTS_DATA_CANDIDATES.filter((c) => c.inMainRegistry).length,
    needKey: SPORTS_DATA_CANDIDATES.filter((c) => c.keyRequired).length,
    noKey: SPORTS_DATA_CANDIDATES.filter((c) => !c.keyRequired).length,
  };
}
