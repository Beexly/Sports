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

  /**
   * REGRESSION (C-31 fix 5): the old fallback minted a non-UUID `ci_...` id.
   * The server's CLIENT_INTENT_ID_RE accepts UUIDs only, so every browser
   * without randomUUID hard-400ed and could NEVER complete checkout. The fix
   * returns null so the caller omits the field and the server's token-less
   * branch mints its own intent. These tests now pin null, not `ci_`.
   */
  it("returns null when crypto is entirely absent (the WebKit failure mode)", () => {
    setCrypto(undefined);
    expect(() => newIntentId()).not.toThrow();
    expect(newIntentId()).toBeNull();
  });

  it("returns null when crypto exists but randomUUID does not (Safari < 15.4)", () => {
    // Safari shipped `crypto` long before `crypto.randomUUID`, so this — not a
    // missing `crypto` — is the realistic older-iOS shape.
    setCrypto({ getRandomValues: () => new Uint8Array(8) });
    expect(() => newIntentId()).not.toThrow();
    expect(newIntentId()).toBeNull();
  });

  it("never returns a non-UUID string the server would reject with a 400", () => {
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const shape of [undefined, null, {}, { randomUUID: undefined }]) {
      setCrypto(shape);
      const id = newIntentId();
      expect(id === null || UUID_RE.test(id)).toBe(true);
    }
  });

  it("still returns the real UUID unchanged when randomUUID works", () => {
    setCrypto({ randomUUID: () => "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" });
    const id = newIntentId();
    expect(id).not.toBeNull();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
