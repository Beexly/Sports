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
export type RoleState = "idle" | "reserve" | "rotation" | "lead";

export interface RoleStateWeek {
  readonly week: number;
  readonly touches: number;
  readonly state: RoleState;
}

export interface UsageRate {
  readonly targetsPerGame: number;
  readonly carriesPerGame: number;
  readonly games: number;
  readonly roleState: RoleState;
  readonly weeks: readonly RoleStateWeek[];
}

export interface RoleTransitionCell {
  readonly from: RoleState;
  readonly to: RoleState;
  readonly observed: number;
  readonly prior: number;
  readonly probability: number;
  readonly shrinkWeight: number;
}

export type RoleTransitionModel = Readonly<Record<RoleState, Readonly<Record<RoleState, RoleTransitionCell>>>>;

export interface RoleRedistribution {
  readonly playerName: string;
  readonly depthOrder: number;
  readonly roleState: RoleState;
  readonly transitionToLeadProb: number;
  readonly share: number;
  readonly redistributedTargets: number;
  readonly redistributedCarries: number;
}

export interface OpportunityTransferRow {
  readonly team: string;
  readonly position: string;
  readonly outPlayer: string;
  readonly outPlayerRoleState: RoleState;
  /** OUT player's trailing per-game targets that the role vacates. */
  readonly vacatedTargets: number;
  /** OUT player's trailing per-game carries that the role vacates. */
  readonly vacatedCarries: number;
  /** Most likely beneficiary: same-team, same-position next man on the depth chart. */
  readonly beneficiary: string | null;
  readonly beneficiaryTransitionToLeadProb: number;
  readonly redistribution: readonly RoleRedistribution[];
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
const ROLE_STATES: readonly RoleState[] = ["idle", "reserve", "rotation", "lead"];
const ROLE_TRANSITION_K = 8;
const ROLE_TRANSITION_PRIOR: Record<RoleState, Record<RoleState, number>> = {
  idle: { idle: 4, reserve: 2, rotation: 0.7, lead: 0.2 },
  reserve: { idle: 1.2, reserve: 4, rotation: 2, lead: 0.5 },
  rotation: { idle: 0.4, reserve: 1.6, rotation: 4, lead: 2 },
  lead: { idle: 0.2, reserve: 0.8, rotation: 2, lead: 5 },
};

function num(v: string | undefined): number {
  const n = Number(v ?? "");
  return Number.isFinite(n) ? n : 0;
}
function round(v: number, d = 1): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function roleStateForTouches(touchesPerGame: number): RoleState {
  if (touchesPerGame >= 12) return "lead";
  if (touchesPerGame >= 6) return "rotation";
  if (touchesPerGame >= 1) return "reserve";
  return "idle";
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
): Map<string, UsageRate> {
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

  const rates = new Map<string, UsageRate>();
  for (const [key, entry] of byPlayer) {
    const recent = [...entry.weeks].sort((a, b) => b.week - a.week).slice(0, TRAILING_WEEKS);
    if (recent.length === 0) continue;
    const targets = recent.reduce((s, w) => s + w.targets, 0);
    const carries = recent.reduce((s, w) => s + w.carries, 0);
    const touchesPerGame = (targets + carries) / recent.length;
    rates.set(key, {
      targetsPerGame: targets / recent.length,
      carriesPerGame: carries / recent.length,
      games: recent.length,
      roleState: roleStateForTouches(touchesPerGame),
      weeks: recent
        .map((w) => ({ week: w.week, touches: w.targets + w.carries, state: roleStateForTouches(w.targets + w.carries) }))
        .sort((a, b) => a.week - b.week),
    });
  }
  return rates;
}

function observedTransition(
  observed: ReadonlyMap<RoleState, ReadonlyMap<RoleState, number>>,
  from: RoleState,
  to: RoleState,
): number {
  return observed.get(from)?.get(to) ?? 0;
}

function setObservedTransition(
  observed: Map<RoleState, Map<RoleState, number>>,
  from: RoleState,
  to: RoleState,
): void {
  const row = observed.get(from) ?? new Map<RoleState, number>();
  row.set(to, (row.get(to) ?? 0) + 1);
  observed.set(from, row);
}

function transitionRow(
  from: RoleState,
  observed: ReadonlyMap<RoleState, ReadonlyMap<RoleState, number>>,
): Record<RoleState, RoleTransitionCell> {
  const observedTotal = ROLE_STATES.reduce((sum, to) => sum + observedTransition(observed, from, to), 0);
  const priorTotal = ROLE_STATES.reduce((sum, to) => sum + ROLE_TRANSITION_PRIOR[from][to], 0);
  const denominator = priorTotal + observedTotal;
  const shrinkWeight = round(observedTotal / (observedTotal + ROLE_TRANSITION_K), 3);
  const cell = (to: RoleState): RoleTransitionCell => {
    const count = observedTransition(observed, from, to);
    return {
      from,
      to,
      observed: count,
      prior: ROLE_TRANSITION_PRIOR[from][to],
      probability: round((ROLE_TRANSITION_PRIOR[from][to] + count) / denominator, 3),
      shrinkWeight,
    };
  };
  return {
    idle: cell("idle"),
    reserve: cell("reserve"),
    rotation: cell("rotation"),
    lead: cell("lead"),
  };
}

export function buildRoleTransitionModel(records: readonly CsvRecord[], activeSeason: number): RoleTransitionModel {
  const usage = new Map<string, UsageWeek[]>();
  for (const r of records) {
    if (num(r["season"]) !== activeSeason) continue;
    if (r["season_type"] && r["season_type"] !== "REG") continue;
    const name = r["player_display_name"] ?? r["player_name"] ?? r["full_name"] ?? "";
    if (!name) continue;
    const key = normName(name);
    const weeks = usage.get(key) ?? [];
    weeks.push({ week: num(r["week"]), targets: num(r["targets"]), carries: num(r["carries"]) });
    usage.set(key, weeks);
  }

  const observed = new Map<RoleState, Map<RoleState, number>>();
  for (const weeks of usage.values()) {
    const ordered = [...weeks].sort((a, b) => a.week - b.week);
    for (let i = 1; i < ordered.length; i += 1) {
      const previous = ordered[i - 1]!;
      const current = ordered[i]!;
      setObservedTransition(
        observed,
        roleStateForTouches(previous.targets + previous.carries),
        roleStateForTouches(current.targets + current.carries),
      );
    }
  }

  return {
    idle: transitionRow("idle", observed),
    reserve: transitionRow("reserve", observed),
    rotation: transitionRow("rotation", observed),
    lead: transitionRow("lead", observed),
  };
}

const DEFAULT_ROLE_TRANSITION_MODEL = buildRoleTransitionModel([], 0);

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

function allocateRounded(total: number, shares: readonly number[]): number[] {
  let allocated = 0;
  return shares.map((share, i) => {
    if (i === shares.length - 1) return round(total - allocated);
    const value = round(total * share);
    allocated += value;
    return value;
  });
}

function redistributeVacatedTouches(
  slot: readonly DepthChartRow[],
  outKey: string,
  usageRates: ReadonlyMap<string, UsageRate>,
  transitionModel: RoleTransitionModel,
  vacatedTargets: number,
  vacatedCarries: number,
): RoleRedistribution[] {
  const candidates = slot.filter((d) => normName(d.playerName) !== outKey).slice(0, 3);
  if (candidates.length === 0) return [];

  const scored = candidates.map((d) => {
    const usage = usageRates.get(normName(d.playerName));
    const roleState = usage?.roleState ?? "idle";
    const touchesPerGame = (usage?.targetsPerGame ?? 0) + (usage?.carriesPerGame ?? 0);
    const transitionToLeadProb = transitionModel[roleState].lead.probability;
    const depthScore = 1 / Math.max(1, d.depthOrder);
    const usageScore = 1 + Math.sqrt(Math.max(0, touchesPerGame)) / 4;
    const transitionScore = 0.5 + transitionToLeadProb;
    return { playerName: d.playerName, depthOrder: d.depthOrder, roleState, transitionToLeadProb, score: depthScore * usageScore * transitionScore };
  }).sort((a, b) => b.score - a.score);

  const totalScore = scored.reduce((sum, c) => sum + c.score, 0) || 1;
  const shares = scored.map((c) => c.score / totalScore);
  const targetAllocations = allocateRounded(vacatedTargets, shares);
  const carryAllocations = allocateRounded(vacatedCarries, shares);

  return scored.map((c, i) => ({
    playerName: c.playerName,
    depthOrder: c.depthOrder,
    roleState: c.roleState,
    transitionToLeadProb: c.transitionToLeadProb,
    share: round(shares[i] ?? 0, 3),
    redistributedTargets: targetAllocations[i] ?? 0,
    redistributedCarries: carryAllocations[i] ?? 0,
  }));
}

/**
 * Build opportunity-transfer rows. Pure — exercised offline by the test with a
 * tiny injuries + depth + usage fixture. No injuries → empty (no fabrication).
 */
export function buildOpportunityTransfer(
  injuries: readonly InjuryRow[],
  depth: readonly DepthChartRow[],
  usageRates: ReadonlyMap<string, UsageRate>,
  transitionModel: RoleTransitionModel = DEFAULT_ROLE_TRANSITION_MODEL,
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
    const outPlayerRoleState = usage?.roleState ?? "idle";

    // The beneficiary is the same-team, same-position player highest on the depth
    // chart who is NOT the OUT player himself (next man up).
    const slot = depthBySlot.get(`${team}|${position}`) ?? [];
    const redistribution = redistributeVacatedTouches(slot, outKey, usageRates, transitionModel, vacatedTargets, vacatedCarries);
    const beneficiary = redistribution[0]?.playerName ?? null;
    const beneficiaryTransitionToLeadProb = redistribution[0]?.transitionToLeadProb ?? 0;

    const totalVacated = vacatedTargets + vacatedCarries;
    const hasUsage = usage != null && totalVacated >= MIN_VACATED_USAGE;

    let confidence: TransferConfidence;
    let note: string;
    if (!hasUsage && !beneficiary) {
      confidence = "low";
      note = `${inj.playerName} is OUT, but we measured no recent target/carry usage and found no identifiable backup on the depth chart, so there is no transfer to project.`;
    } else if (!hasUsage) {
      confidence = "low";
      note = `${inj.playerName} is OUT, but his recent target/carry footprint is negligible. The vacated opportunity is small, so any transfer is marginal.`;
    } else if (!beneficiary) {
      confidence = "medium";
      note = `${inj.playerName} (OUT) vacates ${round(totalVacated)} targets+carries per game, but no same-position backup is listed on the depth chart. The opportunity is open but the beneficiary is unclear.`;
    } else {
      // Strong, clean signal: real vacated volume AND a named next man up.
      const share = redistribution[0]?.share ?? 0;
      confidence = totalVacated >= 8 && share >= 0.5 ? "high" : "medium";
      note = `${inj.playerName} (OUT) vacates ${round(totalVacated)} targets+carries per game; ${beneficiary} is the next ${position} up on ${team} with ${round(beneficiaryTransitionToLeadProb, 3)} transition-to-lead probability.`;
    }

    rows.push({
      team,
      position,
      outPlayer: inj.playerName,
      outPlayerRoleState,
      vacatedTargets,
      vacatedCarries,
      beneficiary,
      beneficiaryTransitionToLeadProb,
      redistribution,
      confidence,
      note,
    });
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
  const transitionModel = buildRoleTransitionModel(stats.records, activeSeason);
  const rows = buildOpportunityTransfer(injury.rows, depth.rows, usageRates, transitionModel);

  return {
    generatedAt: new Date().toISOString(),
    status: "live",
    season: injury.season,
    week: injury.week,
    sourceRows: injury.sourceRows + depth.sourceRows + stats.records.length,
    rows,
    canPublishProjections: false,
    note: "Vacated-role opportunity transfer: when a starter is OUT, the targets + carries his role commanded transfer through shrunk Markov role-state transitions to the next men up. No injuries means no transfer rows. We never fabricate a cascade. Context, not a point projection.",
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
