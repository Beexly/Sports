/**
 * Stat distribution contract — "all stats feed into all systems".
 *
 * Maps every nflverse dataset in NFLVERSE_CATALOG to the platform systems that
 * consume (or should consume) it, with an HONEST status per edge that reflects
 * the real wiring as audited on 2026-06-12:
 *
 * - LIVE          — a real consumer exists in the codebase today (verified by
 *                   tracing an actual loader/fetch into a rendered surface).
 * - AVAILABLE     — the dataset is catalogued and fetchable (nflverse-source)
 *                   and the edge is planned/sensible, but no consumer is wired
 *                   yet. This is the non-model wiring backlog.
 * - FOUNDER_GATED — feeding this dataset into LIVE model scoring requires
 *                   founder approval, recalibration of confidence against
 *                   historical results, and a MODEL_VERSION bump (CLAUDE.md:
 *                   confidence scores must stay calibrated; picks are versioned
 *                   and auditable). Every PREDICTION_MODEL edge is gated — no
 *                   exceptions.
 *
 * Verified-LIVE audit trail (do not mark an edge LIVE without this kind of
 * evidence):
 *
 * PLAYERS_LAB — apps/web/lib/players/views.tsx (rendered at /players via
 * apps/web/app/players/page.tsx + components/players/player-lab-table.tsx):
 *   player_stats_week → lib/nflverse/player-lab.ts, edge-signals.ts,
 *                       lib/intelligence/receiving-opportunity.ts
 *   rosters           → lib/nflverse/player-lab.ts
 *   snap_counts       → lib/nflverse/snap-share.ts
 *   ngs               → lib/nflverse/next-gen-stats.ts (+ rushing-efficiency,
 *                       qb-consensus, edge-signals ngs_receiving)
 *   pfr_advstats      → lib/nflverse/pressure-coverage.ts
 *   combine           → lib/nflverse/combine.ts
 *   espn_qbr_week     → lib/nflverse/qbr.ts (+ lib/intelligence/qb-consensus.ts)
 *   injuries          → lib/nflverse/injury-report.ts
 *
 * TRENDS — apps/web/app/trends/page.tsx:
 *   player_stats_week, players, schedules → lib/nflverse/qb-age-rb-trend.ts and
 *                       lib/nflverse/birthday-usage-trend.ts (real fetch+compute)
 *   rosters, snap_counts → lib/trends/nflverse-readiness.ts runtime probe of the
 *                       default "qb-age-rb-target-share" plan's requiredDatasets
 *
 * SIGNALS, CONTENT, GALAXY_TWIN — audited; NO nflverse dataset is consumed by
 * packages/prediction-engine/src/signal-snapshot.ts,
 * packages/data-ingestion/src/context-enrichment.ts (DB-derived rest/density),
 * apps/web/lib/{content-engine,journal,twitter-bot,discord-bot},
 * apps/web/components/{world,slate-twin}, or apps/web/app/observatory today.
 * All edges into those systems are AVAILABLE.
 *
 * PREDICTION_MODEL — packages/prediction-engine has zero nflverse references
 * today; every model edge is FOUNDER_GATED by invariant.
 *
 * Note: apps/web/lib/intelligence/** engines (e.g. scoring-zone, team-environment
 * consuming pbp; clv-calibration consuming schedules) are real consumers but live
 * outside the six contract systems; they are recorded in edge notes only.
 */
import type { NflverseDatasetKey } from "./nflverse-source.js";

export type StatSystem =
  | "PLAYERS_LAB"
  | "TRENDS"
  | "SIGNALS"
  | "CONTENT"
  | "GALAXY_TWIN"
  | "PREDICTION_MODEL";

export type FeedStatus = "LIVE" | "AVAILABLE" | "FOUNDER_GATED";

export interface StatFeedEdge {
  readonly system: StatSystem;
  readonly status: FeedStatus;
  readonly note?: string;
}

const GATED_MODEL_NOTE =
  "Wiring into live scoring requires founder approval, recalibration against historical results, and a MODEL_VERSION bump.";

function edges(...list: StatFeedEdge[]): ReadonlyArray<StatFeedEdge> {
  return list;
}

function gatedModelEdge(note: string): StatFeedEdge {
  return {
    system: "PREDICTION_MODEL",
    status: "FOUNDER_GATED",
    note: `${note} ${GATED_MODEL_NOTE}`,
  };
}

export const STAT_DISTRIBUTION: Readonly<
  Record<NflverseDatasetKey, ReadonlyArray<StatFeedEdge>>
> = {
  pbp: edges(
    {
      system: "PLAYERS_LAB",
      status: "AVAILABLE",
      note: "Loader exists (apps/web/lib/nflverse/pbp.ts) but is consumed by /intelligence engines (scoring-zone, team-environment), not the /players lab.",
    },
    { system: "TRENDS", status: "AVAILABLE", note: "Per-play EPA/pace cohorts not yet planned in NFLVERSE_TREND_PLANS." },
    { system: "SIGNALS", status: "AVAILABLE", note: "Pace/EPA enrichment candidate; context-enrichment derives rest/density from DB only today." },
    { system: "CONTENT", status: "AVAILABLE", note: "Data-backed EPA/efficiency claims for briefs and posts." },
    { system: "GALAXY_TWIN", status: "AVAILABLE", note: "Per-play efficiency texture for slate-twin/world visuals." },
    gatedModelEdge("EPA/success-rate team true-talent features."),
  ),
  pbp_participation: edges(
    { system: "TRENDS", status: "AVAILABLE", note: "Declared in rest-route-participation plan requiredDatasets; plan not computed yet." },
    { system: "SIGNALS", status: "AVAILABLE", note: "Box counts / personnel context signals." },
    { system: "PLAYERS_LAB", status: "AVAILABLE", note: "Route participation views; no loader yet." },
    gatedModelEdge("Personnel/box-count scheme features."),
  ),
  player_stats_week: edges(
    {
      system: "PLAYERS_LAB",
      status: "LIVE",
      note: "lib/nflverse/player-lab.ts, edge-signals.ts, lib/intelligence/receiving-opportunity.ts → /players views.",
    },
    {
      system: "TRENDS",
      status: "LIVE",
      note: "qb-age-rb-trend.ts + birthday-usage-trend.ts compute on /trends; also probed by nflverse-readiness.ts.",
    },
    { system: "SIGNALS", status: "AVAILABLE", note: "Usage/target-share deltas as pick context." },
    { system: "CONTENT", status: "AVAILABLE", note: "Data-backed usage claims in generated content." },
    gatedModelEdge("Player usage/efficiency features."),
  ),
  snap_counts: edges(
    { system: "PLAYERS_LAB", status: "LIVE", note: "lib/nflverse/snap-share.ts → /players snaps view." },
    {
      system: "TRENDS",
      status: "LIVE",
      note: "Runtime readiness probe of the default qb-age-rb-target-share plan (lib/trends/nflverse-readiness.ts) on /trends; also in three plan requiredDatasets.",
    },
    { system: "SIGNALS", status: "AVAILABLE", note: "Snap-share workload shifts as availability/usage signal." },
    gatedModelEdge("True workload (snap share) features."),
  ),
  ngs: edges(
    { system: "PLAYERS_LAB", status: "LIVE", note: "lib/nflverse/next-gen-stats.ts (+ rushing-efficiency, qb-consensus, edge-signals) → /players nextgen view." },
    { system: "TRENDS", status: "AVAILABLE", note: "Declared in ngs-separation-buy-low plan requiredDatasets; plan not computed yet." },
    { system: "CONTENT", status: "AVAILABLE", note: "Tracking-derived nuggets (separation, time-to-throw) for content." },
    gatedModelEdge("Tracking-derived talent features (separation, cushion)."),
  ),
  pfr_advstats: edges(
    { system: "PLAYERS_LAB", status: "LIVE", note: "lib/nflverse/pressure-coverage.ts → /players trenches view." },
    { system: "TRENDS", status: "AVAILABLE", note: "Declared in ngs-separation-buy-low plan requiredDatasets; plan not computed yet." },
    gatedModelEdge("Pressure/missed-tackle charting features."),
  ),
  ftn_charting: edges(
    { system: "TRENDS", status: "AVAILABLE", note: "Play-design cohorts (play action, RPO, screen) not yet planned." },
    { system: "SIGNALS", status: "AVAILABLE", note: "Play-design context the market rarely prices." },
    gatedModelEdge("Play-design context features."),
  ),
  depth_charts: edges(
    {
      system: "PLAYERS_LAB",
      status: "AVAILABLE",
      note: "Loader exists (lib/nflverse/depth-charts.ts, used by lib/intelligence/opportunity-transfer.ts) but no /players lab view consumes it yet.",
    },
    { system: "TRENDS", status: "AVAILABLE", note: "Declared in injury-cascade plan requiredDatasets; plan not computed yet." },
    { system: "SIGNALS", status: "AVAILABLE", note: "Starter/role status for usage and injury cascades." },
    gatedModelEdge("Role/starter-status features."),
  ),
  injuries: edges(
    { system: "PLAYERS_LAB", status: "LIVE", note: "lib/nflverse/injury-report.ts → /players injuries view." },
    { system: "TRENDS", status: "AVAILABLE", note: "Declared in injury-cascade plan requiredDatasets; plan not computed yet." },
    { system: "SIGNALS", status: "AVAILABLE", note: "Availability — highest-value non-market factor; not in signal snapshots yet." },
    { system: "CONTENT", status: "AVAILABLE", note: "Confirmed injury status (never rumor) for data-backed content." },
    gatedModelEdge("Availability features for game outcomes."),
  ),
  rosters: edges(
    { system: "PLAYERS_LAB", status: "LIVE", note: "lib/nflverse/player-lab.ts joins rosters for identity/position." },
    {
      system: "TRENDS",
      status: "LIVE",
      note: "Runtime readiness probe of the default plan (lib/trends/nflverse-readiness.ts) on /trends; in two plan requiredDatasets.",
    },
    gatedModelEdge("Player identity/age join spine (gsis_id)."),
  ),
  espn_qbr_week: edges(
    { system: "PLAYERS_LAB", status: "LIVE", note: "lib/nflverse/qbr.ts (+ lib/intelligence/qb-consensus.ts) → /players qbr view." },
    { system: "CONTENT", status: "AVAILABLE", note: "Independent QB quality estimate for triangulated claims." },
    gatedModelEdge("Second independent QB quality feature."),
  ),
  players: edges(
    {
      system: "TRENDS",
      status: "LIVE",
      note: "qb-age-rb-trend.ts + birthday-usage-trend.ts fetch players.csv for birth dates on /trends.",
    },
    { system: "PLAYERS_LAB", status: "AVAILABLE", note: "Cross-season identity/bio not yet surfaced in lab views (lab uses season rosters)." },
    gatedModelEdge("Stable player identity + age priors."),
  ),
  schedules: edges(
    {
      system: "TRENDS",
      status: "LIVE",
      note: "qb-age-rb-trend.ts + birthday-usage-trend.ts join games.csv on /trends; also in default-plan readiness probe.",
    },
    {
      system: "SIGNALS",
      status: "AVAILABLE",
      note: "Rest/roof/surface context; context-enrichment computes rest from DB today, not nflverse. (lib/intelligence/clv-calibration.ts consumes it outside this contract.)",
    },
    { system: "GALAXY_TWIN", status: "AVAILABLE", note: "Authoritative game master for slate visuals." },
    gatedModelEdge("Rest/venue/closing-line context features."),
  ),
  draft_picks: edges(
    { system: "PLAYERS_LAB", status: "AVAILABLE", note: "Draft capital column for player views; no loader yet." },
    { system: "CONTENT", status: "AVAILABLE", note: "Draft-pedigree facts for player content." },
    gatedModelEdge("Draft-capital talent priors for young players."),
  ),
  combine: edges(
    { system: "PLAYERS_LAB", status: "LIVE", note: "lib/nflverse/combine.ts → /players combine view." },
    { system: "CONTENT", status: "AVAILABLE", note: "Athletic-testing facts for player content." },
    gatedModelEdge("Athletic testing priors."),
  ),
  officials: edges(
    { system: "SIGNALS", status: "AVAILABLE", note: "Crew flag/pace tendencies as totals context." },
    { system: "TRENDS", status: "AVAILABLE", note: "Crew-level penalty/pace cohorts not yet planned." },
    gatedModelEdge("Referee-crew tendency features for totals."),
  ),
  stats_team: edges(
    { system: "TRENDS", status: "AVAILABLE", note: "Team-week aggregates without rolling up pbp ourselves." },
    { system: "SIGNALS", status: "AVAILABLE", note: "Team-week form context for picks." },
    { system: "GALAXY_TWIN", status: "AVAILABLE", note: "Team-week aggregates for slate-twin texture." },
    gatedModelEdge("Team-week aggregate features."),
  ),
  contracts: edges(
    { system: "PLAYERS_LAB", status: "AVAILABLE", note: "Paid-like-a-starter context for player views; no loader yet." },
    { system: "CONTENT", status: "AVAILABLE", note: "Contract/investment facts for player content." },
    gatedModelEdge("Salary/investment role priors."),
  ),
  teams: edges(
    { system: "PLAYERS_LAB", status: "AVAILABLE", note: "Canonical team join keys across rebrands/relocations." },
    { system: "GALAXY_TWIN", status: "AVAILABLE", note: "Team identity/branding metadata for world visuals." },
    { system: "CONTENT", status: "AVAILABLE", note: "Canonical team naming for generated content." },
    gatedModelEdge("Canonical team join keys (metadata only)."),
  ),
  trades: edges(
    { system: "TRENDS", status: "AVAILABLE", note: "Post-trade usage-shift cohorts not yet planned." },
    { system: "CONTENT", status: "AVAILABLE", note: "Roster-churn facts for content." },
    gatedModelEdge("Acquisition-cost / mid-season movement signals."),
  ),
};

/** All system edges declared for a dataset. */
export function systemsForDataset(key: NflverseDatasetKey): ReadonlyArray<StatFeedEdge> {
  return STAT_DISTRIBUTION[key];
}

/** All datasets with an edge into the given system, with each edge's status. */
export function datasetsForSystem(
  system: StatSystem,
): Array<{ dataset: NflverseDatasetKey; status: FeedStatus; note?: string }> {
  const out: Array<{ dataset: NflverseDatasetKey; status: FeedStatus; note?: string }> = [];
  for (const [dataset, edgeList] of Object.entries(STAT_DISTRIBUTION) as Array<
    [NflverseDatasetKey, ReadonlyArray<StatFeedEdge>]
  >) {
    for (const edge of edgeList) {
      if (edge.system === system) {
        out.push({ dataset, status: edge.status, note: edge.note });
      }
    }
  }
  return out;
}

/** Datasets whose PREDICTION_MODEL edge is founder-gated (i.e. all of them that have one). */
export function gatedModelDatasets(): NflverseDatasetKey[] {
  return datasetsForSystem("PREDICTION_MODEL")
    .filter((entry) => entry.status === "FOUNDER_GATED")
    .map((entry) => entry.dataset);
}

/** Every verified-LIVE dataset→system edge in the contract. */
export function liveEdges(): Array<{ dataset: NflverseDatasetKey; system: StatSystem; note?: string }> {
  const out: Array<{ dataset: NflverseDatasetKey; system: StatSystem; note?: string }> = [];
  for (const [dataset, edgeList] of Object.entries(STAT_DISTRIBUTION) as Array<
    [NflverseDatasetKey, ReadonlyArray<StatFeedEdge>]
  >) {
    for (const edge of edgeList) {
      if (edge.status === "LIVE") {
        out.push({ dataset, system: edge.system, note: edge.note });
      }
    }
  }
  return out;
}
