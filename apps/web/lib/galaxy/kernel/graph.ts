/**
 * Galaxy Intelligence Graph — typed edge registry.
 *
 * Edges are explicit (source surface → kind → target surface).
 * Never inferred from confidential factor data.
 *
 * Public projection excludes any node whose kind is in PROTECTED_KINDS.
 * The graph drives: RelatedIntelligencePanel, RelatedLessons,
 * RelatedReports, RelatedDecisionCards, NextBestSurface.
 *
 * Constitutional reminder: no weights, thresholds, prompts, or
 * calibration content in this file.
 */

export type EdgeKind =
  | "decision-quality"  // surface A helps improve decisions on surface B
  | "evidence"          // surface A provides evidence context for surface B
  | "learning"          // surface A has academy content related to surface B
  | "report"            // surface A is a report type covering surface B's domain
  | "workflow"          // surface A is the next natural step from surface B
  | "restraint";        // surface A offers discipline context for surface B

/** Kinds that must never appear in public graph projections. */
export const PROTECTED_KINDS = new Set<string>([
  "model-weights",
  "factor-threshold",
  "prompt-template",
  "calibration-formula",
  "aggregation-logic",
]);

export interface GraphEdge {
  readonly from: string;    // surface id or academy module id
  readonly to: string;      // surface id or academy module id
  readonly kind: EdgeKind;
  readonly label: string;   // human-readable link label (no methodology detail)
}

export const GRAPH_EDGES: ReadonlyArray<GraphEdge> = [
  // ── Decision quality relationships ──────────────────────────────────────
  { from: "picks", to: "autopsy", kind: "workflow", label: "Grade this pick" },
  { from: "picks", to: "parlay-mri", kind: "decision-quality", label: "Check parlay structure" },
  { from: "picks", to: "no-bet", kind: "restraint", label: "What the model passed" },
  { from: "today", to: "autopsy", kind: "workflow", label: "Grade past decisions" },
  { from: "today", to: "no-bet", kind: "restraint", label: "What we skipped today" },
  { from: "today", to: "market-mirage", kind: "decision-quality", label: "Narrative vs market signals" },
  { from: "autopsy", to: "picks", kind: "workflow", label: "Review picks" },
  { from: "autopsy", to: "academy", kind: "learning", label: "Process grading module" },
  { from: "parlay-mri", to: "academy", kind: "learning", label: "Parlay discipline module" },
  { from: "parlay-mri", to: "picks", kind: "workflow", label: "Single-leg picks" },
  { from: "market-mirage", to: "reports", kind: "report", label: "Market Mirage reports" },
  { from: "market-mirage", to: "picks", kind: "decision-quality", label: "Signals unaffected by narrative" },
  { from: "roster-shock", to: "picks", kind: "decision-quality", label: "Picks for this game" },
  { from: "roster-shock", to: "today", kind: "workflow", label: "Today's board" },
  { from: "coaching-edge", to: "picks", kind: "decision-quality", label: "Picks for this matchup" },
  { from: "coaching-edge", to: "today", kind: "workflow", label: "Today's board" },
  // ── Academy relationships ────────────────────────────────────────────────
  { from: "academy", to: "picks", kind: "workflow", label: "Apply what you learned" },
  { from: "academy", to: "autopsy", kind: "workflow", label: "Grade your decisions" },
  { from: "academy", to: "no-bet", kind: "restraint", label: "Practice the pass" },
  { from: "academy", to: "profile", kind: "workflow", label: "Your maturity profile" },
  // ── Reports relationships ────────────────────────────────────────────────
  { from: "reports", to: "market-mirage", kind: "decision-quality", label: "Market Mirage detector" },
  { from: "reports", to: "picks", kind: "workflow", label: "Published signals" },
  { from: "reports", to: "methodology", kind: "evidence", label: "How reports are scored" },
  // ── Intelligence network ─────────────────────────────────────────────────
  { from: "intelligence", to: "brain", kind: "workflow", label: "Research Brain" },
  { from: "intelligence", to: "reports", kind: "report", label: "Reports" },
  { from: "brain", to: "picks", kind: "decision-quality", label: "Research-backed picks" },
  { from: "brain", to: "academy", kind: "learning", label: "Structured learning" },
  // ── Profile / maturity ──────────────────────────────────────────────────
  { from: "profile", to: "academy", kind: "learning", label: "Recommended module" },
  { from: "profile", to: "autopsy", kind: "workflow", label: "Grade your decisions" },
  // ── No-bet / restraint ──────────────────────────────────────────────────
  { from: "no-bet", to: "picks", kind: "restraint", label: "What cleared the gate" },
  { from: "no-bet", to: "responsible-play", kind: "restraint", label: "Responsible play resources" },
] as const;

/**
 * Get outbound edges from a surface, filtered to public-safe kinds.
 */
export function getOutboundEdges(surfaceId: string): ReadonlyArray<GraphEdge> {
  return GRAPH_EDGES.filter(
    (e) => e.from === surfaceId && !PROTECTED_KINDS.has(e.kind)
  );
}

/**
 * Get inbound edges to a surface, filtered to public-safe kinds.
 */
export function getInboundEdges(surfaceId: string): ReadonlyArray<GraphEdge> {
  return GRAPH_EDGES.filter(
    (e) => e.to === surfaceId && !PROTECTED_KINDS.has(e.kind)
  );
}

/**
 * Get edges of a specific kind from a surface.
 */
export function getEdgesByKind(
  surfaceId: string,
  kind: EdgeKind
): ReadonlyArray<GraphEdge> {
  return GRAPH_EDGES.filter(
    (e) => e.from === surfaceId && e.kind === kind
  );
}
