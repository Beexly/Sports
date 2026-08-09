/**
 * RPCP unit tests — pure, no DB.
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
      ? 0.45 + 0.2 * y + (Math.random() - 0.5) * 0.05
      : 0.5 + (Math.random() - 0.5) * 0.08;
    const pConfidence = Math.min(0.95, Math.max(0.05, base));
    const pIndependent =
      Math.random() < indepRate
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
      groupKey: `sport${i % groups}|ml`,
      marketP: null,
    });
  }
  return rows;
}

describe("buildRankingPowerControl", () => {
  it("returns pathViable false and ranking_dead when no signal", () => {
    const rows = synth(200, { signal: false, indepRate: 0.2 });
    const c = buildRankingPowerControl(rows);
    expect(c.n).toBe(200);
    expect(c.pathViable).toBe(false);
    expect(c.mapsApplyGateOpen).toBe(false);
    expect(["ranking_dead", "missing_independent", "dead_groups"]).toContain(
      c.residual.primaryBottleneck,
    );
    expect(c.honesty).toContain("never lowers floors");
  });

  it("prefers independent when it carries ranking signal", () => {
    const rows = synth(300, { signal: true, indepRate: 0.9 });
    const c = buildRankingPowerControl(rows);
    expect(c.scoreBakeoff.length).toBe(5);
    expect(
      ["independent_trueProb", "blend_indep_conf", "confidence"].includes(
        c.bestScore,
      ),
    ).toBe(true);
    expect(c.residual.independentCoverage).toBeGreaterThan(0.7);
  });

  it("posture is compact for ops surface", () => {
    const rows = synth(120, { signal: false });
    const c = buildRankingPowerControl(rows);
    const p = rankingPowerPosture(c);
    expect(p.present).toBe(true);
    expect(typeof p.operatorHint).toBe("string");
    expect(p.liveRes).not.toBeNull();
  });

  it("null control yields honest empty posture", () => {
    const p = rankingPowerPosture(null);
    expect(p.present).toBe(false);
    expect(p.operatorHint).toMatch(/not seeded/i);
  });
});
