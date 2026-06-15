import { normalizeTeamAlias } from "./team-resolver";

export interface HistoricalGameIdentity {
  readonly gameId: string;
  readonly season: number;
  readonly week: number;
  readonly homeTeam: string;
  readonly awayTeam: string;
}

export interface GameIdentityResolution {
  readonly status: "MATCHED" | "AMBIGUOUS" | "NO_MATCH" | "UNSAFE_COMMENCE_TIME_ONLY";
  readonly gameId: string | null;
  readonly reason: string;
}

export function resolveGameIdentity(input: { season?: number; week?: number; homeTeam?: string; awayTeam?: string; commenceTime?: string }, candidates: readonly HistoricalGameIdentity[]): GameIdentityResolution {
  if (input.season === undefined || input.week === undefined || !input.homeTeam || !input.awayTeam) {
    return { status: input.commenceTime ? "UNSAFE_COMMENCE_TIME_ONLY" : "NO_MATCH", gameId: null, reason: "requires-season-week-and-teams" };
  }
  const home = normalizeTeamAlias(input.homeTeam);
  const away = normalizeTeamAlias(input.awayTeam);
  if (!home || !away) return { status: "NO_MATCH", gameId: null, reason: "unknown-team-alias" };
  const matches = candidates.filter((game) => game.season === input.season && game.week === input.week && normalizeTeamAlias(game.homeTeam) === home && normalizeTeamAlias(game.awayTeam) === away);
  if (matches.length === 1) return { status: "MATCHED", gameId: matches[0]!.gameId, reason: "season-week-team-match" };
  if (matches.length > 1) return { status: "AMBIGUOUS", gameId: null, reason: "multiple-games-match" };
  return { status: "NO_MATCH", gameId: null, reason: "no-season-week-team-match" };
}
