/**
 * SERPAPI GOOGLE SPORTS — the Public Observer adapter (parsing only).
 *
 * SerpApi Google Sports is NOT official sports truth, not a licensed production feed, not a settlement
 * source, and not a betting edge by itself. It is a PUBLIC OBSERVER FRAME: it tells GSE what Google is
 * showing the public, when, which entities Google recognizes (knowledge-graph ids), and which highlights
 * are surfaced. Its hidden gems are the KGMIDs (entity resolution) and the timing (public consensus lag).
 *
 * This module PARSES fixture payloads into structured parts and builds controlled query recipes — it
 * makes NO network call, reads NO key, and persists NO raw payload. The bridge that turns a parsed result
 * into a governed PublicObserverRecord lives in decision-field-runtime (correct dependency direction).
 *
 * Every output carries sourceType SERPAPI_GOOGLE_SPORTS and authority "public observer only".
 */

export const SERPAPI_GOOGLE_SPORTS_SOURCE_TYPE = "SERPAPI_GOOGLE_SPORTS" as const;

export type SerpApiResultType =
  | "TEAM_RESULTS"
  | "GAME_SPOTLIGHT"
  | "VIDEO_HIGHLIGHT_CAROUSEL"
  | "ATHLETE_STATS"
  | "STANDINGS"
  | "LIVE_GAME"
  | "RACING_RESULTS"
  | "TENNIS_RESULTS"
  | "OTHER";

export interface SerpApiKgEntity {
  readonly name: string;
  readonly entityType: "TEAM" | "PLAYER" | "VENUE" | "LEAGUE" | "TOURNAMENT";
  readonly kgmid: string;
}

export interface SerpApiHighlight {
  readonly title: string;
  readonly link: string;
  readonly durationLabel: string | null;
  readonly sourcePlatform: string;
  readonly thumbnailUrl: string | null;
}

export interface SerpApiStandingsRow {
  readonly team: string;
  readonly rank: number;
  readonly record: string;
}

export interface SerpApiStandings {
  readonly league: string;
  readonly rows: readonly SerpApiStandingsRow[];
}

export interface SerpApiGameSpotlight {
  readonly title: string;
  readonly status: string | null; // e.g. "Live", "59'", "FT"
  readonly inGameTime: string | null; // STILL public observer state, not the official clock
  readonly score: string | null;
  readonly teams: readonly string[];
  readonly venue: string | null;
  readonly league: string | null;
}

export interface SerpApiAthleteStats {
  readonly athlete: string;
  readonly rows: ReadonlyArray<{ label: string; value: string }>;
}

export interface SerpApiSportsResult {
  readonly query: string;
  readonly engine: string;
  readonly resultType: SerpApiResultType;
  readonly title: string | null;
  readonly spotlight: SerpApiGameSpotlight | null;
  readonly standings: SerpApiStandings | null;
  readonly athleteStats: SerpApiAthleteStats | null;
  readonly kgEntities: readonly SerpApiKgEntity[];
  readonly highlights: readonly SerpApiHighlight[];
  readonly sourceType: typeof SERPAPI_GOOGLE_SPORTS_SOURCE_TYPE;
}

type Payload = Record<string, unknown>;
const obj = (v: unknown): Payload => (v && typeof v === "object" ? (v as Payload) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

// ───────────────────────── extractors ─────────────────────────

export function extractGameSpotlight(payload: Payload): SerpApiGameSpotlight | null {
  const sr = obj(payload.sports_results);
  const sp = obj(sr.game_spotlight);
  if (!sr.game_spotlight) return null;
  const teams = arr(sp.teams).map((t) => str(obj(t).name)).filter((x): x is string => x != null);
  return {
    title: str(sp.title) ?? str(sr.title) ?? "(untitled)",
    status: str(sp.status),
    inGameTime: str(sp.in_game_time),
    score: str(sp.score),
    teams,
    venue: str(obj(sp.venue).name) ?? str(sp.stadium),
    league: str(sp.league) ?? str(sr.league),
  };
}

export function extractStandings(payload: Payload): SerpApiStandings | null {
  const sr = obj(payload.sports_results);
  const st = arr(sr.standings);
  if (st.length === 0) return null;
  const rows = st
    .map((r, i) => ({ team: str(obj(r).team) ?? str(obj(r).name) ?? "", rank: Number(obj(r).rank ?? i + 1), record: str(obj(r).record) ?? "—" }))
    .filter((r) => r.team.length > 0);
  return { league: str(sr.league) ?? "(league)", rows };
}

export function extractAthleteStats(payload: Payload): SerpApiAthleteStats | null {
  const sr = obj(payload.sports_results);
  const ath = obj(sr.athlete);
  if (!sr.athlete) return null;
  const rows = arr(ath.stats).map((r) => ({ label: str(obj(r).label) ?? "", value: str(obj(r).value) ?? "" })).filter((r) => r.label.length > 0);
  return { athlete: str(ath.name) ?? "(athlete)", rows };
}

export function extractKgEntities(payload: Payload): SerpApiKgEntity[] {
  const out: SerpApiKgEntity[] = [];
  const sr = obj(payload.sports_results);
  const sp = obj(sr.game_spotlight);
  for (const t of arr(sp.teams)) {
    const name = str(obj(t).name);
    const kg = str(obj(t).kgmid) ?? str(obj(t).team_kgmid);
    if (name && kg) out.push({ name, entityType: "TEAM", kgmid: kg });
  }
  const venueName = str(obj(sp.venue).name) ?? str(sp.stadium);
  const venueKg = str(obj(sp.venue).kgmid) ?? str(sp.stadium_kgmid) ?? str(sp.venue_kgmid);
  if (venueName && venueKg) out.push({ name: venueName, entityType: "VENUE", kgmid: venueKg });
  return out;
}

export function extractHighlights(payload: Payload): SerpApiHighlight[] {
  const sr = obj(payload.sports_results);
  const carousel = arr(obj(sr.game_spotlight).video_highlight_carousel).concat(arr(sr.video_highlights));
  return carousel
    .map((h) => ({
      title: str(obj(h).title) ?? "(highlight)",
      link: str(obj(h).link) ?? "",
      durationLabel: str(obj(h).duration),
      sourcePlatform: str(obj(h).source) ?? "google-sports",
      thumbnailUrl: str(obj(h).thumbnail),
    }))
    .filter((h) => h.link.length > 0);
}

/** Parse a full Google Sports payload into one normalized result. */
export function parseSportsResults(payload: Payload, query: string, engine = "google"): SerpApiSportsResult {
  const spotlight = extractGameSpotlight(payload);
  const standings = extractStandings(payload);
  const athleteStats = extractAthleteStats(payload);
  const highlights = extractHighlights(payload);
  const resultType: SerpApiResultType = spotlight
    ? spotlight.status && /\d|live/i.test(spotlight.status)
      ? "LIVE_GAME"
      : "GAME_SPOTLIGHT"
    : standings
      ? "STANDINGS"
      : athleteStats
        ? "ATHLETE_STATS"
        : highlights.length > 0
          ? "VIDEO_HIGHLIGHT_CAROUSEL"
          : "OTHER";
  return {
    query,
    engine,
    resultType,
    title: str(obj(payload.sports_results).title),
    spotlight,
    standings,
    athleteStats,
    kgEntities: extractKgEntities(payload),
    highlights,
    sourceType: SERPAPI_GOOGLE_SPORTS_SOURCE_TYPE,
  };
}

// ───────────────────────── query recipes + cost + allowed-use ─────────────────────────

export type SerpApiPurpose =
  | "PUBLIC_OBSERVER"
  | "ENTITY_RESOLUTION"
  | "ROUTE_DISCOVERY"
  | "STANDINGS_CHECK"
  | "HIGHLIGHT_DISCOVERY"
  | "LATENCY_CHECK"
  | "COVERAGE_DISCOVERY";

export interface SerpApiQueryRecipe {
  readonly recipeId: string;
  readonly queryTemplate: string;
  readonly sport: string;
  readonly expectedResultType: SerpApiResultType;
  readonly purpose: SerpApiPurpose;
  readonly location: string | null;
  readonly allowedUse: readonly string[];
  readonly authorityCeiling: "INFO_ONLY" | "WATCH"; // public observer can never exceed WATCH
  readonly ownerApprovalRequired: boolean;
  readonly costEstimateUsd: number;
  readonly runMode: "FIXTURE_ONLY" | "DRY_RUN" | "OWNER_APPROVED_LIVE";
}

/** Indicative per-search cost (verify at purchase — never asserted as current pricing). */
export const SERPAPI_INDICATIVE_COST_PER_SEARCH = 0.01;

export function estimateSerpApiCost(searches: number): number {
  return Math.round(Math.max(0, searches) * SERPAPI_INDICATIVE_COST_PER_SEARCH * 1000) / 1000;
}

export function buildQueryRecipe(input: {
  recipeId: string;
  queryTemplate: string;
  sport: string;
  expectedResultType: SerpApiResultType;
  purpose: SerpApiPurpose;
  location?: string | null;
  searches?: number;
}): SerpApiQueryRecipe {
  const allowedUse =
    input.purpose === "ENTITY_RESOLUTION"
      ? ["map provider ids to GSE entity via kgmid"]
      : input.purpose === "HIGHLIGHT_DISCOVERY"
        ? ["discover highlight links (no embed/rehost)"]
        : input.purpose === "LATENCY_CHECK"
          ? ["measure public-vs-official lag"]
          : ["public observer frame", "route/coverage discovery"];
  return {
    recipeId: input.recipeId,
    queryTemplate: input.queryTemplate,
    sport: input.sport,
    expectedResultType: input.expectedResultType,
    purpose: input.purpose,
    location: input.location ?? null,
    allowedUse,
    authorityCeiling: "WATCH",
    ownerApprovalRequired: true,
    costEstimateUsd: estimateSerpApiCost(input.searches ?? 1),
    runMode: "FIXTURE_ONLY",
  };
}

/** Validate a recipe's intended use. Production-truth / settlement / betting-trigger uses are forbidden. */
export function validateAllowedUse(recipe: SerpApiQueryRecipe): { ok: boolean; problems: readonly string[] } {
  const problems: string[] = [];
  if (recipe.runMode === "OWNER_APPROVED_LIVE" && recipe.ownerApprovalRequired) {
    // an owner-approved-live recipe is only valid if approval is recorded elsewhere — never in fixtures
    problems.push("OWNER_APPROVED_LIVE requires recorded owner approval (not available in fixture mode)");
  }
  if (recipe.authorityCeiling !== "WATCH" && recipe.authorityCeiling !== "INFO_ONLY") {
    problems.push("a public observer recipe may never exceed WATCH");
  }
  const FORBIDDEN = /settle|official truth|production truth|betting trigger|place bet/i;
  for (const u of recipe.allowedUse) if (FORBIDDEN.test(u)) problems.push(`forbidden use: "${u}"`);
  return { ok: problems.length === 0, problems };
}

// ───────────────────────── fixture payloads (illustrative — no network) ─────────────────────────
export const SERPAPI_FIXTURE_SOCCER_LIVE: Payload = {
  sports_results: {
    title: "Ecuador vs Germany",
    league: "FIFA World Cup",
    game_spotlight: {
      title: "Ecuador 2 - 1 Germany",
      status: "77'",
      in_game_time: "77'",
      score: "2 - 1",
      teams: [
        { name: "Ecuador", kgmid: "/m/01rkt7" },
        { name: "Germany", kgmid: "/m/0gfx9" },
      ],
      venue: { name: "MetLife Stadium", kgmid: "/m/0glh3" },
      video_highlight_carousel: [
        { title: "Plata seals it (fixture)", link: "https://example.org/highlight/ecu-ger-plata", duration: "1:12", source: "google-sports", thumbnail: "https://example.org/thumb/ecu-ger.jpg" },
      ],
    },
  },
};

export const SERPAPI_FIXTURE_STANDINGS: Payload = {
  sports_results: {
    title: "AL East",
    league: "MLB",
    standings: [
      { team: "Tampa Bay Rays", rank: 1, record: "—" },
      { team: "Kansas City Royals", rank: 4, record: "—" },
    ],
  },
};
