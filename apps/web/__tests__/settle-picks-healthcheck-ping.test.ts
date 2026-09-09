import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";

/**
 * Round 16 follow-up: settle-picks never called the already-built
 * dead-man's-switch helper (healthcheck-ping.ts) that refresh-odds already
 * uses — the cron carrying AGENTS.md's entire "no pick ever sits" policy had
 * zero external heartbeat coverage. This pins the wiring: the route calls
 * pingHealthcheck with "success" when the cycle's own freeOk verdict is true,
 * "fail" otherwise, and never touches it when HC_SETTLE_PICKS_PING_URL is
 * unset (the helper's own contract test already covers the no-op case; this
 * file only proves the ROUTE invokes it at the right point with the right
 * signal — everything else about the route is mocked to a bare-minimum
 * healthy cycle, not re-tested here).
 */

const pingCalls: Array<{ url: string | undefined; signal: string }> = [];

vi.mock("@/lib/cron/authorize", () => ({ cronAuthError: () => null }));
vi.mock("@/lib/observability/sentry", () => ({ captureError: vi.fn() }));
vi.mock("@sports/db", () => ({ db: {} }));
vi.mock("@sports/data-ingestion", () => ({
  SUPPORTED_SPORTS: [{ key: "baseball_mlb", name: "MLB" }],
}));
vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: () => ({ isBootstrapMode: false }),
}));
vi.mock("@sports/ingestion-pipeline", () => ({
  settleSport: vi.fn(),
  freezeSlateCommitments: vi.fn(async () => []),
  computeScheduledWindow: () => ({ from: new Date(0), to: new Date(0) }),
  drainPendingTeamGameLogs: vi.fn(async () => ({ attempted: 0, done: 0, failed: 0 })),
}));
vi.mock("@/lib/settlement-outbox/worker", () => ({
  drainSettlementOutbox: vi.fn(async () => null),
}));
vi.mock("@/lib/data-sources/free-score-persist", () => ({
  persistFreeScores: vi.fn(async () => ({ persisted: 0 })),
}));
vi.mock("@/lib/data-sources/settle-backfill", () => ({
  backfillStaleSettlement: vi.fn(async () => ({ scanned: 0, settled: 0, unresolved: [] })),
}));
vi.mock("@/lib/performance/settlement-health", () => ({
  loadSettlementHealth: vi.fn(async () => ({ overduePending: 0 })),
  SETTLEMENT_DEFAULT_GRACE_HOURS: 6,
}));
vi.mock("@/lib/settlement/free-path-clv", () => ({
  drainPendingClvGrades: vi.fn(async () => ({ attempted: 0, graded: 0, noClose: 0, failed: 0 })),
}));
vi.mock("@/lib/settlement/free-path-snapshot", () => ({
  drainPendingSnapshotOutcomes: vi.fn(async () => ({ attempted: 0, done: 0, failed: 0 })),
}));
vi.mock("@/lib/settlement/zero-sit-lane", async () => {
  const actual = await vi.importActual<typeof import("@/lib/settlement/zero-sit-lane")>(
    "@/lib/settlement/zero-sit-lane",
  );
  return {
    zeroSitDeadline: actual.zeroSitDeadline,
    ZERO_SIT_ROUTE_TAIL_RESERVE_MS: actual.ZERO_SIT_ROUTE_TAIL_RESERVE_MS,
    runZeroSitLane: vi.fn(async () => ({
      lane: "zero-sit",
      stale: { maxAgeDays: 14, selected: 0, unpublished: 0, recorded: 0, capReached: false, pickIds: [] },
      voids: {
        minAgeHours: 24,
        inspected: 0,
        capReached: false,
        deadlineHit: false,
        remaining: 0,
        voided: 0,
        gamesCanceled: 0,
        byCode: { OVERDUE_NO_SCORE: 0, SCORE_MISMATCH_CROSS_PATH: 0, AMBIGUOUS_TEAM_NAME: 0, FIXTURE_NOT_FOUND: 0 },
        skippedByReason: {},
        voids: [],
        skipped: [],
        scoreboardFailures: [],
      },
    })),
  };
});
let freeOk = true;
vi.mock("@/lib/data-sources/free-settlement-runner", () => ({
  runFreePathSettlement: vi.fn(async () => ({
    sports: [{ sport: "baseball_mlb", ok: freeOk }],
    picksSettled: 1,
    picksHeld: 0,
    clvRepair: null,
    snapshotRepair: null,
    teamGameLogRepair: null,
    scoreDates: [],
    rca: null,
  })),
}));
vi.mock("@/lib/data-reliability/healthcheck-ping", () => ({
  pingHealthcheck: vi.fn(async (url: string | undefined, signal: string) => {
    pingCalls.push({ url, signal });
  }),
}));

import { GET } from "@/app/api/cron/settle-picks/route";
import { pingHealthcheck } from "@/lib/data-reliability/healthcheck-ping";

function req(): Request {
  return new Request("https://example.com/api/cron/settle-picks");
}

describe("GET /api/cron/settle-picks — dead-man's-switch wiring (Round 16)", () => {
  const ORIGINAL_ENV = process.env["HC_SETTLE_PICKS_PING_URL"];

  beforeEach(() => {
    pingCalls.length = 0;
    freeOk = true;
    (pingHealthcheck as Mock).mockClear();
  });

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) delete process.env["HC_SETTLE_PICKS_PING_URL"];
    else process.env["HC_SETTLE_PICKS_PING_URL"] = ORIGINAL_ENV;
  });

  it("pings success when the cycle's free pass is healthy", async () => {
    process.env["HC_SETTLE_PICKS_PING_URL"] = "https://hc-ping.com/test-settle";
    freeOk = true;

    await GET(req());

    expect(pingCalls).toEqual([{ url: "https://hc-ping.com/test-settle", signal: "success" }]);
  });

  it("pings fail when the free pass reports a sport as not ok", async () => {
    process.env["HC_SETTLE_PICKS_PING_URL"] = "https://hc-ping.com/test-settle";
    freeOk = false;

    await GET(req());

    expect(pingCalls).toEqual([{ url: "https://hc-ping.com/test-settle", signal: "fail" }]);
  });

  it("still calls pingHealthcheck (env-gated no-op inside the helper) when the URL is unset", async () => {
    delete process.env["HC_SETTLE_PICKS_PING_URL"];

    await GET(req());

    // The route always calls the helper; the helper itself is what no-ops on
    // an undefined URL (see healthcheck-ping.test.ts) — asserting both halves
    // here would duplicate that contract test, so this only pins that the
    // route passes `undefined` through rather than skipping the call.
    expect(pingCalls).toEqual([{ url: undefined, signal: "success" }]);
  });
});
