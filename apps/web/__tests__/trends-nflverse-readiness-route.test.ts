import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { NextResponse } from "next/server";

/**
 * `/api/trends/nflverse-readiness` was an UNAUTHENTICATED network + CPU
 * amplifier. Every request fanned out via `Promise.all` to FIVE full nflverse
 * release assets, buffered each entire body through `response.arrayBuffer()`
 * and `gunzipSync`'d it in-process to count rows. No auth, no rate limit, no
 * cache, `force-dynamic`.
 *
 *   while true; do curl -s .../api/trends/nflverse-readiness >/dev/null & done
 *
 * pulls tens of MB per request and decompresses it synchronously: Vercel GB-s +
 * egress burn, function OOM/timeout, and — the real damage — the deployment's
 * egress IP throttled or banned by the nflverse/GitHub host, which breaks the
 * ingestion pipeline the PAID product depends on.
 *
 * This was a conformance miss, not a design choice: all 30+ sibling routes
 * under /api/intelligence/*, /api/nflverse/*, /api/tools, /api/dfs,
 * /api/projections and /api/scoring already call requirePremiumApiRateLimited.
 *
 * These tests run the REAL loader with a stubbed global fetch, so "the
 * expensive fan-out never runs" is proven by counting outbound requests rather
 * than by trusting a mock.
 */

const dbMocks = vi.hoisted(() => ({ groupBy: vi.fn() }));
vi.mock("@sports/db", () => ({ db: { playerGameStat: { groupBy: dbMocks.groupBy } } }));

vi.mock("@/lib/api-entitlement", () => ({ requirePremiumApiRateLimited: vi.fn() }));

import { GET } from "@/app/api/trends/nflverse-readiness/route";
import { requirePremiumApiRateLimited } from "@/lib/api-entitlement";

let fetcher: Mock;

beforeEach(() => {
  dbMocks.groupBy.mockReset().mockResolvedValue([]);
  (requirePremiumApiRateLimited as Mock).mockReset().mockResolvedValue(null); // entitled by default
  fetcher = vi.fn(async () => new Response("missing", { status: 404, statusText: "Not Found" }));
  vi.stubGlobal("fetch", fetcher);
});

describe("GET /api/trends/nflverse-readiness", () => {
  it("gates on the same premium limiter its 30+ siblings use", async () => {
    await GET();
    expect(requirePremiumApiRateLimited).toHaveBeenCalledWith("trends/nflverse-readiness");
  });

  it("an unauthenticated caller gets 401 and the five-dataset fan-out NEVER runs", async () => {
    (requirePremiumApiRateLimited as Mock).mockResolvedValue(
      NextResponse.json(
        { success: false, error: "authentication_required", message: "x" },
        { status: 401 },
      ),
    );

    const res = await GET();

    expect(res.status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled(); // zero bytes pulled from nflverse
    expect(dbMocks.groupBy).not.toHaveBeenCalled();
  });

  it("a FREE / Fantasy caller gets 403 and the fan-out NEVER runs", async () => {
    (requirePremiumApiRateLimited as Mock).mockResolvedValue(
      NextResponse.json({ success: false, error: "insufficient_tier", message: "x" }, { status: 403 }),
    );

    const res = await GET();

    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: string }).error).toBe("insufficient_tier");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("an entitled caller looping the endpoint is cut off by the limiter (429), fan-out skipped", async () => {
    (requirePremiumApiRateLimited as Mock).mockResolvedValue(
      NextResponse.json({ success: false, error: "rate-limited" }, { status: 429 }),
    );

    const res = await GET();

    expect(res.status).toBe(429);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("an entitled caller still gets the real readiness report (the gate is the only change)", async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      data: { requiredDatasetCount: number; canPublishTrends: boolean };
    };
    expect(body.success).toBe(true);
    expect(body.data.requiredDatasetCount).toBe(5);
    expect(body.data.canPublishTrends).toBe(false);
    // Proof the denial tests above actually mean something: when the gate grants,
    // the fan-out genuinely fires (one request per required dataset).
    expect(fetcher).toHaveBeenCalledTimes(5);
  });
});
