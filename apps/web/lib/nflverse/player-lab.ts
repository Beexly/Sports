import { gunzipSync } from "node:zlib";
import { fetchWithFailover, nflverseUrl, parseCsv, withMirrors, type NflverseDatasetKey } from "@sports/data-ingestion";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";

/**
 * Player Production Lab.
 *
 * Turns the real nflverse `player_stats_week` release asset into a LineStar-grade,
 * read-only production surface: per-position season leaders, last-5 form splits,
 * and positional defense-allowed ranks. Everything here is HISTORICAL fact
 * computed from real rows — not a forecast, projection, pick, or published trend.
 * `canPublishProjections` is hard-locked to `false`; if the source cannot load,
 * the lab returns an explicit empty state rather than fabricating numbers.
 */

export type SkillPosition = "RB" | "WR" | "TE";

export interface PlayerSeasonLine {
  readonly playerId: string;
  readonly playerName: string;
  readonly team: string;
  readonly position: SkillPosition;
  readonly games: number;
  readonly pprPerGame: number;
  readonly opportunitiesPerGame: number;
  readonly targetsPerGame: number;
  readonly receptionsPerGame: number;
  readonly receivingYardsPerGame: number;
  readonly rushingYardsPerGame: number;
  readonly targetShare: number | null;
  readonly wopr: number | null;
  readonly totalPpr: number;
  readonly totalOpportunities: number;
  /** Recent form: per-game PPR over the player's most recent 5 games. */
  readonly last5Games: number;
  readonly last5PprPerGame: number;
  readonly last5OpportunitiesPerGame: number;
  /** last5PprPerGame minus season pprPerGame — positive = heating up. */
  readonly last5PprDelta: number;
  /** Real floor/ceiling distribution (historical, not a projected range). */
  readonly boomRate: number; // share of games >= BOOM_PPR
  readonly bustRate: number; // share of games <= BUST_PPR
  readonly bestGamePpr: number;
  readonly worstGamePpr: number;
  readonly headshotUrl: string | null;
}

export interface DefenseVsPositionRank {
  readonly team: string;
  readonly position: SkillPosition;
  readonly games: number;
  readonly pprAllowedPerGame: number;
  readonly opportunitiesAllowedPerGame: number;
  /** 1 = allows the MOST PPR to this position (softest matchup). */
  readonly rank: number;
}

export interface NflversePlayerLab {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly throughWeek: number | null;
  readonly seasonType: "REG";
  readonly sourceRows: number;
  readonly seasonRows: number;
  readonly leaders: Readonly<Record<SkillPosition, readonly PlayerSeasonLine[]>>;
  readonly defenseVsPosition: Readonly<Record<SkillPosition, readonly DefenseVsPositionRank[]>>;
  readonly canPublishProjections: false;
  readonly blockReason: string;
  readonly sourceUrls: Record<"playerStats" | "rosters", string>;
  readonly error: string | null;
}

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const SKILL_POSITIONS: readonly SkillPosition[] = ["RB", "WR", "TE"];
const MIN_GAMES = 3;
const LEADERS_PER_POSITION = 30;
const FORM_WINDOW = 5;
// Standard PPR flex thresholds: a "boom" is a startable ceiling game, a "bust" is a floor game.
const BOOM_PPR = 20;
const BUST_PPR = 10;

let playerLabCache: { readonly expiresAt: number; readonly value: NflversePlayerLab } | null = null;

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function isSkillPosition(value: string | undefined): value is SkillPosition {
  return value === "RB" || value === "WR" || value === "TE";
}

async function fetchCsvTable({
  key,
  season,
  fetcher,
  timeoutMs,
}: {
  key: NflverseDatasetKey;
  season: number;
  fetcher: FetchLike;
  timeoutMs: number;
}): Promise<{ readonly url: string; readonly records: readonly CsvRecord[] }> {
  const url = nflverseUrl(key, season);
  const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs });
  const buffer = Buffer.from(await response.arrayBuffer());
  const text = url.endsWith(".gz") ? gunzipSync(buffer).toString("utf8") : buffer.toString("utf8");
  return { url, records: parseCsv(text).records };
}

function resolveActiveSeason(records: readonly CsvRecord[], requestedSeason: number): number {
  const seasons = Array.from(
    new Set(
      records
        .filter((row) => row["season_type"] === "REG")
        .map((row) => toNumber(row["season"]))
        .filter((season) => season > 0),
    ),
  ).sort((a, b) => a - b);
  const atOrBefore = seasons.filter((season) => season <= requestedSeason);
  return atOrBefore.at(-1) ?? seasons.at(-1) ?? requestedSeason;
}

function rosterHeadshots(records: readonly CsvRecord[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of records) {
    const id = row["gsis_id"];
    const url = row["headshot_url"];
    if (id && url) map.set(id, url);
  }
  return map;
}

function buildLeaders(
  seasonRows: readonly CsvRecord[],
  headshots: Map<string, string>,
): Record<SkillPosition, PlayerSeasonLine[]> {
  const byPlayer = new Map<string, CsvRecord[]>();
  for (const row of seasonRows) {
    if (!isSkillPosition(row["position"])) continue;
    const id = row["player_id"];
    if (!id) continue;
    const list = byPlayer.get(id);
    if (list) list.push(row);
    else byPlayer.set(id, [row]);
  }

  const lines: PlayerSeasonLine[] = [];
  for (const [playerId, rows] of byPlayer) {
    const games = rows.length;
    if (games < MIN_GAMES) continue;
    const position = rows[0]!["position"] as SkillPosition;

    const opp = (r: CsvRecord) => toNumber(r["targets"]) + toNumber(r["carries"]);
    const totalPpr = rows.reduce((s, r) => s + toNumber(r["fantasy_points_ppr"]), 0);
    const totalOpportunities = rows.reduce((s, r) => s + opp(r), 0);
    const targetShares = rows
      .map((r) => Number(r["target_share"]))
      .filter((v) => Number.isFinite(v));
    const woprs = rows.map((r) => Number(r["wopr"])).filter((v) => Number.isFinite(v));

    const recent = [...rows]
      .sort((a, b) => toNumber(b["week"]) - toNumber(a["week"]))
      .slice(0, FORM_WINDOW);
    const last5Ppr = average(recent.map((r) => toNumber(r["fantasy_points_ppr"])));
    const pprPerGame = totalPpr / games;

    const gamePprs = rows.map((r) => toNumber(r["fantasy_points_ppr"]));
    const boomRate = gamePprs.filter((p) => p >= BOOM_PPR).length / games;
    const bustRate = gamePprs.filter((p) => p <= BUST_PPR).length / games;

    const latest = recent[0]!;
    lines.push({
      playerId,
      playerName:
        latest["player_display_name"] || latest["player_name"] || "UNKNOWN",
      // nflverse renamed player_stats `recent_team` -> `team` (nflfastR::calculate_stats); tolerate both.
      team: latest["recent_team"] || latest["team"] || "",
      position,
      games,
      pprPerGame: round(pprPerGame),
      opportunitiesPerGame: round(totalOpportunities / games),
      targetsPerGame: round(rows.reduce((s, r) => s + toNumber(r["targets"]), 0) / games),
      receptionsPerGame: round(rows.reduce((s, r) => s + toNumber(r["receptions"]), 0) / games),
      receivingYardsPerGame: round(
        rows.reduce((s, r) => s + toNumber(r["receiving_yards"]), 0) / games,
      ),
      rushingYardsPerGame: round(rows.reduce((s, r) => s + toNumber(r["rushing_yards"]), 0) / games),
      targetShare: targetShares.length > 0 ? round(average(targetShares), 3) : null,
      wopr: woprs.length > 0 ? round(average(woprs), 3) : null,
      totalPpr: round(totalPpr),
      totalOpportunities,
      last5Games: recent.length,
      last5PprPerGame: round(last5Ppr),
      last5OpportunitiesPerGame: round(average(recent.map(opp))),
      last5PprDelta: round(last5Ppr - pprPerGame),
      boomRate: round(boomRate, 3),
      bustRate: round(bustRate, 3),
      bestGamePpr: round(Math.max(...gamePprs)),
      worstGamePpr: round(Math.min(...gamePprs)),
      headshotUrl: latest["headshot_url"] || headshots.get(playerId) || null,
    });
  }

  const result: Record<SkillPosition, PlayerSeasonLine[]> = { RB: [], WR: [], TE: [] };
  for (const position of SKILL_POSITIONS) {
    result[position] = lines
      .filter((l) => l.position === position)
      .sort((a, b) => b.pprPerGame - a.pprPerGame || b.totalPpr - a.totalPpr)
      .slice(0, LEADERS_PER_POSITION);
  }
  return result;
}

function buildDefenseRanks(
  seasonRows: readonly CsvRecord[],
): Record<SkillPosition, DefenseVsPositionRank[]> {
  // For each (defense=opponent_team, position): sum PPR + opportunities allowed,
  // counting distinct weeks the defense faced that position.
  type Acc = { ppr: number; opp: number; weeks: Set<number> };
  const buckets = new Map<string, Acc>();
  for (const row of seasonRows) {
    const position = row["position"];
    const defense = row["opponent_team"];
    if (!isSkillPosition(position) || !defense) continue;
    const key = `${defense}|${position}`;
    const acc = buckets.get(key) ?? { ppr: 0, opp: 0, weeks: new Set<number>() };
    acc.ppr += toNumber(row["fantasy_points_ppr"]);
    acc.opp += toNumber(row["targets"]) + toNumber(row["carries"]);
    acc.weeks.add(toNumber(row["week"]));
    buckets.set(key, acc);
  }

  const result: Record<SkillPosition, DefenseVsPositionRank[]> = { RB: [], WR: [], TE: [] };
  for (const position of SKILL_POSITIONS) {
    const rows: Array<Omit<DefenseVsPositionRank, "rank">> = [];
    for (const [key, acc] of buckets) {
      const [team, pos] = key.split("|");
      if (pos !== position || !team) continue;
      const games = acc.weeks.size;
      if (games < MIN_GAMES) continue;
      rows.push({
        team,
        position,
        games,
        pprAllowedPerGame: round(acc.ppr / games),
        opportunitiesAllowedPerGame: round(acc.opp / games),
      });
    }
    result[position] = rows
      .sort((a, b) => b.pprAllowedPerGame - a.pprAllowedPerGame)
      .map((row, index) => ({ ...row, rank: index + 1 }));
  }
  return result;
}

export function resetNflversePlayerLabCacheForTests(): void {
  playerLabCache = null;
}

export async function loadNflversePlayerLab({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  cacheTtlMs = 30 * 60 * 1000,
  fetcher = fetch,
}: {
  season?: number;
  timeoutMs?: number;
  cacheTtlMs?: number;
  fetcher?: FetchLike;
} = {}): Promise<NflversePlayerLab> {
  const now = Date.now();
  if (cacheTtlMs > 0 && fetcher === fetch && playerLabCache && playerLabCache.expiresAt > now) {
    return playerLabCache.value;
  }

  const emptyLeaders = { RB: [], WR: [], TE: [] } as const;

  try {
    const stats = await fetchCsvTable({ key: "player_stats_week", season, fetcher, timeoutMs });
    const activeSeason = resolveActiveSeason(stats.records, season);
    const rosters = await fetchCsvTable({ key: "rosters", season: activeSeason, fetcher, timeoutMs });
    const seasonRows = stats.records.filter(
      (row) => row["season"] === String(activeSeason) && row["season_type"] === "REG",
    );
    const throughWeek = seasonRows.reduce((max, row) => Math.max(max, toNumber(row["week"])), 0);
    const headshots = rosterHeadshots(rosters.records);

    const value: NflversePlayerLab = {
      generatedAt: new Date().toISOString(),
      status: "live",
      season: activeSeason,
      throughWeek: throughWeek || null,
      seasonType: "REG",
      sourceRows: stats.records.length,
      seasonRows: seasonRows.length,
      leaders: buildLeaders(seasonRows, headshots),
      defenseVsPosition: buildDefenseRanks(seasonRows),
      canPublishProjections: false,
      blockReason:
        "The Production Lab reports real, settled nflverse production and recent form. These are historical facts, not forecasts, projections, or betting picks; nothing here is published as a pick or significant trend.",
      sourceUrls: { playerStats: stats.url, rosters: rosters.url },
      error: null,
    };
    if (cacheTtlMs > 0 && fetcher === fetch) playerLabCache = { expiresAt: now + cacheTtlMs, value };
    return value;
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      season,
      throughWeek: null,
      seasonType: "REG",
      sourceRows: 0,
      seasonRows: 0,
      leaders: emptyLeaders,
      defenseVsPosition: emptyLeaders,
      canPublishProjections: false,
      blockReason:
        "The nflverse Production Lab could not load source rows. The product must show an empty state instead of fabricated production data.",
      sourceUrls: {
        playerStats: nflverseUrl("player_stats_week", season),
        rosters: nflverseUrl("rosters", season),
      },
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
