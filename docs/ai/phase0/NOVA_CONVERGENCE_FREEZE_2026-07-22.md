# NOVA Convergence Freeze — 2026-07-22

Status: **FROZEN**. This document is the binding convergence record between the
NOVA branch (#146, `codex/nova-ai-opportunity-engine-2026-07-21`, head
`fbc3cfe`) and the AI control-plane stack (#162→#163→#164) plus the shared
infrastructure landed by the Phase 1 remediation PRs (#159 actor, #161 outbox).
From this point forward, any PR that violates a boundary in §2 or a consumption
rule in §3 is architecturally rejected regardless of its CI status.

Authority: owner directive 2026-07-22 ("freeze the #146 convergence"). No merge,
deploy, or production mutation is performed or authorized by this document.

---

## 1. The problem this freeze ends

#145's descendants and #146 were converging on the same five conceptual
domains (credit lifecycle, economic policy, invocation telemetry, persistence,
owner surfaces) from two directions. Phase 0 mapped the overlap; Phase 1/2
built the control-plane side. Without a freeze, the #146 split would re-invent
invocation/budget schemas, and control-plane PR-D would re-invent credit
schemas — the exact parallel-systems failure the governing plan forbids.

## 2. Canonical ownership — FROZEN (one owner per domain, no exceptions)

| Domain | Canonical owner | The other side may… | The other side may NOT… |
|---|---|---|---|
| Credit-program lifecycle (programs, applications, grants, balances, allocations) | **NOVA** | control plane reads grant **snapshots** via the read-model contract (§3.1) | define/write any credit program/grant/balance table or state machine |
| AI invocation policy, routing, attempts, budgets, financial attribution | **AI control plane** (#162–#164: `AiInvocation`, `AiAttempt`, `AiFinancialAttribution`, `AiBudgetWindow`, `AiBudgetReservation`, cost-mode resolver) | NOVA reads invocation/attribution read models for cockpit economics | define/write any invocation, attempt, usage-dispatch, or budget table |
| Sports settlement observations, anomalies, grading, decisions | **Settlement domain** (#161) | NOVA surfaces settlement anomalies in the owner queue via read model | duplicate settlement evidence/outbox models |
| Actor identity & audit receipt | **Shared infrastructure** (#159 `TrustedActor` HUMAN\|SERVICE\|SYSTEM) | everyone consumes it | mint parallel actor/identity contracts (the control plane's temporary `ActorRef` stub is bound to swap to `TrustedActor` when #159 merges — recorded in #162) |
| Transactional outbox & idempotent delivery | **Shared infrastructure** (#161's `PickSettlementEvent` pattern → to be generalized once, not per-domain) | NOVA schedulers/workers and control-plane telemetry adopt the same claim/reclaim pattern | build a second outbox semantics (new event *tables* per domain are fine; new *delivery semantics* are not) |
| Source monitoring, opportunity lifecycle, Founder OS, owner decision queue, revenue prioritization | **NOVA** | control plane emits events/read models INTO the owner queue | build a second cockpit, owner queue, or LLM-cost dashboard |

**One cockpit. One owner queue. One economic truth model.** The Founder OS is
the only place owner decisions surface; `SettlementDecision` receipts (#161)
and control-plane `ConfigurationError`/override events feed it — they do not
grow their own UIs.

## 3. Consumption contracts — FROZEN

### 3.1 Credit truth flows NOVA → control plane (never the reverse)
- NOVA owns the full lifecycle state machine
  (DISCOVERED→…→ACTIVATED→PARTIALLY_CONSUMED→EXHAUSTED/EXPIRED/REVOKED…).
- The control plane consumes **only** an immutable snapshot read model —
  blueprint name `CreditGrantSnapshot` (§PR-D of
  `AI_CONTROL_PLANE_DESIGN_2026-07-22.md`): `{program, providerScope, state,
  remainingUsd, expiresAt, observedAt, sourceReceipt}` — written exclusively by
  NOVA-side reconcilers/attestation. **No receipt, no snapshot. Stale snapshot,
  no credit admission.** `CONFIRMED_CREDITS_ONLY` admits a provider only on a
  fresh, covering, sufficient snapshot; everything else fails closed.
- Binding rule for PR-D: if #146 already defines a credit-state contract
  (§5 inventory), PR-D's snapshot model MUST be derived from (and named
  consistently with) NOVA's contract, and the Prisma table is created **in the
  NOVA persistence split unit (S5, §4)** — PR-D contributes the read/admission
  logic only. If #146's contract is TypeScript-only (unwired), the Prisma
  materialization still lands in S5 with PR-D consuming it behind an interface.

### 3.2 Economics flow control plane → NOVA (never the reverse)
NOVA's cockpit reads `AiInvocation`/`AiAttempt`/`AiFinancialAttribution` and
budget-window state through read models. NOVA never writes them, never
duplicates them, and never renders "cash billed" from anything but
`reconciledLabel` (which only post-billing reconciliation writes).

### 3.3 Shared primitives are singular
`TrustedActor` (#159) is the identity contract everywhere, including NOVA
schedulers (SERVICE/SYSTEM actors). The outbox claim/reclaim/attempt-count
semantics of #161 are the delivery pattern everywhere. New copies are rejected.

## 4. The #146 split — FROZEN sequence and acceptance gates

#146 stays open, unmerged, as the **reference/integration branch**. Its content
lands through six ordered units, each an independent draft PR off `main`:

| Unit | Content | Hard precondition | Acceptance gate |
|---|---|---|---|
| **S1** | Deterministic NOVA domain contracts + tests (pure TS, no persistence) | none | contracts compile/test standalone; zero Prisma changes; no collision with §2 names |
| **S2** | Capability inventory + governor + tests | S1 | governs commands/capabilities per Phase 0 scoring; no persistence |
| **S3** | Source registry + local runtime + **failed-closed evidence receipts** | S1 | a validation run without a reproducible immutable receipt records FAILED_CLOSED; the historical failed receipts stay labeled failed |
| **S4** | Founder OS + read-only cockpit surfaces | S1–S3 | read models only; consumes control-plane economics (§3.2) and settlement anomalies; no writes, no second dashboard |
| **S5** | NOVA persistence (credit lifecycle tables incl. the §3.1 snapshot, opportunity/owner-queue tables) | **this freeze** + #159 merged (actor) + additive-migration rules | consumes `TrustedActor`; credit tables match S1 contracts; zero invocation/budget/settlement tables |
| **S6** | Scheduler / locks / workers / outbox consumers | S5 + #161 merged (outbox pattern) | workers claim idempotently per §3.3; SERVICE actors; no new delivery semantics |

Cross-unit rule: **later units may not begin before their preconditions merge.**
S1–S4 are safe to build as drafts immediately (no persistence, no behavior).

## 5. #146 inventory binding (exact identifiers, verified read-only against `fbc3cfe`)

Verification base: merge-base with `main` is `bf931ab`; the 70-file diff vs
current `main` (`c19a00d`) includes main-side drift (CLV/dispersion work) —
NOVA's own additions are the `apps/web/lib/opportunity-engine/*`,
`apps/web/app/cockpit/nova/*`, `scripts/nova/*`, `data/nova/*.json`,
`docs/ai/nova/*` files and tests.

### 5.1 The decisive facts
1. **#146 adds ZERO Prisma models.** `git diff bf931ab fbc3cfe --
   packages/db/prisma/schema.prisma` introduces no `model`/`enum`. All NOVA
   state lives in TypeScript contracts + `data/nova/*.json` + `.nova-runtime/`
   scratch. The branch's "persistence unwired" claim is **verified true** —
   S5 is greenfield and there is no DB-level collision surface at all.
2. **Zero name collisions.** `git grep` across the engine and `scripts/nova`
   finds no `AiInvocation|AiAttempt|AiFinancialAttribution|AiBudget*|
   CreditGrantSnapshot|CreditProgram`. The §6 collision policy is therefore
   prophylactic, not remedial.

### 5.2 NOVA's credit/money contract (the thing PR-D consumes)
- `MoneyState` (`apps/web/lib/opportunity-engine/types.ts:73`) — 13-value
  union: `not_applicable | hypothetical | discovered | eligibility_unverified
  | eligible | applied | approved | activated | earned | invoiced | paid |
  expired | rejected`.
- Transition machine (`lifecycle.ts`): `MONEY_STATE_ORDER` (forward-only
  through `paid`; `expired`/`rejected` terminal), enforced by
  `canTransitionMoneyState()` / `assertMoneyStateTransition()`.
- Credits are carried as `OpportunityEconomics.availableCredits?:
  EconomicRange | null` alongside `moneyState: MoneyState` (`types.ts:186–191`).
- **Binding for PR-D / S1:** the blueprint's `CreditGrantSnapshot.state`
  vocabulary (`APPROVED|ACTIVATED|PARTIALLY_CONSUMED|EXHAUSTED|EXPIRED|
  REVOKED`) is NOT yet expressible in `MoneyState` (no consumed/exhausted/
  revoked). Per the NOVA-name-wins rule, **S1 adds a `CreditGrantState`
  refinement to the NOVA contracts** (a per-grant sub-state of an `activated`
  MoneyState opportunity), and PR-D consumes that refinement through the §3.1
  snapshot interface. PR-D does not mint its own vocabulary.

### 5.3 Contract inventory by split unit
- **S1 (domain contracts)** — `types.ts`: `OpportunityClass`, `RevenueLane`,
  `EvidenceTier`, `RightsStatus`, `SecurityPosture`, `MoneyState`,
  `OpportunityLifecycleState`, `OpportunityDisposition`, `PriorityBand`,
  `CouncilReviewer`, `SourceTransport`, `SourceAuthority`, and interfaces
  `OpportunitySource`, `OpportunityEvidence`, `EconomicRange`,
  `OpportunityEconomics`, `OpportunitySignals`, `OpportunityRisks`,
  `OpportunityCandidate`, `EvidenceAssessment`, `OpportunityScore`,
  `OpportunityPolicyDecision`, `ExperimentBudget`, `OpportunityExperiment`,
  `OpportunityDecision`, `OpportunityObservation`, `ChangeKind`,
  `MaterialChange`, `OpportunityOutcome`, `LearningBucket`, `LearningReport`,
  `OpportunityPortfolio`; plus `lifecycle.ts`, `scoring.ts`, `policy.ts`,
  `pipeline.ts`, `experiment.ts`, `learning.ts`, `monetization.ts`
  (`MonetizationLaneDefinition`, `MONETIZATION_LANES`).
- **S2 (capability governor)** — `capability-governor.ts`:
  `CapabilityTaskClass`, `CapabilityTrustTier`, `CapabilityRiskFlag`,
  `GovernedCapabilityCandidate`, `CapabilityRoute`,
  `classifyCapabilityTrust()`; `capability-inventory.ts`;
  `data/nova/ai-capability-inventory*.json`.
- **S3 (source registry/runtime + evidence)** — `source-fetch.ts`:
  `OpportunitySourceFetchStatus = "FETCHED"|"NOT_MODIFIED"|"HELD"|"FAILED"`,
  `OpportunitySourceCheckpoint`, `OpportunitySourceFetchOptions`,
  `OpportunitySourceFetchResult`; `source-registry.ts`, `source-monitor.ts`,
  `source-adapters.ts`, `source-schedule.ts`, `source-intake.ts`,
  `change-detection.ts`; `evidence.ts` (`assessEvidence()` over
  `EvidenceTier`); `data/nova/official-source-registry.json`;
  `scripts/nova/*` runtime. S3's acceptance gate holds: a fetch that produces
  no reproducible receipt is `HELD`/`FAILED`, never promoted — the historical
  FAILED_CLOSED receipts stay labeled failed.
- **S4 (Founder OS / cockpit)** — `founder-command.ts`: `FounderWorkLane`,
  `FounderWorkState`, `FounderWorkAuthority =
  "AGENT_INTERNAL"|"OWNER_ONLY"|"AGENT_THEN_OWNER"`, `FounderWorkItem`,
  `FounderOperatingPolicy`, `FounderQueueDecision`, `FounderDailyBrief`,
  `NightlyAutopsyInput`; `founder-work-seed.ts`;
  `app/cockpit/nova/{page,founder/page}.tsx`; `nova-agent.ts`/
  `nova-subagents.ts`.
- **S5/S6** — nothing exists yet (see 5.1.1); built per §4 preconditions.

## 6. Collision policy — FROZEN (verified prophylactic per §5.1)

If any future #146-derived work defines a type/table overlapping
`AiInvocation`/`AiAttempt`/`AiFinancialAttribution`/`AiBudget*`: the
**control-plane names win** (implemented, tested, constraint-proven on
#162–#164); the counterpart is marked SUPERSEDED and its useful fields/tests
fold into the control-plane models — never both.

If the control-plane stack needs a credit concept NOVA already names
(`MoneyState`, the S1 `CreditGrantState` refinement): the **NOVA name wins**;
the control plane consumes, never redefines.

## 7. What this freeze forbids, explicitly

- Merging #146 intact.
- Any new credit/telemetry/budget/actor/outbox schema outside its §2 owner.
- Presenting NOVA source validation as passing (remains **FAILED_CLOSED**).
- Any S5/S6 persistence work before the stated preconditions merge.
- A second cockpit, owner queue, or cost dashboard, in any branch.

## 8. Effect on open work

- **PR-D is UNBLOCKED** under §3.1: it may now be built as the credit
  *admission* layer (read/verify/fail-closed logic + tests against an
  interface), with table materialization deferred to S5.
- **#148/#151** remain open only as test/idea sources; the freeze confirms
  their SUPERSEDED-by-#162/#163 status recorded on their threads.
- The merge train (owner packet §2, Decision A) is unchanged; this freeze
  adds S1→S6 after the Phase 2 stack.
