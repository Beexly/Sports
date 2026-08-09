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

  it("returns null when no finite independents", () => {
    expect(blendIndependentHomeFair([])).toBeNull();
    expect(
      blendIndependentHomeFair([
        { source: "x", homeFairProb: null, awayFairProb: null, capturedAt: "2026-08-09T00:00:00Z" },
      ]),
    ).toBeNull();
  });
});
