// Tests for decision/1011-3177v3-data-replication-abstention.ts (vitest).
import { describe, it, expect } from "vitest";
import {
  buildRejectFeatures,
  replicationLabels,
  replicateSample,
  replicaDecision,
  boundaryCosineSimilarity,
  foldStabilityGatePasses,
  abstentionConcentration,
} from "./1011-3177v3-data-replication-abstention.js";

describe("replicationLabels (1011.3177v3)", () => {
  it("encodes the ordinal reject structure", () => {
    expect(replicationLabels(1)).toEqual([-1, -1]); // bet A below both boundaries
    expect(replicationLabels(2)).toEqual([1, -1]); // abstain band between boundaries
    expect(replicationLabels(3)).toEqual([1, 1]); // bet B above both boundaries
  });
});

describe("replicateSample", () => {
  it("builds [x;0]/[x;h] replicas with cost weights", () => {
    const [r1, r2] = replicateSample([0.05, 0.2, 0.1, 3], 2, 1.0, 2.0, 0.5);
    expect(r1.point).toEqual([0.05, 0.2, 0.1, 3, 0]);
    expect(r2.point).toEqual([0.05, 0.2, 0.1, 3, 1.0]);
    expect([r1.label, r2.label]).toEqual([1, -1]);
    expect(r1.weight).toBe(2.0);
    expect(r2.weight).toBe(0.5); // abstain-band cost on the second replica
  });
});

describe("replicaDecision", () => {
  it("follows the paper's three-way rule", () => {
    expect(replicaDecision(-1, -1)).toBe("betA");
    expect(replicaDecision(1, 1)).toBe("betB");
    expect(replicaDecision(-1, 1)).toBe("abstain");
    expect(replicaDecision(1, -1)).toBe("abstain");
  });
});

describe("foldStabilityGatePasses", () => {
  it("passes for consistent boundaries, fails for noise", () => {
    const stable = [
      [0.9, 0.1, -0.4],
      [0.85, 0.12, -0.38],
      [0.92, 0.08, -0.42],
    ];
    expect(foldStabilityGatePasses(stable)).toBe(true);
    const noisy = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ];
    expect(foldStabilityGatePasses(noisy)).toBe(false);
  });
  it("boundaryCosineSimilarity is 1 for identical directions", () => {
    expect(boundaryCosineSimilarity([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10);
    expect(boundaryCosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 10);
  });
});

describe("abstentionConcentration", () => {
  it("flags single-league concentration", () => {
    const { maxShare, leagues } = abstentionConcentration(["NFL", "NFL", "NFL", "NBA"]);
    expect(maxShare).toBeCloseTo(0.75, 10);
    expect(leagues).toBe(2);
  });
});

describe("buildRejectFeatures", () => {
  it("maps the ledger feature list to a fixed-order vector", () => {
    const v = buildRejectFeatures({
      edgeVsClose: 0.03,
      conformalWidth: 0.12,
      marketSteam: -0.5,
      league: "NFL",
      daysToGame: 2,
      modelVersion: "v5.2.7",
    });
    expect(v).toEqual([0.03, 0.12, -0.5, 2]);
  });
});
