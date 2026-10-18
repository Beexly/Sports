import { db } from "@sports/db";
import { resolveNflTeamAbbreviation } from "@/lib/nfl/team-resolver";

/**
 * depth-chart-continuity.ts — REAL week-over-week starter retention for NFL
 * picks (OL / DL / DB).
 *
 * ── THE DEFINITION (the only thing this module claims) ─────────────────────
 * For one team and one unit, with two weekly snapshots of the depth chart:
 *
 *   prior   = players at pos_rank = 1 for that unit's positions in the
 *             snapshot one week earlier (2026 week 5)
 *   current = the same set in the latest snapshot (2026 week 6)
 *
 *   delta = |current ∩ prior| / |prior| - 1        (range (-1, 0])
 *
 *     0.0    every starter from last week held his job
 *    -0.2    one of five offensive linemen was replaced
 *    -0.4    two of five were
 *
 * Players are matched on `gsisId` (stable across name spellings); the
 * normalised player name is used ONLY when a row's gsis id is empty, and never
 * across teams. This is WEEK-OVER-WEEK STARTER RETENTION — the share of last
 * week's starters still listed first on the chart this week. It is not a
 * season-long rating and not a projection.
 *
 * Null per unit when the prior snapshot has no starters for that team/unit (no
 * baseline to retain against) or when the current snapshot has none (no share
 * to express). There is no fallback constant, no smoothing and no interpolated
 * baseline — missing rows produce null.
 *
 * ── WHY THIS IS COMPUTABLE AT ALL ──────────────────────────────────────────
 * `depth_chart_entries` is written by the nflverse `depth_charts` ingest
 * (CC-BY-4.0), one row per player-week. It used to hold a single week (week 0),
 * which is why the picks route had nothing to read. The upstream asset is a
 * timestamped snapshot feed (a `dt` per day, ~242 of them for 2026); the
 * backfill (scripts/backfill-nfl-depth-chart-weeks.mjs) imports two real
 * snapshots — the latest and the one nearest seven days earlier — under the
 * NFL week each falls in, so week N-1 and week N both exist and the delta is
 * measured from rows.
 *
 * ── POSITIONS ──────────────────────────────────────────────────────────────
 * nflverse `pos_abb` values are specific, never generic — there is no "OT" or
 * "CB" in the data. The units are therefore:
 *   OL = LT / RT / LG / RG / C
 *   DL = LDE / RDE / LDT / RDT / NT
 *   DB = LCB / RCB / NB / FS / SS
 * A 4-3 front lists no NT, so its DL legitimately has three starters; the
 * delta is a share of that team's OWN prior starters, so 3-man and 4-man
 * fronts stay comparable and unit size is never assumed.
 *
 * ── WHAT THIS IS NOT ───────────────────────────────────────────────────────
 * It is not a season-long continuity rating and not a projection. When the rows
 * are missing (any non-NFL sport — NCAAF has no depth-chart rows at all — or an
 * NFL season with one snapshot), it is null, and callers must pass the null
 * through rather than substituting a number.
 */

export const CONTINUITY_UNIT_POSITIONS = {
  OL: ["LT", "RT", "LG", "RG", "C"],
  DL: ["LDE", "RDE", "LDT", "RDT", "NT"],
  DB: ["LCB", "RCB", "NB", "FS", "SS"],
} as const;

export type ContinuityUnit = keyof typeof CONTINUITY_UNIT_POSITIONS;

/** Stable identifier of the metric, surfaced next to the numbers. */
export const CONTINUITY_BASIS = "week_over_week_starter_retention" as const;

const UNIT_BY_POSITION: ReadonlyMap<string, ContinuityUnit> = new Map(
  (Object.entries(CONTINUITY_UNIT_POSITIONS) as [ContinuityUnit, readonly string[]][]).flatMap(
    ([unit, positions]) => positions.map((position) => [position, unit] as const),
  ),
);

/** The unit a depth-chart position belongs to, or null for non-unit positions (QB, WR, K, ...). */
export function unitForPosition(position: string | null | undefined): ContinuityUnit | null {
  if (!position) return null;
  return UNIT_BY_POSITION.get(position.trim().toUpperCase()) ?? null;
}

/** Minimal shape this module needs from a `depth_chart_entries` row. */
export interface DepthChartRow {
  readonly team: string | null;
  readonly position: string | null;
  readonly depthRank: number | null;
  readonly gsisId: string | null;
  readonly playerName: string;
}

/** Real continuity numbers for one team, keyed to the two weeks compared. */
export interface TeamUnitContinuity {
  readonly olContinuityDelta: number | null;
  readonly dlContinuityDelta: number | null;
  readonly dbContinuityDelta: number | null;
  /** Prior-week starters found per unit — the denominator of each delta. */
  readonly olStarters: number;
  readonly dlStarters: number;
  readonly dbStarters: number;
  readonly week: number;
  readonly priorWeek: number;
}

/**
 * Starter identity: the gsis id when the row has one (stable across name
 * spellings), otherwise the normalised name. Never invented — a row with
 * neither is skipped by the caller.
 */
function starterKey(row: DepthChartRow): string | null {
  const gsis = row.gsisId?.trim();
  if (gsis) return `gsis:${gsis}`;
  const name = row.playerName.trim().toLowerCase().replace(/\s+/g, " ");
  return name ? `name:${name}` : null;
}

/** Group one week's depth-chart rows into per-unit starter sets for one team. */
export function starterSetsByUnit(
  rows: readonly DepthChartRow[],
): Record<ContinuityUnit, Set<string>> {
  const sets: Record<ContinuityUnit, Set<string>> = { OL: new Set(), DL: new Set(), DB: new Set() };
  for (const row of rows) {
    if (row.depthRank !== 1) continue;
    const unit = unitForPosition(row.position);
    if (!unit) continue;
    const key = starterKey(row);
    if (key) sets[unit].add(key);
  }
  return sets;
}

/**
 * Share of the prior week's starters still starting this week, minus 1.
 * Null when either side is empty — a missing baseline is not "no change".
 */
export function unitContinuityDelta(
  current: ReadonlySet<string>,
  prior: ReadonlySet<string>,
): number | null {
  if (current.size === 0 || prior.size === 0) return null;
  let kept = 0;
  for (const key of current) if (prior.has(key)) kept += 1;
  // Four decimals keeps the value stable across JS float noise while staying
  // finer than any depth chart can distinguish (1/5 = 0.2).
  return Math.round((kept / prior.size - 1) * 10_000) / 10_000;
}

export function computeTeamUnitContinuity(
  currentRows: readonly DepthChartRow[],
  priorRows: readonly DepthChartRow[],
  week: number,
  priorWeek: number,
): TeamUnitContinuity {
  const current = starterSetsByUnit(currentRows);
  const prior = starterSetsByUnit(priorRows);
  return {
    olContinuityDelta: unitContinuityDelta(current.OL, prior.OL),
    dlContinuityDelta: unitContinuityDelta(current.DL, prior.DL),
    dbContinuityDelta: unitContinuityDelta(current.DB, prior.DB),
    olStarters: prior.OL.size,
    dlStarters: prior.DL.size,
    dbStarters: prior.DB.size,
    week,
    priorWeek,
  };
}

/** Per-team deltas for one pair of weeks. Teams absent from either side are omitted. */
export function computeContinuityByTeam(
  currentRows: readonly DepthChartRow[],
  priorRows: readonly DepthChartRow[],
  week: number,
  priorWeek: number,
): Map<string, TeamUnitContinuity> {
  const byTeam = new Map<string, { current: DepthChartRow[]; prior: DepthChartRow[] }>();
  const slot = (team: string) => {
    let entry = byTeam.get(team);
    if (!entry) {
      entry = { current: [], prior: [] };
      byTeam.set(team, entry);
    }
    return entry;
  };
  for (const row of currentRows) if (row.team) slot(row.team).current.push(row);
  for (const row of priorRows) if (row.team) slot(row.team).prior.push(row);

  const out = new Map<string, TeamUnitContinuity>();
  for (const [team, { current, prior }] of byTeam) {
    out.set(team, computeTeamUnitContinuity(current, prior, week, priorWeek));
  }
  return out;
}

/**
 * Structural view of the Prisma model this module reads. Narrow on purpose:
 * tests drive it with plain arrays, and the route passes the real client.
 */
export interface DepthChartEntryReader {
  findMany(args: {
    where: Record<string, unknown>;
    select: Record<string, boolean>;
    distinct?: string[];
    orderBy?: Record<string, "asc" | "desc">;
    take?: number;
  }): Promise<Array<DepthChartRow & { week: number }>>;
}

const ROW_SELECT = {
  week: true,
  team: true,
  position: true,
  depthRank: true,
  gsisId: true,
  playerName: true,
} as const;

/**
 * Load real continuity deltas for the given team abbreviations (nflverse
 * `club_code`: ARI, ATL, ...), for the newest week pair present in the table.
 *
 * Returns an EMPTY map when the season holds fewer than two weekly snapshots —
 * the caller then emits null rather than a number. Never throws: depth charts
 * are context, and a picks response must not die because this table is thin.
 */
export async function loadDepthChartContinuity(
  teamAbbreviations: readonly string[],
  options: { season: number; reader?: DepthChartEntryReader },
): Promise<Map<string, TeamUnitContinuity>> {
  const teams = [...new Set(teamAbbreviations.filter(Boolean))];
  if (teams.length === 0) return new Map();
  const reader = options.reader ?? (db.depthChartEntry as unknown as DepthChartEntryReader);

  try {
    const weekRows = await reader.findMany({
      where: { season: options.season, team: { in: teams } },
      select: { week: true },
      distinct: ["week"],
      orderBy: { week: "desc" },
      take: 2,
    });
    const weeks = [...new Set(weekRows.map((r) => r.week))].sort((a, b) => b - a);
    if (weeks.length < 2) return new Map(); // one snapshot ⇒ no delta, honestly null
    const [week, priorWeek] = weeks as [number, number];

    const rows = await reader.findMany({
      where: {
        season: options.season,
        week: { in: [week, priorWeek] },
        team: { in: teams },
      },
      select: ROW_SELECT,
      orderBy: { week: "desc" },
    });
    const currentRows = rows.filter((r) => r.week === week);
    const priorRows = rows.filter((r) => r.week === priorWeek);
    return computeContinuityByTeam(currentRows, priorRows, week, priorWeek);
  } catch (error) {
    if (process.env.DEBUG_DEPTH_CONTINUITY) console.warn("[depth-chart-continuity]", error);
    return new Map();
  }
}

/**
 * NFL season a kickoff belongs to: the calendar year, except January/February
 * games, which are the previous season's playoffs.
 */
export function nflSeasonForKickoff(kickoff: Date): number {
  const year = kickoff.getUTCFullYear();
  const month = kickoff.getUTCMonth(); // 0-based
  return month <= 1 ? year - 1 : year;
}

/**
 * Which team a pick is on, as an nflverse abbreviation, or null.
 *
 * Spread/moneyline selections name the side ("Arizona Cardinals +3.5"), so the
 * side is whichever of the game's two full team names the selection mentions —
 * matched through the shared alias table, never a local 32-team switch. A TOTAL
 * names no side, and one team's line continuity must not be attributed to it,
 * so totals resolve to null.
 */
export function resolvePickTeamAbbreviation(input: {
  selection: string | null | undefined;
  pickType: string | null | undefined;
  homeTeamName: string | null | undefined;
  awayTeamName: string | null | undefined;
}): string | null {
  if ((input.pickType ?? "").toUpperCase() === "TOTAL") return null;
  const selection = (input.selection ?? "").toLowerCase();
  if (!selection) return null;
  for (const name of [input.homeTeamName, input.awayTeamName]) {
    if (!name) continue;
    const trimmed = name.trim();
    if (trimmed && selection.includes(trimmed.toLowerCase())) {
      const abbr = resolveNflTeamAbbreviation(trimmed);
      if (abbr) return abbr;
    }
  }
  return null;
}
