import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

/**
 * Adversarial contract: every route.ts under /api/cockpit/** and
 * /api/admin/** must call auth() and perform a role/session check.
 *
 * This test exists to catch new routes added without auth guards.
 * The pattern we enforce: import { auth } from "@/lib/auth" must be
 * present, and the file must reference session?.user or requireAdmin.
 */

const repoRoot = resolve(__dirname, "..");

function findRouteFiles(dir: string): string[] {
  const acc: string[] = [];
  try {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const s = statSync(p);
      if (s.isDirectory()) acc.push(...findRouteFiles(p));
      else if (name === "route.ts") acc.push(p);
    }
  } catch {
    // directory doesn't exist — not an error
  }
  return acc;
}

const COCKPIT_ROUTES = findRouteFiles(resolve(repoRoot, "app/api/cockpit"));
const ADMIN_ROUTES = findRouteFiles(resolve(repoRoot, "app/api/admin"));

describe("/api/cockpit/** routes — auth gating contract", () => {
  it("at least one cockpit API route file exists", () => {
    expect(COCKPIT_ROUTES.length).toBeGreaterThanOrEqual(1);
  });

  for (const file of COCKPIT_ROUTES) {
    const rel = relative(repoRoot, file);
    it(`${rel} imports auth and enforces admin session`, () => {
      const src = readFileSync(file, "utf8");
      expect(src, `${rel} must import auth from @/lib/auth`).toMatch(
        /from\s+["']@\/lib\/auth["']/
      );
      // Must either use a requireAdmin helper or check session directly
      const hasRequireAdmin = /requireAdmin\s*\(/.test(src);
      const hasSessionCheck = /session\?\.user/.test(src) || /session\.user/.test(src);
      expect(
        hasRequireAdmin || hasSessionCheck,
        `${rel} must call requireAdmin() or check session?.user`
      ).toBe(true);
      // Must return 401/403 or redirect on failure
      const hasAuthFailureResponse =
        /status:\s*(401|403)/.test(src) ||
        /redirect\(/.test(src) ||
        /requireAdmin/.test(src);
      expect(
        hasAuthFailureResponse,
        `${rel} must return 401/403 or redirect when auth fails`
      ).toBe(true);
    });
  }
});

describe("/api/admin/** routes — auth gating contract", () => {
  it("at least one admin API route file exists", () => {
    expect(ADMIN_ROUTES.length).toBeGreaterThanOrEqual(1);
  });

  for (const file of ADMIN_ROUTES) {
    const rel = relative(repoRoot, file);
    it(`${rel} imports auth and enforces admin session`, () => {
      const src = readFileSync(file, "utf8");
      expect(src, `${rel} must import auth from @/lib/auth`).toMatch(
        /from\s+["']@\/lib\/auth["']/
      );
      const hasSessionCheck = /session\?\.user/.test(src) || /session\.user/.test(src);
      expect(hasSessionCheck, `${rel} must check session?.user`).toBe(true);
      const hasAuthFailure =
        /status:\s*(401|403)/.test(src) ||
        /redirect\(/.test(src) ||
        /role\s*!==\s*["']ADMIN["']/.test(src);
      expect(hasAuthFailure, `${rel} must enforce ADMIN role`).toBe(true);
    });
  }
});
