import { describe, expect, it } from "vitest";
import { recommendPick, type DraftPlayer } from "./draft-copilot.js";

const p = (id: string, name: string, position: DraftPlayer["position"], points: number, adp: number): DraftPlayer => ({
  id, name, position, projectedPoints: points, adp, available: true,
});

describe("draft copilot", () => {
  it("picks the higher value-minus-scarcity player and names both candidates", () => {
    const result = recommendPick({
      pickNumber: 1.09,
      rosterSoFar: [],
      availablePlayers: [p("a", "Achane", "RB", 22.8, 1.1), p("b", "Lamb", "WR", 21.7, 1.3)],
    });
    expect(result?.player.name).toBe("Achane");
    expect(result?.reasoning).toContain("Achane");
    expect(result?.reasoning).toContain("Lamb");
  });

  it("returns null with no available candidates", () => {
    expect(recommendPick({ pickNumber: 1, rosterSoFar: [], availablePlayers: [] })).toBeNull();
  });
});
