/**
 * DECISION FACTORY — Compression Metrics.
 *
 * Internal-only telemetry that proves complexity became calm: the Fact-to-Decision Compression Ratio
 * ("12,481 facts → 9 cards → 3 actionable"). The weighted form credits cards by the decision leverage
 * they actually displayed (noticeability), so noise that produces many low-value cards scores worse
 * than a few high-leverage ones. Pure + deterministic.
 */

import { type DecisionFieldFrame, rankOf } from "@sports/decision-field-runtime";

export interface CompressionMetrics {
  readonly factsIngested: number;
  readonly cardsEmitted: number;
  readonly actionableCards: number;
  readonly compressionRatio: number;       // cards ÷ facts
  readonly weightedCompression: number;    // Σ noticeability ÷ facts
  readonly summary: string;
}

/** Compute the compression metrics for one frame. Actionable = strength ≥ WAIT. */
export function computeCompressionMetrics(frame: DecisionFieldFrame): CompressionMetrics {
  const facts = frame.facts.rawSeen.length;
  const cards = frame.emittedCards.length;
  const actionable = frame.emittedCards.filter((c) => rankOf(c.maxPermittedStrength) >= rankOf("WAIT")).length;
  const noticeability = frame.emittedCards.reduce((s, c) => s + c.noticeabilityIndex, 0);
  const compressionRatio = facts > 0 ? Number((cards / facts).toFixed(4)) : 0;
  const weightedCompression = facts > 0 ? Number((noticeability / facts).toFixed(4)) : 0;
  return {
    factsIngested: facts,
    cardsEmitted: cards,
    actionableCards: actionable,
    compressionRatio,
    weightedCompression,
    summary: `${facts} facts → ${cards} card(s) → ${actionable} actionable.`,
  };
}
