/**
 * Tests for ./player-comparison-layer (arXiv:1511.04351v2, lane=tracking).
 *
 * ACCEPTANCE GATE: ADOPT the SDI comp system as a GSE feature IF comp-based EPA/target forecasts beat the
 * positional-average baseline by >= 0.03 R^2 on the 2024 holdout AND nearest-neighbor lists show
 * >=50% overlap when refit on 2020-2022 vs 2021-2023 (stability check).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./player-comparison-layer";

describe("player comparison layer (arXiv:1511.04351v2)", () => {
  const pool = [
    { playerId: "A", position: "WR", snaps: 800, features: [1, 0, 0] },
    { playerId: "B", position: "WR", snaps: 700, features: [0.9, 0.1, 0] },
    { playerId: "C", position: "WR", snaps: 600, features: [0, 0, 1] },
    { playerId: "D", position: "RB", snaps: 500, features: [1, 0, 0] },
  ];
  it("standardize zero-centers columns", () => {
    const z = mod.standardize([[1, 2], [3, 4]])!;
    expect(z[0]![0]).toBeCloseTo(-1, 10);
    expect(z[1]![1]).toBeCloseTo(1, 10);
    expect(mod.standardize([])).toBeNull();
  });
  it("cosineSimilarity basics", () => {
    expect(mod.cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1, 10);
    expect(mod.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
    expect(mod.cosineSimilarity([0, 0], [1, 0])).toBeNull();
  });
  it("nearestNeighbors respects position and excludes self", () => {
    const nn = mod.nearestNeighbors(pool[0]!, pool, 2);
    expect(nn.map((x) => x.playerId)).toEqual(["B", "C"]);
    expect(nn[0]!.similarity).toBeGreaterThan(nn[1]!.similarity);
  });
  it("snapWeightedAggregate", () => {
    const s = new Map([["A", 1], ["B", 3]]);
    const w = new Map([["A", 800], ["B", 200]]);
    expect(mod.snapWeightedAggregate(s, w)).toBeCloseTo(1.4, 10);
    expect(mod.snapWeightedAggregate(new Map(), new Map())).toBeNull();
  });
});
