import { describe, expect, it } from "vitest";
import { rankUncertainCandidates, type CandidatePrediction } from "./uncertainty";

const candidates: readonly CandidatePrediction[] = [
  { id: "confident", probabilities: [0.92, 0.08] },
  { id: "coinflip", probabilities: [0.51, 0.49] },
  { id: "spread", probabilities: [0.34, 0.33, 0.33] },
  { id: "invalid", probabilities: [0, 0] },
];

describe("FABLE uncertainty ranking", () => {
  it("ranks least confidence candidates by lowest top probability", () => {
    const ranked = rankUncertainCandidates(candidates, "least_confidence");

    expect(ranked.map((candidate) => candidate.id)).toEqual(["spread", "coinflip", "confident"]);
    expect(ranked[0]?.rank).toBe(1);
    expect(ranked[0]?.score).toBeCloseTo(0.66, 2);
  });

  it("ranks margin candidates by smallest class gap", () => {
    const ranked = rankUncertainCandidates(candidates, "margin");

    expect(ranked[0]?.id).toBe("spread");
    expect(ranked[1]?.id).toBe("coinflip");
    expect(ranked[0]?.margin).toBeCloseTo(0.01, 2);
  });

  it("ranks entropy candidates by normalized entropy and drops invalid vectors", () => {
    const ranked = rankUncertainCandidates(candidates, "entropy");

    expect(ranked[0]?.id).toBe("spread");
    expect(ranked.some((candidate) => candidate.id === "invalid")).toBe(false);
    expect(ranked[0]?.entropy).toBeGreaterThan(ranked[2]?.entropy ?? 0);
  });
});
