/**
 * Props player-input builder tests.
 *
 * Verifies the DB -> engine-posterior bridge: trailing-4-week stats become
 * MarketAnchoredPlayerInput[] via the engine's empirical-Bayes posteriors.
 * Players with no games or ineligible positions are SKIPPED, not imputed.
 */
import { describe, expect, it } from "vitest";
import {
  buildPropPlayerInputs,
  type PlayerGameStatLike,
} from "@/lib/ops/props-player-inputs";

function row(over: Partial<PlayerGameStatLike> = {}): PlayerGameStatLike {
  return {
    playerId: "wr1",
    position: "WR",
    teamSide: "home",
    week: 4,
    targets: 8,
    carries: 0,
    attempts: 0,
    receivingYards: 90,
    rushingYards: 0,
    fantasyPointsPpr: 15,
    ...over,
  };
}

describe("props player-input builder", () => {
  it("builds posterior inputs from trailing-4-week stats", () => {
    const rows = [
      row({ week: 4 }),
      row({ week: 3, targets: 6, receivingYards: 60, fantasyPointsPpr: 11 }),
      row({ week: 2, targets: 9, receivingYards: 100, fantasyPointsPpr: 17 }),
      row({ week: 1, targets: 5, receivingYards: 40, fantasyPointsPpr: 8 }),
    ];
    const r = buildPropPlayerInputs(rows, 5);
    expect(r.inputs).toHaveLength(1);
    const wr = r.inputs[0]!;
    expect(wr.playerId).toBe("wr1");
    expect(wr.teamSide).toBe("home");
    expect(wr.position).toBe("WR");
    expect(wr.usagePosteriorMean).toBeGreaterThan(0);
    expect(wr.efficiencyPosteriorMean).toBeGreaterThan(0);
    // Recency-weighted usage should sit between the simple mean (7) and the
    // most recent week (8), shrunk toward the positional prior.
    expect(wr.usagePosteriorMean).toBeGreaterThan(5);
    expect(wr.usagePosteriorMean).toBeLessThan(9);
  });

  it("uses the fantasy-points proxy for QB efficiency (documented v1)", () => {
    const rows = [
      row({ playerId: "qb1", position: "QB", week: 4, targets: 0, carries: 3, attempts: 35, receivingYards: 0, rushingYards: 10, fantasyPointsPpr: 24 }),
      row({ playerId: "qb1", position: "QB", week: 3, targets: 0, carries: 2, attempts: 32, receivingYards: 0, rushingYards: 8, fantasyPointsPpr: 22 }),
    ];
    const r = buildPropPlayerInputs(rows, 5);
    expect(r.inputs).toHaveLength(1);
    expect(r.inputs[0]!.efficiencyPosteriorMean).toBeGreaterThan(0);
  });

  it("skips ineligible positions instead of imputing them", () => {
    const rows = [row({ playerId: "k1", position: "K", week: 4 })];
    const r = buildPropPlayerInputs(rows, 5);
    expect(r.inputs).toHaveLength(0);
    expect(r.skippedPosition).toContain("k1");
  });

  it("ignores rows outside the trailing-4-week window", () => {
    const rows = [row({ week: 1 }), row({ week: 0 })];
    const r = buildPropPlayerInputs(rows, 5);
    // week 0 is outside [1..4]; week 1 is inside -> 1 input from week 1 only
    expect(r.inputs).toHaveLength(1);
  });

  it("never fabricates inputs for players with no window games", () => {
    const r = buildPropPlayerInputs([], 5);
    expect(r.inputs).toHaveLength(0);
    expect(r.skippedNoGames).toHaveLength(0);
  });

  it("bridges prior-season Weeks 15-18 seamlessly for Weeks 1-2 without starvation", () => {
    const w1Rows = [
      row({ season: 2025, week: 18, targets: 10, receivingYards: 110 }),
      row({ season: 2025, week: 17, targets: 8, receivingYards: 90 }),
      row({ season: 2025, week: 16, targets: 6, receivingYards: 70 }),
      row({ season: 2025, week: 15, targets: 6, receivingYards: 60 }),
    ];
    const w1 = buildPropPlayerInputs(w1Rows, 1, 2026);
    expect(w1.inputs).toHaveLength(1);
    expect(w1.inputs[0]!.usagePosteriorMean).toBeGreaterThan(7);

    const w2Rows = [
      row({ season: 2026, week: 1, targets: 9, receivingYards: 95 }),
      ...w1Rows.slice(0, 3),
    ];
    const w2 = buildPropPlayerInputs(w2Rows, 2, 2026);
    expect(w2.inputs).toHaveLength(1);
    expect(w2.inputs[0]!.usagePosteriorMean).toBeGreaterThan(7);
  });
});
