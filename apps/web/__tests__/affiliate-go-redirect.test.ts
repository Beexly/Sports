import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Affiliate click redirect (/go/[slug]) — the click-time safety + attribution
 * gate. We never forward a click to a non-publishable promo, and we attach a
 * first-party subid to the signed affiliate URL.
 */

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  evaluate: vi.fn(),
}));

vi.mock("@sports/db", () => ({
  db: { promotion: { findUnique: mocks.findUnique } },
}));

vi.mock("@/lib/promotions/guards", () => ({
  evaluatePromotionForPublish: mocks.evaluate,
}));

import { GET } from "../app/go/[slug]/route";

function req(slug: string, qs = "") {
  return new NextRequest(`https://gse.test/go/${slug}${qs}`);
}

const PUBLISHABLE = { publishable: true, blockers: [] };
const BLOCKED = { publishable: false, blockers: [{ code: "EXPIRED" }] };

beforeEach(() => {
  mocks.findUnique.mockReset();
  mocks.evaluate.mockReset();
  mocks.evaluate.mockReturnValue(PUBLISHABLE);
});

describe("GET /go/[slug]", () => {
  it("redirects a publishable promo to the affiliate URL with a subid", async () => {
    mocks.findUnique.mockResolvedValue({
      slug: "dk-bonus",
      sportsbookKey: "draftkings",
      affiliateUrl: "https://sportsbook.draftkings.com/promo?aff=123",
    });
    const res = await GET(req("dk-bonus"), { params: { slug: "dk-bonus" } });
    expect(res.status).toBe(302);
    const loc = res.headers.get("location")!;
    expect(loc).toContain("sportsbook.draftkings.com");
    expect(loc).toContain("subid=gse");
    expect(loc).toContain("aff=123");
  });

  it("falls back to /promotions when the promo is not publishable at click time", async () => {
    mocks.findUnique.mockResolvedValue({
      slug: "dk-bonus",
      sportsbookKey: "draftkings",
      affiliateUrl: "https://sportsbook.draftkings.com/promo",
    });
    mocks.evaluate.mockReturnValue(BLOCKED);
    const res = await GET(req("dk-bonus"), { params: { slug: "dk-bonus" } });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/promotions");
  });

  it("falls back when the promo is missing", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const res = await GET(req("nope"), { params: { slug: "nope" } });
    expect(res.headers.get("location")).toContain("/promotions");
  });

  it("falls back when there is no affiliate URL", async () => {
    mocks.findUnique.mockResolvedValue({ slug: "x", sportsbookKey: "draftkings", affiliateUrl: null });
    const res = await GET(req("x"), { params: { slug: "x" } });
    expect(res.headers.get("location")).toContain("/promotions");
  });

  it("refuses a non-http affiliate URL (no javascript: forwarding)", async () => {
    mocks.findUnique.mockResolvedValue({
      slug: "x",
      sportsbookKey: "draftkings",
      affiliateUrl: "javascript:alert(1)",
    });
    const res = await GET(req("x"), { params: { slug: "x" } });
    expect(res.headers.get("location")).toContain("/promotions");
  });

  it("falls back when the DB read throws", async () => {
    mocks.findUnique.mockRejectedValue(new Error("db down"));
    const res = await GET(req("x"), { params: { slug: "x" } });
    expect(res.headers.get("location")).toContain("/promotions");
  });
});
