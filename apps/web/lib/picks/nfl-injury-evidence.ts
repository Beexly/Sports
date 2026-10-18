/**
 * NFL injuryEvidence for the public picks payload, built from the `injuries`
 * table rather than from a canned sentence.
 *
 * WHY THIS MODULE EXISTS
 * The public route used to emit a hard-coded PLAYER_AVAILABILITY object that
 * claimed an "official 90-minute pregame report processed against depth charts"
 * for every pick, including games with no report at all. That claim was removed
 * (78025960e), leaving `injuryEvidence` absent. The `injuries` table, however,
 * holds the real NFL weekly report (season/week keyed, nflverse-sourced), and a
 * public pick can honestly show it for both clubs in the game.
 *
 * HONESTY RULES (enforced here, not in prose)
 *  - Only rows whose season AND week equal the resolved as-of week are used. The
 *    bundle loader keeps earlier weeks for its own continuity math; presenting a
 *    week-5 report as week-6 evidence would be a stale claim.
 *  - A team with no rows is omitted from `teams` and named in
 *    `teamsWithoutReport`. Nothing is defaulted to zero, "no injuries", or a
 *    placeholder player.
 *  - No rows for either team, an unresolved season/week, or a non-NFL sport
 *    returns null. Callers must omit the key, not invent a value.
 *  - `sourceName` is the row's real `sourceId` (nflverse in the live table).
 *    `trustLevel` describes that league-report source, not model confidence.
 */

// Deep import: the package barrel re-exports the whole ingestion pipeline
// (process-sport → prediction engine), which is a needless and very slow module
// graph for a public request. This is still the ONE canonical NFL name→abbr
// map, not a second copy.
import { nflTeamAbbr } from "@sports/ingestion-pipeline/src/nfl-team-abbr";

/** Minimal shape of an `injuries` row needed for evidence (matches the loader). */
export interface InjuryEvidenceRow {
  readonly playerName: string;
  readonly team?: string | null;
  readonly position?: string | null;
  readonly reportStatus?: string | null;
  readonly practiceStatus?: string | null;
  readonly primaryInjury?: string | null;
  readonly season: number;
  readonly week: number;
  readonly sourceId?: string | null;
  readonly fetchedAt: Date | string;
}

export interface InjuryEvidencePlayer {
  readonly playerName: string;
  readonly position: string | null;
  readonly reportStatus: string;
  readonly practiceStatus: string | null;
  readonly primaryInjury: string | null;
}

export interface InjuryEvidenceTeam {
  /** GSE/NFL team abbreviation, e.g. "JAX". */
  readonly team: string;
  /** Full club name as carried on the pick's game row. */
  readonly teamName: string;
  /** Rows in the week's report for this club (game status or practice only). */
  readonly listedPlayers: number;
  /** Counts of non-empty reportStatus values, e.g. { Out: 2, Questionable: 3 }. */
  readonly byStatus: Readonly<Record<string, number>>;
  /** Players carrying a game status (Out / Doubtful / Questionable), capped. */
  readonly players: readonly InjuryEvidencePlayer[];
}

export interface NflInjuryEvidence {
  readonly sourceCategory: "PLAYER_AVAILABILITY";
  readonly sourceName: string;
  readonly signalKey: "player_availability";
  readonly status: "AVAILABLE";
  readonly season: number;
  readonly week: number;
  readonly fetchedAt: string;
  readonly trustLevel: number;
  readonly isBootstrap: false;
  readonly activationStatus: "ACTIVE";
  readonly freshnessStatus: "FRESH";
  readonly sampleSize: number;
  readonly totalListedPlayers: number;
  readonly teams: readonly InjuryEvidenceTeam[];
  /** Clubs with no rows in this week's report. Their availability is not claimed. */
  readonly teamsWithoutReport: readonly string[];
  readonly whyUsedOrBlocked: string;
}

export interface BuildNflInjuryEvidenceInput {
  readonly sportKey: string | null | undefined;
  readonly homeTeamName: string;
  readonly awayTeamName: string;
  readonly season: number | null | undefined;
  readonly week: number | null | undefined;
  readonly homeInjuries: readonly InjuryEvidenceRow[];
  readonly awayInjuries: readonly InjuryEvidenceRow[];
  /** Clock for the evidence envelope; not a substitute for row `fetchedAt`. */
  readonly now: Date;
}

/** nflverse transcribes the official NFL weekly injury report. */
const NFLVERSE_TRUST = 0.9;
/** A public payload gets the named game-status players, not the whole report. */
const MAX_NAMED_PLAYERS_PER_TEAM = 10;
const GAME_STATUS_ORDER = ["out", "doubtful", "questionable", "ir", "sus"] as const;

export function isNflSportKey(sportKey: string | null | undefined): boolean {
  const k = (sportKey ?? "").trim().toLowerCase();
  return k === "americanfootball_nfl" || k === "nfl";
}

function statusRank(status: string): number {
  const i = GAME_STATUS_ORDER.indexOf(status.trim().toLowerCase() as (typeof GAME_STATUS_ORDER)[number]);
  return i === -1 ? GAME_STATUS_ORDER.length : i;
}

function clean(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  return v === "" ? null : v;
}

function asIso(value: Date | string): string | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function buildTeam(
  abbr: string,
  teamName: string,
  rows: readonly InjuryEvidenceRow[],
): InjuryEvidenceTeam | null {
  if (rows.length === 0) return null;

  const byStatus: Record<string, number> = {};
  for (const r of rows) {
    const status = clean(r.reportStatus);
    if (status) byStatus[status] = (byStatus[status] ?? 0) + 1;
  }

  const players = rows
    .filter((r) => clean(r.reportStatus) != null)
    .sort((a, b) => {
      const byRank = statusRank(a.reportStatus ?? "") - statusRank(b.reportStatus ?? "");
      return byRank !== 0 ? byRank : a.playerName.localeCompare(b.playerName);
    })
    .slice(0, MAX_NAMED_PLAYERS_PER_TEAM)
    .map((r) => ({
      playerName: r.playerName,
      position: clean(r.position),
      reportStatus: clean(r.reportStatus) as string,
      practiceStatus: clean(r.practiceStatus),
      primaryInjury: clean(r.primaryInjury),
    }));

  return { team: abbr, teamName, listedPlayers: rows.length, byStatus, players };
}

function summariseTeam(t: InjuryEvidenceTeam): string {
  const counts = Object.entries(t.byStatus)
    .sort((a, b) => statusRank(a[0]) - statusRank(b[0]) || b[1] - a[1])
    .map(([status, n]) => `${n} ${status}`)
    .join(", ");
  const withStatus = Object.values(t.byStatus).reduce((a, b) => a + b, 0);
  return `${t.team} ${t.listedPlayers} listed` + (withStatus > 0 ? ` (${counts})` : " (practice report only)");
}

/**
 * Build the public NFL injuryEvidence object, or null when the DB has nothing
 * legitimate to say. Never returns a sentence that implies data exists.
 */
export function buildNflInjuryEvidence(
  input: BuildNflInjuryEvidenceInput,
): NflInjuryEvidence | null {
  if (!isNflSportKey(input.sportKey)) return null;
  if (input.season == null || input.week == null) return null;

  const homeAbbr = nflTeamAbbr(input.homeTeamName);
  const awayAbbr = nflTeamAbbr(input.awayTeamName);
  if (!homeAbbr || !awayAbbr) return null;

  const current = (rows: readonly InjuryEvidenceRow[]) =>
    rows.filter((r) => r.season === input.season && r.week === input.week);

  const homeRows = current(input.homeInjuries);
  const awayRows = current(input.awayInjuries);
  const used = [...homeRows, ...awayRows];
  if (used.length === 0) return null;

  const teams = [
    buildTeam(homeAbbr, input.homeTeamName, homeRows),
    buildTeam(awayAbbr, input.awayTeamName, awayRows),
  ].filter((t): t is InjuryEvidenceTeam => t != null);

  const teamsWithoutReport = [
    ...(homeRows.length === 0 ? [`${homeAbbr} (${input.homeTeamName})`] : []),
    ...(awayRows.length === 0 ? [`${awayAbbr} (${input.awayTeamName})`] : []),
  ];

  const fetchedAtValues = used
    .map((r) => asIso(r.fetchedAt))
    .filter((v): v is string => v != null)
    .sort();
  const fetchedAt = fetchedAtValues[fetchedAtValues.length - 1] ?? input.now.toISOString();

  const originIds = [...new Set(used.map((r) => clean(r.sourceId)).filter((v): v is string => v != null))].sort();
  const sourceName = originIds.length > 0 ? originIds.join("+") : "nfl-injuries";

  const summary =
    `NFL week ${input.week} injury report (${sourceName}, fetched ${fetchedAt}): ` +
    teams.map(summariseTeam).join("; ") +
    (teamsWithoutReport.length > 0
      ? `. No week-${input.week} report rows for ${teamsWithoutReport.join(", ")}; their availability is not claimed.`
      : ".");

  return {
    sourceCategory: "PLAYER_AVAILABILITY",
    sourceName,
    signalKey: "player_availability",
    status: "AVAILABLE",
    season: input.season,
    week: input.week,
    fetchedAt,
    trustLevel: NFLVERSE_TRUST,
    isBootstrap: false,
    activationStatus: "ACTIVE",
    freshnessStatus: "FRESH",
    sampleSize: used.length,
    totalListedPlayers: used.length,
    teams,
    teamsWithoutReport,
    whyUsedOrBlocked: summary,
  };
}
