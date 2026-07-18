---
name: gse-launch
description: Drives Galaxy Sports Edge from a drained development queue through production truth capture, release convergence, revenue-path proof, sentinel repair, safe gate opening, owner activation, deployment qualification, and post-launch monitoring.
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
```

Argument: `$ARGUMENTS`

- empty or `continue`: continue the launch campaign from live state;
- `status`: perform a read-only production/revenue/queue status projection;
- `verify`: independently audit the current launch slice and repair confirmed findings;
- `owner-packet`: refresh only the exact external founder actions and validation steps.

# Binding contract

Read `docs/genesis/PRODUCTION_ACTIVATION_CONTRACT.md` as campaign law.

Do not begin the launch campaign until the active queue is drained under `gse-autopilot`. If dependency-ready current work remains, return to that queue and complete it first.

# Establish current reality

Run concise local and GitHub checks:

```text
git status --short
git branch --show-current
git worktree list
git fetch --all --prune
git log -8 --oneline origin/main
gh pr list --state all --limit 200
```

Use approved read-only production tools to verify:

```text
Vercel production deployment ID, SHA, state, aliases, and runtime errors
custom-domain root
/api/health
/api/auth/providers
/pricing
/api/proof/ledger
proof contracts, robots, sitemaps, llms.txt, and critical pages
```

Never print or persist secret values. Current code, deployment evidence, provider state, tests, and Git history outrank old reports.

# Phase selector

Select the first incomplete dependency-ready phase:

```text
L0 queue-drain receipt
L1 production truth baseline
L2 repository-native nightly sentinel
L3 revenue readiness matrix
L4 Stripe test-mode and entitlement end-to-end proof
L5 production drift and public-claim reconciliation
L6 bounded release-candidate convergence
L7 full release qualification
L8 owner activation packet
L9 safe gate-opening matrix
L10 controlled production deployment — explicit founder authorization required
L11 post-launch revenue and reliability loop
```

Execute exactly one coherent phase or bounded vertical slice at a time, but continue automatically to the next dependency-ready slice after durable completion unless a hard boundary requires founder action.

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
→ UPDATE LEDGERS
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

# Review standard

Inspect only the paths, tests, deployments, provider configuration evidence, and PRs needed for the selected slice.

Search for:

- production commit drift;
- health or ingestion gaps;
- auth host mismatch;
- checkout, webhook, entitlement, cancellation, refund, and grandfathering failures;
- analytics scripts rendered without valid configuration;
- public promises not supported by production behavior;
- proof/publication copy that outruns the publication gate;
- duplicate canonical systems;
- active branch work absent from the release candidate;
- migrations or feature flags lacking a safe activation path;
- sentinel gaps or false passes;
- secret exposure and external-action risk.

# Implementation law

- Recover before rebuilding.
- Preserve the Free teaser and server-side paid boundaries.
- Preserve source-rights, evidence, bitemporal, settlement, CLV, calibration, proof, billing, and public-claim invariants.
- Prefer deterministic read-only probes, fixtures, receipts, and explicit status matrices.
- Never label absent coverage as healthy.
- Correct public copy to match reality rather than opening an unsafe gate to satisfy copy.
- Never bulk merge the active frontier branch.
- Do not perform a real charge, refund, production migration, dashboard configuration, DNS change, OAuth change, or production deploy without explicit founder authorization.

# Gate doctrine

Classify every gate:

```text
LAUNCH_SAFE
EVIDENCE_ACCRUAL
RIGHTS_LEGAL_OR_HIGH_RISK
```

`LAUNCH_SAFE` gates may open only after end-to-end proof, owner configuration, monitoring, and rollback exist.

`EVIDENCE_ACCRUAL` gates remain closed until live data satisfies their existing threshold. Do not lower the threshold.

`RIGHTS_LEGAL_OR_HIGH_RISK` gates remain closed until the appropriate rights, legal, security, jurisdictional, or founder review exists.

# Revenue proof

Before recommending production billing activation, prove in test mode:

```text
Google sign-in and canonical callback
pricing and tier truth
Terms consent and recurring disclosure
checkout session creation
webhook signature and idempotency
out-of-order event safety
entitlement grant and revocation
post-checkout and scheduled reconciliation
portal and cancellation
refund-window operating process
grandfathered price preservation
Free/Fantasy/Pro/Elite server-side access matrix
rate limiting and denial-of-wallet protections
no secret or payment-data logging
```

# Sentinel proof

The nightly sentinel must be repository-native and unattended. It must use public read-only HTTP, explicit timeouts, bounded retries, known-answer cryptographic verification, artifacts, and visible failure on absent coverage. It must not depend on interactive Claude WebFetch permission.

# Verification

Use targeted tests during implementation. At final state run each applicable gate once:

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
browser/mobile/a11y QA for user-facing changes
read-only production probe for live behavior
```

Do not inherit a green result from an earlier commit.

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

Continue every non-blocked path.

Likely owner-controlled actions must be reverified and may include:

- valid Galaxy Sports Network tax identity and Stripe payout readiness;
- Stripe Terms URL, live product/price IDs, webhook endpoint, signing secret, and event selection;
- Google OAuth callback and canonical `www` host;
- Vercel environment values including the real analytics project ID;
- production migration approval;
- bounded PR merge order;
- production deployment;
- one controlled live purchase/refund smoke test.

# Durable completion

After each slice:

- update launch reports, current-state/queue/decision/recovery ledgers, and owner packet;
- commit coherently;
- push with retry/backoff;
- create or update the correct draft PR;
- record the exact evidence and remaining limits;
- select the next dependency-ready slice and continue.

Stop only when every remaining path is truly owner-gated, externally blocked, or impossible to verify with available tools.

# Final receipt

Return only:

```text
PRODUCTION BASELINE
QUEUE DRAIN
WORKSTREAM COMPLETED
VALUE ADDED
LIVE SITE HEALTH
AUTH STATUS
REVENUE PATH STATUS
SENTINEL STATUS
GATES OPENED
GATES CORRECTLY HELD
CLAIMS RECONCILED
VERIFICATION
BRANCH / PR
OWNER GATES
BLOCKERS
NEXT EXACT ACTION
TOKEN-DISCIPLINE RECEIPT
```
