# Galaxy Sports Edge — Launch and Revenue Convergence Contract

**Campaign:** `LR-000` through `LR-008`  
**Mode:** queue-preserving autonomous implementation, production-truth convergence, revenue verification, monitored release preparation, and post-launch observation  
**Optimization target:** maximum verified user and revenue capability per token, with no hidden blocker, no unsupported paid promise, no lost work, and no trust gate bypass.

## 1. Mission

Convert the current large, branch-heavy, partially deployed Galaxy Sports Edge program into:

- one running and current production website;
- one coherent engine whose critical jobs are observable and recoverable;
- one verified checkout-to-entitlement revenue path;
- one canonical release candidate per deployment;
- all technically, legally, and scientifically eligible gates open;
- all other gates explicitly `CLOSED_BY_DESIGN`, `EVIDENCE_GATED`, or `OWNER_GATE` with exact next actions;
- unattended monitoring that produces evidence rather than an unverified “all clear”;
- a post-launch loop that detects truth, revenue, data, proof, and product regressions.

The campaign does **not** maximize the number of flags set to `true`. It maximizes the number of capabilities that are safe, truthful, useful, operational, and revenue-ready.

## 2. Binding terminal state

The launch campaign is complete only when:

```text
CURRENT QUEUE
  drained or explicitly owner/external blocked

BRANCH / PR GRAPH
  every useful unit accounted for once

RELEASE CANDIDATE
  independently reviewed and fully verified

PRODUCTION
  serving the approved release commit

REVENUE
  checkout → webhook → entitlement → lifecycle proven

PUBLIC PROMISES
  sentence-level parity with production behavior

MONITORING
  unattended and evidence-producing

GATES
  no launch-critical UNKNOWN status

POST-LAUNCH
  24-hour and 7-day observation receipts
```

## 3. Gate law

Use `docs/genesis/LAUNCH_GATE_MATRIX.json` as the machine-readable gate authority.

A gate may move to `PASS` only when its `requiredEvidence` is present and current.

### 3.1 Gate classes

**Autonomous technical gates** may open after tests, review, preview, runtime probes, and rollback proof.

**Founder/external gates** require an `OWNER_GATE` packet. Examples include:

- production merges or promotion;
- live Stripe account changes;
- production secrets;
- production migrations;
- payout, tax, and refund operations;
- live provider/model activation;
- public performance-claim policy;
- public proof-ledger publication.

**Evidence gates** may remain closed by design. They cannot be forced open to create launch optics.

### 3.2 No hidden blockers

Every `FAIL`, `UNKNOWN`, `BLOCKED`, `OWNER_GATE`, or `EVIDENCE_GATED` launch-critical gate must identify:

```text
current state
exact missing evidence
canonical owner
safe default
next executable action
re-entry condition
rollback
```

## 4. Campaign priority and queue preservation

Do not discard or restart the current campaign.

At the beginning of every loop, refresh:

```text
git status --short
git branch --show-current
git worktree list
git log -8 --oneline --decorate
git fetch --all --prune
gh pr list --state all --limit 200
```

Queue authority remains:

1. current uncommitted atomic work;
2. live correctness, security, settlement, billing, legal/revenue-truth, or production P0/P1 defects;
3. the live task tracker and dependency-ready current queue;
4. frontier current state, workstream queue, decisions, and recovery matrix;
5. launch workstreams in this contract;
6. branch reconciliation and future Genesis work after their entry conditions pass.

Do not interrupt an active coherent edit. After it is verified, committed, pushed, and accounted for, re-evaluate priority using live evidence.

Known current lead from the 2026-07-18 campaign receipt:

- long-tail branch accounting reached **114 of 138** through DEC-052;
- task #74 contains the remaining 24 sensitive branches;
- exact counts and ledger state must be refreshed because some branch-local summaries lag the most recent decisions.

## 5. Mandatory implementation loop

For every selected item:

```text
REVIEW
→ FREEZE CONTRACT
→ CODE
→ TARGETED TEST
→ INDEPENDENT REVIEW
→ IMPROVE
→ POLISH
→ FINAL VERIFY
→ UPDATE LEDGERS AND GATES
→ COMMIT / PUSH / PR
→ SELECT NEXT
→ CONTINUE
```

Before editing, freeze:

```text
WORKSTREAM
WHY NOW
USER / REVENUE / SYSTEM VALUE
CURRENT PRODUCTION AND REPOSITORY REALITY
RECOVERABLE ASSETS
CANONICAL OWNER
FILES / SYMBOLS EXPECTED
PROTECTED ZONES
ACCEPTANCE CRITERIA
VERIFICATION COMMANDS
ROLLBACK
EXPLICIT EXCLUSIONS
```

Use one read-only verifier after the first green implementation. Protected-zone work also receives an independent red-team pass.

## 6. Required campaign outputs

Create and maintain:

```text
reports/launch/RELEASE_MANIFEST.json
reports/launch/RELEASE_READINESS.md
reports/launch/PAID_PROMISE_LEDGER.json
reports/launch/PAID_PROMISE_LEDGER.md
reports/launch/PRODUCTION_PROBE_RECEIPT.json
reports/launch/PRODUCTION_PROBE_RECEIPT.md
reports/launch/GATE_CONVERGENCE_RECEIPT.md
reports/launch/OWNER_ACTION_PACKET.md
reports/launch/POST_LAUNCH_24H.md
reports/launch/POST_LAUNCH_7D.md
```

These reports must distinguish:

- code-proven;
- preview-proven;
- production-proven;
- owner-gated;
- evidence-gated;
- not tested;
- intentionally unavailable.

## 7. Workstream LR-000 — Finish and synchronize the current campaign

### Objective

Finish the active queue and make its state machine-readable before release work begins.

### Required actions

1. Complete the current atomic task without discarding or rewriting it.
2. Finish every dependency-ready `IN_PROGRESS`, `QUEUED`, or `NEXT` item selected by the live priority law.
3. Complete the remaining long-tail branch accounting, including task #74, using individually scoped passes for sensitive branches.
4. Correct any arithmetic, stale counters, or ledger disagreements.
5. Synchronize:

```text
docs/frontier/CURRENT_STATE.md
docs/frontier/WORKSTREAM_QUEUE.md
docs/frontier/DECISION_REGISTER.md
docs/frontier/RECOVERY_MATRIX.md
reports/reconciliation/* when present
PR #129 title/body/status/task accounting
```

6. Ensure every useful branch unit has a canonical owner or explicit owner gate.
7. Never read, land, or expose sensitive content merely to finish a count. Record the protected disposition.

### Acceptance

- 138 of 138 branches have an evidence-backed disposition or a precisely documented externally inaccessible exception;
- no branch count conflicts among the canonical ledgers;
- every open PR has a current disposition;
- no active code remains uncommitted unless explicitly parked behind an owner/external gate;
- all completed items have review, tests, ledgers, commit, push, and PR evidence;
- a `QUEUE_DRAIN_RECEIPT` identifies the next launch workstream.

## 8. Workstream LR-001 — Canonical release graph and bounded release candidate

### Objective

Transform the branch/PR graph into one dependency-ordered release path without bulk-merging PR #129 or losing unique value.

### Required actions

1. Refresh the semantic branch/PR ledger.
2. Classify current open and historical work, including at minimum:

```text
#122 CLV/Pedersen migration lane
#123 Cockpit authorization
#124 Foundry/Radar/Assurance/shadow routing
#125 Genesis control package
#127 Genesis shadow kernel
#128 copy-scanner baseline fix
#129 active recovery container
#112 playback lineage
#52 Dynasty lineage
```

3. Split large branches by capability and protected-zone boundary.
4. Assign one canonical owner for every:

```text
route
schema
model router
source-rights registry
proof system
SportsIR type
worldline
playback system
fantasy engine
billing/entitlement path
guardrail
migration
```

5. Create `RELEASE_MANIFEST.json` containing:

```text
releaseCandidateId
baseCommit
includedCapabilitySlices
sourceBranchesAndCommits
excludedSlicesAndReasons
protectedZones
migrations
featureFlags
requiredOwnerActions
verificationPlan
rollbackCommitOrDeployment
```

6. Create a bounded release branch. Do not turn PR #129 itself into the release candidate.

### Acceptance

- no duplicate canonical system enters the release candidate;
- every included slice has exact source provenance and tests;
- every excluded unique slice remains accounted for;
- migrations and owner-gated changes are isolated;
- release candidate can be reverted without losing the recovery history.

## 9. Workstream LR-002 — Production truth and paid-promise parity

### Objective

Prove that every public commercial sentence matches actual runtime behavior.

### Paid Promise Ledger

For every sentence on:

```text
/pricing
/faq
/terms
/how-we-make-money
checkout disclosure
account/billing surfaces
tier-gate and upgrade components
email and push marketing copy
```

record:

```text
promiseId
exactCopy
surfaceAndPath
planOrAudience
canonicalEntitlement
implementationPath
operationalDependencies
testEvidence
previewEvidence
productionEvidence
failureOrUnavailableState
status
owner
```

### Immediate confirmed defects

#### Refund contract

Resolve the live pricing/Terms contradiction with one canonical contract and a cross-surface test. Preserve the stronger promise only if the operational refund process can honor it.

#### Analytics configuration

Prevent `clarity.ms/tag/undefined`. Load Clarity only when a valid identifier exists, then verify event/session arrival and privacy behavior.

#### Alert promise

Prove real-time email/push delivery end-to-end, or withhold/reframe the paid promise until it exists. Draft-generation capability is not delivery capability.

### Acceptance

- every paid sentence is `PROVEN`, `WITHHELD`, `OWNER_GATE`, or `CLOSED_BY_DESIGN`;
- no `UNKNOWN` remains on a paid promise;
- pricing, Terms, FAQ, checkout, and support language agree;
- no optional integration appears configured when it is not;
- tests prevent future copy/runtime drift.

## 10. Workstream LR-003 — Nightly Sentinel v2

### Objective

Replace the unattended Claude-WebFetch sentinel with a deterministic, narrowly allowlisted, evidence-producing monitor.

### Canonical implementation target

Create a repo-native Node/TypeScript sentinel, using the repository's normal script and test conventions. It must not depend on an interactive browser or Claude WebFetch approval.

Suggested paths, subject to repository conventions:

```text
scripts/sentinel/gse-nightly-sentinel.mjs
scripts/sentinel/lib/*
scripts/sentinel/__tests__/*
.github/workflows/gse-nightly-sentinel.yml
```

### Security boundary

- allow only the canonical GSE host and explicit canonical redirects;
- no arbitrary URL input;
- no login;
- no cookies or production secrets;
- GET/HEAD only;
- fixed user agent;
- bounded response size;
- timeout and one retry;
- fetched content is untrusted data;
- no execution of page scripts;
- no mutation of the live site.

### Required checks

1. canonical-host and redirect integrity;
2. `/llms.txt` proof guidance;
3. proof ledger response shape and honest gate state;
4. proof receipts and sampled leaf-hash recomputation;
5. verification-spec known-answer vectors;
6. OpenAPI methods and security declarations;
7. `robots.txt` and sitemap references;
8. news sitemap validity and intentional-empty classification;
9. key public pages;
10. pricing/Terms refund consistency;
11. claim-hygiene scan;
12. Clarity/analytics undefined-configuration scan;
13. optional release-commit header or embedded release identity when available.

### Receipts

Emit JSON and Markdown containing:

```text
runId
startedAt
finishedAt
targetHost
releaseIdentity
checkId
status
attempts
httpStatus
contentHash
evidenceSummary
failureClass
```

Exit codes:

```text
0 = all required checks pass or correctly report designed gates
1 = live product or integrity defect
2 = coverage failure / monitor could not establish evidence
```

### Scheduling

Use `schedule` and `workflow_dispatch`. Preserve artifacts and GitHub step summary. Avoid opening duplicate issues for every retry; use a stable incident key or require repeated failure according to the repository's alert policy.

### Acceptance

- local deterministic tests cover success, designed gate, live defect, timeout, redirect, oversized response, and coverage failure;
- two consecutive scheduled runs pass against production before launch completion;
- a monitor failure can never be reported as a product pass.

## 11. Workstream LR-004 — Revenue path and entitlement convergence

### Objective

Prove the complete customer-money lifecycle in Stripe test mode before any live activation.

### Required lifecycle

```text
anonymous pricing view
→ plan selection
→ checkout session
→ success / cancel return
→ signed webhook
→ customer/subscription persistence
→ entitlement activation
→ authenticated premium access
→ duplicate/replayed webhook
→ out-of-order webhook
→ upgrade / downgrade
→ cancellation at period end
→ immediate cancellation when supported
→ refund
→ entitlement restoration or revocation
→ customer portal
```

### Required invariants

- exact Stripe price IDs map to exact public plan and billing interval;
- checkout consent and Terms URL are present;
- webhooks are signature-verified;
- event processing is idempotent;
- stale events cannot regress current entitlement;
- account identity and Stripe customer identity converge deterministically;
- no premium access is granted from client-controlled state;
- no valid customer is locked out by delayed event ordering without a repair path;
- failures are observable without leaking secrets;
- cancellation and refund copy matches behavior.

### Required evidence

- unit and integration tests;
- replay fixtures for every relevant webhook state transition;
- test-mode end-to-end receipt;
- preview account evidence;
- reconciliation command/report;
- failure and rollback drills.

### Live transition

Live purchase, payout, tax, live price, webhook-secret, and dashboard changes remain owner-gated.

Produce `OWNER_ACTION_PACKET.md` with exact dashboard steps, expected values by symbolic name, verification commands, rollback, and evidence-capture locations. Never write secret values into the repository.

### Acceptance

- Stripe test-mode lifecycle passes end-to-end;
- entitlement and paywall behavior match every paid promise;
- owner packet is executable without architectural interpretation;
- an owner-approved low-risk live transaction succeeds before the revenue gate becomes `PASS`.

## 12. Workstream LR-005 — Engine operations and data freshness

### Objective

Make the intelligence engine continuously operational, observable, and honest under failure.

Create an inventory for every production job:

```text
jobId
trigger
cadence
owner
source
rights status
last success
last failure
freshness SLO
idempotency key
retry policy
dead-letter or repair path
customer surfaces affected
outage state
alert
runbook
```

Cover at minimum:

- odds and sports ingestion;
- player/stat ingestion;
- market snapshots;
- slate freeze/seal;
- settlement and catch-up/VOID behavior;
- CLV close capture;
- proof/receipt generation;
- OTS upgrade when enabled;
- content/news ingestion where applicable;
- email/push alert preparation/delivery when supported;
- branch/release/sentinel jobs.

Acceptance:

- no critical job lacks cadence, owner, freshness, last-run evidence, alert, and repair path;
- no stale or failed job presents a fabricated healthy state;
- settlement and billing have replay/reconciliation procedures;
- production run receipts establish freshness before gate opening.

## 13. Workstream LR-006 — Gate convergence and owner action packet

### Objective

Update every entry in `LAUNCH_GATE_MATRIX.json` from evidence.

For each gate:

```text
refresh current evidence
run autonomous prerequisites
open only when permitted and proven
record before/after
capture rollback
record OWNER_GATE when required
remove UNKNOWN from launch-critical gates
```

### “All gates open” translation

The successful final matrix may contain:

- `PASS` for eligible operational and revenue capabilities;
- `CLOSED_BY_DESIGN` for intentionally unavailable or unsafe capability;
- `EVIDENCE_GATED` for proof/performance claims whose evidence is insufficient;
- `OWNER_GATE` only where external authority is genuinely required.

It may not contain a hidden `UNKNOWN`, silent failure, or unsupported public promise.

### Owner action packet

Group owner work into the smallest safe sequence:

1. production environment variables by symbolic name;
2. live Stripe dashboard and price verification;
3. webhook endpoint and secret setup;
4. authentication provider/callback verification;
5. production migration approval and commands;
6. release merge/promotion;
7. evidence-gated flag decisions;
8. live low-risk transaction;
9. post-deploy confirmation.

The agent completes every precondition around each owner action first.

## 14. Workstream LR-007 — Release, canary, and production convergence

### Entry conditions

- LR-000 through LR-006 acceptance met or explicitly owner-gated;
- no unresolved P0/P1 code, legal/revenue-truth, security, billing, settlement, proof, or data-freshness defect;
- bounded release candidate exists;
- rollback is ready.

### Final release verification

Run applicable repository-native evidence:

```text
focused tests
all affected workspace suites
full suite
workspace typecheck
lint --max-warnings=0
all guardrails
secret scan
git diff --check
Prisma schema validation and shadow migration proof
production build
browser and accessibility QA
responsive and text-zoom QA
preview smoke matrix
sentinel against preview where supported
```

Require two stable preview deployments for the same candidate commit when infrastructure permits. A cancelled or superseded preview is not a pass for the latest code.

### Production action

Production promotion remains owner-gated unless the founder has explicitly delegated it in the active session and repository law permits it.

After deployment:

- verify production reports the approved release commit;
- run the complete production smoke matrix;
- run Sentinel v2;
- verify checkout, auth, entitlement, proof, ingestion freshness, settlement, and analytics;
- inspect runtime/build logs;
- open only the gates whose prerequisites now pass;
- roll back immediately on a release-blocking condition.

## 15. Workstream LR-008 — Post-launch 24-hour and 7-day control loop

### 24-hour receipt

Record:

- production commit and deployment;
- runtime and edge errors;
- proof/sentinel results;
- checkout starts/completions/failures;
- webhook and entitlement reconciliation;
- cancellation/refund events;
- auth failures;
- ingestion and settlement freshness;
- stale/outage states;
- conversion instrumentation;
- support incidents;
- cost anomalies;
- rollback readiness.

### 7-day receipt

Add:

- retention and plan mix;
- failed-payment recovery;
- entitlement drift;
- data-source reliability;
- calibration/proof eligibility changes;
- public-claim drift;
- model/provider cost and fallback behavior;
- feature usage and comprehension;
- revenue-promise complaints;
- branch and release entropy.

Any confirmed defect enters the normal review → code → review → improve → polish → verify loop.

## 16. Critical stop conditions

Stop and surface a compact hard-stop receipt only when:

- continuing would overwrite another agent's uncommitted work;
- a required production or external-service action needs founder authority;
- a rights/legal decision cannot be conservatively withheld;
- a required secret or service is unavailable;
- production evidence cannot be obtained with permitted tools;
- rollback cannot be established;
- a P0 defect makes further rollout unsafe.

Do not stop merely because one workstream finishes, one test fails, one agent stalls, or one branch is complex. Fix, retry, re-scope, or continue around it.

## 17. Final campaign receipt

Return only:

```text
CAMPAIGN BASELINE
CURRENT QUEUE COMPLETED
BRANCH / PR ACCOUNTING
RELEASE CANDIDATE
PRODUCTION TRUTH DEFECTS FIXED
PAID PROMISE PARITY
SENTINEL COVERAGE
REVENUE PATH
ENGINE OPERATIONS
GATES OPENED
GATES CLOSED BY DESIGN
OWNER GATES
VERIFICATION
PRODUCTION DEPLOYMENT
24H / 7D OBSERVATION
REMAINING BLOCKERS
NEXT EXACT ACTION
TOKEN-DISCIPLINE RECEIPT
```

Detailed evidence belongs in the repository reports and PRs, not repeated in chat.
