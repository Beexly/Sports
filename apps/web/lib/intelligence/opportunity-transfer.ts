/**
 * Opportunity transfer — the waiver predictive core.
 *
 * Production follows opportunity, and opportunity is a fixed pie: when a starter
 * is ruled OUT, the targets and carries his role commanded do not vanish — they
 * transfer to whoever is next on the depth chart at his position. This is the
 * single most actionable, least-priced edge on the waiver wire: the volume is
 * vacated BEFORE the replacement has produced anything, so the market hasn't
 * caught up yet.
 *
 * How we build it (real data, three sources triangulated):
 *   • loadNflverseInjuryReport → the OUT / IR designations (reported facts).
 *   • loadNflverseDepthCharts  → the same-team, same-position next man up.
 *   • player_stats_week        → the OUT player's TRAILING per-game targets +
 *     carries — i.e. exactly how much usage his role vacates.
 * For each OUT player with a recent usage footprint and a named backup, we emit
 * one transfer row quantifying the vacated targets/carries and the most likely
 * beneficiary.
 *
 * Honesty rules: no injuries → no transfer rows (we never fabricate a cascade).
 * An OUT player with no measurable recent usage, or no identifiable backup, is
 * surfaced with a downgraded confidence and an explicit note, never invented.
 * Real nflverse data, multi-host failover; canPublishProjections false — this is
 * opportunity context, not a point projection or a pick.
 */

import {
  loadNflverseInjuryReport,
  type InjuryRow,
  type NflverseInjuryReport,
} from "@/lib/nflverse/injury-report";
import {
  loadNflverseDepthCharts,
  type DepthChartRow,
  type NflverseDepthCharts,
} from "@/lib/nflverse/depth-charts";
import { assertIngestible, fetchWithFailover, nflverseUrl, parseCsv, withMirrors } from "@sports/data-ingestion";
import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";
import { normName } from "./qb-consensus";

type CsvRecord = Readonly<Record<string, string>>;
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type TransferConfidence = "high" | "medium" | "low";

export interface OpportunityTransferRow {
  readonly team: string;
  readonly position: string;
  readonly outPlayer: string;
  /** OUT player's trailing per-game targets that the role vacates. */
  readonly vacatedTargets: number;
  /** OUT player's trailing per-game carries that the role vacates. */
  readonly vacatedCarries: number;
  /** Most likely beneficiary: same-team, same-position next man on the depth chart. */
  readonly beneficiary: string | null;
  readonly confidence: TransferConfidence;
  readonly note: string;
}

export interface OpportunityTransfer {
  readonly generatedAt: string;
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly week: number | null;
  readonly sourceRows: number;
  readonly rows: readonly OpportunityTransferRow[];
  readonly canPublishProjections: false;
  readonly note: string;
  readonly sourceUrl: string;
  readonly error: string | null;
}

// Positions whose usage is target/carry-bearing (the only roles this engine models).
const SKILL_POSITIONS = new Set(["RB", "WR", "TE", "FB"]);
// Look back at most this many recent player-weeks for the OUT player's usage rate.
const TRAILING_WEEKS = 5;
const MIN_VACATED_USAGE = 1.0; // per game targets + carries to count as a real role

function num(v: string | undefined): number {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : 0;
}
function round(v: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

interface UsageWeek {
  readonly week: number;
  readonly targets: number;
  readonly carries: number;
}

/** Per-player trailing per-game targets+carries, keyed by normalized name. Pure. */
export function buildUsageRates(
  records: readonly CsvRecord[],
  activeSeason: number,
): Map<string, { targetsPerGame: number; carriesPerGame: number; games: number }> {
  const byPlayer = new Map<string, { name: string; weeks: UsageWeek[] }>();
  for (const r of records) {
    if (num(r["season"]) !== activeSeason) continue;
    if (r["season_type"] && r["season_type"] !== "REG") continue;
    const name = r["player_display_name"] ?? r["player_name"] ?? r["full_name"] ?? "";
    if (!name) continue;
    const key = normName(name);
    const week = num(r["week"]);
    const entry = byPlayer.get(key) ?? { name, weeks: [] };
    entry.weeks.push({ week, targets: num(r["targets"]), carries: num(r["carries"]) });
    byPlayer.set(key, entry);
  }

  const rates = new Map<string, { targetsPerGame: number; carriesPerGame: number; games: number }>();
  for (const [key, entry] of byPlayer) {
    const recent = [...entry.weeks].sort((a, b) => b.week - a.week).slice(0, TRAILING_WEEKS);
    if (recent.length === 0) continue;
    const targets = recent.reduce((s, w) => s + w.targets, 0);
    const carries = recent.reduce((s, w) => s + w.carries, 0);
    rates.set(key, {
      targetsPerGame: targets / recent.length,
      carriesPerGame: carries / recent.length,
      games: recent.length,
    });
  }
  return rates;
}

/** Index depth-chart rows by team|position → rows sorted by depth order (1 = starter). Pure. */
function indexDepth(depth: readonly DepthChartRow[]): Map<string, DepthChartRow[]> {
  const bySlot = new Map<string, DepthChartRow[]>();
  for (const d of depth) {
    if (!SKILL_POSITIONS.has(d.position)) continue;
    const slot = `${d.team}|${d.position}`;
    const list = bySlot.get(slot) ?? [];
    list.push(d);
    bySlot.set(slot, list);
  }
  for (const list of bySlot.values()) list.sort((a, b) => a.depthOrder - b.depthOrder);
  return bySlot;
}

/**
 * Build opportunity-transfer rows. Pure — exercised offline by the test with a
 * tiny injuries + depth + usage fixture. No injuries → empty (no fabrication).
 */
export function buildOpportunityTransfer(
  injuries: readonly InjuryRow[],
  depth: readonly DepthChartRow[],
  usageRates: ReadonlyMap<string, { targetsPerGame: number; carriesPerGame: number; games: number }>,
): OpportunityTransferRow[] {
  const out = injuries.filter((i) => i.reportStatus === "Out" && SKILL_POSITIONS.has((i.position ?? "").toUpperCase()));
  if (out.length === 0) return []; // no injuries → no transfer rows

  const depthBySlot = indexDepth(depth);

  const rows: OpportunityTransferRow[] = [];
  for (const inj of out) {
    const team = (inj.team ?? "").toUpperCase();
    const position = (inj.position ?? "").toUpperCase();
    const outKey = normName(inj.playerName);
    const usage = usageRates.get(outKey);
    const vacatedTargets = round(usage?.targetsPerGame ?? 0);
    const vacatedCarries = round(usage?.carriesPerGame ?? 0);

    // The beneficiary is the same-team, same-position player highest on the depth
    // chart who is NOT the OUT player himself (next man up).
    const slot = depthBySlot.get(`${team}|${position}`) ?? [];
    const beneficiaryRow = slot.find((d) => normName(d.playerName) !== outKey) ?? null;
    const beneficiary = beneficiaryRow ? beneficiaryRow.playerName : null;

    const totalVacated = vacatedTargets + vacatedCarries;
    const hasUsage = usage != null && totalVacated >= MIN_VACATED_USAGE;

    let confidence: TransferConfidence;
    let note: string;
    if (!hasUsage && !beneficiary) {
      confidence = "low";
      note = `${inj.playerName} is OUT, but we measured no recent target/carry usage and found no identifiable backup on the depth chart — no transfer to project.`;
    } else if (!hasUsage) {
      confidence = "low";
      note = `${inj.playerName} is OUT, but his recent target/carry footprint is negligible — the vacated opportunity is small, so any transfer is marginal.`;
    } else if (!beneficiary) {
      confidence = "medium";
      note = `${inj.playerName} (OUT) vacates ${round(totalVacated)} targets+carries per game, but no same-position backup is listed on the depth chart — the opportunity is open but the beneficiary is unclear.`;
    } else {
      // Strong, clean signal: real vacated volume AND a named next man up.
      confidence = totalVacated >= 8 ? "high" : "medium";
      note = `${inj.playerName} (OUT) vacates ${round(totalVacated)} targets+carries per game; ${beneficiary} is the next ${position} up on ${team} and the most likely beneficiary.`;
    }

    rows.push({ team, position, outPlayer: inj.playerName, vacatedTargets, vacatedCarries, beneficiary, confidence, note });
  }

  // Largest vacated opportunity first — the most actionable waiver adds on top.
  rows.sort((a, b) => b.vacatedTargets + b.vacatedCarries - (a.vacatedTargets + a.vacatedCarries));
  return rows;
}

export async function loadOpportunityTransfer({
  season = latestNflverseInspectionSeason(),
  timeoutMs = 15000,
  fetcher = fetch,
}: { season?: number; timeoutMs?: number; fetcher?: FetchLike } = {}): Promise<OpportunityTransfer> {
  assertIngestible("nflverse");
  const statsUrl = nflverseUrl("player_stats_week", season);

  let injury: NflverseInjuryReport;
  let depth: NflverseDepthCharts;
  let stats: { records: readonly CsvRecord[] };
  try {
    [injury, depth] = await Promise.all([
      loadNflverseInjuryReport({ season, timeoutMs, fetcher, cacheTtlMs: 0 }),
      loadNflverseDepthCharts({ season, timeoutMs, fetcher, cacheTtlMs: 0 }),
    ]);
    const { response } = await fetchWithFailover(withMirrors(statsUrl), fetcher, { timeoutMs });
    const { records } = parseCsv(await response.text());
    if (records.length === 0) throw new Error("empty player_stats_week");
    stats = { records };
  } catch (error) {
    return errorState(statsUrl, error instanceof Error ? error.message : "UNKNOWN");
  }

  // The injury report is the anchor: if availability can't load, there is nothing
  // honest to compute, so surface the source error rather than an empty success.
  if (injury.status === "source-error") {
    return errorState(statsUrl, injury.error ?? "injury report unavailable");
  }

  // Anchor the usage season to whatever the stats file actually carries.
  const hasSeason = stats.records.some((r) => num(r["season"]) === season && (r["season_type"] ? r["season_type"] === "REG" : true));
  const activeSeason = hasSeason ? season : stats.records.reduce((m, r) => Math.max(m, num(r["season"])), 0);

  const usageRates = buildUsageRates(stats.records, activeSeason);
  const rows = buildOpportunityTransfer(injury.rows, depth.rows, usageRates);

  return {
    generatedAt: new Date().toISOString(),
    status: "live",
    season: injury.season,
    week: injury.week,
    sourceRows: injury.sourceRows + depth.sourceRows + stats.records.length,
    rows,
    canPublishProjections: false,
    note: "Vacated-role opportunity transfer: when a starter is OUT, the targets + carries his role commanded transfer to the next man up. We quantify the vacated per-game usage and name the most likely beneficiary. No injuries means no transfer rows — we never fabricate a cascade. Context, not a point projection.",
    sourceUrl: statsUrl,
    error: null,
  };
}

function errorState(sourceUrl: string, error: string): OpportunityTransfer {
  return {
    generatedAt: new Date().toISOString(),
    status: "source-error",
    season: 0,
    week: null,
    sourceRows: 0,
    rows: [],
    canPublishProjections: false,
    note: "Opportunity transfer could not load from nflverse (injuries, depth charts, or usage). The product shows an empty state instead of a fabricated cascade.",
    sourceUrl,
    error,
  };
}
