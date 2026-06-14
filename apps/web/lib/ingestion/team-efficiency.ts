/**
 * Team-game efficiency ingestion (nflverse play-by-play → TeamGameEfficiency).
 *
 * The ~50k plays/season are aggregated AT INGESTION to one compact row per
 * team-game: offense produced + defense allowed (EPA/play and success rate). We
 * fetch the play-by-play with COLUMN PROJECTION (only the ~10 fields we need) so
 * the big file never fully materializes in memory. Clearance-gated and
 * rights/freshness-stamped. This is the public foundation for opponent-adjusted
 * ratings and the scheme/archetype signals.
 */
import { fetchNflverseText, parseCsv } from "@sports/data-ingestion";
import { db } from "@sports/db";
import { nflverseIngestionGate } from "@/lib/ingestion/nflverse-gate";

type CsvRow = Readonly<Record<string, string>>;
type PbpFetcher = (season: number) => Promise<{ records: readonly CsvRow[] }>;

const PBP_COLUMNS = [
  "game_id", "season", "week", "season_type", "posteam", "defteam", "home_team", "epa", "success", "play_type",
];

export interface TeamEfficiencyIngestResult {
  readonly status: "ok" | "clearance-denied" | "source-error";
  readonly season: number;
  readonly rowsWritten: number;
  readonly games: number;
  readonly blocks?: readonly string[];
  readonly error?: string;
}

interface Agg {
  epa: number;
  succ: number;
  n: number;
}
interface GameMeta {
  season: number;
  week: number;
  seasonType: string;
  homeTeam: string;
}

function int(v: string | undefined): number | null {
  if (v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}
function round4(x: number): number {
  return Math.round(x * 1e4) / 1e4;
}

async function fetchPbp(season: number): Promise<{ records: readonly CsvRow[] }> {
  const text = await fetchNflverseText("pbp", season);
  return { records: parseCsv(text, { columns: PBP_COLUMNS }).records };
}

function bump(byGame: Map<string, Map<string, Agg>>, game: string, team: string, epa: number, succ: number): void {
  let g = byGame.get(game);
  if (!g) {
    g = new Map();
    byGame.set(game, g);
  }
  const a = g.get(team) ?? { epa: 0, succ: 0, n: 0 };
  a.epa += epa;
  a.succ += succ;
  a.n += 1;
  g.set(team, a);
}

export async function ingestTeamEfficiency(
  season: number,
  options: { now?: Date; fetcher?: PbpFetcher } = {},
): Promise<TeamEfficiencyIngestResult> {
  const now = options.now ?? new Date();
  const fetchTable: PbpFetcher = options.fetcher ?? fetchPbp;

  const gate = nflverseIngestionGate(now);
  if (!gate.ok) return { status: "clearance-denied", season, rowsWritten: 0, games: 0, blocks: gate.blocks };

  let records: readonly CsvRow[];
  try {
    records = (await fetchTable(season)).records;
  } catch (error) {
    return { status: "source-error", season, rowsWritten: 0, games: 0, error: error instanceof Error ? error.message : "fetch failed" };
  }

  const off = new Map<string, Map<string, Agg>>(); // game → posteam → agg
  const def = new Map<string, Map<string, Agg>>(); // game → defteam → agg (offense allowed)
  const meta = new Map<string, GameMeta>();
  const teamsByGame = new Map<string, Set<string>>();

  for (const r of records) {
    const playType = r["play_type"];
    if (playType !== "pass" && playType !== "run") continue; // real scrimmage plays only
    const game = r["game_id"];
    const pos = r["posteam"];
    const dfn = r["defteam"];
    if (!game || !pos || !dfn) continue;
    const epa = Number(r["epa"]);
    if (!Number.isFinite(epa)) continue;
    const succRaw = Number(r["success"]);
    const succ = Number.isFinite(succRaw) ? succRaw : 0;

    bump(off, game, pos, epa, succ);
    bump(def, game, dfn, epa, succ);
    let teams = teamsByGame.get(game);
    if (!teams) {
      teams = new Set();
      teamsByGame.set(game, teams);
    }
    teams.add(pos);
    teams.add(dfn);
    if (!meta.has(game)) {
      meta.set(game, {
        season: int(r["season"]) ?? season,
        week: int(r["week"]) ?? 0,
        seasonType: (r["season_type"] ?? "REG").toUpperCase().startsWith("POST") ? "POST" : "REG",
        homeTeam: r["home_team"] ?? "",
      });
    }
  }

  const data = [];
  for (const [game, teamAggs] of off) {
    const m = meta.get(game);
    const teams = teamsByGame.get(game);
    if (!m || !teams) continue;
    for (const [team, offAgg] of teamAggs) {
      if (offAgg.n === 0) continue;
      const opponent = [...teams].find((t) => t !== team) ?? "";
      const defAgg = def.get(game)?.get(team);
      data.push({
        gameKey: game,
        season: m.season,
        week: m.week,
        seasonType: m.seasonType,
        team,
        opponent,
        isHome: team === m.homeTeam,
        plays: offAgg.n,
        offEpaPerPlay: round4(offAgg.epa / offAgg.n),
        offSuccess: round4(offAgg.succ / offAgg.n),
        defEpaPerPlay: defAgg && defAgg.n > 0 ? round4(defAgg.epa / defAgg.n) : 0,
        defSuccess: defAgg && defAgg.n > 0 ? round4(defAgg.succ / defAgg.n) : 0,
        sourceId: "nflverse",
        rightsSnapshot: gate.rightsSnapshot,
        fetchedAt: now,
      });
    }
  }

  await db.teamGameEfficiency.deleteMany({ where: { season } });
  const created = data.length > 0 ? await db.teamGameEfficiency.createMany({ data }) : null;

  return { status: "ok", season, rowsWritten: created?.count ?? data.length, games: teamsByGame.size };
}
