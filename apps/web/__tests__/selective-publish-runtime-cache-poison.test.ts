import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProvenPathPlan } from "@/lib/calibration/proven-path-engine";
import type { RankingPauseDurableSnap } from "@/lib/ops/ranking-pause-durable";

/**
 * Companion to selective-publish-runtime-stampede.test.ts.
 *
 * The stampede fix caches the in-flight PROMISE instead of the resolved value.
 * The hazard that introduces is a cached REJECTED promise: left in the slot it
 * would poison every later caller for the life of the isolate. The durable
 * loaders swallow their own DB errors, so the realistic rejection here is the
 * dynamic `import()` failing (a chunk-load error on a cold Vercel lambda) or
 * the durable module throwing on load — which is why these tests reject at the
 * loader boundary rather than at the DB.
 *
 * Required behaviour: the failed slot is dropped, the batch degrades to `null`
 * (exactly what the pre-fix try/catch produced), and the NEXT request retries
 * instead of being pinned to the failure. Pre-fix the failure was cached as
 * `null` forever — a transient blip cost the isolate its durable plan until
 * redeploy.
 */

const mocks = vi.hoisted(() => ({
  loadProvenPathPlan: vi.fn(),
  loadRankingPauseApply: vi.fn(),
}));

vi.mock("@/lib/ops/proven-path-durable", () => ({
  PROVEN_PATH_SCOPE: "ops.calibration.proven-path",
  loadProvenPathPlan: mocks.loadProvenPathPlan,
  persistProvenPathPlan: vi.fn(),
}));

vi.mock("@/lib/ops/ranking-pause-durable", () => ({
  RANKING_PAUSE_DURABLE_SCOPE: "ops.ranking.pause-apply",
  loadRankingPauseApply: mocks.loadRankingPauseApply,
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

beforeEach(() => {
  clearSelectiveRuntimeCaches();
  mocks.loadProvenPathPlan.mockReset().mockResolvedValue(PLAN);
  mocks.loadRankingPauseApply.mockReset().mockResolvedValue(PAUSE);
});

describe("selective-publish runtime: a failed load never poisons the cache", () => {
  it("a rejected plan read degrades to null, then the NEXT request retries and succeeds", async () => {
    mocks.loadProvenPathPlan.mockRejectedValueOnce(new Error("chunk load failed"));

    // Degrades exactly as before — the public board never 500s on a durable blip.
    await expect(getCachedProvenPathPlan()).resolves.toBeNull();

    // Pre-fix the failure was cached as `null` for the life of the isolate, so
    // the plan stayed lost until redeploy. A cached REJECTED promise would be
    // worse still: every later caller would reject.
    mocks.loadProvenPathPlan.mockResolvedValue(PLAN);
    await expect(getCachedProvenPathPlan()).resolves.toBe(PLAN);
    expect(mocks.loadProvenPathPlan).toHaveBeenCalledTimes(2);
  });

  it("a rejected pause read degrades to null, then recovers on the next request", async () => {
    mocks.loadRankingPauseApply.mockRejectedValueOnce(new Error("chunk load failed"));

    await expect(getCachedRankingPauseDurable()).resolves.toBeNull();

    mocks.loadRankingPauseApply.mockResolvedValue(PAUSE);
    await expect(getCachedRankingPauseDurable()).resolves.toBe(PAUSE);
    expect(mocks.loadRankingPauseApply).toHaveBeenCalledTimes(2);
  });

  it("a successful load IS still cached (the retry path must not disable memoisation)", async () => {
    await expect(getCachedProvenPathPlan()).resolves.toBe(PLAN);
    await expect(getCachedProvenPathPlan()).resolves.toBe(PLAN);
    expect(mocks.loadProvenPathPlan).toHaveBeenCalledTimes(1);
  });

  it("a rejected flight resolves EVERY caller sharing it to null — none of them rejects", async () => {
    // This is the hazard the promise-cache itself introduces, and it exists
    // only post-fix: 200 picks now share ONE promise, so if that promise were
    // ever handed out un-caught a single durable blip would reject all 200 map
    // callbacks and turn /api/picks into a 500 instead of an unfiltered board.
    //
    // HARNESS NOTE (why there is no query count here): this file mocks the
    // dynamically-imported durable modules, and Vitest resolves a mocked
    // `import()` one continuation at a time — callers here are therefore NOT
    // genuinely concurrent, and a call COUNT measured in this file is an
    // artifact: it reads 1 both before and after the fix, so it would prove
    // nothing. The count proof lives in
    // selective-publish-runtime-stampede.test.ts, which mocks `@sports/db` and
    // lets the real durable modules load: pre-fix 400 queries, post-fix 2.
    let reject!: (error: Error) => void;
    const gate = new Promise<ProvenPathPlan | null>((_, r) => (reject = r));
    mocks.loadProvenPathPlan.mockImplementation(() => gate);

    const inFlight = Promise.all(Array.from({ length: 200 }, () => getCachedProvenPathPlan()));
    reject(new Error("chunk load failed"));

    const results = await inFlight;
    expect(results).toHaveLength(200);
    expect(results.every((r) => r === null)).toBe(true);

    // …and the failed slot is still dropped, so the next request retries.
    mocks.loadProvenPathPlan.mockResolvedValue(PLAN);
    await expect(getCachedProvenPathPlan()).resolves.toBe(PLAN);
  });
});
