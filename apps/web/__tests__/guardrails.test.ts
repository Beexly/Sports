import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";

/**
 * Guardrail integration tests.
 *
 * Run the three Node guardrail scripts as subprocesses and assert on
 * exit code + stdout. These tests cover the Phase 9 "trust gate /
 * model freeze / draft only" suite so a future regression that
 * breaks the guard surface fails CI loudly, not silently.
 */

const REPO_ROOT = resolve(__dirname, "..", "..", "..");

function runGuard(relativePath: string): {
  status: number;
  stdout: string;
  stderr: string;
} {
  const script = resolve(REPO_ROOT, relativePath);
  expect(existsSync(script)).toBe(true);
  const r = spawnSync("node", [script], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: 30_000,
  });
  return {
    status: typeof r.status === "number" ? r.status : 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

describe("Phase 9 guardrails", () => {
  it("trust-gate exits 0 on a clean repo", () => {
    const r = runGuard("scripts/guardrails/trust-gate.mjs");
    if (r.status !== 0) {
      // surface the failure detail for easier triage
      throw new Error(
        `trust-gate failed (status=${r.status}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[trust-gate\] OK/);
  });

  it("trust-gate documents source-contract exceptions for scanner/template definitions", () => {
    const src = readFileSync(resolve(REPO_ROOT, "scripts/guardrails/trust-gate.mjs"), "utf8");
    expect(src).toContain('"apps/web/lib/compliance-scanner/"');
    expect(src).toContain('"apps/web/lib/studio/templates/"');
  });

  it("model-freeze exits 0 with the FROZEN baseline marker in place", () => {
    const r = runGuard("scripts/guardrails/model-freeze.mjs");
    if (r.status !== 0) {
      throw new Error(
        `model-freeze failed (status=${r.status}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[model-freeze\] OK/);
  });

  it("draft-only exits 0 — no engine path writes publishedAt or flips PUBLISHED", () => {
    const r = runGuard("scripts/guardrails/draft-only.mjs");
    if (r.status !== 0) {
      throw new Error(
        `draft-only failed (status=${r.status}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[draft-only\] OK/);
  });

  it("claude-api-usage exits 0 with direct calls limited to approved paths", () => {
    const r = runGuard("scripts/guardrails/claude-api-usage.mjs");
    if (r.status !== 0) {
      throw new Error(
        `claude-api-usage failed (status=${r.status}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[claude-api-usage\] OK/);
  });
});
