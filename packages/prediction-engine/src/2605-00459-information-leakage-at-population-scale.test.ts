/**
 * Vitest suite for arXiv:2605.00459 (Information Leakage at Population Scale: An Evaluation of the Polymarket Insider-Relevant Subpopulation, 2020–2026).
 * Gate: Adapt the ILS framework into GSE's steam/informed-flow suite if: (i) the anchor-robust subset shows a drift-share/cover correlation significant at p < 0.05 on 2024–2025 NFL; and (ii) the anchor-robustness gate filters out ≥50% of raw flagged games.
 */
import { describe, it, expect } from "vitest";
import { hazardDecayWeight, driftShare, anchorRobustFilter } from "./2605-00459-information-leakage-at-population-scale";

describe("2605-00459 pre-close drift share", () => {
  const moves = [
    { hoursBeforeClose: 48, magnitude: 1.0, postAnchor: false },
    { hoursBeforeClose: 2, magnitude: 1.0, postAnchor: true },
  ];
  it("upweights early drift via hazard decay", () => {
    const s = driftShare(moves, 12);
    expect(s).toBeGreaterThan(0.9); // early move dominates after decay
    expect(driftShare(moves, 1000)).toBeCloseTo(0.5, 2); // no decay ~ even split
    expect(() => driftShare([], 12)).toThrow();
  });
  it("filters out anchor-driven games", () => {
    const games = [
      { gameId: "g1", moves },
      { gameId: "g2", moves: [{ hoursBeforeClose: 1, magnitude: 2, postAnchor: true }] },
    ];
    expect(anchorRobustFilter(games, 12, 0.5)).toEqual(["g1"]);
  });
});
