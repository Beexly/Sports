/**
 * The honesty contrast — seven STRUCTURAL failure modes, and what we do instead.
 *
 * WHAT THIS IS FOR. "We are honest" is the weakest possible sentence: every
 * competitor says it, so it carries no information. What carries information is
 * naming the specific mechanisms by which a sports-prediction number becomes
 * misleading, and pointing at the place in this product where each one is
 * structurally prevented. A reader can then check us, which is the only version
 * of the claim worth making.
 *
 * WHAT THIS IS NOT, and the rules that keep it that way:
 *
 *   1. NO NAMED COMPANIES. Not one. Every item describes a mechanism that is
 *      available to anyone publishing predictions — including us, which is the
 *      point. Naming a competitor would convert a checkable structural claim
 *      into an unfalsifiable accusation about a third party, and would invite a
 *      defamation argument in place of a technical one. The mechanisms are
 *      documented, well-known, and attributable to nobody in particular.
 *
 *   2. NO WIN RATES, ROI, OR PERFORMANCE FIGURES — ours or anyone's. This
 *      module contains no numbers presented as results. A contrast that ended
 *      in "and that's why we hit 58%" would commit the exact failure it is
 *      describing, on the same page.
 *
 *   3. EVERY "WHAT WE DO" IS PRESENT-TENSE AND CHECKABLE. Each entry carries a
 *      `verifyHref` pointing at a surface or document a stranger can open. If a
 *      remedy were aspirational, the honest form is to say so in `weDo` rather
 *      than to imply it already holds — and `verifyHref` is required by the
 *      type precisely so no entry can make an unlocatable claim.
 *
 * A note on `weDo` wording: several remedies are stated as refusals ("we
 * withhold", "we do not"). That is not modesty. A refusal is verifiable by
 * inspection in a way that a positive performance claim is not, so for a
 * pre-revenue product it is the strongest honest thing available.
 */

export interface HonestyContrastItem {
  /** Stable key for tests and React keys. Never renumber — copy may change. */
  readonly id: string;
  /** Short name for the failure mode, as a mechanism rather than an insult. */
  readonly title: string;
  /**
   * How the number gets misleading. Mechanism only — no actor, no company, no
   * imputation of intent. Many of these happen by accident, which is exactly
   * why a structural guard is needed rather than good intentions.
   */
  readonly failureMode: string;
  /** What this product does instead, in the present tense, checkably. */
  readonly weDo: string;
  /** A route or document where a reader can check `weDo` for themselves. */
  readonly verifyHref: string;
  /** Link text for `verifyHref`. */
  readonly verifyLabel: string;
}

/**
 * The seven. Ordered by how much damage the mode does to a reader who trusts
 * it, not by how easy it is to explain.
 */
export const HONESTY_CONTRAST: readonly HonestyContrastItem[] = [
  {
    id: "retroactive-record",
    title: "A record that can be edited after the fact",
    failureMode:
      "If a prediction is stored in a mutable row, a losing call can be softened, requalified, or quietly removed once the result is known, and no reader can tell that it happened. The published history then describes the outcome rather than the forecast — and it will look excellent, because anything that did not work has been edited out.",
    weDo:
      "Every pick is written before kickoff into a hash-chained record where each entry commits to the one before it. Changing an old entry breaks the chain for everything after it, so tampering is detectable by a stranger rather than only by us.",
    verifyHref: "/how-to-verify-a-record",
    verifyLabel: "Check a record yourself",
  },
  {
    id: "selection-after-the-fact",
    title: "Choosing which results count once they are known",
    failureMode:
      "A published history can be assembled by keeping the sports, seasons, bet types, or date ranges that worked and describing the rest as experimental, off-model, or not part of the official record. Nothing is fabricated at any step, and the result is still a number that cannot be reproduced from the full set of forecasts.",
    weDo:
      "The scope of what counts is fixed in advance, and every settled pick inside that scope is graded — including pushes and voids, which are excluded from the calibration set as their own category rather than folded into losses or wins.",
    verifyHref: "/board/gate",
    verifyLabel: "See what is and is not judged",
  },
  {
    id: "confidence-as-edge",
    title: "Presenting confidence as though it were edge",
    failureMode:
      "A model's confidence score says how sure the model is. Whether a wager is worth making depends on that probability compared against the price, after the bookmaker's margin is removed. Ranking by confidence produces a board that looks decisive and systematically favours heavy favourites, where confidence is high and the price has already absorbed it.",
    weDo:
      "Nothing fires on confidence. The decision is made on the gap between our lower-bound probability and the de-vigged price from both sides of that pick's own market, and the gap is shown with the threshold it had to clear.",
    verifyHref: "/board/gate",
    verifyLabel: "See the threshold and the gap",
  },
  {
    id: "thin-sample-as-signal",
    title: "Reporting a rate before the sample can support one",
    failureMode:
      "A rate computed from a few dozen settled results has an interval wide enough to contain both a strong edge and a losing one. Published as a single number with no interval, it reads as a finding. Published in a period that started at a convenient point, it reads as a trend.",
    weDo:
      "A category with too little settled history is reported as not judged, in those words, and no rate is shown for it at all. That is a different answer from a refusal, and the two are never collapsed into one.",
    verifyHref: "/board/gate",
    verifyLabel: "See the not-judged state",
  },
  {
    id: "price-that-was-never-available",
    title: "Grading against a price nobody could have taken",
    failureMode:
      "A result can be graded against the best number seen anywhere, or the number after a favourable move, rather than the one quoted when the call was published. Every individual grade looks defensible; the aggregate describes a bettor who does not exist.",
    weDo:
      "A pick is evaluated against a captured quote for its own market, timestamped, and refused if that quote is stale or if the handicap has moved off the one the pick was taken at. The price shown is the one we evaluated, not the best one available.",
    verifyHref: "/board/gate",
    verifyLabel: "See which prices are refused",
  },
  {
    id: "silent-disappearance",
    title: "Letting a call vanish instead of resolving it",
    failureMode:
      "When a game is postponed, an input is missing, or a pipeline fails, the affected call can simply stop appearing. A reader cannot distinguish a forecast that was considered and declined from one that quietly disappeared, and only one of those reflects a judgement.",
    weDo:
      "A candidate that cannot be evaluated is shown as not evaluated, with the specific input that was missing named — a stale quote, an absent price, a game already under way. Rows too incomplete to describe at all are counted and reported rather than dropped.",
    verifyHref: "/board/gate",
    verifyLabel: "See the named exclusions",
  },
  {
    id: "unfalsifiable-claim",
    title: "Making the claim impossible to check",
    failureMode:
      "A number with no method, no scope, no interval, and no route to the underlying records cannot be wrong, because there is nothing to test it against. It functions as reassurance rather than evidence, and the absence of a way to check it is the load-bearing part.",
    weDo:
      "The performance surface stays sealed until the evidence clears its own stated bar, and the bar is published rather than described. Where we have no substantiated number, we say so instead of showing a softer one.",
    verifyHref: "/glass-ledger",
    verifyLabel: "See the sealed record",
  },
] as const;

/**
 * The short form for the pricing page, where the question is narrower: not
 * "how do numbers go wrong" but "what is the money actually buying".
 *
 * Deliberately a projection of the same seven rather than a separate list. Two
 * independently-worded lists would drift, and the pricing page is the surface
 * most likely to be edited by someone selling rather than someone verifying.
 */
export interface HonestyContrastStripItem {
  readonly id: string;
  readonly title: string;
  readonly weDo: string;
  readonly verifyHref: string;
}

const STRIP_IDS: readonly string[] = [
  "retroactive-record",
  "confidence-as-edge",
  "thin-sample-as-signal",
  "silent-disappearance",
];

export function honestyContrastStrip(): readonly HonestyContrastStripItem[] {
  return STRIP_IDS.map((id) => {
    const item = HONESTY_CONTRAST.find((i) => i.id === id);
    // Throwing rather than filtering: a silently-shortened strip on the pricing
    // page is a copy regression nobody would notice in review, and the ids are
    // fixed in this file — a miss means someone renamed one, which is a bug.
    if (!item) throw new Error(`honestyContrastStrip: unknown id "${id}"`);
    return {
      id: item.id,
      title: item.title,
      weDo: item.weDo,
      verifyHref: item.verifyHref,
    };
  });
}

/**
 * What the reader is paying for, stated without a performance promise.
 *
 * This is the whole pitch, and it deliberately does not say the predictions are
 * good. It says the reporting is checkable. Those are different products, and
 * only one of them can be substantiated before there is a record.
 */
export const WHY_PAY_FOR_HONESTY_LEAD =
  "A subscription does not buy a promise about results. It buys access to the reasoning behind each refusal, and to a record built so that you — not us — can check whether what we published matches what happened.";
