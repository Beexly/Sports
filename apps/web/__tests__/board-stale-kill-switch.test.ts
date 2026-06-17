import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Stale-Data Kill Switch — executed behavior for the public board loaders.
 *
 * Additive, env-gated, DEFAULT OFF (forceNoBetIfStale gate = false). With the
 * flag off the loaders behave exactly as today: no freshness query runs. With
 * the flag on and a "stale" latest successful ingestion, each loader returns the
 * SAME suppressed/empty shape it already returns for the demo-suppressed case
 * (suppressedDemoData: true, zeroed/empty lanes), so the public board cannot
 * surface a stale slate.
 *
 * Mirrors the @sports/db + @sports/prediction-engine mock pattern from
 * board-gate-decisions.test.ts.
 */

const mocks = vi.hoisted(() => ({
  forceNoBetIfStale: false,
  ingestionRunFindFirst:
    vi.fn<(args: unknown) => Promise<{ completedAt: Date | null } | null>>(),
  gateDecisionFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
  pickFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
  gameFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    ingestionRun: { findFirst: mocks.ingestionRunFindFirst },
    gateDecision: { findMany: mocks.gateDecisionFindMany },
    pick: { findMany: mocks.pickFindMany },
    game: { findMany: mocks.gameFindMany },
  },
  isDemoPicksEnabled: () => false,
  isStubMode: () => false,
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({
    isBootstrapMode: false,
    forceNoBetIfStale: mocks.forceNoBetIfStale,
  }),
  MODEL_VERSION: "v5.0.0",
  toEdgeIndex: (v: number | null | undefined) =>
    v == null || !Number.isFinite(v) ? null : Math.max(0, Math.min(100, Math.round(v))),
}));

import { loadBoardState } from "@/lib/board/state";
import { loadBoardPasses } from "@/lib/board/passes";

const NOW = new Date("2026-06-17T16:00:00.000Z");
function minutesBefore(m: number): Date {
  return new Date(NOW.getTime() - m * 60 * 1000);
}

describe("board loaders — stale-data kill switch", () => {
  beforeEach(() => {
    mocks.forceNoBetIfStale = false;
    mocks.ingestionRunFindFirst.mockReset();
    mocks.gateDecisionFindMany.mockReset().mockResolvedValue([]);
    mocks.pickFindMany.mockReset().mockResolvedValue([]);
    mocks.gameFindMany.mockReset().mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadBoardState", () => {
    it("flag OFF: loads normally and never queries ingestion freshness", async () => {
      mocks.forceNoBetIfStale = false;
      mocks.ingestionRunFindFirst.mockResolvedValue({ completedAt: minutesBefore(10_000) });

      const result = await loadBoardState(NOW);

      expect(result.meta.suppressedDemoData).toBeUndefined();
      expect(result.meta.isSampleData).toBe(false);
      expect(mocks.ingestionRunFindFirst).not.toHaveBeenCalled();
      expect(mocks.gateDecisionFindMany).toHaveBeenCalled();
    });

    it("flag ON + stale: returns the demo-suppressed empty shape", async () => {
      mocks.forceNoBetIfStale = true;
      mocks.ingestionRunFindFirst.mockResolvedValue({ completedAt: minutesBefore(241) });

      const result = await loadBoardState(NOW);

      expect(result.meta.suppressedDemoData).toBe(true);
      expect(result.data.openPicks).toBe(0);
      expect(result.data.sportsWatched).toBe(0);
      expect(result.data.scoringNow).toEqual([]);
      expect(result.data.publishedToday).toEqual([]);
      expect(result.data.gatedTodayRows).toEqual([]);
      // Suppressed before touching the slate queries.
      expect(mocks.gateDecisionFindMany).not.toHaveBeenCalled();
    });

    it("flag ON + fresh: loads normally", async () => {
      mocks.forceNoBetIfStale = true;
      mocks.ingestionRunFindFirst.mockResolvedValue({ completedAt: minutesBefore(10) });

      const result = await loadBoardState(NOW);

      expect(result.meta.suppressedDemoData).toBeUndefined();
      expect(mocks.ingestionRunFindFirst).toHaveBeenCalledOnce();
      expect(mocks.gateDecisionFindMany).toHaveBeenCalled();
    });

    it("flag ON + DB error on freshness query: fails OPEN (loads normally)", async () => {
      mocks.forceNoBetIfStale = true;
      mocks.ingestionRunFindFirst.mockRejectedValue(new Error("db down"));

      const result = await loadBoardState(NOW);

      expect(result.meta.suppressedDemoData).toBeUndefined();
      expect(mocks.gateDecisionFindMany).toHaveBeenCalled();
    });
  });

  describe("loadBoardPasses", () => {
    it("flag OFF: loads normally and never queries ingestion freshness", async () => {
      mocks.forceNoBetIfStale = false;
      mocks.ingestionRunFindFirst.mockResolvedValue({ completedAt: minutesBefore(10_000) });

      const result = await loadBoardPasses(NOW);

      expect(result.meta.suppressedDemoData).toBeUndefined();
      expect(mocks.ingestionRunFindFirst).not.toHaveBeenCalled();
      expect(mocks.gateDecisionFindMany).toHaveBeenCalled();
    });

    it("flag ON + stale: returns the demo-suppressed empty passes", async () => {
      mocks.forceNoBetIfStale = true;
      mocks.ingestionRunFindFirst.mockResolvedValue({ completedAt: minutesBefore(500) });

      const result = await loadBoardPasses(NOW);

      expect(result.meta.suppressedDemoData).toBe(true);
      expect(result.data.passes).toEqual([]);
      expect(mocks.gateDecisionFindMany).not.toHaveBeenCalled();
    });

    it("flag ON + fresh: loads normally", async () => {
      mocks.forceNoBetIfStale = true;
      mocks.ingestionRunFindFirst.mockResolvedValue({ completedAt: minutesBefore(30) });

      const result = await loadBoardPasses(NOW);

      expect(result.meta.suppressedDemoData).toBeUndefined();
      expect(mocks.ingestionRunFindFirst).toHaveBeenCalledOnce();
      expect(mocks.gateDecisionFindMany).toHaveBeenCalled();
    });
  });
});
