/**
 * Free-first source router (platform-wide).
 *
 * Owner directive: exhaust every FREE, already-cleared data source before spending a
 * cent on a paid API. Money is tight — but we are pushing to be the king of stats, so
 * cost-saving must never lower quality. This module encodes both at once:
 *
 *   1. FREE-FIRST  — sources are ordered by marginal cost (free before paid).
 *   2. CLEARED-ONLY for "use now" — a source must have passed the rights/clearance
 *      gate to be usable; gated candidates are visible but never auto-selected.
 *   3. QUALITY-AWARE — among equal-cost cleared sources, higher data quality wins, so
 *      free never means worse.
 *
 * The router is the planning brain; the ingestion pipeline asks it "what should I use
 * for need X in sport Y?" and only escalates to a paid source when NO cleared free
 * source covers the need.
 */

import { type CostTier, COST_TIER_RANK } from "./cost-policy";
import type { ConfidenceLevel } from "./source-confidence";

export type Sport =
  | "nfl"
  | "ncaaf"
  | "nba"
  | "ncaab"
  | "mlb"
  | "nhl"
  | "mls";

export const ALL_SPORTS: readonly Sport[] = ["nfl", "ncaaf", "nba", "ncaab", "mlb", "nhl", "mls"];

/** Every kind of data/stat/analytics input the platform ingests. */
export type StatNeed =
  | "scores"
  | "results"
  | "standings"
  | "schedules"
  | "rankings"
  | "odds"
  | "player_stats"
  | "team_stats"
  | "injuries"
  | "play_by_play"
  | "depth_charts"
  | "weather"
  | "news";

const QUALITY_RANK: Record<ConfidenceLevel, number> = { high: 0, medium: 1, low: 2, unknown: 3 };

export type PlatformSource = {
  readonly id: string;
  readonly name: string;
  readonly tier: CostTier;
  /** True once the rights/clearance gate has passed — usable right now. */
  readonly cleared: boolean;
  /** Data quality / trust read (drives quality-aware ordering). */
  readonly quality: ConfidenceLevel;
  readonly sports: readonly Sport[];
  readonly needs: readonly StatNeed[];
  /** Corresponding source-rights-registry id (or candidate id), when one exists. */
  readonly registrySourceId: string | null;
  readonly note: string;
};

/**
 * Canonical platform source registry. Facts are grounded: open-license / official
 * sources are cleared + high quality; unofficial public endpoints are cleared but
 * medium quality (facts only); owner-review candidates are gated until they clear.
 * No fabricated coverage — gated sources still require terms + live schema verification.
 */
export const PLATFORM_SOURCES: readonly PlatformSource[] = [
  // ── Cleared + free (use these first) ────────────────────────────────────────
  {
    id: "nflverse",
    name: "nflverse (open data)",
    tier: "free_unlimited",
    cleared: true,
    quality: "high",
    sports: ["nfl"],
    needs: ["scores", "results", "schedules", "player_stats", "team_stats", "play_by_play", "depth_charts", "injuries"],
    registrySourceId: "nflverse",
    note: "CC-BY open dataset, already wired. Deep NFL facts at zero marginal cost — the free spine for NFL stats.",
  },
  {
    id: "espn-public-api",
    name: "ESPN Public API (unofficial)",
    tier: "free_quota",
    cleared: true,
    quality: "medium",
    sports: ["nfl", "ncaaf", "nba", "ncaab", "mlb", "nhl", "mls"],
    needs: ["scores", "results", "standings", "schedules", "rankings"],
    registrySourceId: "espn-public-api",
    note: "Already cleared for facts (approved_public_logged_off). No key. Free scores/standings/rankings across all sports; no commercial display/storage without a license.",
  },
  {
    id: "open-meteo",
    name: "Open-Meteo",
    tier: "free_unlimited",
    cleared: true,
    quality: "high",
    sports: ["nfl", "ncaaf", "nba", "ncaab", "mlb", "nhl", "mls"],
    needs: ["weather"],
    registrySourceId: "open-meteo",
    note: "Free, no key, no sign-up (CC-BY 4.0). Game-time weather for outdoor venues — a free quality input for totals/passing models.",
  },

  // ── Cleared + licensed (already paid; use after free) ────────────────────────
  {
    id: "the-odds-api",
    name: "The Odds API",
    tier: "licensed_flat",
    cleared: true,
    quality: "high",
    sports: ["nfl", "ncaaf", "nba", "ncaab", "mlb", "nhl", "mls"],
    needs: ["odds", "scores", "results"],
    registrySourceId: "the-odds-api",
    note: "Licensed + wired (THE_ODDS_API_KEY). Free tier 500 credits/mo — in-season gated. Primary cleared ODDS source; free odds candidates are still gated.",
  },

  // ── Gated free candidates (free, but not yet cleared) ────────────────────────
  {
    id: "henrygd-ncaa",
    name: "henrygd NCAA API",
    tier: "free_unlimited",
    cleared: false,
    quality: "medium",
    sports: ["ncaaf", "ncaab"],
    needs: ["scores", "results", "standings", "rankings", "schedules", "play_by_play", "team_stats"],
    registrySourceId: "henrygd-ncaa",
    note: "Owner-approved free-first for NCAA facts; self-host to clear the rate cap. Cleared once the redistribution posture is confirmed.",
  },
  {
    id: "cfbd",
    name: "CollegeFootballData (CFBD)",
    tier: "free_quota",
    cleared: false,
    quality: "high",
    sports: ["ncaaf"],
    needs: ["scores", "schedules", "team_stats", "player_stats", "standings"],
    registrySourceId: "collegefootballdata",
    note: "Highest-value free CFB stats. Free key (1,000/mo). Cleared once terms are read (gated work approved).",
  },
  {
    id: "balldontlie-ncaaf",
    name: "BALLDONTLIE NCAAF",
    tier: "free_quota",
    cleared: false,
    quality: "medium",
    sports: ["ncaaf"],
    needs: ["standings", "player_stats"],
    registrySourceId: null,
    note: "Free roster/identity + standings supplement (~5/min).",
  },
  {
    id: "highlightly",
    name: "Highlightly NFL/NCAA",
    tier: "free_quota",
    cleared: false,
    quality: "medium",
    sports: ["nfl", "ncaaf"],
    needs: ["scores", "standings"],
    registrySourceId: null,
    note: "Free key, 100/day. Broad live-score check source.",
  },
  {
    id: "api-sports",
    name: "API-SPORTS NFL & NCAA",
    tier: "free_quota",
    cleared: false,
    quality: "medium",
    sports: ["nfl", "ncaaf"],
    needs: ["scores", "team_stats", "standings"],
    registrySourceId: null,
    note: "Free key, 100/day. Validate CFB depth before relying.",
  },
  {
    id: "bigballs",
    name: "Big Balls Sports Data",
    tier: "free_quota",
    cleared: false,
    quality: "low",
    sports: ["nfl", "ncaaf"],
    needs: ["scores", "team_stats", "standings", "schedules", "odds"],
    registrySourceId: null,
    note: "Free 1,000–2,000/day. Unverified breadth — verify before production.",
  },
  {
    id: "sports-game-data",
    name: "Sports Game Data",
    tier: "free_quota",
    cleared: false,
    quality: "low",
    sports: ["ncaaf"],
    needs: ["scores", "team_stats", "player_stats", "odds"],
    registrySourceId: null,
    note: "Free 2,500 objects/mo, 10-min updates. Validate freshness for live use.",
  },
  {
    id: "therundown",
    name: "TheRundown",
    tier: "free_quota",
    cleared: false,
    quality: "medium",
    sports: ["ncaaf", "nfl"],
    needs: ["odds", "schedules"],
    registrySourceId: null,
    note: "Free 20,000 points/day, 5-min delay. Free odds baseline.",
  },

  // ── Gated paid/trial (last resort) ───────────────────────────────────────────
  {
    id: "sportsdataio-cfb",
    name: "SportsDataIO College Football",
    tier: "trial",
    cleared: false,
    quality: "high",
    sports: ["ncaaf"],
    needs: ["scores", "player_stats", "team_stats", "odds", "schedules", "standings", "injuries", "depth_charts"],
    registrySourceId: null,
    note: "Trial → paid. Evaluation/licensing only; do not assume free production use.",
  },
  {
    id: "sportradar-ncaaf-v7",
    name: "Sportradar NCAA Football v7",
    tier: "paid_metered",
    cleared: false,
    quality: "high",
    sports: ["ncaaf"],
    needs: ["scores", "player_stats", "team_stats", "odds", "play_by_play"],
    registrySourceId: null,
    note: "Enterprise, likely future-paid. Reference architecture only.",
  },
];

const FREE_TIERS: ReadonlySet<CostTier> = new Set<CostTier>(["free_unlimited", "free_quota"]);

export function isFreeTier(tier: CostTier): boolean {
  return FREE_TIERS.has(tier);
}

function covers(source: PlatformSource, need: StatNeed, sport: Sport): boolean {
  return source.needs.includes(need) && source.sports.includes(sport);
}

/** Free-first, then quality, then cleared-before-gated. Pure ordering. */
function orderSources(a: PlatformSource, b: PlatformSource): number {
  if (COST_TIER_RANK[a.tier] !== COST_TIER_RANK[b.tier]) {
    return COST_TIER_RANK[a.tier] - COST_TIER_RANK[b.tier];
  }
  // Prefer cleared (usable now) over gated at the same cost.
  if (a.cleared !== b.cleared) return a.cleared ? -1 : 1;
  return QUALITY_RANK[a.quality] - QUALITY_RANK[b.quality];
}

/** All sources covering (need, sport), free-first. Includes gated (planning view). */
export function routeSources(need: StatNeed, sport: Sport): readonly PlatformSource[] {
  return PLATFORM_SOURCES.filter((s) => covers(s, need, sport)).slice().sort(orderSources);
}

/** Only CLEARED sources covering (need, sport), free-first — usable right now. */
export function clearedSources(need: StatNeed, sport: Sport): readonly PlatformSource[] {
  return routeSources(need, sport).filter((s) => s.cleared);
}

/** The cheapest cleared FREE source for (need, sport), if any. */
export function bestFreeClearedSource(need: StatNeed, sport: Sport): PlatformSource | undefined {
  return clearedSources(need, sport).find((s) => isFreeTier(s.tier));
}

export type IngestionPlan = {
  readonly need: StatNeed;
  readonly sport: Sport;
  /** Cheapest cleared source to use first (free if any free is cleared). */
  readonly primary: PlatformSource | null;
  /** Remaining cleared sources, in fall-back order. */
  readonly fallbacks: readonly PlatformSource[];
  /** True when a free cleared source covers the need — no paid call needed. */
  readonly freeCovers: boolean;
  /** True when the ONLY cleared option costs money (licensed/trial/paid). */
  readonly mustSpend: boolean;
  /** Free candidates that, once cleared, would remove any spend for this need. */
  readonly unlockToGoFree: readonly PlatformSource[];
};

/**
 * The free-first plan for a need: what to use now, what falls back, whether any
 * spend is required, and which gated free sources to clear to eliminate spend.
 */
export function planIngestion(need: StatNeed, sport: Sport): IngestionPlan {
  const cleared = clearedSources(need, sport);
  const freeCleared = cleared.filter((s) => isFreeTier(s.tier));
  const primary = cleared[0] ?? null;
  const freeCovers = freeCleared.length > 0;
  const mustSpend = cleared.length > 0 && !freeCovers;
  const unlockToGoFree = routeSources(need, sport).filter((s) => !s.cleared && isFreeTier(s.tier));

  return {
    need,
    sport,
    primary,
    fallbacks: cleared.slice(1),
    freeCovers,
    mustSpend,
    unlockToGoFree,
  };
}

/**
 * Spend guard: may we call a PAID source for (need, sport)? Only if no cleared free
 * source covers it. The ingestion pipeline should assert this before any paid call.
 */
export function requiresPaidEscalation(need: StatNeed, sport: Sport): boolean {
  return planIngestion(need, sport).mustSpend;
}

/** Coverage summary for the cockpit: per need × sport, is there free cleared coverage? */
export function freeCoverageMatrix(): ReadonlyArray<{
  readonly need: StatNeed;
  readonly sport: Sport;
  readonly freeCovers: boolean;
  readonly primaryId: string | null;
  readonly mustSpend: boolean;
}> {
  const needs: StatNeed[] = [
    "scores", "results", "standings", "schedules", "rankings", "odds",
    "player_stats", "team_stats", "injuries", "play_by_play", "depth_charts", "weather", "news",
  ];
  const rows: Array<{ need: StatNeed; sport: Sport; freeCovers: boolean; primaryId: string | null; mustSpend: boolean }> = [];
  for (const need of needs) {
    for (const sport of ALL_SPORTS) {
      const plan = planIngestion(need, sport);
      if (plan.primary || plan.unlockToGoFree.length > 0) {
        rows.push({ need, sport, freeCovers: plan.freeCovers, primaryId: plan.primary?.id ?? null, mustSpend: plan.mustSpend });
      }
    }
  }
  return rows;
}
