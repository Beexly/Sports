/**
 * GSE GALILEO — Expression Router (Invention 10, superset).
 *
 * Routes a candidate to a precise expression, adding the microstructure verbs the twin makes
 * possible: STALE_BOOK_CANDIDATE, ALT_LINE_CANDIDATE, ROLE_SHOCK_CANDIDATE, and DATA_QUALITY_FAIL,
 * alongside the action/timing verbs. Every output states what changed, what did NOT update, why
 * that matters, what evidence exists vs is missing, and whether this is a timing edge, a
 * settlement edge, or a product-only insight. Pure.
 */

import type { EdgeStatus, EvidenceStatus } from "../market-physics/edge-ledger.js";

export type GalileoExpression =
  | "PASS"
  | "WATCH"
  | "WAIT"
  | "LOCK_NOW"
  | "LINE_SHOP_ONLY"
  | "STALE_BOOK_CANDIDATE"
  | "ALT_LINE_CANDIDATE"
  | "CLV_ONLY"
  | "SETTLEMENT_CANDIDATE"
  | "ROLE_SHOCK_CANDIDATE"
  | "REJECTED_FAKE_EDGE"
  | "DATA_QUALITY_FAIL";

export type EdgeType = "timing" | "settlement" | "product_only" | "none";

export type ResidualDriver = "stale_book" | "alt_line" | "role_shock" | "total_to_prop" | "none";

export interface GalileoExpressionInput {
  readonly ledgerStatus: EdgeStatus;
  readonly clv: EvidenceStatus;
  readonly settlement: EvidenceStatus;
  readonly liquidityChecked: boolean;
  readonly dataQualityFail?: boolean;
  readonly residualDriver?: ResidualDriver;
  readonly timestamp: string;
  readonly book?: string;
  readonly line?: number;
  readonly expectsFavorableMove?: boolean;
  readonly isBestNumber?: boolean;
  /** Plain statement of what moved / what the new reality is. */
  readonly whatChanged?: string;
  /** What the surface did NOT update in response. */
  readonly whatDidNotUpdate?: string;
}

export interface GalileoExpressionOutput {
  readonly expression: GalileoExpression;
  readonly whatChanged: string;
  readonly whatDidNotUpdate: string;
  readonly whyItMatters: string;
  readonly evidenceExists: string;
  readonly evidenceMissing: string;
  readonly edgeType: EdgeType;
  readonly timestamp: string;
  readonly book: string | null;
  readonly line: number | null;
}

export function routeExpression(input: GalileoExpressionInput): GalileoExpressionOutput {
  const base = {
    whatChanged: input.whatChanged ?? "—",
    whatDidNotUpdate: input.whatDidNotUpdate ?? "—",
    timestamp: input.timestamp,
    book: input.book ?? null,
    line: input.line ?? null,
  };
  const evidenceExists = [input.clv === "pass" ? "CLV" : null, input.settlement === "pass" ? "settlement" : null]
    .filter(Boolean)
    .join("+") || "structural-contradiction-only";
  const evidenceMissing = [
    input.settlement !== "pass" ? "settlement" : null,
    !input.liquidityChecked ? "liquidity" : null,
  ].filter(Boolean).join("+") || "none";

  const make = (
    expression: GalileoExpression,
    whyItMatters: string,
    edgeType: EdgeType,
  ): GalileoExpressionOutput => ({ ...base, expression, whyItMatters, evidenceExists, evidenceMissing, edgeType });

  if (input.dataQualityFail) {
    return make("DATA_QUALITY_FAIL", "A data-quality issue invalidates the read until fixed and re-run.", "none");
  }
  if (input.ledgerStatus === "REJECTED" || input.settlement === "fail") {
    return make("REJECTED_FAKE_EDGE", "Failed a gate or settled negative — a result, not a global no-edge.", "none");
  }
  if (input.settlement === "pass") {
    if (input.ledgerStatus === "ACTIVE") {
      if (input.isBestNumber === false) return make("LINE_SHOP_ONLY", "Edge exists but only at a better number than this book's.", "settlement");
      if (input.expectsFavorableMove) return make("WAIT", "Edge exists and the number is expected to move our way.", "timing");
      return make("LOCK_NOW", "Active, settlement-proven edge at the best number.", "settlement");
    }
    return make("SETTLEMENT_CANDIDATE", "Settlement evidence exists but ACTIVE gates are not all clear.", "settlement");
  }
  if (input.clv === "pass") {
    return make("CLV_ONLY", "Beats the close but is not settlement-proven — timing signal, not a record.", "timing");
  }
  // Shadow candidates typed by the residual that surfaced them.
  switch (input.residualDriver) {
    case "stale_book":
      return make("STALE_BOOK_CANDIDATE", "A book lagged a consensus move — a timing/execution window.", "timing");
    case "alt_line":
      return make("ALT_LINE_CANDIDATE", "An alt ladder is geometrically mispriced vs its own/consensus curve.", "timing");
    case "role_shock":
      return make("ROLE_SHOCK_CANDIDATE", "A prop is anchored to a stale role after a shock.", "timing");
    default:
      break;
  }
  if (input.ledgerStatus === "WATCHLIST" || input.ledgerStatus === "SHADOW_COLLECTING" || input.ledgerStatus === "SHADOW_READY") {
    return make("WATCH", "A structural signal under shadow observation; no action.", "product_only");
  }
  return make("PASS", "No actionable contradiction or evidence.", "none");
}
