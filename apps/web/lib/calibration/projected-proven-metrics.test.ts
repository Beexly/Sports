import { describe, expect, it } from "vitest";
import { projectProvenPathMetrics } from "@/lib/calibration/projected-proven-metrics";
import type { ProvenPathPickRow } from "@/lib/calibration/proven-path-engine";

function row(
  partial: Partial<ProvenPathPickRow> & Pick<ProvenPathPickRow, "y" | "groupKey">,
): ProvenPathPickRow {
  return {
    pConfidence: partial.pConfidence ?? 0.55,
    pEdge: partial.pEdge ?? null,
    pIndependent: partial.pIndependent ?? null,
    y: partial.y,
    groupKey: partial.groupKey,
    marketP: partial.marketP ?? null,
  };
}

describe("projectProvenPathMetrics score selection", () => {
  it("does not force independent when best score is confidence (no indep mass)", () => {
    // All rows confidence-only → bestScore confidence → projection uses conf
    const rows: ProvenPathPickRow[] = [];
    for (let i = 0; i < 120; i++) {
      const p = 0.4 + (i % 20) * 0.01;
      rows.push(
        row({
          pConfidence: p,
          y: i % 2 === 0 ? 1 : 0,
          groupKey: i < 60 ? "soccer_epl|MONEYLINE" : "nba|MONEYLINE",
        }),
      );
    }
    const proj = projectProvenPathMetrics(rows);
    expect(proj.nFull).toBe(120);
    expect(proj.bestScore).toBe("confidence");
    expect(Number.isFinite(proj.full.murphyResolution)).toBe(true);
  });

  it("uses independent blend when independent rows dominate RES", () => {
    // Independent p strongly separates; confidence is noise near 0.5
    const rows: ProvenPathPickRow[] = [];
    for (let i = 0; i < 200; i++) {
      const win = i % 2 === 0;
      rows.push(
        row({
          pConfidence: 0.5 + (Math.random() - 0.5) * 0.02,
          pIndependent: win ? 0.72 : 0.28,
          y: win ? 1 : 0,
          groupKey: "mlb|MONEYLINE",
        }),
      );
    }
    const proj = projectProvenPathMetrics(rows);
    expect(
      proj.bestScore === "independent_trueProb" ||
        proj.bestScore === "blend_indep_conf",
    ).toBe(true);
    expect(proj.full.murphyResolution).toBeGreaterThan(0.01);
  });
});
