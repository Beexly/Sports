import { describe, expect, it } from "vitest";
import {
  computeSegmentedMurphy,
  integrityGuardedDeltaSweep,
  varPNeededForBrierFloor,
  detectProbabilityStretch,
  partitionByDelta,
} from "@/lib/calibration/segmented-murphy";
import {
  BRIER_OPTIMIZATION_TECHNIQUES,
  summarizeBrierProgram,
  resNeededForBrierFloor,
} from "@/lib/calibration/brier-minimization-explore";
import { selectivePublishSweep } from "@/lib/calibration/selective-publish";

function makeSeparatingRows(n = 200) {
  // Strong ranking: high p → more wins
  return Array.from({ length: n }, (_, i) => {
    const p = 0.2 + (i / (n - 1)) * 0.6; // 0.2..0.8
    // deterministic-ish with seed from i
    const yDet = (p > 0.5 ? (i % 5 !== 0 ? 1 : 0) : i % 5 === 0 ? 1 : 0) as 0 | 1;
    return {
      p,
      y: yDet,
      groupKey: i < n / 2 ? "nfl|MONEYLINE" : "mlb|SPREAD",
    };
  });
}

describe("segmented Murphy + integrity", () => {
  it("partitions by delta", () => {
    const rows = [
      { p: 0.5, y: 1 as const },
      { p: 0.7, y: 1 as const },
      { p: 0.3, y: 0 as const },
    ];
    const { published, paused } = partitionByDelta(rows, 0.15);
    expect(paused).toHaveLength(1);
    expect(published).toHaveLength(2);
  });

  it("computes varP and integrity fields", () => {
    const rows = makeSeparatingRows(120);
    const rep = computeSegmentedMurphy(rows, 0.1);
    expect(rep.full.n).toBe(120);
    expect(rep.published.n).toBeGreaterThan(0);
    expect(Number.isFinite(rep.published.varP)).toBe(true);
    expect(rep.varPNeededForFloor).toBeGreaterThan(0);
    expect(typeof rep.integrity.status).toBe("string");
  });

  it("varP needed matches RES envelope", () => {
    // UNC 0.25, floor 0.22, REL 0 → need 0.03
    expect(varPNeededForBrierFloor(0.25, 0.22, 0)).toBeCloseTo(0.03, 8);
    expect(resNeededForBrierFloor(0.25, 0.22, 0.02)).toBeCloseTo(0.05, 8);
  });

  it("integrity sweep returns grid", () => {
    const rows = makeSeparatingRows(150);
    const s = integrityGuardedDeltaSweep(rows, {
      deltas: [0, 0.08, 0.12, 0.18],
      minPublishedN: 20,
      minPausedN: 5,
    });
    expect(s.grid.length).toBe(4);
    expect(s.note).toMatch(/Integrity/);
  });

  it("detects probability stretch anti-pattern", () => {
    const raw = Array.from({ length: 40 }, (_, i) => 0.3 + i * 0.01);
    const stretched = raw.map((p) => 0.5 + 1.4 * (p - 0.5));
    const d = detectProbabilityStretch(raw, stretched);
    expect(d.stretched).toBe(true);
    expect(d.approxFactor!).toBeGreaterThan(1.2);
  });

  it("selective sweep exposes integrityRecommended", () => {
    const rows = makeSeparatingRows(100).map((r) => ({
      ...r,
      marketP: 0.5 as number | null,
    }));
    const s = selectivePublishSweep(rows, { minN: 20 });
    expect(s.grid.length).toBeGreaterThan(0);
    expect("integrityRecommended" in s).toBe(true);
  });
});

describe("brier technique catalog", () => {
  it("lists techniques and RES levers", () => {
    expect(BRIER_OPTIMIZATION_TECHNIQUES.length).toBeGreaterThanOrEqual(6);
    expect(
      BRIER_OPTIMIZATION_TECHNIQUES.some((t) => t.id === "integrity_delta"),
    ).toBe(true);
  });

  it("summarizes live RED program", () => {
    const s = summarizeBrierProgram({
      brier: 0.2478,
      reliability: 0.004,
      resolution: 0.0048,
      uncertainty: 0.2479,
    });
    expect(s.status).toBe("RED");
    expect(s.resGap).toBeGreaterThan(0);
    expect(s.explain).toMatch(/RES/);
  });
});
