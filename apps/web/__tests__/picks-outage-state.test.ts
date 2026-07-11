import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * T-picks-outage (states doctrine) — executed behavior for /api/picks.
 *
 * A DB failure on the primary picks query previously reused the bootstrap
 * 503 body, so from the outside an OUTAGE was indistinguishable from
 * deliberate env gating — monitors reading "disabled in bootstrap mode"
 * paged nobody and the runbook pointed at environment flags instead of the
 * database (the 2026-07-10 incident lesson, same as staleDataGateResponse).
 *
 * Pins:
 *   - DB error on the primary query → 503 with reason:"backend_outage",
 *     bootstrapMode:false — NEVER the bootstrap body.
 *   - Deliberate gating still returns the genuine bootstrap body (unchanged).
 *   - The three public dark states carry mutually distinct discriminators.
 *
 * Follows the executed-handler + vi.mock("@sports/db") pattern from
 * picks-stale-kill-switch.test.ts.
 */

const mocks = vi.hoisted(() => ({
  canExposePublicPicks: true,
  pickFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
  pickCount: vi.fn<(args?: unknown) => Promise<number>>(),
  auth: vi.fn<() => Promise<{ user?: { id: string } } | null>>(),
  getUserEntitlements: vi.fn<(userId: string) => Promise<Record<string, unknown>>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    pick: { findMany: mocks.pickFindMany, count: mocks.pickCount },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.getUserEntitlements }));

// Keep bootstrapGateResponse real so the 503 body shapes are the genuine ones;
// only the readiness gates are controllable per test. forceNoBetIfStale stays
// off so the freshness branch never runs here.
vi.mock("@sports/prediction-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/prediction-engine")>();
  return {
    ...actual,
    getReadinessGates: () => ({
      canExposePublicPicks: mocks.canExposePublicPicks,
      forceNoBetIfStale: false,
      canApplyCalibrationAdjustments: false,
    }),
  };
});

async function callPicks(): Promise<{ status: number; body: Record<string, unknown> }> {
  vi.resetModules();
  const mod = await import("@/app/api/picks/route");
  const req = new Request("http://localhost/api/picks");
  const res = await mod.GET(req as unknown as Parameters<typeof mod.GET>[0]);
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("/api/picks outage state (T-picks-outage)", () => {
  beforeEach(() => {
    mocks.canExposePublicPicks = true;
    mocks.pickFindMany.mockReset();
    mocks.pickCount.mockReset();
    mocks.auth.mockResolvedValue(null); // anonymous viewer
    mocks.pickCount.mockResolvedValue(0);
  });

  it("returns the DISTINCT outage 503 when the primary picks query fails", async () => {
    mocks.pickFindMany.mockRejectedValue(new Error("connection refused"));

    const { status, body } = await callPicks();

    expect(status).toBe(503);
    // An outage must say so — never dress as deliberate bootstrap gating.
    expect(body["reason"]).toBe("backend_outage");
    expect(body["bootstrapMode"]).toBe(false);
    // No stack-trace leak: the error string is the curated body, not the throw.
    expect(String(body["error"])).not.toContain("connection refused");
  });

  it("deliberate gating still returns the genuine bootstrap body (unchanged behavior)", async () => {
    mocks.canExposePublicPicks = false;

    const { status, body } = await callPicks();

    expect(status).toBe(503);
    expect(body["bootstrapMode"]).toBe(true);
    expect(body["reason"]).toBeUndefined();
    // The gate short-circuits before any DB read.
    expect(mocks.pickFindMany).not.toHaveBeenCalled();
  });

  it("a healthy read still serves normally", async () => {
    mocks.pickFindMany.mockResolvedValue([]);

    const { status, body } = await callPicks();

    expect(status).toBe(200);
    expect(body["success"]).toBe(true);
  });

  it("the three public dark states carry mutually distinct discriminators", async () => {
    const { bootstrapGateResponse } = await import("@sports/prediction-engine");
    const { staleDataGateResponse } = await import(
      "@/lib/data-reliability/public-freshness-gate"
    );
    const { outageGateResponse } = await import("@/lib/data-reliability/outage-gate");

    const bootstrap = bootstrapGateResponse("X") as Record<string, unknown>;
    const stale = staleDataGateResponse("X");
    const outage = outageGateResponse("X");

    // Bootstrap is the only state with bootstrapMode:true and carries no reason.
    expect(bootstrap["bootstrapMode"]).toBe(true);
    expect(bootstrap["reason"]).toBeUndefined();
    // Stale and outage both deny bootstrap and disagree on reason.
    expect(stale.bootstrapMode).toBe(false);
    expect(outage.bootstrapMode).toBe(false);
    expect(stale.reason).toBe("stale_data");
    expect(outage.reason).toBe("backend_outage");
    expect(stale.reason).not.toBe(outage.reason);
  });
});
