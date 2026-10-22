import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProvenPathPlan } from "@/lib/calibration/proven-path-engine";
import type { RankingPauseDurableSnap } from "@/lib/ops/ranking-pause-durable";

/**
 * Companion to selective-publish-runtime-stampede.test.ts and
 * ops-durable-read-latch.test.ts.
 *
 * The stampede fix caches the in-flight PROMISE instead of the resolved value.
 * The hazard that introduces is a cached REJECTED promise: left in the slot it
 * would poison every later caller for the life of the isolate. The realistic
 * rejection here is the dynamic `import()` failing (a chunk-load error on a
 * cold Vercel lambda) or the durable module throwing on load — which is why
 * these tests reject at the reader boundary rather than at the DB.
 *
 * Required behaviour: a failed flight degrades to `null` (no caller ever
 * rejects), the failed slot is NOT latched, and the next request after the
 * documented failure-backoff window retries and succeeds. The backoff
 * (DURABLE_FAILURE_BACKOFF_MS = 5s) is deliberate, not a latch: it bounds the
 * serial re-reads during an outage, and ops-durable-read-latch.test.ts pins it
 * from the outside with the same PAST_BACKOFF_MS convention used here.
 *
 * WIRING NOTE: the runtime deliberately reads the durable controls through
 * `readProvenPathPlan` / `readRankingPauseApply` — the ONE readers whose
 * status union lets the cache distinguish absence from unavailability
 * (proven-path-durable.ts: "Prefer readProvenPathPlan anywhere the answer is
 * stored, cached"). `loadProvenPathPlan` / `loadRankingPauseApply` are lossy
 * wrappers over those readers, so the mocks here stub the readers. An earlier
 * draft of this suite stubbed the wrappers instead, so every read in it hit an
 * undefined export and degraded to null.
 */

const mocks = vi.hoisted(() => ({
  readProvenPathPlan: vi.fn(),
  readRankingPauseApply: vi.fn(),
}));

vi.mock("@/lib/ops/proven-path-durable", () => ({
  PROVEN_PATH_SCOPE: "ops.calibration.proven-path",
  readProvenPathPlan: mocks.readProvenPathPlan,
  loadProvenPathPlan: vi.fn(),
  persistProvenPathPlan: vi.fn(),
}));

vi.mock("@/lib/ops/ranking-pause-durable", () => ({
  RANKING_PAUSE_DURABLE_SCOPE: "ops.ranking.pause-apply",
  readRankingPauseApply: mocks.readRankingPauseApply,
  loadRankingPauseApply: vi.fn(),
  persistRankingPauseApply: vi.fn(),
}));

import {
  clearSelectiveRuntimeCaches,
  getCachedProvenPathPlan,
  getCachedRankingPauseDurable,
} from "@/lib/calibration/selective-publish-runtime";

const PLAN = {
  generatedAt: "2026-08-01T00:00:00.000Z",
  defaultDelta: 0.1,
  pauseGroups: [],
  keepGroups: [],
  selectiveRecommended: null,
  selectiveGainRes: null,
} as unknown as ProvenPathPlan;

const PAUSE: RankingPauseDurableSnap = {
  enabled: false,
  groups: [],
  setAt: "2026-08-01T00:00:00.000Z",
  setBy: "founder",
  note: "test snap",
};

/** Must exceed DURABLE_FAILURE_BACKOFF_MS (5s) in selective-publish-runtime. */
const PAST_BACKOFF_MS = 6_000;

beforeEach(() => {
  vi.useFakeTimers();
  clearSelectiveRuntimeCaches();
  mocks.readProvenPathPlan
    .mockReset()
    .mockResolvedValue({ status: "ok", plan: PLAN });
  mocks.readRankingPauseApply
    .mockReset()
    .mockResolvedValue({ status: "ok", snap: PAUSE });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("selective-publish runtime: a failed load never poisons the cache", () => {
  it("a rejected plan read degrades to null, then the next request after the backoff retries and succeeds", async () => {
    mocks.readProvenPathPlan.mockRejectedValueOnce(new Error("chunk load failed"));

    // Degrades exactly as before — the public board never 500s on a durable blip.
    await expect(getCachedProvenPathPlan()).resolves.toBeNull();

    // Pre-fix the failure was cached as `null` for the life of the isolate, so
    // the plan stayed lost until redeploy. A cached REJECTED promise would be
    // worse still: every later caller would reject. The backoff bounds the
    // retries during the outage; past the window the read retries.
    mocks.readProvenPathPlan.mockResolvedValue({ status: "ok", plan: PLAN });
    vi.advanceTimersByTime(PAST_BACKOFF_MS);
    await expect(getCachedProvenPathPlan()).resolves.toBe(PLAN);
    expect(mocks.readProvenPathPlan).toHaveBeenCalledTimes(2);
  });

  it("a rejected pause read degrades to null, then recovers on the next request after the backoff", async () => {
    mocks.readRankingPauseApply.mockRejectedValueOnce(new Error("chunk load failed"));

    await expect(getCachedRankingPauseDurable()).resolves.toBeNull();

    mocks.readRankingPauseApply.mockResolvedValue({ status: "ok", snap: PAUSE });
    vi.advanceTimersByTime(PAST_BACKOFF_MS);
    await expect(getCachedRankingPauseDurable()).resolves.toBe(PAUSE);
    expect(mocks.readRankingPauseApply).toHaveBeenCalledTimes(2);
  });

  it("a successful load IS still cached (the retry path must not disable memoisation)", async () => {
    await expect(getCachedProvenPathPlan()).resolves.toBe(PLAN);
    await expect(getCachedProvenPathPlan()).resolves.toBe(PLAN);
    expect(mocks.readProvenPathPlan).toHaveBeenCalledTimes(1);
  });

  it("a rejected flight resolves EVERY caller sharing it to null — none of them rejects", async () => {
    // This is the hazard the promise-cache itself introduces, and it exists
    // only post-fix: 200 picks now share ONE promise, so if that promise were
    // ever handed out un-caught a single durable blip would reject all 200 map
    // callbacks and turn /api/picks into a 500 instead of an unfiltered board.
    // The runtime's own single-flight collapses the 200 callers onto one
    // in-flight read; the rejection is caught inside it, so all 200 settle.
    // (The count proof for the single-flight itself lives in
    // selective-publish-runtime-stampede.test.ts, which mocks `@sports/db` and
    // lets the real durable modules run: pre-fix 400 queries, post-fix 2.)
    let reject!: (error: Error) => void;
    const gate = new Promise<ProvenPathPlan | null>((_, r) => (reject = r));
    mocks.readProvenPathPlan.mockImplementation(() => gate);

    const inFlight = Promise.all(Array.from({ length: 200 }, () => getCachedProvenPathPlan()));
    reject(new Error("chunk load failed"));

    const results = await inFlight;
    expect(results).toHaveLength(200);
    expect(results.every((r) => r === null)).toBe(true);

    // …and the failed slot is still dropped, so the next request after the
    // backoff retries.
    mocks.readProvenPathPlan.mockResolvedValue({ status: "ok", plan: PLAN });
    vi.advanceTimersByTime(PAST_BACKOFF_MS);
    await expect(getCachedProvenPathPlan()).resolves.toBe(PLAN);
  });
});
