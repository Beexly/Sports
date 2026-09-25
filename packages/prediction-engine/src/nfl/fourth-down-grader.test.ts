import { describe, expect, it } from "vitest";
import {
  aggregateByTeamWeek,
  gradeFourthDown,
  gradeFourthDownPlays,
  type FourthDownPlay,
} from "./fourth-down-grader";

function play(overrides: Partial<FourthDownPlay> = {}): FourthDownPlay {
  return {
    playId: "p1",
    team: "HOME",
    week: 5,
    wpGo: 0.55,
    wpPunt: 0.52,
    wpFieldGoal: 0.5,
    actualCall: "go",
    ...overrides,
  };
}

describe("fourth-down-grader", () => {
  it("4th-and-2 midfield go → A when go is optimal", () => {
    // Midfield 4th-and-2: going is the best option and was the call.
    const row = gradeFourthDown(
      play({ wpGo: 0.58, wpPunt: 0.52, wpFieldGoal: 0.49, actualCall: "go" }),
    );
    expect(row).not.toBeNull();
    if (row === null) throw new Error("expected grade row");
    expect(row.optimalCall).toBe("go");
    expect(row.actualCall).toBe("go");
    expect(row.grade).toBe("A");
    expect(row.optimalGap).toBeCloseTo(0, 12);
    expect(row.wpGoMinusActual).toBeCloseTo(0, 12);
  });

  it("punt when go is optimal → D (gap over 3pp)", () => {
    // Go is clearly better (58%) but the coach punted (52%).
    const row = gradeFourthDown(
      play({ wpGo: 0.58, wpPunt: 0.52, wpFieldGoal: 0.5, actualCall: "punt" }),
    );
    expect(row).not.toBeNull();
    if (row === null) throw new Error("expected grade row");
    expect(row.optimalCall).toBe("go");
    expect(row.actualCall).toBe("punt");
    expect(row.grade).toBe("D");
    expect(row.optimalGap).toBeCloseTo(0.06, 12);
    // Headline metric: WP(go) − WP(actual call) = 0.58 − 0.52.
    expect(row.wpGoMinusActual).toBeCloseTo(0.06, 12);
  });

  it("grades B within 1pp and C within 1–3pp", () => {
    const b = gradeFourthDown(
      play({ wpGo: 0.55, wpPunt: 0.545, wpFieldGoal: 0.5, actualCall: "punt" }),
    );
    expect(b?.grade).toBe("B");
    expect(b?.optimalGap).toBeCloseTo(0.005, 12);

    const c = gradeFourthDown(
      play({ wpGo: 0.55, wpPunt: 0.53, wpFieldGoal: 0.5, actualCall: "punt" }),
    );
    expect(c?.grade).toBe("C");
    expect(c?.optimalGap).toBeCloseTo(0.02, 12);
  });

  it("any optimal call is A — including punt and field-goal", () => {
    const puntBest = gradeFourthDown(
      play({ wpGo: 0.4, wpPunt: 0.55, wpFieldGoal: 0.45, actualCall: "punt" }),
    );
    expect(puntBest?.grade).toBe("A");
    expect(puntBest?.optimalCall).toBe("punt");
    // WP(go) − WP(actual) is negative here: going was worse than punting.
    expect(puntBest?.wpGoMinusActual).toBeCloseTo(-0.15, 12);

    const fgBest = gradeFourthDown(
      play({ wpGo: 0.45, wpPunt: 0.44, wpFieldGoal: 0.72, actualCall: "field-goal" }),
    );
    expect(fgBest?.grade).toBe("A");
    expect(fgBest?.optimalCall).toBe("field-goal");
    expect(fgBest?.wpGoMinusActual).toBeCloseTo(-0.27, 12);
  });

  it("invalid probabilities → null (fail-closed, never imputed)", () => {
    expect(gradeFourthDown(play({ wpGo: Number.NaN }))).toBeNull();
    expect(gradeFourthDown(play({ wpPunt: Number.POSITIVE_INFINITY }))).toBeNull();
    expect(gradeFourthDown(play({ wpFieldGoal: -0.1 }))).toBeNull();
    expect(gradeFourthDown(play({ wpGo: 1.2 }))).toBeNull();
    expect(gradeFourthDown(play({ wpPunt: Number.NaN, wpFieldGoal: 0.5 }))).toBeNull();
    expect(gradeFourthDown(null)).toBeNull();
    expect(gradeFourthDown(undefined)).toBeNull();
  });

  it("invalid actual call → null", () => {
    const bad = play({ actualCall: "fake" as "go" });
    expect(gradeFourthDown(bad)).toBeNull();
  });

  it("batch grading drops invalid rows instead of imputing", () => {
    const rows = gradeFourthDownPlays([
      play({ playId: "ok", wpGo: 0.6, wpPunt: 0.5, wpFieldGoal: 0.5, actualCall: "go" }),
      play({ playId: "bad", wpGo: Number.NaN }),
      null,
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.playId).toBe("ok");
  });
});

describe("fourth-down-grader team/week aggregates", () => {
  it("aggregates per-play rows into team/week summaries", () => {
    const rows = gradeFourthDownPlays([
      play({ playId: "a", team: "DAL", week: 4, wpGo: 0.58, wpPunt: 0.52, actualCall: "go" }),
      play({ playId: "b", team: "DAL", week: 4, wpGo: 0.5, wpPunt: 0.55, actualCall: "punt" }),
      play({ playId: "c", team: "DAL", week: 5, wpGo: 0.4, wpPunt: 0.55, actualCall: "go" }),
      play({ playId: "d", team: "PHI", week: 4, wpGo: 0.52, wpPunt: 0.5, actualCall: "go" }),
    ]);
    const agg = aggregateByTeamWeek(rows);
    expect(agg).toHaveLength(3);

    const dal4 = agg.find((a) => a.team === "DAL" && a.week === 4);
    expect(dal4).toBeDefined();
    if (dal4 === undefined) throw new Error("expected DAL week 4");
    expect(dal4.plays).toBe(2);
    expect(dal4.gradeCounts.A).toBe(2);
    expect(dal4.optimalRate).toBe(1);
    // play a: go−actual = 0; play b: 0.5 − 0.55 = −0.05 → mean −0.025
    expect(dal4.avgWpGoMinusActual).toBeCloseTo(-0.025, 12);
    expect(dal4.avgOptimalGap).toBeCloseTo(0, 12);

    const dal5 = agg.find((a) => a.team === "DAL" && a.week === 5);
    expect(dal5?.gradeCounts.D).toBe(1);
    expect(dal5?.optimalRate).toBe(0);

    const phi4 = agg.find((a) => a.team === "PHI" && a.week === 4);
    expect(phi4?.plays).toBe(1);
    expect(phi4?.gradeCounts.A).toBe(1);
  });

  it("returns an empty array for empty input", () => {
    expect(aggregateByTeamWeek([])).toEqual([]);
    expect(aggregateByTeamWeek(null)).toEqual([]);
  });
});
