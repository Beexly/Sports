# AI Control Plane — Phase 2 Implementation Blueprint

Date: 2026-07-22
Status: DESIGN — no code exists on `main` for any of this. This document is the
implementable spec for PRs A–E of the GSE Continuation Directive §4, written so
each PR can be built, reviewed, and reverted independently. It supersedes the
architecture (not the preserved tests/ideas) of draft PRs #148 and #151.

Governing invariants (from the ADR on #152, restated as build requirements):
provider ≠ payer; cost mode explicit + fail-safe; no silent model substitution;
telemetry failure never converts a successful paid call into a retry; one
canonical entry point; evidence before promotion.

---

## PR A — `feat/ai-task-contracts`: task & policy contracts (no behavior change)

### A.1 The one mandatory entry point

```ts
// packages/ai-control-plane/src/execute.ts
export async function executeAiTask(task: AiTaskRequest): Promise<AiTaskResult>
```

Phase-2 scope: `executeAiTask` is introduced as a **compatibility facade over
the existing `callClaude()`** (apps/web/lib/claude-api/provider-dispatch.ts).
It validates the task contract, resolves policy, records the invocation ledger
(PR B), then delegates. No call site is force-migrated in PR A; migration is
incremental and each migrated call site is its own reviewable diff. The
transport import-boundary guard (#158, already AST-based) is later extended so
NEW code may only import `executeAiTask` — `callClaude` joins the restricted
list only after the last call site migrates (that flip is its own PR).

### A.2 Task contract (every field explicit; no defaults that spend money)

```ts
export interface AiTaskRequest {
  taskClass: AiTaskClass;              // e.g. 'pick-explainer', 'journal-summary'
  surface: ClaudeSurface;              // reuse model-router's surface union
  entity: 'GSE' | 'GSN' | 'XXX' | 'PERSONAL';
  dataClassification: 'PUBLIC' | 'INTERNAL' | 'USER_PRIVATE' | 'REGULATED';
  capabilityFloor: CapabilityFloor;    // { reasoningTier, contextTokens, structuredOutput, toolUse, latencyClass }
  permittedProviders: ProviderId[];    // explicit, no wildcard
  permittedModes: CostMode[];          // request-level cap, intersected with env mode
  maxVendorCashUsd: number;            // 0 is a valid and common value
  maxTotalEconomicCostUsd?: number;    // local/electricity accounting, later
  approvedSubstitutions: ModelSubstitution[];  // empty = no substitution ever
  validation: OutputValidationPolicy;  // zod schema ref + numeric-guard flag
  retention: RetentionPolicy;          // prompt/response retention off by default
  requestId: string;                   // caller-supplied idempotency handle
  actor: TrustedActor;                 // from Phase 1A — SERVICE/SYSTEM for workers
}
```

`AiTaskResult` carries `invocationId`, the validated output, `attempts[]`
summaries, and `fundingLabel` (see B.3) — never a bare string.

### A.3 Cost modes and fail-closed resolution

Canonical modes (aliases for #148's names kept temporarily):

```
NO_BILLABLE_EXTERNAL      (alias: zero-cash)
CONFIRMED_CREDITS_ONLY    (alias: credits-only)
BUDGETED_CASH             (alias: normal)
EMERGENCY_RELIABILITY     (new; owner-enabled, time-boxed, reason-coded)
```

Resolution order — the missing-mode problem is solved with an explicit
**environment class**, not a default:

```
AI_ENV_CLASS = 'production' | 'preview' | 'development' | 'test'
```

| AI_ENV_CLASS | LLM_COST_MODE unset | LLM_COST_MODE invalid |
|---|---|---|
| production | **startup ConfigurationError — deploy fails** | ConfigurationError |
| preview | NO_BILLABLE_EXTERNAL | ConfigurationError |
| development | NO_BILLABLE_EXTERNAL | ConfigurationError |
| test | NO_BILLABLE_EXTERNAL | ConfigurationError |

`AI_ENV_CLASS` itself unset → derived conservatively: `VERCEL_ENV=production` →
'production'; `NODE_ENV=test` → 'test'; otherwise 'development'. Derivation is
logged into every invocation record (`envClassSource: 'explicit' | 'derived'`)
so a prod deploy that *derived* its class is visible in the ledger.
`EMERGENCY_RELIABILITY` cannot be set via env var alone: it requires
`LLM_COST_MODE=EMERGENCY_RELIABILITY` **and** a non-expired
`EMERGENCY_RELIABILITY_UNTIL` ISO timestamp + `EMERGENCY_REASON` string; missing
either → ConfigurationError. All three are surfaced in the owner queue.

Effective mode = `min(envMode, task.permittedModes)` where the ordering is
NO_BILLABLE_EXTERNAL < CONFIRMED_CREDITS_ONLY < BUDGETED_CASH. A task may
restrict below the environment; it may never escalate above it.

### A.4 Typed errors (shared, PR A ships the module)

```
Unauthenticated | Forbidden | InvalidInput | ConfigurationError | PolicyBlocked
| BudgetBlocked | ProviderUnavailable | ProviderRejected | AmbiguousCharge
| TelemetryDegraded | StoreUnavailable
```

Each is a class with a `code` literal and a `retriable: boolean`. Mapping rule:
`AmbiguousCharge` and `ProviderRejected` are **never** auto-retried with the
same funds; `PolicyBlocked`/`BudgetBlocked` are never retried at all.

PR A acceptance: contracts + resolver + errors + exhaustive unit tests
(mode×env matrix incl. unset/invalid/derived; alias mapping; intersection
logic). Zero runtime change: nothing imports `executeAiTask` yet.

---

## PR B — `feat/ai-invocation-ledger`: invocation / attempt / attribution

### B.1 Prisma models (additive)

```prisma
model AiInvocation {
  id              String   @id @default(cuid())
  requestId       String   // caller idempotency handle
  taskClass       String
  surface         String
  entity          String
  dataClass       String
  costMode        String   // effective mode at execution
  envClass        String
  envClassSource  String   // 'explicit' | 'derived'
  policyVersion   String
  actorType       String
  actorSubjectId  String
  status          String   // RUNNING | SUCCEEDED | FAILED | POLICY_BLOCKED | BUDGET_BLOCKED
  telemetryStatus String   @default("OK") // OK | DEGRADED — separate from status
  createdAt       DateTime @default(now())
  completedAt     DateTime?
  attempts        AiAttempt[]
  attribution     AiFinancialAttribution[]
  @@unique([requestId, taskClass])   // same request+class replays, never duplicates
  @@index([taskClass, createdAt])
}

model AiAttempt {
  id                 String  @id @default(cuid())
  invocationId       String
  ordinal            Int
  providerRequested  String
  providerUsed       String?   // null until transport actually dispatched
  providerAccount    String?
  region             String?
  modelRequested     String
  modelResolved      String?
  substitutionId     String?   // FK into approved-substitution registry entry
  providerRequestId  String?   // vendor-side id for reconciliation
  status             String    // DISPATCHED | SUCCEEDED | FAILED | TIMEOUT | AMBIGUOUS
  errorCode          String?
  startedAt          DateTime
  endedAt            DateTime?
  inputTokens        Int?
  outputTokens       Int?
  cacheReadTokens    Int?
  cacheWriteTokens   Int?
  pricingVersion     String?
  invocation         AiInvocation @relation(fields: [invocationId], references: [id])
  @@unique([invocationId, ordinal])
}

model AiFinancialAttribution {
  id                    String   @id @default(cuid())
  invocationId          String
  attemptId             String?
  estimatedGrossUsd     Decimal  @db.Decimal(12, 6)
  fundingLabel          String   // pre-call: CASH_EXPECTED | CREDIT_ELIGIBLE_UNCONFIRMED |
                                 //   CREDIT_EXPECTED_FROM_ACTIVE_GRANT | LOCAL_RESOURCE |
                                 //   EXTERNAL_FREE_ALLOWANCE_UNCONFIRMED | BLOCKED
  reconciledLabel       String?  // post-billing: CREDIT_APPLIED_CONFIRMED | CASH_CHARGED_CONFIRMED |
                                 //   NO_VENDOR_CHARGE_CONFIRMED | UNRECONCILED
  creditGrantSnapshotId String?  // never inferred from model id — only from a grant snapshot
  billedUsd             Decimal? @db.Decimal(12, 6)
  reconciledAt          DateTime?
  invocation            AiInvocation @relation(fields: [invocationId], references: [id])
}
```

### B.2 The failed-direct-call fix (the #151 defect)

`providerUsed` is written **only after transport dispatch begins**, and every
fallback creates a NEW `AiAttempt` row with its own status. A failed direct
call is `providerRequested='anthropic-direct', status='FAILED', providerUsed=
'anthropic-direct'` followed by ordinal+1 for the fallback — the ledger can
never claim the failed provider "served" the request, and "cash billed" is
never written by dispatch at all (only `estimatedGrossUsd` + `fundingLabel`).

### B.3 Telemetry cannot break execution

Ledger writes go through a non-throwing emitter: failure sets
`telemetryStatus='DEGRADED'` on a best-effort basis and enqueues to a durable
outbox table (reuse Phase 1E's outbox pattern — same shared-infrastructure
primitive, not a new one). The provider result is returned to the caller
regardless. Test: kill the DB between provider success and ledger write → the
call still returns success; the outbox drains later.

---

## PR C — `feat/ai-budget-reservations`: atomic preauthorization

### C.1 Model

```prisma
model AiBudgetWindow {
  id           String  @id            // e.g. 'monthly:2026-07:surface:pick-explainer'
  scopeKind    String                 // REQUEST | DAILY | MONTHLY | SURFACE | PROVIDER_ACCOUNT | ENTITY
  capUsd       Decimal @db.Decimal(12, 6)
  reservedUsd  Decimal @db.Decimal(12, 6) @default(0)
  settledUsd   Decimal @db.Decimal(12, 6) @default(0)
  updatedAt    DateTime @updatedAt
}

model AiBudgetReservation {
  id            String   @id @default(cuid())
  invocationId  String
  windowId      String
  amountUsd     Decimal  @db.Decimal(12, 6)   // worst-case estimate
  state         String   // HELD | SETTLED | RELEASED | EXPIRED
  createdAt     DateTime @default(now())
  expiresAt     DateTime // auto-release safety net (sweeper releases stale HELDs)
  settledUsd    Decimal? @db.Decimal(12, 6)
}
```

### C.2 Atomicity — one conditional UPDATE, not read-then-write

```sql
UPDATE "AiBudgetWindow"
SET "reservedUsd" = "reservedUsd" + $amount
WHERE id = $window
  AND "reservedUsd" + "settledUsd" + $amount <= "capUsd"
RETURNING id;
```

Zero rows returned → `BudgetBlocked`. Multi-scope reservation acquires windows
in a **fixed lexicographic order** inside one transaction (deadlock-free), and
all-or-nothing: any window failing releases the transaction. Settlement is the
inverse conditional update (move HELD → settled actuals, release remainder).
Worst-case estimate = max output tokens × pricing version; **missing pricing
version fails closed for billable modes** (PolicyBlocked, not a guess).

Concurrency acceptance (the directive's named test): 100 parallel
`executeAiTask` calls against a cap that fits 60 → exactly ≤ cap authorized,
the rest `BudgetBlocked`, and `reservedUsd + settledUsd ≤ capUsd` invariant
holds under `SELECT` audit after the storm. Implemented as an integration test
against disposable Postgres (CI already provisions one).

Unknown-outcome (timeout/disconnect after dispatch): reservation stays HELD,
attempt marked `AMBIGUOUS`, attribution `fundingLabel` stays as pre-call and
`reconciledLabel='UNRECONCILED'` until vendor reconciliation resolves it; the
sweeper never auto-releases an AMBIGUOUS attempt's hold without a receipt.

---

## PR D — `feat/ai-credit-truth`: funding truth (consumes NOVA, never forks it)

Canonical ownership: **NOVA owns the credit-program lifecycle** (#146's
CreditProgramState is the seed). The control plane consumes read-model
snapshots; it never writes program state.

```prisma
model CreditGrantSnapshot {          // written by NOVA-side reconcilers only
  id             String   @id @default(cuid())
  program        String              // 'aws-activate', 'gcp-partner', ...
  providerScope  String              // which provider/account/region/models it covers
  state          String              // APPROVED | ACTIVATED | PARTIALLY_CONSUMED | EXHAUSTED | EXPIRED | REVOKED
  remainingUsd   Decimal  @db.Decimal(12, 2)
  expiresAt      DateTime?
  observedAt     DateTime            // freshness gate: stale snapshot ⇒ not usable
  sourceReceipt  String              // evidence pointer — REQUIRED, no receipt no snapshot
}
```

Rules:
- `CONFIRMED_CREDITS_ONLY` admits a provider **only** when a fresh
  (`observedAt` within TTL), ACTIVATED/PARTIALLY_CONSUMED snapshot covers that
  provider/account/region/model with `remainingUsd ≥` worst-case estimate.
  Anything else fails closed (`PolicyBlocked`).
- `credit-pool.ts`'s current model-id mapping is renamed
  `providerClassForModelId()` and demoted to a display hint. It can never
  produce `CREDIT_APPLIED_CONFIRMED` — only post-billing reconciliation writes
  `reconciledLabel`.
- Manual attestation path: an owner-signed attestation record (via the owner
  queue) may create a snapshot with `sourceReceipt` pointing at the attestation
  — explicit, auditable, never implicit.

---

## PR E — `feat/ai-provider-hardening`

- Model registry table keyed by (family, version, provider, region) with
  lifecycle state, capability matrix, pricing version, source receipt, and
  observedAt. Runtime resolves models ONLY through the registry;
  `resolveAnthropicModelId`'s fixture mapping migrates into it.
- Substitution requires an `approvedSubstitutions` entry whose capability
  matrix ≥ the task's `capabilityFloor` — enforced in code, tested per pair.
  No entry → `PolicyBlocked('substitution-not-approved')`, never a silent
  downgrade.
- Credential chains: Bedrock via standard AWS credential chain (no long-lived
  keys in env where avoidable); Vertex via ADC/workload identity. A missing
  ANTHROPIC_API_KEY must not block a valid Bedrock/Vertex/local route (test
  exists in the matrix).
- Transport limits: per-attempt timeout, bounded retry (never on
  AmbiguousCharge), response byte cap, content-type check, vendor request-id
  capture. internal-llm.ts fixes fold in here: pass AbortController.signal to
  fetch, allowlist endpoint hosts, block link-local/metadata/private ranges
  unless explicitly local-approved, schema-validate output.

---

## Sequencing & review boundaries

A (contracts, no runtime) → B (ledger, additive) → C (reservations) →
D (credit truth read-side) → E (hardening + call-site migration begins).
Each PR: additive Prisma only, disposable-DB `db:push` proof, full guardrails,
and the #158 mutation-suite extended with the new import rules it introduces.
#148/#151 close with unit-by-unit preservation mapping when B lands (their
tests migrate into B's suite).

## Explicitly NOT in scope without owner decision

Enabling BUDGETED_CASH anywhere; setting AI_ENV_CLASS=production values;
activating EMERGENCY_RELIABILITY; any credit application or account mutation;
deleting #148/#151 branches; forcing call-site migration in one sweep.

## Test matrix mapping (directive §8 → where it lives)

Policy/routing → PR A unit suite + PR E integration; Finance → PR C
concurrency + reconciliation suites; Security/privacy → PR E (SSRF, retention,
no-secret-in-ledger assertions run in the existing secret-scan); Quality →
golden sets deferred to local-lane phase (unchanged); Operational →
provider/telemetry/store outage fault-injection in PR B/C using the outbox.
