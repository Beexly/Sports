/**
 * Narrative + contract-incentive signal — WIRED BUT INERT.
 *
 * WHY THIS EXISTS. The founder wants milestones, records, revenge games,
 * elimination scenarios and CONTRACT INCENTIVES in the formula. The canonical
 * case he gave:
 *
 *   A receiver sits 105 yards short of a season-yardage bonus in his contract.
 *   His team is out of the playoff race and has nothing to protect. Coaches and
 *   team-mates know the number. The offence may feed him targets it would not
 *   otherwise feed him — which moves his prop, and can move the game total.
 *   Ja'Marr Chase closing on a receiving-yards escalator is the shape of it.
 *
 * That is a real, well-documented effect. It is ALSO the single easiest place
 * in this product to start inventing things, because a narrative is free to
 * write and impossible to falsify after the fact.
 *
 * SO THIS MODULE IS INERT UNTIL SOMEONE WIRES A REAL SOURCE. There is no
 * contract-incentive feed, no milestone feed, no revenge-game table, and no
 * birthday table in this repo. This file therefore ships the INPUT CONTRACT and
 * the evaluation logic, and nothing else. With no facts it returns null, and
 * `null` is never read as agreement, disagreement, or zero.
 *
 * IT WILL NEVER INVENT A NARRATIVE. It does not infer "revenge game" from a
 * coach's former employer, it does not infer "must-win" from a record, it does
 * not infer a milestone from a stat line, and it does not infer a birthday from
 * a date. Every narrative it acts on arrives as a `NarrativeFact` that someone
 * else asserted, with a citation and a verification timestamp attached. A
 * narrative with no citation is a story, not evidence.
 *
 * WHAT A FOUNDER MUST SUPPLY TO TURN IT ON. One loader,
 * `loadFacts(gameId) => NarrativeFact[]`, backed by a real source:
 *
 *   1. CONTRACT INCENTIVES — the hard one. Escalator and bonus language is not
 *      in any public feed. Realistic routes: OverTheCap / Spotrac incentive
 *      tables (check `source-rights-registry.ts` FIRST — scraping here is
 *      rights-gated, not banned), or beat-reported incentive details. Each fact
 *      needs the URL it came from in `source`.
 *   2. MILESTONES / RECORD CHASES — derivable from official season stats plus a
 *      stated threshold, but the THRESHOLD must be cited, not assumed.
 *   3. REVENGE / ELIMINATION / STREAK — transaction history and standings are
 *      facts; whether they constitute a narrative is a judgement, so the judgement
 *      must be attributed in `source` too.
 *
 * Until one of those lands, every call returns null and the gate behaves exactly
 * as if this signal did not exist. That is the intended state.
 */

import type { GateCandidate, SignalFn, SignalRead } from "../gate-contract";

/** The kinds of narrative a real feed would have to classify. */
export type NarrativeKind =
  | "contract-incentive"
  | "milestone"
  | "record-chase"
  | "revenge"
  | "elimination"
  | "streak";

/** How hard the fact is expected to bite. Supplied by the source, never guessed. */
export type NarrativeMagnitude = "high" | "medium" | "low";

/**
 * One asserted narrative about one game.
 *
 * `direction` is the effect on `team` — the team the fact is ABOUT. The signal
 * flips it when `team` is the opponent of the side the engine backed.
 *
 * `source` and `verifiedAt` are load-bearing, not metadata. A fact that cannot
 * name where it came from, or cannot say when someone last checked it, is
 * dropped before it is ever read.
 */
export type NarrativeFact = {
  readonly kind: NarrativeKind;
  /** Team the narrative is about, as a full name we can match to the fixture. */
  readonly team: string;
  /** Player it concerns, when it concerns one (a contract incentive always does). */
  readonly player?: string;
  /** Plain-language statement of the fact, quotable in a held-row explanation. */
  readonly description: string;
  /** Effect on `team`. */
  readonly direction: "helps" | "hurts";
  readonly magnitude: NarrativeMagnitude;
  /** Where this came from. A URL or a named, checkable citation. Required. */
  readonly source: string;
  /** When a human or job last verified it. Required; staleness is disqualifying. */
  readonly verifiedAt: Date;
};

/**
 * How old a verification may be before the fact is ignored.
 *
 * 14 days. Contract incentives and season milestones are slow-moving, but the
 * distance to a threshold is NOT: a receiver 105 yards short on Monday can be
 * 20 yards short the following Monday, and acting on the stale figure is acting
 * on a fact that is no longer true. Two weeks is long enough to survive a normal
 * weekly refresh cadence and short enough that a dead feed goes silent instead
 * of going wrong.
 */
export const NARRATIVE_FRESHNESS_MS = 14 * 24 * 60 * 60 * 1000;

export type NarrativeIncentiveDeps = {
  /**
   * Real narrative facts for one game. Injected: no network, no database, no
   * inference. With no source wired this returns `[]` and the signal is silent.
   */
  readonly loadFacts: (gameId: string) => Promise<readonly NarrativeFact[]>;
  /** Clock, injected so freshness is deterministic and testable. */
  readonly now: () => Date;
};

function normalizeTeam(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lastToken(normalized: string): string {
  const parts = normalized.split(" ");
  const last = parts.length > 0 ? parts[parts.length - 1] : undefined;
  return last ?? "";
}

function teamMatches(a: string, b: string): boolean {
  const x = normalizeTeam(a);
  const y = normalizeTeam(b);
  if (x.length === 0 || y.length === 0) return false;
  if (x === y) return true;
  if (x.includes(y) || y.includes(x)) return true;
  const xLast = lastToken(x);
  const yLast = lastToken(y);
  return xLast.length >= 4 && xLast === yLast;
}

function ourTeamOf(candidate: GateCandidate): string | null {
  if (candidate.side === "home") return candidate.homeTeamName;
  if (candidate.side === "away") return candidate.awayTeamName;
  // A total has no team to back; a team narrative cannot be read for or against
  // "over". Null rather than a guess.
  return null;
}

/** A fact is usable only if it is cited, freshly verified, and about this game. */
function isUsable(
  fact: NarrativeFact,
  now: Date,
  ourTeam: string,
  opponent: string,
): boolean {
  if (typeof fact.source !== "string" || fact.source.trim().length === 0) return false;
  const verifiedAt = fact.verifiedAt instanceof Date ? fact.verifiedAt.getTime() : Number.NaN;
  if (!Number.isFinite(verifiedAt)) return false;
  const age = now.getTime() - verifiedAt;
  // Future-dated verification is not fresh, it is broken. Drop it.
  if (age < 0) return false;
  if (age > NARRATIVE_FRESHNESS_MS) return false;
  return teamMatches(fact.team, ourTeam) || teamMatches(fact.team, opponent);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Build the signal. Inert by design: with no facts loaded it returns null on
 * every candidate, which is exactly what shipping an unwired signal should do.
 */
export function createNarrativeIncentiveSignal(deps: NarrativeIncentiveDeps): SignalFn {
  return async (candidate: GateCandidate): Promise<SignalRead | null> => {
    const ourTeam = ourTeamOf(candidate);
    if (ourTeam === null) return null;

    const opponent =
      ourTeam === candidate.homeTeamName ? candidate.awayTeamName : candidate.homeTeamName;

    const facts = await deps.loadFacts(candidate.gameId);
    if (facts.length === 0) return null;

    const now = deps.now();
    const usable = facts.filter((f) => isUsable(f, now, ourTeam, opponent));
    // Everything was uncited, stale, or about another game: nothing real to say.
    if (usable.length === 0) return null;

    const completeness = round2(usable.length / facts.length);
    const basis = `narrative facts, cited and verified within ${Math.round(NARRATIVE_FRESHNESS_MS / 86_400_000)} days (source + verifiedAt required per fact)`;

    // Flip the fact's direction when it is about the opponent.
    const favoursUs = (f: NarrativeFact): boolean => {
      const aboutUs = teamMatches(f.team, ourTeam);
      return f.direction === "helps" ? aboutUs : !aboutUs;
    };

    // NEUTRAL is reserved for low magnitude: a low-magnitude narrative is a
    // colour note, not a reason to hold or to publish.
    const deciding = usable.filter((f) => f.magnitude !== "low");

    if (deciding.length === 0) {
      return {
        key: "narrative-incentive",
        verdict: "NEUTRAL",
        reason: `The only verified storylines here are minor ones, so they do not move ${ourTeam} either way.`,
        basis,
        completeness,
      };
    }

    const against = deciding.filter((f) => !favoursUs(f));
    const forUs = deciding.filter((f) => favoursUs(f));

    const lead = against.length > 0 ? against[0] : forUs[0];
    if (lead === undefined) return null;

    const who = lead.player ?? lead.team;

    if (against.length > 0) {
      return {
        key: "narrative-incentive",
        verdict: "CONTRADICTS",
        reason: `${who}: ${lead.description} (${lead.source}). That cuts against ${ourTeam}, so we are holding this one.`,
        basis,
        completeness,
      };
    }

    return {
      key: "narrative-incentive",
      verdict: "CONFIRMS",
      reason: `${who}: ${lead.description} (${lead.source}). That lands on the side of ${ourTeam}.`,
      basis,
      completeness,
    };
  };
}
