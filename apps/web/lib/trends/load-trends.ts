import { db, isStubMode } from "@sports/db";

/**
 * Trends loader — the public, scores24-style read of the team-form, venue-form,
 * head-to-head, rest, and line-movement history the platform already computes
 * during ingestion (see packages/data-ingestion/src/context-enrichment.ts).
 *
 * Source of truth is the `TeamGameLog` table (settled ATS results) plus the
 * scheduling/line-movement context denormalized onto each `Game`. We mirror the
 * engine's discipline here: a trend is only shown when at least
 * `MIN_SAMPLE` settled games back it — never a streak invented from one game.
 *
 * All reads are wrapped so the page renders an honest empty state in stub mode
 * or when the database is unavailable, exactly like the homepage loaders.
 */

/** Minimum settled games before a form/H2H trend is trustworthy. Matches the engine. */
export const MIN_SAMPLE = 5;
const FORM_WINDOW = 15;
const H2H_WINDOW = 10;
const MAX_GAMES = 24;

export interface FormRecord {
  readonly wins: number;
  readonly losses: number;
  readonly pushes: number;
  readonly sampleSize: number;
  /** ATS cover rate as a 0–100 integer (pushes excluded from the denominator). */
  readonly coverPct: number;
}

export interface TeamTrend {
  readonly team: string;
  /** Overall ATS form across the last FORM_WINDOW settled games. */
  readonly form: FormRecord | null;
  /** Venue-specific form (home team at home, away team on the road). */
  readonly venueForm: FormRecord | null;
  /** Rest days before this game, if computed. */
  readonly restDays: number | null;
  readonly backToBack: boolean;
}

export interface GameTrend {
  readonly gameId: string;
  readonly sport: string;
  readonly matchup: string;
  readonly commenceTime: string;
  readonly home: TeamTrend;
  readonly away: TeamTrend;
  /** Home team's ATS record specifically vs. this opponent. */
  readonly headToHead: FormRecord | null;
  /** Current avg spread − opening (negative = home favored more). */
  readonly lineMovementSpread: number | null;
  /** Whether any trustworthy trend exists for this game. */
  readonly hasSignal: boolean;
}

export interface TrendBoard {
  readonly games: readonly GameTrend[];
  readonly isSampleData: boolean;
  readonly generatedAt: string;
}

function toFormRecord(
  rows: ReadonlyArray<{ atsResult: string }>,
): FormRecord | null {
  if (rows.length < MIN_SAMPLE) return null;
  const wins = rows.filter((r) => r.atsResult === "WIN").length;
  const losses = rows.filter((r) => r.atsResult === "LOSS").length;
  const pushes = rows.filter((r) => r.atsResult === "PUSH").length;
  const decided = wins + losses;
  const coverPct = decided === 0 ? 0 : Math.round((wins / decided) * 100);
  return { wins, losses, pushes, sampleSize: rows.length, coverPct };
}

async function loadForm(
  teamName: string,
  sport: string,
  venue?: "HOME" | "AWAY",
): Promise<FormRecord | null> {
  const rows = await db.teamGameLog.findMany({
    where: {
      teamName,
      sport,
      atsResult: { in: ["WIN", "LOSS", "PUSH"] },
      ...(venue === "HOME" ? { isHome: true } : {}),
      ...(venue === "AWAY" ? { isHome: false } : {}),
    },
    select: { atsResult: true },
    orderBy: { gameDate: "desc" },
    take: FORM_WINDOW,
  });
  return toFormRecord(rows);
}

async function loadHeadToHead(
  teamName: string,
  opponentName: string,
  sport: string,
): Promise<FormRecord | null> {
  const rows = await db.teamGameLog.findMany({
    where: {
      teamName,
      opponentName,
      sport,
      atsResult: { in: ["WIN", "LOSS", "PUSH"] },
    },
    select: { atsResult: true },
    orderBy: { gameDate: "desc" },
    take: H2H_WINDOW,
  });
  return toFormRecord(rows);
}

/**
 * Build the trend board for the upcoming slate. Returns an empty board (not an
 * error) whenever the database can't be read, so the page always renders.
 */
export async function loadTrendBoard(): Promise<TrendBoard> {
  const generatedAt = new Date().toISOString();

  if (isStubMode()) {
    return { games: [], isSampleData: true, generatedAt };
  }

  try {
    const now = new Date();
    const games = await db.game.findMany({
      where: { status: "SCHEDULED", commenceTime: { gte: now } },
      include: { sport: { select: { name: true } } },
      orderBy: { commenceTime: "asc" },
      take: MAX_GAMES,
    });

    const trends = await Promise.all(
      games.map(async (game): Promise<GameTrend> => {
        const sport = game.sport.name;
        const [homeForm, awayForm, homeVenue, awayVenue, h2h] =
          await Promise.all([
            loadForm(game.homeTeamName, sport),
            loadForm(game.awayTeamName, sport),
            loadForm(game.homeTeamName, sport, "HOME"),
            loadForm(game.awayTeamName, sport, "AWAY"),
            loadHeadToHead(game.homeTeamName, game.awayTeamName, sport),
          ]);

        const home: TeamTrend = {
          team: game.homeTeamName,
          form: homeForm,
          venueForm: homeVenue,
          restDays: game.restDaysHome ?? null,
          backToBack: game.isBackToBackHome,
        };
        const away: TeamTrend = {
          team: game.awayTeamName,
          form: awayForm,
          venueForm: awayVenue,
          restDays: game.restDaysAway ?? null,
          backToBack: game.isBackToBackAway,
        };

        const hasSignal =
          homeForm !== null ||
          awayForm !== null ||
          homeVenue !== null ||
          awayVenue !== null ||
          h2h !== null ||
          game.lineMovementSpread !== null;

        return {
          gameId: game.id,
          sport,
          matchup: `${game.awayTeamName} @ ${game.homeTeamName}`,
          commenceTime: game.commenceTime.toISOString(),
          home,
          away,
          headToHead: h2h,
          lineMovementSpread: game.lineMovementSpread ?? null,
          hasSignal,
        };
      }),
    );

    return { games: trends, isSampleData: false, generatedAt };
  } catch {
    // DB unavailable / not migrated — render the honest empty state.
    return { games: [], isSampleData: false, generatedAt };
  }
}
