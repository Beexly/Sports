/**
 * Receiving opportunity — reading air yards the way a sharp does.
 *
 * Opportunity precedes production. A receiver's fantasy/market value is driven by
 * the *volume and quality* of looks (targets + air yards), and that opportunity
 * is far more stable week to week than the points it eventually yields. nflverse
 * pre-computes the gold-standard opportunity metrics from real play-by-play:
 *   • WOPR  = weighted opportunity rating (1.5·target_share + 0.7·air_yards_share)
 *   • target share, air-yards share, aDOT (depth of target), RACR, catch rate.
 *
 * How we USE it (the differentiator): we compare each player's OPPORTUNITY
 * percentile to their PRODUCTION percentile and surface the gap —
 *   • opportunity ≫ production → BUY-LOW (positive-regression candidate; the
 *     waiver/optimizer should value the role, not the box score).
 *   • production ≫ opportunity → SELL-HIGH (TD/efficiency-dependent; likely to
 *     regress). We surface the divergence; we never average it away.
 *
 * Read-only, real nflverse data, multi-host failover. canPublishProjections false.
 */

import { assertIngestible, fetchWithFailover, nflverseUrl, parseCsv, withMirrors } from "@sports/data-ingestion";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";
import { percentileRanks } from "./qb-consensus";

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type OppSignal = "buy-low" | "sell-high" | "stable";

export interface ReceivingOpportunityRow {
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly position: string;
  readonly games: number;
  readonly targets: number;
  readonly receptions: number;
  readonly recYards: number;
  readonly airYards: number;
  readonly wopr: number; // mean weekly WOPR — the opportunity score
  readonly targetShare: number; // mean weekly, 0-1
  readonly airYardsShare: number; // mean weekly, 0-1
  readonly aDOT: number; // season air yards / targets
  readonly racr: number; // season rec yards / air yards
  readonly catchRate: number; // rec / targets
  readonly oppPct: number; // WOPR percentile in the pool
  readonly prodPct: number; // rec-yards percentile in the pool
  readonly signal: OppSignal;
  readonly note: string;
}

export interface ReceivingOpportunity {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly throughWeek: number | null;
  readonly sourceRows: number;
  readonly rows: readonly ReceivingOpportunityRow[];
  readonly canPublishProjections: false;
  readonly note: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

const MIN_TARGETS = 20;
const TOP_N = 40;
const DIVERGENCE = 18; // percentile points

function toNumber(value: string | undefined): number {
  const n = Number(value ?? "");
  return Number.isFinite(n) ? n : 0;
}
function finite(value: string | undefined): number | null {
  const n = Number(value ?? "");
  return Number.isFinite(n) ? n : null;
}
function round(value: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(value * f) / f;
}

interface Agg {
  name: string; team: string; position: string;
  games: number; targets: number; receptions: number; recYards: number; airYards: number;
  woprSum: number; woprN: number; tsSum: number; tsN: number; aysSum: number; aysN: number;
}

function signalFor(oppPct: number, prodPct: number): { signal: OppSignal; note: string } {
  const gap = oppPct - prodPct;
  if (gap >= DIVERGENCE) return { signal: "buy-low", note: "Opportunity outruns production — the role is bigger than the box score. A positive-regression / buy-low target." };
  if (gap <= -DIVERGENCE) return { signal: "sell-high", note: "Production outruns opportunity — efficiency/TD-dependent and prone to regress. A sell-high / fade candidate." };
  return { signal: "stable", note: "Opportunity and production are in line — the output is earned by the role." };
}

/** Aggregate weekly player_stats rows into season opportunity rows. Pure. */
export function buildReceivingOpportunity(records: readonly CsvRecord[], activeSeason: number): { rows: ReceivingOpportunityRow[]; throughWeek: number | null } {
  const rows = records.filter(
    (r) => r["season"] === String(activeSeason) && r["season_type"] === "REG" && toNumber(r["targets"]) > 0,
  );
  if (rows.length === 0) return { rows: [], throughWeek: null };
  const throughWeek = rows.reduce((m, r) => Math.max(m, toNumber(r["week"])), 0) || null;

  const byPlayer = new Map<string, Agg>();
  for (const r of rows) {
    const pos = (r["position"] ?? "").toUpperCase();
    if (!["WR", "TE", "RB"].includes(pos)) continue;
    const id = r["player_id"] || r["player_display_name"] || "";
    if (!id) continue;
    const a = byPlayer.get(id) ?? { name: r["player_display_name"] ?? id, team: r["recent_team"] ?? "", position: pos, games: 0, targets: 0, receptions: 0, recYards: 0, airYards: 0, woprSum: 0, woprN: 0, tsSum: 0, tsN: 0, aysSum: 0, aysN: 0 };
    a.games += 1;
    a.targets += toNumber(r["targets"]);
    a.receptions += toNumber(r["receptions"]);
    a.recYards += toNumber(r["receiving_yards"]);
    a.airYards += toNumber(r["receiving_air_yards"]);
    const w = finite(r["wopr"]); if (w != null) { a.woprSum += w; a.woprN += 1; }
    const ts = finite(r["target_share"]); if (ts != null) { a.tsSum += ts; a.tsN += 1; }
    const ays = finite(r["air_yards_share"]); if (ays != null) { a.aysSum += ays; a.aysN += 1; }
    a.team = r["recent_team"] || a.team;
    byPlayer.set(id, a);
  }

  const qualified = [...byPlayer.entries()].filter(([, a]) => a.targets >= MIN_TARGETS);
  if (qualified.length === 0) return { rows: [], throughWeek };

  const woprs = qualified.map(([, a]) => (a.woprN ? a.woprSum / a.woprN : 0));
  const prods = qualified.map(([, a]) => a.recYards);
  const oppPcts = percentileRanks(woprs);
  const prodPcts = percentileRanks(prods);

  const out: ReceivingOpportunityRow[] = qualified.map(([id, a], i) => {
    const wopr = a.woprN ? a.woprSum / a.woprN : 0;
    const oppPct = oppPcts[i] ?? 0;
    const prodPct = prodPcts[i] ?? 0;
    const { signal, note } = signalFor(oppPct, prodPct);
    return {
      playerId: id,
      name: a.name,
      team: a.team,
      position: a.position,
      games: a.games,
      targets: a.targets,
      receptions: a.receptions,
      recYards: a.recYards,
      airYards: a.airYards,
      wopr: round(wopr, 3),
      targetShare: round(a.tsN ? a.tsSum / a.tsN : 0, 3),
      airYardsShare: round(a.aysN ? a.aysSum / a.aysN : 0, 3),
      aDOT: round(a.targets ? a.airYards / a.targets : 0, 1),
      racr: round(a.airYards ? a.recYards / a.airYards : 0, 2),
      catchRate: round(a.targets ? a.receptions / a.targets : 0, 3),
      oppPct,
      prodPct,
      signal,
      note,
    };
  });

  out.sort((x, y) => y.wopr - x.wopr);
  return { rows: out.slice(0, TOP_N), throughWeek };
}

export async function loadReceivingOpportunity({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  fetcher = fetch,
}: { season?: number; timeoutMs?: number; fetcher?: FetchLike } = {}): Promise<ReceivingOpportunity> {
  assertIngestible("nflverse");
  const url = nflverseUrl("player_stats_week", season);
  try {
    const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs });
    const { records } = parseCsv(await response.text());
    if (records.length === 0) throw new Error("empty player_stats_week");

    // Offseason fallback: if the requested season has no rows, use the latest present.
    const hasSeason = records.some((r) => r["season"] === String(season) && r["season_type"] === "REG");
    const activeSeason = hasSeason ? season : records.reduce((m, r) => Math.max(m, toNumber(r["season"])), 0);

    const { rows, throughWeek } = buildReceivingOpportunity(records, activeSeason);
    return {
      generatedAt: new Date().toISOString(),
      status: "live",
      season: activeSeason,
      throughWeek,
      sourceRows: records.length,
      rows,
      canPublishProjections: false,
      note: "Real nflverse opportunity metrics (WOPR, target & air-yards share, aDOT, RACR). We read opportunity as the leading indicator and flag where it diverges from production (buy-low / sell-high). Context, not a pick.",
      sourceUrl: url,
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
      note: "Receiving opportunity could not load from nflverse. The product shows an empty state instead of fabricated usage.",
      sourceUrl: url,
      error: error instanceof Error ? error.message : "UNKNOWN",
    };
  }
}
