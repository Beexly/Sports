import { describe, it, expect } from "vitest";
import {
  proposeImprovement,
  canAutoImplement,
  buildImprovementLoopStatus,
  summarizeImprovementsForOwner,
  getSettledPicksImprovementProposal,
  type ImprovementProposal,
} from "../improvement-loop";

const NOW = "2026-06-12T10:00:00.000Z";

function makeProposal(
  overrides: Partial<Omit<ImprovementProposal, "id" | "status">> = {}
): ImprovementProposal {
  return proposeImprovement({
    type: "PROCESS_CHANGE",
    title: "Add a morning report template",
    rationale: "Reduce review time.",
    expectedGain: "Faster daily triage.",
    riskIfDone: "Low.",
    riskIfNotDone: "Slower mornings.",
    proposedAt: NOW,
    requiresApproval: true,
    affectedComponents: ["docs/ai/jarvis/vault"],
    canAutoImplement: false,
    ...overrides,
  });
}

describe("buildImprovementLoopStatus", () => {
  it("returns canAutomaticallyAdjustPredictionEngine: false — always", () => {
    const status = buildImprovementLoopStatus();
    expect(status.canAutomaticallyAdjustPredictionEngine).toBe(false);
    expect(status.isActive).toBe(false);
    expect(status.proposals.length).toBeGreaterThanOrEqual(1);
    expect(status.truth).toMatch(/manual|approval|not active/i);
  });
});

describe("canAutoImplement", () => {
  it("returns false for calibration changes", () => {
    const proposal = makeProposal({ type: "CALIBRATION_REVIEW", canAutoImplement: true });
    expect(canAutoImplement(proposal)).toBe(false);
  });

  it("returns false for model swaps", () => {
    const proposal = makeProposal({ type: "MODEL_SWAP", canAutoImplement: true });
    expect(canAutoImplement(proposal)).toBe(false);
  });

  it("returns false for anything touching the prediction engine", () => {
    const proposal = makeProposal({
      type: "PROCESS_CHANGE",
      canAutoImplement: true,
      affectedComponents: ["packages/prediction-engine"],
    });
    expect(canAutoImplement(proposal)).toBe(false);
  });
});

describe("proposeImprovement", () => {
  it("creates a proposal with PROPOSED status and approval required", () => {
    const proposal = makeProposal();
    expect(proposal.status).toBe("PROPOSED");
    expect(proposal.requiresApproval).toBe(true);
    expect(proposal.id).toContain("process_change");
  });

  it("forces canAutoImplement false for engine-touching proposals at creation", () => {
    const proposal = makeProposal({ type: "CALIBRATION_REVIEW", canAutoImplement: true });
    expect(proposal.canAutoImplement).toBe(false);
  });
});

describe("getSettledPicksImprovementProposal", () => {
  it("is a standing CALIBRATION_REVIEW proposal that can never auto-implement", () => {
    const proposal = getSettledPicksImprovementProposal();
    expect(proposal.type).toBe("CALIBRATION_REVIEW");
    expect(proposal.canAutoImplement).toBe(false);
    expect(proposal.requiresApproval).toBe(true);
    expect(canAutoImplement(proposal)).toBe(false);
  });
});

describe("summarizeImprovementsForOwner", () => {
  it("handles an empty list", () => {
    expect(summarizeImprovementsForOwner([])).toMatch(/No improvement proposals/i);
  });

  it("never claims the engine adjusts automatically", () => {
    const summary = summarizeImprovementsForOwner([makeProposal()]);
    expect(summary).toContain("1 improvement proposal");
    expect(summary).toMatch(/never adjusted automatically/i);
  });
});
