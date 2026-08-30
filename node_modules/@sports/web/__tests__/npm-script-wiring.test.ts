import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Pin: the root package.json delegates to apps/web/package.json scripts
 * that actually exist. A typo in the delegation breaks the operator
 * recipe silently (`npm run test:fast` exits 0 but does nothing).
 */

const repoRoot = resolve(__dirname, "..", "..", "..");
const rootPkg = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
const webPkg = JSON.parse(readFileSync(resolve(repoRoot, "apps/web/package.json"), "utf8"));

const rootScripts: Record<string, string> = rootPkg.scripts ?? {};
const webScripts: Record<string, string> = webPkg.scripts ?? {};

describe("npm script wiring (root → apps/web)", () => {
  const DELEGATIONS: Array<readonly [string, string]> = [
    ["test:brand-safety", "test:brand-safety"],
    ["test:cockpit", "test:cockpit"],
  ];

  for (const [rootKey, webKey] of DELEGATIONS) {
    it(`root "${rootKey}" delegates to apps/web "${webKey}" which exists`, () => {
      expect(rootScripts[rootKey], `root script ${rootKey} missing`).toBeDefined();
      expect(rootScripts[rootKey]).toMatch(
        new RegExp(`npm run ${webKey} --workspace=apps/web`)
      );
      expect(webScripts[webKey], `apps/web script ${webKey} missing`).toBeDefined();
    });
  }

  it("test:fast wraps brand-safety + cockpit", () => {
    expect(rootScripts["test:fast"]).toMatch(/test:brand-safety/);
    expect(rootScripts["test:fast"]).toMatch(/test:cockpit/);
  });

  it("smoke:launch-night points at the script that exists on disk", () => {
    expect(rootScripts["smoke:launch-night"]).toMatch(/scripts\/launch-night-smoke\.mjs/);
  });

  it("snapshots:regen points at the script that exists on disk", () => {
    expect(rootScripts["snapshots:regen"]).toMatch(/scripts\/regenerate-launch-snapshots\.mjs/);
  });

  it("prod:probe points at the script that exists on disk", () => {
    expect(rootScripts["prod:probe"]).toMatch(/scripts\/prod-probe\.mjs/);
  });

  it("jarvis:diff points at the script that exists on disk", () => {
    expect(rootScripts["jarvis:diff"]).toMatch(/scripts\/jarvis-diff\.mjs/);
  });

  it("morning:setup points at the script that exists on disk", () => {
    expect(rootScripts["morning:setup"]).toMatch(/scripts\/morning-setup\.mjs/);
  });
});
