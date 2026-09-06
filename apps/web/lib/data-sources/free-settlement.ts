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
import { foldDiacritics, normalizeTeamToken } from "./score-verification";

export type Confirmation = "CONFIRMED" | "SINGLE_SOURCE" | "DISPUTED";

export type TrustedFinal = {
  readonly date: string;
  /** ISO start time when the primary source carries one (see ComparableGame). */
  readonly startIso?: string;
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
    ...(g.startIso ? { startIso: g.startIso } : {}),
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

/**
 * Shortest token that may match by substring containment. Anything shorter is an
 * abbreviation ("LA", "SEA", "FLA", "DC") and must match exactly. Replayed on the
 * 2026-08-29 MLS board, "LA" (LA Galaxy) was contained in atLAnta, orLAndo,
 * philadeLphiA and portLAnd, and on the 2025-09-06 CFB board "FLA" (Florida) sat
 * inside Saint Francis Red FLAsh, so one final satisfied many picks and a pick was
 * graded off a different game once its true final was missing from the board.
 */
export const MIN_CONTAINMENT_TOKEN_LENGTH = 4;

/** Token equality, or containment when the shorter token is a real name fragment (>= 4 chars). */
export function teamTokensMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = shorter === a ? b : a;
  if (shorter.length < MIN_CONTAINMENT_TOKEN_LENGTH) return false;
  return longer.includes(shorter);
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
 * Tokens that name a KIND of club, not a club. Emitted as standalone tokens they
 * let "Charlotte FC @ Toronto FC" match every FC / SC / United final on a board
 * (8 of 13 MLS games on 2026-08-29 were held AMBIGUOUS_MATCH). The full normalized
 * name ("torontofc") still carries the suffix; only the bare fragment is dropped.
 */
export const GENERIC_TEAM_TOKENS: ReadonlySet<string> = new Set(
  [
    "fc", "sc", "cf", "afc", "cfc", "united", "city", "club", "real", "sporting",
    "state", "st", "university", "univ", "college", "the", "of", "and", "team",
  ].map((t) => normalizeTeamToken(t)),
);

/**
 * Expand a team display string into match tokens:
 * full normalized string, last-word / last-two-words nicknames, city-stripped
 * nickname, and a small alias table for known short forms (A's, D-backs, …).
 * Generic club-kind fragments (GENERIC_TEAM_TOKENS) are never emitted alone.
 */
export function expandTeamMatchTokens(name: string): string[] {
  const full = normalizeTeamToken(name);
  if (!full) return [];
  const lower = foldDiacritics(name).toLowerCase().replace(/['']/g, ""); // Athletics / A's
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

  return [...out].filter((t) => t.length >= 2 && !GENERIC_TEAM_TOKENS.has(t));
}

function finalSideTokens(side: { name: string; abbr: string }): string[] {
  return [
    ...expandTeamMatchTokens(side.name),
    normalizeTeamToken(side.abbr),
  ].filter(Boolean);
}

function sideMatches(pickTokens: readonly string[], finalTokens: readonly string[]): boolean {
  return pickTokens.some((pt) => finalTokens.some((ft) => teamTokensMatch(pt, ft)));
}

/**
 * Does this trusted final involve both of the pick's teams, one on each side?
 * Bipartite by construction: pick.home must match ONE side of the final and
 * pick.away the OTHER (either orientation). The earlier check tested each pick
 * side against the union of both final sides, so a single shared token (a bare
 * "fc", a two-letter abbreviation) satisfied both sides at once.
 */
export function finalMatchesPick(pick: PendingPick, f: TrustedFinal): boolean {
  const pickHome = expandTeamMatchTokens(pick.homeTeam);
  const pickAway = expandTeamMatchTokens(pick.awayTeam);
  if (pickHome.length === 0 || pickAway.length === 0) return false;
  const finalHome = finalSideTokens(f.home);
  const finalAway = finalSideTokens(f.away);
  return (
    (sideMatches(pickHome, finalHome) && sideMatches(pickAway, finalAway)) ||
    (sideMatches(pickHome, finalAway) && sideMatches(pickAway, finalHome))
  );
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
 * A multi-day series (Fri/Sat/Sun, same two teams) puts up to three completed
 * finals inside the ±2-day date tolerance. Before this, all of them became
 * candidates, their scores disagreed, and the doubleheader guard held every
 * series game forever (AMBIGUOUS_MATCH). Prefer the final whose start time is
 * nearest the pick's kickoff when the source carries start times: the Saturday
 * pick matches the Saturday final. A same-day doubleheader still yields two
 * finals at nearly the same distance, so the guard below keeps its hold.
 *
 * Calendar dates alone are not enough: a 20:10 ET game is the next UTC day,
 * so "nearest date" would choose the wrong game of the series.
 */
export const NEAREST_CANDIDATE_TIE_MS = 4 * 60 * 60 * 1000;

/**
 * How far a trusted final's start time may sit from a game's kickoff and still
 * be accepted as that game's result. Generous enough for a rain delay or a
 * schedule correction, far below the 24h spacing of consecutive games in a
 * series, which is the confusion this bounds.
 */
export const MAX_KICKOFF_DRIFT_MS = 12 * 60 * 60 * 1000;

/**
 * Is `final` close enough in time to be THIS game's result?
 *
 * nearestCandidates cannot reject a LONE stale candidate: with one element there
 * is nothing to be nearer than, so it returns it unchanged. That is how a game
 * which has started but whose own result is not published yet inherits the
 * PREVIOUS meeting's final, inside the same +/-2-day tolerance, on nothing but a
 * team-name match. Measured on production 2026-09-06: 87 published picks were
 * graded WIN/LOSS before their game's commenceTime.
 *
 * With a start time on the final, bind by the clock. Without one, the only
 * defensible tolerance is the timezone edge the window exists for, which is ONE
 * day, not two: a source may carry the fixture's local date while the kickoff is
 * held in UTC, so a Saturday evening game is already Sunday.
 */
export function finalBindsToKickoff(kickoffIso: string, final: TrustedFinal): boolean {
  // A date-only kickoff ("2026-09-05") parses as midnight UTC, so clock math
  // against it would reject a legitimate 7pm final as 19 hours adrift. Same
  // reason nearestCandidates refuses to rank on a date-only timestamp: without
  // a real kickoff there is no clock to bind to, only the day.
  if (kickoffIso.includes("T") && final.startIso) {
    const kickoff = Date.parse(kickoffIso);
    const start = Date.parse(final.startIso);
    // An unparseable timestamp is not evidence of a match. Returning true here
    // let a malformed startIso through the +/-2-day candidate filter and settle
    // a pick off a stale score (CodeRabbit, #717). Fall back to the same
    // one-day calendar rule used when there is no start time at all.
    if (!Number.isFinite(kickoff) || !Number.isFinite(start)) {
      return daysApart(final.date, kickoffIso.slice(0, 10)) <= 1;
    }
    return Math.abs(start - kickoff) <= MAX_KICKOFF_DRIFT_MS;
  }
  return daysApart(final.date, kickoffIso.slice(0, 10)) <= 1;
}

export function nearestCandidates(pick: PendingPick, matching: readonly TrustedFinal[]): TrustedFinal[] {
  return nearestByKickoff(pick.gameDateIso, matching);
}

/**
 * The kickoff-nearest narrowing above, addressed by an ISO kickoff instead of a
 * PendingPick, so the game-score persister can reuse the identical rule (and the
 * identical tie window) rather than re-deriving one. `free-score-persist.ts` was
 * matching a series on team names inside the same ±2-day tolerance with no
 * kickoff binding at all, which is how an earlier meeting's final was written
 * onto a later game of the same series.
 *
 * Returns every candidate unchanged when the caller has no real kickoff time or
 * any candidate lacks `startIso` — "nearest" is meaningless then, and the
 * caller's own ambiguity guard decides what to do with the several it gets back.
 */
export function nearestByKickoff(
  kickoffIso: string,
  matching: readonly TrustedFinal[],
): TrustedFinal[] {
  if (matching.length <= 1) return [...matching];
  // A date-only kickoff ("2026-09-05") parses as midnight, which would make
  // "nearest" pick the earlier game of a same-day doubleheader. Without a real
  // kickoff time every candidate stays and the doubleheader guard holds.
  if (!kickoffIso.includes("T")) return [...matching];
  const kickoff = Date.parse(kickoffIso);
  if (Number.isNaN(kickoff) || matching.some((f) => !f.startIso || Number.isNaN(Date.parse(f.startIso)))) {
    return [...matching];
  }
  const withDelta = matching.map((f) => ({ f, delta: Math.abs(Date.parse(f.startIso as string) - kickoff) }));
  const best = Math.min(...withDelta.map((c) => c.delta));
  // Everything within the tie window of the best is still a candidate, so two
  // games of a doubleheader (a few hours apart) both remain and get held.
  return withDelta.filter((c) => c.delta - best <= NEAREST_CANDIDATE_TIE_MS).map((c) => c.f);
}

/** Normalized city prefixes that name more than one team in at least one league. */
const SHARED_CITY_TOKENS: ReadonlySet<string> = new Set(
  ["los angeles", "new york", "chicago", "san francisco", "bay area", "washington", "dallas", "houston", "philadelphia", "miami", "tampa bay", "kansas city", "st louis", "saint louis", "san jose", "oakland", "anaheim"].map((c) =>
    normalizeTeamToken(c),
  ),
);

/**
 * True when a pick side is ONLY a city that names two or more distinct teams
 * across the fetched scoreboards (finals plus scheduled/postponed rows). Such a
 * pick cannot be matched honestly; the caller holds it. A city with a single
 * team on the boards is unambiguous for that slate and grades normally.
 */
export function cityOnlyAmbiguity(
  pick: PendingPick,
  finals: readonly TrustedFinal[],
  scoreboard: readonly NormalizedGame[] = [],
): boolean {
  const sides = [pick.homeTeam, pick.awayTeam].map((s) => normalizeTeamToken(s)).filter(Boolean);
  const cityOnly = sides.filter((s) => SHARED_CITY_TOKENS.has(s));
  if (cityOnly.length === 0) return false;
  const teamNames = new Set<string>();
  for (const f of finals) {
    teamNames.add(normalizeTeamToken(f.home.name));
    teamNames.add(normalizeTeamToken(f.away.name));
  }
  for (const g of scoreboard) {
    if (g.home) teamNames.add(normalizeTeamToken(g.home.team));
    if (g.away) teamNames.add(normalizeTeamToken(g.away.team));
  }
  return cityOnly.some((city) => {
    const teamsWithCity = [...teamNames].filter((t) => t !== city && t.startsWith(city));
    return teamsWithCity.length >= 2;
  });
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
    // City-only pick names ("Los Angeles", "New York", "Chicago") come from a
    // feed that dropped the nickname. When more than one team with that city
    // appears anywhere on the fetched scoreboards, the name cannot identify the
    // game; hold rather than grade against whichever team happened to play.
    // Only rows inside the pick's own date window count: another date's
    // same-city team elsewhere in the batch must not hold a pick the date can
    // identify. Rows without a start time are kept (fail closed).
    const pickDate = pick.gameDateIso.slice(0, 10);
    const ambiguousCity = cityOnlyAmbiguity(
      pick,
      finals.filter((f) => daysApart(f.date, pickDate) <= 2),
      postponedCandidates.filter((g) => !g.startTime || daysApart(g.startTime.slice(0, 10), pickDate) <= 2),
    );
    if (ambiguousCity) {
      return { pickId: pick.pickId, status: "HELD", reason: "AMBIGUOUS_MATCH", sources: [] };
    }

    const matching = finals.filter(
      (f) => daysApart(f.date, pick.gameDateIso.slice(0, 10)) <= 2 && finalMatchesPick(pick, f),
    );
    // Bind every candidate to this pick's kickoff BEFORE narrowing. The
    // multi-candidate hold below cannot help when only one final is in the
    // window, and nearestCandidates returns a lone candidate unchanged, so a
    // pick on a game that has started but has no published result yet was
    // graded off the PREVIOUS meeting of the same series on nothing but a
    // team-name match. That is what graded 87 published picks WIN/LOSS before
    // their game's commenceTime (measured on production 2026-09-06).
    const bound = matching.filter((f) => finalBindsToKickoff(pick.gameDateIso, f));
    const candidates = nearestCandidates(pick, bound);

    // Same-day rematch guard (e.g. an MLB doubleheader): two DIFFERENT completed
    // games between the same two teams can both fall inside the date-tolerance
    // window and both satisfy finalMatchesPick, producing more than one candidate.
    // If every candidate's oriented score agrees, they're redundant records of the
    // SAME game (no behavior change). If they disagree, we cannot tell which final
    // belongs to this pick — HOLD for audit rather than silently grading against
    // whichever candidate happened to sort first.
    if (candidates.length > 1) {
      const orientedCandidates = candidates
        .map((f) => ({ final: f, oriented: orientToPickHome(pick, f) }))
        .filter(
          (c): c is { final: TrustedFinal; oriented: { homeScore: number; awayScore: number } } =>
            c.oriented !== null,
        );
      if (orientedCandidates.length > 0) {
        const first = orientedCandidates[0]!.oriented;
        const allAgree = orientedCandidates.every(
          (c) => c.oriented.homeScore === first.homeScore && c.oriented.awayScore === first.awayScore,
        );
        if (!allAgree) {
          return {
            pickId: pick.pickId,
            status: "HELD",
            reason: "AMBIGUOUS_MATCH",
            sources: candidates.flatMap((c) => c.sources),
          };
        }
      }
    }

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
  | { pickId: string; status: "HELD"; reason: "DISPUTED" | "AMBIGUOUS_MATCH"; sources: readonly string[] }
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
