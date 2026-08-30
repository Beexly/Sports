import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The morning handoff is the first file a sleepy operator opens. It must
 * cite the canonical paths so the operator can fan out to the
 * supporting docs without grepping.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");
const src = readFileSync(
  resolve(repoRoot, "reports/launch-night/morning-handoff.md"),
  "utf8"
);

const REQUIRED_REFERENCES = [
  "reports/launch-night/observability-audit.md",
  "reports/launch-night/final-report.md",
  "reports/launch-night/overnight-changelog.md",
  "docs/launch-runbook.md",
  "docs/launch-observatory.md",
  "reports/launch-night/snapshots",
  "feature/jarvis-launch-observatory",
];

describe("morning-handoff.md cross-links", () => {
  it("contains the launch-night reports the operator should read in order", () => {
    for (const path of REQUIRED_REFERENCES) {
      expect(
        src.includes(path),
        `morning-handoff.md should reference: ${path}`
      ).toBe(true);
    }
  });

  it("includes the operator's first-step commands (rm + npm install + git)", () => {
    expect(src).toMatch(/rm\s+-f\s+\.git\/index\.lock/);
    expect(src).toMatch(/rm\s+-rf\s+node_modules/);
    expect(src).toMatch(/npm install/);
    expect(src).toMatch(/git\s+commit/);
    expect(src).toMatch(/git\s+push/);
  });

  it("includes the at-a-glance stats section so the operator sees magnitude", () => {
    expect(src).toMatch(/at-a-glance stats/i);
    expect(src).toMatch(/Test files:/i);
  });

  it("includes a 60-second summary section", () => {
    expect(src).toMatch(/60-second summary/i);
  });

  it("identifies the branch the launch-night work lives on", () => {
    expect(src).toMatch(/sports-intelligence-os-phase-9-ci/);
  });

  it("identifies the feature branch name the operator should push to", () => {
    expect(src).toMatch(/feature\/jarvis-launch-observatory/);
  });

  it("describes the picks-seed and the new dashboard tiles for the morning operator", () => {
    expect(src).toMatch(/Picks visible by morning/);
    expect(src).toMatch(/seedPicks\(\)/);
    expect(src).toMatch(/Today's picks tile/);
    expect(src).toMatch(/Recent results tile/);
    expect(src).toMatch(/Picks at a glance/);
  });

  it("calls out that the performance gate is unaffected by the seed", () => {
    expect(src).toMatch(/performance gate is unaffected|stays gated/i);
  });
});
