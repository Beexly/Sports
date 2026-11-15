import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WEEK8_GAME_DAY_CATALOG_METADATA } from "@/lib/packages/catalog";

const mocks = vi.hoisted(() => ({
  promotionUpdateMany: vi.fn(),
  cockpitTaskUpdateMany: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: {
    promotion: { updateMany: mocks.promotionUpdateMany },
    cockpitTask: { updateMany: mocks.cockpitTaskUpdateMany },
  },
}));

describe("POST /api/storefront/purge-stale-packages", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, GSE_OPERATOR_KEY: "sovereign-operator-secret" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 401 when x-gse-Operator-Key header is missing", async () => {
    const mod = await import("@/app/api/storefront/purge-stale-packages/route");
    const req = new Request("http://localhost/api/storefront/purge-stale-packages", {
      method: "POST",
    });

    const res = await mod.POST(req);
    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("Unauthorized");
    expect(mocks.promotionUpdateMany).not.toHaveBeenCalled();
    expect(mocks.cockpitTaskUpdateMany).not.toHaveBeenCalled();
  });

  it("returns 401 when x-gse-Operator-Key header has invalid key", async () => {
    const mod = await import("@/app/api/storefront/purge-stale-packages/route");
    const req = new Request("http://localhost/api/storefront/purge-stale-packages", {
      method: "POST",
      headers: {
        "x-gse-Operator-Key": "wrong-secret",
      },
    });

    const res = await mod.POST(req);
    expect(res.status).toBe(401);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBe("Unauthorized");
    expect(mocks.promotionUpdateMany).not.toHaveBeenCalled();
    expect(mocks.cockpitTaskUpdateMany).not.toHaveBeenCalled();
  });

  it("authorized requests archive prior-week promotions/tasks and return the catalogue's active slate token", async () => {
    mocks.promotionUpdateMany.mockResolvedValueOnce({ count: 3 });
    mocks.cockpitTaskUpdateMany.mockResolvedValueOnce({ count: 5 });

    const mod = await import("@/app/api/storefront/purge-stale-packages/route");
    const req = new Request("http://localhost/api/storefront/purge-stale-packages", {
      method: "POST",
      headers: {
        "x-gse-Operator-Key": "sovereign-operator-secret",
      },
    });

    const res = await mod.POST(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    // The active slate is derived from the catalogue, never typed into the
    // route: a hardcoded week token rots on the next slate.
    const activeWeek = Number(
      /Week\s+(\d+)/i.exec(WEEK8_GAME_DAY_CATALOG_METADATA.slateWindowLabel)![1]
    );
    const activeToken = `WEEK_${String(activeWeek).padStart(2, "0")}_LIVE`;

    expect(body.status).toBe("SUCCESS");
    expect(body.remediations).toEqual({
      stale_packages_deactivated: 3,
      cockpit_records_archived: 5,
      active_slate_target: activeToken,
    });

    // Prior weeks only. Archiving the active week's own promotions would empty
    // the storefront the purge exists to keep current.
    const promotionWhere = (mocks.promotionUpdateMany.mock.calls[0]![0] as {
      where: { OR: Array<Record<string, { contains: string }>> };
    }).where;
    const tokens = promotionWhere.OR.flatMap((clause) =>
      Object.values(clause).map((value) => value.contains)
    );
    expect(tokens.length).toBeGreaterThan(0);
    for (const token of tokens) {
      expect(Number(/(\d+)/.exec(token)![1])).toBeLessThan(activeWeek);
    }
    expect(tokens).toContain(`Week ${activeWeek - 1}`);

    const taskWhere = (mocks.cockpitTaskUpdateMany.mock.calls[0]![0] as {
      where: { OR: Array<{ title: { contains: string } }> };
    }).where;
    expect(taskWhere.OR.map((clause) => clause.title.contains)).toEqual([
      `Week ${activeWeek - 2}`,
      `Week ${activeWeek - 1}`,
    ]);
  });

  it("handles internal db errors gracefully with status 500", async () => {
    mocks.promotionUpdateMany.mockRejectedValueOnce(new Error("Database connection timed out"));

    const mod = await import("@/app/api/storefront/purge-stale-packages/route");
    const req = new Request("http://localhost/api/storefront/purge-stale-packages", {
      method: "POST",
      headers: {
        "x-gse-Operator-Key": "sovereign-operator-secret",
      },
    });

    const res = await mod.POST(req);
    expect(res.status).toBe(500);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe("ERROR");
    expect(body.details).toContain("Database connection timed out");
  });
});
