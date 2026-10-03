import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

/**
 * Route contract for /api/ops/signal-weights.
 *
 * What this pins, and why it is not boilerplate:
 * - the route is the PRODUCTION CALLER of `tuneSignalWeights`. Before this, that
 *   function had zero non-test callers, so "the route exists" is the assertion
 *   that matters — a test that only checked math would still pass if the whole
 *   path were unreachable from the product.
 * - auth is `bearer_only` by default (GSE-SEC-016): an unauthenticated caller
 *   must not read the table.
 * - a failed fit is a 500 that writes nothing and fabricates no default.
 */

const authMock = vi.fn();
vi.mock("@/lib/cron/authorize", () => ({
  cronAuthError: (...args: unknown[]) => authMock(...args),
}));

const tuneMock = vi.fn();
vi.mock("@/lib/ops/signal-weight-tuner", () => ({
  tuneSignalWeightsFromLedger: (...args: unknown[]) => tuneMock(...args),
  toJsonEntry: (e: Record<string, unknown>) => e,
}));

const captureMock = vi.fn();
vi.mock("@/lib/observability/sentry", () => ({
  captureError: (...args: unknown[]) => captureMock(...args),
}));

vi.mock("@sports/db", () => ({ db: {} }));

import { GET } from "@/app/api/ops/signal-weights/route";

function report(over: Record<string, unknown> = {}) {
  return {
    version: "test",
    source: "stub",
    signalsRead: 200,
    outcomesRead: 208,
    sampleSize: 200,
    outcomeThreshold: 10,
    outcomeBaseRate: 0.5,
    measuredCount: 1,
    earnedCount: 1,
    zeroWeightCount: 0,
    weights: { "pgs.target_share": 0.37 },
    entries: [
      {
        key: "pgs.target_share",
        rows: 200,
        fixtures: 200,
        correlation: 0.12,
        rowMultiplier: 1,
        inflation: 1,
        weight: 0.37,
        verdict: "earned",
        reason: "r=0.1200 over 200 distinct fixtures",
        readings: { min: -0.7, max: 0.7, spread: 0.5 },
      },
    ],
    droppedTeamLevel: 0,
    droppedSeasonRollover: 0,
    droppedNoOutcome: 0,
    droppedNoEntityStats: 0,
    excludedNonRegOutcomes: 0,
    keysPresent: ["pgs.target_share"],
    unjoinableKeys: [],
    reportText: "signal weight table test",
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(null);
});

describe("/api/ops/signal-weights", () => {
  it("calls the tuner and returns the fitted weights", async () => {
    tuneMock.mockResolvedValue(report());
    const res = await GET(new Request("https://x/api/ops/signal-weights"));
    expect(res.status).toBe(200);
    // THE CALL. If this is 0 the tuner is unwired again.
    expect(tuneMock).toHaveBeenCalledTimes(1);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.weights["pgs.target_share"]).toBe(0.37);
    expect(body.data.entries[0].fixtures).toBe(200);
    expect(body.data.entries[0].reason).toContain("r=");
  });

  it("denies an unauthenticated caller before touching the database", async () => {
    authMock.mockResolvedValue(
      NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    );
    const res = await GET(new Request("https://x/api/ops/signal-weights"));
    expect(res.status).toBe(401);
    // No fit, no data, nothing derived from the table.
    expect(tuneMock).not.toHaveBeenCalled();
  });

  it("reports an empty table as a real answer rather than an error", async () => {
    tuneMock.mockResolvedValue(
      report({
        signalsRead: 0,
        outcomesRead: 0,
        sampleSize: 0,
        outcomeThreshold: Number.NaN,
        outcomeBaseRate: Number.NaN,
        measuredCount: 0,
        earnedCount: 0,
        zeroWeightCount: 0,
        weights: {},
        entries: [],
        keysPresent: [],
      }),
    );
    const res = await GET(new Request("https://x/api/ops/signal-weights"));
    // An empty `signals` table is a reportable state, not a 500.
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.measuredCount).toBe(0);
    expect(body.data.outcomeThreshold).toBeNull();
    expect(body.data.outcomeBaseRate).toBeNull();
  });

  it("fails closed: a thrown fit is a 500 that fabricates nothing", async () => {
    tuneMock.mockRejectedValue(new Error("db down"));
    const res = await GET(new Request("https://x/api/ops/signal-weights"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.data).toBeUndefined();
    expect(captureMock).toHaveBeenCalled();
  });

  it("counts every drop reason so a zero weight can be traced", async () => {
    tuneMock.mockResolvedValue(
      report({
        droppedTeamLevel: 3,
        droppedSeasonRollover: 4,
        droppedNoOutcome: 5,
        droppedNoEntityStats: 6,
        excludedNonRegOutcomes: 7,
      }),
    );
    const res = await GET(new Request("https://x/api/ops/signal-weights"));
    const body = await res.json();
    expect(body.data.drops).toEqual({
      teamLevel: 3,
      seasonRollover: 4,
      noOutcome: 5,
      noEntityStats: 6,
      nonRegSeasonTypes: 7,
    });
  });
});