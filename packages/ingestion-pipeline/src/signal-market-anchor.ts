/**
 * C-253 — the edge fields a signal-slate pick carries, given whatever market
 * anchor could be resolved for it at publish time.
 *
 * THE PROBLEM THIS FIXES, measured on production 2026-09-08 (read-only SELECT
 * over 14 days of published picks): 387 of 428 published MONEYLINE picks
 * carried `independentEdge.marketFairProb: null`, and on those rows the field
 * named `rawEdge` held `trueProb - 0.5`. That is the distance of the model's
 * probability from a coin flip, not an edge against a market. The product's
 * own doctrine is to fire on `e = p - q` and never on confidence, and
 * `trueProb - 0.5` is confidence under another name.
 *
 * It was not a data problem. Of those same 387 picks, **232 had at least one
 * real bookmaker quoting both sides in our own `odds` table at or before the
 * pick's generatedAt**, and 103 had two or more. The market price existed in
 * our database at the moment we published and the slate never looked.
 *
 * WHAT THIS DOES NOT DO. Resolving an anchor does not make a pick book-priced.
 * Publishing on the board path still needs MIN_BOOKMAKERS live books, and this
 * changes no gate, no threshold and no publish decision: the signal slate's
 * `decision` is a function of trueProb alone and stays exactly as it was. What
 * changes is that `rawEdge` becomes a real edge on the rows where a market
 * exists, and that the provenance of the anchor travels with it so a single
 * stored book can never be read as the two-book floor.
 *
 * Pure. No database, no clock, no environment.
 */

import type { PublishTimeMarketPResult } from "@sports/prediction-engine";

/** Evidence shrink applied to the raw edge on this lane. Unchanged from the pre-C-253 value. */
export const SIGNAL_EDGE_SHRINK = 0.7;

/**
 * The reference the edge is measured against when NO market could be resolved.
 *
 * Read this number carefully. It is a coin flip standing in for a market, and
 * an edge against it is not an edge. It is retained only so the field keeps a
 * defined value on rows that have no anchor, and every such row is tagged
 * `anchored: false` so no caller can mistake the two populations for one.
 */
export const NO_MARKET_REFERENCE = 0.5;

/**
 * The model-estimate floor this lane has always used to claim a LEAN. Lifted out
 * of generate-signal-slate.ts unchanged (it was the literal 0.58) so the decision
 * rule lives beside the edge it now also depends on, and so a test can assert on
 * the rule rather than on a number copied into two files.
 */
export const SIGNAL_LEAN_TRUEPROB = 0.58;

/**
 * C-256 (Devin). `latestH2hRowPerBookmaker` takes each bookmaker's newest row at
 * or before generatedAt with no age limit, so a book that stopped quoting days
 * ago can pair with a fresh one and present as a two-book snapshot. The blended
 * price is then part current and part obsolete.
 *
 * The policy lives HERE, at the consumer, and not in the resolver. The resolver
 * is also the calibration loader's recomputation path, and tightening it would
 * retroactively change measured historical numbers - moving the record to fix
 * the instrument. Publishing is a forward decision and can hold a stricter bar
 * than measurement without either one lying.
 *
 * MAX_ANCHOR_AGE_MS bounds how old the freshest row may be; MAX_ANCHOR_SPREAD_MS
 * bounds how far apart the books in one snapshot may sit. Both are generous
 * relative to the 15 minute refresh cadence, so an ordinary cycle passes and a
 * genuinely stale book does not.
 */
export const MAX_ANCHOR_AGE_MS = 6 * 60 * 60 * 1000;
export const MAX_ANCHOR_SPREAD_MS = 3 * 60 * 60 * 1000;

export type AnchorFreshness =
  | { readonly usable: true }
  | { readonly usable: false; readonly reason: "anchor_too_old" | "anchor_books_disagree_in_time" };

/**
 * Whether a resolved anchor is fresh enough, and coherent enough, to price a
 * pick against. Pure: `now` is passed, never read from the clock.
 */
export function anchorFreshness(
  resolved: PublishTimeMarketPResult | null,
  now: Date,
): AnchorFreshness {
  if (resolved == null || resolved.status !== "resolved") return { usable: true };
  const ageMs = now.getTime() - resolved.snapshotAt.getTime();
  if (!Number.isFinite(ageMs) || ageMs > MAX_ANCHOR_AGE_MS) {
    return { usable: false, reason: "anchor_too_old" };
  }
  const spreadMs = resolved.snapshotAt.getTime() - resolved.oldestBookAt.getTime();
  if (!Number.isFinite(spreadMs) || spreadMs > MAX_ANCHOR_SPREAD_MS) {
    return { usable: false, reason: "anchor_books_disagree_in_time" };
  }
  return { usable: true };
}

export type SignalEdgeFields = {
  /** True when a real de-vigged book price backs `reference`. */
  readonly anchored: boolean;
  /** The q the edge is measured against: a de-vigged book price, or NO_MARKET_REFERENCE. */
  readonly reference: number;
  /** Persisted as independentEdge.marketFairProb. Null when unanchored: never invent 0.5 into it. */
  readonly marketFairProb: number | null;
  readonly rawEdge: number;
  readonly shrunkEdge: number;
  readonly marketFairSource: "market_p_from_odds_table" | "market_p_single_book" | null;
  readonly marketBookCount: number | null;
  readonly marketSnapshotAt: string | null;
};

function round6(x: number): number {
  return Number(x.toFixed(6));
}

/**
 * Edge fields for one signal-slate pick.
 *
 * `resolved` is the output of the SAME resolver the calibration loader runs
 * after settlement (`resolvePublishTimeMarketP`), so a q produced here is the
 * number that path would later recompute, not a second method.
 */
export function signalEdgeFields(
  trueProb: number,
  resolved: PublishTimeMarketPResult | null,
): SignalEdgeFields {
  const anchored = resolved != null && resolved.status === "resolved";
  const reference = anchored ? resolved.p : NO_MARKET_REFERENCE;
  const rawEdge = round6(trueProb - reference);
  return {
    anchored,
    reference,
    marketFairProb: anchored ? resolved.p : null,
    rawEdge,
    shrunkEdge: round6(rawEdge * SIGNAL_EDGE_SHRINK),
    marketFairSource: anchored ? resolved.pSource : null,
    marketBookCount: anchored ? resolved.bookCount : null,
    marketSnapshotAt: anchored ? resolved.snapshotAt.toISOString() : null,
  };
}

/**
 * Whether this pick may CLAIM an edge, given what the market says.
 *
 * Devin found the hole C-253 opened and it is the most important finding on the
 * change. Before the anchor existed, `decision` could only be a function of
 * trueProb, because there was nothing to compare trueProb against. Now that a
 * real de-vigged book price backs 60 per cent of these rows, a pick can have a
 * high model estimate AND a NEGATIVE measured edge: the market prices the side
 * higher than we do, which means it is overpriced by our own arithmetic. Leaving
 * `decision` on trueProb alone would have gone on labelling those "LEAN", which
 * is the product telling a customer it likes a price its own math just called
 * bad.
 *
 * `decision` is a CLAIM LABEL, not a publish gate. Nothing in the repository
 * reads it to decide whether a pick is written or served; the pick card reads it
 * to decide whether to render the independent-edge block, and the explainer
 * quotes it. So this narrows what we assert, and changes nothing about what
 * publishes. That distinction is why it is a correction rather than a threshold
 * change: no gate resolves differently, one claim gets retracted where the
 * evidence retracts it.
 *
 * Unanchored rows keep the pre-C-253 rule exactly, because for them nothing has
 * changed: there is still no market to compare against, and the wording on those
 * picks says so.
 */
export function signalDecision(
  trueProb: number,
  fields: SignalEdgeFields,
): "LEAN" | "PASS" {
  const modelLikesIt = trueProb >= SIGNAL_LEAN_TRUEPROB;
  if (!fields.anchored) return modelLikesIt ? "LEAN" : "PASS";
  // Anchored: the model must like the side AND the market must not already
  // price it at or above our estimate. A zero edge is not an edge.
  return modelLikesIt && fields.rawEdge > 0 ? "LEAN" : "PASS";
}

/** How many books the anchor came from, in words a customer reads. */
function bookPhrase(fields: SignalEdgeFields): string {
  const n = fields.marketBookCount ?? 0;
  return n === 1 ? "one stored book line" : `${n} stored book lines`;
}

/**
 * The glass-box factor line rendered on the pick card beside the rationale.
 * Derived from the same fields as the rationale and the reasoning so the three
 * customer-visible statements about price provenance cannot contradict one
 * another (Devin, C-255: this line still read "No book odds attached." on picks
 * that had just been given a de-vigged one).
 */
export function signalFactorDescription(
  fields: SignalEdgeFields,
  sourcesLabel: string,
  trueProb: number,
): string {
  const head = `trueProb=${trueProb.toFixed(3)} from ${sourcesLabel}.`;
  if (!fields.anchored) return `${head} No book odds attached.`;
  return (
    `${head} Stored book fair ${fields.reference.toFixed(3)} from ${bookPhrase(fields)}, ` +
    `edge ${fields.rawEdge >= 0 ? "+" : ""}${fields.rawEdge.toFixed(3)}.`
  );
}

/**
 * The glass-box rationale. It must never assert a price the pick does not have
 * and never deny one it does. Before C-253 the unanchored wording was the only
 * wording, and it shipped on rows that now carry a real anchor.
 */
export function signalRationale(
  fields: SignalEdgeFields,
  chosenTeam: string,
  sourcesLabel: string,
  trueProb: number,
): string {
  const estimate = `${(trueProb * 100).toFixed(1)}%`;
  if (!fields.anchored) {
    return (
      `Independent blend (${sourcesLabel}): model estimate ${estimate} for ${chosenTeam}, ` +
      `uncalibrated and not a book price. No market price was stored for this fixture at ` +
      `publish time, so no edge against a market is claimed. Model signal only.`
    );
  }
  const q = `${(fields.reference * 100).toFixed(1)}%`;
  const edge = `${(fields.rawEdge * 100).toFixed(1)}`;
  const floorNote =
    fields.marketFairSource === "market_p_single_book"
      ? ` A single book is below the two-book floor a board-priced pick requires, so this is an anchor for measurement, not a book-priced quote.`
      : "";
  return (
    `Independent blend (${sourcesLabel}): model estimate ${estimate} for ${chosenTeam} against a ` +
    `de-vigged ${q} from ${bookPhrase(fields)} stored at or before publish time, a ${edge} point ` +
    `difference (shrunk to ${(fields.shrunkEdge * 100).toFixed(1)}).${floorNote} The model estimate ` +
    `is uncalibrated.`
  );
}

/** The customer-facing reasoning paragraph. Same honesty rule as the rationale. */
export function signalReasoning(
  fields: SignalEdgeFields,
  chosenTeam: string,
  sourcesLabel: string,
  trueProb: number,
): string {
  const estimate = `${Math.round(trueProb * 100)}%`;
  if (!fields.anchored) {
    return (
      `Model signal (no book line): independent sources [${sourcesLabel}] put ${chosenTeam} at a ` +
      `model estimate of ${estimate}, uncalibrated and not a sportsbook quote. ` +
      `No book price is attached to this pick.`
    );
  }
  const q = `${Math.round(fields.reference * 100)}%`;
  return (
    `Model signal: independent sources [${sourcesLabel}] put ${chosenTeam} at a model estimate of ` +
    `${estimate}, uncalibrated, against a de-vigged ${q} from ${bookPhrase(fields)} we stored at or ` +
    `before publish time. The difference is the reason this pick is here. The stored line is a ` +
    `reference price, not a quote you can take.`
  );
}
