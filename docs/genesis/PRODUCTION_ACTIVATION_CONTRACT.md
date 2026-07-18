# Galaxy Sports Edge — Production and Revenue Activation Contract

**Campaign:** `GSE-LAUNCH`  
**Mode:** queue-first launch convergence, production proof, revenue activation, safe gate opening, and continuous optimization  
**Primary rule:** finish the live current queue before launch convergence  
**Operating loop:** review → freeze contract → code → targeted test → independent review → improve → polish → final verify → update ledgers → commit/push/PR → continue

## 1. Objective

Move Galaxy Sports Edge from a large, actively developed repository into one coherent, observable, revenue-capable production system without losing useful work, fabricating readiness, weakening trust controls, or opening a gate before its evidence contract passes.

The desired end state is:

```text
production website reachable and healthy
current release candidate deployed and identified by commit
live ingestion and settlement operating honestly
Google authentication proven end to end
Stripe test-mode purchase lifecycle proven end to end
production billing configuration complete
server-side entitlements proven across Free, Fantasy, Pro, and Elite
refund, cancellation, webhook, reconciliation, and recovery paths proven
scheduled integrity sentinel producing evidence every run
analytics and conversion telemetry receiving real events
all launch-safe gates open
all evidence-dependent gates open only when their declared thresholds pass
all unresolved owner actions reduced to a short, exact activation packet
no invisible branch work, duplicate canonical system, or unsupported public claim
```

“Open all gates” never means bypassing the reason a gate exists. It means retire every avoidable blocker, satisfy every readiness contract that can be satisfied, open every gate whose proof is complete, and leave evidence-dependent, rights-dependent, legal, calibration, or model-version gates closed until their own conditions are genuinely met.

## 2. Queue-first prerequisite

Do not interrupt an active workstream or branch-accounting campaign.

Before this contract begins, prove:

```text
no partially implemented current workstream remains
no dependency-ready IN_PROGRESS task remains
no dependency-ready QUEUED or NEXT task remains in the active campaign
all completed items have review, polish, tests, ledger updates, commit, push, and PR state
all owner-gated items have exact non-destructive defaults and re-entry conditions
all active worktrees are clean or explicitly parked
```

At the 2026-07-18 seed snapshot, the active campaign reported 114 of 138 long-tail branches evidenced and 24 individually scoped branches remaining under task #74. That is historical seed evidence only. Refresh the live task list and finish the real remaining queue before launch convergence.

## 3. Live reality outranks this seed

At campaign start and before every phase transition, refresh:

```text
git status --short
git branch --show-current
git worktree list
git fetch --all --prune
git log -8 --oneline origin/main
gh pr list --state all --limit 200
```

Also inspect, through approved read-only tools where available:

```text
current Vercel production deployment and commit
production aliases
runtime errors and logs
/api/health
/api/auth/providers
/api/proof/ledger
/pricing
robots, sitemaps, llms.txt, proof contracts, and core pages
Stripe configuration status without exposing secret values
production database and migration status without destructive operations
```

Seed observations from a read-only 2026-07-18 probe, all requiring live revalidation:

- production was reachable and Vercel reported the deployment READY;
- production was still built from main commit `0e56c477` rather than the large active frontier branch;
- `/api/health` reported database and ingestion healthy;
- no Vercel runtime errors were returned for the prior 24 hours;
- `/api/proof/ledger` returned 200 with `published:false` because the publication gate remained off;
- `/api/auth/providers` generated Google URLs on the apex host while the canonical product URL was `www`;
- `/pricing` rendered Free, Fantasy, Pro, and Elite purchase surfaces;
- the live Clarity loader was rendered with an undefined project identifier;
- the unattended Claude WebFetch sentinel produced zero coverage because every request required interactive provenance approval.

Do not convert any seed observation into a completion claim without a fresh check.

## 4. Hard invariants

1. **Improve, do not remove.** Preserve unique useful work and recover it into one canonical owner.
2. **Production truth is commit-addressed.** Every smoke report names the exact deployment and Git commit tested.
3. **No fabricated readiness.** `UNVERIFIED`, `BLOCKED`, and `OWNER_GATE` are valid outcomes; silence is not a pass.
4. **No paywall weakening.** Free remains the actual server-enforced teaser; paid data is never shipped to the client merely to blur or hide it.
5. **No model-output-as-source.** Derived measurements retain source, model, revision, uncertainty, and temporal cutoff.
6. **No future leakage.** Historical and replay surfaces use only information observed by the relevant cutoff.
7. **No source-rights expansion by convenience.** Rights classification, purpose limitation, attribution, and retention remain fail-closed.
8. **No public performance claim without the repository’s substantiation gates.**
9. **No settlement, CLV, calibration, proof, entitlement, billing, migration, or public-population change without independent protected-zone review.**
10. **No bulk merge of a frontier branch.** Build a release candidate from bounded, reviewed recovery slices.
11. **No hidden production action.** Deploys, live migrations, Stripe dashboard changes, OAuth configuration, DNS, secrets, tax identity, and real charges remain owner-authorized actions.
12. **No auto-publication.** Draft-only and human-review boundaries remain binding.
13. **No arbitrary scope expansion.** Each phase produces one coherent, independently verifiable artifact or behavior.

## 5. Status vocabulary

Use only:

```text
PASS
FAIL
UNVERIFIED
BLOCKED
OWNER_GATE
NOT_APPLICABLE
SUPERSEDED
```

A gate may be marked `PASS` only with current command, API, UI, database, provider, or deployment evidence.

## 6. Campaign sequence

### Phase L0 — Drain the active queue

Continue the existing queue under `gse-autopilot` until the queue-drain receipt exists.

Required output:

```text
reports/launch/QUEUE_DRAIN_RECEIPT.md
```

It must identify:

- every completed workstream;
- every remaining owner gate;
- every parked branch/worktree;
- every task marked blocked and its re-entry condition;
- the current main and release-candidate candidates;
- confirmation that no dependency-ready queue item was skipped.

### Phase L1 — Production Truth Baseline

Build a read-only, deterministic production probe using repository-native Node code and approved connector tooling.

Required checks:

```text
production deployment ID, Git SHA, state, aliases, and age
custom-domain root status
/api/health body and freshness
/api/auth/providers host consistency
/pricing plan and CTA presence
/terms and /privacy dates and refund/renewal consistency
/api/proof/ledger
/api/proof/receipts
/api/proof/verification-spec.json known-answer vectors
/api/proof/openapi.json read-only contract
/llms.txt
/robots.txt
/news-sitemap.xml and primary sitemap
/, /picks, /board, /tools, /sealed, /how-we-make-money, /watchlist
public claim-hygiene scan
runtime errors over the selected window
cron/ingestion freshness
```

Required outputs:

```text
scripts/ops/gse-production-probe.mjs
reports/launch/PRODUCTION_BASELINE.json
reports/launch/PRODUCTION_BASELINE.md
```

The probe must:

- use normal read-only HTTP requests, not an interactive Claude WebFetch permission path;
- have explicit timeouts and one bounded retry;
- emit machine-readable evidence;
- redact query secrets and never log environment values;
- classify absence of coverage as `UNVERIFIED`, never `PASS`;
- be testable against fixtures without the public internet.

### Phase L2 — Nightly Sentinel Repair

Replace the non-executing scheduled Claude WebFetch sentinel with a repository-native sentinel.

Required implementation:

```text
scripts/ops/gse-nightly-sentinel.mjs
.github/workflows/gse-nightly-sentinel.yml
apps/web or scripts tests for parser, classification, known-answer verification, and failure behavior
```

The workflow must:

- run on schedule and on manual dispatch;
- call only public read-only endpoints;
- produce JSON and Markdown artifacts;
- fail visibly when a required check fails or coverage is absent;
- distinguish site defects from runner/network defects;
- validate cryptographic known-answer vectors locally;
- never use login credentials, production database access, curl bypasses, or hidden browser state;
- optionally open or update one deduplicated GitHub issue only after explicit policy approval; otherwise artifact + failing check is sufficient.

### Phase L3 — Revenue Contract Audit

Create one machine-readable revenue readiness matrix covering:

```text
AUTH
PRICING
CHECKOUT
TERMS_CONSENT
WEBHOOK_SIGNATURE
WEBHOOK_IDEMPOTENCY
SUBSCRIPTION_STATE_CONVERGENCE
ENTITLEMENT_GRANT
ENTITLEMENT_REVOCATION
POST_CHECKOUT_RECONCILIATION
PERIODIC_RECONCILIATION
CUSTOMER_PORTAL
CANCEL
REFUND_PROMISE
GRANDFATHERED_PRICE
TIER_ACCESS
RATE_LIMIT
SUPPORT_CONTACT
TAX_AND_PAYOUT_READINESS
ANALYTICS
```

Required outputs:

```text
reports/launch/REVENUE_READINESS_MATRIX.json
reports/launch/REVENUE_READINESS_MATRIX.md
```

Every row records:

```text
status
evidence
code owner
provider owner
environment
failure mode
smallest validation
rollback
owner action
```

### Phase L4 — Revenue Path End-to-End Proof

Use Stripe test mode and non-production-safe fixtures unless the founder explicitly authorizes a live production validation.

Prove:

1. anonymous user reaches correct pricing and free offer;
2. Google sign-in returns to the canonical host;
3. checkout session uses the expected product/price and requires Terms consent;
4. recurring billing disclosure is adjacent to the action;
5. webhook signature rejection and valid event handling work;
6. duplicate and out-of-order events cannot create access-without-payment or revoke the current subscription incorrectly;
7. post-checkout reconciliation grants access if the webhook is delayed;
8. periodic reconciliation repairs missed events without unsafe revocation;
9. Free, Fantasy, Pro, and Elite server-side entitlements match public copy;
10. customer portal and cancellation work;
11. the stated refund-window process has an operational owner and support path;
12. grandfathered pricing is preserved for existing subscribers;
13. a paid user can access paid surfaces while an anonymous, Free, or wrong-tier user cannot;
14. logs and receipts contain no secrets or payment data.

Do not perform an irreversible real charge or refund without explicit owner authorization.

### Phase L5 — Production Drift and Claim Reconciliation

Resolve discrepancies between production, code, configuration, and public copy.

Mandatory candidates to investigate from the seed baseline:

- apex versus `www` host in `NEXTAUTH_URL`, Google OAuth callback, checkout success/cancel URLs, metadata, webhooks, and canonical links;
- Clarity project identifier rendered as undefined;
- public promises such as “real-time email + push alerts,” “all seven sports,” “real cleared data,” “engine committing live,” “every pick with reasoning,” and refund/grandfather guarantees versus actual live implementation;
- Terms, FAQ, pricing, structured data, checkout disclosure, and support process consistency;
- production deployment lag versus the current reviewed release candidate;
- proof ledger publication state versus public proof copy;
- any route that presents an outage, empty state, bootstrap state, or gated state inaccurately.

Correct implementation or copy based on truth. Never make truth fit copy by opening an unsafe gate.

### Phase L6 — Release Candidate Convergence

Build a clean release branch from current main.

Recover bounded, dependency-ordered slices from open work. Re-evaluate live state before using this seed order:

```text
baseline CI fix and current-main defects
Cockpit authorization hardening
Genesis shadow kernel
bounded SportsIR/worldline/playback/proof slices from the active frontier branch
Fantasy Engine after rights/trademark/current-main review
Foundry/Radar/Assurance adapted into the canonical genome and routing stack
residual governed-playback value not already recovered
protected CLV/Pedersen lane after shadow-database and drift proof
Dynasty packages only when their semantic dependencies are ready
```

For each slice:

```text
freeze recovery contract
compare against current main and overlapping PRs by patch/symbol/behavior
recover before rewriting
run targeted tests
independent verifier
protected-zone red team when applicable
improve and polish
final gates
commit and push one coherent PR
```

Never merge the large frontier branch wholesale.

### Phase L7 — Full Release Qualification

On the assembled release candidate, run once:

```text
clean install / lockfile verification
Prisma generate and validate
migration diff against a disposable or shadow database
all workspace tests
all guardrails
all eval contracts
typecheck
lint --max-warnings=0
production build
secret scan
browser desktop/mobile QA
keyboard navigation
screen-reader semantics
reduced motion
200% text zoom
critical revenue-path Playwright tests
production-probe fixture tests
sentinel fixture tests
```

Capture exact commands, exit codes, counts, commit, and environment boundaries.

### Phase L8 — Owner Activation Packet

Produce one short packet containing only actions that cannot safely be completed in code.

Seed owner actions requiring live verification:

```text
Stripe: provide/confirm valid Galaxy Sports Network tax ID and payout readiness
Stripe: configure the public Terms-of-Service URL required by checkout consent
Stripe: verify live product and price IDs for Fantasy, Pro, and Elite
Stripe: verify the production webhook endpoint, signing secret, and required events
Google: authorize the canonical www callback URL
Vercel: set NEXT_PUBLIC_APP_URL and NEXTAUTH_URL consistently to the canonical host
Vercel: set the real Clarity project ID or disable the loader honestly
Database: approve and apply only reviewed additive migrations through the runbook
DNS/platform: preserve apex-to-www behavior and canonical aliases
Founder: approve bounded PR merge order, release-candidate merge, and production deploy
Founder: authorize one controlled real-money smoke purchase/refund only after test-mode proof
```

Required output:

```text
reports/launch/OWNER_ACTIVATION_PACKET.md
```

Each action includes exact location, expected value shape without secrets, validation, risk, rollback, and evidence to capture.

### Phase L9 — Gate Opening Matrix

Create:

```text
reports/launch/GATE_OPENING_MATRIX.json
reports/launch/GATE_OPENING_MATRIX.md
```

Separate gates into:

#### A. Launch-safe operational and revenue gates

May open after their end-to-end proof passes, owner configuration is complete, and rollback is proven.

Examples include authentication, checkout, portal, entitlement reconciliation, correctly scoped paid surfaces, ingestion schedules, analytics, and the repaired sentinel.

#### B. Evidence-accrual gates

Open only when live data satisfies the existing declared thresholds. Never relax thresholds to produce a launch.

Examples include public performance statistics, calibration adjustments, outcome learning, confidence-tier claims, proof-ledger publication, CLV claims, model-version changes, and model-routing promotions.

#### C. Rights, legal, and high-risk gates

Remain closed until the required rights, legal, jurisdictional, security, or founder review exists.

Examples include new scraping permissions, licensed-data public display, paid contests/real-money operation, auto-publication, external-action agents, production model training, and source-purpose expansion.

Each gate row records:

```text
flag or mechanism
current state
required evidence
owner
open procedure
validation
rollback
public behavior change
```

### Phase L10 — Controlled Production Deployment

This phase requires explicit founder authorization.

Procedure:

1. capture current production deployment and rollback target;
2. confirm reviewed release SHA;
3. confirm migration plan and whether none are required;
4. deploy through the existing platform path;
5. run the production probe immediately;
6. execute auth and revenue smoke tests within approved bounds;
7. monitor runtime errors, ingestion, webhooks, and entitlement reconciliation;
8. roll back automatically or manually on declared stop conditions;
9. record deployment receipt.

Required output:

```text
reports/launch/PRODUCTION_DEPLOYMENT_RECEIPT.md
```

### Phase L11 — Revenue and Reliability Command Loop

After production activation, run a standing daily/weekly loop:

```text
sentinel coverage
runtime errors
cron and ingestion freshness
checkout attempts and failures
webhook failures and reconciliation repairs
signup → checkout → paid conversion
paid access success
cancellation and refund requests
support contacts
source-rights drift
public-claim drift
model and evidence gates
cost by capability and user value
```

Optimize for durable conversion and trust, not click pressure or wagering intensity.

## 7. Review, improvement, and polish standard

Every phase follows:

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
→ CONTINUE
```

Independent review must inspect the actual diff and current production evidence.

Polish includes:

- accurate, calm failure and unavailable states;
- accessibility, responsive layout, reduced motion, keyboard behavior, and text zoom;
- precise entitlement and upgrade language;
- clear support and refund operation;
- useful logs and operator diagnostics;
- documented rollback;
- removal of duplicate implementations only after canonical ownership is proven;
- public copy matching what the system actually does today.

## 8. Owner-gate behavior

Do not ask routine questions. Record genuine founder actions as:

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

## 9. Completion criteria

The campaign is complete only when:

1. the current queue is drained and accounted for;
2. the production deployment commit is known and current by deliberate decision;
3. health, ingestion, proof, auth, pricing, and critical pages are continuously checked;
4. the sentinel runs unattended and produces evidence;
5. the Stripe test lifecycle passes end to end;
6. production owner configuration is complete;
7. paid entitlements are proven server-side;
8. the release candidate passes full qualification;
9. all launch-safe gates are open;
10. evidence-, rights-, legal-, and model-dependent gates have honest dispositions;
11. analytics and revenue telemetry are working without exposing personal or payment data;
12. owner blockers are either completed or reduced to explicit external actions;
13. rollback is proven;
14. no accepted useful work is invisible, duplicated, or silently removed.

## 10. Final campaign receipt

Return only:

```text
PRODUCTION BASELINE
QUEUE DRAIN
WORKSTREAMS COMPLETED
RELEASE CANDIDATE
LIVE SITE HEALTH
AUTH STATUS
REVENUE PATH STATUS
SENTINEL STATUS
GATES OPENED
GATES CORRECTLY HELD
CLAIMS RECONCILED
VERIFICATION
DEPLOYMENT / ROLLBACK
OWNER ACTIONS
BLOCKERS
NEXT AUTONOMOUS ACTION
TOKEN-DISCIPLINE RECEIPT
```
