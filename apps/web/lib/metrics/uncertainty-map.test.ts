import { describe, expect, it } from "vitest";
import { buildActiveLearningUncertaintyMap, type UncertaintyMapSample } from "./uncertainty-map";

function sample(
  id: string,
  segmentId: string,
  segmentLabel: string,
  predictedValue: number,
  actualValue: number,
  intervalLower: number,
  intervalUpper: number
): UncertaintyMapSample {
  return {
    actualValue,
    id,
    intervalLower,
    intervalUpper,
    predictedValue,
    segmentId,
    segmentLabel,
  };
}

describe("active-learning uncertainty map", () => {
  it("ranks worst-calibrated under-covered segments first", () => {
    const board = buildActiveLearningUncertaintyMap(
      [
        sample("rb-1", "rb-redzone", "RB red-zone touches", 11, 20, 8, 14),
        sample("rb-2", "rb-redzone", "RB red-zone touches", 10, 2, 7, 13),
        sample("qb-1", "qb-volume", "QB volume", 18, 19, 12, 24),
        sample("qb-2", "qb-volume", "QB volume", 20, 18, 14, 25),
      ],
      new Date("2026-09-08T00:00:00.000Z"),
      { minSampleSize: 2, targetCoverage: 0.8, highErrorThreshold: 5 }
    );

    const first = board.rows[0];
    if (!first) throw new Error("expected an uncertainty row");

    expect(first.segmentId).toBe("rb-redzone");
    expect(first.reasonCodes).toContain("HIGH_ERROR");
    expect(first.reasonCodes).toContain("UNDER_COVERED");
    expect(first.recommendedAction).toBe("WIDEN_INTERVALS");
    expect(first.priorityScore).toBeGreaterThan(board.rows[1]?.priorityScore ?? 0);
  });

  it("flags wide intervals even when coverage is acceptable", () => {
    const board = buildActiveLearningUncertaintyMap(
      [
        sample("stack-1", "game-stacks", "Game stack ceiling", 30, 31, 10, 52),
        sample("stack-2", "game-stacks", "Game stack ceiling", 28, 25, 8, 50),
      ],
      new Date("2026-09-08T00:00:00.000Z"),
      { minSampleSize: 2, targetCoverage: 0.5, wideIntervalThreshold: 20 }
    );

    expect(board.rows[0]?.reasonCodes).toContain("WIDE_INTERVAL");
    expect(board.rows[0]?.recommendedAction).toBe("COLLECT_MORE_DATA");
  });

  it("drops thin segments and stays shadow-only", () => {
    const board = buildActiveLearningUncertaintyMap(
      [
        sample("thin-1", "wr-airyards", "WR air yards", 12, 15, 8, 18),
        sample("bad-1", "", "bad", 12, 15, 8, 18),
      ],
      new Date("2026-09-08T00:00:00.000Z"),
      { minSampleSize: 2 }
    );

    expect(board.rows).toHaveLength(0);
    expect(board.droppedSegments).toBe(1);
    expect(board.status).toBe("SHADOW");
    expect(board.draftOnly).toBe(true);
    expect(board.priced).toBe(false);
  });
});
