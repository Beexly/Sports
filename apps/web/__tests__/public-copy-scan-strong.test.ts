import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative, sep } from "node:path";
import { scanForBannedPhrases } from "@/lib/trust-claims";

/**
 * Stronger public-copy banned-phrase scan — generated from the public route manifest.
 *
 * Instead of a hand-maintained list of 12 pages, this walks app/ and scans EVERY public `page.tsx`
 * (excluding non-public segments: admin / cockpit / api). A new public page is therefore covered the
 * moment it's added — no manual upkeep. A small EXEMPT set covers pages that legitimately teach/critique
 * a banned concept (mirroring the trust-gate allowlist). A coverage floor guards against regressions.
 */

const repoRoot = resolve(__dirname, "..");
const APP_DIR = resolve(repoRoot, "app");

// Route segments that are NOT public customer copy.
const NON_PUBLIC_SEGMENTS = new Set(["admin", "cockpit", "api"]);

// Public pages that legitimately reference a banned concept to TEACH or CRITIQUE it (same rationale as
// the trust-gate allowlist). Kept tiny and explicit.
const EXEMPT_PAGES = new Set<string>([
  "app/vs/tout-services/page.tsx", // critiques tout "sharp money" framing
]);

// "lock" has a legitimate TEMPORAL sense on public pages too (the moment a pick/line locks — "at lock
// time", "lock window"). Blank those safe contexts before scanning, exactly as the trust-gate does, so
// the scan stays deny-by-default for promotional "lock" without false-positiving on temporal copy.
const LOCK_SAFE_CONTEXT = /\b(?:at|before|after|by|until|since|the)\s+lock\b|\block\s+(?:time|window)\b|\block\s*(?:→|->)\s*close\b/gi;

function read(p: string): string {
  return readFileSync(resolve(repoRoot, p), "utf8").replace(LOCK_SAFE_CONTEXT, " timestamp ");
}

function listPublicPages(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (NON_PUBLIC_SEGMENTS.has(name)) continue;
      out.push(...listPublicPages(full));
    } else if (name === "page.tsx") {
      out.push(("app/" + relative(APP_DIR, full)).split(sep).join("/"));
    }
  }
  return out;
}

const PUBLIC_PAGES = listPublicPages(APP_DIR).filter((p) => !EXEMPT_PAGES.has(p));

// The original hand-listed floor — coverage must never drop below this.
const COVERAGE_FLOOR = [
  "app/page.tsx",
  "app/pricing/page.tsx",
  "app/edge/page.tsx",
  "app/gameplan/page.tsx",
  "app/learn/page.tsx",
  "app/proof/memory/page.tsx",
];

describe("Strong public-copy scan — generated from the public route manifest", () => {
  it("discovers the full public page set (and never less than the known floor)", () => {
    expect(PUBLIC_PAGES.length).toBeGreaterThanOrEqual(12);
    for (const f of COVERAGE_FLOOR) expect(PUBLIC_PAGES).toContain(f);
  });

  it("excludes non-public surfaces (admin / cockpit / api)", () => {
    for (const f of PUBLIC_PAGES) {
      expect(f.startsWith("app/admin/")).toBe(false);
      expect(f.startsWith("app/cockpit/")).toBe(false);
      expect(f.startsWith("app/api/")).toBe(false);
    }
  });

  for (const file of PUBLIC_PAGES) {
    it(`${file} passes the trust-claim registry banned-phrase scan`, () => {
      const hits = scanForBannedPhrases(read(file));
      if (hits.length > 0) {
        const summary = hits.map((h) => `  line ${h.line}: "${h.phrase}" — ${h.snippet}`).join("\n");
        throw new Error(`${file} contains banned phrases:\n${summary}`);
      }
      expect(hits.length).toBe(0);
    });
  }
});
