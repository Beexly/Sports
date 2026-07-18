---
name: gse-launch
description: Drives Galaxy Sports Edge from a drained development queue through production truth capture, release convergence, revenue-path proof, unattended sentinel coverage, safe gate opening, owner activation, deployment qualification, and post-launch monitoring.
argument-hint: "[continue|status|verify|owner-packet]"
---

# Mission

Move Galaxy Sports Edge toward one running, observable, revenue-capable production system while preserving every useful capability and refusing fabricated readiness.

Optimization target:

```text
MAXIMUM VERIFIED PRODUCT AND REVENUE CAPABILITY PER TOKEN
ZERO UNVERIFIED PASSES
ZERO PAYWALL OR TRUST REGRESSIONS
ZERO INVISIBLE USEFUL WORK
ZERO UNSAFE GATE OPENINGS
ZERO UNSUPPORTED PAID PROMISES
```

Argument: `$ARGUMENTS`

- empty or `continue`: continue the launch campaign from live state;
- `status`: perform a read-only production, revenue, queue, release, and gate projection;
- `verify`: independently audit the current launch slice and repair confirmed findings;
- `owner-packet`: refresh only the exact external founder actions, ordering, validation, and rollback.

# Canonical launch package

Read in this order:

1. `docs/genesis/PRODUCTION_ACTIVATION_CONTRACT.md` — canonical campaign authority and L0-L11 sequence;
2. `docs/genesis/LAUNCH_GATE_MATRIX.json` — machine-readable current gate authority;
3. `docs/genesis/LIVE_PRODUCTION_BASELINE_2026-07-18.md` — historical evidence seed; refresh every observation;
4. `docs/genesis/LAUNCH_REVENUE_CONVERGENCE_CONTRACT.md` — requirements appendix adding paid-promise, release-manifest, sentinel-receipt, and post-launch acceptance detail; it does not create a competing queue;
5. compact frontier queue/state/decision/recovery files and only the code/tests for the selected slice.

Do not load the complete Genesis canon by default.

# Queue-first boundary

Do not begin launch convergence until the active queue is drained under `gse-autopilot`, except that a verified live P0/P1 correctness, security, settlement, billing, legal/revenue-truth, or outage defect may take priority immediately after the current atomic work is safely completed.

At campaign start:

```text
git status --short
git branch --show-current
git worktree list
git fetch --all --prune
git log -8 --oneline origin/main
gh pr list --state all --limit 200
```

Never stash, reset, clean, overwrite, rebase, discard, or force-push another agent's active work. Use clean worktrees and one writer per branch.

Before leaving L0, prove:

```text
no partially implemented current workstream remains
no dependency-ready IN_PROGRESS / QUEUED / NEXT task was skipped
all completed items have review, polish, tests, ledgers, commit, push, and PR state
all active worktrees are clean or explicitly parked
branch/accounting totals and canonical ledgers agree
```

The 2026-07-18 seed reported 114 of 138 long-tail branches evidenced and 24 sensitive branches remaining under task #74. Treat that as a lead, not current truth.

# Establish production reality

Use approved read-only production tools to verify:

```text
Vercel production deployment ID, SHA, state, aliases, age, and runtime errors
canonical host and redirects
/api/health
/api/auth/providers
/pricing, /faq, /terms, /privacy, /how-we-make-money
/api/proof/ledger, receipts, verification spec, OpenAPI, llms.txt
robots and sitemaps
critical public and paid surfaces
analytics configuration and real event arrival
cron, ingestion, settlement, and data freshness
```

Never print or persist secret values. Current code, deployment evidence, tests, provider state, and Git history outrank old reports.

# Phase selector

Select the first incomplete dependency-ready canonical phase:

```text
L0 queue-drain receipt
L1 production truth baseline
L2 repository-native nightly sentinel
L3 revenue readiness and paid-promise matrix
L4 Stripe test-mode and entitlement end-to-end proof
L5 production drift and public-claim reconciliation
L6 bounded release-candidate convergence
L7 full release qualification
L8 owner activation packet
L9 safe gate-opening matrix
L10 controlled production deployment — explicit founder authorization required
L11 post-launch revenue and reliability loop, including 24-hour and 7-day receipts
```

Execute one coherent bounded slice at a time. For `continue`, proceed automatically to the next dependency-ready slice after durable completion unless a hard boundary requires founder action.

# Mandatory loop

```text
REVIEW
→ FREEZE CONTRACT
→ CODE
→ TARGETED TEST
→ INDEPENDENT REVIEW
→ IMPROVE
→ POLISH
→ FINAL VERIFY
→ UPDATE LEDGERS / REPORTS / GATES
→ COMMIT / PUSH / PR
→ SELECT NEXT
→ CONTINUE
```

Before editing, freeze:

```text
PHASE / WORKSTREAM
WHY NOW
USER / REVENUE / SYSTEM VALUE
CURRENT PRODUCTION REALITY
CURRENT REPOSITORY REALITY
RECOVERABLE ASSETS
CANONICAL OWNER
FILES / SYMBOLS EXPECTED
PROTECTED ZONES
ACCEPTANCE CRITERIA
VERIFICATION COMMANDS
ROLLBACK
OWNER GATES
EXPLICIT EXCLUSIONS
```

Use one read-only verifier after the first green implementation. Billing, entitlements, settlement, CLV, calibration, proof, claims, rights, migrations, security, or production-adjacent work also receives an independent red-team pass.

# Review standard

Inspect only the paths, tests, deployments, provider evidence, PRs, and branch assets needed for the selected slice.

Search for:

- production commit drift;
- health, cron, ingestion, settlement, or freshness gaps;
- auth host or callback mismatch;
- checkout, webhook, entitlement, cancellation, refund, and grandfathering failures;
- analytics scripts rendered without valid configuration;
- public and paid promises unsupported by production behavior;
- proof/publication copy outrunning its gate;
- duplicate canonical systems;
- branch work absent from the release candidate;
- migrations or flags without safe activation and rollback;
- sentinel gaps, false passes, or absent coverage;
- secret exposure and external-action risk;
- vacuous tests and stale green evidence.

# Implementation law

- Recover before rebuilding.
- Preserve the Free teaser and server-side paid boundaries.
- Preserve source-rights, evidence, bitemporal, settlement, CLV, calibration, proof, billing, entitlement, and public-claim invariants.
- Prefer deterministic read-only probes, fixtures, receipts, and explicit status matrices.
- Never label absent coverage as healthy.
- Correct copy to match reality rather than opening an unsafe gate to satisfy copy.
- Never bulk merge the active frontier branch.
- Every paid sentence must become `PROVEN`, `WITHHELD`, `OWNER_GATE`, or `CLOSED_BY_DESIGN`.
- Do not perform a real charge, refund, production migration, dashboard configuration, DNS/OAuth change, or production deployment without explicit founder authorization.

# Gate doctrine

`docs/genesis/LAUNCH_GATE_MATRIX.json` uses:

```text
PASS
PARTIAL
FAIL
UNKNOWN
BLOCKED
OWNER_GATE
EVIDENCE_GATED
CLOSED_BY_DESIGN
NOT_APPLICABLE
```

A successful launch does not require every flag to be true. It requires:

```text
all eligible operational and revenue gates PASS
all evidence gates PASS or CLOSED_BY_DESIGN / EVIDENCE_GATED honestly
all owner gates reduced to exact executable packets
no launch-critical UNKNOWN
no hidden blocker
```

Never weaken a performance, calibration, proof-ledger, model-version, rights, legal, or source-purpose threshold to produce launch optics.

# Revenue proof

Before recommending production billing activation, prove in test mode:

```text
Google sign-in and canonical callback
pricing and tier truth
Terms consent and recurring disclosure
checkout success and cancel paths
webhook signature and idempotency
out-of-order and replay safety
subscription-state convergence
entitlement grant and revocation
post-checkout and scheduled reconciliation
portal, cancellation, refund, and restore
grandfathered price preservation
Free/Fantasy/Pro/Elite server-side access matrix
rate limiting and denial-of-wallet protections
no secret or payment-data logging
revenue-funnel event arrival
```

A plan card, fixture, or webhook unit test alone is not end-to-end proof.

# Sentinel proof

The nightly sentinel must be repository-native and unattended. It must use public read-only HTTP, a strict canonical-host allowlist, timeouts, bounded retries, response-size limits, known-answer cryptographic verification, JSON/Markdown artifacts, and visible failure on absent coverage.

It must check production truth, proof endpoints, receipt hashes, known-answer vectors, robots/sitemaps, critical pages, claim hygiene, pricing/Terms consistency, analytics misconfiguration, and release identity where available.

Require two consecutive scheduled green runs before final launch completion. A runner/network/permission failure is coverage failure, never a site pass.

# Release and production proof

- Build a bounded release candidate from current main and reviewed slices; PR #129 remains a recovery container, not the release candidate.
- Record exact source commits and exclusions in a release manifest.
- Run the complete applicable repository gate chain on one final candidate commit.
- Require stable preview evidence for that exact commit.
- Production truth is commit-addressed; post-deploy evidence must name the actual deployed commit.
- Capture rollback before deployment.

# Verification

Use targeted tests while coding. At final state run each applicable gate once:

```text
focused tests
relevant workspace tests
full suite when required
typecheck
lint --max-warnings=0
applicable guardrails and eval contracts
git diff --check
secret scan
Prisma validate and shadow-database checks when applicable
production build
browser/mobile/a11y/reduced-motion/keyboard/text-zoom QA
read-only preview and production probes
```

Never inherit a green result from an earlier commit.

# Owner gates

Record external actions as:

```text
OWNER_GATE
Decision:
Why founder authority is required:
Exact owner action:
Safe non-destructive default:
Work completed around the gate:
Validation after action:
Rollback:
Re-entry condition:
```

Complete every autonomous precondition first. Likely owner-controlled actions must be reverified and may include:

- valid Galaxy Sports Network tax identity and Stripe payout readiness;
- Stripe Terms URL, live product/price IDs, webhook endpoint, signing secret, and events;
- Google OAuth canonical callback;
- Vercel canonical URLs and valid analytics identifier;
- reviewed production migrations;
- bounded PR/release merge order;
- production deployment;
- one controlled live purchase/refund smoke test;
- evidence-gated proof/performance publication decisions.

# Durable completion

After each slice:

- update launch reports, gate matrix, current-state/queue/decision/recovery ledgers, and owner packet;
- commit coherently;
- push with retry/backoff;
- create or update the correct draft PR;
- record exact evidence and limitations;
- select the next dependency-ready slice and continue.

For launch completion require:

- approved release commit deployed;
- all eligible gates passed;
- no critical unknown;
- test-mode revenue lifecycle proven and owner-approved live evidence captured;
- two scheduled sentinel passes;
- 24-hour and 7-day post-launch receipts;
- or every remaining path is genuinely owner/external blocked with an exact packet.

# Final receipt

Return only:

```text
PRODUCTION BASELINE
QUEUE DRAIN
WORKSTREAM COMPLETED
VALUE ADDED
RELEASE CANDIDATE
LIVE SITE HEALTH
AUTH STATUS
PAID PROMISE PARITY
REVENUE PATH STATUS
SENTINEL STATUS
ENGINE OPERATIONS
GATES OPENED
GATES CORRECTLY HELD
CLAIMS RECONCILED
VERIFICATION
PRODUCTION DEPLOYMENT
24H / 7D OBSERVATION
BRANCH / PR
OWNER GATES
BLOCKERS
NEXT EXACT ACTION
TOKEN-DISCIPLINE RECEIPT
```
