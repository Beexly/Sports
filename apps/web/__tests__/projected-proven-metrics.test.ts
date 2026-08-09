import { describe, expect, it } from "vitest";
import { projectProvenPathMetrics } from "@/lib/calibration/projected-proven-metrics";

describe("projected proven metrics", () => {
  it("reports deltaRes between full and filtered", () => {
    const rows = Array.from({ length: 150 }, (_, i) => {
      const conf = 0.35 + (i % 30) * 0.02;
      return {
        pConfidence: conf,
        pEdge: conf,
        pIndependent: conf > 0.5 ? conf : null,
        y: (conf > 0.55 ? 1 : 0) as 0 | 1,
        groupKey: i < 80 ? "nfl|spread" : "noise|ml",
        marketP: 0.5,
      };
    });
    const p = projectProvenPathMetrics(rows);
    expect(p.nFull).toBe(150);
    expect(p.nFiltered).toBeLessThanOrEqual(p.nFull);
    expect(typeof p.message).toBe("string");
  });
});
