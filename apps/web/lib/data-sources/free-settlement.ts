/**
 * Free-finals settlement — turn FREE, cross-checked finals into settled pick results
 * with an explicit trust tier. This is the bridge between the free data path and the
 * track record the proof-gated pricing ladder depends on ("≥100 settled + published
 * calibration").
 *
 * Trust discipline (honors "no stale/unverified data"):
 *   - CONFIRMED    — both free sources agree on the final → settle with high trust.
 *   - SINGLE_SOURCE — only one free source has the final → settle, flagged for audit.
 *   - DISPUTED     — sources disagree on the score → HOLD, never settle blindly.
 *   - (no final)   — PENDING with reason NO_FINAL (RCA/STP consume this).
 *   - orient fail  — PENDING with reason ORIENT_FAIL.
 *
 * Pure + deterministic (no DB, no network). The worker supplies pending picks and the
 * already-fetched free games; this decides the outcome.
 */

import { calculatePickResult, type SettlementResult } from "@sports/prediction-engine";
import type { PickType } from "@sports/types";
import type { NormalizedGame } from "./free-adapters/espn-scores";
import type { NcaaGame } from "./free-adapters/henrygd-ncaa";
import {
  toComparableFromEspn,
  toComparableFromHenrygd,
  matchupKey,
  daysApart,
  type ComparableGame,
} from "./ncaa-consensus";
import { normalizeTeamToken } from "./score-verification";

export type Confirmation = "CONFIRMED" | "SINGLE_SOURCE" | "DISPUTED";

export type TrustedFinal = {
  readonly date: string;
  readonly home: { name: string; abbr: string; score: number };
  readonly away: { name: string; abbr: string; score: number };
  readonly confirmation: Confirmation;
  readonly sources: readonly string[];
};

function completed(g: ComparableGame): g is ComparableGame & { home: { score: number }; away: { score: number } } {
  return g.completed && g.home.score !== null && g.away.score !== null;
}

/**
 * Fuse two free sources into a trusted-finals list. Games present in both with matching
 * scores are CONFIRMED; matching matchup but differing scores are DISPUTED; lone games are
 * SINGLE_SOURCE. Matching is by team abbreviation + date proximity (±`dateToleranceDays`).
 */
export function buildTrustedFinals(
  espn: readonly NormalizedGame[],
  henrygd: readonly NcaaGame[],
  dateToleranceDays = 1,
): TrustedFinal[] {
  const primary = espn.map(toComparableFromEspn).filter((g): g is ComparableGame => g !== null).filter(completed);
  const secondary = henrygd.map(toComparableFromHenrygd).filter(completed);

  const secByKey = new Map<string, ComparableGame[]>();
  for (const g of secondary) {
    const k = matchupKey(g);
    (secByKey.get(k) ?? secByKey.set(k, []).get(k)!).push(g);
  }

  const out: TrustedFinal[] = [];
  const usedSecondary = new Set<ComparableGame>();

  for (const pg of primary) {
    const key = matchupKey(pg);
    const match = (secByKey.get(key) ?? [])
      .filter((c) => !usedSecondary.has(c) && daysApart(pg.date, c.date) <= dateToleranceDays)
      .sort((a, b) => daysApart(pg.date, a.date) - daysApart(pg.date, b.date))[0];

    if (!match) {
      out.push(toTrusted(pg, "SINGLE_SOURCE", [pg.source]));
      continue;
    }
    usedSecondary.add(match);
    const agree =
      scoreFor(pg, pg.home.abbr) === scoreFor(match, pg.home.abbr) &&
      scoreFor(pg, pg.away.abbr) === scoreFor(match, pg.away.abbr);
    out.push(toTrusted(pg, agree ? "CONFIRMED" : "DISPUTED", [pg.source, match.source]));
  }

  for (const sg of secondary) {
    if (!usedSecondary.has(sg)) out.push(toTrusted(sg, "SINGLE_SOURCE", [sg.source]));
  }
  return out;
}

function scoreFor(g: ComparableGame, abbr: string): number | null {
  if (g.home.abbr === abbr) return g.home.score;
  if (g.away.abbr === abbr) return g.away.score;
  return null;
}

function toTrusted(g: ComparableGame, confirmation: Confirmation, sources: string[]): TrustedFinal {
  return {
    date: g.date,
    home: { name: g.home.name, abbr: g.home.abbr, score: g.home.score as number },
    away: { name: g.away.name, abbr: g.away.abbr, score: g.away.score as number },
    confirmation,
    sources,
  };
}

// ── Pick settlement ──────────────────────────────────────────────────────────────────

export type PendingPick = {
  readonly pickId: string;
  readonly pickType: PickType;
  readonly selection: string;
  /** SPREAD/TOTAL line. SPREAD is from the HOME team's perspective (same contract as
   * calculatePickResult): -3.5 = home favored by 3.5, regardless of the picked side. */
  readonly line: number;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly sportKey: string;
  readonly gameDateIso: string;
};

export type SettlementOutcome =
  | {
      pickId: string;
      status: "SETTLED";
      result: SettlementResult;
      confirmation: Confirmation;
      homeScore: number;
      awayScore: number;
      sources: readonly string[];
    }
  | { pickId: string; status: "HELD"; reason: "DISPUTED"; sources: readonly string[] }
  | { pickId: string; status: "PENDING"; reason: "NO_FINAL" | "ORIENT_FAIL" };

/** Does this trusted final involve both of the pick's teams (token match, either orientation)? */
function finalMatchesPick(pick: PendingPick, f: TrustedFinal): boolean {
  const pickTeams = new Set([normalizeTeamToken(pick.homeTeam), normalizeTeamToken(pick.awayTeam)]);
  const finalTeams = [f.home.name, f.away.name].map(normalizeTeamToken);
  // Each pick team must token-match a final team (equal, or one contains the other).
  return [...pickTeams].every((pt) => finalTeams.some((ft) => pt === ft || pt.includes(ft) || ft.includes(pt)));
}

/** Orient final scores to the pick's home team. Returns null if the home team can't be matched. */
function orientToPickHome(pick: PendingPick, f: TrustedFinal): { homeScore: number; awayScore: number } | null {
  const ph = normalizeTeamToken(pick.homeTeam);
  const fh = normalizeTeamToken(f.home.name);
  const fa = normalizeTeamToken(f.away.name);
  if (ph === fh || ph.includes(fh) || fh.includes(ph)) return { homeScore: f.home.score, awayScore: f.away.score };
  if (ph === fa || ph.includes(fa) || fa.includes(ph)) return { homeScore: f.away.score, awayScore: f.home.score };
  return null;
}

/** Settle pending picks against trusted free finals. DISPUTED finals HOLD; unmatched stay PENDING. */
export function settlePendingPicks(picks: readonly PendingPick[], finals: readonly TrustedFinal[]): SettlementOutcome[] {
  return picks.map((pick): SettlementOutcome => {
    const candidates = finals.filter(
      (f) => daysApart(f.date, pick.gameDateIso.slice(0, 10)) <= 1 && finalMatchesPick(pick, f),
    );
    const final = candidates[0];
    if (!final) return { pickId: pick.pickId, status: "PENDING", reason: "NO_FINAL" };
    if (final.confirmation === "DISPUTED") {
      return { pickId: pick.pickId, status: "HELD", reason: "DISPUTED", sources: final.sources };
    }
    const oriented = orientToPickHome(pick, final);
    if (!oriented) return { pickId: pick.pickId, status: "PENDING", reason: "ORIENT_FAIL" };

    const result = calculatePickResult(
      pick.pickType,
      pick.selection,
      pick.line,
      pick.homeTeam,
      oriented.homeScore,
      oriented.awayScore,
      pick.sportKey,
      pick.awayTeam,
    );
    return {
      pickId: pick.pickId,
      status: "SETTLED",
      result,
      confirmation: final.confirmation,
      homeScore: oriented.homeScore,
      awayScore: oriented.awayScore,
      sources: final.sources,
    };
  });
}
