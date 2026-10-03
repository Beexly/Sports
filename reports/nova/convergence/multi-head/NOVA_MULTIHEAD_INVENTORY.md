# NOVA Multi-Head Convergence Inventory

Deterministic cross-branch inventory produced by `scripts/nova/multihead-inventory.mjs`.

- base: c19a00d86fe45d7e093f3f9ec688d2614e7f87b4
- heads: 7
- collision scan: **COMPLETE_COLLISIONS_FOUND**

## Heads

| label | head SHA | merge-base | changed files | guarded symbols | prisma new/changed | new migrations | routes | new env vars |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `origin/feat/ai-control-plane-contracts` | 4c8af90fe14386168fcda7afc3e6c25412211600 | c19a00d86fe45d7e093f3f9ec688d2614e7f87b4 | 23 | 16 | 5 | 1 | 0 | 7 |
| `origin/nova/s1-domain-contracts` | f0cab9cf2b70840bd8546d495f3ae45ac269df2b | c19a00d86fe45d7e093f3f9ec688d2614e7f87b4 | 15 | 13 | 0 | 0 | 0 | 0 |
| `origin/nova/s2-capability-governor` | 225a64bb584e27176f4ecf9487922ac25743dee5 | c19a00d86fe45d7e093f3f9ec688d2614e7f87b4 | 27 | 13 | 0 | 0 | 0 | 0 |
| `origin/nova/s3-source-runtime` | a7e2c1a83a7b817c9c5affa6a4eaf025da91ce6e | c19a00d86fe45d7e093f3f9ec688d2614e7f87b4 | 30 | 13 | 0 | 0 | 0 | 0 |
| `origin/payments/durable-checkout-attempt` | 6bf296fb0817f2704a057b2d37509b4eb90fb1f0 | c19a00d86fe45d7e093f3f9ec688d2614e7f87b4 | 10 | 0 | 3 | 0 | 2 | 1 |
| `origin/security/trusted-actor-model` | afa2792b0c8740bbb7861f39c1f8511a83ec3752 | c19a00d86fe45d7e093f3f9ec688d2614e7f87b4 | 29 | 1 | 7 | 2 | 1 | 1 |
| `origin/settlement/evidence-outbox` | 034fdf334e9e679aa1331da17e20b754d719d77f | c19a00d86fe45d7e093f3f9ec688d2614e7f87b4 | 34 | 6 | 8 | 2 | 4 | 1 |

## Cross-head collisions

- `cross-head-guarded-symbol`: `CreditAdmissibilityReason` on `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime`
- `cross-head-guarded-symbol`: `CreditAllocationState` on `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime`
- `cross-head-guarded-symbol`: `CreditApplicationState` on `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime`
- `cross-head-guarded-symbol`: `CreditBalanceState` on `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime`
- `cross-head-guarded-symbol`: `CreditCashOverageBehavior` on `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime`
- `cross-head-guarded-symbol`: `CreditGrantSnapshot` on `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime`
- `cross-head-guarded-symbol`: `CreditGrantState` on `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime`
- `cross-head-guarded-symbol`: `CreditProgramState` on `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime`
- `cross-head-guarded-symbol`: `CreditScopeRequest` on `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime`
- `cross-head-guarded-symbol`: `CreditSnapshotAdmissibility` on `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime`
- `cross-head-guarded-symbol`: `CreditSnapshotReconciliationState` on `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime`
- `cross-head-guarded-symbol`: `CreditSnapshotValidationResult` on `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime`
- `cross-head-guarded-symbol`: `CreditSnapshotViolation` on `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime`
- `cross-head-guarded-symbol`: `TrustedActor` on `origin/feat/ai-control-plane-contracts`, `origin/security/trusted-actor-model`
- `cross-head-prisma-divergent-definition`: `AgentHandoff` on `origin/feat/ai-control-plane-contracts`, `origin/security/trusted-actor-model`
- `cross-head-prisma-divergent-definition`: `ModerationAction` on `origin/feat/ai-control-plane-contracts`, `origin/security/trusted-actor-model`
- `cross-head-prisma-divergent-definition`: `ModerationAppeal` on `origin/feat/ai-control-plane-contracts`, `origin/security/trusted-actor-model`
- `cross-head-prisma-divergent-definition`: `ModerationReport` on `origin/feat/ai-control-plane-contracts`, `origin/security/trusted-actor-model`
- `cross-head-prisma-divergent-definition`: `SubagentRun` on `origin/feat/ai-control-plane-contracts`, `origin/security/trusted-actor-model`
- `cross-head-prisma-divergent-definition`: `User` on `origin/payments/durable-checkout-attempt`, `origin/settlement/evidence-outbox`

## Ownership matrix — guarded symbols

| name | declared on |
| --- | --- |
| `AiAttemptSummary` | `origin/feat/ai-control-plane-contracts` |
| `AiAuthorityNarrowing` | `origin/feat/ai-control-plane-contracts` |
| `AiControlPlaneError` | `origin/feat/ai-control-plane-contracts` |
| `AiDispatchFn` | `origin/feat/ai-control-plane-contracts` |
| `AiDispatchOutcome` | `origin/feat/ai-control-plane-contracts` |
| `AiDispatchPlan` | `origin/feat/ai-control-plane-contracts` |
| `AiEnvClass` | `origin/feat/ai-control-plane-contracts` |
| `AiErrorCode` | `origin/feat/ai-control-plane-contracts` |
| `AiExecutor` | `origin/feat/ai-control-plane-contracts` |
| `AiInvocationCorrelation` | `origin/feat/ai-control-plane-contracts` |
| `AiPolicySource` | `origin/feat/ai-control-plane-contracts` |
| `AiSurface` | `origin/feat/ai-control-plane-contracts` |
| `AiTaskInvocationRequest` | `origin/feat/ai-control-plane-contracts` |
| `AiTaskPolicyDefinition` | `origin/feat/ai-control-plane-contracts` |
| `AiTaskResult` | `origin/feat/ai-control-plane-contracts` |
| `CreditAdmissibilityReason` | `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime` |
| `CreditAllocationState` | `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime` |
| `CreditApplicationState` | `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime` |
| `CreditBalanceState` | `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime` |
| `CreditCashOverageBehavior` | `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime` |
| `CreditGrantSnapshot` | `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime` |
| `CreditGrantState` | `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime` |
| `CreditProgramState` | `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime` |
| `CreditScopeRequest` | `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime` |
| `CreditSnapshotAdmissibility` | `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime` |
| `CreditSnapshotReconciliationState` | `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime` |
| `CreditSnapshotValidationResult` | `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime` |
| `CreditSnapshotViolation` | `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime` |
| `OutboxDrainSummary` | `origin/settlement/evidence-outbox` |
| `OutboxEventRow` | `origin/settlement/evidence-outbox` |
| `OutboxNotifyFn` | `origin/settlement/evidence-outbox` |
| `SettlementEvidenceDb` | `origin/settlement/evidence-outbox` |
| `SettlementEvidenceTx` | `origin/settlement/evidence-outbox` |
| `SettlementOutboxDb` | `origin/settlement/evidence-outbox` |
| `TrustedActor` | `origin/feat/ai-control-plane-contracts`, `origin/security/trusted-actor-model` |

## Ownership matrix — forbidden prefixes

| name | declared on |
| --- | --- |
| `Ai` | `origin/feat/ai-control-plane-contracts` |
| `Credit` | `origin/nova/s1-domain-contracts`, `origin/nova/s2-capability-governor`, `origin/nova/s3-source-runtime` |
| `Outbox` | `origin/settlement/evidence-outbox` |
| `Settlement` | `origin/settlement/evidence-outbox` |
| `TrustedActor` | `origin/feat/ai-control-plane-contracts`, `origin/security/trusted-actor-model` |

## Ownership matrix — Prisma names (new/changed)

| name | declared on |
| --- | --- |
| `ActorReceipt` | `origin/security/trusted-actor-model` |
| `AgentHandoff` | `origin/feat/ai-control-plane-contracts`, `origin/security/trusted-actor-model` |
| `CheckoutAttempt` | `origin/payments/durable-checkout-attempt` |
| `CheckoutAttemptStatus` | `origin/payments/durable-checkout-attempt` |
| `Game` | `origin/settlement/evidence-outbox` |
| `ModerationAction` | `origin/feat/ai-control-plane-contracts`, `origin/security/trusted-actor-model` |
| `ModerationAppeal` | `origin/feat/ai-control-plane-contracts`, `origin/security/trusted-actor-model` |
| `ModerationReport` | `origin/feat/ai-control-plane-contracts`, `origin/security/trusted-actor-model` |
| `Pick` | `origin/settlement/evidence-outbox` |
| `PickSettlementEvent` | `origin/settlement/evidence-outbox` |
| `PushSubscription` | `origin/settlement/evidence-outbox` |
| `RateLimitCounter` | `origin/security/trusted-actor-model` |
| `SettlementAnomaly` | `origin/settlement/evidence-outbox` |
| `SettlementDecision` | `origin/settlement/evidence-outbox` |
| `SettlementObservation` | `origin/settlement/evidence-outbox` |
| `SubagentRun` | `origin/feat/ai-control-plane-contracts`, `origin/security/trusted-actor-model` |
| `User` | `origin/payments/durable-checkout-attempt`, `origin/settlement/evidence-outbox` |

## Ownership matrix — routes

| name | declared on |
| --- | --- |
| `api /api/cron/deliver-settlement-alerts` | `origin/settlement/evidence-outbox` |
| `api /api/cron/settle-picks` | `origin/settlement/evidence-outbox` |
| `api /api/moderation/anonymous-report` | `origin/security/trusted-actor-model` |
| `api /api/push/subscribe` | `origin/settlement/evidence-outbox` |
| `api /api/push/unsubscribe` | `origin/settlement/evidence-outbox` |
| `api /api/subscriptions/checkout` | `origin/payments/durable-checkout-attempt` |
| `api /api/webhooks/stripe` | `origin/payments/durable-checkout-attempt` |

## Ownership matrix — new env vars

| name | declared on |
| --- | --- |
| `AI_ENV_CLASS` | `origin/feat/ai-control-plane-contracts` |
| `EMERGENCY_OVERRIDE_ID` | `origin/feat/ai-control-plane-contracts` |
| `EMERGENCY_REASON` | `origin/feat/ai-control-plane-contracts` |
| `EMERGENCY_RELIABILITY_UNTIL` | `origin/feat/ai-control-plane-contracts` |
| `LLM_COST_MODE` | `origin/feat/ai-control-plane-contracts` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `origin/settlement/evidence-outbox` |
| `NODE_ENV` | `origin/feat/ai-control-plane-contracts` |
| `PR159_PG_URL` | `origin/security/trusted-actor-model` |
| `STRIPE_TERMS_CONSENT_ENABLED` | `origin/payments/durable-checkout-attempt` |
| `VERCEL_ENV` | `origin/feat/ai-control-plane-contracts` |

## Unparsed files

None — scan complete.
