import { describe, expect, it } from "vitest";
import {
  OFFLINE_RELIABILITY_FIXTURE,
  runOfflineReliabilityBins,
} from "./offline-reliability-bins";

describe("runOfflineReliabilityBins", () => {
  it("computes ECE on fixture", () => {
    const r = runOfflineReliabilityBins(OFFLINE_RELIABILITY_FIXTURE, 5);
    expect(r.n).toBe(8);
    expect(r.bins.length).toBe(5);
    expect(r.ece).not.toBeNull();
    expect(r.ece!).toBeGreaterThanOrEqual(0);
  });

  it("handles empty", () => {
    const r = runOfflineReliabilityBins([]);
    expect(r.n).toBe(0);
    expect(r.ece).toBeNull();
  });
});
