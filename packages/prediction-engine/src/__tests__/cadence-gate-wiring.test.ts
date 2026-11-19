import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The coach-sim cadence tests guard the money path: a Tuesday v1.0 lock must advance
 * through injury overlays with coachMindsetHash and tau byte-identical. They were
 * absent from vitest.config.ts's include list, so `npm test` collected nothing from
 * src/coach-sim/** and the guard quietly stopped being a gate.
 *
 * This test fails if the include list loses that glob again, or if the seal test files
 * disappear. A gate that is not executed is not a gate.
 */
const PACKAGE_ROOT = resolve(__dirname, "..", "..");

describe("cadence gate wiring", () => {
  it("collects src/coach-sim tests under the package's default vitest config", () => {
    const configPath = resolve(PACKAGE_ROOT, "vitest.config.ts");
    expect(existsSync(configPath)).toBe(true);
    const config = readFileSync(configPath, "utf8");
    expect(config).toContain("src/coach-sim/**/*.test.ts");
  });

  it("keeps the byte-identical seal tests on disk", () => {
    for (const relative of [
      "src/coach-sim/locked-projection.test.ts",
      "src/coach-sim/weekly-cadence-orchestrator.test.ts",
    ]) {
      expect(existsSync(resolve(PACKAGE_ROOT, relative)), relative).toBe(true);
    }
  });

  it("keeps the locked-projection suite asserting coachMindsetHash byte-identity", () => {
    const source = readFileSync(resolve(PACKAGE_ROOT, "src/coach-sim/locked-projection.test.ts"), "utf8");
    expect(source).toContain("coachMindsetHash");
    expect(source).toMatch(/identical|byte-for-byte|toBe\(/);
  });
});