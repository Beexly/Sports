import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * T-outage-sweep (states doctrine) — the five public surfaces that still
 * dressed a DB-read failure as a healthy or deliberate state, found and
 * independently confirmed by the adversarial verify workflow on PR #87:
 *
 *   1. /api/calibration      → 200 "collecting"        (outage as young record)
 *   2. /api/picks/daily-slate → 200 healthy EMPTY slate (freshly stamped!)
 *   3. /api/promotions        → 200 "no offers" + CDN cache
 *   4. game-room load          → null → consumers 404 "game-not-found"
 *   5. proof-of-record loader  → empty ledger, sha256("") root, "0 settled"
 *
 * Every surface now either answers the distinct outage 503 (APIs), throws
 * into a designed error state (pages), or carries a machine-readable
 * discriminator (embedded loaders). Deliberate states are untouched.
 */

const mocks = vi.hoisted(() => ({
  pickCount: vi.fn<(args?: unknown) => Promise<number>>(),
  pickFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
  promotionFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
  gameFindUnique: vi.fn<(args?: unknown) => Promise<unknown>>(),
  ingestionRunFindFirst: vi.fn<(args: unknown) => Promise<unknown>>(),
  isStubMode: vi.fn<() => boolean>(),
  isDemoPicksEnabled: vi.fn<() => boolean>(),
  getSamplePicks: vi.fn<() => unknown[]>(),
  canExposePerformanceStats: true,
}));

vi.mock("@sports/db", () => ({
  db: {
    pick: { count: mocks.pickCount, findMany: mocks.pickFindMany },
    promotion: { findMany: mocks.promotionFindMany },
    game: { findUnique: mocks.gameFindUnique },
    ingestionRun: { findFirst: mocks.ingestionRunFindFirst },
  },
  isStubMode: mocks.isStubMode,
  isDemoPicksEnabled: mocks.isDemoPicksEnabled,
  getSamplePicks: mocks.getSamplePicks,
}));

vi.mock("@sports/prediction-engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@sports/prediction-engine")>();
  return {
    ...actual,
    getReadinessGates: () => ({
      canExposePerformanceStats: mocks.canExposePerformanceStats,
      forceNoBetIfStale: false,
    }),
  };
});

function repoFile(path: string): string {
  return readFileSync(resolve(__dirname, "..", "..", "..", path), "utf8");
}

describe("T-outage-sweep — no public surface dresses a DB outage as a healthy state", () => {
  beforeEach(() => {
    for (const m of Object.values(mocks)) {
      if (typeof m === "function" && "mockReset" in m) m.mockReset();
    }
    mocks.canExposePerformanceStats = true;
    mocks.isStubMode.mockReturnValue(false);
    mocks.isDemoPicksEnabled.mockReturnValue(false);
    mocks.getSamplePicks.mockReturnValue([]);
  });

  describe("/api/picks/daily-slate", () => {
    async function callSlate(): Promise<{ status: number; body: Record<string, unknown> }> {
      vi.resetModules();
      const mod = await import("@/app/api/picks/daily-slate/route");
      const res = await mod.GET();
      return { status: res.status, body: (await res.json()) as Record<string, unknown> };
    }

    it("returns the outage 503 when a primary read fails — never a healthy freshly-stamped empty slate", async () => {
      mocks.pickCount.mockRejectedValue(new Error("connection refused"));

      const { status, body } = await callSlate();

      expect(status).toBe(503);
      expect(body["reason"]).toBe("backend_outage");
      expect(String(body["error"])).not.toContain("connection refused");
    });

    it("serves the real slate when reads succeed", async () => {
      mocks.pickCount.mockResolvedValue(3);
      mocks.pickFindMany.mockResolvedValue([
        { gameId: "g1", game: { sport: { name: "NFL" } } },
      ]);

      const { status, body } = await callSlate();

      expect(status).toBe(200);
      const data = body["data"] as Record<string, unknown>;
      expect(data["totalPicks"]).toBe(3);
      expect(data["totalGames"]).toBe(1);
    });
  });

  describe("/api/calibration", () => {
    async function callCalibration(): Promise<{ status: number; body: Record<string, unknown> }> {
      vi.resetModules();
      const mod = await import("@/app/api/calibration/route");
      const res = await mod.GET();
      return { status: res.status, body: (await res.json()) as Record<string, unknown> };
    }

    it("returns the outage 503 when the DB read fails — never a 200 dressed as 'collecting'", async () => {
      mocks.pickFindMany.mockRejectedValue(new Error("db down"));

      const { status, body } = await callCalibration();

      expect(status).toBe(503);
      expect(body["reason"]).toBe("backend_outage");
    });

    it("the deliberate gated 'collecting' state still answers 200 (unchanged)", async () => {
      mocks.canExposePerformanceStats = false;

      const { status, body } = await callCalibration();

      expect(status).toBe(200);
      const data = body["data"] as Record<string, unknown>;
      expect(data["isCollecting"]).toBe(true);
      expect(data["readFailed"]).toBeUndefined();
    });

    it("the loader keeps embedding pages render-safe while carrying the readFailed discriminator", async () => {
      mocks.pickFindMany.mockRejectedValue(new Error("db down"));
      vi.resetModules();
      const { loadPublicCalibrationReport } = await import("@/lib/calibration/report");

      // Never throws — home/board/house/proof pages embed this directly.
      const payload = await loadPublicCalibrationReport();

      expect(payload.data.readFailed).toBe(true);
      expect(payload.data.isCollecting).toBe(true);
    });
  });

  describe("/api/promotions", () => {
    it("returns the outage 503 with no-store when the DB read fails — never a cacheable 'no offers' 200", async () => {
      mocks.promotionFindMany.mockRejectedValue(new Error("db down"));
      vi.resetModules();
      const mod = await import("@/app/api/promotions/route");
      const res = await mod.GET(
        new Request("http://localhost/api/promotions") as unknown as Parameters<typeof mod.GET>[0],
      );

      expect(res.status).toBe(503);
      expect(res.headers.get("cache-control")).toBe("no-store");
      const body = (await res.json()) as Record<string, unknown>;
      expect(body["reason"]).toBe("backend_outage");
    });

    it("a genuinely empty promo list still answers 200 (unchanged)", async () => {
      mocks.promotionFindMany.mockResolvedValue([]);
      vi.resetModules();
      const mod = await import("@/app/api/promotions/route");
      const res = await mod.GET(
        new Request("http://localhost/api/promotions") as unknown as Parameters<typeof mod.GET>[0],
      );

      expect(res.status).toBe(200);
    });
  });

  describe("game-room loader", () => {
    it("THROWS on a DB-read failure — never collapses an outage into 'not found'", async () => {
      mocks.gameFindUnique.mockRejectedValue(new Error("db down"));
      vi.resetModules();
      const { loadGameRoom } = await import("@/lib/game-room/load");

      await expect(loadGameRoom("game-1")).rejects.toThrow("db down");
    });

    it("still returns null for a genuinely missing game (the honest 404 path)", async () => {
      mocks.gameFindUnique.mockResolvedValue(null);
      vi.resetModules();
      const { loadGameRoom } = await import("@/lib/game-room/load");

      await expect(loadGameRoom("missing")).resolves.toBeNull();
    });

    it("the model-court route translates the throw into the outage 503, not a 404", () => {
      const src = repoFile("apps/web/app/api/room/[gameId]/model-court/route.ts");
      expect(src).toContain("outageGateResponse");
      expect(src).toMatch(/catch[\s\S]{0,200}outageGateResponse\("Model Court"\)/);
    });
  });

  describe("proof-of-record loader", () => {
    it("REJECTS on a committed-set read failure so /proof renders its designed unreachable state", async () => {
      mocks.pickFindMany.mockRejectedValue(new Error("db down"));
      vi.resetModules();
      const { loadProofOfRecord } = await import("@/lib/proof/load-proof-of-record");

      // The old `.catch(() => [])` swallowed this into "0 settled picks" with
      // a sha256("") root — an outage rendered as "no record was ever
      // committed" on the trust surface.
      await expect(loadProofOfRecord()).rejects.toThrow("db down");
    });

    it("the /proof page's unreachable handler is still wired to catch it", () => {
      const src = repoFile("apps/web/app/proof/page.tsx");
      expect(src).toContain("ledgerUnreachable = true");
    });
  });

  describe("prod-probe", () => {
    it("classifies the calibration outage 503 BY NAME (status-aware gate probe)", () => {
      const src = repoFile("scripts/prod-probe.mjs");
      expect(src).toContain("validateCalibrationGate");
      expect(src).toMatch(/validateCalibrationGate[\s\S]{0,400}backend_outage/);
      // Calibration moved to the status-aware probe list.
      const gateList = src.match(/const GATE_SHAPE_PROBES = \[[\s\S]*?\n\];/)?.[0] ?? "";
      expect(gateList).toContain('"/api/calibration"');
    });
  });
});
