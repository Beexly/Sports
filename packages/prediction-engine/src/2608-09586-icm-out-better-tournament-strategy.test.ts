/**
 * Vitest suite for arXiv:2608.09586 (ICM Out! Better Tournament Strategy from Computed Continuations, vs. Solvers and LLMs).
 * Gate: Adopt the expected-prize objective if on 2024 GPP backtests the max-expected-prize lineups beat max-expected-score lineups on realized prize by >=15% across >=15 GPPs AND the simulation shows the gap comes from payout-ladder positioning (not just variance); reject if the field-distribution estimate is too noisy.
 */
import { describe, it, expect } from "vitest";
import { icmExpectedPrize, prizeLocalSearch } from "./2608-09586-icm-out-better-tournament-strategy";

describe("2608-09586 ICM expected-prize objective", () => {
  const payouts = [100, 50, 25, 10];
  it("expected prize rises with lineup score", () => {
    const lo = icmExpectedPrize(150, 150, 30, payouts);
    const hi = icmExpectedPrize(200, 150, 30, payouts);
    expect(hi).toBeGreaterThan(lo);
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(() => icmExpectedPrize(150, 150, 0, payouts)).toThrow();
    expect(() => icmExpectedPrize(150, 150, 30, [])).toThrow();
  });
  it("local search improves expected prize", () => {
    const pool = [
      { id: "a", proj: 20 }, { id: "b", proj: 18 }, { id: "c", proj: 30 }, { id: "d", proj: 10 },
    ];
    const projOf = (lu: readonly string[]) => {
      const m = lu.reduce((s, id) => s + (pool.find((p) => p.id === id)?.proj ?? 0), 0);
      return { mean: m, sd: 10 };
    };
    const out = prizeLocalSearch(["a", "d"], pool, projOf, 40, 12, payouts);
    expect(out).toContain("c");
  });
});
