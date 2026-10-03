/**
 * Actor-minting import-boundary guard (directive 4.2 acceptance: "no arbitrary
 * actor-constructor imports").
 *
 * Runs scripts/guardrails/actor-minting-boundary.mjs as a subprocess:
 *   - default repo scan must be CLEAN (exit 0) — no application module reaches
 *     the raw serviceActor()/systemActor() constructors;
 *   - fixture mode must FLAG every laundering technique (named import, aliased
 *     import, namespace access, computed access, export *, dynamic import,
 *     test-internal import) and must NOT flag the clean consumer.
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const GUARD = "scripts/guardrails/actor-minting-boundary.mjs";
const FIXTURES = "scripts/guardrails/fixtures/actor-minting";
const GUARD_TIMEOUT_MS = 300_000;
const GUARD_TEST_TIMEOUT_MS = 330_000;

function runGuard(args: string[]): { status: number; stdout: string; stderr: string } {
  const script = resolve(REPO_ROOT, GUARD);
  expect(existsSync(script)).toBe(true);
  const r = spawnSync("node", [script, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: GUARD_TIMEOUT_MS,
  });
  return {
    status: typeof r.status === "number" ? r.status : 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

describe("actor-minting boundary guard", () => {
  it("repo scan is clean: arbitrary modules cannot mint actors", () => {
    const r = runGuard([]);
    if (r.status !== 0) {
      throw new Error(
        `actor-minting-boundary failed on the repo (status=${r.status}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[actor-minting-boundary\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("flags every laundering technique in the fixtures and spares the clean consumer", () => {
    const r = runGuard(["--scan-root", FIXTURES]);
    expect(r.status).toBe(1);
    const out = r.stdout + r.stderr;
    expect(out).toMatch(/violation-named-import\.ts:\d+ \[raw-import\]/);
    expect(out).toMatch(/violation-aliased-import\.ts:\d+ \[raw-import\]/);
    expect(out).toMatch(/violation-namespace-access\.ts:\d+ \[namespace-minting\]/);
    expect(out).toMatch(/violation-export-star\.ts:\d+ \[export-star\]/);
    expect(out).toMatch(/violation-dynamic-import\.ts:\d+ \[dynamic-import\]/);
    expect(out).toMatch(/violation-test-internal\.ts:\d+ \[test-internal\]/);
    // Both plain and computed namespace access are caught.
    expect(out.match(/\[namespace-minting\]/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    // The legitimate consumer of the governed API is NOT flagged.
    expect(out).not.toMatch(/clean-consumer\.ts/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("is wired into the root guardrails chain", async () => {
    const { readFileSync } = await import("node:fs");
    const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["guard:actor-minting"]).toContain("actor-minting-boundary.mjs");
    // The `guardrails` script delegates to run-all.mjs — the actual chain is
    // defined there, so verify the guard is listed in that file.
    const runAll = readFileSync(resolve(REPO_ROOT, "scripts/guardrails/run-all.mjs"), "utf8");
    expect(runAll).toContain("actor-minting-boundary.mjs");
  });
});
