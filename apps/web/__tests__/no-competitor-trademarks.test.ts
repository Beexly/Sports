import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { resolve, join, relative } from "node:path";

/**
 * A-1 · Rename tripwire (OMNIBUS)
 *
 * Competitor coinages (FantasyGuru / related): SMASH, BURR, Solds, QB Types.
 * Methods are free; names are not. This test forbids those strings as
 * identifiers or product-metric names inside production code paths.
 *
 * Scope: apps/web/app, apps/web/lib, packages/
 * Allowlist: files whose only job is to ban the phrases, document the
 * rename, or live in reports/design-system (see ALLOWLIST below).
 *
 * Outside-repo deliverables (gse_engine.py, CSVs, methodology docs) are
 * renamed by the founder/ops lane; this test only guards the Sports repo.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");

/** Terms that must not appear as identifiers / product names. */
const FORBIDDEN = [
  { term: "SMASH", re: /\bSMASH\b/ },
  { term: "BURR", re: /\bBURR\b/ },
  { term: "Solds", re: /\bSolds\b/ },
  { term: "QB Types", re: /\bQB\s*Types\b/i },
] as const;

/**
 * Files that legitimately mention the terms (banned-phrase lists,
 * compliance scanners, studio templates that reject the language,
 * design-system docs, reports that record the rename decision).
 * Paths relative to repo root.
 */
const ALLOWLIST = new Set([
  // Banned-phrase / compliance surfaces — keep the terms so the scanners catch them.
  "apps/web/lib/compliance-scanner/rules.ts",
  "apps/web/lib/studio/templates/fantasy-angle.ts",
  "apps/web/lib/studio/templates/betting-education.ts",
  "apps/web/lib/studio/templates/x-thread.ts",
  "apps/web/lib/fantasy/academy.ts",
  // Design-system / brand voice docs that explicitly forbid the terms.
  "design-system/SKILL.md",
  "design-system/README.md",
  "docs/brand/GALAXY_VISUAL_OS_2026.md",
  // Ops / agent reports that discuss the rename requirement.
  "reports/edge-lab/INTEL-RECONCILIATION-2026-07-16.md",
  "reports/agent-handoffs/ACTIVE_AGENT_RELAY.md",
  "docs/ops/evals/studio-fantasy-angle-prop-recommendation-block.md",
  // This test file itself.
  "apps/web/__tests__/no-competitor-trademarks.test.ts",
]);

const SCAN_ROOTS = [
  resolve(repoRoot, "apps/web/app"),
  resolve(repoRoot, "apps/web/lib"),
  resolve(repoRoot, "packages"),
];

const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function walk(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "dist") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (st.isFile()) {
      const ext = name.slice(name.lastIndexOf("."));
      if (CODE_EXT.has(ext)) out.push(full);
    }
  }
}

function isAllowlisted(absPath: string): boolean {
  const rel = relative(repoRoot, absPath).replace(/\\/g, "/");
  return ALLOWLIST.has(rel);
}

describe("A-1 · no competitor trademarks as identifiers", () => {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) walk(root, files);

  it("scan roots contain production source files", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("no forbidden competitor metric names outside allowlist", () => {
    const violations: string[] = [];

    for (const abs of files) {
      if (isAllowlisted(abs)) continue;
      const src = readFileSync(abs, "utf8");
      const rel = relative(repoRoot, abs).replace(/\\/g, "/");

      for (const { term, re } of FORBIDDEN) {
        if (re.test(src)) {
          // Collect line numbers for actionable failure.
          const lines = src.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (re.test(lines[i]!)) {
              violations.push(`${rel}:${i + 1} — contains "${term}"`);
            }
          }
        }
      }
    }

    if (violations.length > 0) {
      throw new Error(
        `A-1 tripwire failed. Competitor coinages found as identifiers:\n` +
          violations.map((v) => `  ${v}`).join("\n") +
          `\n\nRename to GSE-original names before any public surface ships:\n` +
          `  SMASH → Skill-Matchup Index (skillMatchupIndex)\n` +
          `  BURR → Bullpen Rating (bullpenRating)\n` +
          `  Solds → Reliever Value Score (relieverValueScore)\n` +
          `  QB Types → QB Mobility Tier (qbMobilityTier)\n` +
          `If the hit is a legitimate ban-list or report, add the path to ALLOWLIST with a why-comment.`,
      );
    }

    expect(violations).toEqual([]);
  });

  it("allowlist itself is non-empty and documented", () => {
    expect(ALLOWLIST.size).toBeGreaterThan(5);
  });
});
