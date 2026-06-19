import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * /today (Mission Control) auth-gate invariant — source-level.
 *
 * /today is a personalized surface. It must be protected at BOTH layers:
 *   - middleware (cookie-presence redirect) — see middleware.ts PROTECTED_ROUTES, and
 *   - the page itself (a real auth() check) so a forged/stale cookie that slips past the
 *     lightweight middleware check can never render Mission Control to an unauthenticated
 *     user. This test pins the page-level guard so it can't silently regress.
 *
 * (Source-level assertion, mirroring the repo's other guard tests — no browser/DB needed.)
 */
const page = readFileSync(
  resolve(__dirname, "..", "app", "today", "page.tsx"),
  "utf8",
);

describe("/today — page-level auth gate (defense in depth)", () => {
  it("imports auth() from the app auth module", () => {
    expect(page).toMatch(/import\s*\{\s*auth\s*\}\s*from\s*["']@\/lib\/auth["']/);
  });

  it("is an async server component that awaits auth()", () => {
    expect(page).toMatch(/export default async function TodayPage/);
    expect(page).toMatch(/await auth\(\)/);
  });

  it("redirects unauthenticated visitors to sign-in with a return path to /today", () => {
    expect(page).toMatch(/import\s*\{\s*redirect\s*\}\s*from\s*["']next\/navigation["']/);
    expect(page).toMatch(/if\s*\(\s*!session\?\.user\?\.id\s*\)/);
    expect(page).toContain("/auth/signin?callbackUrl=/today");
  });

  it("is force-dynamic (auth() reads cookies — must not be statically rendered)", () => {
    expect(page).toMatch(/export const dynamic\s*=\s*["']force-dynamic["']/);
  });
});
