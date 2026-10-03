/**
 * Tests for ./adaptive-ranking-lasso (arXiv:1301.2954v1, lane=team_ratings).
 *
 * ACCEPTANCE GATE: Adopt adaptive ranking lasso as a GSE ratings input iff on 2016-2025 walk-forward: (a) log loss
 * beats MLE-BT by >= 0.005; AND (b) log loss beats dynamic Elo by >= 0.002; AND (c) tier
 * assignments are stable week-to-week (median team changes tiers <= 2 times per season).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./adaptive-ranking-lasso";

describe("adaptive ranking lasso tiers (arXiv:1301.2954v1)", () => {
  const abilities = [
    { team: "KC", ability: 2.0 },
    { team: "BUF", ability: 1.95 },
    { team: "BAL", ability: 1.0 },
    { team: "CLE", ability: 0.9 },
    { team: "NYJ", ability: -1.5 },
  ];
  it("groups close abilities, splits on gaps > lambda", () => {
    const tiers = mod.fusedTiers(abilities, 0.5);
    expect(tiers).toEqual([["KC", "BUF"], ["BAL", "CLE"], ["NYJ"]]);
  });
  it("lambda=0 -> every team its own tier; huge lambda -> one tier", () => {
    expect(mod.fusedTiers(abilities, 0)).toHaveLength(5);
    expect(mod.fusedTiers(abilities, 100)).toHaveLength(1);
  });
  it("softThreshold proximal step", () => {
    expect(mod.softThreshold(1.5, 0.5)).toBeCloseTo(1.0, 10);
    expect(mod.softThreshold(-1.5, 0.5)).toBeCloseTo(-1.0, 10);
    expect(mod.softThreshold(0.3, 0.5)).toBe(0);
    expect(mod.softThreshold(1, -1)).toBeNull();
  });
  it("tierOf + stability", () => {
    const a = mod.fusedTiers(abilities, 0.5);
    expect(mod.tierOf(a, "KC")).toBe(1);
    expect(mod.tierOf(a, "NYJ")).toBe(3);
    expect(mod.tierOf(a, "XXX")).toBeNull();
    expect(mod.tierStability(a, a)).toBeCloseTo(1, 10);
    const b = mod.fusedTiers([...abilities, { team: "NE", ability: 1.5 }], 0.5);
    expect(mod.tierStability(a, b)).toBeLessThan(1);
  });
  it("tierChangeCounts tracks membership changes", () => {
    const w1 = [["KC"], ["BAL"]];
    const w2 = [["BAL"], ["KC"]];
    const counts = mod.tierChangeCounts([w1, w2]);
    expect(counts["KC"]).toBe(1);
    expect(counts["BAL"]).toBe(1);
  });
  it("empty/malformed -> []", () => {
    expect(mod.fusedTiers([], 0.5)).toEqual([]);
    expect(mod.fusedTiers([null, { team: "x" }], 0.5)).toEqual([]);
    expect(mod.tierStability([], [])).toBeNull();
  });
});
