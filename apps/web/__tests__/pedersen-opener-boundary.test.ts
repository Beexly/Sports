/**
 * Pedersen opener boundary guard.
 *
 * The slate's `pedersenAggregateHex` is a public commitment; `pedersenAggregateValue`
 * and `pedersenBlindingSum` OPEN it. Serving either publicly before the slate settles
 * does not leak a detail — it voids the seal, because the number the commitment was
 * meant to hide becomes readable.
 *
 * Runs scripts/guardrails/pedersen-opener-boundary.mjs as a subprocess:
 *   - the real repo scan must be CLEAN (exit 0);
 *   - fixture mode must FLAG an implicit (all-columns) read and an opener column
 *     selected under apps/, and must NOT flag the compliant reader — including one
 *     that merely NAMES an opener column in a comment.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const GUARD = "scripts/guardrails/pedersen-opener-boundary.mjs";
const FIXTURES = resolve(REPO_ROOT, "scripts/guardrails/fixtures/pedersen-opener");
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

/**
 * Mount the fixtures in a synthetic repo so path-sensitive rule B is exercised:
 * the opener violation and the clean reader go under `apps/` (the public tree),
 * the implicit-select violation under `packages/` (rule A applies everywhere).
 */
let fixtureRoot: string;

beforeAll(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), "pedersen-guard-"));
  mkdirSync(join(fixtureRoot, "apps", "web"), { recursive: true });
  mkdirSync(join(fixtureRoot, "packages", "svc"), { recursive: true });
  copyFileSync(
    join(FIXTURES, "violation-opener-in-public-tree.ts"),
    join(fixtureRoot, "apps", "web", "violation-opener-in-public-tree.ts"),
  );
  copyFileSync(
    join(FIXTURES, "clean-consumer.ts"),
    join(fixtureRoot, "apps", "web", "clean-consumer.ts"),
  );
  copyFileSync(
    join(FIXTURES, "violation-implicit-select.ts"),
    join(fixtureRoot, "packages", "svc", "violation-implicit-select.ts"),
  );
});

afterAll(() => {
  if (fixtureRoot) rmSync(fixtureRoot, { recursive: true, force: true });
});

describe("pedersen opener boundary guard", () => {
  it(
    "the real repo is clean — no slateCommitment read can reach the opener",
    () => {
      const r = runGuard([]);
      if (r.status !== 0) {
        throw new Error(
          `pedersen-opener-boundary failed on the repo (status=${r.status}).\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`,
        );
      }
      expect(r.stdout).toMatch(/OK/);
    },
    GUARD_TEST_TIMEOUT_MS,
  );

  it(
    "flags a read with no explicit select — Prisma would return the opener",
    () => {
      const r = runGuard(["--root", fixtureRoot]);
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/violation-implicit-select\.ts/);
      expect(r.stderr).toMatch(/implicit-select/);
    },
    GUARD_TEST_TIMEOUT_MS,
  );

  it(
    "flags an opener column selected inside the public tree",
    () => {
      const r = runGuard(["--root", fixtureRoot]);
      expect(r.status).toBe(1);
      expect(r.stderr).toMatch(/violation-opener-in-public-tree\.ts/);
      expect(r.stderr).toMatch(/opener-in-public-tree/);
      expect(r.stderr).toMatch(/pedersenBlindingSum/);
    },
    GUARD_TEST_TIMEOUT_MS,
  );

  it(
    "does NOT flag the compliant reader, even though a comment names the opener",
    () => {
      const r = runGuard(["--root", fixtureRoot]);
      // Both real violations are reported; the clean file must appear nowhere.
      expect(r.stderr).not.toMatch(/clean-consumer\.ts/);
    },
    GUARD_TEST_TIMEOUT_MS,
  );

  it(
    "reports exactly the two seeded violations — no over-firing",
    () => {
      const r = runGuard(["--root", fixtureRoot]);
      expect(r.stderr).toMatch(/FAIL - 2 violation\(s\)/);
    },
    GUARD_TEST_TIMEOUT_MS,
  );
});
