import { describe, expect, it, vi } from "vitest";
import { loadLearningSamplePosture } from "@/lib/ops/learning-sample-posture";

function mockDb(counts: {
  settled: number;
  wins: number;
  losses: number;
  pushes: number;
  pending: number;
  seed: number;
  byType?: Array<{ pickType: string; n: number }>;
}) {
  const count = vi.fn();
  // Order matches loadLearningSamplePosture Promise.all
  count
    .mockResolvedValueOnce(counts.settled)
    .mockResolvedValueOnce(counts.wins)
    .mockResolvedValueOnce(counts.losses)
    .mockResolvedValueOnce(counts.pushes)
    .mockResolvedValueOnce(counts.pending)
    .mockResolvedValueOnce(counts.seed);

  const groupBy = vi.fn().mockResolvedValue(
    (counts.byType ?? []).map((r) => ({
      pickType: r.pickType,
      _count: { _all: r.n },
    })),
  );

  return { pick: { count, groupBy } } as never;
}

describe("loadLearningSamplePosture", () => {
  it("never treats seed rows as ladder sample", async () => {
    const posture = await loadLearningSamplePosture(
      mockDb({
        settled: 42,
        wins: 20,
        losses: 18,
        pushes: 4,
        pending: 10,
        seed: 900,
        byType: [
          { pickType: "SPREAD", n: 25 },
          { pickType: "TOTAL", n: 17 },
        ],
      }),
    );
    expect(posture.nonSeedSettled).toBe(42);
    expect(posture.seedSettled).toBe(900);
    expect(posture.meetsCodeFloor).toBe(false);
    expect(posture.meetsPublishStrawman).toBe(false);
    expect(posture.byPickType?.[0]?.pickType).toBe("SPREAD");
    expect(posture.operatorHint).toMatch(/42\/100/);
  });

  it("flags code floor without claiming PROVEN", async () => {
    const posture = await loadLearningSamplePosture(
      mockDb({
        settled: 150,
        wins: 70,
        losses: 70,
        pushes: 10,
        pending: 5,
        seed: 0,
      }),
    );
    expect(posture.meetsCodeFloor).toBe(true);
    expect(posture.meetsPublishStrawman).toBe(false);
    expect(posture.operatorHint).toMatch(/Calibration still requires founder YES/);
  });
});
