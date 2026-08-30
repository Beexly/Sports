import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

/**
 * Cockpit pages must use the Next.js <Link> for internal navigation,
 * not bare <a href="/...">. A bare anchor loses client routing + prefetch
 * and forces a full page reload between cockpit views — which throws
 * away the in-memory ring buffer.
 *
 * Allowed: <a href="https://..." or <a href="mailto:...". Internal
 * routes (`/cockpit/...`, `/admin/...`, `/dashboard`, `/picks`,
 * `/performance`, `/brief`, `/promotions`, etc.) must use Link.
 */

const repoRoot = resolve(__dirname, "..");
const COCKPIT_DIR = resolve(repoRoot, "app/cockpit");

function listTsxFiles(dir: string): string[] {
  const acc: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) acc.push(...listTsxFiles(p));
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

const FILES = listTsxFiles(COCKPIT_DIR);

// Match <a href="/internal-route">. The Next.js Link doesn't render as <a;
// it composes one. Catch the literal JSX anchor pointing at an internal
// route.
const INTERNAL_ANCHOR = /<a[^>]+href=["']\/(?!\/)[^"']*["']/;

describe("Cockpit nav uses Next <Link> for internal routes", () => {
  for (const file of FILES) {
    const rel = relative(repoRoot, file);
    it(`${rel} contains no <a href="/..."> for internal routes`, () => {
      const src = readFileSync(file, "utf8");
      const m = src.match(INTERNAL_ANCHOR);
      if (m) {
        throw new Error(
          `${rel} uses a bare anchor for an internal route: ${m[0]}\n` +
            `Use the Next.js Link component instead.`
        );
      }
      expect(true).toBe(true);
    });
  }
});
