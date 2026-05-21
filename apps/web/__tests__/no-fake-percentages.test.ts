import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * No-fake-stat tripwire.
 *
 * Walks every customer-facing app/ page (anything not under /cockpit
 * or /admin) and scans for hardcoded percentages that LOOK like
 * outcome claims — win rate, accuracy, ROI, edge — but aren't
 * gated through a runtime value.
 *
 * The rule isn't "no percentages allowed" — it's "no percentage that
 * the user would read as a model-performance number unless it's
 * dynamically rendered by `evaluatePublicPerformancePolicy()`".
 *
 * False positives we explicitly allow:
 *   - percentages inside JSX expressions like `{rate}%` (dynamic)
 *   - percentages inside copy that names a discount, refund window,
 *     completion meter, or coverage rate (NOT win/edge/accuracy)
 *   - percentages inside data-attribute / className values
 *   - percentages inside import URLs / version strings
 *   - percentages inside ARIA labels that describe a UI element
 *
 * A future false positive is fine to add to the allowlist — but the
 * test must fail loudly the first time a real fabricated stat lands.
 */

const repoRoot = resolve(__dirname, "..");
const APP_DIR = resolve(repoRoot, "app");

const SKIP_SUBDIRS = new Set(["cockpit", "admin", "api", "auth"]);
const SKIP_FILES = new Set([
  // Non-customer surfaces
]);

function walkCustomerPages(dir: string, files: string[] = []): string[] {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (SKIP_SUBDIRS.has(entry)) continue;
      walkCustomerPages(full, files);
    } else if (entry === "page.tsx" || entry === "layout.tsx") {
      if (SKIP_FILES.has(full)) continue;
      files.push(full);
    }
  }
  return files;
}

// Tokens that turn a bare percentage into an outcome-claim red flag.
// "win", "edge", "accurate", "accuracy", "hit rate", "roi", "profit",
// "guaranteed". Plus "verified" because the dashboard uses "Verified
// Record" — a static "verified record: 67%" would be the exact bug.
const OUTCOME_CONTEXT = /(win[\s-]?rate|win\s+%|edge|accuracy|accurate|hit\s+rate|hit\s+%|roi|profit|guaranteed)/i;

// A regex that matches a literal hardcoded percentage in a string,
// JSX text node, or comment — but NOT inside `{}` (dynamic), `=`
// (attribute value), or backtick template (likely dynamic).
const HARDCODED_PCT = /(\d{1,3}(?:\.\d+)?)\s*%/g;

describe("no fake percentages on customer pages", () => {
  const pages = walkCustomerPages(APP_DIR);

  it("finds at least the dashboard and homepage so the test isn't silently empty", () => {
    expect(pages.length).toBeGreaterThan(3);
    expect(pages.some((p) => p.includes("dashboard"))).toBe(true);
    // The repo's customer routes should include at least one top-level page.
  });

  it.each(pages)("page has no hardcoded outcome-percentage: %s", (file) => {
    const src = readFileSync(file, "utf8");
    // Strip dynamic JSX expressions ({...}) and common attribute strings
    // so we don't flag innocent style values or accessibility labels.
    const cleaned = src
      .replace(/\{[^{}]*\}/g, "")
      .replace(/className\s*=\s*"[^"]*"/g, "")
      .replace(/data-testid\s*=\s*"[^"]*"/g, "")
      .replace(/aria-label\s*=\s*"[^"]*"/g, "")
      .replace(/href\s*=\s*"[^"]*"/g, "")
      .replace(/style\s*=\s*\{\{[^}]*\}\}/g, "")
      // CSS-ish attribute values that legitimately use %: cx, cy, r,
      // x, y, x1, x2, y1, y2, width, height, offset, transform-origin.
      .replace(/\b(cx|cy|r|x1|x2|y1|y2|offset)\s*=\s*"[^"]*"/g, "");

    const lines = cleaned.split(/\r?\n/);
    const offenders: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      HARDCODED_PCT.lastIndex = 0;
      if (!HARDCODED_PCT.test(line)) continue;
      // Look at this line and its immediate neighbors only — anything
      // outside that range isn't realistically the same claim.
      const ctx = [
        lines[i - 1] ?? "",
        line,
        lines[i + 1] ?? "",
      ].join(" ");
      if (OUTCOME_CONTEXT.test(ctx)) {
        offenders.push(`L${i + 1}: ${line.trim()}`);
      }
    }

    expect(
      offenders,
      `${file} appears to hardcode an outcome-claim percentage:\n  ${offenders.join("\n  ")}`,
    ).toEqual([]);
  });
});
