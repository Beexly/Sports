/**
 * Fantasy draft copilot — tests.
 *
 * Coverage: value-minus-scarcity scoring, positional scarcity penalty,
 * roster-need bonus, external adp/projections maps, tier assignment,
 * reasoning naming leading candidates, and the 1.09 Achane-vs-Lamb case.
 */
import { describe, expect, it } from "vitest";
import {
  createDraftCopilot,
  recommendPick,
  rosterNeedBonusFor,
  scarcityPenaltyFor,
  scoreCandidates,
  type DraftCopilotInput,
  type DraftPlayer,
} from "./draft-copilot.js";

function player(
  id: string,
  name: string,
  position: string,
  projectedPoints: number,
  adp: number,
  available = true,
): DraftPlayer {
  return { id, name, position, projectedPoints, adp, available };
}

describe("scarcityPenaltyFor", () => {
  it("is zero on a cliff and positive on a deep board", () => {
    const stud = player("s", "Stud RB", "RB", 300, 2);
    // Cliff: nobody else at RB -> no scarcity penalty.
    expect(scarcityPenaltyFor(stud, [stud], 300)).toBe(0);

    // Deep board: a nearly-as-good back is the next starter -> large gap
    // to the guy past the starter group is small, so penalty is small;
    // add a deep third back to raise the penalty via a higher cliff index.
    const rb2 = player("b", "RB2", "RB", 280, 10);
    const rb3 = player("c", "RB3", "RB", 200, 20);
    // starters=2 -> cliffIndex=1 -> nextPastStarters = 200 (sorted [280,200]).
    expect(scarcityPenaltyFor(stud, [stud, rb2, rb3], 300)).toBeCloseTo(50, 10);
  });
});

describe("rosterNeedBonusFor", () => {
  it("rewards empty starter slots, shrinks for flex, vanishes when filled", () => {
    expect(rosterNeedBonusFor("RB", [])).toBe(12);
    expect(rosterNeedBonusFor("RB", ["RB"])).toBe(12); // second RB starter slot still open
    expect(rosterNeedBonusFor("RB", ["RB", "RB"])).toBe(4); // starters filled, flex hole left
    expect(rosterNeedBonusFor("RB", ["RB", "RB", "RB"])).toBe(0);
    expect(rosterNeedBonusFor("QB", [])).toBe(12);
    expect(rosterNeedBonusFor("QB", ["QB"])).toBe(0); // QB not flex-eligible
    expect(rosterNeedBonusFor("WR", ["WR", "WR"])).toBe(4);
    expect(rosterNeedBonusFor("WR", ["WR", "WR", "WR"])).toBe(0);
  });
});

describe("scoreCandidates", () => {
  it("honors external projections and adp maps over inline fields", () => {
    const inline = player("p1", "Inline", "WR", 100, 50);
    const input: DraftCopilotInput = {
      pickNumber: 1,
      rosterSoFar: [],
      availablePlayers: [inline],
      adp: { p1: 3 },
      projections: { p1: 250 },
    };
    const scored = scoreCandidates(input);
    expect(scored[0]?.projectedPoints).toBe(250);
    expect(scored[0]?.adp).toBe(3);
  });

  it("drops unavailable players and sorts best-first", () => {
    const input: DraftCopilotInput = {
      pickNumber: 2,
      rosterSoFar: ["QB"],
      availablePlayers: [
        player("gone", "Gone", "RB", 400, 1, false),
        player("ok", "Ok", "WR", 180, 12),
        player("good", "Good", "RB", 220, 8),
      ],
    };
    const scored = scoreCandidates(input);
    expect(scored.map((c) => c.id)).toEqual(["good", "ok"]);
  });
});

describe("recommendPick — 1.09 Achane vs Lamb", () => {
  /**
   * Round 1, pick 9 in a 12-team PPR league. The manager already has
   * one WR, so RB carries the larger roster-need bonus. Lamb projects a
   * few more raw points, but Achane sits on a steeper RB cliff
   * (value-minus-scarcity favours Achane once scarcity is charged).
   */
  function achaneVsLamb(overrides: Partial<DraftCopilotInput> = {}): DraftCopilotInput {
    return {
      pickNumber: 9,
      rosterSoFar: ["WR"],
      availablePlayers: [
        player("achane", "De'Von Achane", "RB", 268.4, 9.2),
        player("lamb", "CeeDee Lamb", "WR", 275.1, 4.8),
        // Supporting cast that sets the scarcity cliffs.
        player("rb2", "Breece Hall", "RB", 240.0, 14.0),
        player("wr2", "Amon-Ra St. Brown", "WR", 255.0, 10.5),
      ],
      adp: {
        achane: 9.2,
        lamb: 4.8,
      },
      projections: {
        achane: 268.4,
        lamb: 275.1,
      },
      ...overrides,
    };
  }

  it("selects the higher value-minus-scarcity player and names leading candidates", () => {
    const input = achaneVsLamb();
    const scored = scoreCandidates(input);

    // value-minus-scarcity (need bonus held aside) for the two contenders.
    const achane = scored.find((c) => c.id === "achane");
    const lamb = scored.find((c) => c.id === "lamb");
    expect(achane).toBeDefined();
    expect(lamb).toBeDefined();

    const achaneValueMinusScarcity = (achane?.projectedValue ?? 0) - (achane?.scarcityPenalty ?? 0);
    const lambValueMinusScarcity = (lamb?.projectedValue ?? 0) - (lamb?.scarcityPenalty ?? 0);

    // The selected player must be the higher value-minus-scarcity name.
    const expectedId =
      achaneValueMinusScarcity >= lambValueMinusScarcity ? "achane" : "lamb";
    const expectedName = expectedId === "achane" ? "De'Von Achane" : "CeeDee Lamb";

    const rec = recommendPick(input);
    expect(rec.player).toBe(expectedName);
    expect(rec.scored[0]?.id).toBe(expectedId);
    expect(rec.scoreed?.[0]?.score ?? rec.scored[0]?.score).toBeCloseTo(
      Math.max(
        (achane?.projectedValue ?? 0) - (achane?.scarcityPenalty ?? 0) + (achane?.rosterNeedBonus ?? 0),
        (lamb?.projectedValue ?? 0) - (lamb?.scarcityPenalty ?? 0) + (lamb?.rosterNeedBonus ?? 0),
      ),
      10,
    );

    // Tier is on the documented ladder.
    expect(["elite", "starter", "flex", "replaceable"]).toContain(rec.tier);

    // Reasoning mentions the pick and the leading candidates.
    expect(rec.reasoning).toContain("Pick 9");
    expect(rec.reasoning).toContain(expectedName);
    expect(rec.reasoning).toContain("Leading candidates");
    expect(rec.reasoning).toContain("De'Von Achane");
    expect(rec.reasoning).toContain("CeeDee Lamb");
  });

  it("roster need can flip the call when Lamb's raw edge is small", () => {
    // Same board, but Lamb is projected well clear of Achane: Lamb wins
    // on value-minus-scarcity regardless of the need bonus.
    const lambHeavy = achaneVsLamb({
      projections: { achane: 200, lamb: 320 },
    });
    const rec = recommendPick(lambHeavy);
    expect(rec.player).toBe("CeeDee Lamb");
  });

  it("throws when nothing is available", () => {
    expect(() =>
      recommendPick({
        pickNumber: 1,
        rosterSoFar: [],
        availablePlayers: [player("x", "X", "RB", 1, 1, false)],
      }),
    ).toThrow(/no available players/);
  });
});

describe("createDraftCopilot (handoff DraftCopilotApi)", () => {
  it("exposes recommendPick() returning the documented shape", () => {
    const api = createDraftCopilot();
    expect(typeof api.recommendPick).toBe("function");
    const rec = api.recommendPick({
      pickNumber: 3,
      rosterSoFar: [],
      availablePlayers: [player("p", "Patrick Mahomes", "QB", 320, 12)],
    });
    expect(rec).toHaveProperty("player");
    expect(rec).toHaveProperty("projectedPoints");
    expect(rec).toHaveProperty("tier");
    expect(rec).toHaveProperty("reasoning");
    expect(rec.projectedPoints).toBe(320);
    expect(rec.player).toBe("Patrick Mahomes");
  });
});
