import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Pin: every DB call in jarvis-data.ts lives inside the
 * `loadJarvisAssessment` async function. Module-level DB pulls would
 * crash on import in stub mode AND would run on every request even
 * when the page never actually renders the cockpit (e.g. during a
 * health probe).
 *
 * Source-level heuristic: a `db.<model>.<method>(` invocation must be
 * preceded somewhere upstream by `export async function loadJarvisAssessment`.
 * The simplest way to assert that: find the load function's open brace
 * and ensure every db call is below it.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "lib/cockpit/jarvis-data.ts"), "utf8");

describe("jarvis-data.ts — runtime-only DB access", () => {
  it("exports loadJarvisAssessment as the only entry point for queries", () => {
    expect(src).toMatch(/export\s+async\s+function\s+loadJarvisAssessment/);
  });

  it("every db.* invocation occurs inside loadJarvisAssessment (no module-level pulls)", () => {
    const m = src.match(/export\s+async\s+function\s+loadJarvisAssessment/);
    expect(m, "Couldn't locate loadJarvisAssessment").toBeTruthy();
    const fnIdx = m!.index ?? 0;
    // Find every db.<...>.<call>( call and ensure its position is after fnIdx.
    const calls = Array.from(src.matchAll(/db\.\w+\.\w+\s*\(/g));
    for (const c of calls) {
      expect(
        (c.index ?? 0) > fnIdx,
        `db.* call appears before loadJarvisAssessment: "${c[0]}" at offset ${c.index}.`
      ).toBe(true);
    }
  });

  it("isStubMode is read at runtime (after loader entry), not module load", () => {
    const fnIdx = src.indexOf("export async function loadJarvisAssessment");
    const stubIdx = src.indexOf("isStubMode()");
    // Either the call is inside the function (after fnIdx) or it's in a
    // helper that's also called from inside the function. The cheap
    // check: stubIdx must exist and must be > fnIdx.
    expect(stubIdx).toBeGreaterThan(-1);
    expect(stubIdx).toBeGreaterThan(fnIdx);
  });
});
