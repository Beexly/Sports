/**
 * Legal source registry — the governance layer for all data ingestion.
 *
 * Every external data source GSE ingests must be declared here with its real
 * license / Terms-of-Service, commercial-use status, attribution requirement,
 * and a legal verdict. Ingestion code calls `assertIngestible(id)` before it
 * fetches, so a source whose terms forbid commercial/automated use (ESPN hidden
 * API, Pro-Football-Reference scraping, unlicensed model outputs) physically
 * cannot be wired into the product — the guard throws.
 *
 * Doctrine (encoded as data below, enforced by the guards):
 *  1. Prefer open-licensed aggregators (nflverse, CC-BY-4.0) over scraping.
 *  2. Read the actual LICENSE/ToS, not the marketing page. "Free API" != "free
 *     for commercial use" and != "you own the underlying league-data rights."
 *  3. Respect robots.txt / anti-automation clauses. Accessible != permitted.
 *  4. Attribute every source whose license requires it; carry the credit line.
 *  5. Cache politely, rate-limit ourselves, never re-expose a licensed feed.
 *  6. No fabricated data — every displayed datapoint traces to a real source row.
 */

export type LegalVerdict =
  | "cleared" // open license, commercial use granted outright
  | "cleared-with-attribution" // commercial use granted, credit required
  | "licensed" // we hold a commercial license/subscription for this feed
  | "use-with-caution" // permissive/public but no written commercial grant; low risk
  | "paid-required" // commercial use needs a paid plan we do not yet hold (founder-gated)
  | "forbidden"; // ToS/robots forbid commercial or automated use — never ingest

export interface SourceLicense {
  /** SPDX id when the data carries a real open license; null for ToS-only/proprietary. */
  readonly spdx: string | null;
  readonly name: string;
  readonly url: string;
}

export interface LegalSource {
  readonly id: string;
  readonly provider: string;
  readonly kind: "bulk-open-data" | "public-api" | "licensed-api" | "scrape";
  readonly license: SourceLicense;
  readonly commercialUse: boolean;
  readonly attributionRequired: boolean;
  /** Exact credit line to render where this source's data appears. */
  readonly attributionText: string | null;
  readonly robotsRespected: boolean;
  readonly rateLimit: string;
  readonly verdict: LegalVerdict;
  /** One-line legal basis for the verdict. */
  readonly reason: string;
  readonly baseUrl: string | null;
  readonly datasets: readonly string[];
  readonly docsUrl: string;
}

const INGESTIBLE_VERDICTS: ReadonlySet<LegalVerdict> = new Set([
  "cleared",
  "cleared-with-attribution",
  "licensed",
  "use-with-caution",
]);

export const SOURCE_REGISTRY: Readonly<Record<string, LegalSource>> = {
  nflverse: {
    id: "nflverse",
    provider: "nflverse (nflverse-data)",
    kind: "bulk-open-data",
    license: { spdx: "CC-BY-4.0", name: "Creative Commons Attribution 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
    commercialUse: true,
    attributionRequired: true,
    attributionText: "Data via nflverse (nflverse-data), licensed CC BY 4.0.",
    robotsRespected: true,
    rateLimit: "GitHub release assets; cache 30m+, no high-frequency polling.",
    verdict: "cleared-with-attribution",
    reason: "CC-BY-4.0 explicitly permits commercial use with attribution.",
    baseUrl: "https://github.com/nflverse/nflverse-data/releases/download",
    datasets: [
      "player_stats_week",
      "rosters",
      "players",
      "snap_counts",
      "ngs",
      "injuries",
      "depth_charts",
      "pfr_advstats",
      "schedules",
      "pbp",
      "pbp_participation",
      "ftn_charting",
      "espn_qbr_week",
      "draft_picks",
      "combine",
    ],
    docsUrl: "https://github.com/nflverse/nflverse-data",
  },
  "the-odds-api": {
    id: "the-odds-api",
    provider: "The Odds API",
    kind: "licensed-api",
    license: { spdx: null, name: "The Odds API Terms (commercial subscription)", url: "https://the-odds-api.com/terms-and-conditions.html" },
    commercialUse: true,
    attributionRequired: false,
    attributionText: null,
    robotsRespected: true,
    rateLimit: "Plan quota; cache /sports ~1h, /events ~10m.",
    verdict: "licensed",
    reason: "Commercial use in user-facing analytics is permitted; never re-expose odds as our own feed/API.",
    baseUrl: "https://api.the-odds-api.com",
    datasets: ["odds", "scores", "events"],
    docsUrl: "https://the-odds-api.com/",
  },
  sleeper: {
    id: "sleeper",
    provider: "Sleeper",
    kind: "public-api",
    license: { spdx: null, name: "Sleeper public read-only API (no published commercial restriction)", url: "https://docs.sleeper.com/" },
    commercialUse: true,
    attributionRequired: true,
    attributionText: "Trending player data via Sleeper.",
    robotsRespected: true,
    rateLimit: "Stay under 1000 req/min; cache the player list locally.",
    verdict: "use-with-caution",
    reason: "Public, keyless, read-only; no commercial ban published. Attribute trending data; confirm in writing before making load-bearing.",
    baseUrl: "https://api.sleeper.app",
    datasets: ["players", "trending-add", "trending-drop"],
    docsUrl: "https://docs.sleeper.com/",
  },
  sportsdataio: {
    id: "sportsdataio",
    provider: "SportsDataIO (Fantasy/DFS API)",
    kind: "licensed-api",
    license: { spdx: null, name: "SportsDataIO Subscription Terms", url: "https://sportsdata.io/terms-of-service" },
    commercialUse: true,
    attributionRequired: false,
    attributionText: null,
    robotsRespected: true,
    rateLimit: "Per paid subscription plan.",
    verdict: "paid-required",
    reason: "Licensed DFS salary/slate feed covering DraftKings/FanDuel/Yahoo — the legal route to DK salaries. Requires a paid subscription; get a written rep that they are authorized to redistribute DK DFS salaries.",
    baseUrl: "https://api.sportsdata.io",
    datasets: ["dfs-slates", "dfs-salaries", "projections"],
    docsUrl: "https://sportsdata.io/fantasy-sports-api",
  },
  fantasydata: {
    id: "fantasydata",
    provider: "FantasyData (DFS API)",
    kind: "licensed-api",
    license: { spdx: null, name: "FantasyData Subscription Terms", url: "https://fantasydata.com/terms-of-use" },
    commercialUse: true,
    attributionRequired: false,
    attributionText: null,
    robotsRespected: true,
    rateLimit: "Per paid subscription plan.",
    verdict: "paid-required",
    reason: "Licensed DFS salary/projection feed (DK/FD). A legal alternative to SportsDataIO; requires a paid plan and an authorized-redistribution rep.",
    baseUrl: "https://api.fantasydata.net",
    datasets: ["dfs-slates", "dfs-salaries", "projections"],
    docsUrl: "https://fantasydata.com/",
  },
  "draftkings-unofficial": {
    id: "draftkings-unofficial",
    provider: "DraftKings (unofficial hidden JSON API)",
    kind: "scrape",
    license: { spdx: null, name: "DraftKings Terms of Use", url: "https://dknetwork.draftkings.com/terms-of-use/" },
    commercialUse: false,
    attributionRequired: false,
    attributionText: null,
    robotsRespected: false,
    rateLimit: "n/a — do not automate.",
    verdict: "forbidden",
    reason: "DK ToU bars automated collection, commercial use, and redistribution; uncopyrightable salary facts do not cure the contract breach (hiQ v. LinkedIn), and DK enforces via cease-and-desist. Use a licensed DFS feed instead.",
    baseUrl: null,
    datasets: [],
    docsUrl: "https://dknetwork.draftkings.com/terms-of-use/",
  },
  "open-meteo": {
    id: "open-meteo",
    provider: "Open-Meteo",
    kind: "public-api",
    license: { spdx: "CC-BY-4.0", name: "Open-Meteo (CC-BY-4.0; commercial needs paid plan)", url: "https://open-meteo.com/en/license" },
    commercialUse: false,
    attributionRequired: true,
    attributionText: "Weather data by Open-Meteo.com (CC BY 4.0).",
    robotsRespected: true,
    rateLimit: "Free tier ~10k calls/day, non-commercial only.",
    verdict: "paid-required",
    reason: "Clean CC-BY data, but commercial use requires a paid subscription we do not yet hold — founder-gated spend.",
    baseUrl: "https://api.open-meteo.com",
    datasets: ["forecast", "historical-weather"],
    docsUrl: "https://open-meteo.com/",
  },
  "espn-hidden-api": {
    id: "espn-hidden-api",
    provider: "ESPN (undocumented JSON)",
    kind: "public-api",
    license: { spdx: null, name: "ESPN Terms of Use", url: "https://support.espn.com/hc/en-us/articles/360035445091-Terms-of-Use" },
    commercialUse: false,
    attributionRequired: false,
    attributionText: null,
    robotsRespected: false,
    rateLimit: "n/a — do not automate.",
    verdict: "forbidden",
    reason: "ESPN ToU restricts to personal, non-commercial use and prohibits high-volume automated access.",
    baseUrl: null,
    datasets: [],
    docsUrl: "https://support.espn.com/hc/en-us/articles/360035445091-Terms-of-Use",
  },
  "pro-football-reference": {
    id: "pro-football-reference",
    provider: "Pro-Football-Reference / Sports-Reference",
    kind: "scrape",
    license: { spdx: null, name: "Sports Reference Data Use", url: "https://www.sports-reference.com/data_use.html" },
    commercialUse: false,
    attributionRequired: false,
    attributionText: null,
    robotsRespected: false,
    rateLimit: "n/a — bot access blocked.",
    verdict: "forbidden",
    reason: "ToS forbids automated scraping and building tools from scraped data. Use nflverse's pfr_advstats release instead.",
    baseUrl: null,
    datasets: [],
    docsUrl: "https://www.sports-reference.com/data_use.html",
  },
  nfelo: {
    id: "nfelo",
    provider: "nfeloapp / nfelo",
    kind: "bulk-open-data",
    license: { spdx: null, name: "No LICENSE file (all rights reserved)", url: "https://github.com/greerreNFL/nfelo" },
    commercialUse: false,
    attributionRequired: false,
    attributionText: null,
    robotsRespected: true,
    rateLimit: "n/a",
    verdict: "forbidden",
    reason: "No license granted on their outputs. Go to the nflverse source they build on instead.",
    baseUrl: null,
    datasets: [],
    docsUrl: "https://github.com/greerreNFL/nfelo",
  },
};

export function getSource(id: string): LegalSource | undefined {
  return SOURCE_REGISTRY[id];
}

/** True when a source's verdict permits commercial ingestion right now. */
export function isIngestible(id: string): boolean {
  const source = SOURCE_REGISTRY[id];
  return source ? INGESTIBLE_VERDICTS.has(source.verdict) : false;
}

/**
 * Throws unless the source is cleared for commercial ingestion. Call this at the
 * top of any ingestion routine so a forbidden/paid-gated source cannot be wired.
 */
export function assertIngestible(id: string): LegalSource {
  const source = SOURCE_REGISTRY[id];
  if (!source) {
    throw new Error(`[source-registry] Unknown data source "${id}" — declare it in the registry before ingesting.`);
  }
  if (!INGESTIBLE_VERDICTS.has(source.verdict)) {
    throw new Error(
      `[source-registry] Refusing to ingest "${id}" (verdict: ${source.verdict}). ${source.reason}`,
    );
  }
  return source;
}

/** The exact attribution line to render where a source's data appears, or null. */
export function attributionFor(id: string): string | null {
  const source = SOURCE_REGISTRY[id];
  if (!source) return null;
  return source.attributionRequired ? source.attributionText : null;
}

export function allSources(): readonly LegalSource[] {
  return Object.values(SOURCE_REGISTRY);
}

export function clearedSources(): readonly LegalSource[] {
  return allSources().filter((s) => INGESTIBLE_VERDICTS.has(s.verdict));
}

export function forbiddenSources(): readonly LegalSource[] {
  return allSources().filter((s) => s.verdict === "forbidden" || s.verdict === "paid-required");
}
