/**
 * GALILEO ENGINE — Expression Router (Phase 6).
 *
 * The engine does not say "bet" or "pass." It routes a candidate — given its ledger status,
 * its evidence class, the live number, and timing context — to a precise expression that
 * states exactly what kind of action (if any) the evidence licenses, and why. A
 * settlement-proven ACTIVE edge at the best number locks now; the same edge at a worse
 * number is line-shop-only; a CLV-only signal is labelled as such and never sold as a win.
 *
 * Every output carries its full provenance: reason, the market contradiction behind it,
 * timestamp, book, line, confidence, ledger status, evidence class (CLV / settlement / both),
 * and a risk note. Pure + deterministic.
 */

import type { EdgeStatus, EvidenceStatus } from "./edge-ledger.js";

export type Expression =
  | "PASS"
  | "WATCH"
  | "WAIT_FOR_BETTER_NUMBER"
  | "LOCK_NOW"
  | "LINE_SHOP_ONLY"
  | "CLV_ONLY_NOT_SETTLEMENT_PROVEN"
  | "SHADOW_CANDIDATE"
  | "SETTLEMENT_CANDIDATE"
  | "REJECTED_FAKE_EDGE"
  | "REQUIRES_LIQUIDITY_CHECK";

export type EvidenceClass = "clv" | "settlement" | "both" | "none";

export interface ExpressionInput {
  readonly ledgerStatus: EdgeStatus;
  readonly clv: EvidenceStatus;
  readonly settlement: EvidenceStatus;
  readonly liquidityChecked: boolean;
  readonly timestamp: string;
  /** The coherence/contradiction that surfaced this candidate, if any. */
  readonly contradiction?: string;
  readonly book?: string;
  readonly line?: number;
  /** A forecaster expects the number to move our way (wait) — optional. */
  readonly expectsFavorableMove?: boolean;
  /** This book/line is the best available across the surface — optional. */
  readonly isBestNumber?: boolean;
}

export interface ExpressionOutput {
  readonly expression: Expression;
  readonly reason: string;
  readonly supportingContradiction: string | null;
  readonly timestamp: string;
  readonly book: string | null;
  readonly line: number | null;
  readonly confidence: number;
  readonly evidenceStatus: EdgeStatus;
  readonly evidenceClass: EvidenceClass;
  readonly riskNote: string;
}

function evidenceClassOf(clv: EvidenceStatus, settlement: EvidenceStatus): EvidenceClass {
  if (clv === "pass" && settlement === "pass") return "both";
  if (settlement === "pass") return "settlement";
  if (clv === "pass") return "clv";
  return "none";
}

const CONFIDENCE: Record<EdgeStatus, number> = {
  REJECTED: 0,
  WATCHLIST: 0.2,
  SHADOW_COLLECTING: 0.35,
  SHADOW_READY: 0.55,
  ACTIVE: 0.8,
};

/** Route a candidate to its expression. See module header for the precedence. */
export function route(input: ExpressionInput): ExpressionOutput {
  const evidenceClass = evidenceClassOf(input.clv, input.settlement);
  const base = {
    supportingContradiction: input.contradiction ?? null,
    timestamp: input.timestamp,
    book: input.book ?? null,
    line: input.line ?? null,
    confidence: CONFIDENCE[input.ledgerStatus],
    evidenceStatus: input.ledgerStatus,
    evidenceClass,
  };

  const make = (expression: Expression, reason: string, riskNote: string): ExpressionOutput => ({
    ...base,
    expression,
    reason,
    riskNote,
  });

  // 1) Rejected / settlement-negative — never sellable.
  if (input.ledgerStatus === "REJECTED" || input.settlement === "fail") {
    return make(
      "REJECTED_FAKE_EDGE",
      "Rejected by the ledger (failed a gate or settlement-negative).",
      "Do not act. A failed hypothesis is a result, not a global 'no edge'.",
    );
  }

  // 2) A settlement-proven edge — express by promotion + number + timing.
  if (input.settlement === "pass") {
    if (!input.liquidityChecked) {
      return make(
        "REQUIRES_LIQUIDITY_CHECK",
        "Settlement-proven but real betting limits are not yet verified.",
        "Edge may evaporate at usable stakes — verify limits before sizing.",
      );
    }
    if (input.ledgerStatus === "ACTIVE") {
      if (input.isBestNumber === false) {
        return make(
          "LINE_SHOP_ONLY",
          "Active edge, but this is not the best available number.",
          "Shop the best price first; the median-close rate understates a best-line strategy.",
        );
      }
      if (input.expectsFavorableMove) {
        return make(
          "WAIT_FOR_BETTER_NUMBER",
          "Active edge, and the line is expected to move our way.",
          "Waiting risks the move reversing or limits dropping near close.",
        );
      }
      return make("LOCK_NOW", "Active, settlement-proven edge at the best number.", "Size to bankroll; props carry lower limits.");
    }
    return make(
      "SETTLEMENT_CANDIDATE",
      "Settlement evidence exists but the candidate is not yet ledger-ACTIVE.",
      "Track in shadow; do not bet live until all ACTIVE gates clear.",
    );
  }

  // 3) CLV-only — labelled, never sold as a settled win.
  if (input.clv === "pass") {
    return make(
      "CLV_ONLY_NOT_SETTLEMENT_PROVEN",
      "Beats the close (CLV) but is not proven profitable at settlement.",
      "CLV is a leading indicator only; do not treat as a winning record.",
    );
  }

  // 4) Shadow / watch / pass by ledger status.
  if (input.ledgerStatus === "SHADOW_READY" || input.ledgerStatus === "SHADOW_COLLECTING") {
    return make("SHADOW_CANDIDATE", "Promising structural signal under shadow collection.", "No action; accruing evidence.");
  }
  if (input.ledgerStatus === "WATCHLIST") {
    return make("WATCH", "A structural hypothesis worth monitoring; no evidence yet.", "No action.");
  }
  return make("PASS", "No actionable contradiction or evidence.", "No action.");
}
