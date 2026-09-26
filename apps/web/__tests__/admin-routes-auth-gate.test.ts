import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Access-control tests for every route under /api/admin.
 *
 * Each of these four routes hand-rolls the SAME inline gate
 * (`!session?.user || session.user.role !== "ADMIN"`) rather than sharing a
 * helper, and before this file no test in the suite executed any of them.
 * A dropped check, a typo'd role string, or a copy-paste that forgot the gate
 * on a fifth route would ship silently.
 *
 * Two of these routes spend real money on every successful call:
 *   - trigger-refresh fans out to the paid Odds API for every in-season sport
 *   - losses/[pickId]/draft runs a paid Claude generation
 * so the assertion that matters is not just the status code but that the
 * billable side effect is NEVER reached by a non-admin.
 *
 * Each gate is tested in three states — anonymous, authenticated non-admin,
 * and admin — because a test that only checks "denied" would keep passing if
 * the route were mutated to deny everyone, including real operators.
 *
 * Runtime assertions only: apps/web/tsconfig.json excludes __tests__ from
 * typechecking, so a type-level assertion here would prove nothing.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<{ user?: { id: string; role?: string; email?: string } } | null>>(),
  processSport: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  draftLossAutopsy: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  evaluatePromotionForPublish: vi.fn<(...args: unknown[]) => unknown>(),
  promotionFindMany: vi.fn<(args?: unknown) => Promise<unknown[]>>(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));

vi.mock("@sports/ingestion-pipeline", () => ({ processSport: mocks.processSport }));

vi.mock("@/lib/loss-autopsy/draft", () => {
  class LossAutopsyDraftError extends Error {
    readonly code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = "LossAutopsyDraftError";
      this.code = code;
    }
  }
  return { draftLossAutopsy: mocks.draftLossAutopsy, LossAutopsyDraftError };
});

vi.mock("@/lib/promotions/guards", () => ({
  evaluatePromotionForPublish: mocks.evaluatePromotionForPublish,
}));

// Permissive DB stub: admin-path calls resolve to empty result sets so the
// admin (positive-control) cases can get past the gate without a database.
vi.mock("@sports/db", () => {
  const model = () => ({
    findMany: vi.fn(async () => []),
    findFirst: vi.fn(async () => null),
    findUnique: vi.fn(async () => null),
    groupBy: vi.fn(async () => []),
    count: vi.fn(async () => 0),
    update: vi.fn(async () => ({})),
  });
  return {
    db: {
      game: model(),
      gameSignal: model(),
      ingestionRun: model(),
      pick: model(),
      pickSignalSnapshot: model(),
      promotion: { ...model(), findMany: mocks.promotionFindMany },
      lossAutopsy: model(),
    },
  };
});

import { GET as adminDashboard } from "@/app/api/admin/dashboard/route";
import { GET as adminPromotions } from "@/app/api/admin/promotions/route";
import { POST as adminTriggerRefresh } from "@/app/api/admin/trigger-refresh/route";
import { POST as adminLossDraft } from "@/app/api/admin/losses/[pickId]/draft/route";
import { resetRateLimits } from "@/lib/api/rate-limit";

const ADMIN = { id: "admin_1", role: "ADMIN", email: "ops@example.com" };
const PLAIN_USER = { id: "user_1", role: "USER", email: "sub@example.com" };

function req(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, { method: "POST" });
}

/**
 * The four admin routes, each reduced to a zero-argument invocation plus the
 * deny status it returns. `denyStatus` differs across routes today (403 vs
 * 401) — these tests pin the CURRENT contract of each route rather than
 * asserting a uniformity the code does not have.
 */
const ADMIN_ROUTES = [
  {
    name: "GET /api/admin/dashboard",
    denyStatus: 403,
    invoke: () => adminDashboard(),
  },
  {
    name: "GET /api/admin/promotions",
    denyStatus: 401,
    invoke: () => adminPromotions(),
  },
  {
    name: "POST /api/admin/trigger-refresh",
    denyStatus: 403,
    invoke: () => adminTriggerRefresh(),
  },
  {
    name: "POST /api/admin/losses/[pickId]/draft",
    denyStatus: 401,
    invoke: () =>
      adminLossDraft(req("/api/admin/losses/pick_1/draft"), { params: { pickId: "pick_1" } }),
  },
] as const;

describe("admin API access control", () => {
  beforeEach(() => {
    resetRateLimits();
    mocks.auth.mockReset();
    mocks.processSport.mockReset();
    mocks.draftLossAutopsy.mockReset();
    mocks.evaluatePromotionForPublish.mockReset();
    mocks.promotionFindMany.mockReset();

    mocks.promotionFindMany.mockResolvedValue([]);
    mocks.evaluatePromotionForPublish.mockReturnValue({ ok: true, blockers: [] });
    mocks.processSport.mockResolvedValue({ sport: "NFL", picks: 0 });
    mocks.draftLossAutopsy.mockResolvedValue({ id: "autopsy_1" });
    // No paid Odds key by default: the admin positive control for
    // trigger-refresh stops at the config check, never calling out.
    delete process.env["THE_ODDS_API_KEY"];
  });

  for (const route of ADMIN_ROUTES) {
    describe(route.name, () => {
      it(`denies an anonymous caller with ${route.denyStatus}`, async () => {
        mocks.auth.mockResolvedValue(null);
        const res = await route.invoke();
        expect(res.status).toBe(route.denyStatus);
      });

      it(`denies an authenticated NON-admin with ${route.denyStatus}`, async () => {
        mocks.auth.mockResolvedValue({ user: PLAIN_USER });
        const res = await route.invoke();
        expect(res.status).toBe(route.denyStatus);
      });

      it("denies a session whose user carries no role at all", async () => {
        mocks.auth.mockResolvedValue({ user: { id: "user_2" } });
        const res = await route.invoke();
        expect(res.status).toBe(route.denyStatus);
      });

      it("does not deny a real ADMIN (the gate is not simply closed to everyone)", async () => {
        mocks.auth.mockResolvedValue({ user: ADMIN });
        const res = await route.invoke();
        expect(res.status).not.toBe(route.denyStatus);
      });
    });
  }

  describe("billable side effects are unreachable without ADMIN", () => {
    it("trigger-refresh never calls the paid Odds pipeline for a non-admin", async () => {
      // A key IS configured — so the only thing standing between a non-admin
      // and a billed fan-out across every in-season sport is the gate.
      process.env["THE_ODDS_API_KEY"] = "test-key-not-real";

      for (const session of [null, { user: PLAIN_USER }, { user: { id: "u3" } }]) {
        mocks.auth.mockResolvedValue(session);
        const res = await adminTriggerRefresh();
        expect(res.status).toBe(403);
      }

      expect(mocks.processSport).not.toHaveBeenCalled();
    });

    it("loss-autopsy draft never calls the paid generation for a non-admin", async () => {
      for (const session of [null, { user: PLAIN_USER }, { user: { id: "u3" } }]) {
        mocks.auth.mockResolvedValue(session);
        const res = await adminLossDraft(req("/api/admin/losses/pick_1/draft"), {
          params: { pickId: "pick_1" },
        });
        expect(res.status).toBe(401);
      }

      expect(mocks.draftLossAutopsy).not.toHaveBeenCalled();
    });

    it("promotions never reads the promotion table for a non-admin", async () => {
      mocks.auth.mockResolvedValue({ user: PLAIN_USER });
      const res = await adminPromotions();

      expect(res.status).toBe(401);
      expect(mocks.promotionFindMany).not.toHaveBeenCalled();
    });
  });

  describe("role string is matched exactly", () => {
    // The gate compares against the literal "ADMIN". These near-miss roles
    // must not authorize — they would if the check were loosened to a
    // case-insensitive or substring comparison.
    const NEAR_MISS_ROLES = ["admin", "Admin", "ADMINISTRATOR", "SUPERADMIN", "ADMIN "];

    for (const role of NEAR_MISS_ROLES) {
      it(`rejects role ${JSON.stringify(role)} on the promotions route`, async () => {
        mocks.auth.mockResolvedValue({ user: { id: "u_near", role } });
        const res = await adminPromotions();
        expect(res.status).toBe(401);
        expect(mocks.promotionFindMany).not.toHaveBeenCalled();
      });
    }
  });
});
