import { describe, expect, it } from "vitest";
import { GAME_CONTEXT_FEATURE_NAMES, choleskyGls } from "../calibration/cholesky-gls";

describe("17-feature Cholesky GLS", () => {
  it("refuses a single card", () => {
    const row = new Array(GAME_CONTEXT_FEATURE_NAMES.length).fill(0.1);
    expect(() => choleskyGls([row], [1])).toThrow(/parked/);
  });

  it("recovers a known coefficient on synthetic rows", () => {
    const p = GAME_CONTEXT_FEATURE_NAMES.length;
    const truth = new Array(p).fill(0).map((_, i) => (i === 0 ? 1.5 : 0));
    const design: number[][] = [];
    const y: number[] = [];
    for (let n = 0; n < p + 8; n++) {
      const row = new Array(p).fill(0).map((_, j) => ((n * 17 + j * 3) % 11) / 10);
      row[0] = n / 10;
      design.push(row);
      y.push(row.reduce((sum, value, j) => sum + value * truth[j]!, 0));
    }
    const fit = choleskyGls(design, y, 1e-8);
    expect(fit.beta[0]).toBeCloseTo(1.5, 2);
    expect(fit.cholesky[0]![0]).toBeGreaterThan(0);
  });
});
