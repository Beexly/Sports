/**
 * Price a hierarchical-Bayes prop probability against a two-way book quote.
 *
 * The specialist in props-hb.ts answers P(X > line) from player-week counts.
 * This module is the missing market half: vig-strip the book's Over/Under
 * American prices, then fire on calibrated edge e = p − q — NEVER on
 * confidence κ = max(p, 1−p). A 90% favorite already priced at 90% has
 * ~0 edge. Ranking on κ is scores24's fatal error.
 *
 * Fail-closed: one-sided quotes, non-finite p, or a sub-vig / empty book
 * produce no priced edge. `priced` stays false until a prop-line archive
 * can settle CLV — this module does not persist and does not claim edge.
 *
 * Pure, deterministic, no I/O.
 */

import { americanToImpliedProbability, removeVig } from "../scoring.js";

export const PROPS_HB_SOURCE = "props_hb" as const;

export type PropBookQuote = {
  readonly overAmerican: number;
  readonly underAmerican: number;
};

export type PricedPropEdge = {
  readonly ok: true;
  readonly source: typeof PROPS_HB_SOURCE;
  /** Independent P(over) from the HB posterior-predictive. */
  readonly pOver: number;
  /** Book de-vigged P(over). */
  readonly qOver: number;
  /** e = p − q. Positive = model hotter on the over than the book. */
  readonly edgeOver: number;
  /** Book two-way overround before vig strip. Must be ≥ 1 to be consistent. */
  readonly overround: number;
  /**
   * Glass-box only until a prop-line archive exists. Callers MUST NOT treat
   * this as a public CLV claim.
   */
  readonly priced: false;
};

export type UnpricedPropEdge = {
  readonly ok: false;
  readonly source: typeof PROPS_HB_SOURCE;
  readonly pOver: number | null;
  readonly qOver: null;
  readonly edgeOver: null;
  readonly priced: false;
  readonly reason: string;
};

export type PropEdgeResult = PricedPropEdge | UnpricedPropEdge;

function finiteProb(p: number): boolean {
  return Number.isFinite(p) && p >= 0 && p <= 1;
}

function finiteAmerican(price: number): boolean {
  return Number.isFinite(price) && price !== 0;
}

/**
 * Independent HB p(over) vs a two-way Over/Under American quote.
 * Returns fail-closed `ok: false` rather than manufacturing edge from a
 * one-sided or broken book.
 */
export function pricePropAgainstMarket(
  pOver: number,
  quote: PropBookQuote | null | undefined,
): PropEdgeResult {
  if (!finiteProb(pOver)) {
    return {
      ok: false,
      source: PROPS_HB_SOURCE,
      pOver: Number.isFinite(pOver) ? pOver : null,
      qOver: null,
      edgeOver: null,
      priced: false,
      reason: "independent pOver is not a probability in [0, 1]",
    };
  }
  if (quote == null) {
    return {
      ok: false,
      source: PROPS_HB_SOURCE,
      pOver,
      qOver: null,
      edgeOver: null,
      priced: false,
      reason: "no two-way book quote — refuse to rank on confidence",
    };
  }
  if (!finiteAmerican(quote.overAmerican) || !finiteAmerican(quote.underAmerican)) {
    return {
      ok: false,
      source: PROPS_HB_SOURCE,
      pOver,
      qOver: null,
      edgeOver: null,
      priced: false,
      reason: "book quote missing a finite Over or Under American price",
    };
  }

  const overRaw = americanToImpliedProbability(quote.overAmerican);
  const underRaw = americanToImpliedProbability(quote.underAmerican);
  const overround = overRaw + underRaw;
  if (!(overround >= 1) || !Number.isFinite(overround)) {
    return {
      ok: false,
      source: PROPS_HB_SOURCE,
      pOver,
      qOver: null,
      edgeOver: null,
      priced: false,
      reason: "book market inconsistent (overround < 1) — refuse manufactured edge",
    };
  }

  const { home: qOver } = removeVig(overRaw, underRaw);
  return {
    ok: true,
    source: PROPS_HB_SOURCE,
    pOver,
    qOver,
    edgeOver: pOver - qOver,
    overround,
    priced: false,
  };
}

/**
 * Confidence κ = |2p − 1| is NOT edge. Export so product surfaces can stop
 * calling it that. Use {@link pricePropAgainstMarket} for e = p − q.
 */
export function confidenceFromPOver(pOver: number): number {
  if (!finiteProb(pOver)) return 0;
  return Math.abs(pOver - 0.5) * 2;
}
