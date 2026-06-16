/**
 * NCAA cross-source consensus + failover.
 *
 * NCAA football has TWO independent FREE sources (ESPN public + henrygd). This module
 * makes them reinforce each other:
 *  - crossCheckNcaaScores(): joins games by stable team ABBREVIATION (not mascot-laden
 *    display names) and reports agreement / disagreement / coverage gaps. Two independent
 *    free sources agreeing on a final = a confirmed fact; a mismatch is flagged, never
 *    silently trusted.
 *  - resilientNcaaScores(): prefers the primary source, falls back to the secondary when
 *    the primary is down or empty — so the free path stays up without any paid call.
 *
 * Facts only. Pure functions (no network) so they are deterministic and fully testable.
 */

import type { NormalizedGame } from "./free-adapters/espn-scores";
import type { NcaaGame } from "./free-adapters/henrygd-ncaa";

export type ComparableTeam = { readonly abbr: string; readonly name: string; readonly score: number | null };
export type ComparableGame = {
  readonly source: string;
  readonly date: string; // YYYY-MM-DD
  readonly completed: boolean;
  readonly home: ComparableTeam;
  readonly away: ComparableTeam;
};

/** Uppercase, strip non-alphanumerics — "Navy"/"NAVY"/"navy" all collapse to "NAVY". */
export function normAbbr(s: string): string {
  return (s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Orientation-independent key for a matchup: sorted, normalized abbreviation pair. */
export function matchupKey(g: ComparableGame): string {
  return [normAbbr(g.home.abbr), normAbbr(g.away.abbr)].sort().join("|");
}

export function toComparableFromEspn(g: NormalizedGame): ComparableGame | null {
  if (!g.home || !g.away) return null;
  return {
    source: g.sourceId,
    date: (g.startTime ?? "").slice(0, 10),
    completed: g.completed,
    home: { abbr: normAbbr(g.home.abbreviation), name: g.home.team, score: g.home.score },
    away: { abbr: normAbbr(g.away.abbreviation), name: g.away.team, score: g.away.score },
  };
}

export function toComparableFromHenrygd(g: NcaaGame): ComparableGame {
  return {
    source: g.sourceId,
    date: g.date,
    completed: g.completed,
    home: { abbr: normAbbr(g.home.abbr), name: g.home.team, score: g.home.score },
    away: { abbr: normAbbr(g.away.abbr), name: g.away.team, score: g.away.score },
  };
}

function scoreByAbbr(g: ComparableGame): Map<string, number | null> {
  return new Map([
    [normAbbr(g.home.abbr), g.home.score],
    [normAbbr(g.away.abbr), g.away.score],
  ]);
}

export type ScoreCheck = {
  readonly matchupKey: string;
  readonly matchup: string; // "AWAY @ HOME" by the primary source
  readonly date: string;
  readonly a: { source: string; home: number | null; away: number | null };
  readonly b: { source: string; home: number | null; away: number | null };
};

export type ConsensusReport = {
  /** Both sources final and every team's score matches — a confirmed fact. */
  readonly agreements: readonly ScoreCheck[];
  /** Both sources final but scores differ — flag, do not trust either blindly. */
  readonly disagreements: readonly ScoreCheck[];
  /** In both sources but not yet final in at least one — nothing to confirm. */
  readonly pending: readonly ScoreCheck[];
  /** Covered by only one source — a coverage gap, not an error. */
  readonly primaryOnly: readonly string[];
  readonly secondaryOnly: readonly string[];
  readonly summary: { matched: number; confirmed: number; conflicts: number; pending: number; coverageGaps: number };
};

/** Whole-day distance between two YYYY-MM-DD strings; Infinity if either is unparseable. */
export function daysApart(a: string, b: string): number {
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return Infinity;
  return Math.abs(Math.round((ta - tb) / 86_400_000));
}

function check(key: string, primary: ComparableGame, secondary: ComparableGame): ScoreCheck {
  return {
    matchupKey: key,
    matchup: `${primary.away.abbr} @ ${primary.home.abbr}`,
    date: primary.date || secondary.date,
    a: { source: primary.source, home: primary.home.score, away: primary.away.score },
    b: { source: secondary.source, home: secondary.home.score, away: secondary.away.score },
  };
}

function groupByKey(games: readonly ComparableGame[]): Map<string, ComparableGame[]> {
  const m = new Map<string, ComparableGame[]>();
  for (const g of games) {
    const k = matchupKey(g);
    (m.get(k) ?? m.set(k, []).get(k)!).push(g);
  }
  return m;
}

/**
 * Cross-check two independent free sources' NCAA scores. `primary`/`secondary` order is
 * cosmetic. A pair is only treated as the SAME game when the team-abbreviation pair matches
 * AND the dates are within `dateToleranceDays` (default 1 — covers UTC/local date rollover);
 * this prevents confirming, say, a December final against a September rematch of the same
 * two teams.
 */
export function crossCheckNcaaScores(
  primary: readonly ComparableGame[],
  secondary: readonly ComparableGame[],
  dateToleranceDays = 1,
): ConsensusReport {
  const secondaryGroups = groupByKey(secondary);
  const usedSecondary = new Set<ComparableGame>();

  const agreements: ScoreCheck[] = [];
  const disagreements: ScoreCheck[] = [];
  const pending: ScoreCheck[] = [];
  const primaryOnly: string[] = [];

  for (const pg of primary) {
    const key = matchupKey(pg);
    const candidates = (secondaryGroups.get(key) ?? []).filter((c) => !usedSecondary.has(c));
    // Pick the date-closest candidate within tolerance.
    let best: ComparableGame | undefined;
    let bestGap = Infinity;
    for (const c of candidates) {
      const gap = daysApart(pg.date, c.date);
      if (gap <= dateToleranceDays && gap < bestGap) {
        best = c;
        bestGap = gap;
      }
    }
    if (!best) {
      primaryOnly.push(key);
      continue;
    }
    usedSecondary.add(best);
    const c = check(key, pg, best);
    if (!pg.completed || !best.completed) {
      pending.push(c);
      continue;
    }
    const ps = scoreByAbbr(pg);
    const ss = scoreByAbbr(best);
    let allMatch = true;
    for (const [abbr, score] of ps) {
      if (!ss.has(abbr) || ss.get(abbr) !== score || score === null) allMatch = false;
    }
    (allMatch ? agreements : disagreements).push(c);
  }

  const secondaryOnly = secondary.filter((g) => !usedSecondary.has(g)).map(matchupKey);

  return {
    agreements,
    disagreements,
    pending,
    primaryOnly,
    secondaryOnly,
    summary: {
      matched: agreements.length + disagreements.length + pending.length,
      confirmed: agreements.length,
      conflicts: disagreements.length,
      pending: pending.length,
      coverageGaps: primaryOnly.length + secondaryOnly.length,
    },
  };
}

// ── Failover ───────────────────────────────────────────────────────────────────────

export type ResilientResult = {
  readonly games: readonly ComparableGame[];
  readonly servedBy: "primary" | "secondary" | "none";
  readonly degraded: boolean; // true when the primary failed/was empty and we fell back
  readonly error?: string;
};

type Thunk = () => Promise<readonly ComparableGame[]>;

/**
 * Prefer the primary free source; fall back to the secondary if the primary throws or
 * returns nothing. Never makes a paid call — both arms are free sources.
 */
export async function resilientNcaaScores(primary: Thunk, secondary: Thunk): Promise<ResilientResult> {
  try {
    const games = await primary();
    if (games.length > 0) return { games, servedBy: "primary", degraded: false };
  } catch (err) {
    try {
      const games = await secondary();
      return { games, servedBy: "secondary", degraded: true, error: err instanceof Error ? err.message : String(err) };
    } catch {
      return { games: [], servedBy: "none", degraded: true, error: err instanceof Error ? err.message : String(err) };
    }
  }
  // primary returned empty — try secondary as a coverage fallback
  try {
    const games = await secondary();
    return { games, servedBy: games.length > 0 ? "secondary" : "none", degraded: true };
  } catch {
    return { games: [], servedBy: "none", degraded: true };
  }
}
