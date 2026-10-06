
import { describe, expect, it } from "vitest";
import { rawWinPct, strengthAdjustedWins, winStrengthGap } from "./win-strength-diagnostic";

describe("win-strength-diagnostic", () => {
  it("rewards wins over strong opponents", () => {
    const easy = strengthAdjustedWins([
      { won: true, oppWinPct: 0.2 },
      { won: true, oppWinPct: 0.3 },
    ]);
    const hard = strengthAdjustedWins([
      { won: true, oppWinPct: 0.7 },
      { won: true, oppWinPct: 0.8 },
    ]);
    expect(hard).toBeGreaterThan(easy);
  });
  it("gap is positive for a cupcake schedule", () => {
    const g = winStrengthGap([
      { won: true, oppWinPct: 0.1 },
      { won: true, oppWinPct: 0.2 },
      { won: false, oppWinPct: 0.9 },
    ]);
    expect(g.rawWinPct).toBeCloseTo(2 / 3, 10);
    expect(g.gap).toBeGreaterThan(0);
  });
  it("empty schedule gives zero gap", () => {
    expect(winStrengthGap([])).toEqual({ rawWinPct: 0, adjustedWinPct: 0, gap: 0 });
    expect(rawWinPct([])).toBe(0);
  });
});
