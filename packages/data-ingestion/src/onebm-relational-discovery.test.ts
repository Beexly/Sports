/**
 * Tests for ./onebm-relational-discovery (arXiv:1706.00327, lane=auto_feature_eng).
 *
 * ACCEPTANCE GATE: ADOPT the relational discovery layer iff (a) 2024 held-out log-loss improves by >= 0.003 over
 * baseline, AND (b) the leakage audit passes 100% -- every generated feature recomputed from a
 * kickoff-cutoff replay matches its stored value exactly on a 500-game sample, AND (c) the drift-
 * quarantine list is non-empty and reviewed.
 */

import { describe, expect, it } from "vitest";
import * as mod from "./onebm-relational-discovery";

describe("OneBM relational discovery (arXiv:1706.00327)", () => {
  it("enumerates forward-only paths", () => {
    const paths = mod.enumeratePaths(2);
    expect(paths).toContainEqual(["games"]);
    expect(paths).toContainEqual(["games", "plays"]);
    expect(paths).toContainEqual(["games", "plays", "players"]);
    expect(paths.every((p) => p[0] === "games")).toBe(true);
    expect(mod.enumeratePaths(1).every((p) => p.length <= 2)).toBe(true);
  });
  it("cutoff audit exact match", () => {
    expect(mod.cutoffAudit([1, 2, 3], [1, 2, 3])).toEqual([]);
    expect(mod.cutoffAudit([1, 2, 3], [1, 2.5, 3])).toEqual([1]);
    expect(mod.cutoffAudit([1], [1, 2])).toEqual([1]);
  });
  it("drift quarantine lists, never deletes", () => {
    const feats = [
      { path: ["games", "plays"], type: "multiset", transform: "epa_mean", cutoff: "kickoff" },
      { path: ["games", "odds_snapshots"], type: "ts", transform: "line_vol", cutoff: "kickoff" },
    ];
    const q = mod.driftQuarantine(feats, new Map([["games/plays/epa_mean", 0.9]]), 0.5);
    expect(q).toHaveLength(1);
    expect(q[0]!.feature.transform).toBe("epa_mean");
  });
  it("validates feature definitions", () => {
    expect(mod.isFeatureDefinition({ path: ["games"], type: "t", transform: "tr", cutoff: "kickoff" })).toBe(true);
    expect(mod.isFeatureDefinition({ path: "games" })).toBe(false);
  });
});
