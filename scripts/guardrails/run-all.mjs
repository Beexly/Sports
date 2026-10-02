#!/usr/bin/env node
/**
 * run-all — execute every guardrail, report every result, fail if any failed.
 *
 * WHY THIS EXISTS
 * The `guardrails` npm script was a 25-long `&&` chain. `&&` short-circuits, so
 * the run stopped at the first failure — which since the v5.2.6 bump has been
 * `model-freeze`, in position 2. Guards 3..25 therefore had not executed in CI
 * at all, including ai-control-plane-sealing, openapi-security-scan,
 * api-payload-rights-scan and commercial-copy-scan. A red guard was masking
 * seventeen others, and the job looked like it was covering all of them.
 *
 * Fail-fast is right for a build. It is wrong for a *report* — you want to know
 * everything that is broken, not just the first thing.
 *
 * Also runs guards concurrently. Several walk the whole tree independently
 * (trust-gate alone takes ~6s over 1935 files), so serial execution paid that
 * cost end to end.
 *
 * Usage:
 *   node scripts/guardrails/run-all.mjs
 *   node scripts/guardrails/run-all.mjs --only=secret-scan,trust-gate
 *   node scripts/guardrails/run-all.mjs --skip=model-freeze
 *   node scripts/guardrails/run-all.mjs --serial          # debug interleaving
 *   node scripts/guardrails/run-all.mjs --json
 */
import { spawn } from "node:child_process";
import { cpus } from "node:os";

/**
 * The full suite, in the original chain order. `cmd` is argv, so nothing goes
 * through a shell.
 */
const GUARDS = [
  ["trust-gate", ["node", "scripts/guardrails/trust-gate.mjs"]],
  ["model-freeze", ["node", "scripts/guardrails/model-freeze.mjs"]],
  ["draft-only", ["node", "scripts/guardrails/draft-only.mjs"]],
  ["claude-api-usage", ["node", "scripts/guardrails/claude-api-usage.mjs"]],
  ["ai-transport-import-boundary", ["node", "scripts/guardrails/ai-transport-import-boundary.mjs"]],
  ["secret-scan", ["node", "scripts/guardrails/secret-scan.mjs", "--all"]],
  ["api-v1-boundary", ["node", "scripts/guardrails/api-v1-boundary.mjs"]],
  ["commercial-copy-scan", ["node", "scripts/guardrails/commercial-copy-scan.mjs"]],
  ["em-dash-scan", ["node", "scripts/guardrails/em-dash-scan.mjs"]],
  ["no-unsupported-performance-claims", ["node", "scripts/guardrails/no-unsupported-performance-claims.mjs"]],
  ["no-raw-ngs-export", ["node", "scripts/guardrails/no-raw-ngs-export.mjs"]],
  ["partner-offer-compliance-scan", ["node", "scripts/guardrails/partner-offer-compliance-scan.mjs"]],
  ["api-payload-rights-scan", ["node", "scripts/guardrails/api-payload-rights-scan.mjs"]],
  ["openapi-security-scan", ["node", "scripts/guardrails/openapi-security-scan.mjs"]],
  ["no-zk-overclaim", ["node", "scripts/guardrails/no-zk-overclaim.mjs"]],
  ["affiliate-structural-separation", ["node", "scripts/guardrails/affiliate-structural-separation.mjs"]],
  ["sealed-holdout-open-scan", ["node", "scripts/guardrails/sealed-holdout-open-scan.mjs"]],
  ["pedersen-opener-boundary", ["node", "scripts/guardrails/pedersen-opener-boundary.mjs"]],
  ["actor-minting-boundary", ["node", "scripts/guardrails/actor-minting-boundary.mjs"]],
  ["ai-control-plane-sealing", ["node", "scripts/guardrails/ai-control-plane-sealing.mjs"]],
  ["skipped-pg-integration-honesty", ["node", "scripts/guardrails/skipped-pg-integration-honesty.mjs"]],
  ["ai-council", ["node", "scripts/guardrails/ai-council-ci.mjs"]],
  ["aws-compatibility-index-scan", ["node", "scripts/guardrails/aws-compatibility-index-scan.mjs"]],
  ["eval-contracts", ["node", "scripts/eval-contracts.mjs"]],
  ["dependency-audit", ["node", "scripts/guardrails/dependency-audit.mjs"]],
  ["agent-bash-guard", ["node", "scripts/guardrails/agent-bash-guard.mjs", "--selftest"]],
];
/**
 * GUARD SELF-TESTS. The entries above are the guards THEMSELVES: they scan the
 * tree and fail on a violation. These are the tests for the guards, and until
 * now four of them had no CI step at all:
 *
 *   trust-gate.test.mjs (9 cases)                          never ran
 *   commercial-copy-scan.test.mjs (8)                      never ran
 *   no-unsupported-performance-claims.test.mjs (13)        never ran
 *   sealed-holdout-open-scan.test.mjs (2)                 never ran
 *
 * All four are green, which is exactly why this matters: a guard can be
 * neutered -- its pattern narrowed, its fixture list emptied, its exit code
 * swallowed -- and every guard in the list above keeps passing, because the
 * thing that would have noticed is the thing nobody was running. This is the
 * same masking failure this file was written to kill (see its header: an `&&`
 * chain hid seventeen guards), reintroduced one layer down.
 *
 * Run with `node scripts/guardrails/run-all.mjs --selftests` on its own, or as
 * part of the normal run. Named `selftest:*` so a failure here is never mistaken
 * for a policy violation in the tree.
 */
const GUARD_SELF_TESTS = [
  ["selftest:trust-gate", ["node", "scripts/guardrails/trust-gate.test.mjs"]],
  ["selftest:commercial-copy-scan", ["node", "scripts/guardrails/commercial-copy-scan.test.mjs"]],
  [
    "selftest:no-unsupported-performance-claims",
    ["node", "scripts/guardrails/no-unsupported-performance-claims.test.mjs"],
  ],
  ["selftest:sealed-holdout-open-scan", ["node", "scripts/guardrails/sealed-holdout-open-scan.test.mjs"]],
  ["selftest:ai-transport-import-boundary", ["node", "scripts/guardrails/ai-transport-import-boundary.test.mjs"]],
];


function flag(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit === undefined ? null : hit.slice(name.length + 3);
}
const only = flag("only")?.split(",").map((s) => s.trim()).filter(Boolean) ?? null;
const skip = flag("skip")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
const serial = process.argv.includes("--serial");
const asJson = process.argv.includes("--json");
const selftestsOnly = process.argv.includes("--selftests");
const skipSelftests = process.argv.includes("--skip-selftests");
// Self-tests are ON by default. A guard whose own test never runs can be
// neutered silently; that is the failure this defaults away from. Opt out
// explicitly with --skip-selftests.

const selftestNames = new Set(GUARD_SELF_TESTS.map(([name]) => name));
const guardItems = selftestsOnly ? [] : GUARDS;
const selftestItems = skipSelftests ? [] : GUARD_SELF_TESTS;
const ALL_ITEMS = [...guardItems, ...selftestItems];

const selected = ALL_ITEMS.filter(([name]) => {
  // `--only` / `--skip` match a bare guard name, so a caller who names
  // "trust-gate" gets the guard, not its self-test. `selftest:` prefixed names
  // select the self-tests directly.
  const bare = name.replace(/^selftest:/, "");
  const isSelfTest = selftestNames.has(name);
  if (only !== null && !only.includes(name) && !only.includes(bare)) return false;
  if (skip.includes(name) || skip.includes(bare)) return false;
  if (selftestsOnly && !isSelfTest) return false;
  return true;
});

// When --only is used, every named guard must exist — a typo should fail loud,
// not silently pass with "0/0 passed".
if (only !== null) {
  const known = new Set(ALL_ITEMS.map(([name]) => name).concat(GUARDS.map(([n]) => n)));
  const unknown = only.filter((n) => !known.has(n));
  if (unknown.length > 0) {
    console.error(
      `[guardrails] --only references unknown guard(s): ${unknown.join(", ")}\n` +
        `Available guards: ${ALL_ITEMS.map(([n]) => n).join(", ")}`,
    );
    process.exit(2);
  }
}

function runGuard([name, argv]) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(argv[0], argv.slice(1), { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => {
      out += d;
    });
    child.stderr.on("data", (d) => {
      err += d;
    });
    child.on("error", (e) => {
      resolve({ name, ok: false, ms: Date.now() - startedAt, output: `spawn failed: ${e.message}` });
    });
    child.on("close", (code) => {
      resolve({
        name,
        ok: code === 0,
        ms: Date.now() - startedAt,
        output: (out + err).trimEnd(),
      });
    });
  });
}

async function runPool(items, limit) {
  const results = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await runGuard(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

const concurrency = serial ? 1 : Math.max(2, Math.min(8, cpus().length - 1));
const startedAt = Date.now();
const results = await runPool(selected, concurrency);
const totalMs = Date.now() - startedAt;

const failed = results.filter((r) => !r.ok);
const selftestFailures = failed.filter((r) => selftestNames.has(r.name));

if (asJson) {
  console.log(JSON.stringify({ totalMs, concurrency, results }, null, 2));
} else {
  for (const r of results) {
    const status = r.ok ? "PASS" : "FAIL";
    console.log(`${status.padEnd(4)} ${r.name.padEnd(34)} ${String(r.ms).padStart(6)}ms`);
    if (!r.ok && r.output !== "") {
      for (const line of r.output.split("\n").slice(0, 12)) console.log(`       ${line}`);
    }
  }
  console.log("");
  console.log(
    `[guardrails] ${results.length - failed.length}/${results.length} passed in ${totalMs}ms ` +
      `(concurrency ${concurrency}).`,
  );
  if (failed.length > 0) {
    // Split the two failure kinds, because they mean opposite things and an
    // operator must not have to guess which one they are looking at:
    //   - a plain guard failing  = the TREE has a violation
    //   - a `selftest:` failing  = the GUARD is broken and stopped checking
    const guardFails = failed.filter((f) => !selftestNames.has(f.name));
    const selfFails = failed.filter((f) => selftestNames.has(f.name));
    if (guardFails.length > 0) {
      console.log(`[guardrails] VIOLATIONS in tree: ${guardFails.map((f) => f.name).join(", ")}`);
    }
    if (selfFails.length > 0) {
      console.log(
        `[guardrails] BROKEN GUARDS (self-test failed, so that guard is NOT ` +
          `trustworthy this run): ${selfFails.map((f) => f.name).join(", ")}`,
      );
    }
  }
}

process.exit(failed.length > 0 ? 1 : 0);
