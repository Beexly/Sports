# The `node:test` Suites: What Gates a Commit, and What Does Not

**Date:** 2026-10-21
**Referenced by:** `.github/workflows/ci.yml` (the comment above the guardrail matrix)

---

## 1. The problem this closes

The prediction-engine vitest config's include patterns are `src/**/*.test.ts` and
`test/**/*.spec.ts`. **They do NOT collect `node:test` files.** So `npm test` skips every
`node:test` suite in the repository, and they have been sitting there looking like gates.

**Twenty suites — 322 assertions — had never gated a single commit.** They are now in CI
(commit `1b34940f8`), as a **matrix** so a failure names the suite that broke instead of
pointing at a wall of TAP output.

**The list in `ci.yml` is explicit, not globbed, on purpose.** A new guardrail suite is
*not* picked up automatically: a suite that fails on its first appearance should be added
here after it has been seen green, rather than silently becoming a gate the day it is
written.

## 2. The 20 suites now in CI

| suite | assertions |
|---|---|
| `scripts/ai/build-call-site-inventory.test.mjs` | 21 |
| `scripts/db/prune-usage.test.mjs` | 2 |
| `scripts/edge-lab/freeze-model-hash.test.mjs` | 5 |
| `scripts/factors/index.test.mjs` | 16 |
| `scripts/guardrails/commercial-copy-scan.test.mjs` | 8 |
| `scripts/guardrails/dependency-audit.test.mjs` | 38 |
| `scripts/guardrails/ingestion-source-clearance.test.mjs` | 18 |
| `scripts/guardrails/no-unsupported-performance-claims.test.mjs` | 13 |
| `scripts/guardrails/node-container-parity.test.mjs` | 11 |
| `scripts/guardrails/node-version-parity.test.mjs` | 10 |
| `scripts/guardrails/sealed-holdout-open-scan.test.mjs` | 2 |
| `scripts/guardrails/trust-gate.test.mjs` | 9 |
| `scripts/lib/node-runtime-pin.test.mjs` | 13 |
| `scripts/nova/convergence-inventory.test.mjs` | 16 |
| `scripts/nova/multihead-inventory.test.mjs` | 23 |
| `scripts/nova/nova-intelligence.test.mjs` | 30 |
| `scripts/nova/source-runtime.test.mjs` | 54 |
| `scripts/ops/cron-matrix-from-vercel.test.mjs` | 3 |
| `scripts/ops/free-auto-settle.test.mjs` | 28 |
| `scripts/__tests__/cv-no-synthetic-rng.test.mjs` | 2 |
| **total** | **322** |

Every one was run individually and exits 0 today. The counts are from the `node:test`
runner's `ℹ pass N` line — **note the `ℹ` prefix, not `#`**; the `#` form is a different
reporter, and matching the wrong one silently reports zero.

## 3. The suites NOT in CI, and why

### 3a. `apps/mobile/tests/*.test.js` — seven suites, and they are NOT broken

**They were never *failing*. They were never *built*.**

These are React Native **TypeScript source** tests. They import a **compiled CommonJS
build** from an absolute path:

```js
const trust = require("/tmp/gsebuild/lib/trust.js");
```

The build is produced by `apps/mobile/tsconfig.build.json` (`outDir: "/tmp/gsebuild"`,
`rootDir: "src"`, `module: "CommonJS"`), and `apps/mobile/scripts/verify.sh` **checks for
the build and SKIPS the suite when it is absent** rather than testing stale code:

```sh
if [ -d /tmp/gsebuild ] && [ -f /tmp/gsebuild/lib/trust.js ]; then
  node --test --test-concurrency=1 tests/*.test.js
else
  echo "   SKIPPED — no build in /tmp/gsebuild."
fi
```

**So the "7 red suites" reading was wrong.** Running `node --test` on them directly
without the build produces `Cannot find module '/tmp/gsebuild/lib/trust.js'` — a
**missing prerequisite**, not a failing assertion. The app's own pipeline treats it as a
skip.

**After building** (`node node_modules/typescript/bin/tsc -p apps/mobile/tsconfig.build.json`
— note the `outDir` is the POSIX path `/tmp/gsebuild`, which on Windows resolves to
`C:\tmp\gsebuild`), the suite runs:

```
ℹ tests 150
ℹ pass  145
ℹ fail    5
```

**145 of 150 pass.** The 5 that fail are **real, pre-existing failures** — and they are
**not** caused by this audit (`apps/mobile` is untouched by the audit branch; the last
commit to any of these files is `f251d230c`, 2026-10-17):

| test | failure |
|---|---|
| `client.test.js:320` | "a cache read requires an explicit budget — no default sneaks in" — `false !== true` |
| `client.test.js:356` | "a 200 with an ETag stores it and the NEXT stale read sends If-None-Match" — `TypeError: Cannot read properties of undefined (reading 'init')` |
| `client.test.js:381` | "a 304 returns the cached body, labelled as cached, with a RESET age" |
| `client.test.js` | "no If-None-Match is sent when the server never gave an ETag" |
| `format-entitlements.test.js` | "no module in the app may unlock data from an entitlement flag" — a **source-scan** guard |

**The 4 `client.test.js` failures share a shape**: the HTTP cache/ETag behaviour
(`If-None-Match`, 304 handling, cache budget) does not match what the test asserts, and
three of them fail with `Cannot read properties of undefined (reading 'init')` — an
**uninitialised cache handle**, which points at a *real* defect in the client rather than a
stale fixture.

**The 1 `format-entitlements` failure is a different kind of thing**: that test *scans the
source tree* for a module that unlocks data from an entitlement flag. It is a
**repo-wide source guard**, so it fails for reasons that have nothing to do with the mobile
app's own code.

### 3b. Why they are still not in CI

Three reasons, and only the first is about red:

1. **5 assertions genuinely fail.** A red suite is not a gate.
2. **The suite needs a build step**, and the build is not part of `npm test` at the root —
   it is an `apps/mobile`-local step with an **absolute POSIX `outDir`**. Wiring it into
   CI means making the build path portable (it is `/tmp/gsebuild`, a Linux-ism; on Windows
   it resolves to `C:\tmp\gsebuild`).
3. **`tsc` on that app is explicitly documented as unreliable on the host it was built
   on.** `apps/mobile/scripts/verify.sh` says it, in its own header:

   > *the TypeScript compiler is NOT a reliable gate. Measured here: … a ONE-FILE project
   > that imports react-native took 182s and was killed by the host's ~180s process cap,
   > **exiting 0 with EMPTY OUTPUT**. … A killed typecheck looks exactly like a passing
   > one. That is why this script does NOT treat `tsc` as the gate.*

   **That is worth reading before anyone adds a mobile build to CI** — it is the same
   family of failure as this audit's other findings: *a process that reports success
   without having done the work.*

### 3c. What to do about it

**The cheapest useful step** is to add the **build** to CI and let the suite run — 145 of
150 would then gate a commit, and the 5 failures would become visible rather than hidden.
The alternative, which is what the app's own `verify.sh` does, is to keep the suite
skipped and rely on the `lint-rules.js` invariant linter (which `verify.sh` treats as the
real gate) — see `apps/mobile/scripts/lint-rules.js`, and the `--self-test` mode that
proves the linter's rules fire.

**Do not add the mobile suite to CI as-is.** It would need the build step, the 5 failures
resolved, and a decision about the `tsc` reliability note above.

## 4. The other `node:test` suites, for completeness

`docs/calibration-proposals/evidence/verify-evidence.test.mjs` and
`packages/prediction-engine/src/reasoning/__tests__/mind-reasoning.mutation-v2.spec.ts`
were **already** in CI before this change — the latter with a comment explaining that
`vitest run` on it exits 1 with "No test files found" while `node --test` reports 11
passing tests. **That is the same collection gap, and it is now fixed for 20 more
suites.**

`scripts/vercel-skip-build.test.mjs` and
`scripts/guardrails/ai-transport-import-boundary.test.mjs` were also already in CI.

## 5. The general lesson

**A guard that CI never executes is not a gate.** It sits in the repository looking like
one, and it stays green while the behaviour it pins drifts.

This audit found the same thing in six other places, each a different mechanism:

| # | what | how it was decorative |
|---|---|---|
| 1 | the class-A guard | was crying wolf on a stale run log |
| 2 | the canonical AST | private to a script; the library's copy was not the same file |
| 3 | the 7.099 CRPS bar | in three documents, enforced in no code |
| 4 | the trust gate | had a marketing-surface hole; and 20 suites never ran |
| 5 | four `apps/web` surface tests | read source files a later change deleted; **three were born failing** |
| 6 | the G7 circuit breaker | the spec's rule halted 98.5% of *healthy* families — and the module that implemented it had no live importer |

**The check to run on any guard, before believing it:** *would this fail if the behaviour
it pins broke?* Every sweep in `packages/prediction-engine/reconciliation/` answers that
question by breaking the code on purpose and requiring a named test to go red.
