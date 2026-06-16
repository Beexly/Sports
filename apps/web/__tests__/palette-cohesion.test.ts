import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

/**
 * Palette cohesion guard.
 *
 * The whole app (cockpit + consumer + admin) was migrated off legacy Tailwind
 * gray/slate onto the Galaxy design tokens (ion / titanium / obsidian / eclipse
 * / carbon). This test stops the gray from creeping back in as new code lands —
 * the same source-scrape discipline the a11y/nav guards use.
 *
 * If you add a genuinely light-themed surface (the `paper` scale) that needs a
 * light gray, add the exact `path -> token` to ALLOWLIST with a one-line reason.
 */

const webRoot = resolve(__dirname, "..");
const SCAN_DIRS = ["app", "components"].map((d) => resolve(webRoot, d));

// Intentional, reviewed exceptions: light-theme elements that legitimately use a
// light gray. Keyed by repo-relative path → set of allowed token strings.
const ALLOWLIST: Record<string, ReadonlySet<string>> = {
  // The Google sign-in button is a white (light) button; its hover is a light gray.
  "app/auth/signin/page.tsx": new Set(["bg-gray-100"]),
};

const STALE = /\b(?:text|bg|border|divide|ring|from|to|via|placeholder)-(?:gray|slate)-\d{2,3}(?:\/\d+)?\b/g;

function listTsx(dir: string): string[] {
  const acc: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) acc.push(...listTsx(p));
    else if (name.endsWith(".tsx")) acc.push(p);
  }
  return acc;
}

const FILES = SCAN_DIRS.flatMap(listTsx);

describe("design-token palette cohesion", () => {
  it("scans a meaningful number of surfaces", () => {
    expect(FILES.length).toBeGreaterThan(100);
  });

  it("uses design tokens, not legacy gray/slate, across app + components", () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const rel = relative(webRoot, file).replace(/\\/g, "/");
      const allowed = ALLOWLIST[rel] ?? new Set<string>();
      const src = readFileSync(file, "utf8");
      for (const match of src.match(STALE) ?? []) {
        if (!allowed.has(match)) offenders.push(`${rel}: ${match}`);
      }
    }
    expect(
      offenders,
      `Legacy gray/slate found — migrate to design tokens (ion/titanium/obsidian/` +
        `eclipse/carbon) or, for a real light-theme surface, add to ALLOWLIST:\n` +
        offenders.join("\n")
    ).toEqual([]);
  });
});
