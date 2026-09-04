import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression: a durable READ failure must not be cached as a durable ABSENCE.
 *
 * `getCachedRankingPauseDurable` memoises with `undefined` as its "not loaded"
 * sentinel, so any `null` it stores is a CACHED VALUE. `loadRankingPauseApply`
 * returns `null` for both "no record" and "the query threw", so a single
 * transient DB failure latched "no pause is in effect" for the life of the
 * isolate — a kill switch silently becoming a no-op until a restart.
 *
 * The fix reads through `readRankingPauseApply`, which keeps `absent` and
 * `error` apart, and declines to cache the latter.
 *
 * These assertions drive the SECOND call. A test that only checked the first
 * call returns `null` would pass against the broken code too.
 */

const findFirstMock = vi.fn();
const stubMock = vi.fn(() => false);

vi.mock("@sports/db", () => ({
  isStubMode: () => stubMock(),
  db: { jarvisMemoryEvent: { findFirst: (...a: unknown[]) => findFirstMock(...a) } },
}));

const SNAP = {
  enabled: true,
  groups: ["g1"],
  setAt: "2026-01-01T00:00:00.000Z",
  setBy: "founder",
  note: "paused",
};

describe("durable ranking-pause read: failure is not an absence", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    stubMock.mockReturnValue(false);
    const rt = await import("@/lib/calibration/selective-publish-runtime");
    rt.clearSelectiveRuntimeCaches();
  });

  it("recovers on the next call after a transient read failure", async () => {
    const { getCachedRankingPauseDurable } = await import(
      "@/lib/calibration/selective-publish-runtime"
    );

    findFirstMock.mockRejectedValueOnce(new Error("connection terminated"));
    expect(await getCachedRankingPauseDurable()).toBeNull();

    // THE ASSERTION THAT BITES: the pause must reassert itself once the DB is
    // reachable. Against the latching version this stays null forever.
    findFirstMock.mockResolvedValueOnce({ metadata: SNAP, full_text: null });
    const second = await getCachedRankingPauseDurable();
    expect(second).not.toBeNull();
    expect(second?.enabled).toBe(true);
    expect(second?.groups).toEqual(["g1"]);
    expect(findFirstMock).toHaveBeenCalledTimes(2);
  });

  it("still caches a genuine absence — one query, not one per call", async () => {
    const { getCachedRankingPauseDurable } = await import(
      "@/lib/calibration/selective-publish-runtime"
    );

    findFirstMock.mockResolvedValue(null);
    expect(await getCachedRankingPauseDurable()).toBeNull();
    expect(await getCachedRankingPauseDurable()).toBeNull();
    expect(await getCachedRankingPauseDurable()).toBeNull();
    expect(findFirstMock).toHaveBeenCalledTimes(1);
  });

  it("readRankingPauseApply reports absence and unavailability distinctly", async () => {
    const { readRankingPauseApply } = await import("@/lib/ops/ranking-pause-durable");

    findFirstMock.mockResolvedValueOnce(null);
    expect(await readRankingPauseApply()).toEqual({ status: "absent" });

    findFirstMock.mockRejectedValueOnce(new Error("connection terminated"));
    const failed = await readRankingPauseApply();
    expect(failed.status).toBe("error");
    expect(failed).toHaveProperty("message");
  });
});
