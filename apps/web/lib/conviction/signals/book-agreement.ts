/**
 * book-agreement — the one conviction signal that has real data TODAY.
 *
 * Every book-priced pick already carries how many sportsbooks priced the game
 * (`bookmakerCount`, and the game row's `bookmakerCoverageMax`) and what share
 * of them sit on the side the engine took (`consensusPct`, stored 0-1). That is
 * independent evidence: it is not the engine's own factor model talking, it is
 * a count of other people who priced the same game for money.
 *
 * WHAT IT MAY DO. Exactly what gate-contract.ts allows: CONFIRMS, CONTRADICTS,
 * NEUTRAL, or null. It never scores, never re-ranks, never edits a selection.
 * A CONTRADICTS holds the pick; nothing here can promote one.
 *
 * WHAT COUNTS AS ABSENT. A thin market is NOT disagreement. Two books pricing a
 * game tells us nothing about consensus — one of them moving flips the number by
 * fifty points. Below MIN_BOOKMAKER_COVERAGE this signal is silent, and a
 * model-signal row with `bookmakerCount` 0 is silent for the same reason. A null
 * `consensusPct` or a null side is silent too. Silence is the honest answer when
 * the data is not there, and the gate reads silence as neither agreement nor
 * disagreement.
 *
 * NOTHING IS IMPUTED. There is no default consensus, no assumed book count, no
 * "call it 50% if we cannot see it". If the loader returns null, so does this.
 */

import {
  MIN_BOOKMAKER_COVERAGE,
  MIN_DATA_QUALITY_SCORE,
} from "@/lib/board/pass-reason";
import type { GateCandidate, SignalRead } from "../gate-contract";

/** What the loader must produce for one game + pick type. Null when unpriced. */
export type BookCoverage = {
  /** How many sportsbooks priced this market. 0 on a model-signal row. */
  readonly bookmakerCount: number;
  /** Share of those books sitting on OUR side, 0-1. Null when unresolvable. */
  readonly consensusPct: number | null;
  /**
   * Spread of the books' implied probability for our side, 0-1 (i.e. how far
   * apart the books' own prices are, not how many of them agree). Null when the
   * spread was not computed. Used only to withdraw a confirmation, never to add
   * one.
   */
  readonly dispersion: number | null;
  /** The game row's evidence-health score, 0-100. Null when not scored. */
  readonly dataQualityScore: number | null;
};

export type BookAgreementDeps = {
  readonly loadCoverage: (
    gameId: string,
    pickType: GateCandidate["pickType"],
  ) => Promise<BookCoverage | null>;
};

/**
 * Full US book coverage, used ONLY as the completeness denominator.
 *
 * The major-US-book set a cleared odds feed returns for a mainstream market
 * tops out around eleven distinct books. Eleven is therefore "we saw everything
 * there was to see"; six books out of eleven is a real read on 55% of the
 * available evidence and is recorded as such. This number never gates anything
 * — it only makes a partial read legible as partial.
 */
export const FULL_COVERAGE_BOOKS = 11;

/**
 * Coverage at which an agreement percentage is worth reading at all.
 *
 * MIN_BOOKMAKER_COVERAGE (3) is the floor for forming an honest two-sided price,
 * but it is far too thin to read CONSENSUS off: at three books one book moving
 * swings the share by 33 points, so a "67% agree" reading is two books and a
 * coin. At six, one book is worth 17 points and a 70% reading survives any
 * single book being wrong. Six is the point where the number describes the
 * market rather than the sample.
 */
export const DEEP_COVERAGE_BOOKS = 6;

/**
 * Share of books on our side that counts as real corroboration.
 *
 * At 0.70 with at least six books, at least four of six (or eight of eleven)
 * priced it our way, and the reading survives one book being removed. Below it
 * we are describing a lean, and a lean is not evidence — it is NEUTRAL.
 */
export const STRONG_AGREEMENT_PCT = 0.7;

/**
 * Share of books on our side at or below which the market is against us.
 *
 * The mirror of STRONG_AGREEMENT_PCT: 0.30 on our side means 70% of a deep book
 * set priced the other way. That is the same magnitude of evidence pointing the
 * opposite direction, so it is treated with the same weight — and because the
 * gate can only withhold, treating it as CONTRADICTS costs us a pick, never
 * gives us one.
 */
export const CLEAR_DISAGREEMENT_PCT = 0.3;

/**
 * Price spread above which a head-count majority is not real agreement.
 *
 * Books can all land on the same side while pricing it eight points of implied
 * probability apart, which is a market that has not settled rather than a market
 * that agrees. 0.08 is roughly the gap between a -110 and a -130 price on the
 * same side: wider than normal juice variation, so wider than noise. Above it a
 * would-be CONFIRMS is withdrawn to NEUTRAL. It can only ever remove a
 * confirmation.
 */
export const MAX_CONFIRMING_DISPERSION = 0.08;

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
  "twenty",
] as const;

function spell(n: number): string {
  const word = NUMBER_WORDS[n];
  return word ?? String(n);
}

/**
 * Build the signal. The loader is injected so this module never reaches for a
 * database itself and the test suite exercises the real decision logic.
 */
export function createBookAgreementSignal(deps: BookAgreementDeps) {
  return async function bookAgreementSignal(
    candidate: GateCandidate,
  ): Promise<SignalRead | null> {
    // No side means we do not know what "agreement" would even be agreement
    // with. Guessing from selection text is exactly the fabrication the
    // contract forbids.
    if (candidate.side === null) return null;

    const coverage = await deps.loadCoverage(candidate.gameId, candidate.pickType);
    if (coverage === null) return null;

    const { bookmakerCount, consensusPct, dispersion, dataQualityScore } = coverage;

    // A thin market is absent data, not disagreement.
    if (!Number.isFinite(bookmakerCount) || bookmakerCount < MIN_BOOKMAKER_COVERAGE) {
      return null;
    }
    if (consensusPct === null || !Number.isFinite(consensusPct)) return null;

    // Poor evidence health means the count itself is not trustworthy. Silent,
    // not contradicting: we are declining to read the data, not reading it as
    // being against us.
    if (dataQualityScore !== null && dataQualityScore < MIN_DATA_QUALITY_SCORE) {
      return null;
    }

    const agreeing = Math.round(consensusPct * bookmakerCount);
    const opposing = bookmakerCount - agreeing;
    const completeness = Math.min(1, bookmakerCount / FULL_COVERAGE_BOOKS);
    const basis = "sportsbook coverage on the game's odds rows (bookmakerCount, consensusPct)";
    const deep = bookmakerCount >= DEEP_COVERAGE_BOOKS;
    const pricesDisagree =
      dispersion !== null &&
      Number.isFinite(dispersion) &&
      dispersion > MAX_CONFIRMING_DISPERSION;

    if (deep && consensusPct >= STRONG_AGREEMENT_PCT && !pricesDisagree) {
      return {
        key: "book-agreement",
        verdict: "CONFIRMS",
        reason: `${capitalise(spell(agreeing))} of ${spell(bookmakerCount)} books price this the way we do.`,
        basis,
        completeness,
      };
    }

    if (deep && consensusPct <= CLEAR_DISAGREEMENT_PCT) {
      return {
        key: "book-agreement",
        verdict: "CONTRADICTS",
        reason: `${capitalise(spell(opposing))} of ${spell(bookmakerCount)} books are on the other side.`,
        basis,
        completeness,
      };
    }

    if (deep && consensusPct >= STRONG_AGREEMENT_PCT && pricesDisagree) {
      return {
        key: "book-agreement",
        verdict: "NEUTRAL",
        reason: `${capitalise(spell(agreeing))} of ${spell(bookmakerCount)} books are on our side, but they are pricing it far apart, so the agreement is thinner than the count looks.`,
        basis,
        completeness,
      };
    }

    return {
      key: "book-agreement",
      verdict: "NEUTRAL",
      reason: `The books are split on this one — ${spell(agreeing)} of ${spell(bookmakerCount)} are with us.`,
      basis,
      completeness,
    };
  };
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
