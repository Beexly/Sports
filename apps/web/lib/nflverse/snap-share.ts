import {
  assertIngestible,
  buildIdCrosswalk,
  fetchWithFailover,
  nflverseUrl,
  parseCsv,
  resolveFootballStatsSeason,
  resolveGsisFromRow,
  withMirrors,
  type IdCrosswalk,
} from "@sports/data-ingestion";

/**
 * Snap share — the cleanest workload signal there is: the share of his team's
 * offensive snaps a player is on the field for. Opportunity leads box-score
 * production, so rising snap share is an early tell. Read-only from the nflverse
 * `snap_counts` release (CC-BY-4.0). Historical fact, not a projection.
 *
 * Snap assets key players by PFR id. We season-match roster crosswalks to
 * resolve GSIS when possible; unresolved rows keep PFR id (never invent GSIS).
 * Default season is the completed REG floor (through 2025 until 2026 REG exists).
 */

export type SkillPosition = "RB" | "WR" | "TE";

export interface SnapShareRow {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  readonly position: SkillPosition;
  readonly games: number;
  readonly snapSharePct: number;
  readonly snapsPerGame: number;
  readonly totalOffenseSnaps: number;
}

export interface NflverseSnapShare {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly seasonType: "REG";
  readonly sourceRows: number;
  readonly leaders: Readonly<Record<SkillPosition, readonly SnapShareRow[]>>;
  readonly canPublishProjections: false;
  readonly blockReason: string;
  readonly sourceUrl: string;
  readonly error: string | null;
  readonly crosswalk?: {
    readonly primarySeason: number;
    readonly seasonsUsed: readonly number[];
    readonly pfrBridged: number;
  };
}

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const SKILL: readonly SkillPosition[] = ["RB", "WR", "TE"];
const MIN_GAMES = 4;
const TOP_N = 40;

let snapCache: { readonly expiresAt: number; readonly value: NflverseSnapShare } | null = null;

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function isSkill(value: string | undefined): value is SkillPosition {
  return value === "RB" || value === "WR" || value === "TE";
}

async function fetchCsv(url: string, fetcher: FetchLike, timeoutMs: number): Promise<readonly CsvRecord[]> {
  const { response } = await fetchWithFailover(withMirrors(url), fetcher, {
    timeoutMs,
    init: { cache: "no-store" },
  });
  return parseCsv(await response.text()).records;
}

interface Agg {
  name: string;
  team: string;
  position: SkillPosition;
  shares: number[];
  snaps: number;
}

function buildLeaders(
  records: readonly CsvRecord[],
  crosswalk: IdCrosswalk | null,
): Record<SkillPosition, SnapShareRow[]> {
  const byPlayer = new Map<string, Agg>();
  for (const row of records) {
    if (row["game_type"] !== "REG") continue;
    const position = row["position"];
    if (!isSkill(position)) continue;
    const snaps = toNumber(row["offense_snaps"]);
    if (snaps <= 0) continue;
    const gsis = resolveGsisFromRow(crosswalk, row);
    const id = gsis || row["pfr_player_id"] || row["player"] || "";
    if (!id) continue;
    const agg =
      byPlayer.get(id) ?? {
        name: row["player"] ?? "UNKNOWN",
        team: row["team"] ?? "",
        position,
        shares: [],
        snaps: 0,
      };
    agg.shares.push(toNumber(row["offense_pct"]));
    agg.snaps += snaps;
    agg.name = row["player"] || agg.name;
    agg.team = row["team"] || agg.team;
    byPlayer.set(id, agg);
  }

  const rows: SnapShareRow[] = [];
  for (const [id, agg] of byPlayer) {
    const games = agg.shares.length;
    if (games < MIN_GAMES) continue;
    const avgShare = agg.shares.reduce((s, v) => s + v, 0) / games;
    rows.push({
      playerId: id,
      playerName: agg.name,
      team: agg.team,
      position: agg.position,
      games,
      snapSharePct: round(avgShare),
      snapsPerGame: round(agg.snaps / games, 1),
      totalOffenseSnaps: agg.snaps,
    });
  }

  const result: Record<SkillPosition, SnapShareRow[]> = { RB: [], WR: [], TE: [] };
  for (const position of SKILL) {
    result[position] = rows
      .filter((r) => r.position === position)
      .sort((a, b) => b.snapSharePct - a.snapSharePct || b.totalOffenseSnaps - a.totalOffenseSnaps)
      .slice(0, TOP_N);
  }
  return result;
}

async function loadSeasonMatchedCrosswalk(
  season: number,
  fetcher: FetchLike,
  timeoutMs: number,
): Promise<IdCrosswalk | null> {
  const batches: { season: number; rows: readonly CsvRecord[] }[] = [];
  for (const candidate of [season, season - 1]) {
    try {
      const url = nflverseUrl("rosters", candidate);
      const rows = await fetchCsv(url, fetcher, timeoutMs);
      if (rows.length > 0) batches.push({ season: candidate, rows });
    } catch {
      // Prior season optional.
    }
  }
  if (batches.length === 0) return null;
  return buildIdCrosswalk(season, batches);
}

export function resetSnapShareCacheForTests(): void {
  snapCache = null;
}

export async function loadNflverseSnapShare({
  season,
  timeoutMs = 15000,
  cacheTtlMs = 30 * 60 * 1000,
  fetcher = fetch,
  now = new Date(),
}: {
  season?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetcher?: FetchLike;
  now?: Date;
} = {}): Promise<NflverseSnapShare> {
  assertIngestible("nflverse");

  const resolved =
    season !== undefined
      ? { season, reason: "caller override", labelledCurrent: season, completedFloor: season }
      : resolveFootballStatsSeason(now);

  const cacheNow = Date.now();
  if (cacheTtlMs > 0 && fetcher === fetch && snapCache && snapCache.expiresAt > cacheNow) {
    return snapCache.value;
  }

  const emptyLeaders = { RB: [], WR: [], TE: [] } as const;
  const candidates = [resolved.season, resolved.season - 1];
  let lastError: unknown = null;

  for (const candidate of candidates) {
    const url = nflverseUrl("snap_counts", candidate);
    try {
      const records = await fetchCsv(url, fetcher, timeoutMs);
      const regRows = records.filter((row) => row["game_type"] === "REG");
      if (regRows.length === 0) throw new Error("no REG snap rows");

      const crosswalk = await loadSeasonMatchedCrosswalk(candidate, fetcher, timeoutMs);
      const crosswalkNote = crosswalk
        ? ` GSIS resolved via season-matched roster crosswalk (${crosswalk.stats.pfrBridged} PFR bridges).`
        : " Roster crosswalk unavailable; playerId may be PFR until roster fetch succeeds.";
      const value: NflverseSnapShare = {
        generatedAt: new Date().toISOString(),
        status: "live",
        season: candidate,
        seasonType: "REG",
        sourceRows: records.length,
        leaders: buildLeaders(records, crosswalk),
        canPublishProjections: false,
        blockReason:
          "Snap share is real, settled workload from nflverse: the share of team offensive snaps a player was on the field for. It is historical opportunity, not a projection or a betting pick." +
          crosswalkNote,
        sourceUrl: url,
        error: null,
        crosswalk: crosswalk
          ? {
              primarySeason: crosswalk.primarySeason,
              seasonsUsed: crosswalk.seasonsUsed,
              pfrBridged: crosswalk.stats.pfrBridged,
            }
          : undefined,
      };
      if (cacheTtlMs > 0 && fetcher === fetch) snapCache = { expiresAt: cacheNow + cacheTtlMs, value };
      return value;
    } catch (error) {
      lastError = error;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    status: "source-error",
    season: resolved.season,
    seasonType: "REG",
    sourceRows: 0,
    leaders: emptyLeaders,
    canPublishProjections: false,
    blockReason:
      "Snap counts could not load from nflverse. The product shows an empty state instead of fabricated workload. " +
      resolved.reason,
    sourceUrl: nflverseUrl("snap_counts", resolved.season),
    error: lastError instanceof Error ? lastError.message : "UNKNOWN",
  };
}
