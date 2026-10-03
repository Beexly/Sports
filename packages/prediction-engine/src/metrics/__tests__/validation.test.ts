import { describe, expect, it } from "vitest";
import {
  rightsCleanliness,
  sourcePoliciesAllowed,
  uncertaintyFromEvidence,
  validateSourcePolicies,
  type MetricSourcePolicy,
} from "../core/validation.js";

const approvedPolicy: MetricSourcePolicy = {
  sourceId: "the-odds-api",
  status: "approved",
  allowedForModeling: true,
};

const blockedPolicy: MetricSourcePolicy = {
  sourceId: "blocked-src",
  status: "blocked",
  allowedForModeling: true,
};

describe("rightsCleanliness", () => {
  it("scores clean statuses at 1", () => {
    expect(rightsCleanliness("allowed")).toBe(1);
    expect(rightsCleanliness("approved")).toBe(1);
  });

  it("scores review-tier statuses at 0.6", () => {
    expect(rightsCleanliness("benchmark_only")).toBe(0.6);
    expect(rightsCleanliness("manual_review")).toBe(0.6);
    expect(rightsCleanliness("restricted")).toBe(0.6);
  });

  it("scores deny/unknown statuses at 0", () => {
    expect(rightsCleanliness("blocked")).toBe(0);
    expect(rightsCleanliness("excluded")).toBe(0);
    expect(rightsCleanliness("permission_required")).toBe(0);
    expect(rightsCleanliness("unknown")).toBe(0);
  });
});

describe("sourcePoliciesAllowed", () => {
  it("fails closed on an empty policy list", () => {
    expect(sourcePoliciesAllowed([])).toBe(false);
  });

  it("allows a fully clean, modeling-cleared policy", () => {
    expect(sourcePoliciesAllowed([approvedPolicy])).toBe(true);
  });

  it("denies when any policy is not modeling-cleared", () => {
    expect(sourcePoliciesAllowed([approvedPolicy, { ...approvedPolicy, allowedForModeling: false }])).toBe(false);
  });

  it("denies when any policy has zero rights cleanliness", () => {
    expect(sourcePoliciesAllowed([approvedPolicy, blockedPolicy])).toBe(false);
  });
});

describe("validateSourcePolicies", () => {
  it("fails closed with a BLOCK issue when there are no policies", () => {
    const result = validateSourcePolicies([]);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe("FAIL_CLOSED");
    expect(result.issues.some((issue) => issue.code === "missing_source_policy" && issue.severity === "BLOCK")).toBe(true);
  });

  it("passes clean policies", () => {
    const result = validateSourcePolicies([approvedPolicy]);
    expect(result.allowed).toBe(true);
    expect(result.status).toBe("PASS");
    expect(result.issues).toHaveLength(0);
  });

  it("fails closed on a blocked-status policy", () => {
    const result = validateSourcePolicies([blockedPolicy]);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe("FAIL_CLOSED");
    expect(result.issues.some((issue) => issue.code === "source_policy_block")).toBe(true);
  });

  it("fails closed when a policy is not cleared for modeling", () => {
    const result = validateSourcePolicies([{ ...approvedPolicy, allowedForModeling: false }]);
    expect(result.allowed).toBe(false);
    expect(result.status).toBe("FAIL_CLOSED");
  });
});

describe("uncertaintyFromEvidence", () => {
  it("returns HIGH when the source policy is empty (fails open-eyed on missing rights)", () => {
    expect(uncertaintyFromEvidence({ sampleSize: 1000, sourcePolicy: [] })).toBe("HIGH");
  });

  it("returns HIGH when the source policy is blocked", () => {
    expect(uncertaintyFromEvidence({ sampleSize: 1000, sourcePolicy: [blockedPolicy] })).toBe("HIGH");
  });

  it("enforces the sampleSize < 50 boundary: 49 -> HIGH, 50 -> not HIGH", () => {
    expect(uncertaintyFromEvidence({ sampleSize: 49, sourcePolicy: [approvedPolicy] })).toBe("HIGH");
    expect(uncertaintyFromEvidence({ sampleSize: 50, sourcePolicy: [approvedPolicy] })).toBe("MEDIUM");
  });

  it("enforces the sampleSize < 250 boundary: 249 -> MEDIUM, 250 -> LOW", () => {
    expect(uncertaintyFromEvidence({ sampleSize: 249, sourcePolicy: [approvedPolicy] })).toBe("MEDIUM");
    expect(uncertaintyFromEvidence({ sampleSize: 250, sourcePolicy: [approvedPolicy] })).toBe("LOW");
  });

  it("returns HIGH when more than two proxies are relied on", () => {
    expect(uncertaintyFromEvidence({ sampleSize: 1000, sourcePolicy: [approvedPolicy], proxyCount: 3 })).toBe("HIGH");
  });

  it("returns MEDIUM for one or two proxies on otherwise-clean evidence", () => {
    expect(uncertaintyFromEvidence({ sampleSize: 1000, sourcePolicy: [approvedPolicy], proxyCount: 1 })).toBe("MEDIUM");
    expect(uncertaintyFromEvidence({ sampleSize: 1000, sourcePolicy: [approvedPolicy], proxyCount: 2 })).toBe("MEDIUM");
  });

  it("enforces the driftPressure bands: >=70 -> HIGH, >=35 -> MEDIUM, below -> LOW", () => {
    expect(uncertaintyFromEvidence({ sampleSize: 1000, sourcePolicy: [approvedPolicy], driftPressure: 70 })).toBe("HIGH");
    expect(uncertaintyFromEvidence({ sampleSize: 1000, sourcePolicy: [approvedPolicy], driftPressure: 35 })).toBe("MEDIUM");
    expect(uncertaintyFromEvidence({ sampleSize: 1000, sourcePolicy: [approvedPolicy], driftPressure: 34 })).toBe("LOW");
  });

  it("returns LOW only when every evidence signal is strong", () => {
    expect(uncertaintyFromEvidence({ sampleSize: 1000, sourcePolicy: [approvedPolicy], proxyCount: 0, driftPressure: 0 })).toBe("LOW");
  });
});
