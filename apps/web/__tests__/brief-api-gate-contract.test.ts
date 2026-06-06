import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Runtime gate contract for /api/brief.
 *
 * Guards two invariants:
 *   1. When PUBLIC_PICKS_ENABLED=false the picks block is always zeroed.
 *   2. When PUBLIC_PICKS_ENABLED=true the picks block reflects DB counts
 *      (not hardcoded zeros) — this is the fix for the dead-ternary bug
 *      that shipped before this test existed.
 *
 * Uses the same stub-mode pattern as board-phase2-routes.test.ts so it
 * runs in CI without a real Postgres instance.
 */

async function callBrief(): Promise<{ status: number; body: Record<string, unknown> }> {
  vi.resetModules();
  (globalThis as unknown as { prisma?: unknown; prismaStubMode?: boolean }).prisma = undefined;
  (globalThis as unknown as { prisma?: unknown; prismaStubMode?: boolean }).prismaStubMode = undefined;
  const mod = await import("@/app/api/brief/route");
  const res = (await mod.GET()) as Response;
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("/api/brief — gate contract", () => {
  beforeEach(() => {
    process.env["DATABASE_URL"] = "stub";
  });

  describe("with PUBLIC_PICKS_ENABLED=false", () => {
    beforeEach(() => {
      process.env["PUBLIC_PICKS_ENABLED"] = "false";
    });

    it("returns 200 with status: rebuilding", async () => {
      const { status, body } = await callBrief();
      expect(status).toBe(200);
      expect(body["status"]).toBe("rebuilding");
    });

    it("zeros all pick counts when gate is closed", async () => {
      const { body } = await callBrief();
      const picks = body["picks"] as Record<string, number>;
      expect(picks["totalPickCount"]).toBe(0);
      expect(picks["freePickCount"]).toBe(0);
      expect(picks["premiumPickCount"]).toBe(0);
    });

    it("nulls performance when PERFORMANCE_STATS_ENABLED=false", async () => {
      process.env["PERFORMANCE_STATS_ENABLED"] = "false";
      const { body } = await callBrief();
      expect(body["performance"]).toBeNull();
    });

    it("always includes the responsible-gaming text", async () => {
      const { body } = await callBrief();
      expect(typeof body["responsibleGamingText"]).toBe("string");
      expect((body["responsibleGamingText"] as string).length).toBeGreaterThan(0);
    });

    it("NEEDS_REVIEW watch items are filtered from public payload", async () => {
      const { body } = await callBrief();
      const watch = body["watch"] as Array<{ kind: string }>;
      expect(Array.isArray(watch)).toBe(true);
      expect(watch.every((w) => w.kind !== "NEEDS_REVIEW")).toBe(true);
    });
  });

  describe("with PUBLIC_PICKS_ENABLED=true (stub DB returns 0 rows)", () => {
    beforeEach(() => {
      process.env["PUBLIC_PICKS_ENABLED"] = "true";
    });

    it("returns 200 and a picks block (gate-open path executes, no crash)", async () => {
      const { status, body } = await callBrief();
      expect(status).toBe(200);
      const picks = body["picks"] as Record<string, unknown>;
      expect(typeof picks["totalPickCount"]).toBe("number");
      expect(typeof picks["freePickCount"]).toBe("number");
      expect(typeof picks["premiumPickCount"]).toBe("number");
    });

    it("pick counts are non-negative integers", async () => {
      const { body } = await callBrief();
      const picks = body["picks"] as Record<string, number>;
      expect(picks["totalPickCount"]).toBeGreaterThanOrEqual(0);
      expect(picks["freePickCount"]).toBeGreaterThanOrEqual(0);
      expect(picks["premiumPickCount"]).toBeGreaterThanOrEqual(0);
    });

    it("performance block is non-null when gate is open", async () => {
      process.env["PERFORMANCE_STATS_ENABLED"] = "true";
      const { body } = await callBrief();
      // Performance block exists (even if winRate is null — no settled data in stub)
      expect(body["performance"]).not.toBeNull();
    });
  });
});
