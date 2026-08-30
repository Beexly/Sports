import { describe, expect, it } from "vitest";
import { projectProvenPathMetrics } from "@/lib/calibration/projected-proven-metrics";

describe("projected proven metrics", () => {
  it("reports deltaRes between full and filtered; never selects edge kinds", () => {
    const rows = Array.from({ length: 150 }, (_, i) => {
      const conf = 0.35 + (i % 30) * 0.02;
      return {
        pConfidence: conf,
        pEdge: conf, // diagnostic only
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
    expect(p.bestScore).not.toBe("edgeScore");
    expect(p.bestScore).not.toBe("blend_conf_edge");
    expect(typeof p.bestSeparation).toBe("number");
  });

  it("pathViable false when bestScore polarity inverted", () => {
    // All confidence inverted vs outcome → separation ≤ 0
    const rows = Array.from({ length: 120 }, (_, i) => {
      const win = i % 2 === 0;
      return {
        pConfidence: win ? 0.35 : 0.65,
        pEdge: null,
        pIndependent: null,
        y: (win ? 1 : 0) as 0 | 1,
        groupKey: "thin|ml",
        marketP: null,
      };
    });
    const p = projectProvenPathMetrics(rows);
    expect(p.bestScore).toBe("confidence");
    expect(p.bestSeparation).toBeLessThanOrEqual(0);
    expect(p.pathViable).toBe(false);
    expect(p.message).toMatch(/polarity|separation/i);
  });
});
