import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { clientIp } from "./rate-limit";

/**
 * Rate-limit key integrity.
 *
 * clientIp() previously returned the LEFTMOST x-forwarded-for entry. Because every
 * proxy APPENDS the address it received the connection from, a client that sends its
 * own `X-Forwarded-For` keeps that value at position 0 — so an attacker could rotate
 * the header and mint unlimited distinct rate-limit buckets, bypassing every per-IP
 * limit. These tests pin the forged-header cases specifically.
 */

const req = (headers: Record<string, string>): NextRequest =>
  ({ headers: new Headers(headers) }) as unknown as NextRequest;

describe("clientIp — forgery resistance", () => {
  it("IGNORES an attacker-prepended x-forwarded-for entry (the bypass)", () => {
    // Client sent "X-Forwarded-For: 1.2.3.4"; our edge appended the real address.
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4, 203.0.113.9" }))).toBe(
      "203.0.113.9",
    );
  });

  it("gives a rotating forged header the SAME bucket, not a fresh one each time", () => {
    const a = clientIp(req({ "x-forwarded-for": "9.9.9.9, 203.0.113.9" }));
    const b = clientIp(req({ "x-forwarded-for": "8.8.8.8, 203.0.113.9" }));
    const c = clientIp(req({ "x-forwarded-for": "7.7.7.7, 203.0.113.9" }));
    expect(a).toBe("203.0.113.9");
    expect(new Set([a, b, c]).size).toBe(1);
  });

  it("prefers platform-set headers over anything the client can forward", () => {
    expect(
      clientIp(
        req({
          "x-forwarded-for": "1.2.3.4, 5.6.7.8",
          "x-vercel-forwarded-for": "203.0.113.9",
        }),
      ),
    ).toBe("203.0.113.9");
    expect(
      clientIp(req({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "203.0.113.7" })),
    ).toBe("203.0.113.7");
  });
});

describe("clientIp — normal operation", () => {
  it("uses the only entry when there is exactly one", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("handles IPv6 and tolerates whitespace", () => {
    expect(clientIp(req({ "x-forwarded-for": "  2001:db8::1  " }))).toBe("2001:db8::1");
    expect(clientIp(req({ "x-real-ip": "2001:db8::2" }))).toBe("2001:db8::2");
  });

  it("falls back to a single shared 'anon' bucket rather than a private allowance", () => {
    expect(clientIp(req({}))).toBe("anon");
    expect(clientIp(req({ "x-forwarded-for": "" }))).toBe("anon");
    expect(clientIp(req({ "x-forwarded-for": "not-an-ip" }))).toBe("anon");
    expect(clientIp(req({ "x-real-ip": "<script>" }))).toBe("anon");
  });

  it("rejects out-of-range octets instead of trusting them as a key", () => {
    expect(clientIp(req({ "x-forwarded-for": "999.999.999.999" }))).toBe("anon");
  });

  it("does not fall off the front of a short chain", () => {
    // Fewer entries than trusted hops must still yield a real value, not undefined.
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.9" }))).toBe("203.0.113.9");
  });
});
