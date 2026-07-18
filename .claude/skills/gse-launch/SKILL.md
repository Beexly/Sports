---
name: gse-launch
description: Converges Galaxy Sports Edge from verified recovery work into a running production website, proven revenue lifecycle, healthy data engine, unattended monitoring, and focused release PRs. Use after active in-flight work is complete.
argument-hint: "[continue|status|production|revenue|verify]"
---

# Mission

Turn the verified work already accumulated across `main`, PR #129, and the open recovery PRs into a coherent, operating Galaxy Sports Edge business.

Optimization target:

```text
MAXIMUM VERIFIED PRODUCTION AND REVENUE CAPABILITY PER TOKEN
ZERO AUTONOMOUS P0/P1 BLOCKERS
ZERO INVISIBLE OR DUPLICATED WORK
ZERO UNSUPPORTED GATE ACTIVATIONS
EVERY OWNER ACTION EXACT, REVERSIBLE, AND FREE OF HIDDEN ENGINEERING
```

Argument: `$ARGUMENTS`

- empty or `continue`: execute the highest-leverage dependency-ready launch workstream and continue;
- `status`: read-only production, revenue, queue, branch, PR, gate, and owner-action report;
- `production`: prioritize production/deployment/data/monitoring convergence;
- `revenue`: prioritize the Stripe test-mode revenue canary and conversion blockers;
- `verify`: independently verify the current launch workstream and repair only confirmed findings.

# 0. Establish exact live state

Run concise checks first:

```text
git status --short
git branch --show-current
git worktree list
git log -10 --oneline --decorate
git fetch --all --prune
gh pr list --state all --limit 200
```

Refresh current `main`, PR #129, CI, deployments, production domain, database/migration state, scheduled jobs, and current task ledger. Live code, Git, tests, production responses, provider dashboards, and current PR state outrank all old prose.

Never stash, reset, clean, overwrite, rebase, discard, or force-push another agent's work. One writer per branch/worktree.

# 1. Finish only genuine in-flight work

If the local worktree contains an actively implemented, coherent workstream, finish it through the full loop below before pivoting.

Do not treat optional backlog as in-flight work. At the latest known recovery snapshot:

- Recovery Wave R11/R11.5 and Task #74 are complete;
- Task #76's five named candidates are closed;
- Task #75's model-promoter was correctly declined, while `oos-split.ts` landed independently;
- remaining 91-file DFS tree, 25-module `lib/gse`, roster import, FantasyCoach, Late-Swap, and Task #77 branches are backlog candidates, not automatic launch predecessors.

Refresh those facts before relying on them. Unless one of those items fixes a verified launch/revenue P0 or P1, move it behind Launch Convergence rather than extending PR #129 indefinitely.

# 2. Freeze the recovery branch as evidence, not a release vehicle

PR #129 is a high-value recovery and accounting source. It is not a safe bulk-merge vehicle.

After any real in-flight item is closed:

- write a recovery-branch freeze receipt;
- update its queue and status honestly;
- permit only ledger corrections, security containment, and explicitly launch-critical fixes;
- do not add broad frontier features to it;
- do not merge it wholesale;
- port verified launch-critical slices into focused branches created from current `main`.

Every port must cite exact source commits, compare against current `main`, preserve newer hardening, identify canonical ownership, and carry its own tests, review, rollback, and PR.

# 3. Permanent execution loop

For every workstream:

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
WORKSTREAM
WHY NOW
USER / BUSINESS VALUE
CURRENT PRODUCTION REALITY
RECOVERABLE ASSETS
CANONICAL OWNER
FILES / SYMBOLS EXPECTED
PROTECTED ZONES
ACCEPTANCE CRITERIA
VERIFICATION COMMANDS
ROLLBACK
EXPLICIT EXCLUSIONS
```

Use one read-only verifier after the first green implementation. Settlement, CLV, calibration, proof, billing, auth, entitlements, migrations, source rights, public claims, secrets, or infrastructure also require an independent red-team review.

Fix confirmed findings. Reject speculative rewrites. Polish includes accessibility, responsive behavior, reduced motion, keyboard operation, text zoom, honest empty/degraded states, type/API ergonomics, observability, actionable errors, and rollback clarity.

# 4. Launch Convergence workstreams

Execute in dependency order, refreshing priority when live evidence changes it.

## LC-000 — Production Reality Snapshot

Create or update:

```text
reports/launch/PRODUCTION_REALITY_SNAPSHOT.json
reports/launch/PRODUCTION_REALITY_SNAPSHOT.md
reports/launch/LAUNCH_BLOCKER_LEDGER.json
reports/launch/LAUNCH_BLOCKER_LEDGER.md
```

Verify with fresh evidence:

- current `main` and branch protection;
- current CI and release workflows;
- production deployment SHA and rollback candidate;
- apex/www redirects, canonical metadata, OAuth provider signin/callback URLs, cookies, and callback behavior;
- database connectivity, schema, migration ledger, production drift, and pending migrations;
- cron/scheduler history and freshness;
- critical pages and APIs;
- source clearances and rights snapshots;
- all flags and gates;
- Stripe test/live mode configuration state;
- logging, monitoring, and incident paths.

Do not inherit old green evidence. Distinguish `PROVEN`, `FAILED`, `BLOCKED`, `OWNER_GATE`, and `NOT_TESTED`.

A specific required check: compare the canonical `www` host against the live authentication provider's signin and callback URLs. Treat any unresolved mismatch as an auth/revenue blocker rather than assuming redirects make it safe.

## LC-001 — Blocker Graph

Classify every item:

```text
P0_CORRECTNESS_SECURITY
P1_DEPLOYMENT_AUTH
P1_REVENUE
P1_DATA_ENGINE
P2_TRUST_UX
PROOF_GATED
OWNER_GATE
EXTERNAL_BLOCKER
INTENTIONAL_CLOSED
```

Each row requires evidence, impact, blast radius, canonical owner, dependencies, smallest safe fix, verification, rollback, and re-entry condition.

Priority:

1. secrets, data loss, money-truth, entitlement, settlement, auth;
2. deployment, database, migrations, domains;
3. checkout, webhook, entitlement, portal, cancellation;
4. ingestion, freshness, settlement, CLV, proof;
5. trust, accessibility, performance, SEO, observability;
6. optional frontier expansion.

## LC-002 — Nightly Sentinel v2

Replace any unattended monitor that depends on interactive WebFetch permission with repository-native, read-only code.

Build a bounded Node runner plus an approved scheduled workflow that checks:

```text
/llms.txt
/api/health
/api/proof/ledger
/api/proof/receipts
/api/proof/verification-spec.json
/api/proof/openapi.json
/news-sitemap.xml
/robots.txt
/
/tools
/sealed
/how-we-make-money
/watchlist
public claim hygiene
```

Requirements:

- timeouts and one controlled retry;
- distinguish runner failure, transport failure, and assertion failure;
- validate status/content type/JSON/XML;
- recompute proof known-answer vectors;
- never login or mutate;
- redact unexpected sensitive output;
- durable JSON artifact and concise human report;
- fail loudly when coverage is absent;
- produce one actionable issue/approved alert without duplicate storms;
- fixture-server tests with planted failures.

## LC-003 — Security Residue

Investigate the live-shaped `THE_ODDS_API_KEY` found only on an unlanded historical branch without printing or using it.

- compute/store only a redacted fingerprint or cryptographic hash;
- search reachable history for duplicate exposure;
- verify current scanners catch the pattern without revealing it;
- quarantine the source branch in the ledger;
- create a precise owner rotation/revocation action when validity cannot be disproven;
- do not copy the script or credential into the working tree.

## LC-004 — Revenue Canary

Prove in Stripe test mode:

```text
pricing
→ checkout
→ Terms and renewal consent
→ customer reuse
→ subscription webhook
→ authoritative retrieval
→ entitlement grant
→ dashboard and paid-feature access
→ portal
→ cancellation
→ webhook convergence
→ reconciliation backstop
→ downgrade
→ refund/chargeback behavior
→ grandfathered pricing behavior
```

Verify current price IDs and tier mappings, no duplicate customers/subscriptions, signature verification, event idempotency, out-of-order safety, no access without payment, no paying customer stranded without access, no anonymous/FREE leakage, rate limits, and Terms/refund/pricing consistency.

Do not mutate live Stripe autonomously.

Create `reports/launch/REVENUE_CANARY.md` and an exact `OWNER_ACTION_PACKET.md` for live activation. The packet must include the current Stripe account action requesting a valid business tax ID if that requirement remains unresolved; never print the tax ID itself. Include exact dashboard location, expected state, verification, rollback, and failure interpretation.

## LC-005 — Data and Engine Canary

Prove with real, rights-cleared, non-fabricated inputs:

- odds acquisition and no-store behavior;
- freshness and quiet-board classification;
- pick creation and lock-time immutability;
- commitment timing;
- score ingestion;
- settlement totality;
- stale-PENDING heal and VOID;
- CLV grade-once and close freshness;
- proof receipt and ledger integrity;
- trends ingestion/readiness;
- expected-metric validation;
- rights projection;
- outage differentiation;
- restart/retry behavior.

Do not activate a model, scoring change, public performance claim, or calibration gate because code exists. Require the declared sample, temporal/OOS evaluation, calibration evidence, rights state, and rollback.

## LC-006 — Gate Matrix

Create `reports/launch/GATE_MATRIX.md` with:

```text
GATE
CURRENT VALUE
DESIRED VALUE
OWNER
PREREQUISITES
FRESH EVIDENCE
USER IMPACT
RISK
ROLLBACK
AUTONOMOUS OR OWNER-GATED
FINAL DISPOSITION
```

The goal is not every boolean true. Open every evidence-satisfied, mechanically safe gate; keep proof-gated gates honestly closed; reduce owner gates to exact actions; eliminate stale and contradictory flags.

## LC-007 — Focused Release Candidates

Create bounded launch PRs from current `main`.

Likely lanes, subject to live evidence:

- CI/baseline reliability;
- auth and deployment correctness;
- Cockpit authorization;
- production/revenue correctness;
- data/engine continuity;
- Sentinel v2;
- verified customer-facing launch blockers;
- protected migrations last, isolated and owner-gated.

Do not bulk-merge #129, #112, #121, #122, #124, #125, #127, or #52. Recover only unique, verified behavior and prove no newer hardening is reverted.

## LC-008 — Release Acceptance

A release candidate is ready only when:

- current-main CI and applicable workflows are green;
- build succeeds;
- production schema and migrations are understood and safe;
- critical live pages/APIs pass smoke tests;
- auth works on the canonical host;
- ingestion and settlement are fresh;
- Stripe test lifecycle passes end to end;
- live activation steps are explicit and minimal;
- no autonomous P0/P1 blocker remains;
- paywall and entitlement tests pass;
- proof verification passes;
- Nightly Sentinel runs unattended;
- accessibility/responsive QA passes;
- no unsupported public claim exists;
- source rights fail closed;
- rollback paths are proven.

# 5. Owner gates

Do not ask questions. Record founder-only or external actions as:

```text
OWNER_GATE
Decision:
Why authority is required:
Exact action and location:
Safe non-destructive default:
Work completed around the gate:
Verification:
Rollback:
Re-entry condition:
```

Continue all non-blocked work.

Never merge/push directly to `main`, deploy production, apply production migrations, mutate live Stripe, change secrets, broaden source rights, activate models/providers/publication, open proof/calibration gates without evidence, auto-publish, or delete branches without receipts.

# 6. Completion receipt

Store detailed evidence in repository artifacts and PRs. User-visible output remains compact:

```text
CAMPAIGN BASELINE
IN-FLIGHT WORK CLOSED
PRODUCTION REALITY
P0/P1 BLOCKERS FIXED
REVENUE PATH STATUS
DATA / ENGINE STATUS
GATES OPENED
GATES HONESTLY CLOSED
SENTINEL STATUS
VERIFICATION
BRANCHES / PRS
OWNER ACTIONS
EXTERNAL BLOCKERS
NEXT EXACT ACTION
TOKEN-DISCIPLINE RECEIPT
```

Continue autonomously until release acceptance is reached or every remaining path is genuinely owner-gated, externally blocked, or impossible to verify with available tools.
