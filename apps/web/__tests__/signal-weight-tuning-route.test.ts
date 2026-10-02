import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GET /api/ops/signal-weight-tuning — route-level tests.
 *
 * Invariants pinned here:
 * - 401 without the CRON_SECRET bearer.
 * - READ-ONLY: the tuner computes verdicts from settled outcomes; nothing is
 *   persisted by this route (no weight moves a published number from here).
 * - An empty eligible set reports snapshotsUsed: 0 as a real state, not an error.
 */

const mocks = vi.hoisted(() => ({
  pickSignalSnapshotFindMany: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: { pickSignalSnapshot: { findMany: mocks.pickSignalSnapshotFindMany } },
}));

vi.mock("@/lib/observability/sentry", () => ({ captureError: vi.fn() }));

import { GET } from "@/app/api/ops/signal-weight-tuning/route";

function authed(): Request {
  return new Request("https://x/api/ops/signal-weight-tuning", {
    headers: { authorization: "Bearer test-secret" },
  });
}

function snapshotRow(overrides: Record<string, unknown> = {}) {
  return {
    pickId: "pick-1",
    settlementResult: "WIN",
    hadLineMovementSignal: true,
    lineMovementDelta: 1.5,
    hadRestSignal: false,
    restAdvantageNet: null,
    hadOddsSignal: false,
    hadScheduleSignal: false,
    hadAtsFormSignal: false,
    hadH2HSignal: false,
    hadVenueSignal: false,
    hadWeatherSignal: false,
    hadInjurySignal: false,
    hadRatingsSignal: false,
    hadPlayerSignal: false,
    hadOfficialsSignal: false,
    hadVenueEnvironmentSignal: false,
    hadPaceSignal: false,
    hadMilestoneSignal: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env["CRON_SECRET"] = "test-secret";
  mocks.pickSignalSnapshotFindMany.mockResolvedValue([]);
});

describe("GET /api/ops/signal-weight-tuning", () => {
  it("500s when CRON_SECRET is unset (never an open route) and never reads the table", async () => {
    delete process.env["CRON_SECRET"];
    const res = await GET(new Request("https://x/api/ops/signal-weight-tuning"));
    expect(res.status).toBe(500);
    expect(mocks.pickSignalSnapshotFindMany).not.toHaveBeenCalled();
  });

  it("reports snapshotsUsed: 0 on an empty eligible set — a real state, not an error", async () => {
    const res = await GET(authed());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { eligibleSnapshotsRead: number; snapshotsUsed: number };
      note: string;
    };
    expect(body.success).toBe(true);
    expect(body.data.eligibleSnapshotsRead).toBe(0);
    expect(body.data.snapshotsUsed).toBe(0);
    expect(body.note).toMatch(/READ-ONLY/);
  });

  it("computes verdicts from settled snapshots without persisting anything", async () => {
    mocks.pickSignalSnapshotFindMany.mockResolvedValue([
      snapshotRow({ pickId: "p1", settlementResult: "WIN", hadLineMovementSignal: true }),
      snapshotRow({ pickId: "p2", settlementResult: "LOSS", hadLineMovementSignal: false }),
      snapshotRow({ pickId: "p3", settlementResult: null, hadLineMovementSignal: true }),
    ]);
    const res = await GET(authed());
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: {
        eligibleSnapshotsRead: number;
        snapshotsUsed: number;
        snapshotsSkippedUnsettled: number;
        weights: Array<{ key: string; verdict: string }>;
      };
    };
    expect(body.data.eligibleSnapshotsRead).toBe(3);
    // The unsettled snapshot is skipped, not counted.
    expect(body.data.snapshotsSkippedUnsettled).toBe(1);
    expect(body.data.snapshotsUsed).toBe(2);
    expect(Array.isArray(body.data.weights)).toBe(true);
    // No Prisma write methods exist on the mocked db — a write would throw.
  });
});
