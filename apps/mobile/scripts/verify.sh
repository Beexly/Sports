#!/bin/sh
# verify.sh — the verification pipeline for this app.
#
# ══════════════════════════════════════════════════════════════════════════════
#  READ THIS BEFORE TRUSTING A GREEN RUN.
# ══════════════════════════════════════════════════════════════════════════════
#
# On the iSH/Alpine host this project was built on, the TypeScript compiler is
# NOT a reliable gate. Measured here:
#
#   · Early in the session, `tsc` reported real errors correctly.
#   · Later, a ONE-FILE project that imports react-native took 182s and was
#     killed by the host's ~180s process cap, exiting 0 with EMPTY OUTPUT.
#   · The same happened with `--ignoreConfig` on a single broken file, and with
#     a detached process. It is not a piping artefact and not fixable with
#     UV_THREADPOOL_SIZE or the Node compile cache.
#
# A killed typecheck looks exactly like a passing one. That is why this script
# does NOT treat `tsc` as the gate. The gate is:
#
#   1. `scripts/lint-rules.js --self-test`  — proves the linter's rules FIRE
#   2. `scripts/lint-rules.js`              — the invariants, over every file
#   3. `node --test`                        — the pure-logic suite (real asserts)
#   4. `tsc`                                — attempted, and its absence is reported
#
# Step 1 exists because step 3's sibling (the typechecker) silently passed while
# dead. No check here is trusted until it can show it detects a known-bad input.
#
# Usage:
#   sh scripts/verify.sh            # full
#   sh scripts/verify.sh quick      # lint + tests, skip the tsc attempt
set -e

cd "$(dirname "$0")/.."
# Toolchain resolution: local install first, shared toolchain second. The host
# this was built on could not `npm install` react-native, so the SDK 57 type set
# lives outside the project there; on a normal machine node_modules wins.
if [ -n "$GSE_TSC" ]; then
  TSC_BIN="$GSE_TSC"
elif [ -f "node_modules/typescript/bin/tsc" ]; then
  TSC_BIN="node_modules/typescript/bin/tsc"
else
  TSC_BIN="/opt/gsetools/node_modules/typescript/bin/tsc"
fi
FAIL=0

echo "── 1/4  linter self-test (do the rules actually fire?) ─────────────"
if node scripts/lint-rules.js --self-test; then
  echo "   ok"
else
  echo "   FAILED — the linter cannot detect a known-bad input, so step 2 means nothing"
  FAIL=1
fi

echo "── 2/4  invariant lint (all source files) ──────────────────────────"
if node scripts/lint-rules.js; then
  echo "   ok"
else
  echo "   VIOLATIONS FOUND (see above)"
  FAIL=1
fi

echo "── 3/4  pure-logic test suite ──────────────────────────────────────"
# The suite runs against the last successful CommonJS build in /tmp/gsebuild.
# Rebuilding it needs tsc, which may be unavailable here — so the script checks
# for a stale build and says so rather than silently testing old code.
if [ -d /tmp/gsebuild ] && [ -f /tmp/gsebuild/lib/trust.js ]; then
  if node --test --test-concurrency=1 tests/*.test.js; then
    echo "   ok"
  else
    echo "   FAILED"
    FAIL=1
  fi
  echo "   NOTE: tests ran against /tmp/gsebuild. If src/lib changed since that"
  echo "         build, re-run the build step below on a host with a working tsc."
else
  echo "   SKIPPED — no build in /tmp/gsebuild."
  echo "         Run: tsc -p tsconfig.build.json   (needs a working compiler)"
fi

if [ "$1" != "quick" ]; then
  echo "── 4/4  typecheck (best effort on this host) ───────────────────────"
  if [ -x "$TSC_BIN" ] || [ -f "$TSC_BIN" ]; then
    node "$TSC_BIN" -p "$PWD/tsconfig.core.json" > /tmp/tsc-attempt.txt 2>&1 || true
    if grep -q "error TS" /tmp/tsc-attempt.txt; then
      echo "   DIAGNOSTICS:"; cat /tmp/tsc-attempt.txt
      FAIL=1
    else
      echo "   no diagnostics — BUT see the header: on this host that may mean"
      echo "   the process was killed at ~180s rather than that the code is clean."
      echo "   Treat this step as informational, not as a gate."
    fi
  else
    echo "   SKIPPED — no compiler at $TSC_BIN"
  fi
fi

echo
if [ "$FAIL" -eq 0 ]; then
  echo "VERIFY: passed (steps 1-3 are the gate; step 4 is informational)"
else
  echo "VERIFY: FAILED"
  exit 1
fi