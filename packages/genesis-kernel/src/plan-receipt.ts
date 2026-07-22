/**
 * Plan Receipt assembly (docs/genesis/FIRST_BUILD_CONTRACT.md §7.4/§9.5).
 * Pure: `repositoryCommit` and `generatedAt` are INJECTED inputs, never
 * sourced here via git/child_process — that keeps this module free of side
 * effects and makes identical inputs produce identical hashes.
 */

import { canonicalHash } from "./canonical-json";
import {
  PLANNER_VERSION,
  RECEIPT_VERSION,
  UTILITY_FUNCTION,
  type IntelligenceContract,
  type PlanReceipt,
  type ProofObligation,
} from "./contracts";
import type { PlanDecisionOutcome } from "./plan-compiler";

export interface BuildPlanReceiptInput {
  readonly contract: IntelligenceContract;
  readonly outcome: PlanDecisionOutcome;
  readonly codebaseTwinHash: string;
  readonly contractHash: string;
  readonly candidateSetHash: string;
  readonly repositoryCommit: string;
  readonly generatedAt: string;
}

function buildProofObligations(contract: IntelligenceContract, input: BuildPlanReceiptInput): readonly ProofObligation[] {
  const obligations: ProofObligation[] = [];
  if (contract.proof.requirePlanReceipt) obligations.push({ type: "PLAN_RECEIPT" });
  if (contract.proof.requireCapabilityRevisions) {
    const revisions: Record<string, string> = {};
    for (const node of input.outcome.selected?.nodes ?? []) revisions[node.capabilityId] = node.capabilityRevision;
    obligations.push({ type: "CAPABILITY_REVISIONS", revisions });
  }
  if (contract.proof.requireInputHashes) {
    obligations.push({
      type: "INPUT_HASHES",
      contractHash: input.contractHash,
      candidateSetHash: input.candidateSetHash,
      codebaseTwinHash: input.codebaseTwinHash,
    });
  }
  return obligations;
}

/** Everything the receipt commits to EXCEPT `generatedAt` and `receiptHash` itself. */
function semanticView(input: BuildPlanReceiptInput, proofObligations: readonly ProofObligation[]) {
  return {
    receiptVersion: RECEIPT_VERSION,
    plannerVersion: PLANNER_VERSION,
    repositoryCommit: input.repositoryCommit,
    codebaseTwinHash: input.codebaseTwinHash,
    contractHash: input.contractHash,
    selectedPlan: input.outcome.selected,
    rejectedPlans: input.outcome.rejected,
    decision: input.outcome.decision,
    proofObligations,
    utilityFunction: UTILITY_FUNCTION,
  };
}

export function buildPlanReceipt(input: BuildPlanReceiptInput): PlanReceipt {
  const proofObligations = buildProofObligations(input.contract, input);
  const semantic = semanticView(input, proofObligations);
  const receiptHash = canonicalHash(semantic);

  return {
    ...semantic,
    generatedAt: input.generatedAt,
    receiptHash,
  };
}
