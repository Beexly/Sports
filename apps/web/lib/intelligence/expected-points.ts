/**
 * Expected Fantasy Points (xFP) — the opportunity backbone.
 *
 * nflverse's ff_opportunity release models the fantasy points a player's usage
 * SHOULD have produced — expected points from the carries, targets, air yards,
 * and field position he actually saw — independent of whether the ball bounced
 * his way. Expected points are the single cleanest, most stable buy/sell lens in
 * fantasy: they persist far better than actual points (which swing on TD luck).
 *
 * How we USE it: compare each player's EXPECTED-points percentile to his ACTUAL
 * percentile (within position) and surface the gap — expected ≫ actual = buy-low
 * (the production is coming), actual ≫ expected = sell-high (running hot on
 * conversion luck). This is the master opportunity input behind the waiver tool
 * and the graded projections provider.
 *
 * Real nflverse data (CC-BY-4.0), multi-host failover, honest source-error.
 * canPublishProjections false — it's an opportunity read, not a point projection.
 */

import { assertIngestible, fetchWithFailover, NFLVERSE_BASE, parseCsv, withMirrors } from "@sports/data-ingestion";
import { percentileRanks } from "./qb-consensus";

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type XfpSignal = "buy-low" | "sell-high" | "in-line";

export interface ExpectedPointsRow {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly position: string;
  readonly games: number;
  readonly xfpTotal: number; // expected PPR points
  readonly xfpPerGame: number;
  readonly actualTotal: number; // expected + diff
  readonly diff: number; // actual − expected (luck/efficiency)
  readonly xfpPct: number; // expected-points percentile within position
  readonly prodPct: number; // actual-points percentile within position
  readonly signal: XfpSignal;
  readonly note: string;
}

export interface ExpectedPoints {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly throughWeek: number | null;
  readonly sourceRows: number;
  readonly rows: readonly ExpectedPointsRow[];
  readonly canPublishProjections: false;
  readonly note: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

// ff_opportunity ships one combined, all-seasons asset.
const FF_OPP_URL = `${NFLVERSE_BASE}/ff_opportunity/ff_opportunity_latest.csv.gz`;
const POSITIONS = ["QB", "RB", "WR", "TE"];
const MIN_GAMES = 2;
const MIN_XFP = 15;
const TOP_PER_POS = 30;
const DIVERGENCE = 18;

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

/** Expected (and actual = expected + diff) PPR points for one weekly row, defensive across schema variants. */
function weekExpected(r: CsvRecord): { exp: number; diff: number } {
  const exp = finite(r["total_fantasy_points_exp"]) ?? num(r["rush_fantasy_points_exp"]) + num(r["rec_fantasy_points_exp"]);
  const diff = finite(r["total_fantasy_points_diff"]) ?? num(r["rush_fantasy_points_diff"]) + num(r["rec_fantasy_points_diff"]);
  return { exp, diff };
}

interface Agg { name: string; team: string; position: string; games: number; xfp: number; diff: number }

/** Build expected-points rows with within-position buy/sell signals. Pure. */
export function buildExpectedPoints(records: readonly CsvRecord[], activeSeason: number): { rows: ExpectedPointsRow[]; throughWeek: number | null } {
  const rows = records.filter((r) => num(r["season"]) === activeSeason && (r["season_type"] ? r["season_type"] === "REG" : true));
  if (rows.length === 0) return { rows: [], throughWeek: null };
  const throughWeek = rows.reduce((m, r) => Math.max(m, num(r["week"])), 0) || null;

  const byPlayer = new Map<string, Agg>();
  for (const r of rows) {
    const pos = (r["position"] ?? "").toUpperCase();
    if (!POSITIONS.includes(pos)) continue;
    const id = r["player_id"] || r["full_name"] || r["player_display_name"] || "";
    if (!id) continue;
    const { exp, diff } = weekExpected(r);
    const a = byPlayer.get(id) ?? { name: r["full_name"] ?? r["player_display_name"] ?? r["player_name"] ?? id, team: r["posteam"] ?? r["recent_team"] ?? "", position: pos, games: 0, xfp: 0, diff: 0 };
    a.games += 1;
    a.xfp += exp;
    a.diff += diff;
    a.team = r["posteam"] || r["recent_team"] || a.team;
    byPlayer.set(id, a);
  }

  const qualified = [...byPlayer.entries()].filter(([, a]) => a.games >= MIN_GAMES && a.xfp >= MIN_XFP);
  if (qualified.length === 0) return { rows: [], throughWeek };

  const out: ExpectedPointsRow[] = [];
  for (const pos of POSITIONS) {
    const group = qualified.filter(([, a]) => a.position === pos);
    if (group.length === 0) continue;
    const xfpPcts = percentileRanks(group.map(([, a]) => a.xfp));
    const prodPcts = percentileRanks(group.map(([, a]) => a.xfp + a.diff));
    group.forEach(([id, a], i) => {
      const xfpPct = Math.round(xfpPcts[i] ?? 0);
      const prodPct = Math.round(prodPcts[i] ?? 0);
      const gap = xfpPct - prodPct;
      const signal: XfpSignal = gap >= DIVERGENCE ? "buy-low" : gap <= -DIVERGENCE ? "sell-high" : "in-line";
      out.push({
        playerId: id,
        name: a.name,
        team: a.team,
        position: pos,
        games: a.games,
        xfpTotal: round(a.xfp),
        xfpPerGame: round(a.games ? a.xfp / a.games : 0),
        actualTotal: round(a.xfp + a.diff),
        diff: round(a.diff),
        xfpPct,
        prodPct,
        signal,
        note:
          signal === "buy-low"
            ? "Expected points outrun actual — the usage says the production is coming. Buy-low before it corrects."
            : signal === "sell-high"
              ? "Actual points outrun expected — running hot on conversion luck. Sell-high before it regresses."
              : "Actual tracks expected — the points are earned by the opportunity.",
      });
    });
  }

  const perPos = new Map<string, number>();
  const ranked = out.sort((a, b) => b.xfpPerGame - a.xfpPerGame).filter((r) => {
    const n = (perPos.get(r.position) ?? 0) + 1;
    perPos.set(r.position, n);
    return n <= TOP_PER_POS;
  });
  return { rows: ranked, throughWeek };
}

export async function loadExpectedPoints({
  season,
  timeoutMs = 15000,
  fetcher = fetch,
}: { season?: number; timeoutMs?: number; fetcher?: FetchLike } = {}): Promise<ExpectedPoints> {
  assertIngestible("nflverse");
  try {
    const { response } = await fetchWithFailover(withMirrors(FF_OPP_URL), fetcher, { timeoutMs });
    const { records } = parseCsv(await response.text());
    if (records.length === 0) throw new Error("empty ff_opportunity");
    const maxSeason = records.reduce((m, r) => Math.max(m, num(r["season"])), 0);
    const activeSeason = season && records.some((r) => num(r["season"]) === season) ? season : maxSeason;
    const { rows, throughWeek } = buildExpectedPoints(records, activeSeason);
    return {
      generatedAt: new Date().toISOString(),
      status: "live",
      season: activeSeason,
      throughWeek,
      sourceRows: records.length,
      rows,
      canPublishProjections: false,
      note: "Expected fantasy points from nflverse ff_opportunity — what a player's real usage should have produced. We surface expected-vs-actual as buy-low / sell-high. The opportunity backbone, not a point projection.",
      sourceUrl: FF_OPP_URL,
      error: null,
    };
  } catch (error) {
    return {
      generatedAt: new Date().toISOString(),
      status: "source-error",
      season: 0,
      throughWeek: null,
      sourceRows: 0,
      rows: [],
      canPublishProjections: false,
      note: "Expected points could not load from nflverse ff_opportunity. The board shows an empty state instead of fabricated expectations.",
      sourceUrl: FF_OPP_URL,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
