import { assertIngestible, fetchWithFailover, NFLVERSE_BASE, parseCsv, withMirrors } from "@sports/data-ingestion";
import type { TeamEnvironmentRow } from "@/lib/intelligence/team-environment";

/**
 * Schedule Lab — strength of schedule from real data, honestly labeled.
 *
 * Schedules come from the nflverse games asset; opponent strength comes
 * from the team-environment engine (neutral-script EPA percentiles from
 * the most recent completed season's play-by-play). Until the new season
 * produces games, that is the only honest basis for opponent strength —
 * the surface says so instead of pretending to know the future.
 *
 * SoS per team = mean opponent strength across scheduled regular-season
 * games, where opponent strength = (offEpaPct + defEpaPct) / 2 from the
 * environment rows. Higher SoS = harder schedule.
 */

export interface ScheduledGame {
  readonly week: number;
  readonly opponent: string;
  readonly isHome: boolean;
}

export interface TeamSchedule {
  readonly team: string;
  readonly games: readonly ScheduledGame[];
}

export interface TeamSosRow {
  readonly team: string;
  /** Mean opponent strength 0..100 across all scheduled games. Higher = harder. */
  readonly seasonSos: number;
  /** Mean opponent strength over the first four scheduled weeks. */
  readonly earlySos: number;
  /** Hardest single stretch of three consecutive scheduled games. */
  readonly toughestStretch: { readonly weeks: string; readonly sos: number } | null;
  readonly gamesCounted: number;
  /** Opponents missing a strength rating (e.g. expansion/relocation codes). */
  readonly unratedOpponents: readonly string[];
  readonly rank: number; // 1 = hardest schedule
}

export interface ScheduleLab {
  readonly season: number;
  readonly strengthSeason: number;
  readonly rows: readonly TeamSosRow[];
  readonly status: "live" | "source-error";
  readonly note: string;
  readonly error: string | null;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Extract per-team regular-season schedules for one season from games rows. */
export function buildTeamSchedules(
  rows: ReadonlyArray<Record<string, string>>,
  season: number
): readonly TeamSchedule[] {
  const byTeam = new Map<string, ScheduledGame[]>();
  for (const r of rows) {
    if (Number(r["season"]) !== season) continue;
    if ((r["game_type"] ?? "") !== "REG") continue;
    const week = Number(r["week"]);
    const home = r["home_team"] ?? "";
    const away = r["away_team"] ?? "";
    if (!home || !away || !Number.isFinite(week)) continue;
    if (!byTeam.has(home)) byTeam.set(home, []);
    if (!byTeam.has(away)) byTeam.set(away, []);
    byTeam.get(home)!.push({ week, opponent: away, isHome: true });
    byTeam.get(away)!.push({ week, opponent: home, isHome: false });
  }
  return [...byTeam.entries()]
    .map(([team, games]) => ({ team, games: games.sort((a, b) => a.week - b.week) }))
    .sort((a, b) => a.team.localeCompare(b.team));
}

/** Combined opponent strength 0..100 from environment percentiles. */
export function opponentStrength(row: TeamEnvironmentRow): number {
  return (row.offEpaPct + row.defEpaPct) / 2;
}

function mean(xs: readonly number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Pure SoS computation from schedules + strength ratings. */
export function buildScheduleLabRows(
  schedules: readonly TeamSchedule[],
  envRows: readonly TeamEnvironmentRow[]
): readonly TeamSosRow[] {
  const strength = new Map(envRows.map((r) => [r.team, opponentStrength(r)]));

  const unranked = schedules.map((s) => {
    const rated = s.games.filter((g) => strength.has(g.opponent));
    const unratedOpponents = [
      ...new Set(s.games.filter((g) => !strength.has(g.opponent)).map((g) => g.opponent)),
    ];
    const all = rated.map((g) => strength.get(g.opponent)!);
    const early = rated.filter((g, i) => i < 4).map((g) => strength.get(g.opponent)!);

    let toughestStretch: TeamSosRow["toughestStretch"] = null;
    for (let i = 0; i + 3 <= rated.length; i++) {
      const window = rated.slice(i, i + 3);
      const sos = mean(window.map((g) => strength.get(g.opponent)!));
      if (!toughestStretch || sos > toughestStretch.sos) {
        toughestStretch = {
          weeks: `W${window[0]!.week}–W${window[window.length - 1]!.week}`,
          sos: Math.round(sos * 10) / 10,
        };
      }
    }

    return {
      team: s.team,
      seasonSos: Math.round(mean(all) * 10) / 10,
      earlySos: Math.round(mean(early) * 10) / 10,
      toughestStretch,
      gamesCounted: rated.length,
      unratedOpponents,
      rank: 0,
    };
  });

  return [...unranked]
    .sort((a, b) => b.seasonSos - a.seasonSos)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

export async function loadScheduleLab({
  season,
  strengthSeason,
  envRows,
  timeoutMs = 20000,
  fetcher = fetch as FetchLike,
}: {
  season: number;
  strengthSeason: number;
  envRows: readonly TeamEnvironmentRow[];
  timeoutMs?: number;
  fetcher?: FetchLike;
}): Promise<ScheduleLab> {
  assertIngestible("nflverse");

  const url = `${NFLVERSE_BASE}/games/games.csv`;
  try {
    const { response } = await fetchWithFailover(withMirrors(url), fetcher, { timeoutMs });
    const { records } = parseCsv(await response.text());
    const schedules = buildTeamSchedules(records, season);
    if (schedules.length === 0) {
      return {
        season,
        strengthSeason,
        rows: [],
        status: "source-error",
        note: `nflverse has no ${season} regular-season schedule rows yet — empty state, nothing invented.`,
        error: null,
      };
    }
    return {
      season,
      strengthSeason,
      rows: buildScheduleLabRows(schedules, envRows),
      status: "live",
      note:
        `Opponent strength = neutral-script EPA percentiles from ${strengthSeason} play-by-play ` +
        `(the last completed season). ${season} games haven't been played; this is the only honest basis.`,
      error: null,
    };
  } catch (err) {
    return {
      season,
      strengthSeason,
      rows: [],
      status: "source-error",
      note: "Schedule could not load from nflverse — empty state instead of fabricated SoS.",
      error: err instanceof Error ? err.message : "unknown",
    };
  }
}
