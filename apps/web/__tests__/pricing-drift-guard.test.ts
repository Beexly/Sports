import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { resolve } from "path";
import { PRICING_PHASES } from "../lib/pricing/pricing-phases";

/**
 * Price-drift guard — ensures hardcoded price strings never appear
 * outside the canonical pricing-phases source of truth.
 *
 * When the pricing phase advances (FOUNDING → PROVEN → ESTABLISHED → AUTHORITY),
 * every price string in the UI must update automatically via getCurrentPricingPhase().
 * This test catches any regression where a price string is hardcoded directly.
 *
 * HOW TO FIX A FAILURE:
 *   Replace the hardcoded string with getCurrentPricingPhase().pro.monthly (etc.)
 *   and the test will pass again automatically at every phase advance.
 */

// Collect every known monthly/annual price across all phases so we know what
// dollar amounts are "live prices" we need to guard against hardcoding.
function allKnownPriceStrings(): Set<string> {
  const prices = new Set<string>();
  for (const phase of PRICING_PHASES) {
    prices.add(`$${phase.pro.monthly}`);
    prices.add(`$${phase.elite.monthly}`);
    prices.add(`$${phase.pro.annual}`);
    prices.add(`$${phase.elite.annual}`);
  }
  return prices;
}

// Files that ARE allowed to contain price literals — the source of truth only.
const ALLOW_LIST = new Set([
  "lib/pricing/pricing-phases.ts",
  "lib/pricing/pricing-phases.js", // compiled output
]);

// Directories to scan for hardcoded prices (relative to apps/web)
const SCAN_DIRS = ["app", "components", "lib"];

// Patterns that mean "this file is explicitly allowed"
function isAllowed(relPath: string): boolean {
  for (const allowed of ALLOW_LIST) {
    if (relPath.endsWith(allowed) || relPath === allowed) return true;
  }
  // Test files are excluded — they may reference prices for assertions.
  if (relPath.includes("__tests__") || relPath.endsWith(".test.ts") || relPath.endsWith(".test.tsx")) {
    return true;
  }
  return false;
}

function scanDir(dir: string, base: string): Array<{ file: string; line: number; text: string }> {
  const hits: Array<{ file: string; line: number; text: string }> = [];

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return hits;
  }

  for (const entry of entries) {
    const fullPath = resolve(dir, entry);
    const relPath = fullPath.replace(base + "/", "");

    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      hits.push(...scanDir(fullPath, base));
    } else if (/\.(ts|tsx|js|jsx|mdx)$/.test(entry) && !isAllowed(relPath)) {
      let content: string;
      try {
        content = readFileSync(fullPath, "utf-8");
      } catch {
        continue;
      }
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        for (const price of knownPrices) {
          // Match a dollar sign immediately followed by the price number as a literal
          const pattern = price.replace("$", "\\$") + "(?!\\.\\w)"; // not part of a longer decimal
          if (new RegExp(pattern).test(line)) {
            hits.push({ file: relPath, line: i + 1, text: line.trim() });
          }
        }
      }
    }
  }
  return hits;
}

const webRoot = resolve(__dirname, "..");
const knownPrices = allKnownPriceStrings();

describe("pricing drift guard", () => {
  it("known price amounts are defined in pricing-phases.ts", () => {
    expect(PRICING_PHASES.length).toBeGreaterThanOrEqual(1);
    expect(PRICING_PHASES[0]!.pro.monthly).toBeGreaterThan(0);
    expect(PRICING_PHASES[0]!.elite.monthly).toBeGreaterThan(0);
  });

  it("no hardcoded price strings outside pricing-phases.ts in app/ and components/", () => {
    const violations: Array<{ file: string; line: number; text: string }> = [];

    for (const dir of SCAN_DIRS) {
      const fullDir = resolve(webRoot, dir);
      violations.push(...scanDir(fullDir, webRoot));
    }

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}:${v.line} → ${v.text}`)
        .join("\n");
      expect.fail(
        `Hardcoded price strings found outside pricing-phases.ts.\n` +
        `Replace them with getCurrentPricingPhase().pro.monthly (etc.):\n${report}`
      );
    }
  });
});
