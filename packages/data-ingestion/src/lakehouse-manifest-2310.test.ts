import { describe, expect, it } from "vitest";
import { writeManifest, timeTravel, branchGate, layerFor } from "./lakehouse-manifest-2310.js";

describe("lakehouse manifest", () => {
  it("assigns raw pulls to bronze and feature tables to gold", () => {
    expect(layerFor("nflverse_raw")).toBe("bronze");
    expect(layerFor("pbp_clean")).toBe("silver");
    expect(layerFor("feature_tables")).toBe("gold");
    expect(layerFor("mystery")).toBeNull();
  });
  it("time-travel returns the latest manifest at or before asOf", () => {
    const m1 = writeManifest({ dataset: "pbp_clean", contentHash: "h1", parentHash: null, createdAt: "2024-01-01T00:00:00Z", rowCount: 10 });
    const m2 = writeManifest({ dataset: "pbp_clean", contentHash: "h2", parentHash: "h1", createdAt: "2024-06-01T00:00:00Z", rowCount: 20 });
    expect(timeTravel([m1, m2], "pbp_clean", "2024-03-01T00:00:00Z")?.contentHash).toBe("h1");
    expect(timeTravel([m1, m2], "pbp_clean", "2025-01-01T00:00:00Z")?.contentHash).toBe("h2");
    expect(timeTravel([m1], "pbp_clean", "2023-01-01T00:00:00Z")).toBeNull();
  });
  it("the branch gate catches injected corruption", () => {
    const m = writeManifest({ dataset: "pbp_clean", contentHash: "tampered", parentHash: null, createdAt: "2024-01-01T00:00:00Z", rowCount: 10 });
    const g = branchGate(m, "real-hash", true);
    expect(g.promote).toBe(false);
    expect(g.reason).toContain("corruption");
  });
  it("rejects unknown datasets", () => {
    expect(() => writeManifest({ dataset: "x", contentHash: "h", parentHash: null, createdAt: "2024-01-01T00:00:00Z", rowCount: 1 })).toThrow(/unknown dataset/);
  });
  it("handles empty input", () => {
    expect(timeTravel([], "pbp_clean", "2024-01-01T00:00:00Z")).toBeNull();
    expect(layerFor("")).toBeNull();
  });
  it("handles edge inputs", () => {
    const m = writeManifest({ dataset: "pbp_clean", contentHash: "h1", parentHash: "p0", createdAt: "2024-01-01T00:00:00Z", rowCount: 0 });
    // broken parent chain refuses promotion even with matching hash
    const g = branchGate(m, "h1", false);
    expect(g.promote).toBe(false);
    expect(g.reason).toContain("parent");
    // zero-row manifest is still a valid manifest
    expect(m.rowCount).toBe(0);
  });
});

