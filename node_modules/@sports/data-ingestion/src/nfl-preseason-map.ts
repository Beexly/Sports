/**
 * NFL preseason Odds API key mapping (H-F3 / C-36).
 *
 * The Odds API serves preseason under `americanfootball_nfl_preseason`.
 * ESPN-seeded August NFL games already live under `americanfootball_nfl`.
 * This module remaps preseason feed rows onto those existing games by
 * team pair + commence time. Ingestion-only: the preseason key is NEVER
 * a SUPPORTED_SPORTS board sport.
 *
 * Window: July–August UTC. Hard expiry ~Aug 30.
 * Pure: no I/O.
 */

import { normalizeComparableText } from "./team-text-match.js";

export const NFL_PRESEASON_ODDS_KEY = "americanfootball_nfl_preseason" as const;
export const NFL_CANONICAL_SPORT_KEY = "americanfootball_nfl" as const;

/** Inclusive UTC months the preseason Odds API key is fetched. */
export const NFL_PRESEASON_FETCH_MONTHS = [7, 8] as const;

/** Kickoff clocks differ across ESPN vs Odds API; 18h still same contest. */
export const NFL_PRESEASON_COMMENCE_MATCH_MS = 18 * 60 * 60 * 1000;

export type OddsIngestKey =
  | import("./config.js").SupportedSportKey
  | typeof NFL_PRESEASON_ODDS_KEY;

export function isNflPreseasonFetchWindow(date: Date = new Date()): boolean {
  const month = date.getUTCMonth() + 1;
  return month === 7 || month === 8;
}

export type ExistingGameMatch = {
  readonly externalId: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly commenceTime: Date;
};

export type PreseasonFeedRow = {
  readonly id: string;
  readonly sport_key: string;
  readonly home_team: string;
  readonly away_team: string;
  readonly commence_time: string;
};

function lastToken(name: string): string {
  const parts = normalizeComparableText(name).split(" ").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

/** Exact normalized name, or nickname last-token (≥4 chars) to absorb "Kansas City Chiefs" vs "Chiefs". */
export function nflTeamsMatch(a: string, b: string): boolean {
  const na = normalizeComparableText(a);
  const nb = normalizeComparableText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const la = lastToken(a);
  const lb = lastToken(b);
  return la.length >= 4 && la === lb;
}

export function matchPreseasonRowToExistingGame(
  row: PreseasonFeedRow,
  games: readonly ExistingGameMatch[],
): ExistingGameMatch | null {
  const t = new Date(row.commence_time).getTime();
  if (!Number.isFinite(t)) return null;
  let best: ExistingGameMatch | null = null;
  let bestDelta = Infinity;
  for (const game of games) {
    if (!nflTeamsMatch(row.home_team, game.homeTeam)) continue;
    if (!nflTeamsMatch(row.away_team, game.awayTeam)) continue;
    const delta = Math.abs(game.commenceTime.getTime() - t);
    if (delta <= NFL_PRESEASON_COMMENCE_MATCH_MS && delta < bestDelta) {
      best = game;
      bestDelta = delta;
    }
  }
  return best;
}

export function remapPreseasonRows<T extends PreseasonFeedRow>(
  rows: readonly T[],
  games: readonly ExistingGameMatch[],
): { remapped: T[]; unmatched: number } {
  const remapped: T[] = [];
  let unmatched = 0;
  const claimed = new Set<string>();
  for (const row of rows) {
    const game = matchPreseasonRowToExistingGame(row, games);
    if (!game || claimed.has(game.externalId)) {
      unmatched += 1;
      continue;
    }
    claimed.add(game.externalId);
    remapped.push({
      ...row,
      id: game.externalId,
      sport_key: NFL_CANONICAL_SPORT_KEY,
    });
  }
  return { remapped, unmatched };
}

export function mergeFeedRowsById<T extends { id: string }>(
  primary: readonly T[],
  extra: readonly T[],
): T[] {
  const out = [...primary];
  const ids = new Set(primary.map((row) => row.id));
  for (const row of extra) {
    if (ids.has(row.id)) continue;
    ids.add(row.id);
    out.push(row);
  }
  return out;
}
