import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * Every public route should carry its own SEO metadata. Internal/operator
 * surfaces and the homepage (which intentionally inherits the root layout
 * metadata, canonical "/") are exempt. This guards against a new public page
 * shipping with only the generic default.
 */
const repoRoot = resolve(__dirname, "..", "..", "..");
const appDir = resolve(repoRoot, "apps/web/app");
const HOMEPAGE = resolve(appDir, "page.tsx");
const EXEMPT = [/\/cockpit\//, /\/admin(\/|$)/, /\/dashboard\//, /\/auth\//];

function findPageFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...findPageFiles(full));
    else if (entry === "page.tsx") out.push(full);
  }
  return out;
}

const publicPages = findPageFiles(appDir).filter(
  (f) => f !== HOMEPAGE && !EXEMPT.some((re) => re.test(f.replace(/\\/g, "/")))
);

describe("public route metadata coverage", () => {
  it("discovers the public page set", () => {
    expect(publicPages.length).toBeGreaterThan(10);
  });

  it("every public page exports metadata or generateMetadata", () => {
    const missing = publicPages
      .filter((f) => !/export\s+const\s+metadata|generateMetadata/.test(readFileSync(f, "utf8")))
      .map((f) => f.replace(repoRoot + "/", ""));
    expect(missing, `pages missing metadata:\n${missing.join("\n")}`).toEqual([]);
  });

  it("promotions and brief expose title, description, and canonical", () => {
    for (const rel of [
      "apps/web/app/promotions/page.tsx",
      "apps/web/app/brief/page.tsx",
    ]) {
      const src = readFileSync(resolve(repoRoot, rel), "utf8");
      expect(src, `${rel} title`).toMatch(/title:/);
      expect(src, `${rel} description`).toMatch(/description:/);
      expect(src, `${rel} canonical`).toMatch(/canonical:/);
    }
  });
});
