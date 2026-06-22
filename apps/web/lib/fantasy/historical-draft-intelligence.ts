/**
 * Historical draft intelligence data contract for Galaxy Sports Edge.
 * Defines the types and query interfaces for the Historical Regret Engine —
 * surfacing comparable historical drafts and their outcomes.
 *
 * IMPORTANT: All historical outcome data must be real or labeled ILLUSTRATIVE.
 * Do not fabricate historical draft results.
 */

// ── Historical draft types ─────────────────────────────────────────────────────

export type OutcomeCategory =
  | "CHAMPIONSHIP_WIN"
  | "CHAMPIONSHIP_LOSS"
  | "PLAYOFF_EXIT"
  | "MISSED_PLAYOFFS"
  | "LAST_PLACE"
  | "CATASTROPHIC_INJURY"
  | "BREAKOUT_SUCCESS"
  | "COMPLETE_BUST"
  | "MEDIOCRE_SEASON"
  | "UNKNOWN";

export type PickSimilarityDimension =
  | "adp_at_pick"
  | "position"
  | "player_age"
  | "target_share_pct"
  | "snap_pct"
  | "team_offensive_rank"
  | "injury_history"
  | "new_coordinator"
  | "contract_year";

export interface HistoricalPickQuery {
  position: string;
  pickRound: number;
  adpValue: number;
  teamOffensiveRank: number | null;
  playerAge: number | null;
  hasNewCoordinator: boolean;
  isContractYear: boolean;
  injuryHistoryFlag: boolean;
  similarities: PickSimilarityDimension[];
}

export interface HistoricalPickComparable {
  season: number;
  playerName: string;
  position: string;
  teamName: string;
  adpAtTime: number;
  pickRound: number;
  fullSeasonPoints: number | null;
  weeklyAvgPoints: number | null;
  injuryGamesLost: number;
  outcomeTier: OutcomeCategory;
  outcomeNarrative: string;
  rosterOutcome: OutcomeCategory;
  similarityScore: number;
  similarityDimensions: PickSimilarityDimension[];
  dataSource: string;
  dataLabel: "REAL" | "ILLUSTRATIVE";
}

export interface HistoricalRegretEngineResult {
  query: HistoricalPickQuery;
  comparables: HistoricalPickComparable[];
  sampleSize: number;
  outcomeSummary: OutcomeSummary;
  regretPattern: string | null;
  successPattern: string | null;
  dataLabel: "REAL" | "INSUFFICIENT_DATA" | "MIXED";
}

export interface OutcomeSummary {
  playoffRate: number;
  championshipRate: number;
  catastrophicInjuryRate: number;
  avgSeasonPoints: number | null;
  bestCaseOutcome: string;
  worstCaseOutcome: string;
  medianOutcome: OutcomeCategory;
}

// ── Draft position type archetypes ─────────────────────────────────────────────

export type DraftArchetype =
  | "WORKHORSE_RB_EARLY"
  | "RECEIVER_HEAVY_EARLY"
  | "ZERO_RB_LATE"
  | "ZERO_WR_HERO_TE"
  | "BALANCED_BPA"
  | "QUARTERBACK_EARLY"
  | "AUCTION_STARS_SCRUBS"
  | "HANDCUFF_HEAVY";

export interface DraftArchetypeProfile {
  archetype: DraftArchetype;
  name: string;
  description: string;
  historicalPlayoffRate: number | null;
  historicalChampionshipRate: number | null;
  bestFormat: string;
  worstFormat: string;
  keyRisk: string;
  dataLabel: "REAL" | "ILLUSTRATIVE";
  sampleNote: string;
}

export const DRAFT_ARCHETYPE_PROFILES: ReadonlyArray<DraftArchetypeProfile> = [
  {
    archetype: "WORKHORSE_RB_EARLY",
    name: "Workhorse RB Early (Hero RB)",
    description:
      "Draft an elite RB in round 1, second RB in round 2, then fill WR/TE in middle rounds.",
    historicalPlayoffRate: null,
    historicalChampionshipRate: null,
    bestFormat: "Standard, Half-PPR — rushing volume is rewarded",
    worstFormat: "Full PPR — WR value concentrated in early rounds",
    keyRisk: "Single-point-of-failure: if RB1 gets injured, season over",
    dataLabel: "ILLUSTRATIVE",
    sampleNote: "Source gap — aggregate historical outcome data needed before publishing real rates",
  },
  {
    archetype: "RECEIVER_HEAVY_EARLY",
    name: "Receiver-Heavy (Zero RB)",
    description:
      "Target elite WRs in first 3 rounds, fill RB in mid-to-late rounds with volume/handcuff approach.",
    historicalPlayoffRate: null,
    historicalChampionshipRate: null,
    bestFormat: "Full PPR — WR target share maximized",
    worstFormat: "Standard — RB rushing volume discounted",
    keyRisk: "RB depth is cheap-labor quality; one injury to a committee back = limited upside",
    dataLabel: "ILLUSTRATIVE",
    sampleNote: "Source gap — aggregate historical outcome data needed before publishing real rates",
  },
  {
    archetype: "BALANCED_BPA",
    name: "Best Player Available (BPA)",
    description:
      "Ignore positional runs; always draft the highest-value player available regardless of position.",
    historicalPlayoffRate: null,
    historicalChampionshipRate: null,
    bestFormat: "Any format — value-agnostic by design",
    worstFormat: "Auction — BPA discipline harder to maintain with budget constraints",
    keyRisk: "Can end up with 4 WRs or 3 QBs if the market runs before your needs",
    dataLabel: "ILLUSTRATIVE",
    sampleNote: "Source gap — aggregate historical outcome data needed before publishing real rates",
  },
] as const;

// ── Historical data source registry ──────────────────────────────────────────

export interface HistoricalDataSource {
  sourceId: string;
  name: string;
  description: string;
  seasons: string;
  rightsStatus: "approved_open_license" | "approved_api" | "permission_required" | "under_review";
  rightsNote: string;
  dataTypes: string[];
}

export const HISTORICAL_DATA_SOURCES: ReadonlyArray<HistoricalDataSource> = [
  {
    sourceId: "pro_football_reference",
    name: "Pro Football Reference",
    description: "Historical NFL player stats, game logs, season totals",
    seasons: "1966–present",
    rightsStatus: "permission_required",
    rightsNote:
      "PFR is Sports Reference LLC property. Automated scraping prohibited without license. Facts are non-copyrightable but their presentation is. Review ToS before any automated access.",
    dataTypes: ["season stats", "game logs", "snap counts", "target share"],
  },
  {
    sourceId: "nflverse",
    name: "nflverse (nflreadr / nflfastR)",
    description: "Open-source NFL play-by-play data, weekly stats, rosters",
    seasons: "1999–present",
    rightsStatus: "approved_open_license",
    rightsNote:
      "nflverse is MIT licensed. Data sourced from NFL's public APIs. Usage permitted for non-commercial and commercial projects. Attribution required.",
    dataTypes: ["play-by-play", "weekly stats", "snap counts", "rosters", "schedules"],
  },
  {
    sourceId: "sleeper_historical",
    name: "Sleeper Draft History (via API)",
    description: "Historical fantasy draft data from Sleeper leagues",
    seasons: "2017–present",
    rightsStatus: "under_review",
    rightsNote:
      "Sleeper API provides draft data for leagues where user is a member. Aggregation of draft data for ML training purposes needs explicit ToS review.",
    dataTypes: ["draft picks", "ADP", "manager tendencies"],
  },
] as const;

// ── Helper functions ──────────────────────────────────────────────────────────

export function approvedHistoricalSources(): HistoricalDataSource[] {
  return HISTORICAL_DATA_SOURCES.filter(
    (s) =>
      s.rightsStatus === "approved_open_license" || s.rightsStatus === "approved_api"
  ) as HistoricalDataSource[];
}

export function summarizeOutcomes(
  comparables: HistoricalPickComparable[]
): OutcomeSummary {
  if (comparables.length === 0) {
    return {
      playoffRate: 0,
      championshipRate: 0,
      catastrophicInjuryRate: 0,
      avgSeasonPoints: null,
      bestCaseOutcome: "Unknown",
      worstCaseOutcome: "Unknown",
      medianOutcome: "UNKNOWN",
    };
  }

  const playoffOutcomes: OutcomeCategory[] = [
    "CHAMPIONSHIP_WIN",
    "CHAMPIONSHIP_LOSS",
    "PLAYOFF_EXIT",
  ];

  const playoffRate =
    comparables.filter((c) => playoffOutcomes.includes(c.rosterOutcome)).length /
    comparables.length;

  const championshipRate =
    comparables.filter((c) => c.rosterOutcome === "CHAMPIONSHIP_WIN").length /
    comparables.length;

  const catastrophicRate =
    comparables.filter((c) => c.outcomeTier === "CATASTROPHIC_INJURY").length /
    comparables.length;

  const pointsComparables = comparables.filter((c) => c.fullSeasonPoints !== null);
  const avgSeasonPoints =
    pointsComparables.length > 0
      ? pointsComparables.reduce((sum, c) => sum + (c.fullSeasonPoints ?? 0), 0) /
        pointsComparables.length
      : null;

  const sorted = [...comparables].sort(
    (a, b) => (b.fullSeasonPoints ?? 0) - (a.fullSeasonPoints ?? 0)
  );

  return {
    playoffRate,
    championshipRate,
    catastrophicInjuryRate: catastrophicRate,
    avgSeasonPoints,
    bestCaseOutcome: sorted[0]?.outcomeNarrative ?? "Unknown",
    worstCaseOutcome: sorted[sorted.length - 1]?.outcomeNarrative ?? "Unknown",
    medianOutcome: sorted[Math.floor(sorted.length / 2)]?.rosterOutcome ?? "UNKNOWN",
  };
}
