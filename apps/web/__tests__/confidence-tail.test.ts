import { describe, expect, it } from "vitest";
import {
  CONFIDENCE_TAIL_FLOOR,
  CONFIDENCE_TAIL_MIN_N,
  loadConfidenceTail,
  summarizeConfidenceTail,
  type ConfidenceTailDb,
  type ConfidenceTailRow,
} from "@/lib/calibration/confidence-tail";

function rows(spec: Array<[confidence: number, wins: number, losses: number, version?: string]>): ConfidenceTailRow[] {
  const out: ConfidenceTailRow[] = [];
  for (const [confidence, wins, losses, version = "v5.2.7"] of spec) {
    for (let i = 0; i < wins; i++) out.push({ confidence, result: "WIN", modelVersion: version });
    for (let i = 0; i < losses; i++) out.push({ confidence, result: "LOSS", modelVersion: version });
  }
  return out;
}

describe("summarizeConfidenceTail", () => {
  it("reproduces the 2026-09-02 production finding: the ≥80 tail is inverted", () => {
    // Observed buckets (n, wins): 80→(77,28) 85→(39,13) 90→(17,8) 95→(11,5) 100→(8,7)
    const s = summarizeConfidenceTail(
      rows([
        [82, 28, 49, "v5.0.0"],
        [87, 13, 26, "v5.0.0"],
        [92, 8, 9, "v5.1.0"],
        [96, 5, 6, "v5.1.0"],
        [100, 7, 1, "v5.2.7"],
      ]),
    );
    expect(s.floor).toBe(CONFIDENCE_TAIL_FLOOR);
    expect(s.n).toBe(152);
    expect(s.wins).toBe(61);
    expect(s.winRate).toBeCloseTo(0.4013, 3);
    expect(s.claimedRate).toBeGreaterThan(0.8);
    expect(s.verdict).toBe("inverted");
    expect(s.operatorHint).toMatch(/anti-predictive/);
    expect(s.byVersion.map((v) => v.modelVersion)).toEqual(["v5.0.0", "v5.1.0", "v5.2.7"]);
    expect(s.byVersion[2]).toEqual({ modelVersion: "v5.2.7", n: 8, wins: 7, winRate: 0.875 });
  });

  it("never issues a verdict below the sample floor", () => {
    const s = summarizeConfidenceTail(rows([[85, 2, CONFIDENCE_TAIL_MIN_N - 3]]));
    expect(s.n).toBe(CONFIDENCE_TAIL_MIN_N - 1);
    expect(s.verdict).toBe("insufficient");
    expect(s.operatorHint).toMatch(/no tail verdict yet/);
  });

  it("overconfident when the tail wins but far less than it claims; calibrated when it earns it", () => {
    expect(summarizeConfidenceTail(rows([[85, 33, 27]])).verdict).toBe("overconfident"); // 55% vs 85%
    expect(summarizeConfidenceTail(rows([[82, 48, 12]])).verdict).toBe("calibrated"); // 80% vs 82%
  });

  it("ignores rows below the floor and non-finite confidences", () => {
    const s = summarizeConfidenceTail([
      ...rows([[79, 10, 0]]),
      { confidence: Number.NaN, result: "WIN", modelVersion: "v5.2.7" },
      ...rows([[80, 1, 1]]),
    ]);
    expect(s.n).toBe(2);
    expect(s.brier).toBeCloseTo(((0.8 - 1) ** 2 + 0.8 ** 2) / 2, 6);
  });
});

describe("loadConfidenceTail", () => {
  it("reads only graded WIN/LOSS picks at or above the floor", async () => {
    let seenArgs: unknown = null;
    const db: ConfidenceTailDb = {
      pick: {
        findMany: async (args) => {
          seenArgs = args;
          return [
            { confidence: 85, result: "WIN", modelVersion: "v5.2.7" },
            { confidence: 90, result: "LOSS", modelVersion: "v5.2.7" },
            { confidence: 90, result: "PUSH", modelVersion: "v5.2.7" }, // defensive: filtered client-side too
          ];
        },
      },
    };
    const s = await loadConfidenceTail(db, 80);
    expect(seenArgs).toMatchObject({ where: { result: { in: ["WIN", "LOSS"] }, confidence: { gte: 80 } } });
    expect(s.n).toBe(2);
    expect(s.wins).toBe(1);
    expect(s.verdict).toBe("insufficient");
  });
});
