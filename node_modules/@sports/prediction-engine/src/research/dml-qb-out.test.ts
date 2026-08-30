import { describe, expect, it } from "vitest";
import { generateDmlPanel, DEFAULT_PANEL } from "./dml-panel.js";
import { diagnoseQbOut, estimateQbOutAtt, sensitivityInterval } from "./dml-qb-out.js";

describe("dml-panel", () => {
  it("is deterministic", () => {
    expect(generateDmlPanel(3)).toEqual(generateDmlPanel(3));
  });

  it("has both treated and control rows", () => {
    const rows = generateDmlPanel(1);
    expect(rows.some((r) => r.treatment === 1)).toBe(true);
    expect(rows.some((r) => r.treatment === 0)).toBe(true);
    expect(rows.length).toBeGreaterThan(50);
  });
});

describe("DML QB-out prototype", () => {
  it("empty panel is honest zeros, shadow", () => {
    const est = estimateQbOutAtt([]);
    expect(est.n).toBe(0);
    expect(est.att).toBe(0);
    expect(est.priced).toBe(false);
    expect(est.status).toBe("shadow");
  });

  it("recovers a negative ATT on the planted panel", () => {
    const rows = generateDmlPanel(11, { ...DEFAULT_PANEL, plantedAtt: -0.08 });
    const est = estimateQbOutAtt(rows);
    expect(est.n).toBeGreaterThan(20);
    expect(est.att).toBeLessThan(0);
    expect(est.priced).toBe(false);
  });

  it("placebo CI contains 0; SUTVA note is present", () => {
    const rows = generateDmlPanel(21);
    const d = diagnoseQbOut(rows, 9);
    expect(d.placeboContainsZero).toBe(true);
    expect(d.sutvaNote.toLowerCase()).toContain("sutva");
    expect(d.estimate.status).toBe("shadow");
  });

  it("sensitivity widens the interval for Γ>1", () => {
    const rows = generateDmlPanel(5, { ...DEFAULT_PANEL, nWeeks: 12 });
    const est = estimateQbOutAtt(rows);
    const g1 = sensitivityInterval(est, 1);
    const g2 = sensitivityInterval(est, 2);
    expect(g2[0]!).toBeLessThan(g1[0]!);
    expect(g2[1]!).toBeGreaterThan(g1[1]!);
  });

  it("rejects Γ<1", () => {
    const est = estimateQbOutAtt([]);
    expect(() => sensitivityInterval(est, 0.5)).toThrow(RangeError);
  });
});
