import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { clientIp, copyClientIpHeaders } from "./rate-limit";

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

/**
 * `copyClientIpHeaders` is the ONE sanctioned way to relay forwarding headers
 * onto a request built for an in-process route-handler invocation
 * (app/picks/page.tsx calls the picks `GET`s directly instead of self-fetching).
 *
 * The relay must be a VERBATIM copy and must make no trust decision of its own:
 * a relay that copied `split(",")[0]` would launder the caller's forged entry
 * into the position the limiter trusts. Equally, a relay that copies only SOME
 * of the headers changes which one `clientIp()` picks — which is exactly what
 * the hand-rolled two-header relay this replaced did.
 */
describe("copyClientIpHeaders — the relay preserves the key, it does not decide it", () => {
  function relay(source: Record<string, string>): NextRequest {
    const target = new Headers();
    copyClientIpHeaders(new Headers(source), target);
    return { headers: target } as unknown as NextRequest;
  }

  it("copies a multi-hop chain verbatim, forged prefix and all", () => {
    const headers = { "x-forwarded-for": "1.2.3.4, 203.0.113.9" };
    expect(relay(headers).headers.get("x-forwarded-for")).toBe("1.2.3.4, 203.0.113.9");
    // Same request, same key on both sides of the relay.
    expect(clientIp(relay(headers))).toBe(clientIp(req(headers)));
    expect(clientIp(relay(headers))).toBe("203.0.113.9");
  });

  it("carries the platform header, so the relayed key matches the inbound key", () => {
    // The hand-rolled relay copied only x-forwarded-for / x-real-ip. On Vercel
    // the preferred header is x-vercel-forwarded-for, so dropping it made the
    // inner handler key on a DIFFERENT value than the inbound request would.
    const headers = {
      "x-vercel-forwarded-for": "203.0.113.9",
      "x-forwarded-for": "1.2.3.4, 198.51.100.7",
    };
    expect(clientIp(req(headers))).toBe("203.0.113.9");
    expect(clientIp(relay(headers))).toBe("203.0.113.9");

    // The shape it replaced, for contrast: two headers only.
    const partial = new Headers();
    for (const name of ["x-forwarded-for", "x-real-ip"]) {
      const v = new Headers(headers).get(name);
      if (v) partial.set(name, v);
    }
    expect(clientIp({ headers: partial } as unknown as NextRequest)).toBe("198.51.100.7");
  });

  it("copies nothing when there is nothing to copy (still fail-closed downstream)", () => {
    const relayed = relay({});
    expect(relayed.headers.get("x-forwarded-for")).toBeNull();
    expect(clientIp(relayed)).toBe("anon");
  });
});
