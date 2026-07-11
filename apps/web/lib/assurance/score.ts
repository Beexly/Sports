/**
 * AI Setup Assurance — scoring.
 *
 * Health per category is derived from that category's open findings:
 * start at 1.0, subtract per finding by risk. Deterministic, explainable,
 * and impossible to game by hiding telemetry — missing telemetry lowers
 * COVERAGE, and low coverage voids the grade entirely.
 */

import type { AssuranceCategoryId, AssuranceFinding, AssuranceRisk } from "./types";

const RISK_PENALTY: Readonly<Record<AssuranceRisk, number>> = {
  LOW: 0.1,
  MEDIUM: 0.25,
  HIGH: 0.5,
  CRITICAL: 1.0,
};

export function categoryHealth(
  category: AssuranceCategoryId,
  findings: readonly AssuranceFinding[]
): number {
  const open = findings.filter((f) => f.category === category && f.status === "OPEN");
  const penalty = open.reduce((s, f) => s + RISK_PENALTY[f.risk] * f.confidence, 0);
  return Math.max(0, Math.round((1 - penalty) * 100) / 100);
}

/** Risk-adjusted leverage: severity × confidence, tie-broken by owner
 * actionability (things only the owner can move rank first among equals). */
export function pickTopRecommendation(
  findings: readonly AssuranceFinding[]
): AssuranceFinding | null {
  const open = findings.filter((f) => f.status === "OPEN");
  if (open.length === 0) return null;
  const rank: Record<AssuranceRisk, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  return [...open].sort(
    (a, b) =>
      rank[b.risk] * b.confidence - rank[a.risk] * a.confidence ||
      Number(b.ownerActionRequired) - Number(a.ownerActionRequired) ||
      a.id.localeCompare(b.id)
  )[0]!;
}
