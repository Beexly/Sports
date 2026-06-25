import { describe, it, expect } from "vitest";
import {
  runDiscoveryNight,
  assertAllProposed,
  type CandidateNightResult,
  type DiscoveryProposal,
  type DiscoveryNightInput,
} from "../discovery-engine.js";
import type { NightlyObservation } from "../multiple-testing.js";

const CROSS = { requiredConsecutive: 3, alphaPromote: 0.05 };

function disc(n: number): NightlyObservation[] {
  return Array.from({ length: n }, () => ({ pValue: 0.002, discovery: true }));
}

function run(over: Partial<DiscoveryNightInput> & { results: CandidateNightResult[] }) {
  return runDiscoveryNight({
    history: {},
    q: 0.1,
    minSample: 100,
    crossNight: CROSS,
    ...over,
  });
}

describe("runDiscoveryNight — FDR family + sampling", () => {
  it("excludes under-sampled candidates from the FDR family", () => {
    const report = run({
      results: [
        { id: "A", pValue: 0.001, effectSize: 0.05, sampleSize: 200 },
        { id: "B", pValue: 0.001, effectSize: 0.05, sampleSize: 40 }, // thin → excluded
      ],
    });
    expect(report.familyTested).toBe(1);
    expect(report.underSampled).toBe(1);
  });

  it("proposes nothing on a noise night", () => {
    const report = run({
      results: [
        { id: "A", pValue: 0.7, effectSize: 0.0, sampleSize: 200 },
        { id: "B", pValue: 0.9, effectSize: 0.0, sampleSize: 200 },
      ],
    });
    expect(report.proposals).toHaveLength(0);
  });
});

describe("runDiscoveryNight — cross-night promotion discipline", () => {
  it("does NOT promote on a single lucky discovery night (no streak)", () => {
    const report = run({
      results: [{ id: "A", pValue: 0.001, effectSize: 0.05, sampleSize: 200 }],
      history: {}, // no prior nights
    });
    expect(report.proposals.filter((p) => p.kind === "PROMOTE")).toHaveLength(0);
  });

  it("promotes only after K consecutive confirmed nights under the Bonferroni bar", () => {
    const report = run({
      results: [{ id: "A", pValue: 0.001, effectSize: 0.05, sampleSize: 200 }],
      history: { A: disc(2) }, // 2 prior discovery nights + tonight = 3
    });
    const promote = report.proposals.find((p) => p.kind === "PROMOTE");
    expect(promote).toBeDefined();
    expect(promote!.candidateId).toBe("A");
    expect(promote!.status).toBe("PROPOSED");
    expect(promote!.evidence.consecutiveDiscoveryNights).toBe(3);
  });

  it("withholds promotion when the streak's best p exceeds the Bonferroni-over-nights bar", () => {
    // Only A is sample-adequate → m=1 → tonight p=0.02 is a discovery (≤0.1),
    // but the streak best (0.02) > 0.05/3 ≈ 0.0167 → not confirmed.
    const report = run({
      results: [{ id: "A", pValue: 0.02, effectSize: 0.05, sampleSize: 200 }],
      history: {
        A: [
          { pValue: 0.04, discovery: true },
          { pValue: 0.04, discovery: true },
        ],
      },
    });
    expect(report.proposals.filter((p) => p.kind === "PROMOTE")).toHaveLength(0);
  });

  it("does not promote a confirmed candidate whose effect points the wrong way", () => {
    const report = run({
      results: [{ id: "A", pValue: 0.001, effectSize: -0.05, sampleSize: 200 }],
      history: { A: disc(2) },
    });
    expect(report.proposals.filter((p) => p.kind === "PROMOTE")).toHaveLength(0);
  });
});

describe("runDiscoveryNight — symmetric demotion", () => {
  it("proposes demotion when a live candidate decays for N consecutive misses", () => {
    const report = run({
      results: [{ id: "A", pValue: 0.6, effectSize: 0.0, sampleSize: 200 }], // miss tonight
      history: {
        A: [
          { pValue: 0.6, discovery: false },
          { pValue: 0.6, discovery: false },
        ],
      },
      currentlyPromoted: ["A"],
      demoteAfterMisses: 3,
    });
    const demote = report.proposals.find((p) => p.kind === "DEMOTE");
    expect(demote).toBeDefined();
    expect(demote!.candidateId).toBe("A");
    expect(demote!.status).toBe("PROPOSED");
  });
});

describe("runDiscoveryNight — gated recalibration + structural guarantees", () => {
  it("emits a RECALIBRATE proposal from a drift signal but never applies it", () => {
    const report = run({
      results: [],
      recalibration: { drifted: true, note: "ECE 0.083 over the last 200 graded picks" },
    });
    const rc = report.proposals.find((p) => p.kind === "RECALIBRATE");
    expect(rc).toBeDefined();
    expect(rc!.status).toBe("PROPOSED");
  });

  it("appends tonight's observation to every candidate's history", () => {
    const report = run({
      results: [{ id: "A", pValue: 0.5, effectSize: 0, sampleSize: 200 }],
      history: { A: [{ pValue: 0.3, discovery: false }] },
    });
    expect(report.updatedHistory["A"]).toHaveLength(2);
  });

  it("every emitted proposal carries the literal PROPOSED status", () => {
    const report = run({
      results: [{ id: "A", pValue: 0.001, effectSize: 0.05, sampleSize: 200 }],
      history: { A: disc(2) },
      recalibration: { drifted: true, note: "x" },
    });
    expect(report.proposals.length).toBeGreaterThan(0);
    expect(report.proposals.every((p) => p.status === "PROPOSED")).toBe(true);
    expect(() => assertAllProposed(report.proposals)).not.toThrow();
  });

  it("assertAllProposed rejects a tampered (non-PROPOSED) artifact", () => {
    const tampered = [
      { candidateId: "A", kind: "PROMOTE", status: "IMPLEMENTED", rationale: "", evidence: {} },
    ] as unknown as DiscoveryProposal[];
    expect(() => assertAllProposed(tampered)).toThrow(/may never apply a change/);
  });
});
