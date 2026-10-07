import { describe, it, expect } from "vitest";
import {
  safeCallbackUrl,
  normalizeRelativePath,
  resolveAuthRedirect,
} from "@/lib/auth/callback-url-guard";

/**
 * Unit tests for the open-redirect guard that sanitizes the NextAuth
 * `callbackUrl` parameter on the sign-in page and (via resolveAuthRedirect)
 * inside NextAuth's own `callbacks.redirect`.
 *
 * Invariants:
 *  - Same-origin relative paths (starting with a single "/") are accepted.
 *  - Absolute URLs, protocol-relative URLs, triple-slash, backslash and
 *    CONTROL-CHARACTER variants are rejected → DEFAULT_CALLBACK_URL.
 *  - Bare "/" is rejected by safeCallbackUrl → DEFAULT_CALLBACK_URL.
 *  - undefined / empty → DEFAULT_CALLBACK_URL.
 *  - resolveAuthRedirect never returns a URL on an unvetted origin.
 *
 * EVERY assertion is a RUNTIME assertion. apps/web/tsconfig.json excludes
 * `__tests__/**` from the typecheck, so a type-level assertion here would
 * prove nothing.
 */

// Control characters are built from char codes rather than escapes so the
// payloads are unambiguous in the source and in failure output.
const TAB = String.fromCharCode(0x09);
const LF = String.fromCharCode(0x0a);
const CR = String.fromCharCode(0x0d);
const NUL = String.fromCharCode(0x00);

const APP_ORIGIN = "https://www.galaxysportsedge.com";

/**
 * Resolve a guard verdict the way a browser resolves a `Location` header:
 * the WHATWG URL parser (which Node implements) against the app origin.
 * This is what actually decides whether a payload leaves our domain, so it is
 * the assertion that matters — not string equality against the payload.
 */
function browserHostFor(verdict: string): string {
  return new URL(verdict, APP_ORIGIN).host;
}

describe("safeCallbackUrl", () => {
  it("returns the path for a valid relative URL", () => {
    expect(safeCallbackUrl("/dashboard")).toBe("/dashboard");
    expect(safeCallbackUrl("/dashboard/settings")).toBe("/dashboard/settings");
    expect(safeCallbackUrl("/picks")).toBe("/picks");
  });

  it("preserves query string and hash on an accepted path", () => {
    expect(safeCallbackUrl("/picks?sport=NFL")).toBe("/picks?sport=NFL");
    expect(safeCallbackUrl("/picks#top")).toBe("/picks#top");
  });

  it("returns DEFAULT for undefined / empty", () => {
    expect(safeCallbackUrl(undefined)).toBe("/dashboard");
    expect(safeCallbackUrl("")).toBe("/dashboard");
  });

  it("rejects absolute URLs (open redirect)", () => {
    expect(safeCallbackUrl("https://evil.example")).toBe("/dashboard");
    expect(safeCallbackUrl("https://evil.example/callback")).toBe("/dashboard");
    expect(safeCallbackUrl("http://evil.example")).toBe("/dashboard");
    expect(safeCallbackUrl("evil.example/path")).toBe("/dashboard");
  });

  it("rejects a canonical-host PREFIX on an attacker domain", () => {
    // The classic "looks like us" payload: our host is only a label of theirs.
    expect(safeCallbackUrl("https://www.galaxysportsedge.com.evil.example")).toBe("/dashboard");
    expect(safeCallbackUrl("https://www.galaxysportsedge.com.evil.example/dashboard")).toBe(
      "/dashboard",
    );
    expect(safeCallbackUrl("https://www.galaxysportsedge.com@evil.example")).toBe("/dashboard");
  });

  it("rejects protocol-relative URLs (//evil.example)", () => {
    expect(safeCallbackUrl("//evil.example")).toBe("/dashboard");
    expect(safeCallbackUrl("//evil.example/path")).toBe("/dashboard");
  });

  it("rejects triple-slash (///evil.example normalizes to //evil.example in browsers)", () => {
    expect(safeCallbackUrl("///evil.example")).toBe("/dashboard");
    expect(safeCallbackUrl("///evil.example/path")).toBe("/dashboard");
  });

  it("rejects backslash variants (/\\evil.example)", () => {
    expect(safeCallbackUrl("/\\evil.example")).toBe("/dashboard");
    expect(safeCallbackUrl("/\\evil.example/path")).toBe("/dashboard");
  });

  it("rejects bare /", () => {
    expect(safeCallbackUrl("/")).toBe("/dashboard");
  });

  it("rejects bare /\\", () => {
    expect(safeCallbackUrl("/\\")).toBe("/dashboard");
  });

  // ── The control-character class ────────────────────────────────────────────
  // The WHATWG URL parser strips TAB/LF/CR from the input BEFORE parsing, so a
  // prefix scan that reads "/" + TAB as "a single-slash path" is reading a
  // string the browser will never see. Node accepts a TAB inside a Location
  // header value, so this variant reaches the browser intact from redirect().

  it("rejects a TAB-smuggled protocol-relative URL", () => {
    expect(safeCallbackUrl(`/${TAB}/evil.example`)).toBe("/dashboard");
    expect(safeCallbackUrl(`/${TAB}/evil.example/path`)).toBe("/dashboard");
  });

  it("rejects a TAB-smuggled backslash URL", () => {
    expect(safeCallbackUrl(`/${TAB}\\evil.example`)).toBe("/dashboard");
  });

  it("rejects LF- and CR-smuggled protocol-relative URLs", () => {
    expect(safeCallbackUrl(`/${LF}/evil.example`)).toBe("/dashboard");
    expect(safeCallbackUrl(`/${CR}/evil.example`)).toBe("/dashboard");
    expect(safeCallbackUrl(`/${CR}${LF}/evil.example`)).toBe("/dashboard");
  });

  it("rejects control characters anywhere in the path, not only at index 1", () => {
    expect(safeCallbackUrl(`/dash${TAB}board`)).toBe("/dashboard");
    expect(safeCallbackUrl(`/dashboard${NUL}`)).toBe("/dashboard");
  });

  it("rejects a leading-control payload that would trim to protocol-relative", () => {
    expect(safeCallbackUrl(`${TAB}//evil.example`)).toBe("/dashboard");
  });

  /**
   * THE ASSERTION THAT MATTERS: run each payload's verdict through the same
   * WHATWG resolution a browser performs and require the host to stay ours.
   * A guard that returns the payload verbatim fails here even if a
   * string-equality test somewhere else passed.
   */
  it("no payload's verdict can resolve to an attacker host in a browser", () => {
    const payloads = [
      "https://evil.example",
      "https://evil.example/dashboard",
      "http://evil.example",
      "//evil.example",
      "///evil.example",
      "/\\evil.example",
      "https://www.galaxysportsedge.com.evil.example",
      "https://www.galaxysportsedge.com@evil.example",
      `/${TAB}/evil.example`,
      `/${TAB}\\evil.example`,
      `/${LF}/evil.example`,
      `/${CR}/evil.example`,
      `/${CR}${LF}//evil.example`,
      `${TAB}//evil.example`,
    ];

    const escaped = (s: string): string => JSON.stringify(s);
    for (const payload of payloads) {
      const verdict = safeCallbackUrl(payload);
      expect(
        browserHostFor(verdict),
        `callbackUrl=${escaped(payload)} produced ${escaped(verdict)}, which a browser ` +
          `resolves to host "${browserHostFor(verdict)}" — that is off-origin`,
      ).toBe("www.galaxysportsedge.com");
    }
  });
});

describe("normalizeRelativePath", () => {
  it("allows bare / (a legitimate post-sign-OUT destination)", () => {
    expect(normalizeRelativePath("/")).toBe("/");
  });

  it("returns null for every off-origin payload", () => {
    expect(normalizeRelativePath("https://evil.example")).toBeNull();
    expect(normalizeRelativePath("//evil.example")).toBeNull();
    expect(normalizeRelativePath("/\\evil.example")).toBeNull();
    expect(normalizeRelativePath(`/${TAB}/evil.example`)).toBeNull();
    expect(normalizeRelativePath(null)).toBeNull();
    expect(normalizeRelativePath(undefined)).toBeNull();
  });
});

describe("resolveAuthRedirect (NextAuth callbacks.redirect)", () => {
  const BASE = "https://www.galaxysportsedge.com";

  it("rebases a safe relative path onto the REQUEST origin", () => {
    expect(resolveAuthRedirect("/dashboard", BASE, BASE)).toBe(`${BASE}/dashboard`);
    expect(resolveAuthRedirect("/", BASE, BASE)).toBe(`${BASE}/`);
  });

  it("keeps a local dev request on localhost even though SITE_URL is production", () => {
    // SITE_URL falls back to the production host when NEXT_PUBLIC_APP_URL is
    // unset; a dev sign-in must NOT be bounced to production.
    const dev = "http://localhost:3000";
    expect(resolveAuthRedirect("/dashboard", dev, BASE)).toBe(`${dev}/dashboard`);
  });

  it("accepts an absolute URL on the request origin", () => {
    expect(resolveAuthRedirect(`${BASE}/picks`, BASE, BASE)).toBe(`${BASE}/picks`);
  });

  it("accepts an absolute URL on the canonical origin even from another base", () => {
    const preview = "https://gse-preview.example";
    expect(resolveAuthRedirect(`${BASE}/picks`, preview, BASE)).toBe(`${BASE}/picks`);
  });

  it("collapses every off-origin destination to the request origin", () => {
    const offOrigin = [
      "https://evil.example",
      "https://evil.example/dashboard",
      "//evil.example",
      "///evil.example",
      "/\\evil.example",
      "https://www.galaxysportsedge.com.evil.example",
      "https://www.galaxysportsedge.com@evil.example",
      `/${TAB}/evil.example`,
      `/${TAB}\\evil.example`,
      `/${LF}/evil.example`,
      `/${CR}/evil.example`,
    ];
    for (const url of offOrigin) {
      const verdict = resolveAuthRedirect(url, BASE, BASE);
      expect(
        new URL(verdict).host,
        `redirect callback url=${JSON.stringify(url)} produced ${JSON.stringify(verdict)}`,
      ).toBe("www.galaxysportsedge.com");
    }
  });

  it("never emits an absolute URL when the base origin is unparseable", () => {
    expect(resolveAuthRedirect("https://evil.example", "not-a-url", null)).toBe("/");
  });
});
