// @vitest-environment node
/**
 * Two-door storefront — logic-only acceptance tests.
 *
 * Covers the live acceptance state (0 official plays => PASS-only storefront,
 * checkout disabled everywhere on the new offers), the public-copy fence on
 * the rendered surfaces, and backward compatibility of the legacy checkout.
 * No DOM rendering: page behavior is verified through source contracts and
 * direct route-handler calls.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";

// Worker env is a snapshot: set test env HERE (hoisted before imports), not
// only in the config. The legacy checkout path needs a non-placeholder key so
// it exercises the (mocked) Stripe SDK branch instead of the dev mock.
vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = "sk_tes...door";
  if (process.env.FORCE_REAL_PRISMA !== "true") {
    process.env.DATABASE_URL = "stub";
  }
});

// Legacy Stripe path stays testable without network: mock the full SDK
// surface the route touches (sessions.create, products.update, accounts.*).
vi.mock("stripe", () => {
  const create = vi.fn().mockResolvedValue({
    id: "cs_test_mock_two_door",
    url: "https://checkout.stripe.com/c/pay/cs_test_mock_two_door",
  });
  class MockStripe {
    static __create = create;
    checkout = { sessions: { create } };
    products = { update: vi.fn().mockResolvedValue({}) };
    accounts = {
      retrieve: vi.fn().mockResolvedValue({ id: "acct_test_two_door" }),
      update: vi.fn().mockResolvedValue({}),
    };
  }
  return { default: MockStripe };
});

import { POST, GET } from "@/app/api/packages/checkout/route";
import { containsBannedRecordCopy, containsBannedWords } from "@/lib/packages/copy-fence";
import { FOUNDING_SEAT_COPY } from "@/lib/packages/two-door-offers";

const pageSrc = readFileSync(new URL("../page.tsx", import.meta.url), "utf8");
const clientSrc = readFileSync(
  new URL("../_components/two-door-checkout.tsx", import.meta.url),
  "utf8",
);
const offersSrc = readFileSync(
  new URL("../../../lib/packages/two-door-offers.ts", import.meta.url),
  "utf8",
);

/** CSS keyframes legitimately use percentages; the fence applies to copy. */
function copyOnly(src: string): string {
  return src.replace(/<style>[\s\S]*?<\/style>/g, "");
}

function post(body: Record<string, unknown>): Promise<Response> {
  return POST(
    new Request("http://localhost/api/packages/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("storefront source — public-copy fence", () => {
  it("renders no record banners, win rates, or unit gains on any new surface", () => {
    for (const src of [pageSrc, clientSrc, offersSrc]) {
      expect(containsBannedRecordCopy(copyOnly(src))).toBe(false);
      expect(copyOnly(src)).not.toMatch(/\d{1,3}(?:\.\d+)?\s*%/);
    }
  });

  it("uses no banned hype words (lock/guaranteed/risk-free)", () => {
    for (const src of [pageSrc, clientSrc, offersSrc]) {
      expect(containsBannedWords(src)).toBe(false);
    }
  });

  it("avoids the retired template vocabulary", () => {
    expect(pageSrc).not.toMatch(/10,000|simulation|dropbacks/i);
  });

  it("links the verified record instead of quoting it", () => {
    expect(pageSrc).toContain('href="/record"');
    expect(pageSrc).toContain("See the verified record");
  });

  it("keeps the stable Door-2 copy contract", () => {
    expect(pageSrc).toContain("Choose Your Football Pack");
    expect(pageSrc).toContain(
      "One-time purchase. Your official picks, player props, and parlays unlock immediately right inside the card below.",
    );
  });

  it("renders the PASS-only state with free transparent reasoning", () => {
    expect(clientSrc).toContain(
      "No official play cleared our five-stage check",
    );
    expect(clientSrc).toContain("here's why we pass".replace("'", "&apos;"));
    expect(pageSrc).toContain("Five stages. No shortcuts.");
  });

  it("gates every checkout button on the server-side Stage-5 status", () => {
    expect(clientSrc).toContain("gate.checkoutEnabled && tierConfigured");
    expect(clientSrc).toContain("disabled={!checkoutOpen");
    expect(clientSrc).toContain("disabled={!enabled");
    // Only a real returned URL may navigate.
    expect(clientSrc).toContain("data.checkoutEnabled && typeof data.url === \"string\"");
  });

  it("states founding pricing honestly without a fabricated live counter", () => {
    expect(pageSrc).toContain("FOUNDING_SEAT_COPY");
    expect(FOUNDING_SEAT_COPY).toBe("Founding pricing · first 100 members");
    expect(pageSrc).toContain("we do not publish");
    expect(pageSrc).not.toMatch(/\d+\s+seats?\s+(left|remaining)/i);
  });
});

describe("checkout route — live PASS-only state (0 official plays)", () => {
  it("GET status reports the gate closed with zero official plays", async () => {
    const res = await GET(
      new Request("http://localhost/api/packages/checkout?action=status"),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.checkoutEnabled).toBe(false);
    expect(data.officialPlayCount).toBe(0);
    expect(data.reason).toBeTruthy();
    expect(data.singleSlateOffers).toHaveLength(2);
    expect(data.membershipPlans).toBeDefined();
  });

  it("disables Door-2 checkout for both packs and both tiers (503, honest reason)", async () => {
    for (const packageSlug of ["primetime-showdown-pack", "sunday-full-slate-pack"]) {
      for (const creditBack of [false, true]) {
        const res = await post({ packageSlug, creditBack });
        expect(res.status).toBe(503);
        const data = await res.json();
        expect(data.checkoutEnabled).toBe(false);
        expect(data.officialPlayCount).toBe(0);
        expect(data.reason).toBeTruthy();
        expect(data.url).toBeUndefined();
      }
    }
  });

  it("disables Door-1 membership checkout for every plan (503, honest reason)", async () => {
    for (const plan of ["founding-monthly", "standard-monthly", "rest-of-season"]) {
      const res = await post({ packageSlug: "season-membership", plan });
      expect(res.status).toBe(503);
      const data = await res.json();
      expect(data.checkoutEnabled).toBe(false);
      expect(data.url).toBeUndefined();
    }
  });

  it("rejects unknown membership plans with 400", async () => {
    const res = await post({ packageSlug: "season-membership", plan: "lifetime-free" });
    expect(res.status).toBe(400);
  });

  it("never mocks a successful purchase for the new offers", async () => {
    const res = await post({ packageSlug: "primetime-showdown-pack" });
    const data = await res.json();
    expect(data.sessionId).toBeUndefined();
    expect(data.mock).toBeUndefined();
    expect(data.checkoutEnabled).toBe(false);
  });
});

describe("checkout route — legacy backward compatibility", () => {
  it("still returns a Stripe session for legacy slugs (existing path intact)", async () => {
    const res = await post({ packageSlug: "tnf-all-in-pack", email: "buyer@example.com" });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sessionId).toBe("cs_test_mock_two_door");
    expect(data.url).toContain("checkout.stripe.com");
  });

  it("still 400s on missing slug and 404s on unknown slugs", async () => {
    expect((await post({})).status).toBe(400);
    expect((await post({ packageSlug: "non-existent-pack" })).status).toBe(404);
  });
});