/**
 * Scoring Zone — red-zone & goal-line TD equity from OPPORTUNITY, not past TDs.
 *
 * Touchdowns are the single most volatile, luck-soaked input in fantasy/market
 * value. A player does not "earn" a TD by scoring last week — he earns the
 * *chance* at one by being the player his offense feeds inside the 20, the 10,
 * and especially the 5. That OPPORTUNITY (red-zone carries + targets) is far
 * stickier week to week than the TDs it eventually yields. So we read the role,
 * not the box score:
 *
 *   • Red-zone / goal-line opportunity SHARE — each player's slice of his team's
 *     scoring-zone carries + targets (yardline_100 <= 20, <= 10, <= 5). Sticky.
 *   • TD-per-opportunity RATE — regressed toward the positional mean, heavy at
 *     low volume (<15 touches) and light at high volume (50+), so a 1-for-3 hot
 *     streak isn't treated as talent and a 0-for-20 cold streak isn't treated as
 *     fate.
 *
 * How we USE it (the differentiator):
 *   • high opportunity share + low TD rate  → BUY  (positive TD regression — the
 *     scores are coming; the role is bigger than the points).
 *   • low opportunity share + high TD rate   → SELL (TD-luck dependent; the
 *     output is borrowed from variance and prone to regress).
 *
 * Build our OWN minimal play-by-play fetch inline (nflverseUrl("pbp", s) +
 * fetchWithFailover(withMirrors(url)) + parseCsv) with a [season, season-1]
 * fallback — no dependency on another loader. Real nflverse data (CC-BY-4.0),
 * multi-host failover, honest source-error, defensive column parsing.
 * canPublishProjections false — it's an opportunity read, not a point projection.
 */

import { assertIngestible, fetchWithFailover, nflverseUrl, parseCsv, withMirrors } from "@sports/data-ingestion";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";
import { percentileRanks } from "./qb-consensus";

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type ScoringZoneSignal = "buy" | "sell" | "in-line";

export interface ScoringZoneRow {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly position: string;
  readonly rzCarries: number; // carries inside the 20
  readonly rzTargets: number; // targets inside the 20
  readonly rzShare: number; // player's share of team scoring-zone opportunities, 0-1
  readonly inside5: number; // carries + targets inside the 5 (the highest-equity looks)
  readonly rzTds: number; // TDs scored from scoring-zone opportunities
  readonly tdRate: number; // raw TD per scoring-zone opportunity, 0-1
  readonly expectedTdRate: number; // rate regressed toward the positional mean, 0-1
  readonly sharePct: number; // opportunity-share percentile within the pool
  readonly tdRatePct: number; // raw-TD-rate percentile within the pool
  readonly signal: ScoringZoneSignal;
  readonly note: string;
}

export interface ScoringZone {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly throughWeek: number | null;
  readonly sourceRows: number;
  readonly rows: readonly ScoringZoneRow[];
  readonly canPublishProjections: false;
  readonly note: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

const MIN_OPPS = 6; // minimum scoring-zone opportunities to qualify (so a share is meaningful)
const TOP_N = 40;
const DIVERGENCE = 18; // percentile points
// Regression strength: blend weight = opps / (opps + REGRESSION_K). Light at 50+, heavy at <15.
const REGRESSION_K = 12;

function num(v: string | undefined): number {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : 0;
}
function finite(v: string | undefined): number | null {
  const n = Number(v ?? "");
  return Number.isFinite(n) && v !== undefined && v !== "" ? n : null;
}
function round(v: number, d = 3): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

/** Truthy for nflverse's "1"/"0"/"TRUE"/"FALSE" boolean-ish columns; missing → false. */
function flag(v: string | undefined): boolean {
  if (v === undefined || v === "") return false;
  const s = v.toLowerCase();
  return s === "1" || s === "true" || s === "t";
}

interface Agg {
  name: string;
  team: string;
  position: string;
  rzCarries: number;
  rzTargets: number;
  inside5: number;
  rzTds: number;
}

function signalFor(sharePct: number, tdRatePct: number): { signal: ScoringZoneSignal; note: string } {
  const gap = sharePct - tdRatePct;
  if (gap >= DIVERGENCE)
    return {
      signal: "buy",
      note: "High scoring-zone opportunity share, low TD conversion so far — the role is feeding him the looks and the scores are due to regress up. Buy the equity before the box score catches up.",
    };
  if (gap <= -DIVERGENCE)
    return {
      signal: "sell",
      note: "TDs are outrunning the scoring-zone opportunity — the output is borrowed from conversion luck on a thin role. Sell into the touchdowns before they regress.",
    };
  return {
    signal: "in-line",
    note: "Touchdown output tracks the scoring-zone opportunity — the scores are earned by the role.",
  };
}

/**
 * Build scoring-zone opportunity rows from raw play-by-play. Pure.
 *
 * Reads only red-zone plays (yardline_100 <= 20). For each play it attributes a
 * carry to rusher_player_id (rush plays) or a target to receiver_player_id (pass
 * plays), credits the player's team (posteam) so we can compute team totals, and
 * counts a scoring-zone TD when the play scored on that touch. It then computes
 * each qualified player's share of his team's scoring-zone opportunities and
 * regresses his TD-per-opportunity rate toward the positional mean.
 */
export function buildScoringZone(records: readonly CsvRecord[], activeSeason: number): { rows: ScoringZoneRow[]; throughWeek: number | null } {
  // Red-zone, regular-season plays for the active season only.
  const rz = records.filter((r) => {
    if (num(r["season"]) !== activeSeason) return false;
    if (r["season_type"] && r["season_type"] !== "REG") return false;
    const y100 = finite(r["yardline_100"]);
    return y100 != null && y100 <= 20;
  });
  if (rz.length === 0) return { rows: [], throughWeek: null };
  const throughWeek = rz.reduce((m, r) => Math.max(m, num(r["week"])), 0) || null;

  const byPlayer = new Map<string, Agg>();
  const teamOpps = new Map<string, number>(); // posteam → total scoring-zone opportunities

  for (const r of rz) {
    const team = r["posteam"] ?? r["pos_team"] ?? "";
    if (!team) continue;
    const y100 = finite(r["yardline_100"]) ?? 99;

    // Is this a rush or a pass opportunity? Prefer explicit attempt flags, fall
    // back to play_type, fall back to which player-id column is populated.
    const rusher = r["rusher_player_id"] || r["rusher_id"] || "";
    const receiver = r["receiver_player_id"] || r["receiver_id"] || "";
    const playType = (r["play_type"] ?? "").toLowerCase();
    const isRush = flag(r["rush_attempt"]) || playType === "run" || (!!rusher && !receiver);
    const isPass = flag(r["pass_attempt"]) || playType === "pass" || (!!receiver && !rusher);

    let id = "";
    let isCarry = false;
    let isTarget = false;
    if (isRush && rusher) {
      id = rusher;
      isCarry = true;
    } else if (isPass && receiver) {
      id = receiver;
      isTarget = true;
    }
    if (!id || (!isCarry && !isTarget)) continue; // sacks, spikes, penalties with no attributed touch drop out

    // Every attributed scoring-zone touch is one team opportunity.
    teamOpps.set(team, (teamOpps.get(team) ?? 0) + 1);

    const a =
      byPlayer.get(id) ??
      ({
        name: (isCarry ? r["rusher_player_name"] : r["receiver_player_name"]) || r["rusher_player_name"] || r["receiver_player_name"] || id,
        team,
        position: "",
        rzCarries: 0,
        rzTargets: 0,
        inside5: 0,
        rzTds: 0,
      } satisfies Agg);

    if (isCarry) a.rzCarries += 1;
    if (isTarget) a.rzTargets += 1;
    if (y100 <= 5) a.inside5 += 1;

    // TD credited only when this player's touch scored. Prefer the explicit
    // scorer id; otherwise use the rush/pass TD flag on this attributed play.
    const tdPlayer = r["td_player_id"] || "";
    const scored = tdPlayer ? tdPlayer === id : isCarry ? flag(r["rush_touchdown"]) : flag(r["pass_touchdown"]);
    if (scored) a.rzTds += 1;

    a.team = team || a.team;
    byPlayer.set(id, a);
  }

  if (byPlayer.size === 0) return { rows: [], throughWeek };

  // Position is not carried on every pbp row consistently; infer it from usage.
  // Pure rushers → RB, pure/mostly receivers → WR/TE proxy. We keep it coarse and
  // honest: we never invent a specific position we can't support, we bucket by
  // dominant usage so the positional-mean regression is sensible.
  const entries = [...byPlayer.entries()].map(([id, a]) => {
    const opps = a.rzCarries + a.rzTargets;
    const position = a.rzCarries >= a.rzTargets ? "RB" : "REC";
    return { id, a, opps, position };
  });

  // Positional mean TD-per-opportunity (over the whole qualified-ish pool, by bucket).
  const posMean = (bucket: string): number => {
    const pool = entries.filter((e) => e.position === bucket && e.opps > 0);
    const totTds = pool.reduce((s, e) => s + e.a.rzTds, 0);
    const totOpps = pool.reduce((s, e) => s + e.opps, 0);
    return totOpps > 0 ? totTds / totOpps : 0;
  };
  const meanByPos: Record<string, number> = { RB: posMean("RB"), REC: posMean("REC") };

  const qualified = entries.filter((e) => e.opps >= MIN_OPPS);
  if (qualified.length === 0) return { rows: [], throughWeek };

  const shares = qualified.map((e) => {
    const teamTotal = teamOpps.get(e.a.team) ?? 0;
    return teamTotal > 0 ? e.opps / teamTotal : 0;
  });
  const tdRates = qualified.map((e) => (e.opps > 0 ? e.a.rzTds / e.opps : 0));
  const sharePcts = percentileRanks(shares);
  const tdRatePcts = percentileRanks(tdRates);

  const out: ScoringZoneRow[] = qualified.map((e, i) => {
    const opps = e.opps;
    const rawRate = opps > 0 ? e.a.rzTds / opps : 0;
    const mean = meanByPos[e.position] ?? 0;
    // Regress toward the positional mean: weight grows with sample so 50+ touches
    // are believed (light regression) and <15 touches are pulled hard to the mean.
    const w = opps / (opps + REGRESSION_K);
    const expectedTdRate = w * rawRate + (1 - w) * mean;
    const sharePct = sharePcts[i] ?? 0;
    const tdRatePct = tdRatePcts[i] ?? 0;
    const { signal, note } = signalFor(sharePct, tdRatePct);
    return {
      playerId: e.id,
      name: e.a.name,
      team: e.a.team,
      position: e.position === "RB" ? "RB" : "WR/TE",
      rzCarries: e.a.rzCarries,
      rzTargets: e.a.rzTargets,
      rzShare: round(shares[i] ?? 0, 3),
      inside5: e.a.inside5,
      rzTds: e.a.rzTds,
      tdRate: round(rawRate, 3),
      expectedTdRate: round(expectedTdRate, 3),
      sharePct: Math.round(sharePct),
      tdRatePct: Math.round(tdRatePct),
      signal,
      note,
    };
  });

  // Biggest scoring-zone role first — the board leads with the players who own
  // the most TD equity, regardless of whether they've cashed it yet.
  out.sort((x, y) => y.rzShare - x.rzShare || y.rzCarries + y.rzTargets - (x.rzCarries + x.rzTargets));
  return { rows: out.slice(0, TOP_N), throughWeek };
}

export async function loadScoringZone({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 20000,
  fetcher = fetch,
}: { season?: number; timeoutMs?: number; fetcher?: FetchLike } = {}): Promise<ScoringZone> {
  assertIngestible("nflverse");

  const candidates = [season, season - 1];
  let lastError: unknown = null;
  let lastUrl = nflverseUrl("pbp", season);

  for (const candidate of candidates) {
    const url = nflverseUrl("pbp", candidate);
    lastUrl = url;
    try {
      const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs });
      const { records } = parseCsv(await response.text());
      if (records.length === 0) throw new Error(`empty pbp for ${candidate}`);

      // The file is single-season; if it isn't the season we asked for, read the
      // latest season actually present in the rows.
      const hasSeason = records.some((r) => num(r["season"]) === candidate);
      const activeSeason = hasSeason ? candidate : records.reduce((m, r) => Math.max(m, num(r["season"])), 0);

      const { rows, throughWeek } = buildScoringZone(records, activeSeason);
      if (rows.length === 0) throw new Error(`no scoring-zone rows for ${activeSeason}`);

      return {
        generatedAt: new Date().toISOString(),
        status: "live",
        season: activeSeason,
        throughWeek,
        sourceRows: records.length,
        rows,
        canPublishProjections: false,
        note: "Real nflverse play-by-play, filtered to the red zone and goal line. We read TD equity from OPPORTUNITY share (sticky), regress conversion rate toward the positional mean, and flag high-share/low-TD as buy and high-TD/low-share as sell. Context, not a pick.",
        sourceUrl: url,
        error: null,
      };
    } catch (error) {
      lastError = error;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    status: "source-error",
    season: 0,
    throughWeek: null,
    sourceRows: 0,
    rows: [],
    canPublishProjections: false,
    note: "Scoring-zone opportunity could not load from nflverse play-by-play. The product shows an empty state instead of fabricated red-zone usage.",
    sourceUrl: lastUrl,
    error: lastError instanceof Error ? lastError.message : "UNKNOWN",
  };
}
