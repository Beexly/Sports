import { describe, expect, it } from "vitest";
import { analyzeCoverage, summarizeCoverage, type CoverageFrame, type CoveragePlayer } from "./coverage-analyzer.js";

const player = (x: number, y: number, team: CoveragePlayer["team"]): CoveragePlayer => ({ x, y, team, confidence: 1 });

function frame(players: CoveragePlayer[]): CoverageFrame {
  return { time: players.length, players };
}

describe("coverage analyzer", () => {
  it("classifies deep safeties and off corners as Cover 3", () => {
    const players = [player(10, 55, "offense"), player(90, 55, "offense"), player(50, 5, "defense"), player(52, 7, "defense"), player(8, 18, "defense"), player(92, 18, "defense"), player(25, 25, "defense"), player(75, 25, "defense")];
    const result = analyzeCoverage([frame(players), frame(players)]);
    expect(result.preSnap).toBe("Cover 3");
    expect(result.disguised).toBe(false);
  });

  it("classifies a single-high press as Cover 1 Man", () => {
    const players = [player(10, 55, "offense"), player(90, 55, "offense"), player(50, 7, "defense"), player(10, 17, "defense"), player(90, 17, "defense"), player(35, 25, "defense"), player(65, 25, "defense")];
    expect(analyzeCoverage([frame(players), frame(players)]).preSnap).toBe("Cover 1 Man");
  });

  it("marks different pre/post labels as disguised and aggregates them", () => {
    const pre = frame([player(10, 55, "offense"), player(90, 55, "offense"), player(50, 5, "defense"), player(52, 7, "defense"), player(8, 18, "defense"), player(92, 18, "defense"), player(25, 25, "defense"), player(75, 25, "defense")]);
    const post = frame([player(10, 55, "offense"), player(90, 55, "offense"), player(50, 17, "defense"), player(25, 25, "defense"), player(75, 25, "defense"), player(35, 30, "defense"), player(65, 30, "defense"), player(10, 30, "defense")]);
    const play = analyzeCoverage([pre, post]);
    expect(play.disguised).toBe(true);
    const summary = summarizeCoverage([{ play, down: 3, distance: 4 }]);
    expect(summary.disguiseRate).toBe(1);
    expect(summary.tendencyByDownDistance["3-4"]).toBe("Cover 3");
  });
});
