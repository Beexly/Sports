import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

/**
 * Adversarial contract: client components must not import server-only modules.
 *
 * Next.js App Router enforces a strict server/client boundary. If a "use client"
 * component imports @sports/db, @/lib/auth, or other server-only modules, the
 * build may succeed locally (Next.js often tree-shakes) but the runtime behavior
 * is undefined — the Prisma client can't run in the browser, and auth() makes
 * DB calls that would fail or leak session data.
 *
 * This test catches the violation at source level before build time.
 */

const repoRoot = resolve(__dirname, "..");

const SERVER_ONLY_PATTERNS = [
  /@sports\/db/,
  /from\s+["']@\/lib\/auth["']/,
  /from\s+["']@\/lib\/stripe["']/,  // Stripe secret key access
  /from\s+["']@sports\/prediction-engine["']/,  // can import server-only internals
];

function findTsxFiles(dir: string): string[] {
  const acc: string[] = [];
  try {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const s = statSync(p);
      if (s.isDirectory()) acc.push(...findTsxFiles(p));
      else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
    }
  } catch {
    // directory doesn't exist
  }
  return acc;
}

function isClientComponent(src: string): boolean {
  // Must be the very first non-comment non-whitespace directive
  return /^\s*["']use client["']\s*;?\s*\n/.test(src) || src.startsWith('"use client"') || src.startsWith("'use client'");
}

const SEARCH_DIRS = [
  resolve(repoRoot, "app"),
  resolve(repoRoot, "components"),
];

const allTsxFiles = SEARCH_DIRS.flatMap(findTsxFiles);
const clientComponents = allTsxFiles.filter((f) => {
  try {
    return isClientComponent(readFileSync(f, "utf8"));
  } catch {
    return false;
  }
});

describe("client/server boundary — no server-only imports in client components", () => {
  it("at least one client component exists (sanity)", () => {
    expect(clientComponents.length).toBeGreaterThan(0);
  });

  for (const file of clientComponents) {
    const rel = relative(repoRoot, file);
    it(`${rel} does not import server-only modules`, () => {
      const src = readFileSync(file, "utf8");
      for (const pattern of SERVER_ONLY_PATTERNS) {
        expect(
          src,
          `Client component ${rel} must not import server-only module matching ${pattern}`
        ).not.toMatch(pattern);
      }
    });
  }
});
