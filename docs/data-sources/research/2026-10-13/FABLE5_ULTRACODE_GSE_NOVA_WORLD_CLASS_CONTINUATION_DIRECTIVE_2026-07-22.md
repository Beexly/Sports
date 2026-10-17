# GSE / NOVA WORLD-CLASS CONVERGENCE HARDENING DIRECTIVE
## Fable 5 UltraCode Execution Authority, Critical Review, Remediation Plan, Split Plan, and Pre-Merge Proof Contract

**Date:** 2026-07-22  
**Repository:** `Beexly/Sports`  
**Current production-code base for this work:** `main` at `c19a00d` unless live GitHub evidence proves it changed  
**Primary reference branches:**  
- `#146` — `codex/nova-ai-opportunity-engine-2026-07-21` at `fbc3cfe`  
- `#152` — `docs/phase0-truth-convergence-2026-07-21`  
- `#158` — `feat/ai-control-plane-import-guard`  
- `#159` — `security/trusted-actor-model`  
- `#160` — `payments/durable-checkout-attempt`  
- `#161` — `settlement/evidence-outbox`  
- `#162` → `#163` → `#164` — AI control-plane contract, ledger, and budget stack  

**Operating mode:** aggressive, evidence-first, additive, reversible, self-correcting, and owner-controlled at irreversible boundaries.

---

# 0. EXECUTIVE RULING

The recent work is a substantial improvement. The architecture is no longer drifting blindly:

- domain ownership is now explicit;
- the unsafe actor, checkout, settlement, and transport-boundary drafts were replaced;
- the AI control plane was decomposed into contracts, attempts, attribution, and atomic budgets;
- the #146 NOVA branch is frozen as a reference branch instead of being treated as one mergeable product unit;
- the NOVA inventory was manually recovered after the inventory subagent died;
- no source-validation failure was fabricated into a pass.

Keep all of that.

However, **the current “everything safe is done” conclusion is not yet true**. The system is safe only because the new code is still dormant and unmerged. A second adversarial pass found several load-bearing defects that must be corrected before the merge train or any call-site activation:

1. The control plane lets the caller supply its own providers, cost modes, cash cap, substitutions, retention, budget windows, environment, dispatch implementation, and pricing inputs. That makes policy caller-authored rather than control-plane-authored.
2. The invocation ledger’s concurrency path can dispatch the same idempotent request more than once.
3. Authoritative pre-dispatch state and optional telemetry are conflated; the code swallows failures in both.
4. The default dispatcher ignores the provider chosen by the attempt loop and calls the legacy router, which can route or fall back internally.
5. `NO_BILLABLE_EXTERNAL` and `CONFIRMED_CREDITS_ONLY` are labels today, not enforced economic lanes.
6. An `AMBIGUOUS` provider result releases its cash reservation even though the vendor may have charged.
7. Budget settlement can exceed the amount held and violate the cap because no database invariant protects settlement.
8. The checkout route can proceed toward Stripe when subscription-state lookup or the durable database is unavailable.
9. A network-ambiguous Stripe error is marked `FAILED`, releasing the intent and allowing a fresh idempotency key.
10. PR #160 adds a Prisma model but no production migration file.
11. Settlement “retry deduplication” is not true across process/scheduler retries because each `settleSport()` call mints a new random run ID.
12. The settlement outbox marks events `DELIVERED` even when all real deliveries fail, and its stale-claim logic can exceed the maximum attempt count.
13. The anonymous-report limiter trusts a caller-supplied fingerprint and uses per-instance memory, so it is bypassable.
14. The shared `TrustedActor` service/system constructors are conventions, not governed credential or registry boundaries.
15. The freeze currently canonizes implementations that still need hardening and inaccurately calls unmerged draft infrastructure “landed.”

These are not reasons to throw away the work. They are reasons to correct it now, while it remains draft and dormant.

The governing rule for the next cycle is:

> **Preserve the architecture. Harden the authority boundaries. Prove the cumulative stack. Improve and polish every touched surface before calling the unit complete.**

---

# 1. AUTHORITY AND STOP BOUNDARIES

## 1.1 Autonomous authority granted to the coding agent

Proceed without asking the owner for routine approval to:

- inspect every current branch, PR, diff, test, workflow, migration, and runtime contract;
- repair the draft PRs named in this directive;
- add corrective commits to existing draft branches;
- create narrowly scoped replacement draft PRs only when in-place correction would destroy the review boundary;
- build deterministic repository-native inventory and verification tooling;
- build NOVA split units S1–S4;
- build PR-D as a dormant credit-admission contract after S1 supplies the canonical credit vocabulary;
- build provider-hardening registries, adapters, call-site inventories, and shadow-mode migration scaffolding;
- add tests, mutation tests, integration tests, browser QA, documentation, observability, accessibility, and operational receipts;
- create a cumulative pre-merge integration branch and run the entire stack against disposable databases;
- close a superseded draft only after the replacement exists, is green, and the closure comment maps every preserved unit.

## 1.2 Owner-only boundaries

Stop before:

- merging any PR to `main`;
- marking production behavior active;
- deploying;
- applying a production migration;
- enabling billable AI modes;
- enabling real watchlist email/push delivery;
- changing production secrets, Stripe, AWS, Google Cloud, DNS, OAuth, or billing configuration;
- applying for credits or accepting terms;
- sending outreach or external communications;
- publishing;
- voiding paid-user picks from inferred source status;
- deleting evidence branches or historical receipts.

Do not stop merely because a task is security-sensitive, payment-related, or architectural. Build and prove the draft. Stop at the irreversible action.

---

# 2. TRUTH CORRECTIONS TO APPEND TO THE FREEZE

Do not delete or rewrite `NOVA_CONVERGENCE_FREEZE_2026-07-22.md`. Append a dated hardening addendum.

## 2.1 Correct draft-state language

Replace the operational meaning of “landed” with:

- `IMPLEMENTED_ON_DRAFT_BRANCH`
- `CI_GREEN_IN_ISOLATION`
- `NOT_MERGED`
- `NOT_CUMULATIVELY_VALIDATED`
- `NOT_PRODUCTION_ACTIVE`

The ownership freeze remains binding. The exact draft implementations remain provisional until their hardening gates pass.

## 2.2 Correct PR-D sequencing

The freeze says:

- NOVA names the credit state;
- S1 must add `CreditGrantState`;
- PR-D consumes that state;
- PR-D is “unblocked.”

Make the sequencing explicit:

```text
S1 canonical credit contracts
    ↓
PR-D admission/reservation port compiles against S1
    ↓
S5 materializes NOVA-owned credit persistence
    ↓
PR-D activation tests against the real S5 adapter
    ↓
only then may CONFIRMED_CREDITS_ONLY become reachable
```

PR-D may not mint a temporary competing credit vocabulary.

## 2.3 Freeze concepts, not defects

Amend the shared-infrastructure language:

- `TrustedActor` ownership is frozen; #159 implementation is pending hardening.
- Transactional-outbox ownership and principles are frozen; #161 delivery semantics are pending hardening.
- `AiInvocation` / `AiAttempt` / `AiFinancialAttribution` ownership is frozen; #163’s current execution/idempotency mechanics are pending hardening.
- `AiBudgetWindow` / `AiBudgetReservation` ownership is frozen; #164’s ambiguous-charge and settlement invariants are pending hardening.

## 2.4 Record the inventory-agent failure honestly

Create an immutable agent-run receipt:

```text
agent: #146 exact-identifier inventory
result: FAILED_CLOSED
reason: model switch / run died after 53 transcript lines
usable output: partial transcript only
fallback: founder/coding-agent surgical read
final inventory source: deterministic repository reads
```

The manual recovery is valid, but it must not erase the failed subagent outcome.

---

# 3. REPLACE MODEL-DRIVEN INVENTORY WITH DETERMINISTIC TOOLING

The inventory agent’s death exposed the wrong abstraction. Branch inventory and collision detection are repository facts, not model judgments.

Build:

```text
scripts/nova/build-convergence-inventory.mjs
scripts/nova/verify-convergence-inventory.mjs
.github/workflows/nova-convergence-inventory.yml
```

## 3.1 Required inputs

- repository path;
- base ref;
- head ref;
- canonical-owner manifest;
- forbidden symbol/model prefixes;
- Prisma schema paths;
- source directories.

## 3.2 Required deterministic outputs

```text
reports/nova/convergence/NOVA_CONVERGENCE_INVENTORY.json
reports/nova/convergence/NOVA_CONVERGENCE_INVENTORY.md
reports/nova/convergence/NOVA_CONVERGENCE_RECEIPT.json
```

The receipt must contain:

- base/head/merge-base SHAs;
- exact command versions;
- exact changed-file count;
- file paths and blob hashes;
- exported TypeScript types/interfaces/constants;
- Prisma models/enums/indexes/migrations;
- symbol collisions;
- semantic-domain candidates;
- unparsed-file list;
- command exit codes;
- generated artifact hashes;
- timestamp and repository dirty state.

## 3.3 Implementation requirements

- Use `git merge-base`, `git diff --name-status`, `git ls-tree`, and blob hashes.
- Use the TypeScript compiler API for exported-symbol extraction.
- Parse Prisma schema and migration SQL deterministically.
- Fail closed when a source file cannot be parsed.
- Never infer “zero collision” from an incomplete scan.
- A model may interpret the receipt; it may not manufacture it.

This script becomes a NOVA internal capability and later runs whenever:

- a large branch is proposed for split;
- a provider/model registry changes;
- a new persistence unit is planned;
- a collision-sensitive PR is opened.

---

# 4. CRITICAL REMEDIATION — PR #159 TRUSTED ACTOR

Keep the discriminated union and server-derived human identity. Correct the remaining authority gaps.

## 4.1 Anonymous reporting is still bypassable

Current defects:

- `fileAnonymousReport()` is a network-invokable server action.
- It accepts `clientFingerprint` from the request.
- The limiter is an in-memory `Map`.
- A caller can rotate fingerprints.
- A serverless cold start or another instance resets the limit.
- The map has no bounded eviction beyond active access.

Required correction:

1. Remove anonymous reporting from the direct `"use server"` RPC surface.
2. Expose a dedicated route whose server derives the rate-limit key from trusted request facts.
3. HMAC the source material with a server secret; never persist raw IP.
4. Use a distributed, atomic limiter or keep anonymous reporting disabled.
5. Add explicit feature gate:

```text
ANONYMOUS_MODERATION_REPORTS_ENABLED=false
```

6. Missing durable limiter in production must return `503`, not fall back to memory.
7. Add global, per-fingerprint, per-target, and payload-dedup limits.
8. Add bounded retention and privacy documentation.
9. Authenticated reports also need a smaller per-user abuse limit.

## 4.2 SERVICE and SYSTEM identity must be governed, not merely constructed

Current `serviceActor({subjectId})` / `systemActor({subjectId})` accepts any non-empty string from trusted server code.

Replace or wrap with a registry:

```ts
type ServicePrincipalId =
  | "service:settlement-worker"
  | "service:nova-source-cycle"
  | "service:ai-reconciliation"
  | "service:outbox-delivery"
  | ...;

resolveServiceActor({
  principalId,
  verifiedCredentialContext,
  operation,
  requestId,
  runId
});
```

Requirements:

- allowlisted principal IDs;
- operation-specific authority scopes;
- verified cron/service credential context;
- no generic service constructor in application code;
- an import-boundary guard preventing arbitrary modules from minting actors;
- SERVICE/SYSTEM actors must require `runId` or `requestId`;
- human actor must preserve session identity and role evidence;
- policy-version and authority decision recorded.

## 4.3 Persist the audit fields the contract claims

`TrustedActor` carries:

- auth method;
- authority scope;
- tenant/project;
- request/run ID;
- observed time;
- policy version.

The schema currently persists only a subset.

Choose and document one of two paths:

- persist all audit-critical fields; or
- explicitly classify fields as transient and store an immutable actor-receipt ID referring to a complete audit record.

Do not silently discard the fields while claiming the full contract is audited.

## 4.4 Seat identity

`reviewSubagentRunAs(actor, reviewerSeat, ...)` still accepts the reviewer seat separately from the human actor.

Make one rule explicit:

- either all owner/admin humans are authorized to review on behalf of a parent seat, and `reviewerSeat` is a non-authoritative workflow label;
- or bind human identities to allowed council seats and enforce that mapping.

Do not imply that the parent seat itself authenticated when only the human did.

## 4.5 #159 acceptance

- anonymous-fingerprint spoof test;
- cross-instance limiter test;
- no-durable-limiter production fail-closed test;
- unauthorized service principal test;
- service credential missing/invalid test;
- operation-scope denial test;
- audit-receipt completeness test;
- no arbitrary actor-constructor imports;
- full existing 67 tests remain green;
- migration clean on fresh and current-main databases.

---

# 5. CRITICAL REMEDIATION — PR #160 CHECKOUT ATTEMPT

Keep the durable attempt concept. Do not merge it until the payment path fails closed around state ambiguity.

## 5.1 Add the missing production migration

PR #160 changes `schema.prisma` but currently has no migration file in its changed-file inventory.

Add an explicit, reviewed migration. Do not treat `prisma db push` as production evidence.

The migration must include:

- the table;
- state constraints;
- indexes;
- unique constraints;
- foreign-key retention decision;
- safe reapplication doctrine consistent with the repository;
- upgrade verification from current `main`.

## 5.2 Durable database is a hard precondition for Stripe side effects

The repository’s stub Prisma client returns no-op writes while pretending success. The current checkout flow can therefore create a Stripe customer/session without durable local state.

Create a shared protected-write guard:

```ts
requireDurableWriteStore("stripe-checkout")
```

Before any Stripe customer/session creation:

- reject stub mode;
- reject unknown DB capability;
- reject failed subscription lookup;
- return a typed `503`;
- record a founder/operations incident without leaking secrets.

The current subscription lookup catches a DB error and treats it as “no subscription.” That is fail-open double-billing behavior. Replace it with:

```text
DB lookup success + no live subscription → continue
DB lookup success + live subscription → 409 / billing portal
DB lookup failure → 503 / no Stripe side effect
```

For additional defense, verify current subscriptions authoritatively from Stripe when local state is uncertain.

## 5.3 Preserve ambiguous outcomes

Do not mark every Stripe session-creation error `FAILED`.

Classify:

- `DEFINITIVE_REJECTION`
- `AMBIGUOUS_NETWORK_OUTCOME`
- `RETRIABLE_NO_REQUEST_SENT`
- `CONFIGURATION_FAILURE`

Add states:

```text
CREATED
REQUEST_IN_FLIGHT
SESSION_CREATED
AMBIGUOUS
COMPLETED
FAILED
EXPIRED
CANCELED
```

Rules:

- ambiguous outcome keeps the same attempt and idempotency key;
- no fresh attempt until retrieval/reconciliation proves the original did not exist or expired;
- retries of an ambiguous attempt reuse the same Stripe key;
- a repair job queries Stripe by known session/customer/idempotency metadata where possible;
- owner queue surfaces unresolved ambiguity.

## 5.4 Do not erase the client-intent audit identity

The current dead-attempt flow clears `clientIntentId` to free the compound unique key.

Preserve immutable history. Preferred model:

```text
CheckoutIntent
    1 → many CheckoutAttempt generations
```

Where:

- intent ID and request fingerprint are immutable;
- each attempt has a generation and Stripe idempotency key;
- only one active generation exists;
- terminal attempts remain fully traceable.

A smaller acceptable correction is to retain `originalClientIntentId` and use a separate active-key column or partial unique index.

## 5.5 Fingerprint the full commercial request

Fingerprint canonical Stripe session parameters, not only pricing phase + consent flag.

Include, where applicable:

- user/customer;
- tier and interval;
- price ID;
- currency;
- quantity;
- trial terms;
- promotion/coupon policy;
- tax behavior;
- commercial-terms version or content hash;
- consent requirement;
- success/cancel origin class;
- subscription metadata version.

## 5.6 Webhook and repair lifecycle

Add handling for:

- `checkout.session.expired`;
- asynchronous payment completion/failure if applicable;
- reconciliation retry queue;
- unknown attempt drift;
- session created but DB bind failed;
- attempt completed but subscription sync lagging.

Webhook processing itself should use a durable claim/state record rather than check-then-handle-then-insert where practical.

## 5.7 Retention and deletion

A financial audit record should not disappear because a user row is deleted. Replace cascade deletion with a retention-safe design:

- nullable FK + immutable subject snapshot; or
- `RESTRICT` plus account soft-delete.

## 5.8 #160 acceptance

- no migration missing;
- no Stripe SDK call in stub mode or DB-unknown state;
- ambiguous network error reuses same key;
- 100 concurrent same-intent requests produce one active attempt/session;
- same intent + changed fingerprint is 409;
- terminal attempt history remains traceable;
- `checkout.session.expired` reconciles;
- webhook repair test;
- live-mode keys are never used in tests;
- full payment, webhook, entitlement, portal, cancellation, and refund test-mode canary remains owner-gated.

---

# 6. CRITICAL REMEDIATION — PR #161 SETTLEMENT EVIDENCE AND OUTBOX

Keep append-only observations and the transactional event append. Redesign the run identity, decision history, and delivery state machine.

## 6.1 The current retry firewall is incomplete

The unique key is:

```text
(gameId, settlementRunId, payloadFingerprint)
```

But `settlementRunId` is generated with `randomUUID()` inside every `settleSport()` call.

A scheduler retry, process restart, or duplicate invocation receives a new run ID and counts as fresh corroboration. The current statement “a retried run can never corroborate” is therefore not true across real retries.

Required model:

```text
SettlementRun
SettlementSourceSnapshot
SettlementObservation
```

`SettlementRun` must have a stable externally supplied idempotency key from the scheduler/cron invocation.

Recommended identity:

```text
source + sport + scheduledWindow + sourceSnapshotFingerprint
```

Requirements:

- route/worker creates or retrieves the run before calling `settleSport`;
- retries reuse the same run ID;
- source response or normalized snapshot has one immutable fingerprint;
- minimum temporal separation or distinct source snapshots for corroboration;
- `observedAt` and `recordedAt` remain separate;
- source-provided timestamp is retained when available;
- rapid retries cannot promote an anomaly.

## 6.2 Do not allow database cascades to erase “append-only” evidence

Current foreign keys cascade from game/pick/anomaly to evidence rows.

That contradicts append-only guarantees.

Use:

- `ON DELETE RESTRICT`; or
- soft deletion of parent records; or
- retained immutable external IDs plus `SET NULL`.

Add deletion tests at the database level, not only source-grep tests.

## 6.3 Separate review request from actual owner decisions

A unique `SettlementDecision.anomalyId` currently stores `REVIEW_REQUESTED`, which consumes the only decision row.

Replace with:

```text
OwnerDecisionRequest
SettlementDecisionEvent[]
```

or equivalent:

- one idempotent queue request per anomaly/promotion;
- append-only owner decisions such as:
  - ACKNOWLEDGED
  - WAIT_FOR_SOURCE
  - MARK_POSTPONED
  - VOID_PICKS
  - DISMISS_ANOMALY
  - RESOLVE_SCORES_ARRIVED
- trusted actor receipt;
- reason/evidence;
- prior and next state;
- timestamp;
- no mutation of historical decisions.

Automatic score arrival may append a SYSTEM resolution event, but it may not impersonate an owner.

## 6.4 The outbox currently loses failed deliveries

The current path is:

```text
notify() never throws
→ returns dispatch records including delivery_failed/hook_error
→ worker marks the entire event DELIVERED
```

That permanently closes real channel failures.

Create two layers:

```text
PickSettlementEvent
PickSettlementDelivery
```

One delivery row per:

- follower;
- channel;
- destination identity/version;
- event.

Delivery states:

```text
PENDING
CLAIMED
DELIVERED
SUPPRESSED
NO_RECIPIENT
RETRYABLE_FAILED
PERMANENT_FAILED
DEAD_LETTER
```

Rules:

- successful recipients are never resent because another recipient failed;
- transient failures retry only the failed delivery;
- terminal ineligibility/no recipient is recorded honestly and does not retry;
- each channel has an idempotency key;
- per-delivery attempt history is append-only;
- the parent event is complete only when every child delivery reaches a terminal state.

## 6.5 Fix claim leasing and attempt caps

Current stale claims are reset to `PENDING`, while all `PENDING` rows are selectable regardless of attempt count. A crash at the maximum attempt can therefore create attempt 6, 7, and beyond.

Add:

- `leaseToken`;
- `leaseOwner`;
- `leaseExpiresAt`;
- `nextAttemptAt`;
- `lastErrorCode`;
- `lastErrorClass`;
- `claimVersion` / fencing token;
- status-scoped and token-scoped updates;
- stale claim at max attempts → dead letter, not pending;
- exponential backoff with jitter;
- batch fairness;
- maximum payload age;
- owner-queue escalation at dead letter.

A stale worker must not be able to overwrite a newer claimant’s result.

## 6.6 Preserve event-time facts

The worker currently reloads mutable pick/game data and current watchlist followers at delivery time.

Freeze the business semantics:

- event payload includes immutable selection, pick type, team IDs/names, result, sport, settled time, model/pick receipt, and event schema version;
- decide whether recipients are:
  - followers at settlement time; or
  - followers at delivery time.

For a paid “real-time alert” promise, settlement-time recipient intent is generally the defensible rule. Materialize recipient delivery rows when expanding the event, with a unique key.

Do not let a user who follows after settlement receive a historical alert by accident, and do not silently drop a user who unfollows after the event if the product promise says the alert was already owed.

## 6.7 Truthful delivery health

The cron route currently returns `ok: true` even when the worker swallowed a drain-level failure.

Return:

- `ok`;
- `degraded`;
- queue depth;
- oldest pending age;
- claims;
- delivered;
- retryable failed;
- dead letters;
- no-recipient/suppressed;
- error classifications.

A database or worker failure must not appear green.

## 6.8 “Real-time” promise

The current schedule is once daily at 07:30 UTC. That is not a real-time delivery contract.

Before public activation:

- drain immediately after settlement commits, while keeping the durable retry worker;
- add a suitably frequent retry schedule supported by the deployed platform;
- measure event-to-delivery latency;
- set an SLO;
- expose p50/p95/p99;
- keep the paid copy gated or use “settlement alerts” until the SLO is proven.

## 6.9 Channel polish

- Distinguish expired push subscription (404/410) and remove it.
- Distinguish retryable push/email failures from permanent rejection.
- Do not return `disabled` for an unexpected infrastructure exception.
- Batch user and entitlement lookups; remove N+1 fan-out.
- Avoid unbounded per-event JSON growth.
- Add email/push content version, locale, and deep link.
- Preserve unsubscribe/notification-preference rules.

## 6.10 Settlement post-processing completeness

CLV grading and snapshot updates occur after the pick settlement/outbox transaction.

Add a durable post-settlement work state or events for:

- CLV grading;
- signal snapshot outcome;
- TeamGameLog.

A crash after pick settlement must be repairable without relying on accidental reruns.

## 6.11 #161 acceptance

- stable scheduler retry identity;
- duplicate scheduler invocation does not corroborate;
- three genuinely distinct source snapshots do;
- database cascade cannot erase evidence;
- owner request and owner decision history both exist;
- 100 concurrent promotions produce one queue request;
- per-recipient/channel delivery rows;
- partial delivery retry without duplicate success;
- max attempts is a true invariant;
- lease fencing test;
- dead-letter owner receipt;
- event-time payload/recipient semantics test;
- cron reports failure honestly;
- measured alert-latency test harness;
- all prior settlement, CLV, snapshot, push, email, and watchlist tests remain green.

---

# 7. CRITICAL REMEDIATION — PR #158 TRANSPORT BOUNDARY

The AST rewrite is good. Close the remaining bypasses.

## 7.1 Confirmed gaps

Add detection for:

- static namespace import of `messages.ts`;
- static default import of `messages.ts`;
- `export * from messages.ts`;
- indirect barrel re-export of raw transport;
- computed/aliased access to namespace imports;
- new SDKs/endpoints generated from the canonical provider registry.

## 7.2 Transitional allowlist

Today the allowlist includes legacy:

- `provider-dispatch.ts`;
- `free-lane.ts`.

After the control-plane migration:

- only exact provider adapter files and the sealed control-plane executor may reach transport;
- `free-lane.ts` must be absorbed or deprecated;
- `callClaude` becomes a compatibility wrapper that calls `executeAiTask`, not a competing dispatcher;
- the guard flips so new application code may import only the public control-plane API.

## 7.3 #158 acceptance

- namespace/default/export-star fixtures;
- barrel-reexport fixture;
- mutation test that each rule fails when removed;
- generated SDK/endpoint registry from NOVA-reviewed provider data;
- no docs claim beyond structural import reachability.

---

# 8. CRITICAL REMEDIATION — PR #162 CONTRACT AND POLICY AUTHORITY

The current contract places policy authority in the caller. That must be inverted.

## 8.1 Separate task invocation from task policy

Current `AiTaskRequest` lets the caller specify:

- providers;
- cost modes;
- cash cap;
- substitutions;
- validation;
- retention;
- capability floor.

Replace with:

```ts
interface AiTaskInvocationRequest {
  taskClass: RegisteredAiTaskClass;
  requestId: string;
  actor: TrustedActor;
  entity: Entity;
  input: unknown;
  correlation?: {...};
}

interface AiTaskPolicyDefinition {
  taskClass: RegisteredAiTaskClass;
  surface: AiSurface;
  dataPolicy: DataPolicy;
  capabilityFloor: CapabilityFloor;
  permittedProviderRoutes: ProviderRouteId[];
  permittedModes: CostMode[];
  maxVendorCashUsd: Decimal;
  requiredBudgetScopes: BudgetScopeTemplate[];
  approvedSubstitutions: ModelSubstitutionId[];
  validationPolicy: OutputValidationPolicy;
  retentionPolicy: RetentionPolicy;
  policyVersion: string;
}
```

The executor loads the policy from a versioned registry. The caller may request less authority, never more.

## 8.2 Seal production dependencies

The public runtime entry point must not accept:

- arbitrary env objects;
- arbitrary dispatch functions;
- arbitrary DB handles;
- arbitrary budget windows;
- arbitrary pricing registries;
- arbitrary actual-cost functions.

Use:

```ts
createAiExecutor(sealedDependencies)
executeAiTask(request)
```

Keep dependency injection in test/internal modules only. Guard the production export surface.

## 8.3 Replace `ActorRef`

Rebase onto #159 and use the hardened `TrustedActor`. No temporary `USER` vocabulary lands on `main`.

## 8.4 Complete validation

Validate or registry-resolve:

- registered task class;
- full capability floor;
- provider route IDs;
- cost modes;
- substitution IDs;
- schema reference;
- retention consistency and TTL;
- data classification;
- request ID format/length;
- actor authority;
- max input/output;
- no secret/credential material;
- policy version.

Production may not use `policyVersion="unversioned"`.

## 8.5 Expand data policy carefully

A single coarse enum is insufficient for all routing decisions.

Use composable tags where needed:

- public;
- internal;
- user-private;
- PII;
- regulated;
- payment-adjacent;
- secret/credential-prohibited;
- rights-restricted;
- training-prohibited;
- residency-restricted.

Do not pass card data through the AI control plane.

## 8.6 Emergency authority

`EMERGENCY_RELIABILITY` cannot be merely three environment variables.

Require:

- durable owner decision receipt;
- approving TrustedActor;
- reason;
- scope;
- maximum spend;
- expiration;
- one-time override ID;
- revocation;
- Founder OS visibility.

Environment configuration may reference the approved override; it may not create one.

## 8.7 #162 acceptance

- caller cannot grant itself a provider, mode, cap, retention, or substitution;
- production export cannot inject alternate env/dispatch/store;
- TrustedActor integrated;
- task policy registry versioned;
- malformed policy fails build/startup;
- emergency receipt required;
- existing 62 tests retained and expanded with authority-escalation attacks.

---

# 9. CRITICAL REMEDIATION — PR #163 INVOCATION / ATTEMPT / ATTRIBUTION

## 9.1 Split authoritative control state from optional telemetry

These are authoritative and must fail closed before external dispatch:

- task policy resolution;
- invocation claim/idempotency;
- budget or credit authorization;
- provider-attempt authorization;
- actor authorization.

These may degrade without changing a successful provider result:

- secondary analytics;
- dashboard projection;
- nonessential logs;
- delayed enrichment.

Create:

```text
AuthoritativeControlStore
ObservabilitySink
```

Do not swallow a failed invocation claim and then dispatch.

## 9.2 Fix concurrent idempotency

Current race:

```text
caller A findExisting → null
caller B findExisting → null
A create
B create → unique error swallowed
A dispatch
B dispatch
```

A second flaw occurs when the existing row is `RUNNING`: the current code proceeds with another dispatch.

Implement an atomic claim:

```text
AiInvocation:
  requestFingerprint
  executionOwnerToken
  leaseExpiresAt
  heartbeatAt
  resultRef/resultHash
  policyVersion
```

Behavior:

- create-or-claim atomically;
- same request ID + different fingerprint → conflict;
- active lease → return IN_PROGRESS or wait; never dispatch again;
- stale lease → explicit recovery/steal protocol;
- terminal replay returns the original validated result or a durable result reference;
- no `output: undefined` while reporting terminal success;
- attempts and funding label come from persisted original state.

## 9.3 Provider-specific dispatch

The current default dispatcher ignores the selected `ctx.provider` and calls the legacy `callClaude`, which can route/fallback internally.

Replace with exact adapters:

```text
dispatchAnthropicDirect
dispatchBedrock
dispatchVertex
dispatchCerebras
dispatchLocal
```

One attempt equals one provider route. No nested fallback. The control plane alone owns fallback order.

## 9.4 Durable attempt semantics

Before dispatch:

- authoritative attempt row exists;
- provider route and model are resolved;
- request fingerprint and policy version recorded;
- attempt lease/nonce exists.

After dispatch:

- provider request ID;
- exact error taxonomy;
- timing;
- token/cache usage;
- result hash;
- ambiguous state;
- no unsupported “provider served” claim.

## 9.5 Financial attribution constraints

Add database constraints:

- one current attribution per invocation/version;
- FK from attempt ID;
- no confirmed fields without `reconciledAt`;
- billed amount nonnegative;
- confirmed-credit label requires grant allocation reference;
- dispatch writer cannot mutate reconciliation fields.

## 9.6 Persist blocked decisions

Configuration, policy, credit, and budget blocks must feed Founder OS even when no provider call occurs.

Use a durable `AiPolicyDecision` / control-plane event, or create the invocation before the relevant gate with a non-dispatchable state. Never require a model call to create the incident.

## 9.7 Durable recovery outbox

The blueprint required a durable drain-later path; the current PR defers it.

Use the shared, hardened outbox semantics from #161, not the flawed pre-hardening implementation.

## 9.8 #163 acceptance

- 100 concurrent identical requests produce one dispatch;
- active RUNNING replay never dispatches;
- stale lease recovery is deterministic;
- changed payload under same request key conflicts;
- terminal replay returns original result;
- control-store unavailable blocks external dispatch;
- observability-store unavailable does not retry a successful provider call;
- default dispatch respects exact provider;
- nested fallback impossible;
- pre-dispatch attempt failure blocks dispatch;
- post-success telemetry failure returns success and queues recovery;
- blocked policy/config event appears in owner queue.

---

# 10. CRITICAL REMEDIATION — PR #164 BUDGETS

## 10.1 Ambiguous charge must retain the hold

Current execution releases every reservation when no attempt succeeds, including `AMBIGUOUS`.

Fix:

```text
FAILED_NO_CHARGE → release
POLICY/BUDGET_BLOCKED_PRE_DISPATCH → no charge / release
AMBIGUOUS_AFTER_DISPATCH → RECONCILIATION_HOLD
SUCCEEDED → provisional settlement
```

Add a reservation state such as:

```text
HELD
PROVISIONALLY_SETTLED
RECONCILIATION_HOLD
CONFIRMED_SETTLED
RELEASED
EXPIRED
```

The sweeper must query authoritative attempt state; no caller-provided exclusion list is sufficient.

## 10.2 Protect the cap during settlement

Current settlement accepts `actualUsd > heldUsd` and the database has no `reserved + settled <= cap` check.

Add:

- application guard;
- conditional SQL update;
- database CHECK;
- overage incident;
- circuit breaker;
- no silent negative or over-cap state.

If actual cost exceeds the reservation, preserve the real charge and move the budget to `OVERAGE_LOCKED`; block further spend and alert the owner.

## 10.3 Zero-dollar billable authorization

`maxVendorCashUsd=0` may not authorize a billable provider call. A zero cap means no cash authorization.

## 10.4 Reserve the worst case of the entire attempt plan

The worst case includes:

- every permitted attempt that may incur a charge;
- retry/fallback count;
- input/output/cache/tool pricing;
- provider-specific minimums;
- potential ambiguous attempt plus successful fallback.

Prefer per-attempt reservations or one invocation reservation equal to the sum of all authorized attempt ceilings.

## 10.5 Required budget scopes come from policy

Call sites may not choose arbitrary window IDs.

The registry resolves required windows:

- request;
- daily;
- monthly;
- surface;
- provider account;
- entity;
- emergency override.

Missing any required window fails closed.

## 10.6 Make reservations idempotent and relational

Add:

- FK to invocation;
- unique `(invocationId, windowId, reservationVersion)`;
- state checks;
- cap invariant;
- nonnegative checks;
- idempotent reserve/release/settle;
- exact Decimal handling.

## 10.7 Distinguish provisional from confirmed spend

Do not call the worst-case cap “settled actual” before reconciliation.

Track:

- reserved;
- provisional consumed;
- confirmed billed;
- confirmed credit applied;
- released;
- disputed/ambiguous.

## 10.8 Credits also require reservation

A fresh credit snapshot is not enough under concurrency. Ten simultaneous calls can each see the same remaining balance and collectively exceed it, causing cash overage.

NOVA remains the canonical owner of credit tables. Define a port:

```ts
interface CreditAuthorizationPort {
  authorizeAndReserve(request): Promise<CreditReservation>;
  settleProvisional(...): Promise<void>;
  reconcile(...): Promise<void>;
  release(...): Promise<void>;
}
```

The control plane consumes the port; S5 implements it against NOVA-owned persistence.

Until that adapter exists, `CONFIRMED_CREDITS_ONLY` remains unreachable in production.

## 10.9 #164 acceptance

- ambiguous attempt retains all relevant holds;
- sweeper cannot release ambiguous holds;
- actual > hold test;
- database cap CHECK test;
- zero-dollar cash authorization rejected;
- fallback worst-case reservation test;
- missing mandatory scope rejected;
- duplicate reserve idempotent;
- 100 concurrent end-to-end invocations stay within cap;
- integration test is mandatory in CI and emits a retained artifact;
- crash between reserve/dispatch/settle is recoverable.

---

# 11. NOVA CREDIT CONTRACT — S1 BEFORE PR-D

The existing `MoneyState` is a general opportunity-money state. Do not overload it into every credit fact.

## 11.1 S1 credit decomposition

Add NOVA-owned contracts:

```text
CreditProgramState
CreditApplicationState
CreditGrantState
CreditBalanceState
CreditAllocationState
```

At minimum:

```text
CreditApplicationState:
  DISCOVERED
  ELIGIBILITY_UNVERIFIED
  ELIGIBLE
  APPLIED
  APPROVED
  REJECTED
  EXPIRED

CreditGrantState:
  APPROVED
  ACTIVATED
  PARTIALLY_CONSUMED
  EXHAUSTED
  EXPIRED
  REVOKED

CreditAllocationState:
  AVAILABLE
  RESERVED
  PROVISIONAL
  APPLIED_CONFIRMED
  RELEASED
  DISPUTED
```

Define explicit mappings to the broader `MoneyState`; do not make the two interchangeable.

## 11.2 Credit snapshot contract

A world-class snapshot needs more than `remainingUsd`.

Include:

- program ID;
- application/grant ID;
- provider;
- billing account/project;
- currency;
- original award;
- remaining amount;
- reserved amount;
- effective/activation date;
- expiration;
- eligible products/services;
- eligible models;
- regions;
- exclusions;
- cash-overage behavior;
- observedAt;
- recordedAt;
- freshness horizon;
- source receipt ID/hash;
- reconciliation state;
- attesting actor/system;
- schema/policy version.

No receipt, no snapshot. No covering scope, no admission. No atomic reservation, no activation.

## 11.3 PR-D scope

After S1:

- implement snapshot validation;
- coverage matching;
- freshness;
- sufficiency;
- fail-closed admission;
- the `CreditAuthorizationPort` interface;
- tests against a fake adapter;
- no Prisma credit tables in PR-D;
- no reachable production credit mode.

S5 later owns table materialization and real adapter.

---

# 12. NOVA SPLIT S1–S4 — PROCEED NOW

## S1 — deterministic domain contracts

Proceed immediately, incorporating the credit refinement above.

Acceptance:

- pure TypeScript;
- zero Prisma;
- exact transition/property tests;
- invalid states unrepresentable where practical;
- no invocation/budget/settlement types;
- deterministic receipt;
- no duplicate status vocabularies without an adapter/mapping.

## S2 — capability inventory and governor

Proceed after S1 branch exists.

Improve:

- source/provenance hash;
- exact skill permission manifest;
- context-cost estimate;
- network/file/write scope;
- stop conditions;
- rollback;
- observed performance;
- maintenance owner;
- version drift;
- supply-chain state.

The governor selects at most three inspection candidates and may not auto-activate them.

## S3 — source registry/runtime/evidence

Proceed after S1.

Add:

- deterministic convergence inventory capability;
- source receipt schema;
- run lease/checkpoint;
- partial-run salvage;
- model-switch failure recovery;
- exact failed-closed outcome;
- no “no receipt” success;
- source freshness, effective time, and recorded time;
- parser version;
- redirect/content-type/size policies;
- append-only event/run receipts;
- alert on repeated source failure.

Historical NOVA receipts remain `FAILED_CLOSED`.

## S4 — Founder OS and cockpit

Proceed after S1–S3 as a read-only draft.

One cockpit, one queue.

Surface:

- owner decisions;
- evidence freshness;
- failed agent runs;
- source failures;
- settlement anomalies;
- checkout ambiguity;
- dead letters;
- control-plane blocks;
- budget holds/overages;
- credit applications and grant snapshots;
- revenue opportunities;
- owner minutes;
- next smallest action.

UI polish:

- mobile responsive;
- accessible keyboard and screen-reader flow;
- no dense unscrollable tables;
- clear state language;
- fact vs inference;
- last verified time;
- source receipt;
- no green status from absent evidence;
- no second LLM-cost dashboard.

---

# 13. PROVIDER HARDENING MAY BEGIN AS DORMANT WORK

Do not activate call sites yet, but do not sit idle.

Split PR-E:

## E0 — provider/model registry

- exact provider routes;
- account/region;
- economic class;
- data/privacy capability;
- model capability matrix;
- pricing version;
- deprecation state;
- known SDK/model IDs;
- NOVA change-feed review packet;
- owner-approved substitutions.

## E1 — exact provider adapters

- no nested fallback;
- timeouts;
- abort signals;
- response-size limits;
- request IDs;
- typed errors;
- ambiguous-outcome classification;
- credential-chain support;
- no logs with secrets/prompt data.

## E2 — call-site inventory and contract mapping

Deterministically inventory every model call and map:

- task class;
- input/output;
- data class;
- current model/provider;
- volume;
- user-facing vs internal;
- validation;
- retention;
- cost;
- migration risk.

## E3 — shadow adapters, default OFF

Build adapters and tests behind an unreachable/default-off flag. No production call routes through them.

## E4 — owner-gated activation

Only after:

- #159–#164 hardening;
- S1 + PR-D;
- S5 credit adapter if credit mode is used;
- cumulative integration proof;
- owner authorization.

---

# 14. SHARED DURABLE-WRITE CAPABILITY GATE

The repository currently supports a stub Prisma client that silently no-ops writes.

That is useful for public read-only/demo surfaces but unacceptable for protected writes.

Create one canonical guard:

```ts
assertDurableWriteCapability({
  capability,
  actor,
  requiresTransaction,
  externalSideEffectPlanned
});
```

Use it for:

- Stripe customer/session creation;
- Stripe webhook entitlement writes;
- settlement;
- outbox claims;
- moderation;
- JARVIS ledgers;
- NOVA persistence;
- AI invocation claims;
- budget/credit reservations;
- owner decisions.

Production behavior:

- stub DB → fail closed;
- unknown DB capability → fail closed;
- no external side effect occurs first;
- health/capability graph reports unavailable;
- Founder OS receives incident.

Nonproduction may use explicit simulation mode, but it may not possess live provider or Stripe credentials.

---

# 15. CUMULATIVE PRE-MERGE INTEGRATION TRAIN

Individual green PRs are not cumulative proof.

Create:

```text
integration/gse-nova-control-plane-premerge-2026-07-22
```

from current `main`.

Apply candidate units in intended order:

1. #153
2. #154
3. corrected #158
4. hardened #159
5. hardened #160
6. hardened #161
7. corrected #162
8. corrected #163
9. corrected #164
10. S1
11. PR-D dormant contracts/admission
12. S2
13. S3
14. S4

Do not merge the integration branch to main.

## 15.1 Required database tests

Run against:

1. fresh empty Postgres;
2. current-main schema upgraded by migrations;
3. migration re-run where idempotency is claimed;
4. rollback/restoration rehearsal;
5. schema drift check;
6. all CHECK/unique/FK constraints;
7. no `db push` used as production-migration proof.

## 15.2 Required full verification

- locked install;
- Prisma generate;
- Prisma validate;
- migration apply;
- root lint;
- root typecheck;
- every workspace test;
- all guardrails;
- secret scan;
- production build;
- browser smoke;
- authenticated cockpit QA;
- checkout test-mode harness without live mutation;
- concurrency tests;
- crash/recovery tests;
- migration diff;
- cumulative conflict matrix;
- preview deployment only when already authorized by existing workflow;
- retained CI artifacts.

## 15.3 Required adversarial lenses

Run independent reviews for:

- authentication/authorization;
- payment ambiguity and double billing;
- settlement correctness;
- outbox duplication/loss;
- budget/credit overspend;
- provider/payer truth;
- migration/rollback;
- privacy/data retention;
- public paid-promise parity;
- accessibility/mobile usability;
- source/evidence truth;
- performance and N+1 behavior.

Every confirmed finding is fixed, retested, and recorded before the owner packet.

---

# 16. IMPROVE AND POLISH LOOP — MANDATORY FOR EVERY UNIT

The user’s instruction is not merely “make tests pass.” Every unit must improve while it is open.

For each task:

```text
1. REVIEW current code and prior findings
2. FREEZE the smallest correct contract
3. IMPLEMENT
4. RUN focused tests
5. ADVERSARIALLY REVIEW the actual diff
6. FIX confirmed findings
7. POLISH:
   - naming
   - types
   - error taxonomy
   - auditability
   - observability
   - accessibility
   - performance
   - docs
   - rollback
8. RUN mutation/concurrency/failure tests
9. RUN cumulative verification
10. UPDATE truth docs and receipts
11. COMMIT/PUSH
12. CONTINUE to the next dependency-ready unit
```

Never weaken a test or guardrail merely to get green.

Never call a unit complete because:

- a local file exists;
- a model said it is correct;
- a branch is green in isolation;
- a preview deployed;
- a mocked race passed;
- a maximum credit amount was discovered;
- a provider was used;
- a notification function returned without throwing.

Completion requires the exact evidence contract.

---

# 17. MODEL AND TOKEN ALLOCATION

Use Fable 5 UltraCode now for:

- the authority inversion in PR #162;
- authoritative-state vs telemetry split;
- idempotency/lease design;
- ambiguous-charge and budget semantics;
- credit reservation/ownership boundary;
- settlement/outbox state machine;
- payment ambiguity;
- migration and rollback adjudication;
- final adversarial review.

Use Sonnet-class implementation agents for:

- explicit code changes after the contract is frozen;
- tests;
- Prisma wiring;
- route and UI implementation;
- refactors;
- documentation updates.

Use deterministic scripts/local models for:

- branch inventory;
- file/symbol extraction;
- repetitive tests;
- lint/type repair;
- fixture creation;
- docs formatting;
- build-test loops.

One agent builds; another attacks the result. Do not have two premium agents independently invent competing architecture.

---

# 18. REVISED MERGE POSTURE

Do not authorize the current merge train yet.

## Safe candidates after ordinary rebase

- #153
- #154

## Must be corrected before owner merge packet

- #158
- #159
- #160
- #161
- #162
- #163
- #164

## Reference/archive

- #146 remains open and unmerged as the integration/reference branch.
- #148/#151 remain evidence/test sources until corrected #162/#163 map every retained unit, then close.
- #150 remains parked optional tooling.
- #152 remains the truth/control-document branch and receives the hardening addendum.

The eventual owner merge packet should propose a sequential order only after the cumulative integration branch is green.

---

# 19. REQUIRED FINAL REPORT FROM THIS EXECUTION CYCLE

Return one consolidated report containing:

## Repository truth

- current `main` SHA;
- every open relevant PR;
- base/head SHA;
- draft/ready state;
- mergeability;
- CI state;
- dependency;
- disposition.

## Work performed

- exact files changed;
- exact branches/PRs;
- exact corrective finding each change addresses;
- what was improved/polished beyond the minimum.

## Verification

- commands;
- exit codes;
- test counts;
- database type;
- concurrency results;
- migration results;
- browser results;
- artifacts and hashes.

## Honest residuals

Classify each:

- `FIXED_AND_PROVEN`
- `IMPLEMENTED_ON_DRAFT_BRANCH`
- `CI_GREEN_IN_ISOLATION`
- `CUMULATIVELY_PROVEN`
- `FAILED_CLOSED`
- `OWNER_GATE`
- `EXTERNAL_BLOCKER`
- `INTENTIONAL_DEFERRED`

## Owner packet

Maximum five owner decisions, each with:

- what;
- why;
- risk;
- exact reversible action;
- rollback;
- evidence;
- estimated owner minutes.

## Negative proof

State explicitly that no:

- merge;
- deploy;
- production migration;
- live Stripe mutation;
- billable-mode activation;
- credit application;
- outreach;
- notification activation;
- publication;
- branch deletion

occurred.

---

# 20. IMMEDIATE EXECUTION ORDER

Begin now. Do not wait for another owner message.

1. Append the freeze hardening addendum to #152.
2. Build and commit the deterministic convergence-inventory tool and receipt.
3. Correct #159 anonymous-report and service-actor governance.
4. Correct #160 migration, durable-store gate, ambiguous checkout state, and audit retention.
5. Correct #161 stable run identity, append-only FK policy, owner-decision history, and outbox delivery semantics.
6. Correct #158 namespace/export-star gaps and prepare the post-migration allowlist flip.
7. Redesign #162 so policy is registry-owned and dependencies are sealed.
8. Redesign #163 authoritative claim/idempotency/provider-specific dispatch.
9. Redesign #164 ambiguous holds, cap settlement invariant, full-attempt reservations, and credit-reservation port.
10. Build S1 with the canonical credit contract.
11. Build PR-D dormant admission logic stacked on S1.
12. Build S2 and S3.
13. Build S4 read-only Founder OS.
14. Build E0–E3 dormant provider hardening/migration scaffolding.
15. Create and prove the cumulative integration branch.
16. Return the owner packet. Do not merge.

---

# 21. TERMINAL STANDARD

This cycle is complete only when:

- the freeze is truthful about draft state;
- the inventory is reproducible without a model;
- no caller can grant itself AI authority;
- no external AI call occurs without authoritative preauthorization;
- concurrent idempotent calls dispatch once;
- ambiguous charges preserve funds and block further spend;
- cash and credit caps cannot be exceeded under concurrency;
- Stripe cannot be called without durable state;
- ambiguous checkout retries keep the same identity;
- settlement retries do not fabricate corroboration;
- evidence cannot disappear through cascade deletion;
- owner decisions are append-only;
- delivery failures are retryable per recipient/channel without duplicating successes;
- dead-letter and queue health are visible;
- “real-time” is either measured or not claimed;
- S1 owns the credit vocabulary;
- PR-D consumes NOVA rather than forking it;
- one cockpit and one owner queue remain;
- the cumulative stack passes the full proof ladder;
- every touched unit received improvement and polish, not just a patch;
- the only remaining actions are genuinely owner-only.

The operative law is:

> **Broad preservation. Narrow activation. Caller authority minimized. Economic truth reconciled. Evidence append-only. Failures visible. Every improvement proven in the combined system—not merely described on an isolated branch.**
