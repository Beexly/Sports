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
 * FAIL CLOSED
 * A guard runner that no-ops on a bad config silently disarms every guard in
 * CI — worse than the problem it solves. So the manifest is validated before
 * anything runs: it must be a non-empty array of [name, argv] pairs with
 * unique names, and every `node <script>` guard must point at a file that
 * actually exists. Any violation exits 2 loudly; there is no path on which a
 * broken manifest reports a green "0/0 passed".
 *
 * Usage:
 *   node scripts/guardrails/run-all.mjs
 *   node scripts/guardrails/run-all.mjs --only=secret-scan,trust-gate
 *   node scripts/guardrails/run-all.mjs --skip=model-freeze
 *   node scripts/guardrails/run-all.mjs --serial          # debug interleaving
 *   node scripts/guardrails/run-all.mjs --json
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { cpus } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Repo root, derived from this file so the runner works from any cwd. */
const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

/**
 * THE MANIFEST — the full suite, in the original chain order.
 *
 * One guard per line, deliberately: adding a guard is a one-line insertion, so
 * two branches that each add a different guard no longer collide the way they
 * did when this list was one `&&`-joined string in package.json.
 *
 * `argv` is a real argv array, so nothing goes through a shell and entries that
 * are not plain script invocations (`npm run ...`, `node --test ...`, guards
 * carrying flags) are expressed faithfully rather than flattened.
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
  ["ai-council", ["npm", "run", "guard:ai-council"]],
  ["aws-compatibility-index-scan", ["node", "scripts/guardrails/aws-compatibility-index-scan.mjs"]],
  ["eval-contracts", ["node", "scripts/eval-contracts.mjs"]],
  ["dependency-audit", ["node", "scripts/guardrails/dependency-audit.mjs"]],
  ["agent-bash-guard", ["node", "scripts/guardrails/agent-bash-guard.mjs", "--selftest"]],
];

/**
 * Fail closed. Every way the manifest can be wrong is caught here, before a
 * single guard runs, and every one of them exits non-zero.
 */
function validateManifest(guards) {
  const problems = [];

  if (!Array.isArray(guards)) {
    problems.push(`GUARDS must be an array, got ${typeof guards}.`);
  } else if (guards.length === 0) {
    problems.push("GUARDS is empty — that would run no guards at all and report success.");
  } else {
    const seen = new Set();
    guards.forEach((entry, i) => {
      const at = `GUARDS[${i}]`;
      if (!Array.isArray(entry) || entry.length !== 2) {
        problems.push(`${at}: expected a [name, argv] pair, got ${JSON.stringify(entry)}.`);
        return;
      }
      const [name, argv] = entry;
      if (typeof name !== "string" || name.trim() === "") {
        problems.push(`${at}: guard name must be a non-empty string, got ${JSON.stringify(name)}.`);
      } else if (seen.has(name)) {
        problems.push(`${at}: duplicate guard name "${name}".`);
      } else {
        seen.add(name);
      }
      if (!Array.isArray(argv) || argv.length === 0 || !argv.every((a) => typeof a === "string")) {
        problems.push(`${at} ("${name}"): argv must be a non-empty array of strings, got ${JSON.stringify(argv)}.`);
        return;
      }
      // A guard naming a script that does not exist must fail loudly here
      // rather than as an opaque MODULE_NOT_FOUND buried in a child process.
      if (argv[0] === "node") {
        const script = argv.slice(1).find((a) => !a.startsWith("-"));
        if (script === undefined) {
          problems.push(`${at} ("${name}"): "node" invocation names no script.`);
        } else if (!existsSync(resolve(REPO_ROOT, script))) {
          problems.push(`${at} ("${name}"): script not found at ${script}`);
        }
      }
    });
  }

  if (problems.length > 0) {
    console.error("[guardrails] MANIFEST INVALID — refusing to run. No guards were executed.");
    for (const p of problems) console.error(`[guardrails]   - ${p}`);
    console.error("[guardrails] Fix scripts/guardrails/run-all.mjs; this is a fail-closed stop, not a guard failure.");
    process.exit(2);
  }
}

validateManifest(GUARDS);

function flag(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit === undefined ? null : hit.slice(name.length + 3);
}
const only = flag("only")?.split(",").map((s) => s.trim()).filter(Boolean) ?? null;
const skip = flag("skip")?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
const serial = process.argv.includes("--serial");
const asJson = process.argv.includes("--json");

const selected = GUARDS.filter(([name]) => {
  if (only !== null && !only.includes(name)) return false;
  if (skip.includes(name)) return false;
  return true;
});

// When --only is used, every named guard must exist — a typo should fail loud,
// not silently pass with "0/0 passed".
if (only !== null) {
  const known = new Set(GUARDS.map(([name]) => name));
  const unknown = only.filter((n) => !known.has(n));
  if (unknown.length > 0) {
    console.error(
      `[guardrails] --only references unknown guard(s): ${unknown.join(", ")}\n` +
        `Available guards: ${GUARDS.map(([n]) => n).join(", ")}`,
    );
    process.exit(2);
  }
}

function runGuard([name, argv]) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(argv[0], argv.slice(1), { cwd: REPO_ROOT, stdio: ["ignore", "pipe", "pipe"] });
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

// Selecting nothing is also a fail-closed case: a --skip list that happens to
// cover the whole suite must not report success.
if (selected.length === 0) {
  console.error("[guardrails] No guards selected — refusing to report success on an empty run.");
  process.exit(2);
}

const concurrency = serial ? 1 : Math.max(2, Math.min(8, cpus().length - 1));
const startedAt = Date.now();
const results = await runPool(selected, concurrency);
const totalMs = Date.now() - startedAt;

const failed = results.filter((r) => !r.ok);

if (asJson) {
  console.log(JSON.stringify({ totalMs, concurrency, results }, null, 2));
} else {
  for (const r of results) {
    const status = r.ok ? "PASS" : "FAIL";
    console.log(`${status.padEnd(4)} ${r.name.padEnd(34)} ${String(r.ms).padStart(6)}ms`);
    // Print the failure in full. Truncating it would send the contributor back
    // to re-run the guard alone to see what it actually said, which is the
    // round-tripping this runner exists to remove.
    if (!r.ok && r.output !== "") {
      for (const line of r.output.split("\n")) console.log(`       ${line}`);
    }
  }
  console.log("");
  console.log(
    `[guardrails] ${results.length - failed.length}/${results.length} passed in ${totalMs}ms ` +
      `(concurrency ${concurrency}).`,
  );
  if (failed.length > 0) {
    console.log(`[guardrails] FAILED: ${failed.map((f) => f.name).join(", ")}`);
  }
}

process.exit(failed.length > 0 ? 1 : 0);
