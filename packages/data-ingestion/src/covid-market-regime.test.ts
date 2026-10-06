/**
 * Tests for ./covid-market-regime (arXiv:2109.07581v1, lane=markets).
 *
 * ACCEPTANCE GATE: For GSE: gate is detecting alpha > 0 at 1% in any league x window before staking — the paper's
 * +0.10-0.17 is the magnitude that justified real money (NBA COVID alpha = +0.17/+0.10 at 1%
 * significance; inefficiency concentrated at implied 0.2-0.3; 16.7% flat-stake ROI).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./covid-market-regime";

describe("COVID market regime (arXiv:2109.07581v1)", () => {
  it("classifies regimes", () => {
    expect(mod.classifyRegime("2019-11-01")).toBe("pre-covid");
    expect(mod.classifyRegime("2020-09-01")).toBe("ghost-games");
    expect(mod.classifyRegime("2022-01-01")).toBe("post-covid");
    expect(mod.classifyRegime("nope")).toBeNull();
  });
  it("ghost-game spread adjustment", () => {
    expect(mod.ghostGameSpreadAdjust(-3, "ghost-games")).toBeCloseTo(-1.5, 10);
    expect(mod.ghostGameSpreadAdjust(-3, "pre-covid")).toBeCloseTo(-3, 10);
    expect(mod.ghostGameSpreadAdjust(NaN, "pre-covid")).toBeNull();
  });
  it("line move", () => {
    expect(mod.lineMove(-3, -4.5)).toBeCloseTo(-1.5, 10);
    expect(mod.lineMove(NaN, -4)).toBeNull();
  });
  it("regime cover rates", () => {
    const games = [
      { gameId: "a", date: "2019-10-01", homeTeam: "H", awayTeam: "A", closingSpread: -3, result: "H" as const, attendance: 70000, margin: 7 },
      { gameId: "b", date: "2020-10-01", homeTeam: "H", awayTeam: "A", closingSpread: -3, result: "A" as const, attendance: 0, margin: -7 },
    ];
    const r = mod.regimeCoverRates(games);
    expect(r["pre-covid"].homeCoverRate).toBeCloseTo(1, 10);
    expect(r["ghost-games"].homeCoverRate).toBeCloseTo(0, 10);
    expect(r["post-covid"].n).toBe(0);
  });
});
