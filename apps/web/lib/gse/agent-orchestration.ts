/**
 * GSE Agent Orchestration — a council of constrained agents, not one prompt.
 *
 * GSE is not a single AI call. It is a set of narrow, auditable agents, each with
 * declared allowed/forbidden inputs, allowed tools, an output schema, a
 * confidence protocol, escalation triggers, failure modes, and owner-gated
 * actions. The orchestrator (Jarvis) composes them; disagreements escalate;
 * owner-gated actions stay owner-gated. No agent auto-publishes or auto-bets.
 *
 * This maps onto / extends the existing Agents OS (`apps/web/lib/agents/*`) and
 * the cockpit `app/cockpit/agents/*`; it does not duplicate the runtime.
 *
 * Companion doc: docs/research/GSE_2026_AGENT_ORCHESTRATION.md
 */

import { type GseScore, makeScore, clampScore } from "./gse-scoring-systems";

export type AgentTrustTier = "observer" | "advisor" | "operator";

export interface AgentRoleContract {
  readonly id: string;
  readonly label: string;
  readonly role: string;
  readonly allowedInputs: readonly string[];
  readonly forbiddenInputs: readonly string[];
  readonly allowedTools: readonly string[];
  readonly outputSchema: string;
  readonly confidenceProtocol: string;
  readonly escalationTriggers: readonly string[];
  readonly failureModes: readonly string[];
  /** Actions this agent may only PROPOSE — never execute without owner approval. */
  readonly ownerGatedActions: readonly string[];
  /** Whether any output may reach a public surface. */
  readonly publicBoundary: "internal_only" | "may_inform_public";
  /** The maximum autonomy this role can ever earn. */
  readonly maxTier: AgentTrustTier;
  readonly acceptance: string;
}

/** Compact constructor to keep 23 role declarations readable and consistent. */
function role(
  id: string,
  label: string,
  roleText: string,
  opts: Partial<Omit<AgentRoleContract, "id" | "label" | "role">> = {},
): AgentRoleContract {
  return {
    id,
    label,
    role: roleText,
    allowedInputs: opts.allowedInputs ?? [],
    forbiddenInputs: opts.forbiddenInputs ?? ["unverified claims as facts", "data outside its rights"],
    allowedTools: opts.allowedTools ?? [],
    outputSchema: opts.outputSchema ?? "AgentVerdict { conclusion, confidence, evidenceRefs, flags }",
    confidenceProtocol: opts.confidenceProtocol ?? "Band, not percentage, unless calibrated.",
    escalationTriggers: opts.escalationTriggers ?? ["low confidence", "contradiction with another agent"],
    failureModes: opts.failureModes ?? ["overreach beyond evidence", "stale input"],
    ownerGatedActions: opts.ownerGatedActions ?? [],
    publicBoundary: opts.publicBoundary ?? "internal_only",
    maxTier: opts.maxTier ?? "advisor",
    acceptance: opts.acceptance ?? "Outputs are sourced, bounded, and escalate on disagreement.",
  };
}

export const AGENT_ROLES: readonly AgentRoleContract[] = [
  role("data_reliability", "Data Reliability Agent", "Judge data fitness before it drives anything.", {
    allowedInputs: ["raw + normalized data", "source records", "freshness"],
    allowedTools: ["data-excellence"],
    escalationTriggers: ["data quality below floor", "contradiction detected"],
    acceptance: "Every item it passes carries a data-quality score + lineage.",
  }),
  role("source_rights", "Source Rights Agent", "Block any use that exceeds a source's rights.", {
    allowedInputs: ["source-rights registry", "intended use"],
    forbiddenInputs: ["evasion tooling", "bypass instructions"],
    allowedTools: ["claim-safety", "scraping-clearance"],
    escalationTriggers: ["permission_required", "blocked_technical_controls", "excluded"],
    ownerGatedActions: ["approve a vendor candidate", "record written permission"],
    acceptance: "Hard-stops a job whose rights risk is in the very-high band.",
  }),
  role("projection", "Projection Agent", "Produce player/team projections with uncertainty.", {
    allowedInputs: ["historical stats", "usage", "matchup"],
    allowedTools: ["projection-factory"],
    confidenceProtocol: "Always emit a distribution/band, never a point claim alone.",
    acceptance: "Projections are versioned and labeled modeled.",
  }),
  role("ownership", "Ownership Agent", "Estimate DFS ownership — modeled, never measured.", {
    allowedInputs: ["slate", "salaries", "narrative signal"],
    allowedTools: ["ownership-engine"],
    confidenceProtocol: "Label all outputs as modeled estimates.",
    acceptance: "Output is explicitly flagged modeled on every surface.",
  }),
  role("market", "Market Agent", "Read line movement and consensus.", {
    allowedInputs: ["odds snapshots", "line movement"],
    allowedTools: ["data-excellence"],
    acceptance: "Distinguishes information-driven from public-driven moves.",
  }),
  role("injury", "Injury Agent", "Track status with freshness stamps.", {
    allowedInputs: ["official injury reports", "practice reports"],
    forbiddenInputs: ["rumor presented as confirmed"],
    confidenceProtocol: "Stamp freshness; mark unconfirmed as unconfirmed.",
    acceptance: "Never presents a stale status as current.",
  }),
  role("beat_report", "Beat Report Agent", "Summarize beat reporting within rights.", {
    allowedInputs: ["approved-source summaries"],
    forbiddenInputs: ["full article bodies for republication"],
    allowedTools: ["claim-safety"],
    acceptance: "Extracts facts only; attribution propagates.",
  }),
  role("narrative", "Narrative Agent", "Convert narrative into bounded impact signals.", {
    allowedInputs: ["beat sentiment", "role talk"],
    forbiddenInputs: ["narrative as fact"],
    confidenceProtocol: "Affects projection/ownership/volatility only via allowed impact types.",
    acceptance: "Narrative never overrides structured data; impact is bounded.",
  }),
  role("coach_intent", "Coach Intent Agent", "Infer likely coach/scheme decisions.", {
    allowedInputs: ["depth charts", "historical tendencies"],
    confidenceProtocol: "Low default confidence; intent is inferred, not known.",
    acceptance: "Flagged as inference with an explicit confidence band.",
  }),
  role("dfs_optimizer", "DFS Optimizer Agent", "Build lineups under constraints.", {
    allowedInputs: ["projections", "salaries", "rules", "exposure prefs"],
    allowedTools: ["dfs-optimizer"],
    acceptance: "Surfaces correlation/exposure and the fragile core.",
  }),
  role("draft_strategy", "Draft Strategy Agent", "Recommend draft picks by value over replacement.", {
    allowedInputs: ["value board", "roster needs", "league memory (consented)"],
    allowedTools: ["draft-strategy"],
    acceptance: "Always offers a best-player-available pivot.",
  }),
  role("league_memory", "League Memory Agent", "Recall consented league history.", {
    allowedInputs: ["user-provided draft/league history"],
    forbiddenInputs: ["other managers' PII"],
    confidenceProtocol: "Aggregate tendencies only.",
    acceptance: "Operates only on consented, user-provided data.",
  }),
  role("waiver", "Waiver Agent", "Recommend FAAB/waiver claims.", {
    allowedInputs: ["opportunity changes", "roster fit"],
    allowedTools: ["evidence-engine"],
    acceptance: "Distinguishes durable role change from one-week mirage.",
  }),
  role("trade", "Trade Agent", "Evaluate trades on championship equity.", {
    allowedInputs: ["roster", "schedule-adjusted value"],
    allowedTools: ["evidence-engine"],
    acceptance: "Recommends decline/counter when gain is inside noise.",
  }),
  role("roster_coach", "Roster Coach Agent", "Guide season-long roster decisions.", {
    allowedInputs: ["roster state", "schedule", "byes"],
    acceptance: "Process-first guidance; no result-based shaming.",
  }),
  role("responsible_decision", "Responsible Decision Agent", "Guard against harmful patterns.", {
    allowedInputs: ["consented decision history", "bias signals"],
    forbiddenInputs: ["data used to exploit a user"],
    confidenceProtocol: "Inform gently; never shame or nag.",
    escalationTriggers: ["loss-chasing pattern", "overtrading"],
    acceptance: "Surfaces bias as a question, never a verdict on the person.",
  }),
  role("revenue", "Revenue Agent", "Find trust-safe monetization levers.", {
    allowedInputs: ["funnel data", "pricing source-of-truth"],
    forbiddenInputs: ["fake urgency", "fake social proof"],
    allowedTools: ["revenue-os", "claim-safety"],
    ownerGatedActions: ["launch a pricing experiment", "change a public price"],
    acceptance: "Every proposal passes the claim-safety gate.",
  }),
  role("content_gsn", "Content / GSN Agent", "Draft content; never auto-publish.", {
    allowedInputs: ["data-backed facts", "approved sources"],
    forbiddenInputs: ["fabricated stats", "unsupported causal claims"],
    allowedTools: ["claim-safety"],
    ownerGatedActions: ["publish content", "send to any external channel"],
    publicBoundary: "may_inform_public",
    acceptance: "Draft-only; publishing is always owner-gated.",
  }),
  role("ux_clarity", "UX / Clarity Agent", "Reduce cognitive load without hiding tradeoffs.", {
    allowedInputs: ["surface structure", "cognitive-load signals"],
    allowedTools: ["cognitive-operating-model"],
    acceptance: "Never lowers load by deleting the counter-case.",
  }),
  role("red_team", "Red-Team Agent", "Attack the strongest version of a claim/idea.", {
    allowedInputs: ["target claim/idea", "evidence"],
    allowedTools: ["evidence-engine"],
    acceptance: "No strawmanning; quantifies each weakness.",
  }),
  role("calibration", "Calibration Agent", "Compare stated confidence to outcomes.", {
    allowedInputs: ["predictions", "settled outcomes"],
    allowedTools: ["data-excellence", "calibration"],
    acceptance: "Calibration is gated behind sufficient sample size.",
  }),
  role("trust_ledger", "Trust Ledger Agent", "Freeze recommendation state into receipts.", {
    allowedInputs: ["recommendation", "reasoning trace"],
    allowedTools: ["trust-ledger"],
    acceptance: "Receipts are immutable point-in-time captures.",
  }),
  role("jarvis_orchestrator", "Jarvis Orchestrator", "Compose agents; resolve/escalate disagreement.", {
    allowedInputs: ["all agent verdicts"],
    allowedTools: ["all (read)", "human-approval-gate"],
    escalationTriggers: ["unresolved agent disagreement", "owner-gated action requested"],
    ownerGatedActions: ["any action an underlying agent gated"],
    maxTier: "operator",
    acceptance: "Surfaces a debate summary; never overrides an owner gate.",
  }),
] as const;

/** Look up an agent role contract by id. */
export function getAgentRoleContract(id: string): AgentRoleContract | undefined {
  return AGENT_ROLES.find((a) => a.id === id);
}

// ─────────────────────────────────────────────────────────────────────────────
// Orchestration objects
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentRun {
  readonly runId: string;
  readonly agentId: string;
  readonly startedAt: string;
  readonly inputsRef: string;
  readonly status: "running" | "complete" | "escalated" | "failed";
}

export interface AgentVerdict {
  readonly runId: string;
  readonly agentId: string;
  readonly conclusion: string;
  readonly confidence: GseScore;
  readonly evidenceRefs: readonly string[];
  readonly flags: readonly string[];
}

export interface AgentDisagreement {
  readonly claimRef: string;
  readonly verdicts: readonly AgentVerdict[];
  readonly axis: string;
  readonly resolved: boolean;
}

export interface AgentEscalation {
  readonly reason: string;
  readonly fromAgentId: string;
  readonly requiresOwner: boolean;
  readonly proposedAction: string;
}

export interface HumanApprovalGate {
  readonly action: string;
  readonly requestedBy: string;
  readonly approved: boolean | null; // null = pending
  readonly approver?: string;
}

export interface MultiAgentDebateSummary {
  readonly claimRef: string;
  readonly agreements: readonly string[];
  readonly disagreements: readonly AgentDisagreement[];
  readonly netRecommendation: string;
  readonly netConfidence: GseScore;
  readonly openEscalations: readonly AgentEscalation[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Trust score
// ─────────────────────────────────────────────────────────────────────────────

export interface AgentTrustSignals {
  readonly role: AgentRoleContract;
  /** 0..100 calibrated reliability from observed runs, if any. */
  readonly calibratedReliability?: number;
  /** Number of runs observed (more runs → more earned trust possible). */
  readonly runsObserved?: number;
}

/**
 * Score how much autonomy a constrained agent has earned (0..100, higher is
 * better). Contract completeness can earn up to ~70; the remaining ~30 is EARNED
 * from a calibrated track record. Without observed runs, an agent cannot reach
 * the very-high band — autonomy is earned, not declared. Owner-gated actions are
 * never unlocked by this score; they always require the human approval gate.
 */
export function scoreAgentTrust(s: AgentTrustSignals): GseScore {
  const r = s.role;
  const flags: string[] = [];
  let contract = 0;

  if (r.allowedInputs.length > 0) contract += 12;
  else flags.push("no allowed inputs declared");
  if (r.forbiddenInputs.length > 0) contract += 12;
  else flags.push("no forbidden inputs declared");
  if (r.escalationTriggers.length > 0) contract += 12;
  else flags.push("no escalation triggers");
  if (r.failureModes.length > 0) contract += 10;
  else flags.push("no failure modes mapped");
  if (r.outputSchema.trim().length > 0) contract += 8;
  if (r.acceptance.trim().length > 0) contract += 6;
  if (r.ownerGatedActions.length > 0 || r.maxTier !== "operator") contract += 10;

  const runs = s.runsObserved ?? 0;
  const reliability = clampScore(s.calibratedReliability ?? 0);
  // Earned trust saturates with run count and scales with reliability.
  const runFactor = Math.min(1, runs / 50);
  const earned = (reliability / 100) * runFactor * 30;
  if (runs === 0) flags.push("no observed runs — cannot earn high autonomy yet");

  return makeScore("agent_trust", contract + earned, {
    confidence: runs >= 20 ? "supported" : "tentative",
    rationale: [
      `contract completeness ${contract}/70`,
      `earned ${earned.toFixed(0)}/30 from ${runs} run(s) @ reliability ${reliability}`,
      `max tier ${r.maxTier}`,
    ],
    flags,
  });
}
