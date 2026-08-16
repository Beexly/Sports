import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import nextConfig from "../next.config.mjs";

/**
 * next.config.mjs policy.
 *
 * Pins the security-relevant configuration that lives in the Next.js
 * build config. The goal: catch a future refactor that silently
 * relaxes a header or exposes a secret env at build time.
 *
 * The framing checks used to grep the file's TEXT for the tokens
 * "X-Frame-Options", "DENY", "frame-ancestors *", and "/embed/:path*"
 * independently — proof every token appears SOMEWHERE, not proof of what
 * a concrete route actually receives. next.config.mjs relies on two
 * `source` patterns being mutually exclusive (DENY on "everything except
 * /embed", `frame-ancestors *` on "/embed"); a regression that re-widened
 * either source to overlap the other would leave every token grep green
 * while shipping DENY and `frame-ancestors *` on the same response (or
 * neither). Resolve the real `headers()` export instead — the same data
 * Next.js itself matches requests against — and assert what each
 * concrete path actually gets.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "next.config.mjs"), "utf8");

type HeaderEntry = { key: string; value: string };
type HeaderRule = { source: string; headers: HeaderEntry[] };

function sourceToRegex(source: string): RegExp {
  // Mirrors the two `source` shapes this config actually uses: ":name*"
  // wildcard tails, and pre-built regex groups (negative lookaheads) that
  // pass through unchanged — same approach used to resolve vercel.json's
  // header rules against real paths.
  return new RegExp(`^${source.replace(/\/:\w+\*/g, "(?:/.*)?")}$`);
}

async function headersFor(path: string): Promise<Record<string, string[]>> {
  const rules = (await nextConfig.headers?.()) as HeaderRule[] | undefined;
  const matched = (rules ?? []).filter((rule) => sourceToRegex(rule.source).test(path));
  const out: Record<string, string[]> = {};
  for (const rule of matched) {
    for (const h of rule.headers) {
      const key = h.key.toLowerCase();
      (out[key] ??= []).push(h.value);
    }
  }
  return out;
}

describe("next.config.mjs — security policy", () => {
  it("does not explicitly disable React strict mode", () => {
    // Allowed: not setting reactStrictMode at all (Next.js defaults to true on dev).
    // Disallowed: `reactStrictMode: false`.
    expect(src).not.toMatch(/reactStrictMode\s*:\s*false/);
  });

  it("denies framing (X-Frame-Options DENY) on non-embed routes, with no conflicting frame-ancestors *", async () => {
    for (const path of ["/", "/dashboard", "/pricing"]) {
      const headers = await headersFor(path);
      expect(headers["x-frame-options"], `${path} must deny framing`).toEqual(["DENY"]);
      const csp = headers["content-security-policy"] ?? [];
      expect(
        csp.some((v) => v.includes("frame-ancestors *")),
        `${path} must not also receive frame-ancestors *`,
      ).toBe(false);
    }
  });

  it("allows free embed iframes via frame-ancestors on /embed, and does not also send DENY", async () => {
    for (const path of ["/embed", "/embed/edge-index/abc123"]) {
      const headers = await headersFor(path);
      const csp = headers["content-security-policy"] ?? [];
      expect(
        csp.some((v) => v.includes("frame-ancestors *")),
        `${path} must receive frame-ancestors *`,
      ).toBe(true);
      expect(headers["x-frame-options"] ?? [], `${path} must not also receive X-Frame-Options`).toEqual([]);
    }
  });

  it("emits the X-Content-Type-Options nosniff header on every route", () => {
    expect(src).toMatch(/X-Content-Type-Options[\s\S]*nosniff/);
  });

  it("emits the Referrer-Policy strict-origin-when-cross-origin header", () => {
    expect(src).toMatch(/Referrer-Policy[\s\S]*strict-origin-when-cross-origin/);
  });

  it("forces HTTPS via a long-lived Strict-Transport-Security header", () => {
    expect(src).toMatch(/Strict-Transport-Security[\s\S]*max-age=63072000/);
  });

  it("locks down camera/microphone/geolocation via Permissions-Policy", () => {
    expect(src).toMatch(/Permissions-Policy/);
    expect(src).toMatch(/camera=\(\)/);
    expect(src).toMatch(/microphone=\(\)/);
    expect(src).toMatch(/geolocation=\(\)/);
  });

  it("does not expose secrets via the `env` config object", () => {
    // Next.js inlines anything under the top-level `env: {...}` into the
    // browser bundle. Any secret key (STRIPE_SECRET_*, *_SECRET, etc.)
    // appearing under env: would leak. Look for explicit risky names.
    const envBlock = src.match(/\benv\s*:\s*\{([^}]+)\}/);
    if (envBlock) {
      expect(envBlock[1]).not.toMatch(/STRIPE_SECRET|_SECRET|_PASSWORD|API_KEY/);
    }
    // Independent check: no `publicRuntimeConfig` exposing secrets.
    const pubRuntime = src.match(/publicRuntimeConfig\s*:\s*\{([^}]+)\}/);
    if (pubRuntime) {
      expect(pubRuntime[1]).not.toMatch(/STRIPE_SECRET|_SECRET|_PASSWORD|API_KEY/);
    }
  });

  it("image domains are explicitly allow-listed (not wildcarded)", () => {
    // We allow GitHub avatars + Google profile photos. Any unrelated
    // wildcard or non-https domain would be a leak vector.
    const m = src.match(/domains:\s*\[([^\]]+)\]/);
    if (m) {
      expect(m[1]).not.toMatch(/\*/);
    }
  });

  it("bundles local FABLE docs for the public evidence route", () => {
    expect(src).toContain('"/fable"');
    expect(src).toContain('"../../docs/fable/**/*"');
  });

  // Helpers for production-CSP assertions: next.config.mjs reads NODE_ENV at
  // import time, so we must re-import with NODE_ENV=production to observe the
  // header string Next.js itself will emit under a production build.
  async function prodRules(): Promise<HeaderRule[]> {
    vi.resetModules();
    // Stash NODE_ENV so the rest of the suite is unaffected.
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const mod = (await import("../next.config.mjs")) as {
        default: { headers?: () => Promise<HeaderRule[]> };
      };
      const rules = (await mod.default.headers?.()) as HeaderRule[] | undefined;
      return rules ?? [];
    } finally {
      process.env.NODE_ENV = prev;
    }
  }
  function cspForNonEmbed(rules: HeaderRule[]): string | undefined {
    return rules
      .filter((r) => r.source.includes("?!")) // non-embed rule carries the real CSP
      .flatMap((r) => r.headers)
      .find((h) => h.key.toLowerCase() === "content-security-policy")?.value;
  }

  it("production CSP forbids 'unsafe-eval' (dev-source-map only)", async () => {
    // The production bundle has zero eval/new Function calls; keeping
    // unsafe-eval in prod CSP widens the eval gadget surface for nothing.
    const csp = cspForNonEmbed(await prodRules());
    expect(csp).toBeDefined();
    expect(csp!, `${csp} must not include unsafe-eval`).not.toContain("unsafe-eval");
  });

  it("production CSP allows Sentry ingest endpoints in connect-src", async () => {
    const csp = cspForNonEmbed(await prodRules());
    expect(csp).toBeDefined();
    expect(csp!).toContain("*.ingest.sentry.io");
    expect(csp!).toContain("*.ingest.us.sentry.io");
  });

  it("production CSP allows the Cloudflare Insights beacon script in script-src", async () => {
    const csp = cspForNonEmbed(await prodRules());
    expect(csp).toBeDefined();
    expect(csp!).toContain("https://static.cloudflareinsights.com");
  });

  it("does not advertise framework identity (poweredByHeader off)", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
