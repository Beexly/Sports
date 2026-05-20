import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..", "..", "..");
const src = readFileSync(
  resolve(repoRoot, "scripts/launch-night-smoke.mjs"),
  "utf8"
);

describe("scripts/launch-night-smoke.mjs", () => {
  it("runs the brand-safety subset", () => {
    expect(src).toMatch(/test:brand-safety/);
  });

  it("runs the cockpit subset", () => {
    expect(src).toMatch(/test:cockpit/);
  });

  it("includes snapshot regen when --with-snapshots is passed", () => {
    expect(src).toMatch(/--with-snapshots/);
    expect(src).toMatch(/snapshots:regen/);
  });

  it("emits a one-line result line per step in the summary", () => {
    expect(src).toMatch(/Launch-night smoke results:/);
  });

  it("exits non-zero when any step fails", () => {
    expect(src).toMatch(/process\.exit\(1\)/);
  });

  it("uses spawnSync with stdio: 'inherit' so the operator sees the live output", () => {
    expect(src).toMatch(/spawnSync\(/);
    expect(src).toMatch(/stdio:\s*["']inherit["']/);
  });
});
