/**
 * Real-time data hydration strategies for GSE Stats API.
 *
 * Law (non-negotiable):
 *  - PIT asOf is the read contract — hydration never rewrites history silently
 *  - Freshness is measured, not marketed
 *  - Refuse-default: stale / missing → null or 503, never fabricate
 *  - Paid sources (Odds API) only when free path cannot cover
 *
 * Strategies (choose per source cadence, not one global hammer):
 */

export type HydrationStrategyId =
  | "batch_snapshot" // daily/weekly CSV dumps (nflverse releases)
  | "ttl_cache_poll" // poll free API with per-dataset TTL
  | "cron_delta" // Vercel cron incremental upsert
  | "event_push" // webhook / Stripe-style push
  | "sse_stream" // server-sent events to clients
  | "write_through" // write SoR then invalidate cache
  | "read_repair" // on miss, fetch-and-fill once
  | "feast_materialize" // offline→online feature store job
  | "hybrid_hot_cold"; // hot path odds + cold path historical

export type CadenceClass =
  | "sub_minute" // in-play / line steam
  | "few_minutes" // pre-game odds, weather
  | "hourly" // player status
  | "daily" // box scores after slate
  | "weekly" // advanced aggregates
  | "seasonal" // rosters, contracts
  | "on_demand"; // research CV eval

export interface HydrationStrategy {
  readonly id: HydrationStrategyId;
  readonly name: string;
  readonly description: string;
  readonly latencyBudgetMs: { min: number; target: number; max: number };
  readonly pitSafe: boolean;
  readonly costProfile: "free" | "paid_metered" | "compute";
  readonly failureMode: string;
  readonly gseFit: string;
}

export const HYDRATION_STRATEGIES: readonly HydrationStrategy[] = [
  {
    id: "batch_snapshot",
    name: "Batch snapshot ingest",
    description:
      "Pull versioned dumps (nflverse release assets). Materialize into SoR. Values are as-of release time, not live.",
    latencyBudgetMs: { min: 3_600_000, target: 86_400_000, max: 604_800_000 },
    pitSafe: true,
    costProfile: "free",
    failureMode: "Serve last good snapshot; mark freshness lag; never invent rows",
    gseFit: "Primary for nfl.* box/pbp/NGS. Matches existing nflverse-cache TTLs.",
  },
  {
    id: "ttl_cache_poll",
    name: "TTL-cached poll",
    description:
      "Poll free/legal APIs on a schedule; cache success for dataset TTL; integrity-validate body.",
    latencyBudgetMs: { min: 30_000, target: 300_000, max: 3_600_000 },
    pitSafe: true,
    costProfile: "free",
    failureMode: "On fetch fail: serve cache if unexpired; else refuse values (null)",
    gseFit: "Open-Meteo weather, ESPN scores, henrygd NCAA, OpenF1.",
  },
  {
    id: "cron_delta",
    name: "Cron delta upsert",
    description:
      "Vercel cron (e.g. */30) pulls only changed windows (season week, slate day) and upserts.",
    latencyBudgetMs: { min: 300_000, target: 1_800_000, max: 3_600_000 },
    pitSafe: true,
    costProfile: "free",
    failureMode: "Idempotent upsert; partial success OK; circuit-break paid paths",
    gseFit: "Existing refresh-odds, ingest-player-stats, refresh-player-stats crons.",
  },
  {
    id: "event_push",
    name: "Event push / webhook",
    description:
      "Source pushes mutations (Stripe webhooks pattern). Hydrator applies event to SoR + memory.",
    latencyBudgetMs: { min: 100, target: 2_000, max: 30_000 },
    pitSafe: true,
    costProfile: "free",
    failureMode: "At-least-once: idempotent event keys; DLQ for poison",
    gseFit: "Billing entitlements already. Future: settlement webhooks if vendor supports.",
  },
  {
    id: "sse_stream",
    name: "SSE / stream fanout",
    description:
      "Server hydrates then streams deltas to cockpit clients. Not a source of truth — projection only.",
    latencyBudgetMs: { min: 50, target: 500, max: 5_000 },
    pitSafe: false, // stream is presentation; SoR remains PIT
    costProfile: "compute",
    failureMode: "Client reconnect; last-event-id resume; never trust client as truth",
    gseFit: "Cockpit live board WHEN founder flips LIVE_BOARD — dark until then.",
  },
  {
    id: "write_through",
    name: "Write-through SoR",
    description:
      "Ingest writes DB first, then updates NflverseMemoryStore / Redis. Read path only hits memory if asOf ≤ stored.",
    latencyBudgetMs: { min: 10, target: 100, max: 1_000 },
    pitSafe: true,
    costProfile: "compute",
    failureMode: "DB is authority; memory miss → read_repair or null",
    gseFit: "Target architecture for /api/gse/v1/values after Prisma hydrate.",
  },
  {
    id: "read_repair",
    name: "Read repair on miss",
    description:
      "On cache miss for ACTIVE public metric, fetch single entity from source once, fill memory, return.",
    latencyBudgetMs: { min: 50, target: 800, max: 5_000 },
    pitSafe: true,
    costProfile: "paid_metered",
    failureMode: "Timeout → null; never partial fabricate; rate-limit per entity",
    gseFit: "Weather lat,lon; single-player box; not for bulk pbp.",
  },
  {
    id: "feast_materialize",
    name: "Feast materialize",
    description:
      "Offline store → online store materialization for feature_id × entity × as_of.",
    latencyBudgetMs: { min: 60_000, target: 900_000, max: 3_600_000 },
    pitSafe: true,
    costProfile: "compute",
    failureMode: "Materialize lag surfaces as freshness; public_api_eligible gate still applies",
    gseFit: "packages/feature-store Feast stubs already present.",
  },
  {
    id: "hybrid_hot_cold",
    name: "Hybrid hot/cold plane",
    description:
      "Hot: odds/line movement under dynamic freshness. Cold: historical stats batch. Join at read with dual asOf.",
    latencyBudgetMs: { min: 1_000, target: 60_000, max: 300_000 },
    pitSafe: true,
    costProfile: "paid_metered",
    failureMode: "If hot stale: refuse fire (selective gate), still serve cold historical",
    gseFit: "Core GSE edge product: e = p_cold_model − q_hot_market.",
  },
];

export function strategyById(id: HydrationStrategyId): HydrationStrategy | undefined {
  return HYDRATION_STRATEGIES.find((s) => s.id === id);
}
