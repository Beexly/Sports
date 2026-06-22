import { describe, it, expect } from "vitest";
import { buildProofGraph, type ProofGraphInput } from "@/lib/proof/proof-graph";

function full(overrides: Partial<ProofGraphInput> = {}): ProofGraphInput {
  return {
    claimText: "Beat the close on 57% of 220 graded picks.",
    pickId: "pick_1",
    receipt: { contentHash: "abcdef0123456789abcdef", verified: true },
    sourceSnapshotHashes: ["h1", "h2"],
    modelVersion: "v5.0.0",
    settlement: { result: "WIN", settledAt: "2026-06-22T23:00:00.000Z" },
    clv: { verdict: "BEAT_CLOSE", value: 0.03 },
    autopsy: null,
    pickLost: false,
    ...overrides,
  };
}

describe("proof graph", () => {
  it("a complete won-pick chain is auditable and complete", () => {
    const g = buildProofGraph(full());
    expect(g.auditable).toBe(true);
    expect(g.complete).toBe(true);
    expect(g.missing).toEqual([]);
    expect(g.nodes).toHaveLength(8);
  });

  it("is not auditable when the receipt is missing or unverified", () => {
    expect(buildProofGraph(full({ receipt: null })).auditable).toBe(false);
    const unverified = buildProofGraph(full({ receipt: { contentHash: "x", verified: false } }));
    expect(unverified.auditable).toBe(false);
    expect(unverified.missing).toContain("receipt-verification");
  });

  it("requires source snapshots and a model version to be auditable", () => {
    expect(buildProofGraph(full({ sourceSnapshotHashes: [] })).auditable).toBe(false);
    expect(buildProofGraph(full({ modelVersion: null })).auditable).toBe(false);
  });

  it("a LOST pick is incomplete without a loss autopsy (we publish our losses)", () => {
    const lostNoAutopsy = buildProofGraph(full({ pickLost: true, settlement: { result: "LOSS", settledAt: "t" }, autopsy: null }));
    expect(lostNoAutopsy.auditable).toBe(true);
    expect(lostNoAutopsy.complete).toBe(false);
    expect(lostNoAutopsy.missing).toContain("loss-autopsy");

    const lostWithAutopsy = buildProofGraph(full({ pickLost: true, settlement: { result: "LOSS", settledAt: "t" }, autopsy: { id: "a1" } }));
    expect(lostWithAutopsy.complete).toBe(true);
  });

  it("a pre-settlement chain is auditable but not complete", () => {
    const g = buildProofGraph(full({ settlement: null, clv: null }));
    expect(g.auditable).toBe(true);
    expect(g.complete).toBe(false);
    expect(g.missing).toContain("settlement");
  });
});
