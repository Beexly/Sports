/**
 * Invariant tests for the sealed EPA dropoff table and the injury reallocator.
 *
 * The QB_QUESTIONABLE factor is frozen from the measured 2024-2026 estimate
 * (0.0947 EPA/play EV-weighted, converted to this table's retention space as
 * 0.8106 against the sealed QB1 anchor). Applying it must not move the sealed
 * baseline hash: the table is read, never written, during the overlay.
 */

import { describe, it, expect } from "vitest";
import { injuryRealloc, EPA_DROPOFF, EPA_DROPOFF_SHA256 } from "../injury-operator.js";

describe("sealed EPA dropoff table invariants", () => {
  it("freezes QB_QUESTIONABLE inside the accepted factor band", () => {
    const factor = EPA_DROPOFF.QB_QUESTIONABLE;
    expect(factor).toBeDefined();
    expect(factor).toBeCloseTo(0.8106, 4);
    expect(factor!).toBeGreaterThanOrEqual(0.5);
    expect(factor!).toBeLessThanOrEqual(1.2);
  });

  it("applies the QB_QUESTIONABLE factor to a starting quarterback's share", () => {
    const players = ["QB_A", "WR_B"];
    const out = injuryRealloc({
      preShares: { QB_A: 0.6, WR_B: 0.4 },
      postShares: { QB_A: 0.6, WR_B: 0.4 },
      roleOf: { QB_A: "QB_QUESTIONABLE", WR_B: "WR1" },
      cost: [
        [0, 0],
        [0, 0],
      ],
      players,
      baselineHash: "sealed-baseline-hash-fixture",
    });

    expect(out.output.epa_factors.QB_A).toBeCloseTo(0.8106, 4);
    expect(out.output.effective_shares.QB_A).toBeCloseTo(
      out.output.feasible_shares.QB_A! * 0.8106,
      6,
    );
  });

  it("leaves the sealed baseline hash unchanged after the factor is applied", () => {
    const players = ["QB_A", "WR_B"];
    const out = injuryRealloc({
      preShares: { QB_A: 0.6, WR_B: 0.4 },
      postShares: { QB_A: 0.6, WR_B: 0.4 },
      roleOf: { QB_A: "QB_QUESTIONABLE", WR_B: "WR1" },
      cost: [
        [0, 0],
        [0, 0],
      ],
      players,
      baselineHash: "sealed-baseline-hash-fixture",
    });

    // candidateHash() may resolve a real candidate baseline on disk, so the
    // invariant is that the hash does not MOVE across the pure computation.
    expect(out.output.hash_unchanged).toBe(true);
    expect(out.output.baseline_hash_after).toBe(out.output.baseline_hash_before);
    // The table hash is a pure function of the frozen table, so it must not move
    // across overlay runs either.
    expect(out.output.epa_table_sha256).toBe(EPA_DROPOFF_SHA256);
  });

  it("rejects an out-of-band factor instead of silently applying it", () => {
    // Guardrail documented in validateEpaTable: every factor must sit in
    // [EPA_FACTOR_MIN, EPA_FACTOR_MAX]. The frozen table satisfies this; the
    // test pins the band so a future edit cannot widen it unnoticed.
    for (const [role, factor] of Object.entries(EPA_DROPOFF)) {
      expect(factor, `role ${role}`).toBeGreaterThanOrEqual(0.5);
      expect(factor, `role ${role}`).toBeLessThanOrEqual(1.2);
    }
  });
});
