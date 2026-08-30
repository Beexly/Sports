import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { canonicalHash, canonicalJson } from "../canonical-json";
import type { IntelligenceContract } from "../contracts";
import type { TemporalCandidate } from "../hard-constraints";
import { compileCandidates } from "../plan-compiler";
import { buildPlanReceipt } from "../plan-receipt";

const FIXTURES_DIR = resolve(__dirname, "../fixtures");

function loadContract(): IntelligenceContract {
  return JSON.parse(readFileSync(resolve(FIXTURES_DIR, "internal-brief.contract.json"), "utf8")) as IntelligenceContract;
}

function loadCandidates(): TemporalCandidate[] {
  return JSON.parse(readFileSync(resolve(FIXTURES_DIR, "capability-candidates.example.json"), "utf8")) as TemporalCandidate[];
}

const [A_ID, B_ID, C_ID, D_ID] = [
  "approved-primary-content-route",
  "cheaper-shadow-content-route",
  "unapproved-source-fast-path",
  "human-review-abstention",
];

function receiptFor(contract: IntelligenceContract, candidates: readonly TemporalCandidate[]) {
  const outcome = compileCandidates(contract, candidates);
  return buildPlanReceipt({
    contract,
    outcome,
    codebaseTwinHash: "twin-hash-fixture",
    contractHash: canonicalHash(contract),
    candidateSetHash: canonicalHash(candidates),
    repositoryCommit: "fixture-commit",
    generatedAt: "2026-07-17T12:00:00.000Z",
  });
}

describe("Metacortex Plan Compiler v0", () => {
  it("6. the policy-invalid cheapest candidate (C, cost 0, quality .99) never wins", () => {
    const outcome = compileCandidates(loadContract(), loadCandidates());
    expect(outcome.selected?.planId.endsWith(C_ID)).toBe(false);
    const cRejection = outcome.rejected.find((r) => r.plan.planId.endsWith(C_ID));
    expect(cRejection).toBeDefined();
    expect(cRejection!.failedConstraints).toContain("SOURCE_CLEARANCE_REQUIRED");
  });

  it("7. the unapproved source is rejected — the planner RECOMPUTES the failure, it does not read the fixture's own hardPolicyEligible flag", () => {
    const candidates = loadCandidates();
    const cFixture = candidates.find((c) => c.id === C_ID)!;
    expect(cFixture.hardPolicyEligible).toBe(false); // the fixture's own annotation
    expect(cFixture.hardPolicyFailure).toBe("SOURCE_CLEARANCE_REQUIRED");

    const outcome = compileCandidates(loadContract(), candidates);
    const cPlan = [...outcome.rejected].find((r) => r.plan.planId.endsWith(C_ID))!;
    const recomputed = cPlan.plan.hardConstraintResults.find((r) => r.constraint === "SOURCE_CLEARANCE_REQUIRED")!;
    expect(recomputed.satisfied).toBe(false); // independently recomputed, matches the fixture's expectation
  });

  it("8. a temporal-cutoff violation is rejected", () => {
    const contract = loadContract();
    const candidates = loadCandidates();
    const lateB = { ...candidates.find((c) => c.id === B_ID)!, id: "late-shadow-route", availableFrom: "2027-01-01T00:00:00.000Z" };
    const outcome = compileCandidates(contract, [...candidates, lateB]);
    const rejection = outcome.rejected.find((r) => r.plan.planId.endsWith("late-shadow-route"));
    expect(rejection).toBeDefined();
    expect(rejection!.failedConstraints).toContain("TEMPORAL_CUTOFF");
  });

  it("9. privacy-incompatible execution is rejected (A and B require remote execution; D does not)", () => {
    const contract: IntelligenceContract = { ...loadContract(), privacy: { ...loadContract().privacy, remoteExecutionAllowed: false } };
    const outcome = compileCandidates(contract, loadCandidates());
    const aRejection = outcome.rejected.find((r) => r.plan.planId.endsWith(A_ID));
    const bRejection = outcome.rejected.find((r) => r.plan.planId.endsWith(B_ID));
    expect(aRejection?.failedConstraints).toContain("PRIVACY_COMPATIBLE");
    expect(bRejection?.failedConstraints).toContain("PRIVACY_COMPATIBLE");
    // D (remoteExecution:false) is unaffected by the privacy tightening — it becomes the abstention selection.
    expect(outcome.decision).toBe("ABSTAINED");
    expect(outcome.selected?.planId.endsWith(D_ID)).toBe(true);
  });

  it("10. the cheaper valid candidate (B) wins over the pricier equivalent (A) at the quality floor — golden formula", () => {
    const outcome = compileCandidates(loadContract(), loadCandidates());
    expect(outcome.decision).toBe("SELECTED");
    expect(outcome.selected?.planId.endsWith(B_ID)).toBe(true);

    const aRejection = outcome.rejected.find((r) => r.plan.planId.endsWith(A_ID))!;
    const aUtility = aRejection.plan.estimate.utility!;
    const bUtility = outcome.selected!.estimate.utility!;
    expect(bUtility).toBeGreaterThan(aUtility);
    // B clears the tier-2 quality floor (0.82 >= 0.80) — it is a legitimately eligible win, not a floor bypass.
    expect(outcome.selected!.estimate.qualityClass).toBeGreaterThanOrEqual(0.8);
  });

  it("11a. an empty rankable survivor set with allowAbstention:true routes to the governed fallback (D)", () => {
    const contract: IntelligenceContract = { ...loadContract(), budget: { ...loadContract().budget, maximumCostUsd: 0 } };
    const outcome = compileCandidates(contract, loadCandidates());
    expect(outcome.decision).toBe("ABSTAINED");
    expect(outcome.selected?.planId.endsWith(D_ID)).toBe(true);
  });

  it("11b. the same starvation with allowAbstention:false yields NO_VALID_PLAN, never a silent selection", () => {
    const base = loadContract();
    const contract: IntelligenceContract = {
      ...base,
      budget: { ...base.budget, maximumCostUsd: 0 },
      uncertainty: { ...base.uncertainty, allowAbstention: false },
    };
    const outcome = compileCandidates(contract, loadCandidates());
    expect(outcome.decision).toBe("NO_VALID_PLAN");
    expect(outcome.selected).toBeNull();
    const dRejection = outcome.rejected.find((r) => r.plan.planId.endsWith(D_ID));
    expect(dRejection?.failedConstraints).toContain("ABSTENTION_NOT_ALLOWED");
  });

  it("12. the receipt lists the selected plan AND every rejected plan, each with named constraints", () => {
    const receipt = receiptFor(loadContract(), loadCandidates());
    expect(receipt.selectedPlan?.planId.endsWith(B_ID)).toBe(true);
    expect(receipt.rejectedPlans).toHaveLength(3); // A (runner-up), C (clearance), D (fallback not needed)
    const aRejection = receipt.rejectedPlans.find((r) => r.plan.planId.endsWith(A_ID))!;
    const cRejection = receipt.rejectedPlans.find((r) => r.plan.planId.endsWith(C_ID))!;
    const dRejection = receipt.rejectedPlans.find((r) => r.plan.planId.endsWith(D_ID))!;
    expect(aRejection.failedConstraints).toEqual([]); // A is eligible, just not the winner
    expect(cRejection.failedConstraints).toContain("SOURCE_CLEARANCE_REQUIRED");
    expect(dRejection.failedConstraints).toContain("ABSTENTION_FALLBACK_NOT_NEEDED");
  });

  describe("13. hash stability", () => {
    it("13a. the same semantic receipt hashes identically across different generatedAt timestamps", () => {
      const contract = loadContract();
      const candidates = loadCandidates();
      const outcome = compileCandidates(contract, candidates);
      const common = {
        contract,
        outcome,
        codebaseTwinHash: "twin-hash-fixture",
        contractHash: canonicalHash(contract),
        candidateSetHash: canonicalHash(candidates),
        repositoryCommit: "fixture-commit",
      };
      const r1 = buildPlanReceipt({ ...common, generatedAt: "2026-07-17T12:00:00.000Z" });
      const r2 = buildPlanReceipt({ ...common, generatedAt: "2030-01-01T00:00:00.000Z" });
      expect(r1.generatedAt).not.toBe(r2.generatedAt);
      expect(r1.receiptHash).toBe(r2.receiptHash);
    });

    it("13b. canonicalJson is stable across genuinely different key insertion order (alphabetic keys, not integer-like)", () => {
      const orderedOne = JSON.parse('{"beta":1,"alpha":2,"gamma":{"z":1,"a":2}}') as unknown;
      const orderedTwo = JSON.parse('{"alpha":2,"gamma":{"a":2,"z":1},"beta":1}') as unknown;
      expect(canonicalJson(orderedOne)).toBe(canonicalJson(orderedTwo));
    });
  });

  it("14. a semantic change (contract budget) changes the receiptHash", () => {
    const contract = loadContract();
    const candidates = loadCandidates();
    const r1 = receiptFor(contract, candidates);
    const mutated: IntelligenceContract = { ...contract, budget: { ...contract.budget, maximumCostUsd: 0.06 } };
    const r2 = receiptFor(mutated, candidates);
    expect(r1.receiptHash).not.toBe(r2.receiptHash);
  });

  describe("15. purity — no network/DB/model calls anywhere in the planner", () => {
    it("15a. plan-compiler.ts, hard-constraints.ts, and plan-receipt.ts import nothing but local modules and node:crypto (via canonical-json.ts)", () => {
      for (const file of ["../plan-compiler.ts", "../hard-constraints.ts", "../plan-receipt.ts"]) {
        const src = readFileSync(resolve(__dirname, file), "utf8");
        const imports = [...src.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
        for (const spec of imports) {
          const isLocal = spec!.startsWith("./") || spec!.startsWith("../");
          expect(isLocal, `${file} imports non-local module: ${spec}`).toBe(true);
        }
      }
    });

    it("15b. compileCandidates and buildPlanReceipt never touch fetch", () => {
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      try {
        const contract = loadContract();
        const candidates = loadCandidates();
        receiptFor(contract, candidates);
        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });

  it("bonus: a FOUNDER_GATED winning candidate forces decision OWNER_GATE, never a silent SELECTED", () => {
    const contract = loadContract();
    const candidates = loadCandidates();
    const gated: TemporalCandidate = {
      ...candidates.find((c) => c.id === A_ID)!,
      id: "founder-gated-route",
      implementationState: "FOUNDER_GATED",
      estimatedCostUsd: 0.001, // cheapest+highest-quality-of-the-rankable set, so it would win on utility
    };
    const outcome = compileCandidates(contract, [gated, ...candidates.filter((c) => c.id !== A_ID)]);
    expect(outcome.decision).toBe("OWNER_GATE");
    expect(outcome.selected?.planId.endsWith("founder-gated-route")).toBe(true);
  });
});
