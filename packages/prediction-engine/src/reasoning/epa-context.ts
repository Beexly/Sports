/**
 * EPA context for the reasoning layer — INTERNAL ONLY.
 *
 * Layer 1 is the market. Layer 2 is situational reasoning beside it. This
 * module is one measured input to that second layer: team offensive
 * EPA/play, player rushing EPA, and team screen success, transcribed from
 * the fleet's 2026-10-12 X-analytics sweep (cherry-picked from main
 * @ ac24b79, where the sweep committed them) so the reasoning layer can
 * consume them without a runtime dependency on the docs tree.
 *
 * Source files (the record of truth — regenerate the snapshots below by
 * running this module's parsers over them):
 *   docs/research/2026-10-12/full-tables/gridironinfo-week5-offensive-epa-play.csv
 *   docs/research/2026-10-12/full-tables/ryanpaganetti-rushing-epa-top10-wk5.csv
 *   docs/research/2026-10-12/full-tables/syedschemes-screen-success-rate-wk5.csv
 *
 * Honesty rules, enforced by the tests beside this file:
 *   - ABSENT MEANS NULL. A team or player not in a table returns null —
 *     never a league average, never an interpolation, never a zero. The
 *     Week-5 offensive table covers 28 of 32 teams; BUF and LAR are both
 *     absent from it, so for tonight's game (BUF @ LAR) team offensive EPA
 *     context is genuinely unavailable from this source and says so.
 *   - A BLANK VALUE IS NOT A ZERO. The rushing table's #10 row was
 *     truncated in the source observation; it is carried as null with its
 *     rank intact.
 *   - This context NEVER becomes a public-surface string and never mints,
 *     ranks, or labels a pick by itself. It is reasoning fuel, internal
 *     only, in the same class as the situational engine's inputs.
 */

export const EPA_CONTEXT_SOURCE_FILES = {
  offensiveEpaPlay:
    "docs/research/2026-10-12/full-tables/gridironinfo-week5-offensive-epa-play.csv",
  rushingEpaTop10:
    "docs/research/2026-10-12/full-tables/ryanpaganetti-rushing-epa-top10-wk5.csv",
  screenSuccess:
    "docs/research/2026-10-12/full-tables/syedschemes-screen-success-rate-wk5.csv",
} as const;

/** The sweep these snapshots were transcribed from (main commit ac24b79). */
export const EPA_CONTEXT_SWEEP = "x-intel 2026-10-12 (Week 5 tables)" as const;

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export interface TeamOffensiveEpa {
  readonly team: string;
  readonly rank: number;
  readonly epaPerPlay: number;
}

export interface PlayerRushingEpa {
  readonly player: string;
  readonly rank: number;
  /** Season rushing EPA total through Sunday of Week 5; null = not captured in the source. */
  readonly rushingEpa: number | null;
}

export interface TeamScreenSuccess {
  readonly team: string;
  /** Rank as published — may be a tie label such as "T-5". */
  readonly rankLabel: string;
  readonly successRatePct: number;
}

// ---------------------------------------------------------------------------
// Parsers — pure, fail-closed. A malformed row is skipped, never repaired;
// a blank value cell yields null (absence), never 0.
// ---------------------------------------------------------------------------

function csvRows(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(",").map((cell) => cell.trim()));
}

function parseNumber(cell: string | undefined): number | null {
  if (cell === undefined || cell === "") return null;
  const value = Number(cell);
  return Number.isFinite(value) ? value : null;
}

export function parseOffensiveEpaCsv(text: string): TeamOffensiveEpa[] {
  const rows = csvRows(text);
  const out: TeamOffensiveEpa[] = [];
  for (const row of rows) {
    if (row[0] === "RANK") continue; // header
    const rank = parseNumber(row[0]);
    const epaPerPlay = parseNumber(row[2]);
    const team = row[1];
    if (rank === null || epaPerPlay === null || !team) continue;
    out.push({ team, rank, epaPerPlay });
  }
  return out;
}

export function parseRushingEpaCsv(text: string): PlayerRushingEpa[] {
  const rows = csvRows(text);
  const out: PlayerRushingEpa[] = [];
  for (const row of rows) {
    if (row[0] === "RANK") continue; // header
    const rank = parseNumber(row[0]);
    const player = row[1];
    if (rank === null || !player) continue;
    // Blank value = not captured in the source. Kept, as null — not dropped,
    // not zeroed: the player's rank is a fact, the missing value is another.
    out.push({ player, rank, rushingEpa: parseNumber(row[2]) });
  }
  return out;
}

/** Full team names as published in the screen table → repo abbreviations. */
const SCREEN_TEAM_ABBREVIATIONS: Readonly<Record<string, string>> = {
  Falcons: "ATL",
  Ravens: "BAL",
  Chiefs: "KC",
  Steelers: "PIT",
  Rams: "LAR",
  Panthers: "CAR",
};

export function parseScreenSuccessCsv(text: string): TeamScreenSuccess[] {
  const rows = csvRows(text);
  const out: TeamScreenSuccess[] = [];
  for (const row of rows) {
    if (row[0] === "RANK") continue; // header
    const rankLabel = row[0];
    const teamName = row[1];
    const successRatePct = parseNumber(row[2]);
    if (!rankLabel || !teamName || successRatePct === null) continue;
    out.push({
      team: SCREEN_TEAM_ABBREVIATIONS[teamName] ?? teamName,
      rankLabel,
      successRatePct,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Snapshots — transcribed verbatim from the source files above.
// ---------------------------------------------------------------------------

export const TEAM_OFFENSIVE_EPA_PLAY_WK5: readonly TeamOffensiveEpa[] = [
  { team: "NE", rank: 1, epaPerPlay: 0.42 },
  { team: "DET", rank: 2, epaPerPlay: 0.33 },
  { team: "GB", rank: 3, epaPerPlay: 0.26 },
  { team: "PIT", rank: 4, epaPerPlay: 0.24 },
  { team: "TB", rank: 5, epaPerPlay: 0.16 },
  { team: "CIN", rank: 6, epaPerPlay: 0.14 },
  { team: "HOU", rank: 7, epaPerPlay: 0.13 },
  { team: "WAS", rank: 8, epaPerPlay: 0.11 },
  { team: "NYG", rank: 9, epaPerPlay: 0.06 },
  { team: "JAX", rank: 10, epaPerPlay: 0.06 },
  { team: "BAL", rank: 11, epaPerPlay: 0.04 },
  { team: "ARI", rank: 12, epaPerPlay: 0.02 },
  { team: "IND", rank: 13, epaPerPlay: 0.0 },
  { team: "LV", rank: 14, epaPerPlay: -0.02 },
  { team: "ATL", rank: 15, epaPerPlay: -0.02 },
  { team: "MIA", rank: 16, epaPerPlay: -0.03 },
  { team: "DAL", rank: 17, epaPerPlay: -0.05 },
  { team: "MIN", rank: 18, epaPerPlay: -0.1 },
  { team: "SF", rank: 19, epaPerPlay: -0.12 },
  { team: "NYJ", rank: 20, epaPerPlay: -0.18 },
  { team: "PHI", rank: 21, epaPerPlay: -0.2 },
  { team: "DEN", rank: 22, epaPerPlay: -0.27 },
  { team: "CLE", rank: 23, epaPerPlay: -0.3 },
  { team: "CHI", rank: 24, epaPerPlay: -0.34 },
  { team: "NO", rank: 25, epaPerPlay: -0.35 },
  { team: "TEN", rank: 26, epaPerPlay: -0.39 },
  { team: "LAC", rank: 27, epaPerPlay: -0.4 },
  { team: "SEA", rank: 28, epaPerPlay: -0.43 },
];

export const PLAYER_RUSHING_EPA_TOP10_WK5: readonly PlayerRushingEpa[] = [
  { player: "Kenneth Walker III", rank: 1, rushingEpa: 10.9 },
  { player: "James Cook", rank: 2, rushingEpa: 9.1 },
  { player: "Bijan Robinson", rank: 3, rushingEpa: 7.0 },
  { player: "Bucky Irving", rank: 4, rushingEpa: 4.1 },
  { player: "Kyle Monangai", rank: 5, rushingEpa: 3.7 },
  { player: "Jaylen Warren", rank: 6, rushingEpa: 3.2 },
  { player: "Brian Robinson", rank: 7, rushingEpa: 3.0 },
  { player: "Christian McCaffrey", rank: 8, rushingEpa: 2.7 },
  { player: "Ollie Gordon II", rank: 9, rushingEpa: 2.0 },
  // Value truncated in the source observation — not captured. Null, not 0.
  { player: "Jahmyr Gibbs", rank: 10, rushingEpa: null },
];

export const TEAM_SCREEN_SUCCESS_WK5: readonly TeamScreenSuccess[] = [
  { team: "ATL", rankLabel: "1", successRatePct: 66.7 },
  { team: "BAL", rankLabel: "2", successRatePct: 63.6 },
  { team: "KC", rankLabel: "3", successRatePct: 52.0 },
  { team: "PIT", rankLabel: "4", successRatePct: 51.9 },
  { team: "LAR", rankLabel: "T-5", successRatePct: 50.0 },
  { team: "CAR", rankLabel: "T-5", successRatePct: 50.0 },
];

// ---------------------------------------------------------------------------
// Lookups — null on absence, always.
// ---------------------------------------------------------------------------

export function offensiveEpaForTeam(team: string): TeamOffensiveEpa | null {
  return TEAM_OFFENSIVE_EPA_PLAY_WK5.find((row) => row.team === team) ?? null;
}

export function rushingEpaForPlayer(player: string): PlayerRushingEpa | null {
  return PLAYER_RUSHING_EPA_TOP10_WK5.find((row) => row.player === player) ?? null;
}

export function screenSuccessForTeam(team: string): TeamScreenSuccess | null {
  return TEAM_SCREEN_SUCCESS_WK5.find((row) => row.team === team) ?? null;
}

/** Everything this source can honestly say about one team, absences included. */
export interface TeamEpaContext {
  readonly team: string;
  /** Null = the team is not in the Week-5 offensive table (28 of 32 teams). */
  readonly offensiveEpaPerPlay: TeamOffensiveEpa | null;
  /** Null = the team is not in the Week-5 screen-success table (6 teams). */
  readonly screenSuccess: TeamScreenSuccess | null;
}

export function teamEpaContext(team: string): TeamEpaContext {
  return {
    team,
    offensiveEpaPerPlay: offensiveEpaForTeam(team),
    screenSuccess: screenSuccessForTeam(team),
  };
}
