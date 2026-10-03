import { describe, expect, it } from "vitest";
import {
  computeResolutionByGroup,
  filterByEdge,
} from "@/lib/calibration/resolution-by-group";

describe("resolution-by-group", () => {
  it("ranks groups and notes near-zero overall res", () => {
    const rows = Array.from({ length: 120 }, (_, i) => {
      const g = i < 60 ? "nfl|spread" : "mlb|ml";
      // nfl has slight ranking; mlb noise
      const p = g.startsWith("nfl")
        ? 0.45 + (i % 10) * 0.02
        : 0.5 + ((i % 3) - 1) * 0.01;
      const y = (g.startsWith("nfl")
        ? p > 0.52
          ? 1
          : 0
        : i % 2) as 0 | 1;
      return {
        groupKey: g,
        p,
        y,
        marketP: 0.5,
      };
    });
    const art = computeResolutionByGroup(rows, { minGroupN: 20 });
    expect(art.groups.length).toBeGreaterThanOrEqual(1);
    expect(art.topByResolution.length).toBeGreaterThan(0);
    expect(art.overall.n).toBe(120);
    const edged = filterByEdge(rows, 0.03);
    expect(edged.length).toBeGreaterThan(0);
  });
});
