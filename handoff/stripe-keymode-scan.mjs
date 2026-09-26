#!/usr/bin/env node
/**
 * P4-6 helper — Stripe key-mode + shape scan (read-only, exit 0).
 *
 * Two questions, deliberately kept separate because they are NOT the same check:
 *
 *  1. KEY MODE vs ENVIRONMENT. Does anything in the tree assert that a LIVE key
 *     only appears in production? Answered by grepping the sources, not by env.
 *  2. LIVE-SHAPED CREDENTIALS IN THE LIVE PROCESS ENV. Scans process.env with the
 *     same shape rule the payment suite's guard uses.
 *
 * Prints the NAME of any matching variable and never its value. Exits 0 always:
 * a report script that fails the build teaches nothing about the build.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO = resolve(process.argv[2] ?? process.cwd());

// The EXACT pattern from apps/web/__tests__/checkout-live-mode-guard.test.ts:19-20.
const LIVE_PREFIXES = ["sk", "pk", "rk"].map((p) => `${p}_` + "live_");
const LIVE_KEY_RE = new RegExp(`\\b(?:${LIVE_PREFIXES.join("|")})[A-Za-z0-9]{8,}\\b`);

console.log("P4-6 Stripe key-mode + credential-shape scan");
console.log("=".repeat(64));
console.log(`repo: ${REPO}\n`);

// --- 1. Live-shaped credentials in THIS process env (names only) ------------
const hits = [];
for (const [name, value] of Object.entries(process.env)) {
  if (!value) continue;
  if (LIVE_KEY_RE.test(value)) hits.push({ name, length: value.length });
}
console.log("1) live-shaped credentials in process env (value never printed)");
if (hits.length === 0) {
  console.log("   none\n");
} else {
  for (const h of hits) {
    console.log(`   ${h.name}  (value length ${h.length}, value NOT printed)`);
  }
  console.log(
    "   NOTE: a hit here is a SHAPE match. It is a real finding only if the\n" +
      "   variable is a STRIPE_* var; an unrelated credential that happens to\n" +
      "   share the prefix is a false positive OF THE GUARD, not a leaked key.\n",
  );
}

// --- 2. Self-test: prove the regex can actually detect its own target -------
const CANARY = "sk_" + "live_" + "A1b2C3d4E5f6G7h8";
console.log("2) regex self-test (proves the scan can detect the failure it claims)");
console.log(`   canary matches: ${LIVE_KEY_RE.test(CANARY)}  (expected true)`);
console.log(`   a short token is ignored: ${LIVE_KEY_RE.test("sk_" + "live_" + "abc")}  (expected false)\n`);

// --- 3. Does any source ASSERT key mode against the environment? -----------
const READINESS = resolve(REPO, "scripts/check-deploy-readiness.mjs");
const src = readFileSync(READINESS, "utf8").split("\n");
console.log("3) key-mode handling in scripts/check-deploy-readiness.mjs");
src.forEach((line, i) => {
  if (/sk_test_|sk_live_|LIVE|TEST/.test(line) && /stripe|sk_test|sk_live|mode/i.test(line)) {
    const n = String(i + 1).padStart(4);
    console.log(`   ${n}: ${line.trim()}`);
  }
});

// --- 4. The rest of the tree: any other sk_test_ / sk_live_ prefix logic ----
console.log("\n4) every sk_test_/sk_live_ prefix check in tracked scripts");
console.log("   (searched by the parent audit via ripgrep; see report for the list)");
