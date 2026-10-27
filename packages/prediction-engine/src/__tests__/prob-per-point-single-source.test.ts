import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The points-to-win-probability slope must be declared exactly once.
 *
 * Goal: a bare 0.033 literal must not appear in executable code anywhere in the
 * prediction-engine package except its single definition in `constants.ts`.
 * A second copy is how the HFA prior and the injury overlay drifted apart
 * before: same number, two owners, one silent retune away from disagreeing.
 *
 * Scope decisions, so this guard stays honest rather than noisy:
 *   - `*.test.ts` is excluded: a test asserting the canonical value
 *     (`expect(PROB_PER_POINT).toBe(0.033)`) is checking the binding, not
 *     duplicating it.
 *   - Comments are stripped first. Prose that mentions "~0.033 per point" while
 *     explaining the slope is documentation, not a second source of truth.
 *   - Exact 0.033 only, with a word boundary. `0.0331` (the Gaussian-CDF
 *     approximation in two experimental/markets modules) and `0.033708…` (a
 *     per-family edge coefficient in live-edge-registry) are genuinely different
 *     quantities and must NOT be caught — conflating them would be worse than
 *     the defect this test prevents.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, "..");
const CONSTANTS = resolve(SRC, "constants.ts");

function walkTs(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      walkTs(full, out);
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

/** Remove block and line comments so documentation prose is not policed. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

describe("PROB_PER_POINT has a single source of truth", () => {
  it("no bare 0.033 literal appears in executable code outside constants.ts", () => {
    const offenders: string[] = [];
    // Exact 0.033 with boundaries; 0.0331 and 0.0337… must not match.
    const BARE = /(?<![\d.])0\.033(?![\d])/;

    for (const file of walkTs(SRC)) {
      if (file === CONSTANTS) continue;
      const code = stripComments(readFileSync(file, "utf8"));
      if (BARE.test(code)) {
        const line = code.split("\n").findIndex((l) => BARE.test(l)) + 1;
        offenders.push(`${relative(SRC, file)}:${line}`);
      }
    }

    expect(
      offenders,
      offenders.length
        ? `Bare 0.033 literal(s) found outside constants.ts — import PROB_PER_POINT instead:\n  ${offenders.join("\n  ")}`
        : undefined,
    ).toEqual([]);
  });

  it("constants.ts defines PROB_PER_POINT exactly once and exports it", () => {
    const source = readFileSync(CONSTANTS, "utf8");
    const declarations = source.match(/export const PROB_PER_POINT\s*=/g) ?? [];
    expect(declarations).toHaveLength(1);
    expect(source).toMatch(/export const PROB_PER_POINT\s*=\s*0\.033\b/);
  });
});
