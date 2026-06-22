/**
 * Decision graph roadmap for Galaxy Sports Edge Decision OS.
 * Defines the full signal → evidence → debate → decision → result → calibration loop.
 *
 * The GSE Decision OS is the core architecture: every decision flows through
 * this graph so it is auditable, calibratable, and improvable over time.
 */

// ── Decision OS node types ────────────────────────────────────────────────────

export type DecisionNodeType =
  | "data_ingest"
  | "signal_classification"
  | "evidence_assembly"
  | "debate_generation"
  | "no_play_gate"
  | "recommendation_publish"
  | "user_decision"
  | "result_capture"
  | "autopsy"
  | "calibration_update";

export type SignalStrength = "weak" | "moderate" | "strong" | "definitive";
export type EvidenceStance = "bullish" | "bearish" | "neutral" | "conflict";
export type DecisionOutcome = "win" | "loss" | "push" | "no_result" | "voided";

export interface DecisionGraphNode {
  id: string;
  type: DecisionNodeType;
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  gateConditions: string[];
  failureBehavior: "block" | "warn" | "degrade" | "skip";
  auditRequired: boolean;
}

export interface SignalNode {
  signalId: string;
  signalType: string;
  sourceId: string;
  value: unknown;
  strength: SignalStrength;
  expiresAt: string;
  capturedAt: string;
  dataLabel: "REAL" | "MODELED" | "ILLUSTRATIVE";
}

export interface EvidenceDebateCard {
  subjectId: string;
  subjectType: "player" | "game" | "team" | "slate";
  bullSignals: SignalNode[];
  bearSignals: SignalNode[];
  neutralSignals: SignalNode[];
  overallStance: EvidenceStance;
  confidenceScore: number;
  noPlayTriggered: boolean;
  noPlayReason: string | null;
  debateGeneratedAt: string;
  expiresAt: string;
}

export interface PublishedDecision {
  decisionId: string;
  subjectId: string;
  subjectType: "player" | "game" | "team" | "slate";
  recommendation: string;
  confidenceScore: number;
  lineAtPublish: number | null;
  publishedAt: string;
  evidenceSnapshot: EvidenceDebateCard;
  modelVersion: string;
  tier: "free" | "pro" | "elite";
}

export interface UserDecisionRecord {
  userId: string;
  decisionId: string;
  userAction: "follow" | "fade" | "ignore";
  userBetLine: number | null;
  recordedAt: string;
  evidenceAvailableAtTime: EvidenceDebateCard;
}

export interface DecisionResult {
  decisionId: string;
  outcome: DecisionOutcome;
  actualValue: number | null;
  projectedValue: number | null;
  lineAtClose: number | null;
  clv: number | null;
  settledAt: string;
}

export interface DecisionAutopsyRecord {
  decisionId: string;
  projectionError: number | null;
  projectionErrorPct: number | null;
  processCategory: string;
  lessonLearned: string;
  autopsiedAt: string;
}

// ── Decision OS graph specification ───────────────────────────────────────────

export const DECISION_GRAPH: ReadonlyArray<DecisionGraphNode> = [
  {
    id: "data_ingest",
    type: "data_ingest",
    name: "Data Ingest",
    description:
      "Ingest raw data from all permitted sources. Enforce RightsSnapshot on every record. Validate freshness timestamps.",
    inputs: ["raw_api_data", "licensed_feeds", "user_uploads"],
    outputs: ["validated_records", "stale_alerts"],
    gateConditions: [
      "checkClearance() must pass before ingestion",
      "Record age < configured staleness threshold",
      "Data must carry RightsSnapshot",
    ],
    failureBehavior: "block",
    auditRequired: true,
  },
  {
    id: "signal_classification",
    type: "signal_classification",
    name: "Signal Classification",
    description:
      "Classify each validated record as a typed signal with strength, stance, and expiry.",
    inputs: ["validated_records"],
    outputs: ["classified_signals"],
    gateConditions: [
      "Signal type must be in registered SignalType enum",
      "Expiry must be set — no evergreen signals",
      "dataLabel must be REAL, MODELED, or ILLUSTRATIVE",
    ],
    failureBehavior: "warn",
    auditRequired: false,
  },
  {
    id: "evidence_assembly",
    type: "evidence_assembly",
    name: "Evidence Assembly",
    description:
      "Group signals by subject (player, game, team). Build EvidenceDebateCard with bull/bear/neutral classification.",
    inputs: ["classified_signals"],
    outputs: ["evidence_debate_cards"],
    gateConditions: [
      "Minimum 2 signals required to assemble a card",
      "Cards older than signal expiry must be regenerated",
    ],
    failureBehavior: "block",
    auditRequired: false,
  },
  {
    id: "no_play_gate",
    type: "no_play_gate",
    name: "No-Play Gate",
    description:
      "Evaluate No-Play doctrine conditions. If triggered, route to No-Play card instead of recommendation.",
    inputs: ["evidence_debate_cards"],
    outputs: ["approved_for_publish", "no_play_cards"],
    gateConditions: [
      "confidence_score >= configured threshold (default 55)",
      "No signal_conflict between primary signals",
      "line_not_stale: line age < 4 hours",
      "injury_resolved: no open Questionable/Doubtful flags on key players",
    ],
    failureBehavior: "block",
    auditRequired: true,
  },
  {
    id: "recommendation_publish",
    type: "recommendation_publish",
    name: "Recommendation Publish",
    description:
      "Publish approved decisions to the platform. Snapshot evidence at publish time for future audit.",
    inputs: ["approved_for_publish"],
    outputs: ["published_decisions"],
    gateConditions: [
      "Aviation checklist: data_fresh, injury_resolved, line_available, confidence_met",
      "modelVersion must be set",
      "tier must be set (free/pro/elite)",
    ],
    failureBehavior: "block",
    auditRequired: true,
  },
  {
    id: "result_capture",
    type: "result_capture",
    name: "Result Capture",
    description:
      "Capture actual outcomes after game completion. Compute CLV against closing line.",
    inputs: ["published_decisions", "game_results", "closing_lines"],
    outputs: ["decision_results"],
    gateConditions: [
      "Game must be final before result recorded",
      "CLV computed from closing line at reputable book",
    ],
    failureBehavior: "warn",
    auditRequired: true,
  },
  {
    id: "autopsy",
    type: "autopsy",
    name: "Autopsy",
    description:
      "Compare projected vs actual. Classify outcome by PROCESS category (not just win/loss). Generate lesson.",
    inputs: ["decision_results", "published_decisions"],
    outputs: ["autopsy_records"],
    gateConditions: [
      "Process category must be set using GSE taxonomy (GOOD_PROCESS_GOOD_OUTCOME, etc.)",
      "Lesson must be non-empty and specific",
    ],
    failureBehavior: "warn",
    auditRequired: false,
  },
  {
    id: "calibration_update",
    type: "calibration_update",
    name: "Calibration Update",
    description:
      "Aggregate autopsy results. Compute MAE, RMSE, Brier score, CLV. Update public calibration dashboard.",
    inputs: ["autopsy_records"],
    outputs: ["calibration_metrics", "public_dashboard_update"],
    gateConditions: [
      "Minimum 10 settled results before publishing calibration metrics",
      "Metrics must include sample size prominently",
    ],
    failureBehavior: "warn",
    auditRequired: true,
  },
] as const;

// ── GSE Decision OS tiers ─────────────────────────────────────────────────────

export interface DecisionOsTier {
  tier: "free" | "pro" | "elite";
  accessLevel: string;
  decisionDepth: string;
  evidenceVisible: boolean;
  calibrationVisible: boolean;
  alertsEnabled: boolean;
  maxDecisionsPerWeek: number | null;
}

export const DECISION_OS_TIERS: ReadonlyArray<DecisionOsTier> = [
  {
    tier: "free",
    accessLevel: "1 pick/day, no confidence scores",
    decisionDepth: "Recommendation only; no evidence debate visible",
    evidenceVisible: false,
    calibrationVisible: true,
    alertsEnabled: false,
    maxDecisionsPerWeek: 7,
  },
  {
    tier: "pro",
    accessLevel: "All picks, confidence scores, factor trail, line movement, 7 sports",
    decisionDepth: "Full evidence debate card visible; bull/bear signals shown",
    evidenceVisible: true,
    calibrationVisible: true,
    alertsEnabled: false,
    maxDecisionsPerWeek: null,
  },
  {
    tier: "elite",
    accessLevel: "All Pro + real-time email & push alerts",
    decisionDepth: "Full evidence debate + real-time signal updates + Kelly sizing tool",
    evidenceVisible: true,
    calibrationVisible: true,
    alertsEnabled: true,
    maxDecisionsPerWeek: null,
  },
] as const;

// ── Helper functions ──────────────────────────────────────────────────────────

export function graphNodeById(id: string): DecisionGraphNode | undefined {
  return DECISION_GRAPH.find((n) => n.id === id);
}

export function auditRequiredNodes(): DecisionGraphNode[] {
  return DECISION_GRAPH.filter((n) => n.auditRequired) as DecisionGraphNode[];
}

export function blockingGateNodes(): DecisionGraphNode[] {
  return DECISION_GRAPH.filter((n) => n.failureBehavior === "block") as DecisionGraphNode[];
}

export function tierConfig(tier: "free" | "pro" | "elite"): DecisionOsTier {
  return DECISION_OS_TIERS.find((t) => t.tier === tier) as DecisionOsTier;
}
