import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..", "..", "..");
const rootPkg = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));

describe("Node engine pin", () => {
  it("root package.json declares node >= 20", () => {
    expect(rootPkg.engines?.node).toBeDefined();
    expect(rootPkg.engines.node).toMatch(/>=\s*20/);
  });

  it("root package.json declares npm >= 10", () => {
    expect(rootPkg.engines?.npm).toBeDefined();
    expect(rootPkg.engines.npm).toMatch(/>=\s*10/);
  });

  it("CI workflow uses Node 20 (matches engines pin)", () => {
    const ci = readFileSync(resolve(repoRoot, ".github/workflows/ci.yml"), "utf8");
    // The setup-node action's node-version field must be "20" everywhere.
    const matches = Array.from(ci.matchAll(/node-version:\s*["']([^"']+)["']/g));
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      expect(
        m[1],
        `CI uses Node ${m[1]} — pin all setup-node steps to "20" to match engines.`
      ).toBe("20");
    }
  });
});
