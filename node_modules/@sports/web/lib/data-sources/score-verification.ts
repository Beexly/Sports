/**
 * Free score verification / settlement support.
 *
 * The Odds API (paid; 500 free credits/mo) is currently used for final scores at
 * settlement. ESPN public scores are FREE. This module indexes ESPN finals and matches
 * them to our games so settlement can be (a) cross-checked for quality and (b) sourced
 * for free — reserving paid credits for odds only.
 *
 * Pure + deterministic. Matching is conservative: it joins on game date + normalized
 * team tokens (abbreviation and full-name), and reports match confidence so a low-
 * confidence match never silently settles a pick.
 */

import type { NormalizedGame } from "./free-adapters/espn-scores";

export type FinalScore = {
  readonly gameId: string;
  readonly date: string; // YYYY-MM-DD (UTC)
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly homeAbbr: string;
  readonly awayAbbr: string;
  readonly homeScore: number;
  readonly awayScore: number;
};

export function normalizeTeamToken(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function dateKey(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/** Index of completed ESPN games, keyed by date + each team token (abbr + name). */
export type FinalsIndex = {
  readonly byKey: ReadonlyMap<string, FinalScore>;
  readonly finals: readonly FinalScore[];
};

function keysFor(date: string, homeToken: string, awayToken: string): string[] {
  // home-vs-away directional keys so we never flip the result.
  return [`${date}|${homeToken}|${awayToken}`];
}

export function indexFinals(games: readonly NormalizedGame[]): FinalsIndex {
  const byKey = new Map<string, FinalScore>();
  const finals: FinalScore[] = [];

  for (const g of games) {
    if (!g.completed || !g.home || !g.away || g.home.score === null || g.away.score === null) continue;
    const date = dateKey(g.startTime);
    if (!date) continue;
    const fs: FinalScore = {
      gameId: g.gameId,
      date,
      homeTeam: g.home.team,
      awayTeam: g.away.team,
      homeAbbr: g.home.abbreviation,
      awayAbbr: g.away.abbreviation,
      homeScore: g.home.score,
      awayScore: g.away.score,
    };
    finals.push(fs);

    const homeTokens = [normalizeTeamToken(fs.homeAbbr), normalizeTeamToken(fs.homeTeam)].filter(Boolean);
    const awayTokens = [normalizeTeamToken(fs.awayAbbr), normalizeTeamToken(fs.awayTeam)].filter(Boolean);
    for (const h of homeTokens) {
      for (const a of awayTokens) {
        for (const k of keysFor(date, h, a)) byKey.set(k, fs);
      }
    }
  }

  return { byKey, finals };
}

/** Look up an ESPN final for one of our games by date + team identifiers. */
export function lookupFinal(
  index: FinalsIndex,
  homeIdentifier: string,
  awayIdentifier: string,
  dateIso: string,
): FinalScore | null {
  const date = dateKey(dateIso);
  if (!date) return null;
  const h = normalizeTeamToken(homeIdentifier);
  const a = normalizeTeamToken(awayIdentifier);
  return index.byKey.get(`${date}|${h}|${a}`) ?? null;
}

export type ScoreCrossCheck = {
  readonly matched: boolean;
  readonly agrees: boolean | null;
  readonly espn: FinalScore | null;
};

/**
 * Cross-check our (home, away) final against ESPN's free final. `agrees` is null when
 * unmatched — callers must treat unmatched as "do not settle from free source".
 */
export function crossCheckScore(
  index: FinalsIndex,
  ours: { homeIdentifier: string; awayIdentifier: string; dateIso: string; homeScore: number; awayScore: number },
): ScoreCrossCheck {
  const espn = lookupFinal(index, ours.homeIdentifier, ours.awayIdentifier, ours.dateIso);
  if (!espn) return { matched: false, agrees: null, espn: null };
  const agrees = espn.homeScore === ours.homeScore && espn.awayScore === ours.awayScore;
  return { matched: true, agrees, espn };
}
