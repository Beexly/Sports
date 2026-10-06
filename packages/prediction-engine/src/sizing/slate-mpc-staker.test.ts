import { describe, expect, it } from "vitest";
import { kellyFraction, solveSlateMpc } from "./slate-mpc-staker";

describe("slate-mpc-staker", () => {
  it("kellyFraction matches the closed form", () => {
    // p=0.6, odds=2.0 -> (0.6-0.4)/1 = 0.2
    expect(kellyFraction(0.6, 2)).toBeCloseTo(0.2, 12);
    expect(kellyFraction(0.4, 2)).toBe(0); // no edge -> 0
    expect(() => kellyFraction(0, 2)).toThrow();
    expect(() => kellyFraction(0.6, 1)).toThrow();
  });

  it("empty slate -> empty allocation", () => {
    expect(solveSlateMpc([])).toEqual([]);
  });

  it("respects per-pick cap and total exposure", () => {
    const picks = [
      { p: 0.7, odds: 2.2 },
      { p: 0.65, odds: 2.1 },
      { p: 0.6, odds: 2.0 },
    ];
    const f = solveSlateMpc(picks, [], { cap: 0.05, maxExposure: 0.1 });
    expect(f.every((x) => x >= 0 && x <= 0.05 + 1e-9)).toBe(true);
    expect(f.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(0.1 + 1e-9);
    expect(f.reduce((a, b) => a + b, 0)).toBeGreaterThan(0); // real edges get staked
  });

  it("correlated picks get shrunk vs independent", () => {
    const picks = [
      { p: 0.65, odds: 2.1 },
      { p: 0.65, odds: 2.1 },
    ];
    const indep = solveSlateMpc(picks, [], { lambda: 1 });
    const corr = solveSlateMpc(
      picks,
      [
        [0.23, 0.2],
        [0.2, 0.23],
      ],
      { lambda: 1 },
    );
    const sumIndep = indep.reduce((a, b) => a + b, 0);
    const sumCorr = corr.reduce((a, b) => a + b, 0);
    expect(sumCorr).toBeLessThanOrEqual(sumIndep + 1e-9);
  });

  it("no-edge picks get zero", () => {
    const f = solveSlateMpc([{ p: 0.4, odds: 2.0 }]);
    expect(f[0]).toBeCloseTo(0, 9);
  });
});
