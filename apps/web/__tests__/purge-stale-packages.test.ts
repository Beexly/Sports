import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  it("authorized requests archive stale WEEK_08 promotions/tasks and return 200 with active_slate_target: WEEK_09_LIVE", async () => {
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

    expect(body.status).toBe("SUCCESS");
    expect(body.remediations).toEqual({
      stale_packages_deactivated: 3,
      cockpit_records_archived: 5,
      active_slate_target: "WEEK_09_LIVE",
    });

    expect(mocks.promotionUpdateMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { slug: { contains: "week-8" } },
          { slug: { contains: "WEEK_08" } },
          { headline: { contains: "Week 8" } },
        ],
      },
      data: {
        status: "ARCHIVED",
        offerSummary:
          "Archived historical Week 8 package — shifted cleanly to upcoming active Week 9 slate.",
      },
    });

    expect(mocks.cockpitTaskUpdateMany).toHaveBeenCalledWith({
      where: {
        title: { contains: "Week 8" },
      },
      data: {
        status: "ARCHIVED",
        decisionNotes:
          "Purged automatically via storefront recovery layer execution script (WEEK_09_LIVE).",
      },
    });
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
