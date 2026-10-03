import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

/**
 * Brand-voice guard: no em/en-dashes in owner-facing copy.
 *
 * Em-dashes read as machine-written. The curated copy sources must use clean
 * punctuation instead. This runs the same scanner the repo guardrail uses, so
 * a regression fails the suite (not just a manual run).
 */

const REPO_ROOT = resolve(__dirname, "..", "..", "..");

describe("em-dash brand-voice guard", () => {
  it("scanner exits clean over the owner-facing copy set", () => {
    const r = spawnSync("node", ["scripts/guardrails/em-dash-scan.mjs"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      timeout: 30000,
    });
    if (r.status !== 0) {
      throw new Error(`em-dash-scan failed:\n${r.stdout}\n${r.stderr}`);
    }
    expect(r.stdout).toMatch(/\[em-dash-scan\] OK/);
  });
});
