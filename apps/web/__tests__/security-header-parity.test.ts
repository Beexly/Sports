import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import nextConfig from "../next.config.mjs";

/**
 * Security-header parity (GAP_REGISTER R-11).
 *
 * Two sources emit security headers in production:
 *   1. the repo-root vercel.json `headers` block (Vercel edge — also
 *      covers responses Next never serves), and
 *   2. apps/web/next.config.mjs `headers()` (the Next server).
 *
 * This suite parses BOTH and pins them to each other: every required
 * security header must be present in each source with byte-identical
 * values. A header dropped or drifted in either file fails CI here —
 * previously nothing did.
 *
 * It also pins two deliberate decisions:
 *   - HSTS carries NO `preload` token (preload-list submission is an
 *     irreversible registry commitment and a founder decision), and
 *   - the CSP ships as Content-Security-Policy-Report-Only ONLY; an
 *     enforcing Content-Security-Policy header anywhere is a failure
 *     until the report-only rollout is deliberately graduated.
 */

type HeaderPair = { key: string; value: string };
type HeaderRule = { source: string; headers: HeaderPair[] };

const GLOBAL_SOURCE = "/(.*)";

const REQUIRED_HEADERS = [
  "Strict-Transport-Security",
  "X-Frame-Options",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "Content-Security-Policy-Report-Only",
] as const;

function toMap(pairs: HeaderPair[]): Map<string, string> {
  return new Map(pairs.map((pair) => [pair.key, pair.value]));
}

function mustGet(map: Map<string, string>, key: string): string {
  const value = map.get(key);
  if (value === undefined) {
    throw new Error(`expected header "${key}" to be present`);
  }
  return value;
}

let vercelRules: HeaderRule[] = [];
let nextRules: HeaderRule[] = [];
let vercelGlobal = new Map<string, string>();
let nextGlobal = new Map<string, string>();

beforeAll(async () => {
  const vercelJsonPath = resolve(__dirname, "..", "..", "..", "vercel.json");
  const vercelConfig = JSON.parse(readFileSync(vercelJsonPath, "utf8")) as {
    headers?: HeaderRule[];
  };
  vercelRules = vercelConfig.headers ?? [];

  const headersFn = nextConfig.headers;
  if (!headersFn) {
    throw new Error("next.config.mjs must export an async headers() function");
  }
  nextRules = await headersFn();

  const vercelRule = vercelRules.find((rule) => rule.source === GLOBAL_SOURCE);
  const nextRule = nextRules.find((rule) => rule.source === GLOBAL_SOURCE);
  if (!vercelRule) {
    throw new Error(`vercel.json must carry a global "${GLOBAL_SOURCE}" header rule`);
  }
  if (!nextRule) {
    throw new Error(`next.config.mjs headers() must carry a global "${GLOBAL_SOURCE}" rule`);
  }
  vercelGlobal = toMap(vercelRule.headers);
  nextGlobal = toMap(nextRule.headers);
});

describe("security-header parity — vercel.json ⇄ next.config.mjs (R-11)", () => {
  it("vercel.json global rule carries every required security header", () => {
    for (const key of REQUIRED_HEADERS) {
      expect(vercelGlobal.has(key), `vercel.json is missing "${key}"`).toBe(true);
    }
  });

  it("next.config.mjs headers() global rule carries every required security header", () => {
    for (const key of REQUIRED_HEADERS) {
      expect(nextGlobal.has(key), `next.config.mjs is missing "${key}"`).toBe(true);
    }
  });

  it("every required header is byte-identical across both sources", () => {
    for (const key of REQUIRED_HEADERS) {
      expect(
        vercelGlobal.get(key),
        `"${key}" differs between vercel.json and next.config.mjs`,
      ).toBe(nextGlobal.get(key));
    }
  });

  it("HSTS pins two years + includeSubDomains and never opts into preload", () => {
    for (const [label, source] of [
      ["vercel.json", vercelGlobal],
      ["next.config.mjs", nextGlobal],
    ] as const) {
      const hsts = mustGet(source, "Strict-Transport-Security");
      expect(hsts, `${label} HSTS value drifted`).toBe(
        "max-age=63072000; includeSubDomains",
      );
      // preload-list submission is irreversible — founder decision, not a
      // routine pass. See GAP_REGISTER R-11.
      expect(hsts, `${label} must not carry the preload token`).not.toMatch(/preload/i);
    }
  });

  it("Permissions-Policy locks camera/mic/geolocation and keeps the Stripe payment allowance", () => {
    for (const [label, source] of [
      ["vercel.json", vercelGlobal],
      ["next.config.mjs", nextGlobal],
    ] as const) {
      const policy = mustGet(source, "Permissions-Policy");
      expect(policy, `${label} must disable camera`).toContain("camera=()");
      expect(policy, `${label} must disable microphone`).toContain("microphone=()");
      expect(policy, `${label} must disable geolocation`).toContain("geolocation=()");
      expect(policy, `${label} must keep the Stripe payment allowance`).toContain(
        'payment=(self "https://js.stripe.com")',
      );
    }
  });

  it("the CSP ships as Report-Only — no enforcing Content-Security-Policy anywhere", () => {
    // Scan EVERY rule in both sources (not just the global one) so an
    // enforcing CSP can't sneak in on a narrower route pattern.
    for (const [label, rules] of [
      ["vercel.json", vercelRules],
      ["next.config.mjs", nextRules],
    ] as const) {
      for (const rule of rules) {
        const enforcing = rule.headers.find(
          (pair) => pair.key === "Content-Security-Policy",
        );
        expect(
          enforcing,
          `${label} rule "${rule.source}" carries an ENFORCING CSP — this pass is Report-Only only`,
        ).toBeUndefined();
      }
    }
  });

  it("the Report-Only CSP covers the Next/Stripe/Google Fonts baseline", () => {
    for (const [label, source] of [
      ["vercel.json", vercelGlobal],
      ["next.config.mjs", nextGlobal],
    ] as const) {
      const csp = mustGet(source, "Content-Security-Policy-Report-Only");
      expect(csp, `${label} CSP must anchor on default-src 'self'`).toMatch(
        /^default-src 'self'; /,
      );
      expect(csp, `${label} CSP must allow Stripe.js scripts`).toContain(
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      );
      expect(csp, `${label} CSP must allow Google Fonts stylesheets`).toContain(
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      );
      expect(csp, `${label} CSP must allow Google Fonts font files`).toContain(
        "font-src 'self' https://fonts.gstatic.com",
      );
      expect(csp, `${label} CSP must block plugins`).toContain("object-src 'none'");
      expect(csp, `${label} CSP must block framing`).toContain("frame-ancestors 'none'");
    }
  });

  it("anti-clickjacking, sniffing, and referrer values stay pinned", () => {
    for (const [label, source] of [
      ["vercel.json", vercelGlobal],
      ["next.config.mjs", nextGlobal],
    ] as const) {
      expect(mustGet(source, "X-Frame-Options"), `${label} X-Frame-Options`).toBe("DENY");
      expect(
        mustGet(source, "X-Content-Type-Options"),
        `${label} X-Content-Type-Options`,
      ).toBe("nosniff");
      expect(mustGet(source, "Referrer-Policy"), `${label} Referrer-Policy`).toBe(
        "strict-origin-when-cross-origin",
      );
    }
  });
});
