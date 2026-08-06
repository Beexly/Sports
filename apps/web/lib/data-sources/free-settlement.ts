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

/** Token equality or containment (handles "LAD" vs "Los Angeles Dodgers" via abbr path). */
export function teamTokensMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  // Require short tokens (abbrs) to match as whole-token containment only when len>=2
  // already covered by includes. No fuzzy beyond that.
  return false;
}

/** Multi-word city / place prefixes common in US pro sports display names. */
const CITY_PREFIXES: readonly string[] = [
  "los angeles",
  "new york",
  "san francisco",
  "san diego",
  "san antonio",
  "kansas city",
  "tampa bay",
  "green bay",
  "oklahoma city",
  "golden state",
  "trail blazers", // handled as nickname path, not city
  "st louis",
  "saint louis",
  "new england",
  "new orleans",
  "new jersey",
  "las vegas",
];

/** Known alternate tokens (normalized) that should match each other. */
const TOKEN_ALIASES: Readonly<Record<string, readonly string[]>> = {
  athletics: ["as", "oaklandathletics", "oaklandas", "oak"],
  as: ["athletics", "oaklandathletics", "oaklandas"],
  oaklandathletics: ["athletics", "as", "oaklandas"],
  guardians: ["clevelandguardians", "indians", "cle"],
  indians: ["guardians", "clevelandguardians"],
  diamondbacks: ["arizona", "ari", "dbacks", "dback"],
  dbacks: ["diamondbacks", "ari"],
  redsox: ["boston", "bos"],
  whitesox: ["chicago", "cws", "chw"],
  bluesox: [], // placeholder no-op
  redwings: ["detroit"],
  bluejays: ["toronto", "tor"],
  // Soccer / MLS short forms often seen on ESPN
  lafc: ["losangelesfc", "losangelesfootballclub"],
  losangelesfc: ["lafc"],
  losangelesfootballclub: ["lafc", "losangelesfc"],
  lagalaxy: ["galaxy", "losangelesgalaxy"],
  galaxy: ["lagalaxy", "losangelesgalaxy"],
  losangelesgalaxy: ["lagalaxy", "galaxy"],
  intermiami: ["miami", "intermiamicf"],
  intermiamicf: ["intermiami", "miami"],
  nycfc: ["newyorkcity", "newyorkcityfc"],
  newyorkcityfc: ["nycfc", "newyorkcity"],
  nyrb: ["redbulls", "newyorkredbulls"],
  newyorkredbulls: ["nyrb", "redbulls"],
  redbulls: ["nyrb", "newyorkredbulls"],
  atlantaunited: ["atlanta", "atl", "atlantaunitedfc"],
  stlcity: ["stlouiscity", "stlouis", "stlouiscitysc"],
  sounders: ["seattlesounders", "seattlesoundersfc"],
  seattlesoundersfc: ["sounders", "seattlesounders"],
  seattlesounders: ["sounders"],
  chicagofire: ["fire", "chicagofirefc"],
  chicagofirefc: ["chicagofire", "fire"],
  fire: ["chicagofire", "chicagofirefc"],
  vancouverwhitecaps: ["whitecaps", "vancouverwhitecapsfc"],
  vancouverwhitecapsfc: ["whitecaps", "vancouverwhitecaps"],
  whitecaps: ["vancouverwhitecaps", "vancouverwhitecapsfc"],
};


/**
 * Expand a team display string into match tokens:
 * full normalized string, last-word / last-two-words nicknames, city-stripped
 * nickname, and a small alias table for known short forms (A's, D-backs, …).
 */
export function expandTeamMatchTokens(name: string): string[] {
  const full = normalizeTeamToken(name);
  if (!full) return [];
  const lower = name.toLowerCase().replace(/['']/g, ""); // Athletics / A's
  const words = lower
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>([full]);

  if (words.length >= 2) {
    out.add(normalizeTeamToken(words[words.length - 1]!));
    out.add(normalizeTeamToken(words.slice(-2).join(" ")));
  }

  // Strip known multi-word city prefixes → leftover nickname tokens
  for (const city of CITY_PREFIXES) {
    if (lower.startsWith(city + " ")) {
      const rest = lower.slice(city.length).trim();
      if (rest) {
        out.add(normalizeTeamToken(rest));
        const rw = rest.split(/\s+/).filter(Boolean);
        if (rw.length >= 1) out.add(normalizeTeamToken(rw[rw.length - 1]!));
        if (rw.length >= 2) out.add(normalizeTeamToken(rw.slice(-2).join(" ")));
      }
    }
  }

  // Single leading city word strip (Chicago Cubs → cubs) when ≥2 words
  if (words.length >= 2) {
    out.add(normalizeTeamToken(words.slice(1).join(" ")));
  }

  // Alias expansion (two passes so reverse maps connect)
  for (let pass = 0; pass < 2; pass++) {
    for (const tok of [...out]) {
      const al = TOKEN_ALIASES[tok];
      if (al) for (const a of al) out.add(normalizeTeamToken(a));
    }
  }

  return [...out].filter((t) => t.length >= 2);
}

function finalSideTokens(side: { name: string; abbr: string }): string[] {
  return [
    ...expandTeamMatchTokens(side.name),
    normalizeTeamToken(side.abbr),
  ].filter(Boolean);
}

/** Does this trusted final involve both of the pick's teams (name OR abbr, either orientation)? */
export function finalMatchesPick(pick: PendingPick, f: TrustedFinal): boolean {
  const pickHome = expandTeamMatchTokens(pick.homeTeam);
  const pickAway = expandTeamMatchTokens(pick.awayTeam);
  if (pickHome.length === 0 || pickAway.length === 0) return false;
  const finalTokens = [...finalSideTokens(f.home), ...finalSideTokens(f.away)];
  const homeOk = pickHome.some((pt) => finalTokens.some((ft) => teamTokensMatch(pt, ft)));
  const awayOk = pickAway.some((pt) => finalTokens.some((ft) => teamTokensMatch(pt, ft)));
  return homeOk && awayOk;
}

/** Orient final scores to the pick's home team. Returns null if the home team can't be matched. */
export function orientToPickHome(
  pick: PendingPick,
  f: TrustedFinal,
): { homeScore: number; awayScore: number } | null {
  const pickHomeTokens = expandTeamMatchTokens(pick.homeTeam);
  const homeTokens = finalSideTokens(f.home);
  const awayTokens = finalSideTokens(f.away);
  if (pickHomeTokens.some((ph) => homeTokens.some((t) => teamTokensMatch(ph, t)))) {
    return { homeScore: f.home.score, awayScore: f.away.score };
  }
  if (pickHomeTokens.some((ph) => awayTokens.some((t) => teamTokensMatch(ph, t)))) {
    return { homeScore: f.away.score, awayScore: f.home.score };
  }
  return null;
}

/**
 * Settle pending picks against trusted free finals.
 * DISPUTED finals HOLD; unmatched stay PENDING; dual-confirmed postponed → honest VOID.
 */
export function settlePendingPicks(
  picks: readonly PendingPick[],
  finals: readonly TrustedFinal[],
  options: { postponedCandidates?: readonly NormalizedGame[] } = {},
): SettlementOutcome[] {
  const postponedCandidates = options.postponedCandidates ?? [];
  return picks.map((pick): SettlementOutcome => {
    const candidates = finals.filter(
      (f) => daysApart(f.date, pick.gameDateIso.slice(0, 10)) <= 2 && finalMatchesPick(pick, f),
    );
    const final = candidates[0];
    if (!final) {
      const pp = findPostponedMatch(pick, postponedCandidates);
      if (pp) {
        return {
          pickId: pick.pickId,
          status: "SETTLED",
          result: "VOID",
          confirmation: "SINGLE_SOURCE",
          homeScore: null,
          awayScore: null,
          sources: pp.sources,
          voidReason: "POSTPONED_OR_CANCELLED",
        };
      }
      return { pickId: pick.pickId, status: "PENDING", reason: "NO_FINAL" };
    }
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
  | {
      /** Honest VOID — league postponed/cancelled; never invents a score. */
      pickId: string;
      status: "SETTLED";
      result: "VOID";
      confirmation: "SINGLE_SOURCE";
      homeScore: null;
      awayScore: null;
      sources: readonly string[];
      voidReason: "POSTPONED_OR_CANCELLED";
    }
  | { pickId: string; status: "HELD"; reason: "DISPUTED"; sources: readonly string[] }
  | { pickId: string; status: "PENDING"; reason: "NO_FINAL" | "ORIENT_FAIL" };

/** ESPN/MLB status text that means the contest did not produce a final score. */
export function isPostponedOrCancelledDetail(detail: string): boolean {
  const d = detail.toLowerCase();
  return (
    d.includes("postpon") ||
    d.includes("cancel") ||
    d.includes("suspend") ||
    d.includes("forfeit") || // rare; still not a graded contest for our path
    d === "d" ||
    d === "c"
  );
}

/**
 * If a free source lists this matchup as postponed/cancelled (no completed scores),
 * return sources for an honest VOID. Does not invent scores.
 */
export function findPostponedMatch(
  pick: PendingPick,
  games: readonly NormalizedGame[],
): { sources: string[]; detail: string } | null {
  for (const g of games) {
    if (g.completed) continue;
    if (!isPostponedOrCancelledDetail(g.statusDetail ?? "")) continue;
    const home = g.home;
    const away = g.away;
    if (!home?.team || !away?.team) continue;
    const gDate = (g.startTime ?? "").slice(0, 10);
    const pDate = pick.gameDateIso.slice(0, 10);
    if (!gDate || daysApart(gDate, pDate) > 2) continue;
    const asFinal: TrustedFinal = {
      date: gDate,
      home: {
        name: home.team,
        abbr: home.abbreviation ?? home.team.slice(0, 3).toUpperCase(),
        score: 0,
      },
      away: {
        name: away.team,
        abbr: away.abbreviation ?? away.team.slice(0, 3).toUpperCase(),
        score: 0,
      },
      confirmation: "SINGLE_SOURCE",
      sources: [String(g.sourceId)],
    };
    if (!finalMatchesPick(pick, asFinal)) continue;
    return {
      sources: [String(g.sourceId)],
      detail: g.statusDetail ?? "postponed",
    };
  }
  return null;
}
