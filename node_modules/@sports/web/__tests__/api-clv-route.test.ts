import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/clv — executed behavior. The public CLV JSON surface must obey the same
 * gate-until-defensible discipline as /api/performance: 503 until the
 * performance gate is on, and below the graded-sample floor it exposes the
 * counts but withholds the beat-close RATE (never a fabricated number).
 *
 * Follows the executed-handler + vi.mock("@sports/db") pattern used by
 * health-route.test.ts and picks-stale-kill-switch.test.ts.
 */

const mocks = vi.hoisted(() => ({
  canExposePerformanceStats: true,
  minSettledPicksForLearning: 25,
  pickCount: vi.fn<(args: { where: Record<string, unknown> }) => Promise<number>>(),
}));

vi.mock("@sports/db", () => ({
  db: { pick: { count: mocks.pickCount } },
}));

vi.mock("@sports/prediction-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/prediction-engine")>();
  return {
    ...actual,
    getReadinessGates: () => ({
      canExposePerformanceStats: mocks.canExposePerformanceStats,
      minSettledPicksForLearning: mocks.minSettledPicksForLearning,
    }),
  };
});

async function callClv(): Promise<{ status: number; body: Record<string, unknown> }> {
  vi.resetModules();
  const mod = await import("@/app/api/clv/route");
  const req = new Request("http://localhost/api/clv");
  const res = await mod.GET(req as unknown as Parameters<typeof mod.GET>[0]);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

/** loadPublicClvPolicy issues 4 counts in order: graded, beat, lost, matched. */
function mockCounts(graded: number, beat: number, lost: number, matched: number): void {
  mocks.pickCount
    .mockResolvedValueOnce(graded)
    .mockResolvedValueOnce(beat)
    .mockResolvedValueOnce(lost)
    .mockResolvedValueOnce(matched);
}

describe("/api/clv", () => {
  beforeEach(() => {
    mocks.canExposePerformanceStats = true;
    mocks.minSettledPicksForLearning = 25;
    mocks.pickCount.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 503 (bootstrap gate) when the performance gate is off", async () => {
    mocks.canExposePerformanceStats = false;

    const { status, body } = await callClv();

    expect(status).toBe(503);
    // Honest gate: bootstrapMode tracks real history mode, not "any feature off".
    expect(typeof body["bootstrapMode"]).toBe("boolean");
    expect(String(body["error"] ?? "")).toMatch(/disabled/i);
    expect(mocks.pickCount).not.toHaveBeenCalled();
  });

  it("exposes the beat-close rate once the graded sample clears the floor", async () => {
    // 40 graded (>= 25 floor): 24 beat, 12 lost, 4 matched.
    mockCounts(40, 24, 12, 4);

    const { status, body } = await callClv();

    expect(status).toBe(200);
    expect(body["success"]).toBe(true);
    const data = body["data"] as Record<string, unknown>;
    expect(data["canExposeClv"]).toBe(true);
    expect(data["gradedSampleSize"]).toBe(40);
    expect(data["beatCloseRatePct"]).toBe(60); // 24/40
    expect(body["disclaimer"]).toContain("Closing line value");
  });

  it("withholds the rate but keeps counts below the graded-sample floor", async () => {
    // Only 5 graded, below the 25 floor.
    mockCounts(5, 3, 1, 1);

    const { status, body } = await callClv();

    expect(status).toBe(200);
    const data = body["data"] as Record<string, unknown>;
    expect(data["canExposeClv"]).toBe(false);
    // Rate withheld (never a fabricated number off a thin sample)...
    expect(data["beatCloseRatePct"]).toBeNull();
    // ...but the factual sample size is still exposed.
    expect(data["gradedSampleSize"]).toBe(5);
  });

  it("fails closed to a 503 collecting state on a DB error (no stack-trace leak)", async () => {
    mocks.pickCount.mockRejectedValue(new Error("db down"));

    const { status, body } = await callClv();

    expect(status).toBe(503);
    expect(typeof body["bootstrapMode"]).toBe("boolean");
    expect(String(body["error"] ?? "")).toMatch(/disabled|collecting|unavailable/i);
  });
});
