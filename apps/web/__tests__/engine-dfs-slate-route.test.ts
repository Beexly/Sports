/**
 * GET /api/cron/engine-dfs-slate — route contract.
 *
 * The defect this pins. The route had a fully correct failure branch: it
 * caught, it set `success: false`, and it carried the note "An empty slate is
 * the honest failure; the sample slate is never substituted here." Then it
 * returned that branch with `{ status: 200 }`. The body was honest and the
 * status lied, which is the worst place for the lie — the status is what
 * Vercel's scheduler, uptime checks and log readers consume, and none of them
 * read the body.
 *
 * This is the fourth instance of one pattern in this lane, and the pattern is
 * specific: the failure is reported CORRECTLY in the payload and INCORRECTLY in
 * the status, so every human reading the body believes the system is honest
 * while every automated consumer believes the job passed.
 *
 * READ-ONLY route. The tests below assert it writes nothing and flips nothing;
 * DFS_PROVIDER is reported, never set (law 3).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const buildEngineSlate = vi.fn();
const captureError = vi.fn();
const isLiveDfs = vi.fn();
const resolveDfsSlateProvider = vi.fn();

vi.mock("@/lib/cron/authorize", () => ({ cronAuthError: () => null }));
vi.mock("@/lib/observability/sentry", () => ({
  captureError: (...a: unknown[]) => captureError(...a),
}));
vi.mock("@/lib/integrations/dfs", () => ({
  isLiveDfs: (...a: unknown[]) => isLiveDfs(...a),
  resolveDfsSlateProvider: (...a: unknown[]) => resolveDfsSlateProvider(...a),
}));
vi.mock("@/lib/fantasy/engine-slate", () => ({
  buildEngineSlate: (...a: unknown[]) => buildEngineSlate(...a),
}));
vi.mock("@sports/db", () => ({
  db: { playerGameStat: { findFirst: async () => null } },
}));

const HEALTHY_REPORT = {
  players: [
    {
      name: "A. Player",
      pos: "RB",
      team: "DEN",
      proj: 12.5,
      floor: 4.1,
      ceiling: 21.9,
      salary: 8200,
    },
  ],
  dropped: [{ name: "B. Player", reason: "no window" }],
  window: 4,
  salaryIsReal: false,
  ownershipIsAssumed: true,
  adjustmentsCalibrated: false,
  adjustmentCount: 2,
};

async function invoke(): Promise<Response> {
  vi.resetModules();
  const mod = await import("@/app/api/cron/engine-dfs-slate/route");
  return (await mod.GET(new Request("http://localhost/api/cron/engine-dfs-slate"))) as Response;
}

describe("GET /api/cron/engine-dfs-slate", () => {
  beforeEach(() => {
    buildEngineSlate.mockReset();
    captureError.mockReset();
    isLiveDfs.mockReset();
    resolveDfsSlateProvider.mockReset();
    buildEngineSlate.mockResolvedValue(HEALTHY_REPORT);
    isLiveDfs.mockReturnValue(false);
    resolveDfsSlateProvider.mockReturnValue({ name: "sample" });
  });

  it("a CRASHED slate build is NOT a 200 — the defect this file pins", async () => {
    buildEngineSlate.mockRejectedValue(new Error("optimizer blew up"));
    const res = await invoke();
    const body = (await res.json()) as { success: boolean; error: string };
    expect(body.success).toBe(false);
    // The body was always honest about this. The status was not, and the status
    // is what the scheduler and every uptime check read.
    expect(res.status).not.toBe(200);
  });

  it("a crashed build still refuses to substitute a sample slate", async () => {
    buildEngineSlate.mockRejectedValue(new Error("optimizer blew up"));
    const res = await invoke();
    const body = (await res.json()) as {
      note: string;
      sample?: unknown;
      players?: unknown;
    };
    // The honesty note must survive the status change — the fix must not have
    // quietly traded one kind of dishonesty for another.
    expect(body.note).toMatch(/empty slate is the honest failure/i);
    expect(body.sample).toBeUndefined();
    expect(body.players).toBeUndefined();
  });

  it("a HEALTHY build is a 200 with success=true — the positive control", async () => {
    // Without this, a route that always 503s would pass the two tests above.
    const res = await invoke();
    const body = (await res.json()) as { success: boolean; players: number };
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.players).toBe(1);
  });

  it("REPORTS DFS_PROVIDER and never sets it (law 3)", async () => {
    const res = await invoke();
    const body = (await res.json()) as { gate: { dfsProviderEnvSet: boolean } };
    // Reported as a boolean observation. Setting it is founder-only and this
    // route is read-only, so it must only ever be read.
    expect(typeof body.gate.dfsProviderEnvSet).toBe("boolean");
    expect(process.env["DFS_PROVIDER"]).toBeUndefined();
  });

  it("states which inputs are NOT real rather than implying they are", async () => {
    const res = await invoke();
    const body = (await res.json()) as {
      provenance: { salary: string; ownership: string; adjustments: string };
    };
    // These three are the reason the route exists as a report rather than a
    // feed. A 200 that made them look real would be the same defect in prose.
    expect(body.provenance.salary).toMatch(/NOT REAL/i);
    expect(body.provenance.ownership).toMatch(/ASSUMED/i);
    expect(body.provenance.adjustments).toMatch(/UNCALIBRATED/i);
  });
});
