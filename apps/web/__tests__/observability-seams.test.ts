import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * Observability seam wiring (additive, behavior-preserving).
 *
 * The board loaders already fail closed: when the DB query throws they log a
 * warning and return a degraded public payload. The additive captureError line
 * inside each catch must NOT change that returned payload — captureError can
 * never throw and never alters control flow. These tests force the catch path
 * (by making @sports/db throw) and assert BOTH facts at once:
 *   1. the loader still returns its existing degraded payload, and
 *   2. captureError is invoked with the seam's surface tag.
 */

const boom = new Error("db offline");

// Hoisted so the vi.mock factory (also hoisted) can close over the same fns we
// re-arm in beforeEach. Re-arming each test keeps the rejection in place even
// after vi.restoreAllMocks() runs in afterEach.
const dbMocks = vi.hoisted(() => {
  const fn = () => vi.fn();
  return {
    gateDecisionFindMany: fn(),
    pickFindMany: fn(),
    gameFindMany: fn(),
  };
});

const captureErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/observability", () => ({
  captureError: (...args: unknown[]) => captureErrorMock(...args),
}));

// Force the live branch (not demo); every query rejects so the catch blocks in
// board/state.ts and board/passes.ts run.
vi.mock("@sports/db", () => ({
  db: {
    gateDecision: { findMany: dbMocks.gateDecisionFindMany },
    pick: { findMany: dbMocks.pickFindMany },
    game: { findMany: dbMocks.gameFindMany },
  },
  getSamplePicks: () => [],
  isDemoPicksEnabled: () => false,
  isStubMode: () => false,
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({ isBootstrapMode: true }),
}));

beforeEach(() => {
  vi.resetModules();
  captureErrorMock.mockReset();
  dbMocks.gateDecisionFindMany.mockReset().mockRejectedValue(boom);
  dbMocks.pickFindMany.mockReset().mockRejectedValue(boom);
  dbMocks.gameFindMany.mockReset().mockRejectedValue(boom);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("board:state seam", () => {
  it("returns the degraded payload AND reports via captureError when the DB throws", async () => {
    const { loadBoardState } = await import("@/lib/board/state");
    const payload = await loadBoardState(new Date());

    // Existing degraded contract is unchanged.
    expect(payload.meta.dataStatus).toBe("degraded");
    expect(payload.meta.degradedReason).toBe("board_data_unavailable");
    expect(payload.data.modelVersion).toBe("unavailable");
    expect(payload.data.scoringNow).toEqual([]);

    // Additive observation fired with the seam surface.
    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).toHaveBeenCalledWith(boom, {
      surface: "board:state",
      degraded: "board_data_unavailable",
    });
  });
});

describe("board:passes seam", () => {
  it("returns the degraded payload AND reports via captureError when the DB throws", async () => {
    const { loadBoardPasses } = await import("@/lib/board/passes");
    const payload = await loadBoardPasses(new Date());

    // Existing degraded contract is unchanged.
    expect(payload.meta.dataStatus).toBe("degraded");
    expect(payload.meta.degradedReason).toBe("pass_list_unavailable");
    expect(payload.data.passes).toEqual([]);

    // Additive observation fired with the seam surface.
    expect(captureErrorMock).toHaveBeenCalledTimes(1);
    expect(captureErrorMock).toHaveBeenCalledWith(boom, {
      surface: "board:passes",
      degraded: "pass_list_unavailable",
    });
  });
});
