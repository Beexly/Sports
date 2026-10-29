import { describe, it, expect } from "vitest";
import {
  CADENCE,
  chicagoParts,
  dueVersion,
  tMinus90,
  sealLock,
} from "../cadence.js";
import { additiveDevig, multiplicativeDevig } from "../devig.js";

describe("Public Baseline Engine", () => {
  describe("Cadence Locks Baseline", () => {
    it("has 6 official locked cadence slots", () => {
      expect(CADENCE).toHaveLength(6);
      expect(CADENCE.map((c) => c.dow)).toEqual([
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sun",
        "Sun",
      ]);
    });

    it("verifies Chicago time conversions for cadence locks", () => {
      const tue = chicagoParts(new Date("2026-10-27T09:00:00Z"));
      const wed = chicagoParts(new Date("2026-10-28T22:00:00Z"));
      const fri = chicagoParts(new Date("2026-10-30T21:30:00Z"));
      expect(dueVersion(tue)).toBe("v1.0");
      expect(dueVersion(wed)).toBe("v2.0");
      expect(dueVersion(fri)).toBe("v3.0");
    });

    it("computes kickoff minus 90 minutes correctly", () => {
      const kick = new Date("2026-10-25T17:00:00Z");
      expect(tMinus90(kick).toISOString()).toBe("2026-10-25T15:30:00.000Z");
    });

    it("creates a deterministic sha256 lock", () => {
      const lock1 = sealLock("v1.0", { test: 123 }, "2026-10-27T09:00:00Z", "2026-10-27T09:00:00Z");
      const lock2 = sealLock("v1.0", { test: 123 }, "2026-10-27T09:00:00Z", "2026-10-27T09:00:00Z");
      expect(lock1.merkle).toHaveLength(64);
      expect(lock1.merkle).toBe(lock2.merkle);
    });
  });

  describe("Devigging Utilities", () => {
    it("multiplicatively de-vigs standard -110 / -110 market to 0.50 / 0.50", () => {
      const fair = multiplicativeDevig([-110, -110]);
      expect(fair[0]).toBeCloseTo(0.5, 4);
      expect(fair[1]).toBeCloseTo(0.5, 4);
    });

    it("computes additive de-vigged probabilities summing to 1.0", () => {
      const fair = additiveDevig([-150, 130]);
      expect(fair[0]! + fair[1]!).toBeCloseTo(1.0, 4);
    });
  });
});
