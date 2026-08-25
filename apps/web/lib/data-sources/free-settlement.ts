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

/**
 * How far a trusted final's calendar date may sit from the pick's game date and still
 * be considered the same contest. Covers source date-convention skew (UTC vs local
 * rollover) and a next-day resume — not a wider search.
 */
export const SETTLEMENT_DATE_TOLERANCE_DAYS = 2;

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
 * Exact normalized-token equality.
 *
 * Substring containment (`a.includes(b) || b.includes(a)`) is deliberately NOT used.
 * `normalizeTeamToken` strips every separator, so a containment test has no word
 * boundary left to respect and silently binds unrelated franchises:
 *
 *   "sox"        ⊂ "chicagowhitesox"  → a Red Sox pick matches a White Sox final
 *   "as"         ⊂ "houstonastros"    → an Athletics pick matches an Astros final
 *   "as"         ⊂ "texasrangers"     → an Athletics pick matches a Rangers final
 *   "chicago"    ⊂ "chicagocubs"      → a White Sox pick matches a Cubs final
 *   "lac" (abbr) ⊂ "lachargers"       → a Chargers pick matches a Clippers final
 *   "michigan"   ⊂ "michiganstate"    → the classic college collision
 *
 * `settlePendingPicks` accepts any final within ±2 calendar days, so the neighbouring
 * game usually IS on the board — those are wrong SETTLEMENTS, not just wrong matches,
 * and a wrong settlement publishes another team's scoreline into the track record.
 *
 * Both sides of the comparison are already expanded into full-string / nickname /
 * abbreviation / alias variants by `expandTeamMatchTokens` + `finalSideTokens`, so
 * equality is exactly what that expansion was built to support (it is the abbr field,
 * not containment, that binds "LAD" to "Los Angeles Dodgers"). An identifier we cannot
 * match exactly must fail CLOSED — the pick stays PENDING and RCA reports it.
 */
export function teamTokensMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a === b;
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
 * Minimum length for a FRAGMENT token (one this module infers by splitting a display
 * name), as opposed to the verbatim string a source actually published or a curated
 * alias. Three-letter fragments are not identities: "Sox" is shared by Boston and
 * Chicago, and under exact matching both sides emit it, so the fragment alone would
 * bind a Red Sox pick to a White Sox final. Every team that loses a fragment here
 * still carries its full string, its two-word nickname, its abbreviation and its
 * alias entries, so nothing legitimate stops matching.
 */
const MIN_FRAGMENT_TOKEN_LENGTH = 4;

/**
 * League / school qualifiers that several clubs share and none is identified by.
 * Dropped from FRAGMENT emission only — a source that publishes one of these as a
 * team's whole name still keeps it as a verbatim token.
 *
 *  - "state"  — "Michigan State", "Ohio State", "Penn State" all emit it (ncaaf/ncaab)
 *  - "united" — an MLS club suffix, not a club
 *  - "city"   — a place qualifier ("Sporting Kansas City", "… City FC/SC")
 *  - "team"   — "Washington Football Team"
 *
 * Shorter shared suffixes ("fc", "sc", "cf") and the two-letter state codes ESPN uses
 * to disambiguate colleges ("Miami (FL)" / "Miami (OH)") are already excluded by
 * MIN_FRAGMENT_TOKEN_LENGTH.
 */
const NON_IDENTIFYING_FRAGMENTS: ReadonlySet<string> = new Set([
  "state",
  "united",
  "city",
  "team",
]);

/**
 * Expand a team display string into match tokens:
 * full normalized string, last-word / last-two-words nicknames, city-stripped
 * nickname, and a small alias table for known short forms (A's, D-backs, …).
 *
 * Two classes of token, deliberately treated differently:
 *   VERBATIM — the full normalized input, and every curated TOKEN_ALIASES entry.
 *              These are things a source actually said or that we have explicitly
 *              mapped, so they are kept whatever their length ("SF", "as", "oak").
 *   FRAGMENT — anything this function infers by splitting words off the input.
 *              An inference is only admitted when it is long enough and specific
 *              enough to identify one franchise (see the two constants above).
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

  const addFragment = (raw: string): void => {
    const token = normalizeTeamToken(raw);
    if (token.length < MIN_FRAGMENT_TOKEN_LENGTH) return;
    if (NON_IDENTIFYING_FRAGMENTS.has(token)) return;
    out.add(token);
  };

  if (words.length >= 2) {
    addFragment(words[words.length - 1]!);
    addFragment(words.slice(-2).join(" "));
  }

  // Strip known multi-word city prefixes → leftover nickname tokens
  for (const city of CITY_PREFIXES) {
    if (lower.startsWith(city + " ")) {
      const rest = lower.slice(city.length).trim();
      if (rest) {
        addFragment(rest);
        const rw = rest.split(/\s+/).filter(Boolean);
        if (rw.length >= 1) addFragment(rw[rw.length - 1]!);
        if (rw.length >= 2) addFragment(rw.slice(-2).join(" "));
      }
    }
  }

  // Single leading city word strip (Chicago Cubs → cubs) when ≥2 words
  if (words.length >= 2) {
    addFragment(words.slice(1).join(" "));
  }

  // Alias expansion (two passes so reverse maps connect). Alias values are curated
  // identifiers, so they are admitted verbatim — that is how "as"/"oak"/"bos" survive.
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

/** How the final's stored sides line up with the pick's. */
export type MatchOrientation = "SAME" | "FLIPPED";

function sidesShareAToken(a: readonly string[], b: readonly string[]): boolean {
  return a.some((t) => b.some((u) => teamTokensMatch(t, u)));
}

/**
 * Resolve the pick↔final orientation, or null when it cannot be resolved UNIQUELY.
 *
 * Both sides must line up side-by-side: either the pick's home matches the final's
 * home AND the pick's away matches the final's away, or both match crosswise. This
 * replaces the previous "does each pick team appear ANYWHERE in the final" test,
 * which pooled the final's two sides into one token bag — so a pick whose BOTH teams
 * matched a SINGLE side of some other game satisfied it. Worked example, all real
 * MLB strings: a "Chicago White Sox vs Chicago Cubs" pick against a "Milwaukee
 * Brewers vs Chicago Cubs" final matched, because the White Sox alias "chicago"
 * reached "chicagocubs" and "cubs" reached the same side — the pick then settled
 * against the Brewers' scoreline.
 *
 * Refusing when BOTH orientations hold matters just as much: that means a pick team
 * matched both sides of the final, so there is no evidence for which way round to
 * grade. `orientToPickHome` previously tested home-first and RETURNED on the first
 * hit, latching onto an orientation it had not established — the same first-candidate
 * latch that produced cross-series binding in the market bridge. Ambiguity now fails
 * CLOSED: the pick stays PENDING and RCA surfaces it, rather than being graded with a
 * coin-flip orientation.
 */
export function resolveMatchOrientation(
  pick: PendingPick,
  f: TrustedFinal,
): MatchOrientation | null {
  const pickHome = expandTeamMatchTokens(pick.homeTeam);
  const pickAway = expandTeamMatchTokens(pick.awayTeam);
  if (pickHome.length === 0 || pickAway.length === 0) return null;
  const finalHome = finalSideTokens(f.home);
  const finalAway = finalSideTokens(f.away);

  const same = sidesShareAToken(pickHome, finalHome) && sidesShareAToken(pickAway, finalAway);
  const flipped = sidesShareAToken(pickHome, finalAway) && sidesShareAToken(pickAway, finalHome);
  // Neither orientation holds → not this game. Both hold → ambiguous. Refuse either way.
  if (same === flipped) return null;
  return same ? "SAME" : "FLIPPED";
}

/** Does this trusted final involve both of the pick's teams, on opposite sides? */
export function finalMatchesPick(pick: PendingPick, f: TrustedFinal): boolean {
  return resolveMatchOrientation(pick, f) !== null;
}

/** Orient final scores to the pick's home team. Returns null if the orientation is not unique. */
export function orientToPickHome(
  pick: PendingPick,
  f: TrustedFinal,
): { homeScore: number; awayScore: number } | null {
  const orientation = resolveMatchOrientation(pick, f);
  if (orientation === null) return null;
  return orientation === "SAME"
    ? { homeScore: f.home.score, awayScore: f.away.score }
    : { homeScore: f.away.score, awayScore: f.home.score };
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
    const pickDate = pick.gameDateIso.slice(0, 10);
    const withinTolerance = finals.filter(
      (f) => daysApart(f.date, pickDate) <= SETTLEMENT_DATE_TOLERANCE_DAYS && finalMatchesPick(pick, f),
    );

    // Use the date the pick already carries. The ±2-day tolerance exists for source
    // date-convention skew, not to widen the join: in every daily-schedule league a
    // series is 3-4 games between the SAME two teams on CONSECUTIVE days, so all of
    // them fall inside the tolerance and satisfy the team match. Judged on teams
    // alone, an ordinary Friday pick has Saturday's and Sunday's finals as equal
    // candidates — either grading it off the wrong night's score, or (once the
    // same-day-rematch guard below sees the disagreement) holding every game of
    // every series as AMBIGUOUS_MATCH so it never settles at all.
    //
    // So when the board has a final on the pick's OWN calendar date, only those are
    // eligible. This is strictly a narrowing — it can never admit a final the ±2-day
    // filter had already rejected — and it deliberately does not reach past an
    // on-date ambiguity: a true doubleheader leaves two same-date candidates, which
    // stay ambiguous and stay HELD.
    const sameDay = withinTolerance.filter((f) => daysApart(f.date, pickDate) === 0);
    const candidates = sameDay.length > 0 ? sameDay : withinTolerance;

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
