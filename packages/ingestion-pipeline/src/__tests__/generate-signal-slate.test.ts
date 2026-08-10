import { describe, expect, it } from "vitest";
import { blendIndependentHomeFair } from "../generate-signal-slate.js";

describe("blendIndependentHomeFair", () => {
  it("blends two-way independents without inventing", () => {
    const b = blendIndependentHomeFair([
      { source: "kalshi", homeFairProb: 0.6, awayFairProb: 0.4, capturedAt: "2026-08-09T00:00:00Z" },
      { source: "elo", homeFairProb: 0.55, awayFairProb: 0.45, capturedAt: "2026-08-09T00:00:00Z" },
    ]);
    expect(b).not.toBeNull();
    expect(b!.homeP).toBeGreaterThan(0.5);
    expect(b!.sources).toEqual(["kalshi", "elo"]);
  });

  it("weights sharp sources over near-coin-flip (RES lift)", () => {
    const b = blendIndependentHomeFair([
      { source: "kalshi", homeFairProb: 0.75, awayFairProb: 0.25, capturedAt: "2026-08-09T00:00:00Z" },
      { source: "elo", homeFairProb: 0.51, awayFairProb: 0.49, capturedAt: "2026-08-09T00:00:00Z" },
      { source: "poisson", homeFairProb: 0.5, awayFairProb: 0.5, capturedAt: "2026-08-09T00:00:00Z" },
    ]);
    // Equal-weight would be ~0.587; sharpness-weight pulls toward Kalshi 0.75
    expect(b!.homeP).toBeGreaterThan(0.62);
    expect(b!.homeP).toBeLessThan(0.75);
  });

  it("returns null when no finite independents", () => {
    expect(blendIndependentHomeFair([])).toBeNull();
  });
});
