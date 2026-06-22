import { describe, it, expect } from "vitest";
import {
  ACADEMY_TRACKS,
  ACADEMY_MODULE_IDS,
  computeMastery,
  masteryTier,
} from "@/lib/academy/progress";

/**
 * Academy LMS spine — tracks, modules, mastery.
 */

describe("academy progress", () => {
  it("defines ordered tracks with real, anchored modules", () => {
    expect(ACADEMY_TRACKS.length).toBeGreaterThanOrEqual(3);
    for (const t of ACADEMY_TRACKS) {
      expect(t.modules.length).toBeGreaterThan(0);
      for (const m of t.modules) {
        expect(m.href.length).toBeGreaterThan(0);
        expect(m.drill.length).toBeGreaterThan(0);
      }
    }
  });

  it("module ids are unique across the curriculum", () => {
    expect(new Set(ACADEMY_MODULE_IDS).size).toBe(ACADEMY_MODULE_IDS.length);
  });

  it("computes mastery as a true fraction of completed modules", () => {
    const empty = computeMastery(new Set());
    expect(empty.pct).toBe(0);
    expect(empty.tier).toBe("Unranked");

    const all = computeMastery(new Set(ACADEMY_MODULE_IDS));
    expect(all.pct).toBe(100);
    expect(all.tier).toBe("Mastered");
    expect(all.completed).toBe(all.total);
  });

  it("ignores unknown ids and tracks per-track counts", () => {
    const firstTrack = ACADEMY_TRACKS[0]!;
    const m = computeMastery(new Set([firstTrack.modules[0]!.id, "bogus-id"]));
    expect(m.completed).toBe(1);
    expect(m.byTrack[firstTrack.id]!.completed).toBe(1);
  });

  it("names mastery tiers monotonically", () => {
    expect(masteryTier(0)).toBe("Unranked");
    expect(masteryTier(10)).toBe("Rookie");
    expect(masteryTier(50)).toBe("Training");
    expect(masteryTier(80)).toBe("Sharp");
    expect(masteryTier(100)).toBe("Mastered");
  });
});
