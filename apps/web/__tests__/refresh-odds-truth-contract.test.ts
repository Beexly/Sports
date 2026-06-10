import { describe, it, expect, beforeEach, vi } from "vitest";
import { PROVIDER_JOB_STATUS } from "@sports/data-ingestion";

/**
 * /api/cron/refresh-odds — job-truth contract (Phase 2 fail-closed trust fix).
 *
 * Regression guard for the masked-success launch blocker: the cron route used
 * to discard processSport()'s return value and always push ok:true, then
 * return a default HTTP 200 — so a provider 401/403/429/5xx was invisible to
 * Vercel cron + uptime monitors. These tests pin the contract:
 *   - a failed pull is NEVER reported ok:true and NEVER returns HTTP 200
 *   - the classified provider reason is surfaced (internal/monitoring only)
 *   - partial success is distinguishable (207) from total failure (502)
 *
 * processSport / getReadinessGates / the sports list are mocked so the route's
 * decision logic is tested in isolation (no DB, no real provider, no network).
 */

const { processSportMock, getReadinessGatesMock } = vi.hoisted(() => ({
  processSportMock: vi.fn(),
  getReadinessGatesMock: vi.fn(),
}));

vi.mock("@sports/ingestion-pipeline", () => ({
  processSport: processSportMock,
}));

vi.mock("@sports/prediction-engine", () => ({
  getReadinessGates: getReadinessGatesMock,
}));

vi.mock("@sports/data-ingestion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/data-ingestion")>();
  return {
    ...actual,
    // Two-sport fixture so partial-success (207) is exercisable; the route
    // only reads `.key`. Keep PROVIDER_JOB_STATUS et al. real (spread actual).
    SUPPORTED_SPORTS: [
      { key: "americanfootball_nfl" },
      { key: "basketball_nba" },
    ] as unknown as typeof actual.SUPPORTED_SPORTS,
  };
});

type CronBody = {
  ok: boolean;
  failureReason: string | null;
  okCount: number;
  failedCount: number;
  totalCount: number;
  results: Array<{ sport: string; ok: boolean; providerStatus?: string }>;
};

async function callCron(
  opts: { auth?: string | null; sport?: string } = {}
): Promise<{ status: number; body: CronBody }> {
  vi.resetModules();
  const url = opts.sport
    ? `https://gse.test/api/cron/refresh-odds?sport=${opts.sport}`
    : "https://gse.test/api/cron/refresh-odds";
  const headers: Record<string, string> = {};
  const auth = opts.auth === undefined ? "Bearer test-secret" : opts.auth;
  if (auth) headers["authorization"] = auth;

  const mod = await import("@/app/api/cron/refresh-odds/route");
  const res = (await mod.GET(new Request(url, { headers }))) as unknown as Response;
  return { status: res.status, body: (await res.json()) as CronBody };
}

describe("/api/cron/refresh-odds job-truth contract", () => {
  beforeEach(() => {
    process.env["DATABASE_URL"] = "stub";
    process.env["CRON_SECRET"] = "test-secret";
    process.env["THE_ODDS_API_KEY"] = "test-key";
    processSportMock.mockReset();
    getReadinessGatesMock.mockReset();
    getReadinessGatesMock.mockReturnValue({ isBootstrapMode: true });
  });

  it("returns 200 ok:true with no failureReason when every sport succeeds", async () => {
    processSportMock.mockResolvedValue({
      sport: "americanfootball_nfl",
      status: "success",
      games: 3,
      picks: 2,
    });

    const { status, body } = await callCron({ sport: "americanfootball_nfl" });

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.failureReason).toBeNull();
    expect(body.okCount).toBe(1);
    expect(body.failedCount).toBe(0);
  });

  it("NEVER reports ok:true / HTTP 200 when the only sport fails (the masked-success bug)", async () => {
    processSportMock.mockResolvedValue({
      sport: "basketball_nba",
      status: "failed",
      games: 0,
      picks: 0,
      error: "[PROVIDER_AUTH_FAILED] The Odds API error: 401",
      providerStatus: PROVIDER_JOB_STATUS.PROVIDER_AUTH_FAILED,
    });

    const { status, body } = await callCron({ sport: "basketball_nba" });

    expect(status).not.toBe(200);
    expect(status).toBe(502);
    expect(body.ok).toBe(false);
    expect(body.failureReason).toBe(PROVIDER_JOB_STATUS.PROVIDER_AUTH_FAILED);
    expect(body.okCount).toBe(0);
    expect(body.failedCount).toBe(1);
  });

  it("returns 207 partial when some sports succeed and some fail, surfacing the reason", async () => {
    processSportMock.mockImplementation(async (sport: { key: string }) => {
      if (sport.key === "basketball_nba") {
        return {
          sport: sport.key,
          status: "failed",
          games: 0,
          picks: 0,
          error: "[PROVIDER_QUOTA_EXHAUSTED] 429",
          providerStatus: PROVIDER_JOB_STATUS.PROVIDER_QUOTA_EXHAUSTED,
        };
      }
      return { sport: sport.key, status: "success", games: 1, picks: 1 };
    });

    const { status, body } = await callCron();

    expect(status).toBe(207);
    expect(body.ok).toBe(false);
    expect(body.okCount).toBe(1);
    expect(body.failedCount).toBe(1);
    expect(body.failureReason).toBe(
      PROVIDER_JOB_STATUS.PROVIDER_QUOTA_EXHAUSTED
    );
    expect(body.totalCount).toBe(2);
  });

  it("treats an unexpected throw as a failure (502, UNKNOWN), never success", async () => {
    processSportMock.mockRejectedValue(new Error("boom"));

    const { status, body } = await callCron({ sport: "americanfootball_nfl" });

    expect(status).toBe(502);
    expect(body.ok).toBe(false);
    expect(body.failureReason).toBe(PROVIDER_JOB_STATUS.UNKNOWN);
    expect(body.results[0]?.ok).toBe(false);
  });

  it("rejects an unauthenticated request with 401 before doing any work", async () => {
    const { status } = await callCron({ auth: "Bearer wrong-secret" });
    expect(status).toBe(401);
    expect(processSportMock).not.toHaveBeenCalled();
  });
});
