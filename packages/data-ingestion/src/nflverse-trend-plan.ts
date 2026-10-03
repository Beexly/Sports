import type { NflverseDatasetKey } from "./nflverse-source.js";

export type TrendPlanKey =
  | "qb-age-rb-target-share"
  | "birthday-usage"
  | "rest-route-participation"
  | "injury-cascade"
  | "ngs-separation-buy-low";

export interface NflverseJoinStep {
  readonly from: NflverseDatasetKey;
  readonly to: NflverseDatasetKey;
  readonly on: readonly string[];
  readonly purpose: string;
}

export interface NflverseTrendPlan {
  readonly key: TrendPlanKey;
  readonly title: string;
  readonly grain: "player-week" | "team-week" | "player-game";
  readonly metric: string;
  readonly cohortFeature: string;
  readonly requiredDatasets: readonly NflverseDatasetKey[];
  readonly joins: readonly NflverseJoinStep[];
  readonly minimumSeasons: number;
  readonly minimumObservations: number;
  readonly publicUntilReady: "empty-state-only";
}

export const NFLVERSE_TREND_PLANS: Readonly<Record<TrendPlanKey, NflverseTrendPlan>> = {
  "qb-age-rb-target-share": {
    key: "qb-age-rb-target-share",
    title: "Quarterback age vs running back target share",
    grain: "team-week",
    metric: "team RB targets / team pass attempts",
    cohortFeature: "starting_qb_age_bucket",
    requiredDatasets: ["players", "rosters", "player_stats_week", "snap_counts", "schedules"],
    joins: [
      {
        from: "player_stats_week",
        to: "rosters",
        on: ["season", "player_id"],
        purpose: "Attach player position, team, and season roster identity.",
      },
      {
        from: "rosters",
        to: "players",
        on: ["gsis_id"],
        purpose: "Attach birth date so quarterback age can be bucketed at game week.",
      },
      {
        from: "player_stats_week",
        to: "snap_counts",
        on: ["season", "week", "player_id", "team"],
        purpose: "Confirm active workload and starting-role evidence.",
      },
      {
        from: "player_stats_week",
        to: "schedules",
        on: ["season", "week", "team"],
        purpose: "Bind player-week rows to game context, opponent, rest, venue, and result.",
      },
    ],
    minimumSeasons: 5,
    minimumObservations: 500,
    publicUntilReady: "empty-state-only",
  },
  "birthday-usage": {
    key: "birthday-usage",
    title: "Birthday and milestone usage",
    grain: "player-week",
    metric: "usage delta vs prior four player weeks",
    cohortFeature: "birthday_or_milestone_window",
    requiredDatasets: ["players", "rosters", "player_stats_week", "snap_counts"],
    joins: [
      {
        from: "player_stats_week",
        to: "players",
        on: ["player_id"],
        purpose: "Attach date of birth for birthday-week cohorts.",
      },
      {
        from: "player_stats_week",
        to: "snap_counts",
        on: ["season", "week", "player_id", "team"],
        purpose: "Separate true role changes from box-score noise.",
      },
    ],
    minimumSeasons: 5,
    minimumObservations: 1000,
    publicUntilReady: "empty-state-only",
  },
  "rest-route-participation": {
    key: "rest-route-participation",
    title: "Rest disadvantage vs route participation",
    grain: "player-week",
    metric: "route or snap participation delta",
    cohortFeature: "rest_and_travel_bucket",
    requiredDatasets: ["schedules", "snap_counts", "pbp_participation"],
    joins: [
      {
        from: "snap_counts",
        to: "schedules",
        on: ["season", "week", "team"],
        purpose: "Attach rest, travel, opponent, roof, surface, and kickoff context.",
      },
      {
        from: "pbp_participation",
        to: "snap_counts",
        on: ["season", "week", "player_id", "team"],
        purpose: "Connect play-level participation to weekly workload totals.",
      },
    ],
    minimumSeasons: 3,
    minimumObservations: 1000,
    publicUntilReady: "empty-state-only",
  },
  "injury-cascade": {
    key: "injury-cascade",
    title: "Depth-chart injury cascade",
    grain: "player-week",
    metric: "snap and target share lift after teammate injury designation",
    cohortFeature: "teammate_availability_bucket",
    requiredDatasets: ["injuries", "depth_charts", "player_stats_week", "snap_counts"],
    joins: [
      {
        from: "injuries",
        to: "depth_charts",
        on: ["season", "week", "team", "position"],
        purpose: "Identify which role opened when a starter was limited or ruled out.",
      },
      {
        from: "depth_charts",
        to: "player_stats_week",
        on: ["season", "week", "team", "player_id"],
        purpose: "Measure who absorbed targets, carries, and production.",
      },
      {
        from: "player_stats_week",
        to: "snap_counts",
        on: ["season", "week", "player_id", "team"],
        purpose: "Measure whether production was backed by real usage.",
      },
    ],
    minimumSeasons: 5,
    minimumObservations: 750,
    publicUntilReady: "empty-state-only",
  },
  "ngs-separation-buy-low": {
    key: "ngs-separation-buy-low",
    title: "Separation without box-score payoff",
    grain: "player-week",
    metric: "receiving production vs tracking-quality opportunity",
    cohortFeature: "high_separation_low_output",
    requiredDatasets: ["ngs", "player_stats_week", "pfr_advstats"],
    joins: [
      {
        from: "ngs",
        to: "player_stats_week",
        on: ["season", "week", "player_id", "team"],
        purpose: "Compare tracking separation to targets, air yards, and output.",
      },
      {
        from: "pfr_advstats",
        to: "player_stats_week",
        on: ["season", "week", "player_id", "team"],
        purpose: "Add charting context such as ADOT, YAC, and pressure-adjacent splits.",
      },
    ],
    minimumSeasons: 3,
    minimumObservations: 500,
    publicUntilReady: "empty-state-only",
  },
};

export function getNflverseTrendPlan(key: TrendPlanKey): NflverseTrendPlan {
  return NFLVERSE_TREND_PLANS[key];
}

export function datasetsForTrendPlans(keys: readonly TrendPlanKey[]): NflverseDatasetKey[] {
  const ordered: NflverseDatasetKey[] = [];
  const seen = new Set<NflverseDatasetKey>();
  for (const key of keys) {
    for (const dataset of NFLVERSE_TREND_PLANS[key].requiredDatasets) {
      if (!seen.has(dataset)) {
        seen.add(dataset);
        ordered.push(dataset);
      }
    }
  }
  return ordered;
}
