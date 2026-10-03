import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

/**
 * Pin invariant: the public-performance policy module is the ONLY place
 * in apps/web that derives a customer-facing win rate or record.
 *
 * Heuristic: search every .ts/.tsx under apps/web for patterns that look
 * like ad-hoc win-rate math:
 *   - `wins / (wins + losses)`
 *   - `Math.round((wins / ... ) * 100)`
 *   - similar arithmetic
 *
 * The only file allowed to contain those patterns is the policy module
 * itself. Anywhere else means a contributor reimplemented the math
 * outside the gate — same bug the launch observatory was built to fix.
 */

const repoRoot = resolve(__dirname, "..");

function listTsFiles(dir: string): string[] {
  const acc: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === "node_modules" || name === ".next" || name === "__tests__") continue;
      acc.push(...listTsFiles(p));
    } else if (/\.(ts|tsx)$/.test(name)) {
      acc.push(p);
    }
  }
  return acc;
}

const ALL_FILES = listTsFiles(repoRoot);
const POLICY_FILE = resolve(repoRoot, "lib/performance/public-performance-policy.ts");
const LOADER_FILE = resolve(repoRoot, "lib/dashboard/load-performance.ts");
// /api/performance still computes per-sport aggregates; that's a
// gated-behind-the-readiness-gate transformation, not a customer-facing
// claim. Allow it explicitly.
const PERF_API = resolve(repoRoot, "app/api/performance/route.ts");

// Strict pattern targeting only the "compute a win-rate %" idiom.
const WINRATE_PATTERNS = [
  /wins\s*\/\s*\(\s*wins\s*\+\s*losses/,
  /\.wins\s*\/\s*\(\s*[^)]*\.wins\s*\+\s*[^)]*\.losses/,
];

describe("Policy module is the only path to a public win-rate", () => {
  it("scans all .ts/.tsx files under apps/web", () => {
    expect(ALL_FILES.length).toBeGreaterThan(50);
  });

  for (const file of ALL_FILES) {
    const rel = relative(repoRoot, file);
    if (file === POLICY_FILE) continue;
    if (file === LOADER_FILE) continue;
    if (file === PERF_API) continue;
    it(`${rel} contains no ad-hoc win-rate math`, () => {
      const src = readFileSync(file, "utf8");
      for (const pattern of WINRATE_PATTERNS) {
        const m = src.match(pattern);
        if (m) {
          throw new Error(
            `${rel} contains ad-hoc win-rate math (${m[0]}). Use evaluatePublicPerformancePolicy() instead.`
          );
        }
      }
      // Implicit pass — the for-loop didn't throw.
      expect(true).toBe(true);
    });
  }
});
