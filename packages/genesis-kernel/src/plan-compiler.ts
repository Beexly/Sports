/**
 * Metacortex Plan Compiler v0 (docs/genesis/FIRST_BUILD_CONTRACT.md §9,
 * docs/genesis/META_COMPILER_SPEC.md §5/§11's v0 boundary). Pure, synchronous,
 * zero side effects: no network/DB/model/fs calls anywhere in this module.
 *
 * Node kinds are a BOUNDED v0 subset of META_COMPILER_SPEC.md §4.1's full
 * 30-class taxonomy — only the seven actually exercised by the four fixture
 * candidates (RIGHTS_CHECK, SOURCE_ACQUIRE, RETRIEVE, MODEL_INFER,
 * POLICY_CHECK, PROOF_COMMIT, HUMAN_REVIEW). Inventing unused enum members
 * for the remaining 23 would be exactly the "pretend to be complete" the
 * Twin/Metacortex specs warn against (Twin spec §12).
 */

import type {
  AudienceClass,
  CandidatePlan,
  FixtureCapabilityCandidate,
  IntelligenceContract,
  PlanEdge,
  PlanNode,
  RejectedPlan,
} from "./contracts";
import { evaluateHardConstraints, failedConstraintNames, isEligible, type TemporalCandidate } from "./hard-constraints";
import { OWNER_GATE_STATES } from "./contracts";

export type PlanDecisionOutcome =
  | { readonly decision: "SELECTED"; readonly selected: CandidatePlan; readonly rejected: readonly RejectedPlan[] }
  | { readonly decision: "OWNER_GATE"; readonly selected: CandidatePlan; readonly rejected: readonly RejectedPlan[] }
  | { readonly decision: "ABSTAINED"; readonly selected: CandidatePlan; readonly rejected: readonly RejectedPlan[] }
  | { readonly decision: "NO_VALID_PLAN"; readonly selected: null; readonly rejected: readonly RejectedPlan[] };

// ── Node compilation (deterministic per candidate kind) ─────────────────────

function nodesFor(candidate: FixtureCapabilityCandidate): readonly PlanNode[] {
  const cap = { capabilityId: candidate.id, capabilityRevision: candidate.version };
  if (candidate.kind === "MODEL") {
    return [
      { nodeId: `${candidate.id}:retrieve`, kind: "RETRIEVE", ...cap },
      { nodeId: `${candidate.id}:infer`, kind: "MODEL_INFER", ...cap },
      { nodeId: `${candidate.id}:policy`, kind: "POLICY_CHECK", ...cap },
      { nodeId: `${candidate.id}:proof`, kind: "PROOF_COMMIT", ...cap },
    ];
  }
  if (candidate.kind === "SOURCE") {
    return [
      { nodeId: `${candidate.id}:rights`, kind: "RIGHTS_CHECK", ...cap },
      { nodeId: `${candidate.id}:acquire`, kind: "SOURCE_ACQUIRE", ...cap },
      { nodeId: `${candidate.id}:proof`, kind: "PROOF_COMMIT", ...cap },
    ];
  }
  // HUMAN_REVIEW
  return [{ nodeId: `${candidate.id}:review`, kind: "HUMAN_REVIEW", ...cap }];
}

function edgesFor(nodes: readonly PlanNode[]): readonly PlanEdge[] {
  const edges: PlanEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i += 1) {
    const from = nodes[i]!;
    const to = nodes[i + 1]!;
    const kind: PlanEdge["kind"] = to.kind === "PROOF_COMMIT" ? "PROOF" : to.kind === "POLICY_CHECK" ? "POLICY" : "DATA";
    edges.push({ from: from.nodeId, to: to.nodeId, kind });
  }
  return edges;
}

// ── GENESIS_UTILITY_V0 (docs/genesis/FIRST_BUILD_CONTRACT.md §9.4) ─────────
//
// U = .30*quality + .15*evidenceStrength + .10*(1-uncertainty)
//   + .25*(1-cost/budgetCost) + .10*(1-latency/budgetLatency)
//   + .05*resilience + .05*privacyFit - .05*complexity
//
// Every term is DERIVED from real candidate/contract/plan fields (never a
// per-candidate magic constant): evidenceStrength from requiresVettedEvidence
// (vetted evidence is stronger); uncertainty as the complement of
// qualityClass; resilience from implementationState (a live, hardened
// capability degrades less than a shadow/pure one); privacyFit from
// remoteExecution (local execution never leaves the privacy boundary);
// complexity from the compiled plan's own node count. A v0 planning
// heuristic, not a scientific claim (per the spec's own framing) — the
// formula and every weight are named and documented here so a reviewer can
// recompute by hand.

const RESILIENCE_BY_STATE: Readonly<Record<string, number>> = {
  LIVE_PUBLIC: 0.9,
  LIVE_INTERNAL: 0.8,
  IMPLEMENTED_PERSISTED: 0.7,
  SHADOW_ONLY: 0.6,
  IMPLEMENTED_PURE: 0.5,
  FOUNDER_GATED: 0.4,
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function computeUtility(candidate: FixtureCapabilityCandidate, contract: IntelligenceContract, nodeCount: number): number {
  const quality = clamp01(candidate.qualityClass);
  const evidenceStrength = candidate.requiresVettedEvidence ? 0.9 : 0.3;
  const uncertainty = clamp01(1 - candidate.qualityClass);
  const costTerm = clamp01(1 - candidate.estimatedCostUsd / contract.budget.maximumCostUsd);
  const latencyTerm = clamp01(1 - candidate.estimatedLatencyMs / contract.budget.maximumLatencyMs);
  const resilience = RESILIENCE_BY_STATE[candidate.implementationState] ?? 0.5;
  const privacyFit = candidate.remoteExecution ? 0.6 : 1.0;
  const complexity = clamp01(nodeCount / 6);

  return (
    0.3 * quality +
    0.15 * evidenceStrength +
    0.1 * (1 - uncertainty) +
    0.25 * costTerm +
    0.1 * latencyTerm +
    0.05 * resilience +
    0.05 * privacyFit -
    0.05 * complexity
  );
}

// ── Compilation ───────────────────────────────────────────────────────────

interface CompiledCandidate {
  readonly candidate: FixtureCapabilityCandidate;
  readonly plan: CandidatePlan;
  readonly eligible: boolean;
  readonly failedConstraints: readonly string[];
}

function compileOne(candidate: TemporalCandidate, contract: IntelligenceContract, audience: AudienceClass): CompiledCandidate {
  const results = evaluateHardConstraints(candidate, contract, audience);
  const eligible = isEligible(results);
  const nodes = nodesFor(candidate);
  const edges = edgesFor(nodes);
  const utility = eligible && !candidate.abstentionFallback ? computeUtility(candidate, contract, nodes.length) : null;

  const plan: CandidatePlan = {
    planId: `${contract.contractId}:${candidate.id}`,
    contractId: contract.contractId,
    nodes,
    edges,
    assumptions: [
      {
        id: `${candidate.id}:vetted-evidence-assumption`,
        statement: candidate.requiresVettedEvidence
          ? "Evidence supplied to this plan has already cleared source-rights review before compilation."
          : "This candidate does not assume pre-vetted evidence.",
      },
    ],
    hardConstraintResults: results,
    estimate: {
      costUsd: candidate.estimatedCostUsd,
      latencyMs: candidate.estimatedLatencyMs,
      qualityClass: candidate.qualityClass,
      utility,
    },
  };

  return { candidate, plan, eligible, failedConstraints: failedConstraintNames(results) };
}

/**
 * Compile a bounded set of candidates against one contract. Deterministic,
 * pure: `repositoryCommit`/`generatedAt` are NOT touched here — those are
 * injected only at the plan-receipt.ts boundary.
 */
export function compileCandidates(
  contract: IntelligenceContract,
  candidates: readonly TemporalCandidate[],
): PlanDecisionOutcome {
  const compiled = candidates.map((c) => compileOne(c, contract, contract.audience));

  const rankable = compiled.filter((c) => c.eligible && !c.candidate.abstentionFallback);
  const fallback = compiled.filter((c) => c.eligible && c.candidate.abstentionFallback);
  const hardRejected = compiled.filter((c) => !c.eligible);

  if (rankable.length > 0) {
    const sorted = [...rankable].sort((a, b) => {
      const ua = a.plan.estimate.utility ?? -Infinity;
      const ub = b.plan.estimate.utility ?? -Infinity;
      if (ua !== ub) return ub - ua; // utility desc
      if (a.candidate.estimatedCostUsd !== b.candidate.estimatedCostUsd) {
        return a.candidate.estimatedCostUsd - b.candidate.estimatedCostUsd; // cost asc
      }
      return a.candidate.id < b.candidate.id ? -1 : 1; // id asc
    });
    const winner = sorted[0]!;
    const runnersUp = sorted.slice(1);

    const rejected: RejectedPlan[] = [
      ...runnersUp.map((c) => ({ plan: c.plan, failedConstraints: [] as readonly string[] })),
      ...fallback.map((c) => ({
        plan: {
          ...c.plan,
          hardConstraintResults: [
            ...c.plan.hardConstraintResults,
            { constraint: "ABSTENTION_FALLBACK_NOT_NEEDED", satisfied: false, reason: "A rankable, non-fallback candidate was selected; abstention is not required." },
          ],
        },
        failedConstraints: ["ABSTENTION_FALLBACK_NOT_NEEDED"],
      })),
      ...hardRejected.map((c) => ({ plan: c.plan, failedConstraints: c.failedConstraints })),
    ];

    const decision = OWNER_GATE_STATES.includes(winner.candidate.implementationState) ? "OWNER_GATE" : "SELECTED";
    return { decision, selected: winner.plan, rejected } as PlanDecisionOutcome;
  }

  // No rankable survivor: route to the abstention fallback, or fail closed.
  const eligibleFallback = fallback[0];
  if (eligibleFallback && contract.uncertainty.allowAbstention) {
    const rejected: RejectedPlan[] = hardRejected.map((c) => ({ plan: c.plan, failedConstraints: c.failedConstraints }));
    return { decision: "ABSTAINED", selected: eligibleFallback.plan, rejected };
  }

  const rejected: RejectedPlan[] = [
    ...hardRejected.map((c) => ({ plan: c.plan, failedConstraints: c.failedConstraints })),
    ...fallback.map((c) => ({
      plan: {
        ...c.plan,
        hardConstraintResults: [
          ...c.plan.hardConstraintResults,
          { constraint: "ABSTENTION_NOT_ALLOWED", satisfied: false, reason: "The contract's uncertainty policy does not allow abstention." },
        ],
      },
      failedConstraints: ["ABSTENTION_NOT_ALLOWED"],
    })),
  ];
  return { decision: "NO_VALID_PLAN", selected: null, rejected };
}
