/**
 * Fixture suite for the solidity-compile guardrail.
 *
 * Run: node --test scripts/guardrails/solidity-compile.test.mjs
 *
 * The guard's whole value is that it must NOT cry wolf when no compiler is
 * installed, and MUST fail when one is and the code does not compile. Both
 * halves are tested; the compile-failure half is skipped when solc cannot be
 * resolved rather than silently passing, so a missing compiler can never be
 * mistaken for a green build.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const GUARD = join(HERE, "solidity-compile.mjs");

/** Optional compiler: SOLC_PATH env, or a resolvable `solc` module. */
function solcPath() {
  if (process.env.SOLC_PATH) {
    return existsSync(process.env.SOLC_PATH) ? process.env.SOLC_PATH : null;
  }
  try {
    createRequire(join(process.cwd(), "package.json")).resolve("solc");
    return null; // resolvable from cwd; no --solc needed
  } catch {
    return undefined; // unknown
  }
}

const SOLC = solcPath();
const HAS_SOLC = SOLC !== undefined && SOLC !== null;

function makeRoot(files) {
  const root = mkdtempSync(join(tmpdir(), "solidity-compile-"));
  for (const [rel, body] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
  return root;
}

function run(root, args = []) {
  try {
    const stdout = execFileSync(process.execPath, [GUARD, "--root", root, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout };
  } catch (e) {
    return { code: e.status ?? 1, stdout: (e.stdout ?? "") + (e.stderr ?? "") };
  }
}

const FOUNDRY = `[profile.default]
src = "src"
solc_version = "0.8.34"
evm_version = "cancun"
optimizer = false
`;

const GOOD_SOL = "pragma solidity >=0.8.12 <0.9.0;\ncontract Ok { function f() public pure returns (uint256) { return 1; } }\n";
const BAD_SOL = "pragma solidity >=0.8.12 <0.9.0;\ncontract Bad { function f() public pure returns (uint256) { return nope; } }\n";

test("skips when there is no Solidity at all", () => {
  const root = mkdtempSync(join(tmpdir(), "solidity-none-"));
  const r = run(root);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /SKIP/);
  assert.match(r.stdout, /no Solidity/);
});

test("skips rather than failing when a compiler is unavailable", () => {
  if (HAS_SOLC) return; // environment has solc; covered by the compile tests
  const root = makeRoot({ "src/A.sol": GOOD_SOL, "foundry.toml": FOUNDRY });
  const r = run(root);
  assert.equal(r.code, 0, "a missing optional compiler must not fail the gate");
  assert.match(r.stdout, /SKIP/);
  assert.match(r.stdout, /no solc module resolvable/);
});

test("finds .sol files outside node_modules/out/lib", () => {
  const root = makeRoot({
    "src/A.sol": GOOD_SOL,
    "node_modules/x/B.sol": BAD_SOL,
    "out/C.sol": BAD_SOL,
    "lib/C.sol": BAD_SOL,
  });
  const r = run(root);
  // Only src/A.sol should be considered; the bad files are in skipped dirs, so
  // the result is SKIP (no solc) or PASS, never a failure from them.
  assert.equal(r.code, 0, r.stdout);
});

test("compiles cleanly when a compiler is available", { skip: !HAS_SOLC }, () => {
  const root = makeRoot({ "src/A.sol": GOOD_SOL, "foundry.toml": FOUNDRY });
  const r = run(root, SOLC ? ["--solc", SOLC] : []);
  assert.equal(r.code, 0, r.stdout);
  assert.match(r.stdout, /PASS/);
});

test("fails on a compile error when a compiler is available", { skip: !HAS_SOLC }, () => {
  const root = makeRoot({ "src/A.sol": BAD_SOL, "foundry.toml": FOUNDRY });
  const r = run(root, SOLC ? ["--solc", SOLC] : []);
  assert.equal(r.code, 1, "a real compile error must fail the gate");
  assert.match(r.stdout, /ERROR|FAIL/);
});

test("warns when the resolved compiler differs from the pinned version", { skip: !HAS_SOLC }, () => {
  const root = makeRoot({
    "src/A.sol": GOOD_SOL,
    "foundry.toml": '[profile.default]\nsolc_version = "0.4.0"\nev m_version = "cancun"\n',
  });
  const r = run(root, SOLC ? ["--solc", SOLC] : []);
  assert.match(r.stdout, /pins solc/);
});
