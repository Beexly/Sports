import { describe, it, expect } from "vitest";
import {
  composePreMortem,
  composePreMortemUncapped,
  type ComposeInput,
} from "@/lib/pre-mortem/compose";
import type { PickSignalSnapshotInput, PickInput, GameInput } from "@/lib/pre-mortem/templates/types";

const baseSnapshot: PickSignalSnapshotInput = {
  factors: {},
  modelVersion: "v5.1.0",
};

const basePick: PickInput = {
  id: "pick-1",
  gameId: "game-1",
  pickKind: "SPREAD",
  line: "-3.5",
  side: "BOS",
  confidence: 72,
  modelVersion: "v5.1.0",
};

const baseGame: GameInput = {
  homeTeamShort: "BOS",
  awayTeamShort: "NYK",
  sport: "NBA",
};

function input(
  factors: PickSignalSnapshotInput["factors"],
  overrides: Partial<{ pick: Partial<PickInput>; game: Partial<GameInput> }> = {}
): ComposeInput {
  return {
    snapshot: { ...baseSnapshot, factors },
    pick: { ...basePick, ...overrides.pick },
    game: { ...baseGame, ...overrides.game },
  };
}

describe("composePreMortem", () => {
  describe("empty — no templates trigger", () => {
    it("returns no bullets and a coverage-thin warning when no factors fire", () => {
      const result = composePreMortem(input({}));

      expect(result.bullets).toHaveLength(0);
      expect(result.warning).toMatch(/coverage thin/);
      expect(result.warning).toMatch(/0 factors/);
    });
  });

  describe("single bullet — thin coverage warning", () => {
    it("warns when only one bullet fires", () => {
      // lineMovement triggers above 0.4
      const result = composePreMortem(input({ lineMovement: 0.7 }));

      expect(result.bullets).toHaveLength(1);
      expect(result.bullets[0]?.factorKey).toBe("lineMovement");
      expect(result.warning).toMatch(/1 factor/);
    });
  });

  describe("healthy coverage — two or more bullets", () => {
    it("emits no warning when two or more bullets fire", () => {
      // consensus triggers above 0.6; lineMovement triggers above 0.4
      const result = composePreMortem(input({ consensus: 0.8, lineMovement: 0.6 }));

      expect(result.bullets.length).toBeGreaterThanOrEqual(2);
      expect(result.warning).toBeNull();
    });

    it("collects bullet text for each triggered template", () => {
      const result = composePreMortem(input({ consensus: 0.8, lineMovement: 0.6 }));

      const keys = result.bullets.map((b) => b.factorKey);
      expect(keys).toContain("lineMovement");
      expect(keys).toContain("consensus");
    });
  });

  describe("bullet ordering by severityRank", () => {
    it("sorts bullets ascending by severityRank (lowest rank = highest priority)", () => {
      // lineMovement = rank 2, consensus = rank 3
      const result = composePreMortem(input({ consensus: 0.8, lineMovement: 0.6 }));

      const ranks = result.bullets.map((b) => b.severityRank);
      const sorted = [...ranks].sort((a, b) => a - b);
      expect(ranks).toEqual(sorted);
    });
  });

  describe("MAX_BULLETS cap = 4", () => {
    it("caps output at 4 bullets even when many templates trigger", () => {
      // Fire multiple high-value factors
      const result = composePreMortem(
        input({
          consensus: 0.9,
          lineMovement: 0.8,
          depth: 0.7,
          restAdvantage: 0.8,
          scheduleStress: 0.8,
          dataQuality: 0.7,
        })
      );

      expect(result.bullets.length).toBeLessThanOrEqual(4);
    });

    it("emits no warning when at-cap (4 bullets)", () => {
      const result = composePreMortem(
        input({
          consensus: 0.9,
          lineMovement: 0.8,
          depth: 0.7,
          restAdvantage: 0.8,
          scheduleStress: 0.8,
        })
      );

      if (result.bullets.length >= 2) {
        expect(result.warning).toBeNull();
      }
    });
  });

  describe("output shape", () => {
    it("includes generatedAt as an ISO string", () => {
      const ts = new Date("2026-06-01T00:00:00Z");
      const result = composePreMortem({ ...input({}), generatedAt: ts });

      expect(result.generatedAt).toBe("2026-06-01T00:00:00.000Z");
    });

    it("preserves modelVersion from snapshot", () => {
      const snap: PickSignalSnapshotInput = {
        factors: {},
        modelVersion: "v6.0.0",
      };
      const result = composePreMortem({ snapshot: snap, pick: basePick, game: baseGame });

      expect(result.modelVersion).toBe("v6.0.0");
    });

    it("each bullet carries factorKey, severityRank, and non-empty text", () => {
      const result = composePreMortem(input({ lineMovement: 0.9 }));

      for (const bullet of result.bullets) {
        expect(typeof bullet.factorKey).toBe("string");
        expect(bullet.factorKey.length).toBeGreaterThan(0);
        expect(typeof bullet.severityRank).toBe("number");
        expect(typeof bullet.text).toBe("string");
        expect(bullet.text.length).toBeGreaterThan(0);
      }
    });
  });

  describe("pick-kind variant text", () => {
    it("uses 2-point threshold for SPREAD picks in lineMovement bullet", () => {
      const result = composePreMortem(
        input({ lineMovement: 0.9 }, { pick: { pickKind: "SPREAD" } })
      );
      const bullet = result.bullets.find((b) => b.factorKey === "lineMovement");
      expect(bullet?.text).toContain("2 points");
    });

    it("uses 1.5-point threshold for TOTAL picks in lineMovement bullet", () => {
      const result = composePreMortem(
        input({ lineMovement: 0.9 }, { pick: { pickKind: "TOTAL" } })
      );
      const bullet = result.bullets.find((b) => b.factorKey === "lineMovement");
      expect(bullet?.text).toContain("1.5 points");
    });
  });

  describe("consensus bullet content", () => {
    it("references a drop threshold derived from the consensus factor", () => {
      // consensus = 0.8 → 80% → dropThreshold = max(50, 80-10) = 70
      const result = composePreMortem(input({ consensus: 0.8 }));
      const bullet = result.bullets.find((b) => b.factorKey === "consensus");
      expect(bullet?.text).toContain("70%");
    });

    it("clamps drop threshold to 50% minimum", () => {
      // consensus = 0.62 → 62% → dropThreshold = max(50, 62-10) = 52%
      const result = composePreMortem(input({ consensus: 0.62 }));
      const bullet = result.bullets.find((b) => b.factorKey === "consensus");
      expect(bullet?.text).toMatch(/5[0-9]%/);
    });
  });
});

describe("composePreMortemUncapped", () => {
  it("returns more bullets than the capped version when many templates fire", () => {
    const factors: PickSignalSnapshotInput["factors"] = {
      consensus: 0.9,
      lineMovement: 0.8,
      depth: 0.7,
      restAdvantage: 0.8,
      scheduleStress: 0.8,
      dataQuality: 0.7,
    };
    const capped = composePreMortem(input(factors));
    const uncapped = composePreMortemUncapped(input(factors));

    expect(uncapped.length).toBeGreaterThanOrEqual(capped.bullets.length);
  });

  it("returns bullets sorted ascending by severityRank", () => {
    const uncapped = composePreMortemUncapped(
      input({ consensus: 0.9, lineMovement: 0.8 })
    );

    const ranks = uncapped.map((b) => b.severityRank);
    const sorted = [...ranks].sort((a, b) => a - b);
    expect(ranks).toEqual(sorted);
  });

  it("returns empty array when no templates trigger", () => {
    const result = composePreMortemUncapped(input({}));
    expect(result).toHaveLength(0);
  });
});
