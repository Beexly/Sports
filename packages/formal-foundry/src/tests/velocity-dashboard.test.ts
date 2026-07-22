import { beforeEach, describe, expect, it } from "vitest";
import { getVelocitySnapshot, updateVelocity, VelocityMetricsState } from "../velocity-dashboard.js";

describe("velocity-dashboard", () => {
  beforeEach(() => {
    // Module-level singleton state — reset between tests for isolation.
    VelocityMetricsState.changesUnderProof = 0;
    VelocityMetricsState.ctiCaught = 0;
    VelocityMetricsState.incidentRateProtected = 0;
    VelocityMetricsState.averageProofLatencyMs = 0;
  });

  it("updateVelocity accumulates changesUnderProof and ctiCaught", () => {
    updateVelocity({ ctiCount: 1, latencyMs: 100 });
    updateVelocity({ ctiCount: 0, latencyMs: 200 });
    const snap = getVelocitySnapshot();
    expect(snap.changesUnderProof).toBe(2);
    expect(snap.ctiCaught).toBe(1);
  });

  it("updateVelocity computes a running average latency", () => {
    updateVelocity({ latencyMs: 100 });
    updateVelocity({ latencyMs: 300 });
    const snap = getVelocitySnapshot();
    expect(snap.averageProofLatencyMs).toBe(200);
  });

  it("getVelocitySnapshot returns a copy, not the live mutable object", () => {
    const snap = getVelocitySnapshot();
    snap.changesUnderProof = 999;
    expect(getVelocitySnapshot().changesUnderProof).not.toBe(999);
  });

  it("updateVelocity is silent (no console I/O side effect — fixed defect)", () => {
    const originalTable = console.table;
    let called = false;
    console.table = (() => {
      called = true;
    }) as typeof console.table;
    try {
      updateVelocity({ ctiCount: 0, latencyMs: 10 });
    } finally {
      console.table = originalTable;
    }
    expect(called).toBe(false);
  });
});
