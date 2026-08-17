/**
 * free-spine-health cron — failure signalling.
 *
 * Failure class P15-07 targets: a background job that silently no-ops instead
 * of erroring loudly. The free-spine probe is read-only but it is the route's
 * actual job; when EVERY sport fails the route must surface a real HTTP
 * failure to the platform scheduler (and Sentry-less local deploys where
 * captureError is a clean no-op), not a 200 + ok:true lie.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchScoresMultiSourceMock = vi.fn();
const persistFreeSpineSnapshotMock = vi.fn();
const writeFreeSpineCacheMock = vi.fn();
const recordFreeIngestionRunMock = vi.fn();
const probeNflverseSourceCurrencyMock = vi.fn();
const runBoardFillPipelineMock = vi.fn();

vi.mock("@/lib/data-sources/source-router", () => ({
  ALL_SPORTS: ["nfl", "nba"],
  freeCoverageMatrix: () => [],
  redundancyGaps: () => [],
}));
vi.mock("@/lib/data-sources/multi-source-scores", () => ({
  fetchScoresMultiSource: (...a: unknown[]) => fetchScoresMultiSourceMock(...a),
  scoreSourceChain: () => ["espn-public-api"],
}));
vi.mock("@/lib/platform/world-class-readiness", () => ({
  buildWorldClassReadiness: () => ({ lanes: [] }),
}));
vi.mock("@/lib/data-sources/free-spine-cache", () => ({
  writeFreeSpineCache: (...a: unknown[]) => writeFreeSpineCacheMock(...a),
}));
vi.mock("@/lib/data-sources/free-spine-durable", () => ({
  persistFreeSpineSnapshot: (...a: unknown[]) => persistFreeSpineSnapshotMock(...a),
}));
vi.mock("@/lib/data-sources/free-ingestion-run", () => ({
  recordFreeIngestionRun: (...a: unknown[]) => recordFreeIngestionRunMock(...a),
}));
vi.mock("@sports/data-ingestion", () => ({
  probeNflverseSourceCurrency: (...a: unknown[]) => probeNflverseSourceCurrencyMock(...a),
  resolveOddsApiKey: () => null,
  resolveRundownApiKey: () => null,
}));
vi.mock("@sports/ingestion-pipeline", () => ({
  runBoardFillPipeline: (...a: unknown[]) => runBoardFillPipelineMock(...a),
}));
vi.mock("@sports/stats-api", () => ({
  NflverseMemoryStore: class {
    size() {
      return 0;
    }
    put() {}
  },
}));
vi.mock("@/lib/observability/sentry", () => ({
  captureError: vi.fn(),
}));

function req(auth?: string): Request {
  return new Request("http://x/api/cron/free-spine-health", auth ? { headers: { authorization: auth } } : undefined);
}

describe("GET /api/cron/free-spine-health", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "secret");
    vi.stubEnv("VERCEL", undefined as unknown as string);
    fetchScoresMultiSourceMock.mockReset();
    persistFreeSpineSnapshotMock.mockReset();
    writeFreeSpineCacheMock.mockReset();
    recordFreeIngestionRunMock.mockReset();
    probeNflverseSourceCurrencyMock.mockReset();
    runBoardFillPipelineMock.mockReset();
    persistFreeSpineSnapshotMock.mockResolvedValue("ok" as const);
    writeFreeSpineCacheMock.mockReturnValue(undefined);
    probeNflverseSourceCurrencyMock.mockResolvedValue({ ok: true, reason: "ok", probedAt: new Date().toISOString() });
    runBoardFillPipelineMock.mockResolvedValue({ ok: false, note: "no keys" });
    recordFreeIngestionRunMock.mockResolvedValue({
      id: "run1",
      status: "SUCCESS",
      completedAt: new Date().toISOString(),
    });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("401s without the bearer secret", async () => {
    const { GET } = await import("@/app/api/cron/free-spine-health/route");
    expect((await GET(req())).status).toBe(401);
  });

  it("returns 200 + ok:true when the probe succeeds", async () => {
    fetchScoresMultiSourceMock.mockResolvedValue({
      sport: "nfl",
      used: "espn-public-api",
      attempted: ["espn-public-api"],
      games: [{ gameId: "g1" }],
      failover: false,
      errors: [],
      oddsApiRequired: false,
      datesRequested: [],
      primary: "espn-public-api",
    });
    const { GET } = await import("@/app/api/cron/free-spine-health/route");
    const res = await GET(req("Bearer secret"));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it("returns 503 + ok:false when EVERY sport fails to return games (total probe failure)", async () => {
    // Every sport hard-fails: used=null, errors present, games empty → probeFailed.
    fetchScoresMultiSourceMock.mockRejectedValue(new Error("upstream unreachable"));
    const { GET } = await import("@/app/api/cron/free-spine-health/route");
    const res = await GET(req("Bearer secret"));
    expect(res.status).toBe(503);
    const body = (await res.json()) as { ok: boolean; probeFailed: boolean };
    expect(body.ok).toBe(false);
    expect(body.probeFailed).toBe(true);
  });
});
