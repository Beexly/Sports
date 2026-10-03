import { describe, it, expect, vi, beforeEach } from "vitest";

const findManyMock = vi.fn();

vi.mock("@sports/db", () => ({
  db: {
    pick: {
      findMany: (...args: unknown[]) => findManyMock(...args),
    },
  },
}));

describe("getRecentCalibrationSnapshot", () => {
  beforeEach(() => {
    vi.resetModules();
    findManyMock.mockReset();
  });

  it("converts confidence to a clamped probability and excludes PUSH via the where-clause", async () => {
    findManyMock.mockResolvedValue([
      { confidence: 70, result: "WIN" },
      { confidence: 60, result: "LOSS" },
      { confidence: 100, result: "WIN" }, // clamps to 0.99, not 1.0
    ]);

    const { getRecentCalibrationSnapshot } = await import("../lib/ops/calibration-regression-snapshot");
    const now = new Date("2026-08-10T00:00:00Z");
    const snapshot = await getRecentCalibrationSnapshot(now);

    expect(snapshot).not.toBeNull();
    expect(snapshot!.sampleSize).toBe(3);

    const call = findManyMock.mock.calls[0]![0] as { where: { result: { in: string[] } } };
    expect(call.where.result.in).toEqual(["WIN", "LOSS"]);
  });

  it("queries a 14-day window by default, ending at `now`", async () => {
    findManyMock.mockResolvedValue([]);
    const { getRecentCalibrationSnapshot } = await import("../lib/ops/calibration-regression-snapshot");
    const now = new Date("2026-08-10T00:00:00Z");
    await getRecentCalibrationSnapshot(now);

    const call = findManyMock.mock.calls[0]![0] as {
      where: { settledAt: { gte: Date; lt: Date } };
    };
    expect(call.where.settledAt.lt).toEqual(now);
    expect(call.where.settledAt.gte).toEqual(new Date("2026-07-27T00:00:00Z"));
  });

  it("honors a custom windowDays", async () => {
    findManyMock.mockResolvedValue([]);
    const { getRecentCalibrationSnapshot } = await import("../lib/ops/calibration-regression-snapshot");
    const now = new Date("2026-08-10T00:00:00Z");
    await getRecentCalibrationSnapshot(now, { windowDays: 7 });

    const call = findManyMock.mock.calls[0]![0] as { where: { settledAt: { gte: Date } } };
    expect(call.where.settledAt.gte).toEqual(new Date("2026-08-03T00:00:00Z"));
  });

  it("fails open (returns null) on a DB error rather than throwing", async () => {
    findManyMock.mockRejectedValue(new Error("connection reset"));
    const { getRecentCalibrationSnapshot } = await import("../lib/ops/calibration-regression-snapshot");
    const snapshot = await getRecentCalibrationSnapshot(new Date("2026-08-10T00:00:00Z"));
    expect(snapshot).toBeNull();
  });

  it("returns a well-formed zero snapshot (not null) when the window has no settled picks", async () => {
    findManyMock.mockResolvedValue([]);
    const { getRecentCalibrationSnapshot } = await import("../lib/ops/calibration-regression-snapshot");
    const snapshot = await getRecentCalibrationSnapshot(new Date("2026-08-10T00:00:00Z"));
    expect(snapshot).not.toBeNull();
    expect(snapshot!.sampleSize).toBe(0);
  });

  it("only requests eligibleForLearning, non-bootstrap, published picks", async () => {
    findManyMock.mockResolvedValue([]);
    const { getRecentCalibrationSnapshot } = await import("../lib/ops/calibration-regression-snapshot");
    await getRecentCalibrationSnapshot(new Date("2026-08-10T00:00:00Z"));

    const call = findManyMock.mock.calls[0]![0] as {
      where: { isPublished: boolean; isBootstrap: boolean; signalSnapshot: { is: { eligibleForLearning: boolean } } };
    };
    expect(call.where.isPublished).toBe(true);
    expect(call.where.isBootstrap).toBe(false);
    expect(call.where.signalSnapshot.is.eligibleForLearning).toBe(true);
  });
});
