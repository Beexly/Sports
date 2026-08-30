import { describe, it, expect, afterEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextRequest } from "next/server";

import { middleware } from "@/middleware";

/**
 * apps/web/middleware.ts route-protection contract.
 *
 * The middleware does a cheap cookie check for /dashboard, /admin, and
 * /cockpit routes; full auth + role check still happens at the page level.
 *
 * This file used to assert the contract by grepping middleware.ts's TEXT for
 * tokens like "PROTECTED_ROUTES", the cookie names, and "DEV_FAKE_ADMIN" —
 * proof the tokens exist somewhere in the file, not proof the middleware
 * actually redirects, actually recognizes a cookie, or actually confines the
 * dev bypass to non-production. Invoke the real `middleware()` export with
 * constructed requests instead, and assert on its real response.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "middleware.ts"), "utf8");

afterEach(() => {
  vi.unstubAllEnvs();
});

function reqTo(path: string, opts: { cookie?: string } = {}): NextRequest {
  return new NextRequest(`https://gse.test${path}`, {
    headers: opts.cookie ? { cookie: opts.cookie } : {},
  });
}

function isRedirectToSignin(res: ReturnType<typeof middleware>, callbackPath: string): boolean {
  if (res.status < 300 || res.status >= 400) return false;
  const location = res.headers.get("location");
  if (!location) return false;
  const url = new URL(location);
  return url.pathname === "/auth/signin" && url.searchParams.get("callbackUrl") === callbackPath;
}

describe("middleware route protection", () => {
  it("redirects an unauthenticated request to /dashboard, /admin, and /cockpit to signin", () => {
    for (const path of ["/dashboard", "/admin", "/cockpit"]) {
      const res = middleware(reqTo(path));
      expect(isRedirectToSignin(res, path), `${path} must redirect to signin`).toBe(true);
    }
  });

  it("lets an unauthenticated request to a protected route's sub-path through when it carries a session cookie", () => {
    for (const cookieName of [
      "authjs.session-token",
      "__Secure-authjs.session-token",
      "next-auth.session-token",
      "__Secure-next-auth.session-token",
    ]) {
      const res = middleware(reqTo("/dashboard/settings", { cookie: `${cookieName}=t` }));
      expect(
        isRedirectToSignin(res, "/dashboard/settings"),
        `a ${cookieName} cookie must not be redirected`,
      ).toBe(false);
    }
  });

  it("does not gate unprotected routes at all, cookie or not", () => {
    const noCookie = middleware(reqTo("/pricing"));
    const withCookie = middleware(reqTo("/pricing", { cookie: "authjs.session-token=t" }));
    expect(noCookie.status).not.toBe(307);
    expect(withCookie.status).not.toBe(307);
  });

  it("never redirects /embed, cookie or not", () => {
    // /embed is a real public widget surface: DEC-017's free Edge Index
    // badge. It is not in PROTECTED_ROUTES today, but the middleware also
    // carries an explicit early return for it (defense-in-depth against a
    // future PROTECTED_ROUTES change bouncing it to signin) — assert the
    // outward behavior both mechanisms exist to guarantee.
    for (const cookie of [undefined, "authjs.session-token=t"]) {
      const res = middleware(reqTo("/embed/edge-index/abc123", { cookie }));
      expect(res.status).not.toBe(307);
      expect(res.headers.get("location")).toBeNull();
    }
  });

  it("DEV_FAKE_ADMIN bypasses the cookie redirect outside production, never inside it", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_FAKE_ADMIN", "true");
    const devRes = middleware(reqTo("/admin"));
    expect(isRedirectToSignin(devRes, "/admin"), "dev bypass must skip the redirect").toBe(false);

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_FAKE_ADMIN", "true");
    const prodRes = middleware(reqTo("/admin"));
    expect(
      isRedirectToSignin(prodRes, "/admin"),
      "a stray DEV_FAKE_ADMIN=true in production must NOT bypass the redirect",
    ).toBe(true);
  });

  it("page-level role check is the source of truth (middleware is shallow)", () => {
    // Design-intent documentation, not independently executable — the
    // behavioral half (middleware does ONLY a cookie-presence check, no role
    // lookup) is covered by the tests above never hitting a role check.
    expect(src).toMatch(/role check|page level|page-level/i);
  });
});
