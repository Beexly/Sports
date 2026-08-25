/**
 * Client-IP boundary guard — anti-regression for the forged-header rate-limit
 * bypass.
 *
 * Five routes used to key their rate limiter on the LEFTMOST x-forwarded-for
 * entry, which the caller supplies: rotating that header minted a fresh bucket
 * per request, so the limit never applied (on /api/waitlist that meant
 * unbounded rows AND one outbound welcome email per unique address). They now
 * all call clientIp(). This suite is what stops a sixth call site from
 * appearing.
 *
 * Runs scripts/guardrails/client-ip-boundary.mjs as a subprocess:
 *   - the default repo scan must be CLEAN (exit 0);
 *   - fixture mode must flag every hand-rolled shape (leftmost XFF, mixed-case
 *     header name, x-real-ip / x-vercel-forwarded-for, template literal) and
 *     must NOT flag the clean consumer that calls clientIp();
 *   - the guard must be wired into the root guardrails chain that CI runs.
 *
 * Asserted at RUNTIME on purpose: apps/web/tsconfig.json excludes **\/*.test.ts,
 * so a type-level assertion in this directory is never checked by `tsc` and
 * would prove nothing.
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const GUARD = "scripts/guardrails/client-ip-boundary.mjs";
const FIXTURES = "scripts/guardrails/fixtures/client-ip-boundary";
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

describe("client-IP boundary guard", () => {
  it("repo scan is clean: no route hand-rolls forwarding-header parsing", () => {
    const r = runGuard([]);
    if (r.status !== 0) {
      throw new Error(
        `client-ip-boundary failed on the repo (status=${r.status}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`,
      );
    }
    expect(r.stdout).toMatch(/\[client-ip-boundary\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("flags every hand-rolled shape in the fixtures and spares the clean consumer", () => {
    const r = runGuard(["--scan-root", FIXTURES]);
    expect(r.status).toBe(1);
    const out = r.stdout + r.stderr;
    expect(out).toMatch(/violation-leftmost-xff\.ts:\d+ \[forwarding-header-literal\]/);
    expect(out).toMatch(/violation-mixed-case\.ts:\d+ \[forwarding-header-literal\]/);
    expect(out).toMatch(/violation-real-ip\.ts:\d+ \[forwarding-header-literal\]/);
    // x-vercel-forwarded-for (template literal) AND x-real-ip in one file.
    expect(out.match(/violation-real-ip\.ts:\d+/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    // A comment mentioning the header is prose, not a literal: not flagged.
    expect(out).not.toMatch(/clean-consumer\.ts/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("is wired into the root guardrails chain CI runs", () => {
    const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    // `?? ""` so a MISSING script reads as an empty string and the failure says
    // "does not contain client-ip-boundary.mjs" rather than an argument-type error.
    expect(pkg.scripts["guard:client-ip"] ?? "").toContain("client-ip-boundary.mjs");
    // `npm run guardrails` is what the CI "All guardrails" job executes
    // (.github/workflows/ci.yml, job `guardrails`).
    expect(pkg.scripts["guardrails"] ?? "").toContain("client-ip-boundary.mjs");
    // …and the parallel runner carries the same list.
    const runAll = readFileSync(resolve(REPO_ROOT, "scripts/guardrails/run-all.mjs"), "utf8");
    expect(runAll).toContain("client-ip-boundary.mjs");
    // CI must actually invoke that chain — otherwise the guard is inert.
    const ci = readFileSync(resolve(REPO_ROOT, ".github/workflows/ci.yml"), "utf8");
    expect(ci).toContain("npm run guardrails");
  });
});
