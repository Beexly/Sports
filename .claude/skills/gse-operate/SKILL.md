---
name: gse-operate
description: Continues Galaxy Sports Edge after LC-008 by correcting missed launch-critical work, proving live runtime/revenue truth, using Fable only for protected judgment, and building the Operational Epistemic Twin after release stability.
argument-hint: "[continue|status|runtime|revenue|fable-review|verify]"
---

# Mission

```text
MAXIMUM VERIFIED OPERATING VALUE PER TOKEN
NO FALSE STOPPING POINTS
NO GLOBAL-HEALTH CLAIM OVER A BROKEN CAPABILITY
NO PUBLIC PROMISE DRIFT
NO PROTECTED MONEY-TRUTH CHANGE WITHOUT FABLE-LEVEL REVIEW
IMPROVE, DO NOT REMOVE
```

Argument: `$ARGUMENTS`

- empty or `continue`: continue the corrected post-LC dependency graph;
- `status`: read-only live status, pending work, owner gates, credentials, CI, deploys, runtime errors, and next action;
- `runtime`: prioritize production reliability, memory, DB connections, health semantics, sentinel, and observability;
- `revenue`: prioritize legal/pricing/checkout/Stripe/entitlement consistency;
- `fable-review`: run only the protected high-judgment reviews defined below;
- `verify`: independently verify the current workstream and fix only confirmed findings.

# 0. Load the correction before acting

Read:

```text
reports/launch/POST_LC_CRITICAL_REVIEW.md
reports/launch/RELEASE_ACCEPTANCE.md
reports/launch/LAUNCH_BLOCKER_LEDGER.json
reports/launch/GATE_MATRIX.md
reports/launch/OWNER_ACTION_PACKET.md
```

Then refresh live reality:

```text
git status --short
git branch --show-current
git worktree list
git log -12 --oneline --decorate
git fetch --all --prune
gh pr view 128
gh pr view 130
gh pr view 122
gh pr list --state all --limit 200
```

Inspect current production deployment, Vercel runtime errors, health/proof endpoints, and current CI. Live code, production behavior, logs, database state, and provider dashboards outrank every report.

Never overwrite, stash, reset, clean, discard, rebase, or force-push another agent's active work.

# 1. Corrected queue law

LC-000 through LC-008 are completed work, not discarded work. Their stopping conclusion is superseded only where `POST_LC_CRITICAL_REVIEW.md` supplies fresh evidence.

Do not begin optional frontier backlog while a dependency-ready item below remains.

Priority order:

```text
OP-001  Refund/legal/public-copy convergence
OP-002  /nflverse cold-start OOM and shared snapshot architecture
OP-003  Capability-level health, Sentinel coverage, and runtime observability
OP-004  Provider-specific analytics configuration guards
OP-005  Complete browser/performance QA for dense-link routes
FV-001  Fable review of PR #122 money-truth and migration split
OP-006  Credentialed DB/Stripe/auth/secret owner actions
OP-007  Final release rebase and cross-PR adjudication
OP-008  Operational Epistemic Twin v0
```

Refresh priority when live evidence changes it. Security, money-truth, auth, entitlement, data loss, intermittent 500s, and public promise contradictions outrank optional features.

# 2. Permanent loop

For every workstream:

```text
REVIEW
→ FREEZE CONTRACT
→ IMPLEMENT
→ TARGETED TEST
→ INDEPENDENT REVIEW
→ IMPROVE
→ POLISH
→ FINAL VERIFY
→ UPDATE LEDGERS
→ COMMIT / PUSH / PR
→ OBSERVE LIVE OR PREVIEW BEHAVIOR
→ SELECT NEXT
→ CONTINUE
```

Freeze before editing:

```text
WORKSTREAM
WHY NOW
USER / BUSINESS VALUE
FRESH EVIDENCE
CURRENT IMPLEMENTATION
CANONICAL OWNER
RECOVERABLE ASSETS
FILES / SYMBOLS
PROTECTED ZONES
ACCEPTANCE CRITERIA
TESTS
LIVE/PREVIEW OBSERVATION PLAN
ROLLBACK
EXCLUSIONS
```

# 3. OP-001 — Revenue Contract convergence

Port only the bounded DEC-050 slice from frozen PR #129 onto a clean branch from current `main`:

- 3-day refund wording in Terms;
- founding-rate grandfather promise in Terms;
- stale 7-day public/runtime trust claims changed to 3-day;
- legal last-updated date;
- regression scan ensuring Terms, pricing metadata/FAQ, trust registry, homepage reassurance, gated panels, and checkout-facing copy agree.

Do not bulk-merge PR #129. Do not invent a new refund policy. Compile public copy from the already-promised 3-day policy unless the founder explicitly changes that policy.

Use Sonnet for implementation. Protected review focuses on legal/revenue promise consistency, not stylistic rewriting.

# 4. OP-002 — `/nflverse` resource correctness

Treat the live intermittent OOM as P1 production reliability.

Current cold path duplicates full-history nflverse work. Build one canonical shared layer rather than local fixes in three loaders.

Required properties:

- single-flight per artifact/revision within a runtime;
- no duplicate concurrent fetch/decompress/parse of the same artifact;
- bounded memory and explicit artifact size limits;
- failure is not cached as success;
- partial report failure does not crash the entire route;
- source URLs, rights, revision/freshness, and errors remain visible;
- request-time page rendering should consume precomputed/materialized summaries when possible;
- no fake rows or silent stale substitution;
- deterministic tests prove fetch counts and cold-start behavior;
- a stress test or instrumented fixture proves the old duplicate-work shape and the new bounded shape;
- route-level synthetic coverage is added to Sentinel.

Use Fable once to freeze the architecture if multiple canonical ownership paths exist. Use Sonnet to implement.

Do not solve this only by requesting a larger Vercel memory tier.

# 5. OP-003 — Operational truth, not one green endpoint

Improve health and monitoring so Galaxy can represent capability state.

At minimum:

- preserve service readiness semantics;
- add capability-level states for high-value routes/engines;
- distinguish healthy, degraded, stale, unavailable, proof-gated, owner-gated, and unknown;
- capture deployment SHA and observation time;
- include `/nflverse` and other expensive public routes in bounded canaries;
- correlate synthetic failure with runtime errors when access exists;
- make absence of coverage non-green;
- create an exact Sentry/OTel configuration owner packet if credentials remain unavailable;
- no raw DB hosts, secrets, or stack traces in public health responses.

The current `observability: not wired (no DSN)` state is not an acceptable permanent operating posture.

# 6. OP-004 — Analytics provider honesty

Render each analytics provider only when:

```text
master analytics flag is enabled
AND that provider's own identifier is present and validated
```

Cloudflare and Clarity must fail independently. Missing one token must not emit a malformed request or disable the other valid provider. Add server/render tests. Never fabricate identifiers.

# 7. OP-005 — Dense-route browser and performance pass

Re-run `/`, `/tools`, and `/track` using a resource-aware browser strategy.

Measure:

- number of automatic prefetch requests;
- transfer size;
- memory pressure;
- main-thread long tasks;
- keyboard and landmark behavior;
- 320/375/768/1440 widths;
- text zoom;
- reduced motion;
- console/network errors.

If dense link prefetch causes unnecessary resource amplification, disable or stage prefetch selectively and prove navigation remains responsive. Do not dismiss the prior Chromium crashes as irrelevant without measurement.

# 8. FV-001 — Fable-only PR #122 review

Do not delegate the core judgment to Sonnet.

Fable must independently derive:

1. Whether home and away moneyline implied-probability dispersion can differ under actual vigged American odds.
2. Whether current `main` captures the published side's disagreement.
3. Whether `bookDisagreementAtLock` is currently persisted write-once.
4. Which PR #122 concerns are independent: side-aware helper, pick capture, schema, migration safety, Pedersen aggregate, verify API.
5. The exact migration prerequisites and pre-/post-migration behavior.
6. Whether any model-version or public-claim semantics change.

Required output:

```text
CONFIRMED BUGS
DISPROVEN CLAIMS
SPLIT PLAN
MIGRATION PLAN
TEST MATRIX
OWNER GATES
ROLLBACK
```

Sonnet may implement only after Fable freezes the contract. A second Fable pass performs final protected-zone adjudication before release.

# 9. Owner/credential work

Never hide external work behind "blocked." Keep exact packets current for:

- merge PR #128;
- canonical auth env + Google callback;
- Odds API fingerprint comparison/rotation;
- Stripe business tax ID;
- Stripe test-mode lifecycle;
- Neon `DIRECT_URL` and migration-ledger reconciliation;
- Model Journal publication ceremony.

Continue every non-blocked engineering path. Never print secrets or tax IDs.

# 10. Final release adjudication

Do not merge PR #130 until:

- PR #128 is landed or its fix is included without duplication;
- OP-001 through OP-005 are resolved or independently disproven;
- CI is green from the final rebased state;
- production DB and Stripe credentialed checks are complete or the release is explicitly scoped to exclude them with founder acceptance;
- Fable adjudicates PR #122 and the final cross-PR release set;
- browser, runtime, sentinel, and rollback evidence are current;
- every public promise matches actual configuration and behavior.

Use focused PRs from current `main`; do not turn PR #130 into another unbounded recovery branch.

# 11. Operational Epistemic Twin v0

Only after release truth is stable, build the first thin vertical slice.

Canonical object:

```text
CapabilityState
  capabilityId
  observedAt
  codeRevision
  deploymentRevision
  status
  reason
  dependencies
  freshness
  latency
  errorRate
  resourceEnvelope
  rightsState
  entitlementState
  proofState
  revenueImpact
  currentGate
  nextResolvingAction
  evidenceRefs
```

First consumers:

- internal Cockpit capability map;
- Nightly Sentinel artifact;
- agent planning guard (agents cannot act as if unavailable capability is healthy);
- honest public/degraded projections where appropriate.

This is not a new parallel health store. It composes current health, source, gate, proof, entitlement, deployment, and runtime evidence behind one canonical contract.

# 12. Model routing

```text
Fable:
  PR #122 protected reasoning
  shared-snapshot architecture only if canonical ownership is ambiguous
  final cross-PR release adjudication
  Operational Epistemic Twin contract/red-team

Sonnet:
  focused implementation
  tests
  legal/copy convergence
  analytics guards
  sentinel/health wiring
  browser QA and performance fixes

Haiku/scout:
  exact file/symbol/branch mapping only
```

Fable does not grep, write boilerplate, watch CI, or dump logs.

# 13. Stop condition

Stop only when every remaining item is one of:

```text
OWNER_ACTION_READY
CREDENTIAL_BLOCKED_WITH_EXACT_PACKET
PROOF_GATED_WITH_MEASURABLE_THRESHOLD
EXTERNAL_BLOCKER
INTENTIONALLY_DEFERRED_WITH_REENTRY_CONDITION
```

Return a compact receipt:

```text
LIVE BASELINE
CORRECTIONS TO PRIOR RECORD
WORK COMPLETED
RUNTIME STATUS
REVENUE STATUS
FABLE FINDINGS
CI / DEPLOY / PRS
OWNER ACTIONS
DEFERRED CAPABILITIES + WHY
NEXT EXACT ACTION
TOKEN DISCIPLINE
```
