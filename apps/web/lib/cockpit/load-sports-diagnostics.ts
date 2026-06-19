/**
 * Sports Diagnostics LOADER (Wave A internal cockpit surface).
 *
 * WHAT THIS IS
 * The thin, never-throw server boundary between the live DB and the PURE
 * `buildSportsDiagnosticsReport` aggregator below. It reads the TEAM GAME LOGS
 * WE ALREADY STORE (the `TeamGameLog` model — one settled row per team per game,
 * carrying result, ATS result, scores, venue, and game date) joined to the
 * scheduling/fatigue context we compute on `Game` (restDaysHome/Away,
 * isBackToBackHome/Away, scheduleDensityHome/Away). It groups the logs per sport
 * and calls the aggregator. The cockpit page (`/cockpit/sports-diagnostics`)
 * renders the result.
 *
 * It exists to realize value from per-league + structural sports libraries that
 * are built and tested but consumed by zero product surfaces:
 *   - schedule-utils (home/away records, recent form, days of rest),
 *   - power-ranking (composite power score + tiering over stored outcomes),
 *   - elo-utils (an Elo leaderboard replayed chronologically from results),
 *   - team-normalize (canonical team display names where the sport is known).
 *
 * WHY IT IS SAFE
 * - It REUSES the pure sports libraries; it re-implements no rating math, no
 *   schedule math, no scoring. The aggregator is a pure function: rows → report.
 * - It is READ-ONLY: it never writes, flips a gate, re-scores, or bumps a
 *   MODEL_VERSION. The ratings here are SUPPLEMENTARY context, never pick drivers.
 * - It NEVER touches the network. No external sports/odds API is ever called —
 *   this reads only the team-game-log + game rows ingestion already persisted.
 * - It NEVER throws. Any DB error, stub mode, or unreachable database degrades to
 *   a labeled honest-empty report (`dataMode: "unavailable"`) — never a fabricated
 *   number.
 *
 * HONESTY (non-negotiable)
 * - Bootstrap logs (written before canonical history was enabled) are EXCLUDED,
 *   mirroring how the rest of the platform scopes ATS/H2H scoring.
 * - A sport below the minimum-games floor is reported as
 *   `status: "INSUFFICIENT"` with an honest "building history — N games" note,
 *   not a power/Elo table dressed up as signal.
 * - Power/Elo ratings are framed as relative descriptive context over the stored
 *   record, not a forward-looking edge. A team needs a minimum number of games
 *   before it is rated at all; under-rated teams are listed but flagged.
 * - A team-game-log's straight-up result is WIN/LOSS/TBD only (no push), so the
 *   recent-form / home-away win rates count only decided (WIN/LOSS) rows; TBD
 *   (unsettled) rows never inflate a denominator. ATS is tracked separately and
 *   carries its own PUSH state.
 */

import { db, Prisma } from "@sports/db";

import {
  homeAwayRecord,
  winRateInLast,
  type ScheduledGame,
  type HomeAwayRecord,
} from "@/lib/sports/schedule-utils";
import {
  buildPowerRankings,
  tierLabel,
  powerRankingSummary,
  type TeamMetrics,
  type PowerScore,
} from "@/lib/sports/power-ranking";
import { updateElo } from "@/lib/sports/elo-utils";
import { normalizeTeamName } from "@/lib/sports/team-normalize";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Cap the read — this is a rollup, not a per-row export. */
const SPORTS_DIAGNOSTICS_LOG_LIMIT = 20000;

/**
 * Per-sport floor: below this many decided team-game-log rows a sport is
 * reported as INSUFFICIENT ("building history") rather than rendering power/Elo
 * tables that would be noise on a tiny sample.
 */
export const SPORTS_DIAGNOSTICS_MIN_GAMES = 20;

/**
 * Per-team floor: below this many decided rows a team is listed but flagged as
 * "under-rated" — its rating is shown but tagged as built on a thin sample.
 */
export const SPORTS_DIAGNOSTICS_MIN_TEAM_GAMES = 5;

/** Recent-form window (most recent N decided games per team). */
const RECENT_FORM_WINDOW = 5;

/** Starting Elo rating for a previously-unseen team, and the K-factor. */
const ELO_INITIAL_RATING = 1500;
const ELO_K_FACTOR = 24;

/** Maximum teams rendered per sport in the rating leaderboards. */
const MAX_TEAMS_PER_SPORT = 40;

/** The four sports for which `team-normalize` can canonicalize names. */
type NormalizableSport = "nfl" | "nba" | "mlb" | "nhl";

// ---------------------------------------------------------------------------
// Read-only record shape consumed by the pure aggregator
// ---------------------------------------------------------------------------

/** A team-game-log row mapped to only the fields the aggregator consumes. */
export interface TeamGameLogRecord {
  /** Sport key/name as stored on the log (the grouping key). */
  readonly sport: string;
  /** Denormalized team identifier (the home/away team name). */
  readonly teamName: string;
  readonly opponentName: string;
  readonly isHome: boolean;
  /** Game commence time (chronological key for form + Elo replay). */
  readonly gameDateIso: string;
  /** Straight-up result: only WIN/LOSS decide; TBD is unsettled. */
  readonly result: "WIN" | "LOSS" | "TBD";
  /** ATS result: WIN/LOSS/PUSH decide cover rate; TBD is ungraded. */
  readonly atsResult: "WIN" | "LOSS" | "PUSH" | "TBD";
  /** Team's own score in the game, or null when not stored. */
  readonly teamScore: number | null;
  /** Opponent's score, or null when not stored. */
  readonly opponentScore: number | null;
  /**
   * Calendar days since this team's prior game going into this game, or null
   * when the scheduling context was not computed. Sourced from Game (the home
   * or away field, depending on this log's `isHome`).
   */
  readonly restDays: number | null;
  /** True when this game was the back end of a back-to-back for the team. */
  readonly isBackToBack: boolean;
  /** Canonical games in the prior 7 days for this team, or null. */
  readonly scheduleDensity: number | null;
}

// ---------------------------------------------------------------------------
// Report shapes
// ---------------------------------------------------------------------------

export type SportDiagnosticsStatus = "OK" | "INSUFFICIENT";

/** Rest / back-to-back distribution across the sport's stored games. */
export interface RestDistribution {
  /** Rows that carried a numeric rest-days value (the denominator). */
  readonly withRestData: number;
  /** Decided rows played on short rest (< 3 days) — null mean when none. */
  readonly shortRestGames: number;
  /** Decided rows played on long rest (> 7 days). */
  readonly longRestGames: number;
  /** Back-to-back games (rows flagged isBackToBack). */
  readonly backToBackGames: number;
  /** Mean rest days across rows that carried the value, or null when none. */
  readonly meanRestDays: number | null;
  /** Mean schedule density (games in prior 7 days), or null when none. */
  readonly meanScheduleDensity: number | null;
  /** Win rate on short rest (< 3 days), decided only, or null. */
  readonly shortRestWinRate: number | null;
  /** Win rate on long rest (> 7 days), decided only, or null. */
  readonly longRestWinRate: number | null;
}

/** Home-field baseline across the sport's stored games. */
export interface HomeFieldBaseline {
  /** Decided home games (WIN + LOSS). */
  readonly homeDecided: number;
  /** Decided away games (WIN + LOSS). */
  readonly awayDecided: number;
  /** Home win rate (decided only), or null. */
  readonly homeWinRate: number | null;
  /** Away win rate (decided only), or null. */
  readonly awayWinRate: number | null;
  /** Home win rate − away win rate, or null when either side is empty. */
  readonly homeEdge: number | null;
  /** Mean home scoring margin (teamScore − opponentScore), or null. */
  readonly meanHomeMargin: number | null;
  /** Mean away scoring margin, or null. */
  readonly meanAwayMargin: number | null;
}

/** One team's power + Elo rating row. */
export interface TeamRatingRow {
  /** Display name (canonicalized where the sport is normalizable). */
  readonly teamName: string;
  /** Decided games (WIN + LOSS) the rating was built from. */
  readonly decided: number;
  /** True when below the per-team floor — rating shown but flagged thin. */
  readonly underRated: boolean;
  readonly wins: number;
  readonly losses: number;
  /** ATS cover rate (WIN/(WIN+LOSS), pushes excluded), or null when none. */
  readonly atsCoverRate: number | null;
  /** Recent-form win rate over the last N decided games, or null. */
  readonly recentForm: number | null;
  /** Composite power score 0–100 from power-ranking, or null when unrated. */
  readonly powerScore: number | null;
  /** Power tier label, or null when unrated. */
  readonly powerTier: string | null;
  /** Elo rating replayed chronologically from results, or null when unrated. */
  readonly elo: number | null;
}

/** Per-sport diagnostics block. */
export interface SportDiagnostics {
  /** Sport key/name (the grouping key). */
  readonly sport: string;
  readonly status: SportDiagnosticsStatus;
  /** Total team-game-log rows (decided + TBD) loaded for the sport. */
  readonly totalRows: number;
  /** Decided rows (WIN + LOSS) — the spine for ratings + form. */
  readonly decidedRows: number;
  /** Distinct teams observed. */
  readonly teamCount: number;
  /** Sample floor the status is measured against. */
  readonly floor: number;
  /** Honest note when INSUFFICIENT, else null. */
  readonly insufficientNote: string | null;
  readonly rest: RestDistribution;
  readonly homeField: HomeFieldBaseline;
  /** One-line tier distribution summary, or null when unrated. */
  readonly powerSummary: string | null;
  /** Rating rows (power + Elo), best power score first. Empty when INSUFFICIENT. */
  readonly teams: readonly TeamRatingRow[];
}

export interface SportsDiagnosticsReport {
  /** One block per sport that carried ≥1 stored team-game-log row. */
  readonly sports: readonly SportDiagnostics[];
  /** Total team-game-log rows examined across all sports. */
  readonly totalRows: number;
  /** Sports that cleared the floor (status OK). */
  readonly sportsRated: number;
  /** Sports below the floor (status INSUFFICIENT). */
  readonly sportsBuilding: number;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function isDecided(result: TeamGameLogRecord["result"]): result is "WIN" | "LOSS" {
  return result === "WIN" || result === "LOSS";
}

/** Map a stored straight-up result to the schedule-utils GameResult space. */
function gameResultOf(result: TeamGameLogRecord["result"]): ScheduledGame["result"] {
  switch (result) {
    case "WIN":
      return "win";
    case "LOSS":
      return "loss";
    default:
      // TBD — unsettled; treated as pending so it never decides a rate.
      return "pending";
  }
}

/** A team's margin in a game (teamScore − opponentScore), or null. */
function marginOf(row: TeamGameLogRecord): number | null {
  if (typeof row.teamScore === "number" && typeof row.opponentScore === "number") {
    return row.teamScore - row.opponentScore;
  }
  return null;
}

/** Mean of a numeric array, or null when empty. */
function meanOrNull(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/** Decided win rate over rows, or null when none decided. */
function decidedWinRate(rows: readonly TeamGameLogRecord[]): number | null {
  let wins = 0;
  let decided = 0;
  for (const r of rows) {
    if (r.result === "WIN") {
      wins++;
      decided++;
    } else if (r.result === "LOSS") {
      decided++;
    }
  }
  return decided > 0 ? wins / decided : null;
}

/**
 * The sport key normalizable by team-normalize, or null. Maps a stored sport
 * string (e.g. "americanfootball_nfl", "NFL", "basketball_nba") to one of the
 * four supported normalizer sports by substring.
 */
function normalizerSportOf(sport: string): NormalizableSport | null {
  const s = sport.toLowerCase();
  if (s.includes("nfl") || s.includes("americanfootball")) return "nfl";
  if (s.includes("nba") || s.includes("basketball")) return "nba";
  if (s.includes("mlb") || s.includes("baseball")) return "mlb";
  if (s.includes("nhl") || s.includes("hockey")) return "nhl";
  return null;
}

/** Canonical display name where the sport is normalizable, else the raw name. */
function displayTeamName(teamName: string, sport: string): string {
  const ns = normalizerSportOf(sport);
  if (ns === null) return teamName;
  const info = normalizeTeamName(teamName, ns);
  return info?.canonical ?? teamName;
}

/** Build the rest / back-to-back distribution for one sport's rows. */
function buildRestDistribution(rows: readonly TeamGameLogRecord[]): RestDistribution {
  const restValues: number[] = [];
  const densityValues: number[] = [];
  let backToBackGames = 0;
  const shortRestRows: TeamGameLogRecord[] = [];
  const longRestRows: TeamGameLogRecord[] = [];

  for (const r of rows) {
    if (typeof r.restDays === "number" && Number.isFinite(r.restDays)) {
      restValues.push(r.restDays);
      if (r.restDays < 3) shortRestRows.push(r);
      else if (r.restDays > 7) longRestRows.push(r);
    }
    if (typeof r.scheduleDensity === "number" && Number.isFinite(r.scheduleDensity)) {
      densityValues.push(r.scheduleDensity);
    }
    if (r.isBackToBack) backToBackGames++;
  }

  return {
    withRestData: restValues.length,
    shortRestGames: shortRestRows.length,
    longRestGames: longRestRows.length,
    backToBackGames,
    meanRestDays: meanOrNull(restValues),
    meanScheduleDensity: meanOrNull(densityValues),
    shortRestWinRate: decidedWinRate(shortRestRows),
    longRestWinRate: decidedWinRate(longRestRows),
  };
}

/**
 * Build the home-field baseline for one sport's rows. Uses schedule-utils
 * `homeAwayRecord` for the W/L split + edge, then layers stored scoring margins.
 */
function buildHomeFieldBaseline(rows: readonly TeamGameLogRecord[]): HomeFieldBaseline {
  // Map each row to a ScheduledGame so the home/away record + edge come from
  // the shared schedule-utils helper rather than a re-implementation.
  const scheduled: ScheduledGame[] = rows.map((r, idx) => ({
    gameId: `${idx}`,
    date: Date.parse(r.gameDateIso),
    isHome: r.isHome,
    opponent: r.opponentName,
    result: gameResultOf(r.result),
  }));
  const record: HomeAwayRecord = homeAwayRecord(scheduled);

  const homeMargins: number[] = [];
  const awayMargins: number[] = [];
  for (const r of rows) {
    const m = marginOf(r);
    if (m === null) continue;
    if (r.isHome) homeMargins.push(m);
    else awayMargins.push(m);
  }

  return {
    homeDecided: record.home.wins + record.home.losses,
    awayDecided: record.away.wins + record.away.losses,
    homeWinRate: record.homeWinRate,
    awayWinRate: record.awayWinRate,
    homeEdge: record.homeAdvantage,
    meanHomeMargin: meanOrNull(homeMargins),
    meanAwayMargin: meanOrNull(awayMargins),
  };
}

/**
 * Replay Elo chronologically across a sport's decided rows. Each game appears
 * twice in the logs (once per team); we de-duplicate by game key (sorted team
 * pair + date) so a result updates both teams exactly once. Returns a map of
 * canonical-display-name → final Elo.
 */
function replayElo(
  rows: readonly TeamGameLogRecord[],
  sport: string,
): Map<string, number> {
  const ratings = new Map<string, number>();
  const getRating = (team: string): number => ratings.get(team) ?? ELO_INITIAL_RATING;

  // De-duplicate to one row per physical game. Each game has two team-log rows;
  // we keep the home-team row as the canonical "team A" perspective.
  const byGame = new Map<string, TeamGameLogRecord>();
  for (const r of rows) {
    if (!isDecided(r.result)) continue;
    const a = displayTeamName(r.teamName, sport);
    const b = displayTeamName(r.opponentName, sport);
    const pair = [a, b].sort().join("::");
    const key = `${pair}::${r.gameDateIso}`;
    const existing = byGame.get(key);
    // Prefer the home-team perspective row for a stable orientation.
    if (existing === undefined || (r.isHome && !existing.isHome)) {
      byGame.set(key, r);
    }
  }

  const ordered = [...byGame.values()].sort(
    (x, y) => Date.parse(x.gameDateIso) - Date.parse(y.gameDateIso),
  );

  for (const r of ordered) {
    const teamA = displayTeamName(r.teamName, sport);
    const teamB = displayTeamName(r.opponentName, sport);
    if (teamA === teamB) continue; // guard against degenerate self-rows
    const ratingA = getRating(teamA);
    const ratingB = getRating(teamB);
    // scoreA: 1 if this team's row is a WIN, 0 if LOSS.
    const scoreA = r.result === "WIN" ? 1 : 0;
    const scoreB = scoreA === 1 ? 0 : 1;
    const update = updateElo(ratingA, ratingB, scoreA, scoreB, ELO_K_FACTOR);
    ratings.set(teamA, update.newRatingA);
    ratings.set(teamB, update.newRatingB);
  }

  return ratings;
}

/** Group a sport's rows by canonical display team name. */
function groupByTeam(
  rows: readonly TeamGameLogRecord[],
  sport: string,
): Map<string, TeamGameLogRecord[]> {
  const map = new Map<string, TeamGameLogRecord[]>();
  for (const r of rows) {
    const name = displayTeamName(r.teamName, sport);
    const bucket = map.get(name);
    if (bucket) bucket.push(r);
    else map.set(name, [r]);
  }
  return map;
}

/** ATS cover rate over rows (WIN/(WIN+LOSS), PUSH/TBD excluded), or null. */
function atsCoverRate(rows: readonly TeamGameLogRecord[]): number | null {
  let covers = 0;
  let decided = 0;
  for (const r of rows) {
    if (r.atsResult === "WIN") {
      covers++;
      decided++;
    } else if (r.atsResult === "LOSS") {
      decided++;
    }
  }
  return decided > 0 ? covers / decided : null;
}

// ---------------------------------------------------------------------------
// Pure aggregator — rows → report. No I/O, no DB, fully testable.
// ---------------------------------------------------------------------------

/**
 * Diagnose one sport from its team-game-log rows. PURE.
 *
 * Below the minimum-games floor the block is INSUFFICIENT: rest/home-field
 * context is still computed honestly (it is descriptive of the small sample),
 * but power/Elo team tables are withheld — they would be noise.
 */
export function diagnoseSport(
  sport: string,
  rows: readonly TeamGameLogRecord[],
): SportDiagnostics {
  const totalRows = rows.length;
  const decided = rows.filter((r) => isDecided(r.result));
  const decidedRows = decided.length;

  const rest = buildRestDistribution(rows);
  const homeField = buildHomeFieldBaseline(rows);

  const byTeam = groupByTeam(rows, sport);
  const teamCount = byTeam.size;

  if (decidedRows < SPORTS_DIAGNOSTICS_MIN_GAMES) {
    return {
      sport,
      status: "INSUFFICIENT",
      totalRows,
      decidedRows,
      teamCount,
      floor: SPORTS_DIAGNOSTICS_MIN_GAMES,
      insufficientNote:
        `Building history — ${decidedRows} decided game log${decidedRows === 1 ? "" : "s"} ` +
        `(floor ${SPORTS_DIAGNOSTICS_MIN_GAMES}). Below the floor, power and Elo ratings are ` +
        `withheld because they would be noise; the rest and home-field context above describes ` +
        `the small sample honestly.`,
      rest,
      homeField,
      powerSummary: null,
      teams: [],
    };
  }

  // Elo replayed chronologically across the whole sport (de-duplicated per game).
  const eloByTeam = replayElo(rows, sport);

  // Build the per-team TeamMetrics for power-ranking. Only teams clearing the
  // per-team floor feed the ranking; under-floor teams are still listed but
  // flagged and left unrated.
  type TeamAgg = {
    readonly name: string;
    readonly teamRows: readonly TeamGameLogRecord[];
    readonly decided: number;
    readonly wins: number;
    readonly losses: number;
  };

  const aggs: TeamAgg[] = [];
  for (const [name, teamRows] of byTeam.entries()) {
    let wins = 0;
    let losses = 0;
    for (const r of teamRows) {
      if (r.result === "WIN") wins++;
      else if (r.result === "LOSS") losses++;
    }
    aggs.push({ name, teamRows, decided: wins + losses, wins, losses });
  }

  const ratable = aggs.filter((a) => a.decided >= SPORTS_DIAGNOSTICS_MIN_TEAM_GAMES);

  // Map each ratable team to power-ranking's TeamMetrics shape.
  const metrics: TeamMetrics[] = ratable.map((a) => {
    const winRate = a.decided > 0 ? a.wins / a.decided : 0;

    const margins: number[] = [];
    for (const r of a.teamRows) {
      const m = marginOf(r);
      if (m !== null) margins.push(m);
    }
    // pointsFor/Against per game as a points proxy; margin recovers via diff.
    const scoredVals: number[] = [];
    const allowedVals: number[] = [];
    for (const r of a.teamRows) {
      if (typeof r.teamScore === "number") scoredVals.push(r.teamScore);
      if (typeof r.opponentScore === "number") allowedVals.push(r.opponentScore);
    }
    const pointsFor = meanOrNull(scoredVals) ?? 0;
    const pointsAgainst = meanOrNull(allowedVals) ?? 0;

    // Strength of schedule proxy: a team's opponents' aggregate win rate over
    // the stored sample. Computed from this sport's rows so it stays sourced.
    const sos = opponentWinRateFor(a.name, rows, sport);

    // Recent form over the last N decided games (schedule-utils.winRateInLast).
    const scheduled: ScheduledGame[] = a.teamRows
      .slice()
      .sort((x, y) => Date.parse(x.gameDateIso) - Date.parse(y.gameDateIso))
      .map((r, idx) => ({
        gameId: `${idx}`,
        date: Date.parse(r.gameDateIso),
        isHome: r.isHome,
        opponent: r.opponentName,
        result: gameResultOf(r.result),
      }));
    const recentForm = winRateInLast(scheduled, RECENT_FORM_WINDOW) ?? winRate;

    const elo = eloByTeam.get(a.name);

    return {
      teamId: a.name,
      teamName: a.name,
      winRate,
      pointsFor,
      pointsAgainst,
      strengthOfSchedule: sos,
      recentForm,
      ...(typeof elo === "number" ? { eloRating: elo } : {}),
    };
  });

  const powerRankings: PowerScore[] = buildPowerRankings(metrics);
  const powerByTeam = new Map<string, PowerScore>();
  for (const p of powerRankings) powerByTeam.set(p.teamId, p);

  // Build the rendered rating rows: ratable teams (with power/Elo) first by
  // power score, then under-floor teams (listed, flagged, unrated).
  const ratableRows: TeamRatingRow[] = ratable.map((a) => {
    const power = powerByTeam.get(a.name) ?? null;
    const scheduled: ScheduledGame[] = a.teamRows
      .slice()
      .sort((x, y) => Date.parse(x.gameDateIso) - Date.parse(y.gameDateIso))
      .map((r, idx) => ({
        gameId: `${idx}`,
        date: Date.parse(r.gameDateIso),
        isHome: r.isHome,
        opponent: r.opponentName,
        result: gameResultOf(r.result),
      }));
    const elo = eloByTeam.get(a.name) ?? null;
    return {
      teamName: a.name,
      decided: a.decided,
      underRated: false,
      wins: a.wins,
      losses: a.losses,
      atsCoverRate: atsCoverRate(a.teamRows),
      recentForm: winRateInLast(scheduled, RECENT_FORM_WINDOW),
      powerScore: power ? power.score : null,
      powerTier: power ? tierLabel(power.tier) : null,
      elo: typeof elo === "number" ? elo : null,
    };
  });

  ratableRows.sort((x, y) => (y.powerScore ?? 0) - (x.powerScore ?? 0));

  const underFloorRows: TeamRatingRow[] = aggs
    .filter((a) => a.decided < SPORTS_DIAGNOSTICS_MIN_TEAM_GAMES)
    .map((a) => {
      const elo = eloByTeam.get(a.name) ?? null;
      return {
        teamName: a.name,
        decided: a.decided,
        underRated: true,
        wins: a.wins,
        losses: a.losses,
        atsCoverRate: atsCoverRate(a.teamRows),
        recentForm: null,
        powerScore: null,
        powerTier: null,
        elo: typeof elo === "number" ? elo : null,
      };
    })
    .sort((x, y) => y.decided - x.decided);

  const teams = [...ratableRows, ...underFloorRows].slice(0, MAX_TEAMS_PER_SPORT);

  return {
    sport,
    status: "OK",
    totalRows,
    decidedRows,
    teamCount,
    floor: SPORTS_DIAGNOSTICS_MIN_GAMES,
    insufficientNote: null,
    rest,
    homeField,
    powerSummary: powerRankings.length > 0 ? powerRankingSummary(powerRankings) : null,
    teams,
  };
}

/**
 * Strength-of-schedule proxy: the aggregate decided win rate of `team`'s
 * opponents over the stored rows for this sport. Returns 0.5 (neutral) when no
 * opponent record is available, so it never fabricates a strength signal.
 */
function opponentWinRateFor(
  team: string,
  rows: readonly TeamGameLogRecord[],
  sport: string,
): number {
  // Per-team decided win rate across the whole sport.
  const winRateByTeam = new Map<string, { wins: number; decided: number }>();
  for (const r of rows) {
    if (!isDecided(r.result)) continue;
    const name = displayTeamName(r.teamName, sport);
    const acc = winRateByTeam.get(name) ?? { wins: 0, decided: 0 };
    acc.decided++;
    if (r.result === "WIN") acc.wins++;
    winRateByTeam.set(name, acc);
  }

  let oppWinSum = 0;
  let oppCount = 0;
  for (const r of rows) {
    if (!isDecided(r.result)) continue;
    if (displayTeamName(r.teamName, sport) !== team) continue;
    const opp = displayTeamName(r.opponentName, sport);
    const oppRec = winRateByTeam.get(opp);
    if (oppRec && oppRec.decided > 0) {
      oppWinSum += oppRec.wins / oppRec.decided;
      oppCount++;
    }
  }
  return oppCount > 0 ? oppWinSum / oppCount : 0.5;
}

/**
 * Build the full sports-diagnostics report from a set of team-game-log records.
 * PURE: no DB, no side effects, deterministic.
 *
 * Empty input yields an honest-empty report (no sport blocks). Each sport
 * degrades to its own INSUFFICIENT state independently rather than dropping it.
 */
export function buildSportsDiagnosticsReport(
  records: readonly TeamGameLogRecord[],
): SportsDiagnosticsReport {
  // Group by sport.
  const bySport = new Map<string, TeamGameLogRecord[]>();
  for (const r of records) {
    const bucket = bySport.get(r.sport);
    if (bucket) bucket.push(r);
    else bySport.set(r.sport, [r]);
  }

  const sports = [...bySport.entries()]
    .map(([sport, rows]) => diagnoseSport(sport, rows))
    .sort((a, b) => {
      // OK sports first, then by decided rows desc, then sport name asc.
      if (a.status !== b.status) return a.status === "OK" ? -1 : 1;
      if (b.decidedRows !== a.decidedRows) return b.decidedRows - a.decidedRows;
      return a.sport.localeCompare(b.sport);
    });

  let sportsRated = 0;
  let sportsBuilding = 0;
  for (const s of sports) {
    if (s.status === "OK") sportsRated++;
    else sportsBuilding++;
  }

  return {
    sports,
    totalRows: records.length,
    sportsRated,
    sportsBuilding,
  };
}

// ---------------------------------------------------------------------------
// DB boundary — never-throw loader
// ---------------------------------------------------------------------------

/**
 * Whether the report was computed from a reachable DB (`live`) or degraded to the
 * honest-empty report because the DB was unreachable / in stub mode (`unavailable`).
 */
export type SportsDiagnosticsDataMode = "live" | "unavailable";

export interface SportsDiagnosticsLoadResult {
  readonly dataMode: SportsDiagnosticsDataMode;
  /** ISO timestamp the report was loaded (for the cockpit "generated" stamp). */
  readonly loadedAtIso: string;
  /** Plain-language note explaining the data mode (esp. why it is unavailable). */
  readonly note: string;
  readonly report: SportsDiagnosticsReport;
}

/**
 * Field selection for the team-game-log read — only the columns the aggregator
 * consumes, plus the joined Game scheduling context (rest / back-to-back /
 * schedule density). NO network: these are the team-game-log + Game rows that
 * ingestion + settlement already persisted, never a fresh external API call.
 */
const teamGameLogSelect = Prisma.validator<Prisma.TeamGameLogSelect>()({
  teamName: true,
  sport: true,
  opponentName: true,
  isHome: true,
  gameDate: true,
  teamScore: true,
  opponentScore: true,
  result: true,
  atsResult: true,
  game: {
    select: {
      restDaysHome: true,
      restDaysAway: true,
      isBackToBackHome: true,
      isBackToBackAway: true,
      scheduleDensityHome: true,
      scheduleDensityAway: true,
    },
  },
});

type TeamGameLogQueryRow = Prisma.TeamGameLogGetPayload<{ select: typeof teamGameLogSelect }>;

/** Map one team-game-log row to the aggregator's read-only record shape. */
function mapRow(row: TeamGameLogQueryRow): TeamGameLogRecord {
  // The scheduling context lives on Game from the team's perspective: a home log
  // reads the *Home fields, an away log reads the *Away fields.
  const restDays = row.isHome ? row.game.restDaysHome : row.game.restDaysAway;
  const isBackToBack = row.isHome ? row.game.isBackToBackHome : row.game.isBackToBackAway;
  const scheduleDensity = row.isHome
    ? row.game.scheduleDensityHome
    : row.game.scheduleDensityAway;

  return {
    sport: row.sport,
    teamName: row.teamName,
    opponentName: row.opponentName,
    isHome: row.isHome,
    gameDateIso: row.gameDate.toISOString(),
    result: row.result,
    atsResult: row.atsResult,
    teamScore: typeof row.teamScore === "number" ? row.teamScore : null,
    opponentScore: typeof row.opponentScore === "number" ? row.opponentScore : null,
    restDays: typeof restDays === "number" ? restDays : null,
    isBackToBack,
    scheduleDensity: typeof scheduleDensity === "number" ? scheduleDensity : null,
  };
}

/**
 * Read the canonical (non-bootstrap) team-game-log rows. Reads ONLY the persisted
 * tables — never any external sports API. Returns null on ANY DB error so the
 * caller degrades to honest-empty.
 */
async function readTeamGameLogs(): Promise<TeamGameLogQueryRow[] | null> {
  try {
    return await db.teamGameLog.findMany({
      where: { isBootstrap: false },
      orderBy: { gameDate: "asc" },
      take: SPORTS_DIAGNOSTICS_LOG_LIMIT,
      select: teamGameLogSelect,
    });
  } catch {
    return null;
  }
}

/**
 * Load the sports-diagnostics report from the live DB.
 *
 * NEVER THROWS. On any DB error / stub mode it returns a labeled honest-empty
 * report (`dataMode: "unavailable"`) so the surface degrades to truthful empty
 * states instead of crashing or fabricating numbers. It NEVER calls any external
 * sports API or network — every figure traces to stored team-game-log + Game rows
 * or to an honest empty state. The ratings are SUPPLEMENTARY context, not a pick
 * driver.
 */
export async function loadSportsDiagnostics(
  now: Date = new Date(),
): Promise<SportsDiagnosticsLoadResult> {
  const loadedAtIso = now.toISOString();

  let rows: TeamGameLogQueryRow[] | null;
  try {
    rows = await readTeamGameLogs();
  } catch {
    rows = null;
  }

  if (rows === null) {
    return {
      dataMode: "unavailable",
      loadedAtIso,
      note:
        "The database was unreachable (or running in stub mode), so sports diagnostics could not be " +
        "computed. This is an honest-empty report — no team-game-log rows were read (and no external " +
        "sports API is ever called from this surface). Restore the database connection to populate it.",
      report: buildSportsDiagnosticsReport([]),
    };
  }

  const records = rows.map(mapRow);
  const report = buildSportsDiagnosticsReport(records);

  return {
    dataMode: "live",
    loadedAtIso,
    note:
      records.length === 0
        ? "The database is reachable but holds no canonical (non-bootstrap) team game logs yet. We are " +
          "building the record; the figures below are honest reads over a real (empty) game history."
        : `Computed from ${records.length} canonical team game logs across ${report.sports.length} ` +
          `sport${report.sports.length === 1 ? "" : "s"}, read live from the database (no external API call).`,
    report,
  };
}
