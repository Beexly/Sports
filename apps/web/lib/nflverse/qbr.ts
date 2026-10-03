import {
  assertIngestible,
  fetchWithFailover,
  NFLVERSE_BASE,
  parseCsv,
  withMirrors,
} from "@sports/data-ingestion";

/**
 * ESPN Total QBR via the nflverse `espn_data` release (CC-BY-4.0) — a second,
 * independent quarterback-quality estimate to triangulate against our CPOE
 * (Next Gen) and pressure (PFR) views. Play-weighted to the season. The file
 * carries name + team, so no join. Read-only, historical; not a pick.
 */

export interface QbrRow {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly games: number;
  readonly plays: number;
  readonly qbr: number; // play-weighted season Total QBR (0-100)
  readonly epaTotal: number;
  readonly ptsAdded: number;
}

export interface NflverseQbr {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly seasonType: "Regular";
  readonly sourceRows: number;
  readonly leaders: readonly QbrRow[];
  readonly canPublishProjections: false;
  readonly blockReason: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const MIN_GAMES = 6;
const TOP_N = 30;

let cache: { readonly expiresAt: number; readonly value: NflverseQbr } | null = null;

function toNumber(value: string | undefined): number {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}
function round(value: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function resetQbrCacheForTests(): void {
  cache = null;
}

export async function loadNflverseQbr({
  timeoutMs = 15000,
  cacheTtlMs = 30 * 60 * 1000,
  fetcher = fetch,
}: { timeoutMs?: number; cacheTtlMs?: number; fetcher?: FetchLike } = {}): Promise<NflverseQbr> {
  assertIngestible("nflverse");

  const now = Date.now();
  if (cacheTtlMs > 0 && fetcher === fetch && cache && cache.expiresAt > now) return cache.value;

  const url = `${NFLVERSE_BASE}/espn_data/qbr_week_level.csv`;
  try {
    const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs });
    const { records } = parseCsv(await response.text());
    const reg = records.filter((r) => r["season_type"] === "Regular");
    if (reg.length === 0) throw new Error("no Regular QBR rows");

    const season = reg.reduce((max, r) => Math.max(max, toNumber(r["season"])), 0);
    const byPlayer = new Map<string, { name: string; team: string; games: number; plays: number; qbrW: number; epa: number; pts: number }>();
    for (const r of reg) {
      if (toNumber(r["season"]) !== season) continue;
      const id = r["player_id"];
      if (!id) continue;
      const plays = toNumber(r["qb_plays"]);
      const agg = byPlayer.get(id) ?? { name: r["name_display"] ?? "UNKNOWN", team: r["team_abb"] ?? "", games: 0, plays: 0, qbrW: 0, epa: 0, pts: 0 };
      agg.games += 1;
      agg.plays += plays;
      agg.qbrW += toNumber(r["qbr_total"]) * plays;
      agg.epa += toNumber(r["epa_total"]);
      agg.pts += toNumber(r["pts_added"]);
      agg.team = r["team_abb"] || agg.team;
      byPlayer.set(id, agg);
    }

    const leaders: QbrRow[] = [];
    for (const [id, a] of byPlayer) {
      if (a.games < MIN_GAMES) continue;
      leaders.push({
        playerId: id,
        name: a.name,
        team: a.team,
        games: a.games,
        plays: a.plays,
        qbr: round(a.plays > 0 ? a.qbrW / a.plays : 0),
        epaTotal: round(a.epa),
        ptsAdded: round(a.pts),
      });
    }
    leaders.sort((x, y) => y.qbr - x.qbr);

    const value: NflverseQbr = {
      generatedAt: new Date().toISOString(),
      status: "live",
      season,
      seasonType: "Regular",
      sourceRows: records.length,
      leaders: leaders.slice(0, TOP_N),
      canPublishProjections: false,
      blockReason:
        "ESPN Total QBR is a real, published QB-quality metric (play-weighted to the season). It is one independent estimate to triangulate against CPOE and pressure, not a projection or a pick.",
      sourceUrl: url,
      error: null,
    };
    if (cacheTtlMs > 0 && fetcher === fetch) cache = { expiresAt: now + cacheTtlMs, value };
    return value;
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      season: 0,
      seasonType: "Regular",
      sourceRows: 0,
      leaders: [],
      canPublishProjections: false,
      blockReason:
        "ESPN QBR could not load from nflverse. The product shows an empty state instead of fabricated ratings.",
      sourceUrl: url,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
