import { describe, it, expect } from "vitest";
import {
  DEMO_SLATE, LEAGUES, TIMELINE,
  oddsPathFor, publicMoneyFor, sharpDivergenceFor, impactFor, leagueCentroid,
} from "./demo-slate";

describe("DEMO_SLATE — labelled illustrative data", () => {
  it("is explicitly illustrative and not live", () => {
    expect(DEMO_SLATE.illustrative).toBe(true);
    expect(DEMO_SLATE.live).toBe(false);
    expect(DEMO_SLATE.generatedLabel.toLowerCase()).toContain("illustrative");
  });

  it("covers all four leagues and carries every encoding per game", () => {
    const leaguesPresent = new Set(DEMO_SLATE.games.map((g) => g.league));
    for (const lg of LEAGUES) expect(leaguesPresent.has(lg)).toBe(true);
    for (const g of DEMO_SLATE.games) {
      expect(typeof g.publicMoney).toBe("number");
      expect(typeof g.sharp).toBe("number");
      expect(g.confidence.length).toBe(TIMELINE.length);
    }
  });
});

describe("slate-twin helpers", () => {
  it("oddsPathFor returns the per-game path or the fallback", () => {
    const fallback = [0.5, 0.5];
    expect(oddsPathFor("nfl-01", fallback).length).toBe(TIMELINE.length);
    expect(oddsPathFor("does-not-exist", fallback)).toBe(fallback);
  });

  it("publicMoney / sharp helpers return bounded values with sane defaults", () => {
    expect(publicMoneyFor("nfl-02")).toBeGreaterThan(0.5); // heavy public game
    expect(publicMoneyFor("missing")).toBe(0.5);
    expect(sharpDivergenceFor("nhl-02")).toBeGreaterThan(0.5); // strong sharp edge
    expect(sharpDivergenceFor("missing")).toBe(0.4);
  });

  it("impactFor is present only where authored", () => {
    expect(impactFor("nfl-02")).not.toBeNull();
    expect(impactFor("nfl-01")).toBeNull();
  });

  it("leagueCentroid averages a league's systems", () => {
    const c = leagueCentroid(DEMO_SLATE.games, "NFL");
    expect(c).toHaveLength(3);
    expect(c.every((n) => Number.isFinite(n))).toBe(true);
  });
});
