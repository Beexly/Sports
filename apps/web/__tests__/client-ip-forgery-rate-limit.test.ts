/**
 * Forged X-Forwarded-For must NOT mint a fresh rate-limit bucket.
 *
 * Every proxy APPENDS the address it received the connection from, so the
 * LEFTMOST x-forwarded-for entry is whatever the caller chose to send. Five
 * routes keyed their limiter on exactly that entry:
 *
 *     headers.get("x-forwarded-for").split(",")[0]
 *
 * so a caller who sent `X-Forwarded-For: <random>` got a brand-new bucket on
 * every request and the limit never bound. On /api/waitlist that is unbounded
 * row insertion AND one outbound Resend welcome email per unique address — real
 * spend and sender-domain reputation, days before launch.
 *
 * Each case below rotates the forged leftmost entry while keeping ONE real
 * trailing address (what our edge would have appended), exhausts the route's
 * documented quota, and asserts the next request is refused. Against the
 * pre-fix code every one of these passes the quota untouched.
 *
 * The bodies are deliberately invalid: the limiter runs before body handling,
 * so the allowed requests stop at 4xx validation and never touch the store, the
 * player model, or the email sender.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-entitlement", () => ({
  // roster-advice sits behind requirePremiumApi; null = entitled, continue.
  requirePremiumApi: vi.fn(async () => null),
}));

import { POST as waitlistPost } from "@/app/api/waitlist/route";
import { POST as contestsPost } from "@/app/api/contests/enter/route";
import { POST as cipherPost } from "@/app/api/cipher/verify/route";
import { POST as rosterAvailabilityPost } from "@/app/api/human/roster-availability/route";
import { POST as rosterAdvicePost } from "@/app/api/intelligence/roster-advice/route";
import { resetRateLimits } from "@/lib/api/rate-limit";
import type { NextRequest } from "next/server";

/**
 * Distinct real client per case. The durable limiter is Postgres-backed in CI,
 * where resetRateLimits() cannot clear a bucket — a shared address would let
 * one case exhaust another's quota. TEST-NET-2 addresses, one per case.
 */
let realIpSeq = 0;
function nextRealIp(): string {
  return `198.51.100.${++realIpSeq}`;
}

/** A request whose leftmost XFF entry is attacker-chosen and rotates. */
function forgedRequest(url: string, realIp: string, attempt: number, body = "{not json"): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      // Position 0 is the client's own forgery; position 1 is what our edge saw.
      "x-forwarded-for": `10.${attempt}.${attempt}.${attempt}, ${realIp}`,
    },
    body,
  });
}

beforeEach(() => {
  resetRateLimits();
});

describe("POST /api/waitlist — forged X-Forwarded-For (5/min)", () => {
  const url = "http://localhost/api/waitlist";

  it("counts rotating forged headers against ONE bucket and 429s the 6th", async () => {
    const realIp = nextRealIp();
    for (let i = 0; i < 5; i += 1) {
      const res = await waitlistPost(forgedRequest(url, realIp, i, JSON.stringify({})));
      // Allowed by the limiter, then rejected by validation — never a 429.
      expect(res.status).toBe(422);
    }
    const blocked = await waitlistPost(forgedRequest(url, realIp, 99, JSON.stringify({})));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    const body = await blocked.json();
    expect(body).toMatchObject({ ok: false });
  });

  it("does not lock out a genuinely different client", async () => {
    const exhausted = nextRealIp();
    for (let i = 0; i < 5; i += 1) {
      await waitlistPost(forgedRequest(url, exhausted, i, JSON.stringify({})));
    }
    expect((await waitlistPost(forgedRequest(url, exhausted, 99, JSON.stringify({})))).status).toBe(429);
    const other = await waitlistPost(forgedRequest(url, nextRealIp(), 0, JSON.stringify({})));
    expect(other.status).toBe(422);
  });
});

describe("POST /api/contests/enter — forged X-Forwarded-For (8/min)", () => {
  const url = "http://localhost/api/contests/enter";

  beforeEach(() => {
    process.env["CONTESTS_PUBLIC"] = "true";
  });

  it("counts rotating forged headers against ONE bucket and 429s the 9th", async () => {
    const realIp = nextRealIp();
    for (let i = 0; i < 8; i += 1) {
      const res = await contestsPost(forgedRequest(url, realIp, i));
      expect(res.status).toBe(400);
    }
    const blocked = await contestsPost(forgedRequest(url, realIp, 99));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

describe("POST /api/cipher/verify — forged X-Forwarded-For (8/10min)", () => {
  const url = "http://localhost/api/cipher/verify";

  it("counts rotating forged headers against ONE bucket and 429s the 9th", async () => {
    const realIp = nextRealIp();
    for (let i = 0; i < 8; i += 1) {
      const res = await cipherPost(forgedRequest(url, realIp, i) as NextRequest);
      expect(res.status).toBe(400);
    }
    const blocked = await cipherPost(forgedRequest(url, realIp, 99) as NextRequest);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});

describe("POST /api/human/roster-availability — forged X-Forwarded-For (20/5min)", () => {
  const url = "http://localhost/api/human/roster-availability";

  it("counts rotating forged headers against ONE bucket and 429s the 21st", async () => {
    const realIp = nextRealIp();
    for (let i = 0; i < 20; i += 1) {
      const res = await rosterAvailabilityPost(forgedRequest(url, realIp, i));
      expect(res.status).toBe(400);
    }
    const blocked = await rosterAvailabilityPost(forgedRequest(url, realIp, 99));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});

describe("POST /api/intelligence/roster-advice — forged X-Forwarded-For (30/5min)", () => {
  const url = "http://localhost/api/intelligence/roster-advice";

  it("counts rotating forged headers against ONE bucket and 429s the 31st", async () => {
    const realIp = nextRealIp();
    for (let i = 0; i < 30; i += 1) {
      const res = await rosterAdvicePost(forgedRequest(url, realIp, i));
      expect(res.status).toBe(400);
    }
    const blocked = await rosterAdvicePost(forgedRequest(url, realIp, 99));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});

describe("fail-closed key derivation", () => {
  it("an unidentifiable caller shares ONE bucket rather than getting a private allowance", async () => {
    // No forwarding headers at all → clientIp() returns "anon". Two such callers
    // must contend for the same quota, not each receive their own.
    const bare = (): Request =>
      new Request("http://localhost/api/human/roster-availability", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not json",
      });
    for (let i = 0; i < 20; i += 1) {
      expect((await rosterAvailabilityPost(bare())).status).toBe(400);
    }
    expect((await rosterAvailabilityPost(bare())).status).toBe(429);
  });
});
