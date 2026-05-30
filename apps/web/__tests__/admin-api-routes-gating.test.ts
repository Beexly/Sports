import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

/**
 * /api/admin/* route gating — every admin API route must check the
 * session and return 401 for non-ADMIN callers. This is a source-level
 * contract: if someone accidentally removes the auth check, the test
 * catches it immediately rather than in a security review.
 */

const repoRoot = resolve(__dirname, "..");
const ADMIN_API_DIR = resolve(repoRoot, "app/api/admin");

function listRouteFiles(dir: string): string[] {
  const acc: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) acc.push(...listRouteFiles(p));
    else if (name === "route.ts") acc.push(p);
  }
  return acc;
}

const ROUTES = listRouteFiles(ADMIN_API_DIR);

describe("/api/admin/* routes — auth gating contract", () => {
  it("at least two admin API routes exist", () => {
    expect(ROUTES.length).toBeGreaterThanOrEqual(2);
  });

  for (const file of ROUTES) {
    const rel = relative(repoRoot, file);

    it(`${rel} imports auth()`, () => {
      const src = readFileSync(file, "utf8");
      expect(src).toMatch(/from\s+["']@\/lib\/auth["']/);
      expect(src).toMatch(/await\s+auth\(\)/);
    });

    it(`${rel} checks role !== "ADMIN" and returns 401 or 403`, () => {
      const src = readFileSync(file, "utf8");
      expect(src).toMatch(/role\s*!==\s*["']ADMIN["']/);
      // 401 Unauthorized or 403 Forbidden are both acceptable for access control.
      // 403 is semantically more correct when the user IS authenticated but lacks
      // the required role. Both patterns are in use across admin routes.
      expect(src).toMatch(/status:\s*(401|403)/);
    });

    it(`${rel} uses force-dynamic (never statically cached)`, () => {
      const src = readFileSync(file, "utf8");
      expect(src).toMatch(/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/);
    });

    it(`${rel} does not expose raw error messages from Prisma/DB in the response`, () => {
      const src = readFileSync(file, "utf8");
      // No `error.message` or `err.message` should be returned directly in a JSON response
      // to prevent Prisma/stack-trace leakage.
      expect(src).not.toMatch(/NextResponse\.json\([^)]*\.message/);
      expect(src).not.toMatch(/NextResponse\.json\([^)]*error\.stack/);
    });
  }
});
