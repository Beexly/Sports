import { beforeEach, describe, expect, it } from "vitest";

/**
 * P1d-1 batch 1 — extend consumeRateLimit coverage to the five unauthenticated
 * GSE v1 POST routes that previously had no limiter of any kind
 * (gse/v1/hydration/plan, gse/v1/own/values, gse/v1/rights/classify-export,
 * gse/v1/truth/edge, gse/v1/truth/health).
 *
 * These are the external GSE API surface — no CRON_SECRET gate, no auth, no
 * pre-existing consumeRateLimit / public-form limiter. A single caller could
 * loop an expensive compute (dual-asOf edge, topology health, export classify,
 * PIT value store) unbounded. Each now uses the shared in-memory limiter with
 * the SAME bucket shape as the authenticated checkout / explain routes, keyed
 * by client IP, at the same 8 req / 60s ceiling copied from
 * subscriptions/checkout.
 *
 * This suite drives the REAL route handlers (only the downstream stats-api
 * compute is exercised as-is — no network) and proves, per route:
 *  - a normal request count sails through (200, not 429);
 *  - the 9th request from one IP in the window → 429 with a Retry-After header;
 *  - the limit is PER-IP — a different IP is untouched.
 *
 * The limiter is module-global, so resetRateLimits() in beforeEach keeps the
 * buckets clean between cases.
 */

const LIMIT = 8;

import { resetRateLimits } from "@/lib/api/rate-limit";
import { POST as hydrationPlanPost } from "@/app/api/gse/v1/hydration/plan/route";
import { POST as ownValuesPost } from "@/app/api/gse/v1/own/values/route";
import { POST as classifyExportPost } from "@/app/api/gse/v1/rights/classify-export/route";
import { POST as truthEdgePost } from "@/app/api/gse/v1/truth/edge/route";
import { POST as truthHealthPost } from "@/app/api/gse/v1/truth/health/route";

/** Build a NextRequest with a controllable x-forwarded-for IP + JSON body. */
function reqAs(ip: string, body: unknown): Request {
  const r = new Request("http://localhost/api/x", {
    method: "POST",
    headers: { "x-forwarded-for": ip, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return r as unknown as Request;
}

const ROUTES: Record<string, () => Promise<Response>> = {
  "gse/v1/hydration/plan": () =>
    hydrationPlanPost(
      reqAs("203.0.113.9", { metricIds: ["m1"], entityIds: ["e1"], asOf: "2026-09-14" }) as never,
    ),
  "gse/v1/own/values": () =>
    ownValuesPost(reqAs("203.0.113.9", { metricId: "m1", entityId: "e1", asOf: "2026-09-14" }) as never),
  "gse/v1/rights/classify-export": () =>
    classifyExportPost(
      reqAs("203.0.113.9", { licenseSpdx: "MIT", surface: "public_api" }) as never,
    ),
  "gse/v1/truth/edge": () =>
    truthEdgePost(
      reqAs("203.0.113.9", {
        p: 0.6,
        q: 0.55,
        featureAsOf: "2026-09-14",
        quoteAsOf: "2026-09-14",
        decisionAsOf: "2026-09-14",
      }) as never,
    ),
  "gse/v1/truth/health": () =>
    truthHealthPost(reqAs("203.0.113.9", { planes: {}, now: "2026-09-14T16:00:00Z" }) as never),
};

/**
 * Drive one route until the limiter blocks, returning the number of consumed
 * tokens + the 429. The limiter is the FIRST thing each handler does, so any
 * non-429 response (200 OR a downstream 400/422 refuse-default) counts as a
 * token consumed — the downstream status is NOT what this suite exercises. We
 * only prove the gate fires at exactly the (LIMIT+1)th request.
 */
async function runUntilBlocked(call: () => Promise<Response>): Promise<{
  consumed: number;
  blocked: Response;
}> {
  let consumed = 0;
  for (let i = 0; i < LIMIT * 3; i += 1) {
    const res = await call();
    if (res.status === 429) return { consumed, blocked: res };
    expect(res.status).not.toBe(429);
    consumed += 1;
  }
  throw new Error("limiter never blocked");
}

beforeEach(() => {
  resetRateLimits();
});

describe.each(Object.keys(ROUTES))("gse v1 rate limit — %s", (name) => {
  const call = ROUTES[name];

  it("lets up to LIMIT requests through (not 429ed by the limiter)", async () => {
    for (let i = 0; i < LIMIT; i += 1) {
      const res = await call();
      expect(res.status).not.toBe(429);
    }
  });

  it(`429s one IP's ${LIMIT + 1}th request with a Retry-After header`, async () => {
    const { consumed, blocked } = await runUntilBlocked(call);
    expect(consumed).toBe(LIMIT);
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBeTruthy();
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("is PER-IP: a different IP is untouched after the first is blocked", async () => {
    const { consumed } = await runUntilBlocked(call);
    expect(consumed).toBe(LIMIT);

    // First IP blocked now.
    expect((await call()).status).toBe(429);

    // Switch IP — clean bucket, still allowed through the limiter (the
    // downstream 200/422 is not this suite's concern; only that it isn't 429).
    const res = await (async () => {
      switch (name) {
        case "gse/v1/hydration/plan":
          return hydrationPlanPost(
            reqAs("198.51.100.7", { metricIds: ["m1"], entityIds: ["e1"], asOf: "2026-09-14" }) as never,
          );
        case "gse/v1/own/values":
          return ownValuesPost(reqAs("198.51.100.7", { metricId: "m1", entityId: "e1", asOf: "2026-09-14" }) as never);
        case "gse/v1/rights/classify-export":
          return classifyExportPost(reqAs("198.51.100.7", { licenseSpdx: "MIT", surface: "public_api" }) as never);
        case "gse/v1/truth/edge":
          return truthEdgePost(
            reqAs("198.51.100.7", { p: 0.6, q: 0.55, featureAsOf: "2026-09-14", quoteAsOf: "2026-09-14", decisionAsOf: "2026-09-14" }) as never,
          );
        default:
          return truthHealthPost(reqAs("198.51.100.7", { planes: {}, now: "2026-09-14T16:00:00Z" }) as never);
      }
    })();
    expect(res.status).not.toBe(429);
  });
});
