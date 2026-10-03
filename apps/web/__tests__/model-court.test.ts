import { describe, it, expect } from "vitest";
import { tryModelChange, type ModelChangeProposal } from "@/lib/model/model-court";

function proposal(overrides: Partial<ModelChangeProposal> = {}): ModelChangeProposal {
  return {
    id: "mc1",
    fromVersion: "v5.0.0",
    toVersion: "v6.0.0",
    prosecution: "the new pressure factor may overfit recent weeks and degrade on cold teams",
    defense: "improves out-of-sample CLV beat-rate without harming calibration",
    falsifier: "OOS Brier worse than champion by >0.5% would kill it",
    expectedLift: "+1.2% OOS beat-close rate",
    evidence: ["shadow run 2026-05 OOS report", "champion/challenger comparison"],
    rollbackPlan: "revert MODEL_VERSION to v5.0.0; receipts keep their stamped version",
    ownerApproved: true,
    oosSampleSize: 180,
    calibrationRegressed: false,
    ...overrides,
  };
}

describe("model court", () => {
  it("promotes a fully-argued, evidenced, owner-approved change", () => {
    const r = tryModelChange(proposal());
    expect(r.verdict).toBe("PROMOTE");
    expect(r.blockers).toEqual([]);
  });

  it("holds without a prosecution / defense / falsifier / rollback", () => {
    expect(tryModelChange(proposal({ prosecution: "" })).verdict).toBe("HOLD");
    expect(tryModelChange(proposal({ defense: "  " })).verdict).toBe("HOLD");
    expect(tryModelChange(proposal({ falsifier: "" })).verdict).toBe("HOLD");
    expect(tryModelChange(proposal({ rollbackPlan: "" })).verdict).toBe("HOLD");
  });

  it("holds without shadow/OOS evidence", () => {
    expect(tryModelChange(proposal({ evidence: [] })).verdict).toBe("HOLD");
  });

  it("holds on an insufficient out-of-sample sample", () => {
    const r = tryModelChange(proposal({ oosSampleSize: 40 }));
    expect(r.verdict).toBe("HOLD");
    expect(r.blockers.join(" ")).toMatch(/out-of-sample sample too small/);
  });

  it("auto-holds on a calibration regression", () => {
    const r = tryModelChange(proposal({ calibrationRegressed: true }));
    expect(r.verdict).toBe("HOLD");
    expect(r.blockers.join(" ")).toMatch(/calibration regressed/);
  });

  it("requires owner approval for a model-version change", () => {
    expect(tryModelChange(proposal({ ownerApproved: false })).verdict).toBe("HOLD");
  });
});
