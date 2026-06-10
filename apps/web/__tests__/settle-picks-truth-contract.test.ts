import { describe, it, expect, beforeEach, vi } from "vitest";
import { PROVIDER_JOB_STATUS } from "@sports/data-ingestion";

/**
 * /api/cron/settle-picks — job-truth contract (D-011 Option A).
 *
 * The route replaced the old no-op placeholder (which always reported ok:true
 * while settlement silently never ran — the audit-flagged masked success).
 * These tests pin the same contract refresh-odds carries:
 *   - a failed pass is NEVER reported ok:true and NEVER returns HTTP 200
 *   - the classified provider reason is surfaced (internal/monitoring only)
 *   - partial failure is distinguishable (207) from total failure (502)
 *   - unconfigured secrets/keys are 500, bad auth is 401 before any work
 *
 * settleOnce / getReadinessGates are mocked so the route's decision logic is
 * tested in isolation (no DB, no real provider, no network).
 */

const { settleOnceMock, getReadinessGatesMock } = vi.hoisted(() => ({
  settleOnceMock: vi.fn(),
  getReadinessGatesMock: vi.fn(),
}));

vi.mock("@sports/ingestion-pipeline", () => ({
  settleOnce: settleOnceMock,
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: getReadinessGatesMock,
}));

// The route only reads isStubMode() from @sports/db (for the honest degraded
// note). The real helper memoizes the FIRST client built in the process on
// globalThis, so its value depends on whatever DATABASE_URL the shell had at
// collection time — mock it for determinism.
vi.mock("@sports/db", () => ({
  isStubMode: () => true,
}));

type SettleBody = {
  ok: boolean;
  failureReason: string | null;
  settled: number;
  voided: number;
  okCount: number;
  failedCount: number;
  totalCount: number;
  calibrationRegenerated: boolean;
  degraded: string | null;
  errors: string[];
  results: Array<{ sport: string; ok: boolean; providerStatus?: string }>;
};

function makeResult(overrides: Record<string, unknown> = {}) {
  return {
    settled: 0,
    voided: 0,
    failed: 0,
    totalSports: 2,
    errors: [],
    sports: [
      { sport: "americanfootball_nfl", ok: true, gamesSettled: 0, picksSettled: 0 },
      { sport: "basketball_nba", ok: true, gamesSettled: 0, picksSettled: 0 },
    ],
    calibrationRegenerated: false,
    ...overrides,
  };
}

async function callCron(
  opts: { auth?: string | null } = {}
): Promise<{ status: number; body: SettleBody }> {
  vi.resetModules();
  const headers: Record<string, string> = {};
  const auth = opts.auth === undefined ? "Bearer test-secret" : opts.auth;
  if (auth) headers["authorization"] = auth;

  const mod = await import("@/app/api/cron/settle-picks/route");
  const res = (await mod.GET(
    new Request("https://gse.test/api/cron/settle-picks", { headers })
  )) as unknown as Response;
  return { status: res.status, body: (await res.json()) as SettleBody };
}

describe("/api/cron/settle-picks job-truth contract", () => {
  beforeEach(() => {
    process.env["DATABASE_URL"] = "stub";
    process.env["CRON_SECRET"] = "test-secret";
    process.env["THE_ODDS_API_KEY"] = "test-key";
    settleOnceMock.mockReset();
    getReadinessGatesMock.mockReset();
    getReadinessGatesMock.mockReturnValue({ isBootstrapMode: true });
  });

  it("returns 200 ok:true with no failureReason when every sport settles cleanly", async () => {
    settleOnceMock.mockResolvedValue(
      makeResult({
        settled: 3,
        voided: 1,
        sports: [
          { sport: "americanfootball_nfl", ok: true, gamesSettled: 2, picksSettled: 3 },
          { sport: "basketball_nba", ok: true, gamesSettled: 0, picksSettled: 0 },
        ],
      })
    );

    const { status, body } = await callCron();

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.failureReason).toBeNull();
    expect(body.settled).toBe(3);
    expect(body.voided).toBe(1);
    expect(body.okCount).toBe(2);
    expect(body.failedCount).toBe(0);
    expect(body.totalCount).toBe(2);
    // Honest stub-mode note: never imply real settlement under the DB stub.
    expect(body.degraded).toContain("stub");
  });

  it("NEVER reports ok:true / HTTP 200 on total provider failure (502 + classified reason)", async () => {
    settleOnceMock.mockResolvedValue(
      makeResult({
        failed: 2,
        providerStatus: PROVIDER_JOB_STATUS.PROVIDER_AUTH_FAILED,
        errors: ["americanfootball_nfl: 401", "basketball_nba: 401"],
        sports: [
          {
            sport: "americanfootball_nfl",
            ok: false,
            gamesSettled: 0,
            picksSettled: 0,
            providerStatus: PROVIDER_JOB_STATUS.PROVIDER_AUTH_FAILED,
          },
          {
            sport: "basketball_nba",
            ok: false,
            gamesSettled: 0,
            picksSettled: 0,
            providerStatus: PROVIDER_JOB_STATUS.PROVIDER_AUTH_FAILED,
          },
        ],
      })
    );

    const { status, body } = await callCron();

    expect(status).not.toBe(200);
    expect(status).toBe(502);
    expect(body.ok).toBe(false);
    expect(body.failureReason).toBe(PROVIDER_JOB_STATUS.PROVIDER_AUTH_FAILED);
    expect(body.okCount).toBe(0);
    expect(body.failedCount).toBe(2);
  });

  it("returns 207 partial when some sports fail, surfacing the classified reason", async () => {
    settleOnceMock.mockResolvedValue(
      makeResult({
        settled: 2,
        failed: 1,
        providerStatus: PROVIDER_JOB_STATUS.PROVIDER_QUOTA_EXHAUSTED,
        errors: ["basketball_nba: [PROVIDER_QUOTA_EXHAUSTED] 429"],
        sports: [
          { sport: "americanfootball_nfl", ok: true, gamesSettled: 1, picksSettled: 2 },
          {
            sport: "basketball_nba",
            ok: false,
            gamesSettled: 0,
            picksSettled: 0,
            providerStatus: PROVIDER_JOB_STATUS.PROVIDER_QUOTA_EXHAUSTED,
          },
        ],
      })
    );

    const { status, body } = await callCron();

    expect(status).toBe(207);
    expect(body.ok).toBe(false);
    expect(body.okCount).toBe(1);
    expect(body.failedCount).toBe(1);
    expect(body.failureReason).toBe(PROVIDER_JOB_STATUS.PROVIDER_QUOTA_EXHAUSTED);
    expect(body.totalCount).toBe(2);
  });

  it("returns 207 (never ok:true) when settlement succeeded but the void sweep failed", async () => {
    settleOnceMock.mockResolvedValue(
      makeResult({
        settled: 4,
        errors: ["void-sweep: sweep query failed"],
      })
    );

    const { status, body } = await callCron();

    expect(status).toBe(207);
    expect(body.ok).toBe(false);
    expect(body.failureReason).toBe(PROVIDER_JOB_STATUS.UNKNOWN);
    expect(body.errors).toEqual(["void-sweep: sweep query failed"]);
  });

  it("treats an unexpected throw as total failure (502, UNKNOWN), never success", async () => {
    settleOnceMock.mockRejectedValue(new Error("boom"));

    const { status, body } = await callCron();

    expect(status).toBe(502);
    expect(body.ok).toBe(false);
    expect(body.failureReason).toBe(PROVIDER_JOB_STATUS.UNKNOWN);
  });

  it("rejects an unauthenticated request with 401 before doing any work", async () => {
    const { status } = await callCron({ auth: "Bearer wrong-secret" });
    expect(status).toBe(401);
    expect(settleOnceMock).not.toHaveBeenCalled();
  });

  it("returns 500 when CRON_SECRET is not configured", async () => {
    delete process.env["CRON_SECRET"];
    const { status } = await callCron({ auth: null });
    expect(status).toBe(500);
    expect(settleOnceMock).not.toHaveBeenCalled();
  });

  it("returns 500 when THE_ODDS_API_KEY is not configured (no silent ok)", async () => {
    delete process.env["THE_ODDS_API_KEY"];
    const { status } = await callCron();
    expect(status).toBe(500);
    expect(settleOnceMock).not.toHaveBeenCalled();
  });
});
