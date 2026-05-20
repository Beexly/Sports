import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Pin the loader's return shape.
 *
 * /api/cockpit/jarvis, the /cockpit page, and the /cockpit/jarvis/trend
 * page all destructure the same shape from loadJarvisAssessment(). If
 * the loader's return key changes, every consumer breaks silently.
 */

const repoRoot = resolve(__dirname, "..");

function read(p: string): string {
  return readFileSync(resolve(repoRoot, p), "utf8");
}

const LOADER = read("lib/cockpit/jarvis-data.ts");

describe("loadJarvisAssessment return shape", () => {
  it("declares the canonical return type with assessment + performancePolicy", () => {
    expect(LOADER).toMatch(/loadJarvisAssessment\(\)[\s\S]*Promise<\s*\{[\s\S]*assessment:\s*JarvisAssessment;[\s\S]*performancePolicy:\s*PublicPerformancePolicy;[\s\S]*\}/);
  });

  it("returns those exact keys at the bottom of the function", () => {
    // The function ends with `return { assessment: synth, performancePolicy };`
    expect(LOADER).toMatch(/return\s*\{[\s\S]*assessment\s*:[\s\S]*performancePolicy[\s\S]*\}/);
  });

  it("every consumer destructures the same keys", () => {
    const consumers = [
      "app/cockpit/page.tsx",
      "app/api/cockpit/jarvis/route.ts",
      "app/api/cockpit/jarvis/trend/route.ts",
      "app/cockpit/jarvis/trend/page.tsx",
    ];
    for (const c of consumers) {
      let src: string;
      try {
        src = read(c);
      } catch {
        continue;
      }
      // Must reference loadJarvisAssessment and either destructure .assessment
      // or read .assessment.
      expect(
        src.includes("loadJarvisAssessment"),
        `${c}: must reference loadJarvisAssessment`
      ).toBe(true);
      expect(
        /assessment\s*[,}]/.test(src) || /\.assessment\b/.test(src) || /assessment:\s*\w/.test(src),
        `${c}: must consume the .assessment key from the loader's return`
      ).toBe(true);
    }
  });
});
