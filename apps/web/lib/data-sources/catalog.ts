import { NFLVERSE_CATALOG } from "@sports/data-ingestion";

export type SourceCost = "free" | "low-cost" | "paid-optional" | "owned" | "licensed";
export type SourceStatus =
  | "wired"
  | "adapter-ready"
  | "scheduled-code"
  | "manual-ingest"
  | "founder-gated"
  | "permission-required"
  | "planned";

export interface DataSourceCard {
  readonly key: string;
  readonly name: string;
  /**
   * Front-of-house label. Public surfaces render THIS, never `name`:
   * the engine speaks in its own capability language and does not name
   * vendors/connectors on the front of the tool. Real source names and
   * license attribution live on the deeper /integrations and /nflverse
   * pages, which is where compliance points.
   */
  readonly publicLabel: string;
  readonly cost: SourceCost;
  readonly status: SourceStatus;
  readonly grain: string;
  readonly unlocks: string;
  readonly liveClaim: string;
  readonly complianceNote?: string;
}

export interface TrendBacklogItem {
  readonly key: string;
  readonly title: string;
  readonly question: string;
  readonly metric: string;
  readonly cohort: string;
  readonly requiredSources: readonly string[];
  readonly status: "waiting-for-real-observations" | "engine-ready";
}

const NFLVERSE_PRIORITY_KEYS = [
  "players",
  "rosters",
  "player_stats_week",
  "snap_counts",
  "pbp",
  "pbp_participation",
  "ngs",
  "pfr_advstats",
  "injuries",
  "schedules",
] as const;

/** Capability codenames for the intake lanes — our language, not the vendor's. */
const LANE_LABELS: Record<(typeof NFLVERSE_PRIORITY_KEYS)[number], string> = {
  players: "Player identity spine",
  rosters: "Roster spine",
  player_stats_week: "Weekly production lane",
  snap_counts: "Snap workload lane",
  pbp: "Play-by-play substrate",
  pbp_participation: "Route participation lane",
  ngs: "Tracking & separation lane",
  pfr_advstats: "Advanced charting lane",
  injuries: "Injury designation lane",
  schedules: "Schedule & rest lane",
};

export const PUBLIC_DATA_SOURCES: readonly DataSourceCard[] = [
  ...NFLVERSE_PRIORITY_KEYS.map((key): DataSourceCard => {
    const dataset = NFLVERSE_CATALOG[key];
    return {
      key: dataset.key,
      name: `nflverse ${dataset.key}`,
      publicLabel: LANE_LABELS[key],
      cost: "free",
      status: "adapter-ready",
      grain: dataset.grain,
      unlocks: dataset.unlocks,
      liveClaim: "Fetch adapter exists; database writes are not live yet.",
    };
  }),
  {
    key: "the-odds-api",
    name: "The Odds API",
    publicLabel: "Market pricing mesh",
    cost: "low-cost",
    status: "scheduled-code",
    grain: "game-market",
    unlocks: "Live odds, market depth, line movement, and settlement context.",
    liveClaim: "Cron and worker code exist; run history and row counts are not proven in this checkout.",
  },
  {
    key: "sleeper",
    name: "Sleeper public API",
    publicLabel: "League sync bridge",
    cost: "free",
    status: "wired",
    grain: "fantasy-roster",
    unlocks: "Read-only roster sync without OAuth or league write permissions.",
    liveClaim: "Read-only connect surface exists; recommendations still need a live projections provider.",
  },
  {
    key: "premium-charting",
    name: "Premium charting overlays",
    publicLabel: "Premium charting overlays",
    cost: "paid-optional",
    status: "planned",
    grain: "player-play",
    unlocks: "PFF-style grades, route participation, defensive charting, and proprietary signal checks.",
    liveClaim: "Optional overlay only; the base engine must be useful before paid data spend expands.",
  },
];

export const CONTEXT_INTELLIGENCE_SOURCES: readonly DataSourceCard[] = [
  {
    key: "airwave-transcript-spreadsheet",
    name: "Airwave transcript spreadsheet",
    publicLabel: "Broadcast claims engine",
    cost: "owned",
    status: "founder-gated",
    grain: "show-segment / claim",
    unlocks:
      "Turns show schedules, transcripts, and translated segments into timestamped claims, breaking-news notes, and settlement-ready pundit rows.",
    liveClaim:
      "Airwave scoring, redaction, public ledger, and cockpit review code exist; live capture remains held by legal/source gates.",
    complianceNote:
      "Use freely published podcast or video feeds first. Satellite-radio capture requires explicit legal acknowledgement before any automation.",
  },
  {
    key: "beat-reporter-source-mesh",
    name: "Beat reporter source mesh",
    publicLabel: "Beat intelligence mesh",
    cost: "licensed",
    status: "founder-gated",
    grain: "report / player / team",
    unlocks:
      "Reliability-scored injuries, role changes, weather, practice notes, and scheme context for The Beat and pick evidence trails.",
    liveClaim:
      "National insider seeds and per-team source slots exist; local beat names populate only from licensed or official feeds.",
    complianceNote:
      "Cite outlet and reporter where known; do not reproduce full articles or unlicensed paywalled text.",
  },
  {
    key: "galaxy-studio-asset-engine",
    name: "Galaxy Studio asset engine",
    publicLabel: "Studio asset engine",
    cost: "owned",
    status: "wired",
    grain: "approved-game / creator asset",
    unlocks:
      "Converts real game nodes, picks, and source context into reviewed briefs, reels, newsletters, and social scripts.",
    liveClaim:
      "Cockpit Studio and template generation exist; output quality depends on real game rows and operator review.",
  },
  {
    key: "scores24-reference",
    name: "Scores24 reference feed",
    publicLabel: "International reference lane",
    cost: "licensed",
    status: "permission-required",
    grain: "match / market / trend",
    unlocks:
      "Broad international score, schedule, prediction, and trend coverage useful as a licensed benchmark or partnership feed.",
    liveClaim:
      "Research candidate only. No scraper or automated interaction is wired.",
    complianceNote:
      "Scores24 terms require consent for non-personal/commercial use of site information and prohibit automated programs interacting with the site.",
  },
];

export const DATA_SOURCE_STACK: readonly DataSourceCard[] = [
  ...PUBLIC_DATA_SOURCES,
  ...CONTEXT_INTELLIGENCE_SOURCES,
];

export const TREND_BACKLOG: readonly TrendBacklogItem[] = [
  {
    key: "qb-age-rb-target-share",
    title: "Quarterback age vs running back target share",
    question: "Do older quarterbacks route more of the passing game through backs?",
    metric: "team RB target share by week",
    cohort: "starting QB age bands",
    requiredSources: ["players", "rosters", "player_stats_week", "snap_counts", "schedules"],
    status: "engine-ready",
  },
  {
    key: "birthday-usage",
    title: "Birthday and milestone usage",
    question: "Do birthdays, career milestones, or record chases move route share, target share, or snap share?",
    metric: "player usage delta vs prior four weeks",
    cohort: "birthday week, milestone week, contract incentive window",
    requiredSources: ["players", "rosters", "player_stats_week", "snap_counts"],
    status: "waiting-for-real-observations",
  },
  {
    key: "rest-route-participation",
    title: "Rest disadvantage vs route participation",
    question: "Which positions lose routes first when a team is stressed by rest and travel?",
    metric: "route/snap participation delta",
    cohort: "short rest, travel distance, divisional rematch",
    requiredSources: ["schedules", "snap_counts", "pbp_participation"],
    status: "waiting-for-real-observations",
  },
  {
    key: "injury-cascade",
    title: "Depth-chart injury cascade",
    question: "Which backup roles become real usage instead of projection noise when a starter is limited?",
    metric: "target/snap share lift after teammate injury designation",
    cohort: "starter out, starter limited, starter questionable",
    requiredSources: ["injuries", "depth_charts", "player_stats_week", "snap_counts"],
    status: "waiting-for-real-observations",
  },
  {
    key: "ngs-separation-buy-low",
    title: "Separation without box-score payoff",
    question: "Which receivers are getting open before the box score catches up?",
    metric: "target, air-yard, and receiving production delta",
    cohort: "high separation, low fantasy output",
    requiredSources: ["ngs", "player_stats_week", "pfr_advstats"],
    status: "waiting-for-real-observations",
  },
];

export function sourceStatusLabel(status: SourceStatus): string {
  switch (status) {
    case "wired":
      return "wired";
    case "adapter-ready":
      return "adapter ready";
    case "scheduled-code":
      return "scheduled code";
    case "manual-ingest":
      return "manual ingest";
    case "founder-gated":
      return "founder gated";
    case "permission-required":
      return "permission required";
    case "planned":
      return "planned";
  }
}

export function sourceCostLabel(cost: SourceCost): string {
  switch (cost) {
    case "free":
      return "$0";
    case "low-cost":
      return "low cost";
    case "paid-optional":
      return "paid optional";
    case "owned":
      return "owned";
    case "licensed":
      return "licensed";
  }
}
