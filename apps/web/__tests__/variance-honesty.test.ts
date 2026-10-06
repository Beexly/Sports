/**
 * The honesty rules, pinned as executable assertions.
 *
 * These are the two things this change must never do, whatever else changes:
 *  1. The process grade is CONTEXT. `canPublishProjections` stays false. No
 *     relabelling a grade as a projection, ever.
 *  2. A stale source is a hard failure, not a quiet number.
 *
 * The McCaffrey spot-check lives in
 * `packages/prediction-engine/src/__tests__/fantasy-variance.test.ts` — it is a
 * falsifier of the POSTED numbers, and it passes by proving they cannot come
 * from this method.
 */
import { describe, expect, it, afterEach } from "vitest";
import { loadPlayerModel } from "@/lib/intelligence/player-model";
import { loadGradedPool } from "@/lib/integrations/graded-pool";
import {
  loadVarianceProjections,
  assertFreshTrainingWindow,
  StaleTrainingWindowError,
} from "@/lib/integrations/variance-projections";
import { registerProjectionsProvider } from "@/lib/integrations/projections";

/** A fetch that always fails: these tests must never touch the network. */
const deadFetcher = (async () => {
  throw new Error("network disabled in this test");
}) as unknown as typeof fetch;

afterEach(() => {
  registerProjectionsProvider(null);
});

describe("canPublishProjections stays false", () => {
  it("the process grade refuses to be a projection, including on error", async () => {
    const model = await loadPlayerModel({ fetcher: deadFetcher });
    // Whether the fetch worked or failed, this flag is false. That is the
    // whole point: the grade is never a forecast.
    expect(model.canPublishProjections).toBe(false);
  });

  it("the graded pool does not turn the grade into a projection", async () => {
    const pool = await loadGradedPool({ fetcher: deadFetcher });
    // A source-error is a legitimate outcome; the invariant is about the
    // honest-empty path, and the flag never leaks through it.
    if (pool.status === "live") {
      for (const p of pool.players) {
        expect(Number.isFinite(p.proj)).toBe(true);
      }
    } else {
      expect(pool.status).toBe("source-error");
      expect(pool.players).toHaveLength(0);
    }
  });
});

describe("a stale source fails loudly", () => {
  it("rejects a window more than one season behind the forecast", () => {
    expect(() => assertFreshTrainingWindow(2024, 2025)).not.toThrow();
    expect(() => assertFreshTrainingWindow(2025, 2026)).not.toThrow();
    expect(() => assertFreshTrainingWindow(2024, 2026)).toThrow(StaleTrainingWindowError);
  });

  it("names both seasons in the failure so the log says what is wrong", () => {
    try {
      assertFreshTrainingWindow(2023, 2026);
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(StaleTrainingWindowError);
      expect((e as Error).message).toContain("2023");
      expect((e as Error).message).toContain("2026");
    }
  });

  it("an empty source is stale, not an empty-but-valid projection set", async () => {
    const client = {
      playerGameStat: { findMany: async () => [] },
    } as never;
    await expect(
      loadVarianceProjections(client, { evalSeason: 2026, remainingGames: {} }),
    ).rejects.toBeInstanceOf(StaleTrainingWindowError);
  });
});
