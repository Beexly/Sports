import { describe, expect, it } from "vitest";
import {
  compareScoreKinds,
  computeSpearmanSeparation,
  rankWithTies,
  spearmanRho,
} from "@/lib/calibration/spearman-separation";

describe("spearman-separation", () => {
  it("rankWithTies averages ties", () => {
    expect(rankWithTies([3, 1, 1, 2])).toEqual([4, 1.5, 1.5, 3]);
  });

  it("perfect rank correlation → ρ ≈ 1", () => {
    const xs = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    const ys = [0, 0, 0, 0, 1, 1, 1, 1, 1];
    expect(spearmanRho(xs, ys)).toBeGreaterThan(0.8);
  });

  it("anti-ranked scores → negative ρ", () => {
    const points = [
      { p: 0.9, y: 0 as const },
      { p: 0.8, y: 0 as const },
      { p: 0.7, y: 0 as const },
      { p: 0.3, y: 1 as const },
      { p: 0.2, y: 1 as const },
      { p: 0.1, y: 1 as const },
      ...Array.from({ length: 30 }, (_, i) => ({
        p: 0.55 + i * 0.001,
        y: 0 as const,
      })),
      ...Array.from({ length: 30 }, (_, i) => ({
        p: 0.45 - i * 0.001,
        y: 1 as const,
      })),
    ];
    const r = computeSpearmanSeparation(points, { minN: 20 });
    expect(r.rho).toBeLessThan(0);
  });

  it("compareScoreKinds picks stronger series", () => {
    const outcomes = Array.from({ length: 60 }, (_, i) => (i < 30 ? 1 : 0) as 0 | 1);
    const good = outcomes.map((y, i) => ({
      p: y === 1 ? 0.7 : 0.3,
      y,
    }));
    const bad = outcomes.map((y, i) => ({
      p: 0.5 + ((i % 2) * 0.01 - 0.005),
      y,
    }));
    const cmp = compareScoreKinds([
      { kind: "confidence", points: bad },
      { kind: "rankingP", points: good },
    ]);
    expect(cmp.bestKind).toBe("rankingP");
    expect(
      cmp.results.find((r) => r.kind === "rankingP")!.result.rankingSignal,
    ).toBe(true);
  });
});
