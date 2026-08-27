import { describe, it, expect } from "vitest";
import {
  classifyGameCloseness,
  classifyExpectationProfile,
  priorGameExpectationProfile,
  type TeamGameResult,
} from "../expectation-profile.js";

describe("classifyGameCloseness", () => {
  it("classifies a spread at or beyond the negative band as favored", () => {
    expect(classifyGameCloseness(-4)).toBe("favored");
    expect(classifyGameCloseness(-10)).toBe("favored");
  });

  it("classifies a spread at or beyond the positive band as underdog", () => {
    expect(classifyGameCloseness(4)).toBe("underdog");
    expect(classifyGameCloseness(10)).toBe("underdog");
  });

  it("classifies everything strictly inside the band as close", () => {
    expect(classifyGameCloseness(-3.5)).toBe("close");
    expect(classifyGameCloseness(0)).toBe("close");
    expect(classifyGameCloseness(3.5)).toBe("close");
  });

  it("respects a custom close band", () => {
    expect(classifyGameCloseness(-5, 6)).toBe("close");
    expect(classifyGameCloseness(-6, 6)).toBe("favored");
    expect(classifyGameCloseness(6, 6)).toBe("underdog");
  });
});

describe("classifyExpectationProfile", () => {
  it("maps all six closeness x result combinations per the paper's Table 1", () => {
    expect(classifyExpectationProfile("favored", true)).toBe("expected_win");
    expect(classifyExpectationProfile("favored", false)).toBe("upset_loss");
    expect(classifyExpectationProfile("close", true)).toBe("close_win");
    expect(classifyExpectationProfile("close", false)).toBe("close_loss");
    expect(classifyExpectationProfile("underdog", true)).toBe("upset_win");
    expect(classifyExpectationProfile("underdog", false)).toBe("expected_loss");
  });
});

describe("priorGameExpectationProfile", () => {
  const mk = (team: string, season: number, week: number, spread: number, won: boolean): TeamGameResult => ({
    team, season, week, closingSpreadForTeam: spread, result: won ? "win" : "loss",
  });
  const mkDraw = (team: string, season: number, week: number, spread: number): TeamGameResult => ({
    team, season, week, closingSpreadForTeam: spread, result: "draw",
  });

  it("returns null with no history", () => {
    expect(priorGameExpectationProfile([], "PHI", 2026, 5)).toBeNull();
  });

  it("returns null when only same-week or future games exist (leak-safe)", () => {
    const history = [mk("PHI", 2026, 5, -6, true), mk("PHI", 2026, 6, 2, false)];
    expect(priorGameExpectationProfile(history, "PHI", 2026, 5)).toBeNull();
  });

  it("picks the latest strictly-prior game among several candidates", () => {
    const history = [
      mk("PHI", 2026, 1, -6, true), // expected_win
      mk("PHI", 2026, 2, 2, false), // close_loss -- this is the latest prior to week 3
    ];
    expect(priorGameExpectationProfile(history, "PHI", 2026, 3)).toBe("close_loss");
  });

  it("filters strictly by team, never leaking another team's history", () => {
    const history = [mk("DAL", 2026, 1, -6, true), mk("PHI", 2026, 1, 5, false)];
    expect(priorGameExpectationProfile(history, "PHI", 2026, 2)).toBe("expected_loss");
  });

  it("filters strictly by season, never leaking a prior season's history", () => {
    const history = [mk("PHI", 2025, 10, -6, true)];
    expect(priorGameExpectationProfile(history, "PHI", 2026, 3)).toBeNull();
  });

  it("threads a custom close band through end to end", () => {
    const history = [mk("PHI", 2026, 1, -5, true)]; // favored at band 4, close at band 6
    expect(priorGameExpectationProfile(history, "PHI", 2026, 2, 4)).toBe("expected_win");
    expect(priorGameExpectationProfile(history, "PHI", 2026, 2, 6)).toBe("close_win");
  });

  it("skips a drawn prior game rather than miscoding it as a loss, falling through to the next eligible win/loss game", () => {
    const history = [
      mk("PHI", 2026, 1, -6, true), // expected_win -- the correct answer once the draw is skipped
      mkDraw("PHI", 2026, 2, 2), // drawn -- must not be read as close_loss
    ];
    expect(priorGameExpectationProfile(history, "PHI", 2026, 3)).toBe("expected_win");
  });

  it("returns null when the only strictly-prior game is a draw and nothing earlier exists", () => {
    const history = [mkDraw("PHI", 2026, 2, 2)];
    expect(priorGameExpectationProfile(history, "PHI", 2026, 3)).toBeNull();
  });
});
