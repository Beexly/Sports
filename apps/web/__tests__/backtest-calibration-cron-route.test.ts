import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * /api/cron/backtest-calibration: gated no-op by default, cron-secret
 * authenticated like every other /api/cron/* route once enabled, and wired
 * to the real harness (mocked DB + artifact writer only).
 */

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  writeBacktestArtifact: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: { pick: { findMany: mocks.findMany } },
}));

vi.mock("@sports/prediction-engine", async (importActual) => {
  const actual = await importActual<typeof import("@sports/prediction-engine")>();
  const actualGates = actual.getReadinessGates();
  return {
    ...actual,
    getReadinessGates: vi.fn(() => ({ ...actualGates, minSettledPicksForLearning: 2 })),
  };
});

vi.mock("@/lib/backtest/artifact", () => ({
  writeBacktestArtifact: mocks.writeBacktestArtifact,
}));

import { GET } from "@/app/api/cron/backtest-calibration/route";

function req(url: string, auth?: string): Request {
  return new Request(url, auth ? { headers: { authorization: auth } } : undefined);
}

function samplePick(id: string, result: "WIN" | "LOSS" | "PUSH", confidence: number, modelVersion = "v5.1.0") {
  return {
    id,
    confidence,
    result,
    modelVersion,
    pickType: "SPREAD",
    riskLevel: "MODERATE",
    game: { sport: { name: "NFL" }, dataQualityScore: 90 },
  };
}

describe("GET /api/cron/backtest-calibration", () => {
  beforeEach(() => {
    mocks.findMany.mockReset();
    mocks.findMany.mockResolvedValue([
      samplePick("p1", "WIN", 70),
      samplePick("p2", "LOSS", 60),
      samplePick("p3", "WIN", 80),
    ]);
    mocks.writeBacktestArtifact.mockReset();
    mocks.writeBacktestArtifact.mockResolvedValue({ written: true, path: "/repo/reports/calibration/latest.json", error: null });
    vi.stubEnv("CRON_SECRET", "secret");
    vi.stubEnv("BACKTEST_HARNESS_ENABLED", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("no-ops with status='disabled' when BACKTEST_HARNESS_ENABLED is unset — touches neither auth, DB, nor the artifact writer", async () => {
    const res = await GET(req("http://x/api/cron/backtest-calibration"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe("disabled");
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.writeBacktestArtifact).not.toHaveBeenCalled();
  });

  it("no-ops even with a valid bearer secret when the flag is off (env gate wins over auth)", async () => {
    const res = await GET(req("http://x/api/cron/backtest-calibration", "Bearer secret"));
    const body = (await res.json()) as { status: string };
    expect(res.status).toBe(200);
    expect(body.status).toBe("disabled");
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("401s when enabled but the bearer secret is missing", async () => {
    vi.stubEnv("BACKTEST_HARNESS_ENABLED", "true");
    const res = await GET(req("http://x/api/cron/backtest-calibration"));
    expect(res.status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("500s when enabled but CRON_SECRET itself is not configured", async () => {
    vi.stubEnv("BACKTEST_HARNESS_ENABLED", "true");
    vi.stubEnv("CRON_SECRET", "");
    const res = await GET(req("http://x/api/cron/backtest-calibration", "Bearer secret"));
    expect(res.status).toBe(500);
  });

  it("runs the harness and writes the artifact when enabled + authed", async () => {
    vi.stubEnv("BACKTEST_HARNESS_ENABLED", "true");
    const res = await GET(req("http://x/api/cron/backtest-calibration", "Bearer secret"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      report: { status: string; coverage: { settledSampleSize: number }; provenance: { harnessVersion: string } };
      artifact: { written: boolean };
    };
    expect(body.status).toBe("ok");
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(body.report.coverage.settledSampleSize).toBe(3);
    expect(body.report.provenance.harnessVersion).toBe("backtest-harness-v1");
    // 3 settled picks >= mocked minSettledPicksForLearning (2) → sufficient sample.
    expect(body.report.status).toBe("ok");
    expect(mocks.writeBacktestArtifact).toHaveBeenCalledTimes(1);
    expect(body.artifact.written).toBe(true);
  });

  it("500s honestly when the settled-picks query fails, without crashing", async () => {
    vi.stubEnv("BACKTEST_HARNESS_ENABLED", "true");
    mocks.findMany.mockRejectedValue(new Error("db down"));
    const res = await GET(req("http://x/api/cron/backtest-calibration", "Bearer secret"));
    expect(res.status).toBe(500);
    expect(mocks.writeBacktestArtifact).not.toHaveBeenCalled();
  });
});
