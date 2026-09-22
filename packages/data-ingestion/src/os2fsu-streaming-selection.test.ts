/**
 * Tests for ./os2fsu-streaming-selection (arXiv:2208.01562v2, lane=auto_feature_eng).
 *
 * ACCEPTANCE GATE: Accept iff OS2FSU (LFA-impute + fuzzy select) beats both drop-masked and mean-fill+standard-
 * selection arms on 2024 log-loss by >= 0.002 AND retains >= 5 of the 10 masked features; reject
 * if it <= mean-fill, selections are unstable across seeds, or theta > 0.6 missingness on any real
 * feature (drop the feature instead).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./os2fsu-streaming-selection";

describe("OS2FSU streaming selection (arXiv:2208.01562v2)", () => {
  const feats = [
    { name: "a", relevance: 0.9, uncertainty: 0.1 },
    { name: "b", relevance: 0.5, uncertainty: 0.4 },
    { name: "c", relevance: 0.1, uncertainty: 0.1 },
  ];
  it("stream score UCB", () => {
    expect(mod.streamScore(feats[0]!, 1)).toBeCloseTo(1.0, 10);
    expect(mod.streamScore({ name: "x", relevance: 1, uncertainty: -1 } as never, 1)).toBeNull();
  });
  it("online select admits/evicts", () => {
    const s1 = mod.onlineSelect([], feats[0]!, 2)!;
    expect(s1).toHaveLength(1);
    const s2 = mod.onlineSelect(s1, feats[1]!, 2)!;
    expect(s2).toHaveLength(2);
    const s3 = mod.onlineSelect(s2, feats[2]!, 2)!;
    expect(s3.map((f) => f.name).sort()).toEqual(["a", "b"]);
    expect(mod.onlineSelect(s2, { name: "d", relevance: 0.99, uncertainty: 0.5 }, 2)!.map((f) => f.name)).toContain("d");
  });
  it("redundancy filter", () => {
    const corr = { "a|b": 0.95 };
    expect(mod.redundancyFilter("b", ["a"], corr, 0.9)).toBe(false);
    expect(mod.redundancyFilter("c", ["a"], corr, 0.9)).toBe(true);
    expect(mod.redundancyFilter("b", ["a"], corr, 2)).toBeNull();
  });
  it("null on malformed", () => {
    expect(mod.onlineSelect([], feats[0]!, 0)).toBeNull();
    expect(mod.onlineSelect([], { name: "x" } as never, 2)).toBeNull();
  });
});
