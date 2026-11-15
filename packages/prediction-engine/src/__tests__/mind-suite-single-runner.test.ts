import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * One runner per suite.
 *
 * The MIND falsification suite is a node:test file, and it sits inside a path
 * the package's vitest include pattern also matches (the reasoning spec glob).
 * For a while both runners claimed it: vitest collected it, and the CI step
 * that runs it under `node --test` died on load because the file imported
 * vitest. This pins the split so it cannot come back: the file speaks
 * node:test, vitest refuses to collect it, and CI still executes it.
 */

const PKG = resolve(__dirname, "..", "..");
const SPEC = "src/reasoning/__tests__/mind-reasoning.mutation-v2.spec.ts";
const CONFIG = resolve(PKG, "vitest.config.ts");
const CI = resolve(PKG, "..", "..", ".github", "workflows", "ci.yml");

describe("MIND falsification suite runs under node:test and nowhere else", () => {
  it("imports node:test, not vitest", () => {
    const src = readFileSync(resolve(PKG, SPEC), "utf8");
    expect(src).toMatch(/import \{[^}]*\} from "node:test";/);
    expect(src).not.toMatch(/from "vitest"/);
  });

  it("is excluded from the package vitest config, which still excludes node_modules", () => {
    const cfg = readFileSync(CONFIG, "utf8");
    expect(cfg).toContain('"src/reasoning/__tests__/mind-reasoning.mutation-v2.spec.ts"');
    expect(cfg).toContain("**/node_modules/**");
  });

  it("is still executed by CI", () => {
    const ci = readFileSync(CI, "utf8");
    expect(ci).toContain(`packages/prediction-engine/${SPEC}`);
    expect(ci).toMatch(/node --import tsx --test packages\/prediction-engine\/src\/reasoning/);
  });
});