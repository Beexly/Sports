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
// spawnSync blocks the vitest worker thread synchronously, so vitest's own
// testTimeout can't interrupt it — this ceiling is what actually bounds each
// guard. Standalone the guards finish well under a minute, but when the full
// suite runs them concurrently the CPU contention can push a single guard past
// 2 minutes; a 120s ceiling then kills the child and the test fails spuriously.
// 5 minutes gives headroom under load without weakening the guard: it still runs
// to completion and must exit 0. The per-test vitest timeout below is set just
// above this so the spawn ceiling (which yields a clean assertion) trips first.
const GUARD_TIMEOUT_MS = 300_000;
const GUARD_TEST_TIMEOUT_MS = 330_000;

function runGuard(relativePath: string): {
  status: number;
  stdout: string;
  stderr: string;
  error: string;
  signal: NodeJS.Signals | null;
} {
  const script = resolve(REPO_ROOT, relativePath);
  expect(existsSync(script)).toBe(true);
  const r = spawnSync("node", [script], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: GUARD_TIMEOUT_MS,
  });
  return {
    status: typeof r.status === "number" ? r.status : 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
    error: r.error?.message ?? "",
    signal: r.signal ?? null,
  };
}

describe("Phase 9 guardrails", () => {
  it("trust-gate exits 0 on a clean repo", () => {
    const r = runGuard("scripts/guardrails/trust-gate.mjs");
    if (r.status !== 0) {
      // surface the failure detail for easier triage
      throw new Error(
        `trust-gate failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[trust-gate\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("trust-gate documents source-contract exceptions for scanner/template definitions", () => {
    const src = readFileSync(resolve(REPO_ROOT, "scripts/guardrails/trust-gate.mjs"), "utf8");
    expect(src).toContain('"apps/web/lib/compliance-scanner/"');
    expect(src).toContain('"apps/web/lib/studio/templates/"');
  });

  it("trust-gate enforces BS-004 — picks are a deterministic engine, never 'AI picks'", () => {
    const src = readFileSync(resolve(REPO_ROOT, "scripts/guardrails/trust-gate.mjs"), "utf8");
    // The brand position (deterministic engine, AI only in the content layer)
    // must stay machine-enforced; this locks the rule so it can't silently vanish.
    expect(src).toContain("banned.ai-picks");
    expect(src).toContain("banned.ai-generated-picks");
  });

  it("model-freeze exits 0 with the FROZEN baseline marker in place", () => {
    const r = runGuard("scripts/guardrails/model-freeze.mjs");
    if (r.status !== 0) {
      throw new Error(
        `model-freeze failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[model-freeze\] OK/);
  });

  it("draft-only exits 0 — no engine path writes publishedAt or flips PUBLISHED", () => {
    const r = runGuard("scripts/guardrails/draft-only.mjs");
    if (r.status !== 0) {
      throw new Error(
        `draft-only failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[draft-only\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("claude-api-usage exits 0 with direct calls limited to approved paths", () => {
    const r = runGuard("scripts/guardrails/claude-api-usage.mjs");
    if (r.status !== 0) {
      throw new Error(
        `claude-api-usage failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[claude-api-usage\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("commercial-copy-scan exits 0 on launch-facing revenue surfaces", () => {
    const r = runGuard("scripts/guardrails/commercial-copy-scan.mjs");
    if (r.status !== 0) {
      throw new Error(
        `commercial-copy-scan failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[commercial-copy-scan\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("no-unsupported-performance-claims exits 0 on public monetization copy", () => {
    const r = runGuard("scripts/guardrails/no-unsupported-performance-claims.mjs");
    if (r.status !== 0) {
      throw new Error(
        `no-unsupported-performance-claims failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[no-unsupported-performance-claims\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("no-raw-ngs-export exits 0 without raw Next Gen Stats redistribution language", () => {
    const r = runGuard("scripts/guardrails/no-raw-ngs-export.mjs");
    if (r.status !== 0) {
      throw new Error(
        `no-raw-ngs-export failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[no-raw-ngs-export\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("partner-offer-compliance-scan exits 0 with high-risk offers fail-closed", () => {
    const r = runGuard("scripts/guardrails/partner-offer-compliance-scan.mjs");
    if (r.status !== 0) {
      throw new Error(
        `partner-offer-compliance-scan failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[partner-offer-compliance-scan\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("api-payload-rights-scan exits 0 with unsafe API fields fail-closed", () => {
    const r = runGuard("scripts/guardrails/api-payload-rights-scan.mjs");
    if (r.status !== 0) {
      throw new Error(
        `api-payload-rights-scan failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[api-payload-rights-scan\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("openapi-security-scan exits 0 with shadow auth metadata intact", () => {
    const r = runGuard("scripts/guardrails/openapi-security-scan.mjs");
    if (r.status !== 0) {
      throw new Error(
        `openapi-security-scan failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[openapi-security-scan\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("root guardrails chain includes commercial, performance, payload-rights, OpenAPI, and raw-NGS checks", () => {
    const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, "package.json"), "utf8"));
    expect(pkg.scripts["guard:commercial-copy"]).toContain("commercial-copy-scan.mjs");
    expect(pkg.scripts["guard:performance-claims"]).toContain("no-unsupported-performance-claims.mjs");
    expect(pkg.scripts["guard:no-raw-ngs"]).toContain("no-raw-ngs-export.mjs");
    expect(pkg.scripts["guard:partner-offers"]).toContain("partner-offer-compliance-scan.mjs");
    expect(pkg.scripts["guard:api-payload-rights"]).toContain("api-payload-rights-scan.mjs");
    expect(pkg.scripts["guard:openapi-security"]).toContain("openapi-security-scan.mjs");
    expect(pkg.scripts.guardrails).toContain("commercial-copy-scan.mjs");
    expect(pkg.scripts.guardrails).toContain("no-unsupported-performance-claims.mjs");
    expect(pkg.scripts.guardrails).toContain("no-raw-ngs-export.mjs");
    expect(pkg.scripts.guardrails).toContain("partner-offer-compliance-scan.mjs");
    expect(pkg.scripts.guardrails).toContain("api-payload-rights-scan.mjs");
    expect(pkg.scripts.guardrails).toContain("openapi-security-scan.mjs");
  });

  it("sealed-holdout-open-scan exits 0 with the seal opened only inside edge-lab (FIX 6)", () => {
    const r = runGuard("scripts/guardrails/sealed-holdout-open-scan.mjs");
    if (r.status !== 0) {
      throw new Error(
        `sealed-holdout-open-scan failed (status=${r.status}, signal=${r.signal}, error=${r.error}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`
      );
    }
    expect(r.stdout).toMatch(/\[sealed-holdout-open-scan\] OK/);
  }, GUARD_TEST_TIMEOUT_MS);

  it("root guardrails chain includes the sealed-holdout-open-scan check", () => {
    const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, "package.json"), "utf8"));
    expect(pkg.scripts["guard:sealed-holdout-open-scan"]).toContain("sealed-holdout-open-scan.mjs");
    expect(pkg.scripts.guardrails).toContain("sealed-holdout-open-scan.mjs");
  });
});
