/**
 * Vitest suite for arXiv:2609.22641v1 (ConsistWorld: Evidence Routing for Consistent Multi-Agent World Models).
 * Gate: ADOPT if on held-out 2024 plays: (a) fused cross-view player-position disagreement <= 0.5 yards mean (vs >=0.8 yards for naive averaging), AND (b) retrieval-based handoff reconstruction error <= 1.0 yard, AND (c) ablation shows the visibility gate (not just retrieval) contributes >=15% of the disagreement reduction; reject if geometric retrieval shows no advantage over recency-based retrieval.
 */
import { describe, it, expect } from "vitest";
import { fuseViews, crossViewDisagreement, ENABLED } from "./2609-22641v1-consistworld-evidence-routing-for-consistent";

describe("2609-22641v1 multi-view play fusion (disabled)", () => {
  const chunks = [
    { camera: "broadcast" as const, pos: [10, 20] as [number, number], confidence: 0.9, visibility: 1 },
    { camera: "all22" as const, pos: [10.4, 20.2] as [number, number], confidence: 0.9, visibility: 0.2 },
    { camera: "endzone" as const, pos: [9.8, 19.9] as [number, number], confidence: 0.5, visibility: 1 },
  ];
  it("weights by the visibility gate, not naive averaging", () => {
    const [x, y] = fuseViews(chunks);
    // all22 has low visibility -> fused position stays near broadcast/endzone
    expect(Math.hypot(x - 10, y - 20)).toBeLessThan(0.25);
    expect(() => fuseViews([])).toThrow();
  });
  it("measures cross-view disagreement", () => {
    expect(crossViewDisagreement(chunks)).toBeGreaterThan(0);
    expect(crossViewDisagreement([chunks[0]!])).toBe(0);
  });
  it("is disabled pending the chunk archive", () => {
    expect(ENABLED).toBe(false);
  });
});
