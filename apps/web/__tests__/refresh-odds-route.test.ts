/**
 * GET /api/cron/refresh-odds — route contract.
 *
 * The defect this pins. The route's own comment (read 2026-09-28) already named the
 * failure it had: "A run can succeed while writing nothing usable (provider
 * offline, circuit open, empty slate), and that combination is precisely the
 * silent failure this reports." The route then did exactly that: it reported the
 * failure in the body (`ok: result.ok`) and passed NO status argument, so every
 * response was a 200.
 *
 * This is the sixth route in this series to carry the same shape — a body that is
 * honest and a header that lies — and the most consequential, because this is the
 * plane every downstream reader trusts for odds freshness.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const refreshOdds = vi.fn();
const generateSignalSlate = vi.fn();
const slateAssociationTrace = vi.fn();
const pingHealthcheck = vi.fn();
const monitorOddsFetchedAt = vi.fn();
const getReadinessGates = vi.fn();
const buildPaidOddsGovernor = vi.fn();
const resolveOddsApiKey = vi.fn();
const resolveRundownApiKey = vi.fn();

vi.mock("@/lib/cron/authorize", () => ({
  cronAuthError: () => null,
  cronAuthErrorBearerOnly: () => null,
}));
// Spread the real module and override only what this test controls. The
// mock-factory-export-drift guard requires every export the traced call path
// reaches for to exist, and hand-listing ~30 engine exports is exactly how that
// guard exists to stop a test from being written against a shape I assumed.
vi.mock("@sports/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/db")>();
  return { ...actual, db: {} };
});
// Real specifiers, read off the route's own import list (2026-09-28). An earlier
// draft of this file mocked paths I had invented and it failed to transform,
// which is the same class of error as writing a test against a shape I assumed.
vi.mock("@sports/data-ingestion", () => ({
  // The route's real import list (refresh-odds/route.ts:41-46). A partial mock
  // collapses these to undefined under the route and the suite cannot run, so
  // they are declared rather than left to chance.
  SUPPORTED_SPORTS: [{ key: "nfl" }, { key: "nba" }, { key: "mlb" }],
  resolveOddsApiKey: (...a: unknown[]) => resolveOddsApiKey(...a),
  resolveRundownApiKey: (...a: unknown[]) => resolveRundownApiKey(...a),
}));
vi.mock("@sports/ingestion-pipeline", () => ({
  // refreshOdds is resolved from the PIPELINE at runtime here, not from
  // data-ingestion (read off the route's dynamic import, 2026-09-28).
  refreshOdds: (...a: unknown[]) => refreshOdds(...a),
  generateSignalSlate: (...a: unknown[]) => generateSignalSlate(...a),
  slateAssociationTrace: (...a: unknown[]) => slateAssociationTrace(...a),
}));
vi.mock("@/lib/data-reliability/healthcheck-ping", () => ({
  pingHealthcheck: (...a: unknown[]) => pingHealthcheck(...a),
}));
vi.mock("@/lib/data-reliability/monitor-odds-fetchedat", () => ({
  monitorOddsFetchedAt: (...a: unknown[]) => monitorOddsFetchedAt(...a),
}));
vi.mock("@sports/prediction-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/prediction-engine")>();
  return { ...actual, getReadinessGates: (...a: unknown[]) => getReadinessGates(...a) };
});
vi.mock("@/lib/odds/paid-odds-governor", () => ({
  buildPaidOddsGovernor: (...a: unknown[]) => buildPaidOddsGovernor(...a),
}));
vi.mock("@/lib/ops/shadow-evaluation-pass", () => ({
  runShadowEvaluationPass: async () => ({ ok: true, results: [] }),
}));

// A failed refresh, shaped from the real `refreshOdds` contract: the run did not
// produce usable quotes. `okCount: 0` of a non-zero total is the "succeeded while
// writing nothing usable" case the route's own comment describes.
const FAILED_RESULT = {
  ok: false,
  elapsedMs: 120,
  okCount: 0,
  totalCount: 12,
  results: [{ sport: "nfl", ok: false, error: "provider offline" }],
  freeze: { frozen: false },
};

async function invoke(): Promise<Response> {
  vi.resetModules();
  const mod = await import("@/app/api/cron/refresh-odds/route");
  return (await mod.GET(new Request("http://localhost/api/cron/refresh-odds"))) as Response;
}

describe("GET /api/cron/refresh-odds", () => {
  beforeEach(() => {
    for (const m of [
      refreshOdds,
      generateSignalSlate,
      slateAssociationTrace,
      pingHealthcheck,
      monitorOddsFetchedAt,
      getReadinessGates,
      buildPaidOddsGovernor,
      resolveOddsApiKey,
      resolveRundownApiKey,
    ]) {
      m.mockReset();
    }
    // No paid key, so the route takes the real free path to refreshOdds.
    delete process.env["THE_ODDS_API_KEY"];
    delete process.env["RUNDOWN_API_KEY"];
    delete process.env["HC_REFRESH_PING_URL"];
    delete process.env["HC_ODDS_FETCHEDAT_PING_URL"];
    resolveOddsApiKey.mockReturnValue("test-key");
    resolveRundownApiKey.mockReturnValue(null);
    getReadinessGates.mockReturnValue({ isBootstrapMode: false });
    monitorOddsFetchedAt.mockResolvedValue({
      pinged: false,
      freshness: { scope: "global_max", status: "fresh", ageMinutes: 1, summary: "ok" },
    });
    slateAssociationTrace.mockResolvedValue({ conclusion: "ASSOCIATION_ONLY" });
    generateSignalSlate.mockResolvedValue({ ok: true, picksUpserted: 0 });
  });

  it("a HEALTHY refresh is a 200 with ok=true — the positive control", async () => {
    refreshOdds.mockResolvedValue({ ...FAILED_RESULT, ok: true, okCount: 12 });
    const res = await invoke();
    const body = (await res.json()) as { ok: boolean };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it("a FAILED refresh is NOT a 200 — the defect this file pins", async () => {
    // The body was already honest (`ok: false`). Only the status lied, and the
    // status is what Vercel's scheduler, uptime checks and log readers consume.
    // An odds plane that is silently dead is worse than one that is visibly
    // down: downstream freshness readers would treat stale quotes as current.
    refreshOdds.mockResolvedValue(FAILED_RESULT);
    const res = await invoke();
    const body = (await res.json()) as { ok: boolean; okCount: number };
    expect(body.ok).toBe(false);
    expect(body.okCount).toBe(0);
    // This assertion is the pin.
    expect(res.status).not.toBe(200);
  });

  it("a run that fetched ZERO quotes is not success even when ok is true", async () => {
    // The exact combination the route's own comment calls "the silent failure":
    // the call completed, and nothing usable came back. `ok: true` with an
    // okCount of 0 is a green run that wrote no quotes.
    refreshOdds.mockResolvedValue({ ...FAILED_RESULT, ok: true, okCount: 0 });
    const res = await invoke();
    const body = (await res.json()) as { okCount: number; totalCount: number };
    expect(body.okCount).toBe(0);
    expect(body.totalCount).toBeGreaterThan(0);
    // A zero-quote run over a non-zero slate must not read as a clean 200.
    expect(res.status).not.toBe(200);
  });
  it("an UNCONFIGURED odds plane is not a green run", async () => {
    // The default state of any deploy without a key, and the most dangerous of
    // the seven instances: it returned `ok: true` with `refreshed: false` on a
    // 200, so a completely dead odds plane reported perfect health. No key, and
    // the signal-only fill itself fails, so there is nothing to report as ok.
    resolveOddsApiKey.mockReturnValue(null);
    resolveRundownApiKey.mockReturnValue(null);
    generateSignalSlate.mockResolvedValue({ ok: false, errors: ["refused"] });
    const res = await invoke();
    const body = (await res.json()) as { ok: boolean; refreshed: boolean };
    expect(body.refreshed).toBe(false);
    expect(body.ok).toBe(false);
    expect(res.status).not.toBe(200);
  });
});
