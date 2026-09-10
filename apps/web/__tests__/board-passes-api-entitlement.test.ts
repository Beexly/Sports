import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

/**
 * C-181 — the paid No-Bet refusal trail on /api/board/passes.
 *
 * The route called `loadBoardPasses()` with no options, so `includeNoBetDetail`
 * was permanently false and the PRO/ELITE forensic detail was dead on this
 * surface (it failed CLOSED — a dead paid feature, never a leak). Wiring it up
 * means adding per-viewer entitlement resolution to a public, anonymous
 * endpoint, where getting the gate wrong turns a dead feature into a paywall
 * bypass. These tests pin BOTH directions:
 *
 *   - the entitled tier now actually receives the detail (the feature works);
 *   - every unentitled or unresolvable caller receives exactly the anonymous
 *     payload (the gate fails closed), including when the entitlement lookup
 *     THROWS — which must not 500 the public board either.
 *
 * Every value below is a labelled fixture.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getUserEntitlements: vi.fn(),
  loadBoardPasses: vi.fn(),
  logEntitlementFailClosed: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.getUserEntitlements }));
vi.mock("@/lib/board/passes", () => ({ loadBoardPasses: mocks.loadBoardPasses }));
vi.mock("@/lib/entitlement-observability", () => ({
  logEntitlementFailClosed: mocks.logEntitlementFailClosed,
}));

import { GET } from "@/app/api/board/passes/route";

/** The fields an anonymous caller receives today — unchanged by C-181. */
const PUBLIC_ROW = {
  id: "pass-fixture",
  gameId: "game-fixture",
  matchup: "Fixture Away Jays @ Fixture Home Sox",
  sport: "MLB",
  edgeIndex: 40,
  reason: "Fixture reason: edge below threshold",
  evaluatedAt: "2026-09-08T12:00:00.000Z",
};

/** The PRO-only refusal trail `includeNoBetDetail` adds to each row. */
const PAID_DETAIL = {
  reasonCode: "EDGE_BELOW_THRESHOLD",
  confidence: 51,
  modelVersion: "v5.2.7",
  evidenceRefCount: 2,
};

const payloadFor = (includeDetail: boolean) => ({
  data: {
    date: "2026-09-08",
    passes: [includeDetail ? { ...PUBLIC_ROW, detail: PAID_DETAIL } : { ...PUBLIC_ROW }],
  },
  meta: { isSampleData: false },
});

function request(ip = "203.0.113.10"): NextRequest {
  return new NextRequest("https://www.galaxysportsedge.com/api/board/passes", {
    headers: { "x-forwarded-for": ip },
  });
}

/** The exact body an anonymous visitor gets — the byte-for-byte baseline. */
const ANONYMOUS_BODY = { success: true, ...payloadFor(false) };

describe("GET /api/board/passes — No-Bet detail is entitlement-gated server-side (C-181)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The loader honours the option; the route is what must choose it.
    mocks.loadBoardPasses.mockImplementation(
      (_now: Date, options: { includeNoBetDetail?: boolean } = {}) =>
        Promise.resolve(payloadFor(options.includeNoBetDetail === true)),
    );
  });

  it("withholds the detail from an anonymous caller and serves the public list unchanged", async () => {
    mocks.auth.mockResolvedValue(null);

    const res = await GET(request("203.0.113.11"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(ANONYMOUS_BODY);
    expect(mocks.loadBoardPasses).toHaveBeenCalledWith(expect.any(Date), {
      includeNoBetDetail: false,
    });
    // No session ⇒ the entitlement lookup is never even reached.
    expect(mocks.getUserEntitlements).not.toHaveBeenCalled();
  });

  it("withholds the detail from a signed-in FREE member, byte-for-byte the anonymous body", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-free-fixture" } });
    mocks.getUserEntitlements.mockResolvedValue({ canSeeNoBetDetail: false });

    const res = await GET(request("203.0.113.12"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(ANONYMOUS_BODY);
    expect(mocks.loadBoardPasses).toHaveBeenCalledWith(expect.any(Date), {
      includeNoBetDetail: false,
    });
  });

  it("serves the refusal trail to an entitled (canSeeNoBetDetail) member", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-pro-fixture" } });
    mocks.getUserEntitlements.mockResolvedValue({ canSeeNoBetDetail: true });

    const res = await GET(request("203.0.113.13"));

    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { passes: Array<{ detail?: unknown }> } };
    expect(body.data.passes[0]?.detail).toEqual(PAID_DETAIL);
    expect(mocks.loadBoardPasses).toHaveBeenCalledWith(expect.any(Date), {
      includeNoBetDetail: true,
    });
  });

  it("fails CLOSED when the entitlement lookup throws — no detail, still a 200 public list", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-throwing-fixture" } });
    mocks.getUserEntitlements.mockRejectedValue(new Error("fixture: entitlement store down"));

    const res = await GET(request("203.0.113.14"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(ANONYMOUS_BODY);
    expect(mocks.loadBoardPasses).toHaveBeenCalledWith(expect.any(Date), {
      includeNoBetDetail: false,
    });
    expect(mocks.logEntitlementFailClosed).toHaveBeenCalledWith(
      "board-passes:gate",
      "user-throwing-fixture",
      expect.any(Error),
    );
  });

  it("fails CLOSED when the session store throws — no detail, still a 200 public list", async () => {
    mocks.auth.mockRejectedValue(new Error("fixture: session store down"));

    const res = await GET(request("203.0.113.15"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(ANONYMOUS_BODY);
    expect(mocks.getUserEntitlements).not.toHaveBeenCalled();
    expect(mocks.logEntitlementFailClosed).toHaveBeenCalledWith(
      "board-passes:auth",
      undefined,
      expect.any(Error),
    );
  });

  it("is never cacheable — the body now varies by viewer, so a shared cache entry would be a bypass", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-pro-fixture" } });
    mocks.getUserEntitlements.mockResolvedValue({ canSeeNoBetDetail: true });

    const res = await GET(request("203.0.113.16"));

    expect(res.headers.get("cache-control")).toBe("no-store, no-cache, must-revalidate");
  });
});
