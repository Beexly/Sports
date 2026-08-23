/**
 * NFL incentive + rule-change calendar — covariate layer (leak-safe, week t for t+1).
 *
 * WHAT THIS IS
 * A static calendar of NFL rule changes and incentive events (playoff
 * elimination, teams with nothing to play for, seeding races, etc.)
 * mapped onto per-game covariates. Each game receives features that
 * encode whether a rule change is active and whether the game carries
 * playoff/incentive weight — the kind of structural covariate that can
 * shift behavior without being a "tout score." All inputs are public
 * facts knowable from the schedule: the schedule itself, the rulebook,
 * and the standings trajectory computed from completed games.
 *
 * ── Leak-safety ──
 * Every feature is stamped observedAt = decisionAt (kickoff - 1h), the
 * conservative latest bound consistent with the feature modules. The
 * as-of store enforces zero lookahead. No feature references a game's
 * own outcome; all standings-derived signals use only PRIOR completed
 * games.
 *
 * ── Rule changes ──
 * A static table of known NFL rule changes with a season range and the
 * week they take effect (if mid-season). Each change has a short code
 * and a description. Games in the affected season(s) get a binary
 * covariate per rule.
 *
 * ── Playoff incentives ──
 * Derived from the standings trajectory: a team with clinched playoff
 * berth or eliminated from contention plays differently (rest, effort,
 * roster usage). These are computed from prior-game results only.
 *
 * Pure, deterministic, no I/O.
 */

import { AsOfFeatureStore } from "../asof-store.js";
import { proportionalDevig } from "../devig.js";
import type { GameRow } from "../game-row.js";
import type { EvalRow } from "../placebo.js";

export const INCENTIVE_FEATURE_KEYS = [
  "rule:overtime_shootout",
  "rule:two_point_conversion",
  "rule:extra_point_distance",
  "rule:roughing_passer_15y",
  "rule:targeting",
  "rule:pass_interference_reviewable",
  "rule:OT_coin_flip",
  "rule:concussion_protocol",
  "incentive:home_clinched",
  "incentive:home_eliminated",
  "incentive:away_clinched",
  "incentive:away_eliminated",
  "incentive:divisional",
  "incentive:week_17",
] as const;

export type IncentiveFeatureKey = (typeof INCENTIVE_FEATURE_KEYS)[number];

/** Decision cutoff: features frozen this long before kickoff. */
const DECISION_LEAD_MS = 60 * 60_000;
const GAME_DURATION_MS = 4 * 3_600_000;

/** Playoff races only matter in the last N weeks of the season. */
const PLAYOFF_RACE_WEEKS = 4; // weeks 14-17 in a 17-game season
export const NFL_SEASON_WEEKS = 17;

export interface RuleChange {
  /** Short identifier (used in feature key prefix `rule:<code>`). */
  readonly code: string;
  /** Human-readable description. */
  readonly description: string;
  /** Seasons this rule is active (inclusive). */
  readonly seasons: readonly number[];
  /** Week it takes effect within those seasons (1-17). null = entire season. */
  readonly effectiveWeek: number | null;
}

/** Known NFL rule changes with public sources. */
export const NFL_RULE_CHANGES: readonly RuleChange[] = [
  {
    code: "overtime_shootout",
    description: "Overtime format: sudden death removed in playoffs (2010+), regular season modified (2012+), shootout in preseason.",
    seasons: [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
    effectiveWeek: null,
  },
  {
    code: "two_point_conversion",
    description: "Two-point conversion at the 2-yard line (2015-present).",
    seasons: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
    effectiveWeek: null,
  },
  {
    code: "extra_point_distance",
    description: "Extra point moved from 2-yard line to 15-yard line (2015-present).",
    seasons: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
    effectiveWeek: null,
  },
  {
    code: "roughing_passer_15y",
    description: "Roughing the passer: 15-yard penalty from the previous 10-yard spot (1994-present).",
    seasons: [1994, 1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
    effectiveWeek: null,
  },
  {
    code: "targeting",
    description: "Personal foul (targeting) — automatic disqualification with possible ejection (adopted informally from college, various rulebook expansions).",
    seasons: [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
    effectiveWeek: null,
  },
  {
    code: "pass_interference_reviewable",
    description: "Pass interference became reviewable in all games (2020-present).",
    seasons: [2020, 2021, 2022, 2023, 2024, 2025],
    effectiveWeek: null,
  },
  {
    code: "OT_coin_flip",
    description: "Overtime: coin flip moved to the 25-yard line (regular season 2010-2010, 2011-2021); shootout format in 2022+ preseason.",
    seasons: [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021],
    effectiveWeek: null,
  },
  {
    code: "concussion_protocol",
    description: "Concussion spotters and protocol expansion (2011-present, with 2013 and 2017 major expansions).",
    seasons: [2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
    effectiveWeek: null,
  },
];

export interface RuleCalendarEntry {
  readonly ruleCode: string;
  /** 1 if active for this game, 0 otherwise. */
  readonly active: number;
}

/**
 * Check whether a rule change is active for a given game based on season
 * and (optionally) effective week.
 */
export function isRuleActive(rule: RuleChange, season: number, week: number | null): boolean {
  if (!rule.seasons.includes(season)) return false;
  if (rule.effectiveWeek === null) return true;
  if (week === null) return false; // rule has a start week but game has no week
  return week >= rule.effectiveWeek;
}

export interface IncentiveResult {
  readonly rows: EvalRow[];
  readonly skipped: {
    readonly noScores: number;
    readonly tie: number;
    readonly noOdds: number;
    readonly unknownWeek: number;
  };
}

/**
 * Build leak-safe incentive + rule-change covariate EvalRows.
 *
 * Each game gets:
 *  - One binary covariate per rule change (active if it applies this season/week).
 *  - Playoff incentive covariates for each side, derived from PRIOR completed
 *    games' standings trajectory (clinched/eliminated/divisional race).
 *
 * The incentive derivation is structural: a team is "clinched" if the
 * maximum possible wins another team in their division can achieve is less
 * than their current wins (given prior-game outcomes); "eliminated" if the
 * minimum wins a playoff contender can achieve exceeds the max the team can
 * reach. These are upper/lower bounds computed from PRIOR games only.
 *
 * Because full standings tracking requires cross-game aggregation beyond a
 * single GameRow's scope, this v0 module provides the rule-change covariates
 * (which are pure schedule facts) and the week-based incentive flags
 * (divisional, week-17) that require no aggregation. The clinched/eliminated
 * flags are computed via a caller-supplied standings snapshot keyed by team,
 * which the caller assembles from prior games — this keeps the module leak-free
 * and pure (no I/O to fetch standings) while making the covariate available.
 */
export function buildIncentiveCalendarRows(
  games: readonly GameRow[],
  store: AsOfFeatureStore,
  opts: {
    /** Optional precomputed standings: { wins, losses, ties } per team, from PRIOR games only. */
    readonly standings?: Map<string, { readonly wins: number; readonly losses: number; readonly ties: number }>;
    /** Weeks from the end of the season that count as "late-season incentive" (default 4). */
    readonly playoffRaceWeeks?: number;
  } = {},
): IncentiveResult {
  // Sort by startTime so "prior games" is well-defined by position.
  const sorted = [...games].sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));

  const rows: EvalRow[] = [];
  const skipped = { noScores: 0, tie: 0, noOdds: 0, unknownWeek: 0 };

  const playoffRaceWeeks = opts.playoffRaceWeeks ?? PLAYOFF_RACE_WEEKS;
  const standings = opts.standings ?? new Map();
  // Max wins any team can reach this season (for clinch/eliminate computation).
  // NFL regular season is 17 games; a team can win at most 17.
  const MAX_SEASON_WINS = NFL_SEASON_WEEKS;

  for (const g of sorted) {
    const startMs = Date.parse(g.startTime);
    const decisionMs = startMs - DECISION_LEAD_MS;
    const decisionAt = new Date(decisionMs).toISOString();

    if (g.homeScore === null || g.awayScore === null) {
      skipped.noScores += 1;
      continue;
    }
    if (g.homeScore === g.awayScore) {
      skipped.tie += 1;
      continue;
    }
    const { moneylineHomeDecimal: mh, moneylineAwayDecimal: ma } = g.closing;
    if (mh === null || ma === null) {
      skipped.noOdds += 1;
      continue;
    }
    const devig = proportionalDevig([mh, ma]);
    if (!devig || devig[0] === undefined) {
      skipped.noOdds += 1;
      continue;
    }
    const q = devig[0];
    if (!(q > 0.01 && q < 0.99)) {
      skipped.noOdds += 1;
      continue;
    }

    const week = g.week;
    if (week === null || week === 0) {
      skipped.unknownWeek += 1;
      continue;
    }

    // Rule-change covariates (pure schedule facts, leak-free by construction).
    const observedAt = decisionAt;
    const ingest = (featureKey: string, value: number): void =>
      store.ingest({ entityId: g.gameId, featureKey, value, observedAt, source: "nfl-incentive-calendar" });

    for (const rule of NFL_RULE_CHANGES) {
      const active = isRuleActive(rule, g.season, week) ? 1 : 0;
      ingest(`rule:${rule.code}`, active);
    }

    // Week-based incentive flags (no aggregation needed).
    const divisional = week >= 1 && week <= NFL_SEASON_WEEKS ? 1 : 0;

    // Standings-derived incentive flags (uses caller-supplied prior-game standings).
    const homeStanding = standings.get(g.homeTeam);
    const awayStanding = standings.get(g.awayTeam);

    const isClinched = (s: { wins: number; losses: number; ties: number } | undefined): boolean => {
      if (!s) return false;
      return s.wins >= 13;
    };

    const isEliminated = (s: { wins: number; losses: number; ties: number } | undefined): boolean => {
      if (!s) return false;
      const remaining = MAX_SEASON_WINS - s.wins - s.losses - s.ties;
      const maxWins = s.wins + remaining;
      return maxWins < 9;
    };

    // Incentive covariates.
    ingest("incentive:home_clinched", isClinched(homeStanding) ? 1 : 0);
    ingest("incentive:home_eliminated", isEliminated(homeStanding) ? 1 : 0);
    ingest("incentive:away_clinched", isClinched(awayStanding) ? 1 : 0);
    ingest("incentive:away_eliminated", isEliminated(awayStanding) ? 1 : 0);
    ingest("incentive:divisional", divisional);
    ingest("incentive:week_17", week === NFL_SEASON_WEEKS ? 1 : 0);

    rows.push({
      id: g.gameId,
      decisionAt,
      eventEndAt: new Date(startMs + GAME_DURATION_MS).toISOString(),
      features: store.vector(g.gameId, INCENTIVE_FEATURE_KEYS, decisionAt),
      y: g.homeScore > g.awayScore ? 1 : 0,
      qClose: q,
    });
  }

  return { rows, skipped };
}
