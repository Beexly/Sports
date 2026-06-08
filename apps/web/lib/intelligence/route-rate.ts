/**
 * Route Rate — Targets Per Route Run (TPRR), as an honest PROXY.
 *
 * TPRR (targets / routes run) is the sharpest receiver-usage stat there is: it
 * isolates how often a player is *thrown to when he's actually out in a pattern*,
 * stripping away the snaps he spends blocking or as a decoy. But true routes-run
 * is PFF-gated charting we cannot publish. So we APPROXIMATE it from two free,
 * real nflverse releases and label every row a proxy:
 *
 *   approxRoutes ≈ Σ_week ( player offense snap-share × team dropbacks that week )
 *   TPRR        = targets / approxRoutes
 *
 *   • snap-share (offense_pct) comes from the `snap_counts` release.
 *   • team dropbacks = Σ of the team's QB pass attempts + sacks, from
 *     `player_stats` (player_stats_week), summed per team-week.
 *   • the two releases use different id spaces (PFR vs gsis), so we join on a
 *     normalized name + team, the same cross-source technique as qb-consensus.
 *
 * How we USE it (the differentiator):
 *   • high TPRR on a LOW route count → BREAKOUT / BUY — efficient on limited
 *     pattern volume; the role is the only thing capping him.
 *   • low TPRR on a HIGH route count → FADE — empty volume; he runs routes but
 *     the offense doesn't look his way.
 *
 * Read-only, real nflverse data (CC-BY-4.0), multi-host failover, honest
 * source-error. canPublishProjections false — it is usage context, not a point
 * projection or a betting pick. Approximation is disclosed on every row.
 */

import { assertIngestible, decodeDatasetText, fetchWithFailover, nflverseUrl, parseCsv, withMirrors } from "@sports/data-ingestion";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";
import { percentileRanks, normName } from "./qb-consensus";

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type RouteRateSignal = "breakout" | "fade" | "steady";

export interface RouteRateRow {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly position: string;
  readonly routes: number; // approximate routes run (PROXY)
  readonly targets: number;
  readonly tprr: number; // targets / approxRoutes
  readonly tprrPct: number; // within-pool percentile of TPRR, 0-100
  readonly signal: RouteRateSignal;
  readonly note: string;
}

export interface RouteRate {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly throughWeek: number | null;
  readonly sourceRows: number;
  readonly rows: readonly RouteRateRow[];
  readonly canPublishProjections: false;
  readonly note: string;
  readonly sourceUrls: Record<"snaps" | "stats", string>;
  readonly error: string | null;
}

const SKILL = ["WR", "TE", "RB"];
const MIN_ROUTES = 40; // approx routes needed before TPRR is meaningful
const TOP_N = 40;
const LOW_ROUTE_PCT = 40; // routes percentile at/below which volume is "low"
const HIGH_ROUTE_PCT = 60; // routes percentile at/above which volume is "high"
const HIGH_TPRR_PCT = 65; // efficient
const LOW_TPRR_PCT = 35; // inefficient

function num(v: string | undefined): number {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : 0;
}
function finite(v: string | undefined): number | null {
  const n = Number(v ?? "");
  return Number.isFinite(n) && v !== undefined && v !== "" ? n : null;
}
function round(v: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

/** Sum each team's dropbacks (QB pass attempts + sacks) per team-week. Defensive over schema. */
function teamDropbacksByWeek(records: readonly CsvRecord[], activeSeason: number): Map<string, number> {
  // key = `${team}|${week}` -> dropbacks
  const dropbacks = new Map<string, number>();
  for (const r of records) {
    if (num(r["season"]) !== activeSeason) continue;
    if (r["season_type"] && r["season_type"] !== "REG") continue;
    const team = r["recent_team"] || r["team"] || "";
    if (!team) continue;
    const week = r["week"] ?? "";
    // attempts = pass attempts; sacks count as dropbacks too. Missing -> 0.
    const db = num(r["attempts"]) + num(r["sacks"]);
    if (db <= 0) continue;
    const key = `${team}|${week}`;
    dropbacks.set(key, (dropbacks.get(key) ?? 0) + db);
  }
  return dropbacks;
}

interface Agg {
  name: string;
  team: string;
  position: string;
  targets: number;
  approxRoutes: number;
}

/**
 * Build TPRR-proxy rows from snap_counts records + player_stats_week records.
 * Pure and offline-testable.
 *
 * @param snapRecords  snap_counts rows (player, team, position, offense_pct, game_type, week)
 * @param statRecords  player_stats_week rows (player_display_name, recent_team, position, targets, attempts, sacks, season, week, season_type)
 */
export function buildRouteRate(
  snapRecords: readonly CsvRecord[],
  statRecords: readonly CsvRecord[],
  activeSeason: number,
): { rows: RouteRateRow[]; throughWeek: number | null } {
  // 1) Team dropbacks per team-week from player stats (the route-opportunity denominator base).
  const dropbacks = teamDropbacksByWeek(statRecords, activeSeason);

  // 2) Targets per player from player stats, keyed by normalized name+team for the cross-source join.
  const targetsByKey = new Map<string, { name: string; team: string; position: string; targets: number }>();
  for (const r of statRecords) {
    if (num(r["season"]) !== activeSeason) continue;
    if (r["season_type"] && r["season_type"] !== "REG") continue;
    const pos = (r["position"] ?? "").toUpperCase();
    if (!SKILL.includes(pos)) continue;
    const name = r["player_display_name"] ?? r["full_name"] ?? r["player_name"] ?? "";
    const team = r["recent_team"] || r["team"] || "";
    if (!name || !team) continue;
    const key = `${normName(name)}|${team}`;
    const e = targetsByKey.get(key) ?? { name, team, position: pos, targets: 0 };
    e.targets += num(r["targets"]);
    e.team = team || e.team;
    targetsByKey.set(key, e);
  }

  // 3) Approx routes per player: Σ_week ( offense_pct × team dropbacks that week ), from snap_counts.
  let throughWeek: number | null = null;
  const byKey = new Map<string, Agg>();
  for (const r of snapRecords) {
    if (r["game_type"] && r["game_type"] !== "REG") continue;
    const pos = (r["position"] ?? "").toUpperCase();
    if (!SKILL.includes(pos)) continue;
    const name = r["player"] ?? r["player_display_name"] ?? "";
    const team = r["team"] || r["recent_team"] || "";
    if (!name || !team) continue;
    const pct = finite(r["offense_pct"]);
    if (pct == null || pct <= 0) continue; // only games he was actually on the field
    const week = r["week"] ?? "";
    const teamDb = dropbacks.get(`${team}|${week}`) ?? 0;
    if (teamDb <= 0) continue; // no dropback denominator -> cannot approximate this week
    const wkNum = num(week);
    if (wkNum > 0) throughWeek = throughWeek == null ? wkNum : Math.max(throughWeek, wkNum);

    const key = `${normName(name)}|${team}`;
    const a = byKey.get(key) ?? { name, team, position: pos, targets: 0, approxRoutes: 0 };
    a.approxRoutes += pct * teamDb;
    a.team = team || a.team;
    byKey.set(key, a);
  }

  // 4) Attach targets (cross-source join) and qualify on a minimum route base.
  const merged: Array<{ key: string; a: Agg }> = [];
  for (const [key, a] of byKey) {
    const t = targetsByKey.get(key);
    if (t) {
      a.targets = t.targets;
      a.name = t.name || a.name; // prefer the player_stats display name
    }
    if (a.approxRoutes >= MIN_ROUTES) merged.push({ key, a });
  }
  if (merged.length === 0) return { rows: [], throughWeek };

  // 5) Within-pool percentiles for TPRR and routes (used for the breakout/fade read).
  const tprrs = merged.map(({ a }) => (a.approxRoutes > 0 ? a.targets / a.approxRoutes : 0));
  const routeVols = merged.map(({ a }) => a.approxRoutes);
  const tprrPcts = percentileRanks(tprrs);
  const routePcts = percentileRanks(routeVols);

  const out: RouteRateRow[] = merged.map(({ key, a }, i) => {
    const tprr = a.approxRoutes > 0 ? a.targets / a.approxRoutes : 0;
    const tprrPct = Math.round(tprrPcts[i] ?? 0);
    const routePct = Math.round(routePcts[i] ?? 0);
    const { signal, note } = signalFor(tprrPct, routePct);
    return {
      playerId: key,
      name: a.name,
      team: a.team,
      position: a.position,
      routes: Math.round(a.approxRoutes),
      targets: a.targets,
      tprr: round(tprr, 3),
      tprrPct,
      signal,
      note,
    };
  });

  // Highest TPRR first — the efficient targets earners lead the board.
  out.sort((x, y) => y.tprr - x.tprr);
  return { rows: out.slice(0, TOP_N), throughWeek };
}

function signalFor(tprrPct: number, routePct: number): { signal: RouteRateSignal; note: string } {
  const proxy = "Read as a usage tell, not a measured rate — it's an estimate.";
  if (tprrPct >= HIGH_TPRR_PCT && routePct <= LOW_ROUTE_PCT) {
    return {
      signal: "breakout",
      note: `Efficient on light usage — the role is the only thing capping him. A breakout / buy if the snaps come. ${proxy}`,
    };
  }
  if (tprrPct <= LOW_TPRR_PCT && routePct >= HIGH_ROUTE_PCT) {
    return {
      signal: "fade",
      note: `Empty volume — on the field a lot, but the offense doesn't look his way. A fade. ${proxy}`,
    };
  }
  return {
    signal: "steady",
    note: `Usage is what the role implies. ${proxy}`,
  };
}

export async function loadRouteRate({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  fetcher = fetch,
}: { season?: number; timeoutMs?: number; fetcher?: FetchLike } = {}): Promise<RouteRate> {
  assertIngestible("nflverse");

  // player_stats ships one combined all-seasons asset; snap_counts is per-season.
  const statsUrl = nflverseUrl("player_stats_week", season);

  // Load player stats once (used to detect the active season and team dropbacks).
  let statRecords: readonly CsvRecord[] = [];
  try {
    // player_stats ships as a gzipped .csv.gz; decodeDatasetText gunzips by magic byte.
    const { response } = await fetchWithFailover(withMirrors(statsUrl), fetcher, { timeoutMs, init: { cache: "no-store" } });
    statRecords = parseCsv(await decodeDatasetText(response)).records;
    if (statRecords.length === 0) throw new Error("empty player_stats");
  } catch (error) {
    return sourceError(statsUrl, nflverseUrl("snap_counts", season), error);
  }

  // Active season: requested if present, else the latest REG season in the file.
  const hasSeason = statRecords.some((r) => num(r["season"]) === season && (r["season_type"] ? r["season_type"] === "REG" : true));
  const activeSeason = hasSeason ? season : statRecords.reduce((m, r) => Math.max(m, num(r["season"])), 0);

  // snap_counts is seasonal — try the active season, then one back (offseason fallback).
  const candidates = [activeSeason, activeSeason - 1];
  let lastError: unknown = null;
  for (const candidate of candidates) {
    const snapsUrl = nflverseUrl("snap_counts", candidate);
    try {
      const { response } = await fetchWithFailover(withMirrors(snapsUrl), fetcher, { timeoutMs, init: { cache: "no-store" } });
      const snapRecords = parseCsv(await decodeDatasetText(response)).records;
      const regSnaps = snapRecords.filter((r) => (r["game_type"] ? r["game_type"] === "REG" : true));
      if (regSnaps.length === 0) throw new Error("no REG snap rows");

      const { rows, throughWeek } = buildRouteRate(snapRecords, statRecords, candidate);
      return {
        generatedAt: new Date().toISOString(),
        status: "live",
        season: candidate,
        throughWeek,
        sourceRows: snapRecords.length + statRecords.length,
        rows,
        canPublishProjections: false,
        note:
          "How efficiently a receiver earns targets for the routes he runs — efficient on light usage is a breakout/buy; empty volume is a fade. An estimate and usage context, not a projection.",
        sourceUrls: { snaps: snapsUrl, stats: statsUrl },
        error: null,
      };
    } catch (error) {
      lastError = error;
    }
  }

  return sourceError(statsUrl, nflverseUrl("snap_counts", activeSeason), lastError);
}

function sourceError(statsUrl: string, snapsUrl: string, error: unknown): RouteRate {
  return {
    generatedAt: new Date().toISOString(),
    status: "source-error",
    season: 0,
    throughWeek: null,
    sourceRows: 0,
    rows: [],
    canPublishProjections: false,
    note: "This read is unavailable right now. We show an empty state instead of fabricated usage.",
    sourceUrls: { snaps: snapsUrl, stats: statsUrl },
    error: error instanceof Error ? error.message : "UNKNOWN",
  };
}
