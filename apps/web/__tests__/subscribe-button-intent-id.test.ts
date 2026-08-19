import { describe, it, expect, afterEach } from "vitest";
import { newIntentId } from "@/components/pricing/subscribe-button";

/**
 * Regression for a real Safari/WebKit checkout failure (2026-08-16).
 *
 * `subscribe-button.tsx` called `crypto.randomUUID()` UNGUARDED, inside the
 * try block wrapping the checkout POST. `crypto.randomUUID` is exposed only in
 * a secure context and only from Safari 15.4+. Where it is unavailable it
 * throws a TypeError, the surrounding catch swallows it into "Network blip.
 * Check your connection and retry.", and the POST to
 * /api/subscriptions/checkout is NEVER SENT — so the user cannot subscribe and
 * the error message blames their network.
 *
 * Caught by the mobile + Safari Playwright projects; the desktop-Chrome suite
 * passed the same test, which is exactly why single-browser e2e coverage was
 * not enough.
 *
 * These are unit tests rather than e2e on purpose: they exercise the actual
 * failure mode (the API being missing) deterministically, without needing a
 * browser, a dev server, or a free port.
 */

const realCrypto = globalThis.crypto;

function setCrypto(value: unknown): void {
  Object.defineProperty(globalThis, "crypto", {
    value,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  setCrypto(realCrypto);
});

describe("newIntentId — checkout intent id must never throw", () => {
  it("uses crypto.randomUUID when it is available", () => {
    setCrypto({ randomUUID: () => "11111111-2222-3333-4444-555555555555" });
    expect(newIntentId()).toBe("11111111-2222-3333-4444-555555555555");
  });

  it("does NOT throw when crypto is entirely absent (the WebKit failure mode)", () => {
    setCrypto(undefined);
    expect(() => newIntentId()).not.toThrow();
    expect(newIntentId()).toMatch(/^ci_[0-9a-z]+_[0-9a-z]+$/);
  });

  it("does NOT throw when crypto exists but randomUUID does not (Safari < 15.4)", () => {
    // Safari shipped `crypto` long before it shipped `crypto.randomUUID`, so
    // this — not a missing `crypto` — is the realistic older-iOS shape.
    setCrypto({ getRandomValues: () => new Uint8Array(8) });
    expect(() => newIntentId()).not.toThrow();
    expect(newIntentId()).toMatch(/^ci_/);
  });

  it("fallback ids are distinct across calls within one visit", () => {
    // The id only needs to be collision-resistant within a single visit: the
    // server owns the durable CheckoutAttempt and 409s on a mismatch. But two
    // clicks must not collide, or the second would silently reuse the first
    // click's Stripe session.
    setCrypto(undefined);
    const ids = new Set(Array.from({ length: 200 }, () => newIntentId()));
    expect(ids.size).toBe(200);
  });

  it("always returns a non-empty string regardless of crypto shape", () => {
    for (const shape of [undefined, null, {}, { randomUUID: undefined }]) {
      setCrypto(shape);
      const id = newIntentId();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    }
  });
});
