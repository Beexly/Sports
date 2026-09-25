import { describe, expect, it } from "vitest";
import { gradeFourthDownCalls, gradeFourthDownPlay } from "./fourth-down-grader.js";

describe("fourth-down decision grader", () => {
  it("grades an optimal go-for-it as A", () => {
    const row = gradeFourthDownPlay({ gameId: "g1", playId: "p1", team: "BUF", season: 2026, week: 1, call: "go", optimalCall: "go", wpActual: 0.62, wpOptimal: 0.62 });
    expect(row?.grade).toBe("A");
    expect(row?.wpLost).toBe(0);
  });

  it("grades a punt against a go recommendation as D", () => {
    const row = gradeFourthDownPlay({ gameId: "g1", playId: "p2", team: "BUF", season: 2026, week: 1, call: "punt", optimalCall: "go", wpActual: 0.40, wpOptimal: 0.62 });
    expect(row?.grade).toBe("D");
    expect(row?.wpLost).toBeCloseTo(0.22);
  });

  it("aggregates team call rates and grade counts", () => {
    const result = gradeFourthDownCalls([
      { gameId: "g1", playId: "p1", team: "BUF", season: 2026, week: 1, call: "go", optimalCall: "go", wpActual: 0.62, wpOptimal: 0.62 },
      { gameId: "g1", playId: "p2", team: "BUF", season: 2026, week: 1, call: "punt", optimalCall: "go", wpActual: 0.40, wpOptimal: 0.62 },
    ]);
    expect(result.rows).toHaveLength(2);
    expect(result.aggregates[0]?.plays).toBe(2);
    expect(result.aggregates[0]?.goRate).toBe(0.5);
    expect(result.aggregates[0]?.gradeCounts.D).toBe(1);
  });
});
