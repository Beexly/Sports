import { describe, expect, it } from "vitest";

import {
  ENABLED,
  evaluateEngineSelection,
} from "@/lib/calibration/2403-11016v3-minimax-regret-selection";

describe("2403.11016v3 minimax-regret engine selection", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("reports the stressed state driving each candidate's maximum regret", () => {
    const report = evaluateEngineSelection(
      ["elo", "epa"],
      [
        { stateId: "normal-nfl", sport: "NFL", losses: [0, 2.9] },
        { stateId: "normal-mlb", sport: "MLB", losses: [0, 2.9] },
        { stateId: "qb-injury", sport: "NFL", losses: [0, 2.9] },
        { stateId: "weather-extreme", sport: "NFL", losses: [0, 2.9] },
        { stateId: "tail", sport: "NFL", losses: [10, 3] },
      ],
    );

    expect(report.averageCandidateId).toBe("elo");
    expect(report.mmrCandidateId).toBe("epa");
    expect(report.rankingsDisagree).toBe(true);
    expect(report.scores.find((score) => score.candidateId === "elo")?.worstStateId).toBe("tail");
  });

  it("rejects malformed evaluation matrices", () => {
    expect(() =>
      evaluateEngineSelection([], [{ stateId: "empty", sport: "NFL", losses: [] }]),
    ).toThrow("candidateIds and states must be non-empty");
    expect(() =>
      evaluateEngineSelection(
        ["a", "b"],
        [{ stateId: "short", sport: "MLB", losses: [1] }],
      ),
    ).toThrow("one loss per candidate");
  });
});
