import { describe, expect, it } from "vitest";
import {
  AGGRESSION_MAX,
  AGGRESSION_MIN,
  GO_OVER_FG_WP,
  LEAGUE_GO_RATE,
  WP_DELTA,
  aggressionDelta,
  classifyDecision,
  decisionCostVsGoing,
  expectedBranch,
  isFourthDownSpot,
} from "../fourth-down-aggression";

describe("isFourthDownSpot", () => {
  it("accepts 4th-and-short past midfield in a live game", () => {
    expect(
      isFourthDownSpot({ down: 4, distance: 2, yardline100: 38, winProbability: 0.5 }),
    ).toBe(true);
  });

  it("rejects other downs, long distances, own half and garbage time", () => {
    expect(isFourthDownSpot({ down: 3, distance: 2, yardline100: 38, winProbability: 0.5 })).toBe(false);
    expect(isFourthDownSpot({ down: 4, distance: 6, yardline100: 38, winProbability: 0.5 })).toBe(false);
    expect(isFourthDownSpot({ down: 4, distance: 2, yardline100: 60, winProbability: 0.5 })).toBe(false);
    expect(isFourthDownSpot({ down: 4, distance: 2, yardline100: 38, winProbability: 0.95 })).toBe(false);
  });
});

describe("classifyDecision", () => {
  it("maps play types", () => {
    expect(classifyDecision("run")).toBe("go");
    expect(classifyDecision("pass")).toBe("go");
    expect(classifyDecision("field_goal")).toBe("field_goal");
    expect(classifyDecision("punt")).toBe("punt");
    expect(classifyDecision("no_play")).toBe("other");
    expect(classifyDecision(null)).toBe("other");
  });
});

describe("wp constants", () => {
  it("pins the measured branch values", () => {
    expect(WP_DELTA.go).toBe(0.1113);
    expect(WP_DELTA.field_goal).toBe(-0.0837);
    expect(GO_OVER_FG_WP).toBeCloseTo(0.195, 3);
    expect(LEAGUE_GO_RATE).toBe(0.694);
    expect(AGGRESSION_MIN).toBe(0.51);
    expect(AGGRESSION_MAX).toBe(0.94);
  });

  it("costs nothing to go and most to punt", () => {
    expect(decisionCostVsGoing("go")).toBeCloseTo(0, 6);
    expect(decisionCostVsGoing("field_goal")).toBeCloseTo(0.195, 3);
    expect(decisionCostVsGoing("punt")).toBeGreaterThan(decisionCostVsGoing("field_goal"));
  });
});

describe("aggressionDelta / expectedBranch", () => {
  it("centres on the league and flags extremes", () => {
    expect(aggressionDelta(LEAGUE_GO_RATE)).toBeCloseTo(0, 6);
    expect(aggressionDelta(AGGRESSION_MAX)).toBeGreaterThan(0.2);
    expect(aggressionDelta(AGGRESSION_MIN)).toBeLessThan(-0.15);
  });

  it("expects a kick from a passive staff and a go from an aggressive one", () => {
    expect(expectedBranch(0.51)).toBe("field_goal");
    expect(expectedBranch(0.94)).toBe("go");
  });
});
