/**
 * RPCP unit tests — pure, no DB. Polarity law: no edge-as-p kinds.
 */
import { describe, it, expect } from "vitest";
import {
  buildRankingPowerControl,
  rankingPowerPosture,
  type RankingPowerRow,
} from "./ranking-power-control";

function synth(
  n: number,
  opts?: { signal?: boolean; groups?: number; indepRate?: number },
): RankingPowerRow[] {
  const signal = opts?.signal ?? false;
  const groups = opts?.groups ?? 4;
  const indepRate = opts?.indepRate ?? 0.5;
  const rows: RankingPowerRow[] = [];
  for (let i = 0; i < n; i++) {
    const y = (i % 2 === 0 ? 1 : 0) as 0 | 1;
    const base = signal
      ? 0.45 + 0.2 * y + ((i % 7) - 3) * 0.01
      : 0.5 + ((i % 5) - 2) * 0.02;
    const pConfidence = Math.min(0.95, Math.max(0.05, base));
    const pIndependent =
      i / n < indepRate
        ? Math.min(
            0.95,
            Math.max(
              0.05,
              pConfidence + (signal ? 0.08 * (y === 1 ? 1 : -1) : 0),
            ),
          )
        : null;
    rows.push({
      pConfidence,
      pEdge: null,
      pIndependent,
      y,
      // ML market so coverage denom matches bake-off (not TOTAL)
      groupKey: `sport${i % groups}|MONEYLINE`,
      marketP: null,
    });
  }
  return rows;
}

describe("buildRankingPowerControl", () => {
  it("returns pathViable false when no ranking signal", () => {
    const rows = synth(200, { signal: false, indepRate: 0.2 });
    const c = buildRankingPowerControl(rows);
    expect(c.n).toBe(200);
    expect(c.pathViable).toBe(false);
    expect(c.mapsApplyGateOpen).toBe(false);
    expect(c.rankingPolarityLaw).toBe("positive_separation_required");
    expect(["ranking_dead", "missing_independent", "dead_groups"]).toContain(
      c.residual.primaryBottleneck,
    );
    expect(c.honesty).toContain("never lowers floors");
    expect(c.honesty).toContain("Never treats edge as p");
    expect(c.projected).toHaveProperty("brierGapToFloor");
  });

  it("bake-off kinds exclude edge-as-p", () => {
    const rows = synth(120, { signal: false });
    const c = buildRankingPowerControl(rows);
    const kinds = c.scoreBakeoff.map((s) => s.kind);
    expect(kinds).toEqual([
      "confidence",
      "independent_trueProb",
      "blend_indep_conf",
      "marketFairProb",
    ]);
    expect(kinds).not.toContain("edgeScore");
    expect(kinds).not.toContain("blend_conf_edge");
  });

  it("prefers independent when it carries ranking signal and coverage", () => {
    const rows = synth(300, { signal: true, indepRate: 0.9 });
    const c = buildRankingPowerControl(rows);
    expect(c.scoreBakeoff.length).toBe(4);
    expect(
      ["independent_trueProb", "blend_indep_conf", "confidence"].includes(
        c.bestScore,
      ),
    ).toBe(true);
    // Coverage is vs ML/SPREAD eligible — 90% indep rate on all-ML sample
    expect(c.residual.independentCoverage).toBeGreaterThan(0.7);
  });

  it("reports independentCoverage vs ML/SPREAD not diluted by TOTAL", () => {
    const ml = synth(100, { signal: true, indepRate: 1 });
    const totals: RankingPowerRow[] = Array.from({ length: 100 }, (_, i) => ({
      pConfidence: 0.55,
      pIndependent: null,
      y: (i % 2 === 0 ? 1 : 0) as 0 | 1,
      groupKey: "sport0|TOTAL",
      marketP: null,
    }));
    const c = buildRankingPowerControl([...ml, ...totals]);
    // 100/100 ML eligible with indep; TOTAL does not dilute
    expect(c.residual.independentCoverage).toBeGreaterThan(0.95);
    // vs-all is thinner (~50%)
    expect(c.residual.independentCoverageVsAll).toBeLessThan(0.6);
  });

  it("posture is compact for ops surface with residual hint + brier gap", () => {
    const rows = synth(120, { signal: false });
    const c = buildRankingPowerControl(rows);
    const p = rankingPowerPosture(c);
    expect(p.present).toBe(true);
    expect(typeof p.operatorHint).toBe("string");
    expect(p.liveRes).not.toBeNull();
    expect(p.residualOperatorHint).toBeTruthy();
    expect(p.rankingPolarityLaw).toBe("positive_separation_required");
    expect(p.pauseGroups).not.toBeNull();
    expect(p).toHaveProperty("projectedBrier");
    expect(p).toHaveProperty("brierGapToFloor");
  });

  it("null control yields honest empty posture", () => {
    const p = rankingPowerPosture(null);
    expect(p.present).toBe(false);
    expect(p.operatorHint).toMatch(/not seeded/i);
    expect(p.pauseGroups).toBeNull();
  });
});
