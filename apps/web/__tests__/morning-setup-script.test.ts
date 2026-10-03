import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * scripts/morning-setup.mjs — one-shot operator helper.
 *
 * Pin the contract: runs db:seed + snapshots:regen, skips snapshot
 * regen gracefully when no dev server is reachable, and prints a
 * summary the operator can scan.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");
const src = readFileSync(resolve(repoRoot, "scripts/morning-setup.mjs"), "utf8");

describe("scripts/morning-setup.mjs", () => {
  it("records the git environment in the repo lock file without assuming a remote", () => {
    expect(src).toMatch(/CODEX_REPO_LOCK\.md/);
    expect(src).toMatch(/appendGitEnvironmentLock/);
    expect(src).toMatch(/branch", "--show-current/);
    expect(src).toMatch(/remote", "-v/);
    expect(src).toMatch(/origin\/main/);
    expect(src).toMatch(/never assume or use `master`/);
  });

  it("runs db:seed", () => {
    expect(src).toMatch(/"db:seed"/);
  });

  it("runs snapshots:regen but gates on the dev server being reachable", () => {
    expect(src).toMatch(/"snapshots:regen"/);
    expect(src).toMatch(/requiresServer:\s*true/);
    expect(src).toMatch(/pingServer/);
  });

  it("prints a final summary table", () => {
    expect(src).toMatch(/Morning setup summary/);
  });

  it("prints the canonical URLs the operator should open in a browser", () => {
    expect(src).toMatch(/\/dashboard/);
    expect(src).toMatch(/\/cockpit/);
    expect(src).toMatch(/\/cockpit\/history/);
    expect(src).toMatch(/\/picks/);
  });

  it("each step is best-effort (final exit code is the worst non-zero)", () => {
    expect(src).toMatch(/worstStatus/);
  });
});
