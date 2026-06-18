/**
 * Cockpit Scoring Engine (Workstream J5).
 *
 * PURE, DETERMINISTIC, NO I/O. Given a `ScoringInput`, `scoreCandidate()`
 * returns a structured `ScoringResult` the cockpit uses to route a candidate
 * action BEFORE it reaches the owner's Approval Queue.
 *
 * The routing decision is TRUST-GUARDRAIL-ALIGNED. The hard rules, in order of
 * precedence (a stricter rule always wins):
 *
 *   1. FORBIDDEN / L5  → BLOCK.  A forbidden external action (PUBLISH,
 *      SEND_EXTERNAL, SPEND_MONEY, CHANGE_MODEL_WEIGHT, …) or an OWNER_ONLY-
 *      equivalent "external action" is hard-stopped. It is NEVER routed to the
 *      owner as an approvable item — the cockpit cannot make it safe.
 *
 *   2. SENSITIVE DOMAIN → HIGH complianceRisk, never AUTO_SAVE_INTERNAL.
 *      Any action touching public picks, model weights / calibration, revenue
 *      claims, or rights / scraping carries HIGH compliance risk. It must reach
 *      a human: SEND_TO_APPROVAL, or ESCALATE when stakes are higher.
 *
 *      The heuristic compliance risk derived here is MERGED with the optional
 *      external J12 Compliance/Risk signal (`input.complianceSignal`): the axis
 *      becomes `max(heuristic, signal.complianceRisk)` and a `signal.forceBlock`
 *      (the scorer's own BLOCK verdict) hard-stops routing to BLOCK. This is
 *      purely additive — it can only make compliance risk RICHER and routing
 *      STRICTER, never less strict.
 *
 *   3. OWNER APPROVAL REQUIRED → SEND_TO_APPROVAL or ESCALATE, never auto.
 *      `ownerApprovalRequired` or an OWNER_ONLY authority rung means a human
 *      must decide. The engine routes to the owner, never internal-only.
 *
 *   4. COMPLIANCE_HOLD risk → ESCALATE.  The cockpit's own "stop" risk level
 *      is treated as an escalation, never an auto-save.
 *
 *   5. Otherwise route on the axes: weak evidence → REQUIRE_EDITS; low-risk,
 *      reversible, isolated, internal-only work → AUTO_SAVE_INTERNAL; the
 *      remainder → SEND_TO_APPROVAL.
 *
 * Nothing here reads the DB, env, clock, or network. The same input always
 * yields the same output.
 */

import { FORBIDDEN_EXTERNAL_ACTIONS } from "@/lib/agents/agent-capabilities";
import type {
  ExpectedImpactHint,
  RoutingDecision,
  ScoringInput,
  ScoringResult,
} from "./types";

export type {
  CockpitComplianceInput,
  ExpectedImpactHint,
  RoutingDecision,
  ScoringInput,
  ScoringResult,
  SensitiveDomain,
} from "./types";

// Clamp to the unit interval. Defined locally to keep the module dependency-free.
function unit(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

const FORBIDDEN = new Set<string>(FORBIDDEN_EXTERNAL_ACTIONS);

// ── Axis mappings (deterministic, table-driven) ─────────────────────────────

/** complianceRisk floor implied by the cockpit risk level alone. */
function complianceRiskFromLevel(level: ScoringInput["riskLevel"]): number {
  switch (level) {
    case "COMPLIANCE_HOLD":
      return 1.0; // the cockpit's explicit stop
    case "HIGH":
      return 0.8;
    case "MODERATE":
      return 0.4;
    case "LOW":
    default:
      return 0.1;
  }
}

function reversibilityScore(input: ScoringInput): number {
  // Explicitly irreversible work is a hard 0; explicitly reversible is high but
  // tempered by blast radius (a broad reversible change still has reach).
  if (input.reversible === false) return 0;
  const base = input.reversible === true ? 1 : 0.6;
  return unit(base - (blastRadiusScore(input) - 0.5) * 0.4);
}

function blastRadiusScore(input: ScoringInput): number {
  switch (input.blastRadius) {
    case "BROAD":
      return 1.0;
    case "LOCALIZED":
      return 0.5;
    case "ISOLATED":
      return 0.1;
    default:
      return 0.5; // unknown → assume localized, not isolated
  }
}

function evidenceStrengthScore(strength: ScoringInput["evidenceStrength"]): number {
  switch (strength) {
    case "STRONG":
      return 1.0;
    case "MODERATE":
      return 0.66;
    case "WEAK":
      return 0.33;
    case "NONE":
      return 0;
    default:
      return 0.5; // unknown → neutral
  }
}

function expectedImpactScore(hint: ExpectedImpactHint | undefined): number {
  switch (hint) {
    case "HIGH":
      return 1.0;
    case "MEDIUM":
      return 0.66;
    case "LOW":
      return 0.33;
    case "NONE":
      return 0;
    default:
      return 0.33; // unknown → assume low
  }
}

/** Confidence: use the hint when given, else derive from evidence vs. risk. */
function confidenceScore(input: ScoringInput, evidence: number, compliance: number): number {
  if (typeof input.confidenceHint === "number") return unit(input.confidenceHint);
  // Strong evidence raises confidence; high compliance risk lowers it.
  return unit(0.5 + (evidence - 0.5) * 0.6 - compliance * 0.3);
}

// ── Guardrail predicates ────────────────────────────────────────────────────

/** A forbidden external action (or its L5/owner-only equivalent) → BLOCK. */
function isForbidden(input: ScoringInput): boolean {
  return input.action !== undefined && FORBIDDEN.has(input.action);
}

/** Touching any sensitive trust domain → HIGH complianceRisk, never auto. */
function touchesSensitiveDomain(input: ScoringInput): boolean {
  return (input.sensitiveDomains?.length ?? 0) > 0;
}

/** A human must decide: explicit flag or an OWNER_ONLY authority rung. */
function requiresOwner(input: ScoringInput): boolean {
  return input.ownerApprovalRequired === true || input.authorityLevel === "OWNER_ONLY";
}

// ── The scorer ──────────────────────────────────────────────────────────────

export function scoreCandidate(input: ScoringInput): ScoringResult {
  const reasons: string[] = [];

  // Axes first — they are reported regardless of the routing branch taken.
  const blastRadius = blastRadiusScore(input);
  const reversibility = reversibilityScore(input);
  const evidenceStrength = evidenceStrengthScore(input.evidenceStrength);
  const expectedImpact = expectedImpactScore(input.expectedImpact);

  // complianceRisk starts at the floor implied by the risk level and is forced
  // HIGH (>= 0.85) whenever a sensitive trust domain is touched.
  let complianceRisk = complianceRiskFromLevel(input.riskLevel);
  const sensitive = touchesSensitiveDomain(input);
  if (sensitive) {
    complianceRisk = Math.max(complianceRisk, 0.85);
    reasons.push(
      `Touches sensitive domain(s): ${input.sensitiveDomains!.join(", ")} — HIGH compliance risk; never auto-saved.`
    );
  }

  // J12 → J5 wiring: MERGE the external Compliance/Risk signal (strictest-wins).
  // complianceRisk becomes the max of the heuristic and the scorer's signal, so
  // the axis only ever gets RICHER, never less strict. A forced BLOCK is
  // captured here and routed below with the same precedence as a forbidden
  // action (Rule 1). This is additive and pure — no I/O, no new precedence.
  const signal = input.complianceSignal;
  const complianceForceBlock =
    signal !== undefined && (signal.forceBlock === true || signal.verdict === "BLOCK");
  if (signal !== undefined) {
    complianceRisk = Math.max(complianceRisk, unit(signal.complianceRisk));
    if (signal.reasons && signal.reasons.length > 0) {
      reasons.push(
        `Compliance scorer (J12) [${signal.verdict ?? "?"}]: ${signal.reasons.join(" ")}`
      );
    } else {
      reasons.push(
        `Compliance scorer (J12) signal merged: complianceRisk=${unit(signal.complianceRisk).toFixed(2)}, verdict=${signal.verdict ?? "?"}.`
      );
    }
  }
  complianceRisk = unit(complianceRisk);

  const confidence = confidenceScore(input, evidenceStrength, complianceRisk);

  // ── Routing: strictest rule wins ───────────────────────────────────────────

  // Rule 1: forbidden / L5 external action → BLOCK (hard stop, never approvable).
  if (isForbidden(input)) {
    reasons.unshift(
      `Action "${input.action}" is a forbidden external action (L5) — hard-stopped, never routed to the owner.`
    );
    return result("BLOCK", {
      confidence,
      complianceRisk: 1,
      reversibility,
      blastRadius,
      evidenceStrength,
      expectedImpact,
      reasons,
    });
  }

  // Rule 1b: an external Compliance/Risk BLOCK is non-negotiable — hard-stop to
  // BLOCK regardless of every other axis (same precedence as a forbidden action).
  if (complianceForceBlock) {
    reasons.unshift(
      "Compliance/Risk scorer (J12) returned BLOCK — hard-stopped, never routed to the owner as approvable."
    );
    return result("BLOCK", {
      confidence,
      complianceRisk: 1,
      reversibility,
      blastRadius,
      evidenceStrength,
      expectedImpact,
      reasons,
    });
  }

  // Rule 4 (checked before owner/sensitive so an explicit stop always escalates):
  // a COMPLIANCE_HOLD is the cockpit's own stop and must reach the owner flagged.
  if (input.riskLevel === "COMPLIANCE_HOLD") {
    reasons.unshift("Risk level COMPLIANCE_HOLD — escalated to the owner; never auto-saved.");
    return result("ESCALATE", {
      confidence,
      complianceRisk,
      reversibility,
      blastRadius,
      evidenceStrength,
      expectedImpact,
      reasons,
    });
  }

  // Rule 2+3: a human must decide — sensitive domain OR owner approval required.
  // Escalate (rather than a plain approval) when the stakes are high: HIGH risk,
  // broad blast radius, or an OWNER_ONLY rung. Otherwise send to the queue.
  const owner = requiresOwner(input);
  if (sensitive || owner) {
    if (owner) {
      reasons.unshift(
        input.authorityLevel === "OWNER_ONLY"
          ? "Authority OWNER_ONLY — only the owner may decide; never auto-saved."
          : "Owner approval required — routed to a human; never auto-saved."
      );
    }
    const highStakes =
      input.riskLevel === "HIGH" ||
      input.blastRadius === "BROAD" ||
      input.authorityLevel === "OWNER_ONLY";
    if (highStakes) {
      reasons.push("High stakes (HIGH risk / broad blast radius / owner-only) — escalated.");
      return result("ESCALATE", {
        confidence,
        complianceRisk,
        reversibility,
        blastRadius,
        evidenceStrength,
        expectedImpact,
        reasons,
      });
    }
    reasons.push("Requires a human decision — sent to the Approval Queue.");
    return result("SEND_TO_APPROVAL", {
      confidence,
      complianceRisk,
      reversibility,
      blastRadius,
      evidenceStrength,
      expectedImpact,
      reasons,
    });
  }

  // Rule 5a: insufficient evidence → send back for edits before it can advance.
  if (evidenceStrength < 0.34) {
    reasons.push("Evidence is missing or weak — returned to the agent for edits.");
    return result("REQUIRE_EDITS", {
      confidence,
      complianceRisk,
      reversibility,
      blastRadius,
      evidenceStrength,
      expectedImpact,
      reasons,
    });
  }

  // Rule 5b: safe, reversible, isolated, internal-only, low-risk → AUTO_SAVE.
  // This is the ONLY branch that can auto-save, and it is unreachable for any
  // sensitive-domain / owner-approval / forbidden / compliance-hold candidate
  // because all of those returned above.
  const safeToAutoSave =
    input.riskLevel === "LOW" &&
    complianceRisk <= 0.2 &&
    reversibility >= 0.8 &&
    input.blastRadius !== "BROAD" &&
    input.reversible !== false;
  if (safeToAutoSave) {
    reasons.push("Low-risk, reversible, internal-only work — auto-saved without owner attention.");
    return result("AUTO_SAVE_INTERNAL", {
      confidence,
      complianceRisk,
      reversibility,
      blastRadius,
      evidenceStrength,
      expectedImpact,
      reasons,
    });
  }

  // Rule 5c: everything else gets a normal owner decision.
  reasons.push("Not auto-save-eligible — sent to the Approval Queue for an owner decision.");
  return result("SEND_TO_APPROVAL", {
    confidence,
    complianceRisk,
    reversibility,
    blastRadius,
    evidenceStrength,
    expectedImpact,
    reasons,
  });
}

// Small helper so each branch assembles the immutable result identically.
function result(
  routing: RoutingDecision,
  axes: Omit<ScoringResult, "routing">
): ScoringResult {
  return {
    routing,
    confidence: axes.confidence,
    complianceRisk: axes.complianceRisk,
    reversibility: axes.reversibility,
    blastRadius: axes.blastRadius,
    evidenceStrength: axes.evidenceStrength,
    expectedImpact: axes.expectedImpact,
    reasons: Object.freeze([...axes.reasons]),
  };
}
