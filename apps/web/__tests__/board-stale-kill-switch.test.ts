import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifyDegradationCharacter,
  degradationCharacterCopy,
} from "@/lib/board/degradation-character";

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
  isPublicPicksSurfaceStale: vi.fn<(now: Date) => Promise<boolean>>(),
  assessSchedulerLiveness: vi.fn<(nowMs: number) => Promise<{
    readonly status: "healthy" | "degraded" | "dead" | "unknown";
    readonly ageMinutes: number | null;
    readonly lastAnyIngestionSuccessAt: string | null;
    readonly tightestExpectedGapMinutes: number;
    readonly degradedThresholdMinutes: number;
    readonly deadThresholdMinutes: number;
    readonly operatorHint: string;
  } | null>>(),
  gateDecisionFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
  pickFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
  // `isSignalBoardSlateStale` (lib/data-reliability/public-freshness-gate.ts:108)
  // makes two `db.pick.findFirst` calls. Without this, it throws, and the route's
  // deliberate `.catch(() => false)` fail-open swallows the throw into "fresh" —
  // so the kill switch silently did nothing and the surface returned 200.
  // Default null = no recent published pick and no upcoming one = signal slate
  // stale, which is the state these tests intend.
  pickFindFirst: vi.fn<(args?: unknown) => Promise<unknown>>(),
  gameFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    ingestionRun: { findFirst: mocks.ingestionRunFindFirst },
    gateDecision: { findMany: mocks.gateDecisionFindMany },
    pick: { findMany: mocks.pickFindMany, findFirst: mocks.pickFindFirst },
    game: { findMany: mocks.gameFindMany },
  },
  isDemoPicksEnabled: () => false,
  isStubMode: () => false,
}));

vi.mock("@/lib/data-reliability/public-freshness-gate", () => ({
  isPublicPicksSurfaceStale: (now: Date) => mocks.isPublicPicksSurfaceStale(now),
}));

vi.mock("@/lib/ops/scheduler-liveness", () => ({
  assessSchedulerLiveness: (nowMs: number) => mocks.assessSchedulerLiveness(nowMs),
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
    mocks.isPublicPicksSurfaceStale.mockReset();
    mocks.assessSchedulerLiveness.mockReset();
    mocks.gateDecisionFindMany.mockReset().mockResolvedValue([]);
    mocks.pickFindMany.mockReset().mockResolvedValue([]);
    mocks.pickFindFirst.mockReset().mockResolvedValue(null);
    mocks.gameFindMany.mockReset().mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadBoardState", () => {
    it("flag OFF + zero rows + fresh data: genuinely quiet (not stale)", async () => {
      mocks.forceNoBetIfStale = false;
      mocks.isPublicPicksSurfaceStale.mockResolvedValue(false);

      const result = await loadBoardState(NOW);

      expect(result.meta.suppressedDemoData).toBeUndefined();
      expect(result.meta.isSampleData).toBe(false);
      expect(mocks.isPublicPicksSurfaceStale).toHaveBeenCalledOnce();
      expect(mocks.gateDecisionFindMany).toHaveBeenCalled();
      expect(result.meta.degradationCharacter).toBe("genuinely_quiet");
    });

    it("flag ON + stale: returns the demo-suppressed empty shape", async () => {
      mocks.forceNoBetIfStale = true;
      mocks.isPublicPicksSurfaceStale.mockResolvedValue(true);
      mocks.assessSchedulerLiveness.mockResolvedValue({
        status: "dead",
        ageMinutes: 1200,
        lastAnyIngestionSuccessAt: minutesBefore(1200).toISOString(),
        tightestExpectedGapMinutes: 15,
        degradedThresholdMinutes: 60,
        deadThresholdMinutes: 180,
        operatorHint: "test",
      });

      const result = await loadBoardState(NOW);

      expect(result.meta.suppressedDemoData).toBe(true);
      expect(result.data.openPicks).toBe(0);
      expect(result.data.sportsWatched).toBe(0);
      expect(result.data.scoringNow).toEqual([]);
      expect(result.data.publishedToday).toEqual([]);
      expect(result.data.gatedTodayRows).toEqual([]);
      expect(result.meta.traceId).toMatch(/^board-20260617T160000-[0-9a-f]{8}$/);
      expect(result.meta.health.status).toBe("UNAVAILABLE");
      expect(result.meta.degradations[0]?.code).toBe("STALE_DATA_SUPPRESSED");
      // Suppressed before touching the slate queries.
      expect(mocks.gateDecisionFindMany).not.toHaveBeenCalled();
    });

    it("flag ON + fresh: loads normally", async () => {
      mocks.forceNoBetIfStale = true;
      mocks.isPublicPicksSurfaceStale.mockResolvedValue(false);

      const result = await loadBoardState(NOW);

      expect(result.meta.suppressedDemoData).toBeUndefined();
      expect(mocks.isPublicPicksSurfaceStale).toHaveBeenCalled();
      expect(mocks.gateDecisionFindMany).toHaveBeenCalled();
    });

    it("flag ON + DB error on freshness query: fails OPEN (loads normally)", async () => {
      mocks.forceNoBetIfStale = true;
      mocks.isPublicPicksSurfaceStale.mockRejectedValue(new Error("db down"));

      const result = await loadBoardState(NOW);

      expect(result.meta.suppressedDemoData).toBeUndefined();
      expect(mocks.gateDecisionFindMany).toHaveBeenCalled();
    });

    it("flag OFF + zero rows + stale data + scheduler dead: stale_refreshing", async () => {
      mocks.forceNoBetIfStale = false;
      mocks.isPublicPicksSurfaceStale.mockResolvedValue(true);
      mocks.assessSchedulerLiveness.mockResolvedValue({
        status: "dead",
        ageMinutes: 1200,
        lastAnyIngestionSuccessAt: minutesBefore(1200).toISOString(),
        tightestExpectedGapMinutes: 15,
        degradedThresholdMinutes: 60,
        deadThresholdMinutes: 180,
        operatorHint: "test",
      });

      const result = await loadBoardState(NOW);

      expect(result.meta.degradationCharacter).toBe("stale_refreshing");
      const copy = degradationCharacterCopy(result.meta.degradationCharacter);
      expect(copy.label).toBe("Temporarily stale");
      expect(copy.message).toContain("awaiting fresh data");
      expect(copy.message).not.toContain("not an outage");
      expect(mocks.isPublicPicksSurfaceStale).toHaveBeenCalledOnce();
      expect(mocks.assessSchedulerLiveness).toHaveBeenCalledOnce();
    });

    it("flag OFF + zero rows + fresh data + scheduler healthy: genuinely_quiet", async () => {
      mocks.forceNoBetIfStale = false;
      mocks.isPublicPicksSurfaceStale.mockResolvedValue(false);

      const result = await loadBoardState(NOW);

      expect(result.meta.degradationCharacter).toBe("genuinely_quiet");
      const copy = degradationCharacterCopy(result.meta.degradationCharacter);
      expect(copy.label).toBe("Quiet board");
      expect(copy.message).toContain("restraint, not an outage");
      expect(mocks.isPublicPicksSurfaceStale).toHaveBeenCalledOnce();
    });

    it("classifyDegradationCharacter: three states produce distinct copy", () => {
      const quiet = classifyDegradationCharacter({
        staleSuppressed: false,
        dbUnreachable: false,
        demoSuppressed: false,
        liveBoardOff: true,
        rowCount: 0,
        schedulerLiveness: null,
        staleDetected: false,
      });
      expect(quiet).toBe("genuinely_quiet");
      const stale = classifyDegradationCharacter({
        staleSuppressed: false,
        dbUnreachable: false,
        demoSuppressed: false,
        liveBoardOff: false,
        rowCount: 0,
        schedulerLiveness: { status: "dead" },
        staleDetected: true,
      });
      expect(stale).toBe("stale_refreshing");
      const healthy = classifyDegradationCharacter({
        staleSuppressed: false,
        dbUnreachable: false,
        demoSuppressed: false,
        liveBoardOff: false,
        rowCount: 5,
        schedulerLiveness: null,
        staleDetected: false,
      });
      expect(healthy).toBe("healthy");

      // Distinct, truthful public copy for each
      const quietCopy = degradationCharacterCopy(quiet);
      const staleCopy = degradationCharacterCopy(stale);
      const healthyCopy = degradationCharacterCopy(healthy);
      expect(quietCopy.label).not.toBe(staleCopy.label);
      expect(staleCopy.label).toBe("Temporarily stale");
      expect(healthyCopy.label).toBe("Live");
      // The stale copy must never claim "not an outage"
      expect(staleCopy.message).not.toContain("not an outage");
      // The quiet copy must never claim "stale"
      expect(quietCopy.message).not.toContain("stale");
    });
  });

  describe("loadBoardPasses", () => {
    it("flag OFF + zero rows + fresh data: genuinely quiet", async () => {
      mocks.forceNoBetIfStale = false;
      mocks.isPublicPicksSurfaceStale.mockResolvedValue(false);

      const result = await loadBoardPasses(NOW);

      expect(result.meta.suppressedDemoData).toBeUndefined();
      expect(mocks.gateDecisionFindMany).toHaveBeenCalled();
    });

    it("flag ON + stale: returns the demo-suppressed empty passes", async () => {
      mocks.forceNoBetIfStale = true;
      mocks.isPublicPicksSurfaceStale.mockResolvedValue(true);

      const result = await loadBoardPasses(NOW);

      expect(result.meta.suppressedDemoData).toBe(true);
      expect(result.data.passes).toEqual([]);
      expect(mocks.gateDecisionFindMany).not.toHaveBeenCalled();
    });

    it("flag ON + fresh: loads normally", async () => {
      mocks.forceNoBetIfStale = true;
      mocks.isPublicPicksSurfaceStale.mockResolvedValue(false);

      const result = await loadBoardPasses(NOW);

      expect(result.meta.suppressedDemoData).toBeUndefined();
      expect(mocks.isPublicPicksSurfaceStale).toHaveBeenCalledOnce();
      expect(mocks.gateDecisionFindMany).toHaveBeenCalled();
    });
  });
});
