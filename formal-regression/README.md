# W2-03 — property-based + chaos-style regression harness

Branch `labs/w2-03-property-chaos-harness`, worktree
`/workspace/wt/property-chaos-harness`. Additive-only lab work; builds on
W2-02's TLA+ specs at `/workspace/wt/formal-invariant-foundry/formal/`
(branch `labs/w2-02-formal-invariant-foundry`).

## What this is

`fast-check` property-based tests, run with `vitest`, against the invariants
formalized in W2-02's TLA+ specs:

- `AtMostOneClaimOwner`
- `AtMostOneExternalDispatchPerAttempt`
- `SameIdDifferentFingerprintNeverExecutes`
- `AmbiguousAttemptStopsFallback`
- the flagship no-double-spend property (`NeverOverAdmit` /
  `LedgerNeverExceedsBalance`)

The primary subject under test is the **REAL, unmodified** production code:

- `createPgControlStore` from
  `/workspace/wt/pr163/apps/web/lib/ai-control-plane/control-store.ts`
  (branch `feat/ai-control-plane-ledger`), imported directly.
- `createPgCreditAuthorizationPort` from
  `/workspace/wt/prd/apps/web/lib/ai-control-plane/credit-admission.ts`
  (branch `feat/ai-control-plane-credit-admission`), imported directly,
  including its real S1 admissibility dependency `@/lib/opportunity-engine`
  (aliased in `vitest.config.ts` to the real `prd` worktree).

Neither file is modified. This harness only supplies **test-double SQL
adapters** (`src/adapters/in-memory-control-sql.ts`,
`src/adapters/in-memory-credit-ledger.ts`) implementing the exact
`ControlSqlClient` / `CreditLedgerDb` seams those real modules already
depend on for testability — the same seams a real `pg`/Prisma client would
fill in production.

A small, independently-written **reference/test-double model**
(`src/reference/claim-reference.ts`, `src/reference/credit-reference.ts`)
additionally cross-checks the same coarse invariants, per the task's request
for a standalone reference implementation.

## Running

```
npm install
npm test              # full suite, Docker-independent tests only
npm run typecheck      # tsc --noEmit, strict mode, no `any`
CHAOS_LIVE=1 npm test   # additionally runs the real Docker+Toxiproxy suite
node scripts/chaos-toxiproxy.mjs   # standalone chaos smoke script (no vitest)
```

## Chaos / fault injection

**Docker + Toxiproxy status: available in this environment**, but the
daemon was not running by default and required manually starting `dockerd`
(no systemd; started as a background process) before any `docker` command
worked. Once started, both `ghcr.io/shopify/toxiproxy:2.9.0` and
`ghcr.io/mccutchen/go-httpbin:v2.15.0` pulled successfully and
`docker compose -f docker/docker-compose.chaos.yml up -d` worked normally.
Given that, real network chaos IS exercised (`src/tests/chaos-network.integration.test.ts`,
gated behind `CHAOS_LIVE=1` since a review environment may not have Docker
available) — a real HTTP round trip through a real Toxiproxy proxy, with
`timeout` and `reset_peer` toxics, wired directly to the real
`control-store.ts` claim/attempt calls.

Toxiproxy cannot reach every boundary the task asks about (a DB commit that
succeeds but the caller process crashes before reacting to it; a restart;
an outbox drain). Those are covered by deterministic, code-level fault
injection instead (`src/tests/chaos-deterministic-fault-injection.test.ts`),
using controllable one-shot/always-on fault hooks on the SQL adapters
(`faultBeforeQuery`, `faultInTransaction`). The "during outbox delivery"
boundary is explicitly marked out of scope (documented, not silently
skipped): neither `control-store.ts` nor `credit-admission.ts` (the two
real modules this harness imports) has an outbox/evidence-drain concept —
`recovery-drainer.ts` exists in the real package but is a separate module
this harness does not import or exercise.

## Discovered counterexamples

One counterexample was found by these property tests during development,
against the **reference model** (not the real production code) — see
`reports/formal-counterexamples/reference-model-fingerprint-ordering.json`
for the minimized repro and root cause. It was not a safety violation (both
outcomes it produced correctly refuse the mismatched-fingerprint request);
it was an overly strict test assertion about which outcome label to expect.
Fixed and turned into a permanent regression test
(`src/tests/reference-model.property.test.ts`).

No counterexamples were found against the REAL `control-store.ts` or
`credit-admission.ts` code across all runs of this suite.

## What this harness does NOT cover

- Liveness properties (out of scope, matches W2-02).
- The multi-window fixed-order budget transaction (`budget.ts`) and the
  snapshot-admissibility state machine's full surface beyond what
  `evaluateCreditAdmission`/`admitCreditFunded` exercise — W2-02 scoped
  these out too.
- Outbox/evidence-drain delivery faults (no such module is imported here).
- A real Postgres backend for `ControlSqlClient`/`CreditLedgerDb` — those
  are exercised against real Postgres elsewhere in the codebase (per
  `control-store.ts`'s own docstring, pointing at
  `apps/web/__tests__/ai-control-plane-claim-pg.integration.test.ts`, and
  `credit-admission.ts`'s docstring, pointing at its own "100 concurrent
  authorize()" acceptance test) — this harness's adapters are an honest,
  clearly-labeled in-memory stand-in for THOSE seams, used here for
  property-based/randomized concurrent testing at a scale (numRuns × N
  concurrent racers) that would be slow against a real database in CI.
