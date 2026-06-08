import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Structural guard: every /admin page and the layout must contain an auth
 * check. The layout provides defense-in-depth; individual pages are still
 * required to self-check so the invariant holds even if the layout is
 * refactored or bypassed (e.g., Next.js parallel routes or a future RSC
 * composition change).
 *
 * This test fails loudly when a developer adds an admin page without
 * copying the auth pattern, making the oversight impossible to miss in CI.
 */

const ADMIN_DIR = join(process.cwd(), "app", "admin");

function collectPageFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectPageFiles(full));
    } else if (entry === "page.tsx" || entry === "layout.tsx") {
      results.push(full);
    }
  }
  return results;
}

function hasAuthCheck(filePath: string): boolean {
  const content = readFileSync(filePath, "utf-8");
  return (
    content.includes("auth()") &&
    (content.includes("redirect(") || content.includes("notFound()"))
  );
}

describe("admin route auth coverage", () => {
  it("admin layout has an auth guard", () => {
    const layoutPath = join(ADMIN_DIR, "layout.tsx");
    expect(hasAuthCheck(layoutPath), `${layoutPath} must call auth() + redirect()`).toBe(true);
  });

  it("every admin page.tsx has its own auth guard (defense-in-depth)", () => {
    const pageFiles = collectPageFiles(ADMIN_DIR).filter((f) => f.endsWith("page.tsx"));
    const missing: string[] = [];
    for (const f of pageFiles) {
      if (!hasAuthCheck(f)) missing.push(f.replace(process.cwd() + "/", ""));
    }
    expect(
      missing,
      `Pages missing auth(): ${missing.join(", ")}\nEach page must call auth() and redirect() so removing the layout guard can never silently expose admin routes.`
    ).toEqual([]);
  });

  it("no admin page calls redirect('/') without checking role (ADMIN only)", () => {
    const pageFiles = collectPageFiles(ADMIN_DIR).filter((f) => f.endsWith("page.tsx"));
    const weakGuard: string[] = [];
    for (const f of pageFiles) {
      const content = readFileSync(f, "utf-8");
      if (content.includes("auth()") && !content.includes('role !== "ADMIN"') && !content.includes("role === \"ADMIN\"")) {
        weakGuard.push(f.replace(process.cwd() + "/", ""));
      }
    }
    expect(weakGuard, `Pages with auth() but no role check: ${weakGuard.join(", ")}`).toEqual([]);
  });
});
