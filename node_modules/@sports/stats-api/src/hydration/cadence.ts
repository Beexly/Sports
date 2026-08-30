/**
 * Per-family hydration cadence matrix — which strategy owns which metric prefixes.
 */

import type { CadenceClass, HydrationStrategyId } from "./strategies.js";

export interface CadenceRule {
  readonly prefix: string;
  readonly cadence: CadenceClass;
  readonly primary: HydrationStrategyId;
  readonly secondary?: HydrationStrategyId;
  readonly sourceIds: readonly string[];
  readonly notes: string;
}

export const CADENCE_MATRIX: readonly CadenceRule[] = [
  {
    prefix: "mkt.",
    cadence: "few_minutes",
    primary: "cron_delta",
    secondary: "hybrid_hot_cold",
    sourceIds: ["odds.the_odds_api"],
    notes: "Dynamic freshness schedule; paid when free credits dry. */30 cron target.",
  },
  {
    prefix: "ctx.weather.",
    cadence: "few_minutes",
    primary: "ttl_cache_poll",
    secondary: "read_repair",
    sourceIds: ["weather.open_meteo"],
    notes: "Open-Meteo free; lat,lon entity; 15–30m TTL.",
  },
  {
    prefix: "nfl.box.",
    cadence: "daily",
    primary: "batch_snapshot",
    secondary: "write_through",
    sourceIds: ["nflverse.player_stats"],
    notes: "Post-slate release; hydrate NflverseMemoryStore from Prisma PlayerGameStat.",
  },
  {
    prefix: "nfl.adv.",
    cadence: "weekly",
    primary: "batch_snapshot",
    sourceIds: ["nflverse.pbp"],
    notes: "PBP aggregates; heavy — never on read path.",
  },
  {
    prefix: "nfl.ngs.",
    cadence: "weekly",
    primary: "batch_snapshot",
    sourceIds: ["nflverse.nextgen_stats"],
    notes: "NGS tables already PERSISTED path.",
  },
  {
    prefix: "nfl.pbp.",
    cadence: "weekly",
    primary: "batch_snapshot",
    sourceIds: ["nflverse.pbp"],
    notes: "Event counts from weekly materialize job.",
  },
  {
    prefix: "mlb.",
    cadence: "daily",
    primary: "ttl_cache_poll",
    sourceIds: ["mlb.statcast", "mlb.statsapi"],
    notes: "Savant/statsapi free-legal; daily post-game.",
  },
  {
    prefix: "nba.",
    cadence: "daily",
    primary: "ttl_cache_poll",
    sourceIds: ["nba.stats", "ext.balldontlie"],
    notes: "Free path first; no BRef scrape.",
  },
  {
    prefix: "nhl.",
    cadence: "daily",
    primary: "batch_snapshot",
    sourceIds: ["nhl.moneypuck", "nhl.api"],
    notes: "MoneyPuck CSV + NHL API.",
  },
  {
    prefix: "soccer.",
    cadence: "daily",
    primary: "batch_snapshot",
    sourceIds: ["openfootball"],
    notes: "CC0 dumps.",
  },
  {
    prefix: "f1.",
    cadence: "sub_minute",
    primary: "ttl_cache_poll",
    secondary: "sse_stream",
    sourceIds: ["f1.openf1"],
    notes: "OpenF1 during sessions; cold Jolpica historical otherwise.",
  },
  {
    prefix: "gse.",
    cadence: "hourly",
    primary: "write_through",
    secondary: "feast_materialize",
    sourceIds: ["model.gse", "ledger.settled"],
    notes: "Internal synthetic; compute on settle + gate events.",
  },
  {
    prefix: "opt.",
    cadence: "on_demand",
    primary: "batch_snapshot",
    sourceIds: ["optical.scorebug", "ext.hf_sportsmot"],
    notes: "DARK until ship; eval harness only — no live commercial path.",
  },
  {
    prefix: "mkt.pred.",
    cadence: "few_minutes",
    primary: "ttl_cache_poll",
    sourceIds: ["ext.kalshi"],
    notes: "Corroboration only — not primary price.",
  },
  {
    prefix: "wnba.",
    cadence: "daily",
    primary: "batch_snapshot",
    sourceIds: ["ext.wehoop"],
    notes: "wehoop CC-BY path.",
  },
  {
    prefix: "ncaaf.",
    cadence: "hourly",
    primary: "cron_delta",
    sourceIds: ["college.free_first", "ext.henrygd_ncaa"],
    notes: "Free-first ESPN + henrygd; CFBD when rights stamped.",
  },
  {
    prefix: "ncaab.",
    cadence: "hourly",
    primary: "cron_delta",
    sourceIds: ["college.free_first", "ext.henrygd_ncaa"],
    notes: "Same free-first path as CFB.",
  },
];

export function ruleForMetricId(metricId: string): CadenceRule | undefined {
  // longest prefix wins
  let best: CadenceRule | undefined;
  for (const r of CADENCE_MATRIX) {
    if (metricId.startsWith(r.prefix)) {
      if (!best || r.prefix.length > best.prefix.length) best = r;
    }
  }
  return best;
}

export function cadenceSummary() {
  const byCadence: Record<string, number> = {};
  const byPrimary: Record<string, number> = {};
  for (const r of CADENCE_MATRIX) {
    byCadence[r.cadence] = (byCadence[r.cadence] ?? 0) + 1;
    byPrimary[r.primary] = (byPrimary[r.primary] ?? 0) + 1;
  }
  return { rules: CADENCE_MATRIX.length, byCadence, byPrimary };
}
