import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression: how the durable control caches behave when the database is
 * unreachable, malformed, or simply due a re-read.
 *
 * Four properties, each of which was a defect on its own:
 *
 *  1. a read FAILURE must not be stored as an ABSENCE. These caches memoise
 *     with `undefined` as the "not loaded" sentinel, so any `null` stored is a
 *     cached VALUE — and the lossy loaders returned `null` for both "no record"
 *     and "the query threw". One transient fault latched "no pause is in
 *     effect" for the life of the isolate: a kill switch silently becoming a
 *     no-op until a restart.
 *  2. refusing to store the failure is not enough on its own.
 *     `passesPublicSelectiveFilterAsync` runs once per candidate pick inside a
 *     `Promise.all`, so an unstored failing read turned one picks request into
 *     a query storm against a database that was already down.
 *  3. while a read is failing, the LAST KNOWN value must keep being served. A
 *     database we cannot reach is not evidence that the founder lifted the
 *     pause.
 *  4. a SUCCESSFUL read must not be trusted forever. `clearSelectiveRuntimeCaches`
 *     only clears the isolate that served the ops write, so without an expiry a
 *     founder enabling a pause stayed invisible to every already-warm isolate.
 *
 * The assertions drive the SECOND and later calls. A test that only checked
 * that the first call returns `null` would pass against every broken version.
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

const PLAN = {
  generatedAt: "2026-01-01T00:00:00.000Z",
  pauseGroups: ["nfl|SPREAD"],
  defaultDelta: 0.05,
};

/** Must exceed DURABLE_FAILURE_BACKOFF_MS in selective-publish-runtime. */
const PAST_BACKOFF_MS = 6_000;
/** Must exceed DURABLE_FRESH_MS in selective-publish-runtime. */
const PAST_FRESHNESS_MS = 61_000;

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  // reset, not clear: clearAllMocks wipes call records but LEAVES
  // implementations, so a `mockResolvedValue(null)` from an earlier case would
  // silently become the default for every later one — in a suite whose whole
  // point is "a failed read is not an absence", that is the worst possible
  // stale default.
  vi.resetAllMocks();
  stubMock.mockReturnValue(false);
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const rt = await import("@/lib/calibration/selective-publish-runtime");
  rt.clearSelectiveRuntimeCaches();
});

afterEach(() => {
  errorSpy.mockRestore();
  vi.useRealTimers();
});

describe("durable ranking-pause read: failure is not an absence", () => {
  it("recovers once the backoff has elapsed and the database answers", async () => {
    vi.useFakeTimers();
    const { getCachedRankingPauseDurable } = await import(
      "@/lib/calibration/selective-publish-runtime"
    );

    findFirstMock.mockRejectedValueOnce(new Error("connection terminated"));
    expect(await getCachedRankingPauseDurable()).toBeNull();

    // THE ASSERTION THAT BITES: the pause must reassert itself once the DB is
    // reachable. Against the latching version this stays null forever.
    vi.advanceTimersByTime(PAST_BACKOFF_MS);
    findFirstMock.mockResolvedValueOnce({ metadata: SNAP, full_text: null });
    const second = await getCachedRankingPauseDurable();
    expect(second).not.toBeNull();
    expect(second?.enabled).toBe(true);
    expect(second?.groups).toEqual(["g1"]);
    expect(findFirstMock).toHaveBeenCalledTimes(2);
  });

  it("does not re-query on every call while the read is failing", async () => {
    // Property 2. Not storing the failure is right; retrying it per candidate
    // pick is a stampede against a database that is already down.
    const { getCachedRankingPauseDurable } = await import(
      "@/lib/calibration/selective-publish-runtime"
    );

    findFirstMock.mockRejectedValue(new Error("connection terminated"));
    for (let i = 0; i < 25; i += 1) {
      expect(await getCachedRankingPauseDurable()).toBeNull();
    }
    expect(findFirstMock).toHaveBeenCalledTimes(1);
  });

  it("collapses concurrent callers into a single read", async () => {
    // `passesPublicSelectiveFilterAsync` is awaited once per pick inside a
    // Promise.all, so a cold cache used to fan out one query per pick.
    const { getCachedRankingPauseDurable } = await import(
      "@/lib/calibration/selective-publish-runtime"
    );

    findFirstMock.mockResolvedValue({ metadata: SNAP, full_text: null });
    const all = await Promise.all(
      Array.from({ length: 20 }, () => getCachedRankingPauseDurable()),
    );

    expect(all.every((r) => r?.enabled === true)).toBe(true);
    expect(findFirstMock).toHaveBeenCalledTimes(1);
  });

  it("keeps serving the last known pause while the database is unreachable", async () => {
    // Property 3. A database we cannot reach is not evidence that the founder
    // lifted the pause — dropping to null here would resume publishing the
    // suppressed groups mid-outage.
    vi.useFakeTimers();
    const { getCachedRankingPauseDurable } = await import(
      "@/lib/calibration/selective-publish-runtime"
    );

    findFirstMock.mockResolvedValueOnce({ metadata: SNAP, full_text: null });
    expect((await getCachedRankingPauseDurable())?.enabled).toBe(true);

    vi.advanceTimersByTime(PAST_FRESHNESS_MS);
    findFirstMock.mockRejectedValue(new Error("connection terminated"));
    const duringOutage = await getCachedRankingPauseDurable();

    expect(duringOutage?.enabled).toBe(true);
    expect(duringOutage?.groups).toEqual(["g1"]);
  });

  it("caches a genuine absence, but only until it goes stale", async () => {
    // Property 4. `clearSelectiveRuntimeCaches` only clears the isolate that
    // served the ops POST, so without an expiry a founder enabling a pause
    // stayed invisible to every already-warm isolate until it recycled.
    vi.useFakeTimers();
    const { getCachedRankingPauseDurable } = await import(
      "@/lib/calibration/selective-publish-runtime"
    );

    findFirstMock.mockResolvedValue(null);
    expect(await getCachedRankingPauseDurable()).toBeNull();
    expect(await getCachedRankingPauseDurable()).toBeNull();
    expect(await getCachedRankingPauseDurable()).toBeNull();
    expect(findFirstMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(PAST_FRESHNESS_MS);
    findFirstMock.mockResolvedValue({ metadata: SNAP, full_text: null });
    expect((await getCachedRankingPauseDurable())?.enabled).toBe(true);
    expect(findFirstMock).toHaveBeenCalledTimes(2);
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

  it("treats a malformed payload as unavailable, never as 'no pause set'", async () => {
    // A row EXISTS but cannot be understood. Reporting `absent` would hand the
    // decision back to the env var and let the cache store it — a corrupt row
    // silently disabling a suppression control.
    const { readRankingPauseApply } = await import("@/lib/ops/ranking-pause-durable");

    findFirstMock.mockResolvedValueOnce({ metadata: { enabled: "yes" }, full_text: null });
    expect((await readRankingPauseApply()).status).toBe("error");

    findFirstMock.mockResolvedValueOnce({ metadata: null, full_text: "not json at all" });
    expect((await readRankingPauseApply()).status).toBe("error");

    // `groups` is what decides WHAT is suppressed, so a record without it as an
    // array is not a usable control state — not "a pause with nothing in it".
    findFirstMock.mockResolvedValueOnce({
      metadata: { enabled: true, groups: "nfl|SPREAD" },
      full_text: null,
    });
    expect((await readRankingPauseApply()).status).toBe("error");
  });

  it("does not store a malformed row as a value — the cache retries it", async () => {
    vi.useFakeTimers();
    const { getCachedRankingPauseDurable } = await import(
      "@/lib/calibration/selective-publish-runtime"
    );

    findFirstMock.mockResolvedValueOnce({ metadata: { enabled: "yes" }, full_text: null });
    expect(await getCachedRankingPauseDurable()).toBeNull();

    vi.advanceTimersByTime(PAST_BACKOFF_MS);
    findFirstMock.mockResolvedValueOnce({ metadata: SNAP, full_text: null });
    expect((await getCachedRankingPauseDurable())?.enabled).toBe(true);
    expect(findFirstMock).toHaveBeenCalledTimes(2);
  });

  it("is audible when the read cannot be attempted at all", async () => {
    const { getCachedRankingPauseDurable } = await import(
      "@/lib/calibration/selective-publish-runtime"
    );

    findFirstMock.mockImplementationOnce(() => {
      throw new Error("delegate exploded synchronously");
    });

    expect(await getCachedRankingPauseDurable()).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("durable proven-path read: failure is not an absence", () => {
  it("recovers once the backoff has elapsed and the database answers", async () => {
    // The same latch, one module over: plan-backed pause groups and selective
    // thresholds would stay disabled for the life of the isolate after a blip.
    vi.useFakeTimers();
    const { getCachedProvenPathPlan } = await import(
      "@/lib/calibration/selective-publish-runtime"
    );

    findFirstMock.mockRejectedValueOnce(new Error("connection terminated"));
    expect(await getCachedProvenPathPlan()).toBeNull();

    vi.advanceTimersByTime(PAST_BACKOFF_MS);
    findFirstMock.mockResolvedValueOnce({ metadata: PLAN, full_text: null });
    const second = await getCachedProvenPathPlan();
    expect(second).not.toBeNull();
    expect(second?.pauseGroups).toEqual(["nfl|SPREAD"]);
    expect(findFirstMock).toHaveBeenCalledTimes(2);
  });

  it("caches a genuine absence, but only until it goes stale", async () => {
    vi.useFakeTimers();
    const { getCachedProvenPathPlan } = await import(
      "@/lib/calibration/selective-publish-runtime"
    );

    findFirstMock.mockResolvedValue(null);
    expect(await getCachedProvenPathPlan()).toBeNull();
    expect(await getCachedProvenPathPlan()).toBeNull();
    expect(findFirstMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(PAST_FRESHNESS_MS);
    findFirstMock.mockResolvedValue({ metadata: PLAN, full_text: null });
    expect((await getCachedProvenPathPlan())?.pauseGroups).toEqual(["nfl|SPREAD"]);
    expect(findFirstMock).toHaveBeenCalledTimes(2);
  });

  it("readProvenPathPlan reports absence and unavailability distinctly", async () => {
    const { readProvenPathPlan } = await import("@/lib/ops/proven-path-durable");

    findFirstMock.mockResolvedValueOnce(null);
    expect(await readProvenPathPlan()).toEqual({ status: "absent" });

    findFirstMock.mockRejectedValueOnce(new Error("connection terminated"));
    expect((await readProvenPathPlan()).status).toBe("error");

    findFirstMock.mockResolvedValueOnce({ metadata: null, full_text: "not json at all" });
    expect((await readProvenPathPlan()).status).toBe("error");
  });

  it("refuses a plan-shaped object that is missing the fields callers read", async () => {
    // A bare `{}` is an object. Returning it as a plan would put an empty
    // control state into the runtime cache, and resolvePausedGroups would then
    // read pauseGroups off it and conclude nothing is paused.
    const { readProvenPathPlan } = await import("@/lib/ops/proven-path-durable");

    for (const metadata of [{}, { pauseGroups: ["a"] }, { defaultDelta: 0.05 }, []]) {
      findFirstMock.mockResolvedValueOnce({ metadata, full_text: null });
      expect((await readProvenPathPlan()).status).toBe("error");
    }
  });
});
