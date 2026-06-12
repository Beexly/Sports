import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  STABILITY_META,
  statStabilityGrade,
} from "@/lib/players/stat-stability";

/**
 * Stat Stability Grade (Galaxy Data Doctrine stat factory) — a sample-size
 * trust grade for per-game rates, shipped per the stat commandment with
 * definition, formula, floor, and a stated known weakness.
 */

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("statStabilityGrade", () => {
  it("grades by settled games: 10+ stable, 6-9 developing, under 6 thin", () => {
    expect(statStabilityGrade(17)).toBe("stable");
    expect(statStabilityGrade(10)).toBe("stable");
    expect(statStabilityGrade(9)).toBe("developing");
    expect(statStabilityGrade(6)).toBe("developing");
    expect(statStabilityGrade(5)).toBe("thin");
    expect(statStabilityGrade(3)).toBe("thin");
  });

  it("meaning never depends on color alone — every grade has a glyph + label", () => {
    for (const grade of ["stable", "developing", "thin"] as const) {
      expect(STABILITY_META[grade].glyph.length).toBeGreaterThan(0);
      expect(STABILITY_META[grade].label).toContain("games");
    }
  });

  it("states its known weakness — sample-size only", () => {
    const lib = read("lib/players/stat-stability.ts");
    expect(lib).toContain("Known weakness");
    expect(lib).toMatch(/sample size\s+only/i);
  });
});

describe("Player Lab wiring", () => {
  it("production and snaps tables carry the Stab column with tooltip", () => {
    const table = read("components/players/player-lab-table.tsx");
    expect(table.match(/label: "Stab"/g)?.length).toBe(2);
    expect(table).toContain("STABILITY_TOOLTIP");
    expect(table).toContain("stabilityCell");
  });

  it("the view explainers define the grade for readers", () => {
    const views = read("lib/players/views.tsx");
    expect(views.match(/Stat Stability Grade/g)?.length).toBe(2);
  });
});
