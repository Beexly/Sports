# NOVA Convergence Inventory

Deterministic branch inventory produced by `scripts/nova/build-convergence-inventory.mjs`.

- base: c19a00d86fe45d7e093f3f9ec688d2614e7f87b4
- head: a6fc11766e18d09651269c3d945ecacb1857b8d0
- merge-base: c19a00d86fe45d7e093f3f9ec688d2614e7f87b4
- changed files: 352
- collision scan: **COMPLETE_COLLISIONS_FOUND**

## Collisions

- `duplicate-guarded-export`: `CreditAuthorizationPort`
- `forbidden-prefix-outside-owner`: `CreditAdmissionDecision` at `apps/web/lib/ai-control-plane/credit-admission.ts`
- `forbidden-prefix-outside-owner`: `CreditAdmissionDecision` at `apps/web/lib/ai-control-plane/internal.ts`
- `forbidden-prefix-outside-owner`: `CreditAdmissionRefusalReason` at `apps/web/lib/ai-control-plane/credit-admission.ts`
- `forbidden-prefix-outside-owner`: `CreditAdmissionRefusalReason` at `apps/web/lib/ai-control-plane/internal.ts`
- `forbidden-prefix-outside-owner`: `CreditAdmissionScope` at `apps/web/lib/ai-control-plane/credit-admission.ts`
- `forbidden-prefix-outside-owner`: `CreditAdmissionScope` at `apps/web/lib/ai-control-plane/internal.ts`
- `forbidden-prefix-outside-owner`: `CreditAuthorizationDecision` at `apps/web/lib/ai-control-plane/credit-admission.ts`
- `forbidden-prefix-outside-owner`: `CreditAuthorizationDecision` at `apps/web/lib/ai-control-plane/internal.ts`
- `forbidden-prefix-outside-owner`: `CreditAuthorizationHandle` at `apps/web/lib/ai-control-plane/credit-admission.ts`
- `forbidden-prefix-outside-owner`: `CreditAuthorizationHandle` at `apps/web/lib/ai-control-plane/internal.ts`
- `forbidden-prefix-outside-owner`: `CreditAuthorizationPort` at `apps/web/lib/ai-control-plane/credit-admission.ts`
- `forbidden-prefix-outside-owner`: `CreditAuthorizationPort` at `apps/web/lib/ai-control-plane/credit-port.ts`
- `forbidden-prefix-outside-owner`: `CreditAuthorizationPort` at `apps/web/lib/ai-control-plane/index.ts`
- `forbidden-prefix-outside-owner`: `CreditAuthorizationRequest` at `apps/web/lib/ai-control-plane/credit-port.ts`
- `forbidden-prefix-outside-owner`: `CreditAuthorizationRequest` at `apps/web/lib/ai-control-plane/index.ts`
- `forbidden-prefix-outside-owner`: `CreditAuthorizationState` at `apps/web/lib/ai-control-plane/credit-admission.ts`
- `forbidden-prefix-outside-owner`: `CreditAuthorizationState` at `apps/web/lib/ai-control-plane/internal.ts`
- `forbidden-prefix-outside-owner`: `CreditGrantSnapshot` at `apps/web/lib/ai-control-plane/credit-admission.ts`
- `forbidden-prefix-outside-owner`: `CreditLedgerDb` at `apps/web/lib/ai-control-plane/credit-admission.ts`
- `forbidden-prefix-outside-owner`: `CreditLedgerDb` at `apps/web/lib/ai-control-plane/internal.ts`
- `forbidden-prefix-outside-owner`: `CreditReservation` at `apps/web/lib/ai-control-plane/credit-port.ts`
- `forbidden-prefix-outside-owner`: `CreditReservation` at `apps/web/lib/ai-control-plane/index.ts`
- `forbidden-prefix-outside-owner`: `CreditScopeRequest` at `apps/web/lib/ai-control-plane/credit-admission.ts`
- `forbidden-prefix-outside-owner`: `CreditSnapshotStore` at `apps/web/lib/ai-control-plane/credit-admission.ts`
- `forbidden-prefix-outside-owner`: `CreditSnapshotStore` at `apps/web/lib/ai-control-plane/internal.ts`
- `forbidden-prefix-outside-owner`: `OutboxDeps` at `apps/web/lib/settlement-outbox/worker.ts`
- `forbidden-prefix-outside-owner`: `OutboxDrainSummary` at `apps/web/lib/settlement-outbox/worker.ts`
- `forbidden-prefix-outside-owner`: `OutboxEventRow` at `apps/web/lib/settlement-outbox/worker.ts`
- `forbidden-prefix-outside-owner`: `OutboxHealth` at `apps/web/lib/settlement-outbox/worker.ts`
- `forbidden-prefix-outside-owner`: `SettlementAnomalyReadModel` at `apps/web/lib/opportunity-engine/founder-command.ts`
- `forbidden-prefix-outside-owner`: `SettlementAnomalyState` at `apps/web/lib/opportunity-engine/founder-command.ts`
- `forbidden-prefix-outside-owner`: `SettlementDecisionDb` at `packages/ingestion-pipeline/src/index.ts`
- `forbidden-prefix-outside-owner`: `SettlementDecisionDb` at `packages/ingestion-pipeline/src/settlement-decisions.ts`
- `forbidden-prefix-outside-owner`: `SettlementDecisionEventCreateData` at `packages/ingestion-pipeline/src/settlement-evidence.ts`
- `forbidden-prefix-outside-owner`: `SettlementDecisionTx` at `packages/ingestion-pipeline/src/settlement-decisions.ts`
- `forbidden-prefix-outside-owner`: `SettlementEvidenceDb` at `packages/ingestion-pipeline/src/index.ts`
- `forbidden-prefix-outside-owner`: `SettlementEvidenceDb` at `packages/ingestion-pipeline/src/settlement-evidence.ts`
- `forbidden-prefix-outside-owner`: `SettlementEvidenceTx` at `packages/ingestion-pipeline/src/index.ts`
- `forbidden-prefix-outside-owner`: `SettlementEvidenceTx` at `packages/ingestion-pipeline/src/settlement-evidence.ts`
- `forbidden-prefix-outside-owner`: `SettlementOutboxDb` at `apps/web/lib/settlement-outbox/worker.ts`
- `forbidden-prefix-outside-owner`: `SettlementOwnerDecisionKind` at `apps/web/lib/opportunity-engine/founder-command.ts`
- `forbidden-prefix-outside-owner`: `SettlementRunDb` at `packages/ingestion-pipeline/src/index.ts`
- `forbidden-prefix-outside-owner`: `SettlementRunDb` at `packages/ingestion-pipeline/src/settlement-run.ts`
- `forbidden-prefix-outside-owner`: `SettlementRunIdentity` at `packages/ingestion-pipeline/src/index.ts`
- `forbidden-prefix-outside-owner`: `SettlementRunIdentity` at `packages/ingestion-pipeline/src/settlement-run.ts`
- `forbidden-prefix-outside-owner`: `SettlementSnapshotDb` at `packages/ingestion-pipeline/src/index.ts`
- `forbidden-prefix-outside-owner`: `SettlementSnapshotPick` at `packages/ingestion-pipeline/src/index.ts`
- `forbidden-prefix-outside-owner`: `SettlementSnapshotWriteStatus` at `packages/ingestion-pipeline/src/index.ts`
- `forbidden-prefix-outside-owner`: `TrustedActor` at `apps/web/lib/auth/actor.ts`

## Changed files

| status | path | head blob |
| --- | --- | --- |
| M | `.env.example` | e4554800ca4870cc188c7679e71e981a6f080fd2 |
| M | `.github/workflows/ci.yml` | 45b41456d6313e068bd18b99b7663ad20569099e |
| A | `.github/workflows/nova-convergence-inventory.yml` | fdc317d4ab8bbad8ef7109511470e9e234aae6a1 |
| A | `apps/web/.gitignore` | 014f9c3ec2ecde21cb4bcae2a6de18f12fdcd470 |
| A | `apps/web/__tests__/actor-governance.test.ts` | 2c0a267d9a60e87402302c4a1d19b8d8d6cd6ac0 |
| A | `apps/web/__tests__/actor-hardening-db.integration.test.ts` | 48db69110172a3728e6af8d7167b2a31c83ae3b2 |
| A | `apps/web/__tests__/actor-minting-boundary.test.ts` | 1c2e489da0cd4465de4aa3f25c04922d7a239de5 |
| A | `apps/web/__tests__/ai-control-plane-authority.test.ts` | f953740b6c24a14fd500af7b489bb5c75b4e906a |
| A | `apps/web/__tests__/ai-control-plane-budget-pg.test.ts` | 5ff7aab905763e675dd358aaf7b9c10757fc5473 |
| A | `apps/web/__tests__/ai-control-plane-budget.test.ts` | e9594e1394bda312e11ea1a111c3642765a69c12 |
| A | `apps/web/__tests__/ai-control-plane-claim-pg.test.ts` | 559c351483e0abf940b72815f9a304bab20f2e51 |
| A | `apps/web/__tests__/ai-control-plane-cost-mode.test.ts` | d0f7a03d773146d4cc58a1df65d82d2a409703a1 |
| A | `apps/web/__tests__/ai-control-plane-credit-admission.test.ts` | 90b5cabc2f77d8880c956fbd2a35780a46f32365 |
| A | `apps/web/__tests__/ai-control-plane-invocation.test.ts` | 7535c357ca8da7b3b059973b686df266839f7764 |
| A | `apps/web/__tests__/ai-control-plane-sealing-guard.test.ts` | 830a016b4fbdfad82bf7e061c714dad4207a4ffc |
| A | `apps/web/__tests__/ai-provider-registry.test.ts` | c06c385b6d17ccc2a53c4e24693149f8fc698838 |
| A | `apps/web/__tests__/anonymous-report-route.test.ts` | a3373555eae478157374baf318437870b9729c8b |
| A | `apps/web/__tests__/canonical-json.test.ts` | 23dc6554cda92a6244d3ac2e17dbf971672f4eec |
| A | `apps/web/__tests__/checkout-attempt-db.integration.test.ts` | a2ad85c70177ab76e7d079bfa0041e6c51dea4df |
| A | `apps/web/__tests__/checkout-attempt-repair.test.ts` | ae8a03308548a9af0056bc2b9d6189233bdfa4c9 |
| A | `apps/web/__tests__/checkout-attempt.test.ts` | 88650da7be9be55c6726d1cd7a3b24a3ab64156e |
| A | `apps/web/__tests__/checkout-live-mode-guard.test.ts` | 33d4cdce112f16f6f4ed9e1ed5dc32c558fe501c |
| A | `apps/web/__tests__/checkout-repair-owner-queue.test.ts` | 542a441c96e7484a77c2f98b1f1f916b02dc62b2 |
| M | `apps/web/__tests__/council-ledgers.test.ts` | c24924294080c354dbbead000702e9a7f3b95c24 |
| A | `apps/web/__tests__/cron-prune-rate-limits.test.ts` | ea55556ad3b9ff7c69b9884df68d1059a2b82419 |
| A | `apps/web/__tests__/durable-write-store.test.ts` | 5e9c50fb7ad1fb1151b8de3382457818d770ae91 |
| A | `apps/web/__tests__/moderation-actions.test.ts` | da4edaaa5725e86633626c7c802f73cabeaaa72f |
| A | `apps/web/__tests__/nova-agent.test.ts` | df1e80d0d643ecb65a47f61a4c443b889ddeafed |
| A | `apps/web/__tests__/nova-capability-governance.test.ts` | 5868734eeaa1039db6c29fc1139b9da890ed091a |
| A | `apps/web/__tests__/nova-capability-governor.test.ts` | f3d0bd11fff4c106b6c99e78510b46d71d669294 |
| A | `apps/web/__tests__/nova-capability-inventory.test.ts` | ff4028bdc5e92891012c6558634fa514781f5740 |
| A | `apps/web/__tests__/nova-capability-source-schema.test.ts` | dd7486296d25a34df616489672f7cf33f07b6276 |
| A | `apps/web/__tests__/nova-credit-grant-snapshot.test.ts` | 3e7ce986c5b68e5882ff5610933a22c905ae5ee3 |
| A | `apps/web/__tests__/nova-credit-grant-state.test.ts` | 31728195481e20fe731638376887e8479c780b54 |
| A | `apps/web/__tests__/nova-credit-snapshot-conformance.test.ts` | 55007f114ee4d89d08880260904297c38c9675b8 |
| A | `apps/web/__tests__/nova-credit-state-machines.test.ts` | 6c0792dd16d950f3b1f3d77159183e02d6f93257 |
| A | `apps/web/__tests__/nova-founder-command.test.ts` | a01dfae3b197f9016488a4c4a6ceadf9aed0161a |
| A | `apps/web/__tests__/nova-founder-work-seed.test.ts` | f3d28b9e7a278a3c7eecbf851ab9cdafea7c6389 |
| A | `apps/web/__tests__/nova-opportunity-engine.test.ts` | c7bf270a2311be64dd0bf89bd620a897689a7b1d |
| A | `apps/web/__tests__/nova-scenario-credits-non-authorizing.test.ts` | 2d057d005bb7887c50d2803f8b61f78a5ef58abf |
| A | `apps/web/__tests__/nova-source-evidence.test.ts` | 0d4143180e7e5d9e1da8c35c628d9809c53cf4cd |
| A | `apps/web/__tests__/nova-subagents.test.ts` | ecb2c72e8a071999f39a6dbac5c2166afeb44024 |
| A | `apps/web/__tests__/push-subscribe-api.test.ts` | f3ec77c31c9b5427a7447bcc1c87db83c554dead |
| A | `apps/web/__tests__/repair-checkout-attempts-cron-route.test.ts` | bcccb5f5636e6f9adec5b289ef82eac089af3143 |
| M | `apps/web/__tests__/stripe-checkout-consent.test.ts` | 293ff2985bcfebf85bfca086afcd00b7bf87297e |
| A | `apps/web/__tests__/stripe-outcome.test.ts` | 0e040436a4f7e2bd992b22416f271150d21366ec |
| M | `apps/web/__tests__/stripe-webhook-route.test.ts` | eb8cae7403aced1dd2f8f2d74b656557c40a0ecf |
| M | `apps/web/__tests__/subscriptions-checkout-route.test.ts` | 3c2f6d4c2a42938760849f097840c687c170cd9a |
| A | `apps/web/app/api/cron/deliver-settlement-alerts/route.ts` | 85918bd0f4d2855a608407f3cb34f7426c184701 |
| A | `apps/web/app/api/cron/drain-ai-telemetry-recovery/route.ts` | eb0a7d6024417fb585fb1abb0960db193b9d536a |
| A | `apps/web/app/api/cron/prune-rate-limits/route.ts` | 9fa09e8e6e7d643665bcc84dad1695301a49c59d |
| A | `apps/web/app/api/cron/repair-checkout-attempts/route.ts` | 48a800aa6843626220f12e504e9e20170dfaa7f9 |
| M | `apps/web/app/api/cron/settle-picks/route.ts` | 2d6e87f4d4fb3a1f69a3c23fbc4f55ff95677626 |
| A | `apps/web/app/api/moderation/anonymous-report/route.ts` | ae4016be825f58e00cf6858e0743798ce2743725 |
| A | `apps/web/app/api/push/subscribe/route.ts` | 441c6df298a5772bd969d14cf6af5d74ca8f0774 |
| A | `apps/web/app/api/push/unsubscribe/route.ts` | 50c94230f8b4d6c7cade53bbcdefaf441d6ad2b2 |
| M | `apps/web/app/api/subscriptions/checkout/route.ts` | fd627c1594b8506745c1501005f7d5f20388b2d7 |
| M | `apps/web/app/api/webhooks/stripe/route.ts` | 31865e6926431a3fb2962a657eae14326ab5b918 |
| M | `apps/web/app/cockpit/layout.tsx` | bf2a54e82be8b69f5da59f769283b67e9a82ec7a |
| A | `apps/web/app/cockpit/nova/founder/page.tsx` | 7cab42c120d5aa428c47650782c51e04e64893ff |
| A | `apps/web/app/cockpit/nova/page.tsx` | 08c59e1b943b4a52c041559635487d417e9f1f9d |
| M | `apps/web/components/pricing/subscribe-button.tsx` | 296b83db9b2fc0e6bca3c1511d47d3c945bdfd81 |
| A | `apps/web/components/push/push-alert-opt-in.tsx` | 05e27a66b51db33f6de7b42746c3774afc051b36 |
| A | `apps/web/lib/ai-control-plane/budget.ts` | e4af74b4b2e94a98562ee06eedeb29391d75fef7 |
| A | `apps/web/lib/ai-control-plane/contracts.ts` | 3d6afd50686affbfdbf72254324c0d9fa0af5f56 |
| A | `apps/web/lib/ai-control-plane/control-store.ts` | af45ab40908633f011b19cc0fa1035f12468c5c3 |
| A | `apps/web/lib/ai-control-plane/cost-mode.ts` | 54aabfe84c1b24ac220f290cc81e3a5cb4cdc995 |
| A | `apps/web/lib/ai-control-plane/credit-admission.ts` | cb7cb6069fd2be79f10a85cba1675e430a17bb81 |
| A | `apps/web/lib/ai-control-plane/credit-port.ts` | ed3281deef3bd6bb96a97aeae073460b125f7efe |
| A | `apps/web/lib/ai-control-plane/dispatch.ts` | 047815667f1d156922b77d7ff21b1e73e016da62 |
| A | `apps/web/lib/ai-control-plane/emergency.ts` | 4e0da01f3a616bf322ed873ff91e285548c78b8b |
| A | `apps/web/lib/ai-control-plane/errors.ts` | 8906455ab8c0802fd925ac3242a90fa3c7db419a |
| A | `apps/web/lib/ai-control-plane/executor.ts` | b65ec8999188a9dde3f94a4af5b6b4e2fe0f32ea |
| A | `apps/web/lib/ai-control-plane/index.ts` | a39cc99521f25c92dfa15ef6568b18feade29531 |
| A | `apps/web/lib/ai-control-plane/internal.ts` | 41049eb5ba0fdf86e1a5f3a037b9c8cd122a58ca |
| A | `apps/web/lib/ai-control-plane/invocation-pipeline.ts` | 45121fa4a80496015047cb401145c51d172c3382 |
| A | `apps/web/lib/ai-control-plane/observability.ts` | 1a700230d317b3f53de1d6983890cb3dbe073977 |
| A | `apps/web/lib/ai-control-plane/policy-registry.ts` | 836867949900ecebc846dc31899f2eb17a9b17e2 |
| A | `apps/web/lib/ai-control-plane/provider-registry.data.ts` | 18b65d2bc831e216d5fbfbbf8d7361660c7b5442 |
| A | `apps/web/lib/ai-control-plane/recovery-drainer.ts` | 914e22bad6bb78cf0a75e59b28da7b8c43f02c3a |
| A | `apps/web/lib/ai-control-plane/validation.ts` | 1a20293a28a005ddc2af6c98bc5abe25b8f58dba |
| A | `apps/web/lib/auth/actor-receipt.ts` | 62d9bf1e0a4891e2828d31650f58f2d6d944519d |
| A | `apps/web/lib/auth/actor-test-internal.ts` | 921ed4d93b5494ddae83104e148d6ce78f6e1150 |
| A | `apps/web/lib/auth/actor.ts` | cc77bb415580de3f663ecbf92a71b37e1acb0679 |
| A | `apps/web/lib/billing/canonical-json.ts` | 8b500295e5bd42a764365148c51360889f8ba900 |
| A | `apps/web/lib/billing/checkout-attempt-repair.ts` | 809ca31cd05d8e95f4867f442ebe5cc1a60559a1 |
| A | `apps/web/lib/billing/checkout-attempt.ts` | bd859ca8bb06b5993fa7be046a25fb9f32f020a6 |
| A | `apps/web/lib/billing/checkout-repair-owner-queue.ts` | adbd72c4609425eab2558d0f7c00070e006a5d63 |
| A | `apps/web/lib/billing/stripe-outcome.ts` | 1e6c515e2a2658e2327e96df7cc33dc725d6ffc3 |
| A | `apps/web/lib/community/anonymous-report-handler.ts` | 9c44b9929bff30e1a8f0c7fae6bbb96cbbdb098c |
| A | `apps/web/lib/community/durable-rate-limiter.ts` | f0e2e8b26c0d19753adb587d894a945e4fd39278 |
| M | `apps/web/lib/community/moderation-actions.ts` | a3ac79140cc9ebd3cdd5cbc7d0a56dad9943e1df |
| A | `apps/web/lib/community/report-abuse-policy.ts` | e771ae148217b8af44497f2c5466e4506f88346b |
| A | `apps/web/lib/jarvis/ledgers-core.ts` | 8f6d8c85201ed96d6b87ddb26b517ae7bff60f48 |
| M | `apps/web/lib/jarvis/ledgers.ts` | 43a79572ba126745580680a8aa93de81399423b5 |
| A | `apps/web/lib/nova/founder-os-dashboard.ts` | abe5d7148822e1e15632b5d1f46b9a8de8944ef3 |
| A | `apps/web/lib/opportunity-engine/capability-governance.ts` | dddd3bd36e8b2e7de4c0d9b75a72de96f48d1eaf |
| A | `apps/web/lib/opportunity-engine/capability-governor.ts` | 7ba7d8320fa9a0ffdb12ecad1e2bc1693a341bb2 |
| A | `apps/web/lib/opportunity-engine/capability-inventory.ts` | a9273314508d20670795045f9c7928f34e9b35a6 |
| A | `apps/web/lib/opportunity-engine/capability-provenance.ts` | e1fef022aa15ce64cff7b52a469636f3c3f56446 |
| A | `apps/web/lib/opportunity-engine/capability-source-schema.ts` | 726fb2543f86a60219988859cca7007d4a7eb98e |
| A | `apps/web/lib/opportunity-engine/change-detection.ts` | 1eb380723d7432d1e69f436f91069b554398be33 |
| A | `apps/web/lib/opportunity-engine/credit-snapshot.ts` | acf504e49c9dbb84c6cd10b6de4a8c240ceb4d77 |
| A | `apps/web/lib/opportunity-engine/credit.ts` | 5bba00cc411070694f2b0af7846b078409900a26 |
| A | `apps/web/lib/opportunity-engine/evidence.ts` | 18e80ac967574730ade90964b479b6702e241995 |
| A | `apps/web/lib/opportunity-engine/experiment.ts` | 52f844ae230e1182bfd3c62301c5f427861b986f |
| A | `apps/web/lib/opportunity-engine/fixtures/credit-grant-snapshot.conformance.json` | f5616ba6aa2d620e91d2798d60f084739cc983ad |
| A | `apps/web/lib/opportunity-engine/founder-command.ts` | c91f8b466051ffcf36f47b8d035a8878c51506a1 |
| A | `apps/web/lib/opportunity-engine/founder-work-seed.ts` | db8833379d42e6fc2ef4a97b9810ee544002bd8c |
| A | `apps/web/lib/opportunity-engine/index.ts` | ac796d20968a9893cf6b7f01ba1286c19dd75dd3 |
| A | `apps/web/lib/opportunity-engine/learning.ts` | 61b82ef281844dc84aab1ef270ad889964db9190 |
| A | `apps/web/lib/opportunity-engine/lifecycle.ts` | 1735ec9151f6de3054142f55adc5ebfa0aff35b4 |
| A | `apps/web/lib/opportunity-engine/monetization.ts` | 423708ee3eb5a80ea1972015b8f846170d228d34 |
| A | `apps/web/lib/opportunity-engine/nova-agent.ts` | 10a95ce54a95c7352a85e32c4c2859d82c81f0c6 |
| A | `apps/web/lib/opportunity-engine/nova-subagents.ts` | 743304a36000cbacd7dcc13c210adff7e77666fe |
| A | `apps/web/lib/opportunity-engine/pipeline.ts` | 494db9f419993573e6c12f236d5d18a2085d1a08 |
| A | `apps/web/lib/opportunity-engine/policy.ts` | 6424ec08c86534629069a2f74e44e5368c4e0624 |
| A | `apps/web/lib/opportunity-engine/scoring.ts` | f7ff3b41fd74d33b9dd3ddd37ca71efb49539067 |
| A | `apps/web/lib/opportunity-engine/source-registry.ts` | eac21dc2a3857bd3085eb085b92567cc504fa27b |
| A | `apps/web/lib/opportunity-engine/types.ts` | f4ee729b566968d6af7dec147002af2720c59eeb |
| A | `apps/web/lib/push/http.ts` | 87ab27878ba8c7887b387f7ef99380fd21cd61bf |
| A | `apps/web/lib/push/subscription-db.test.ts` | afd870c6c3a7a06c26e65062a82df0ae56da7239 |
| A | `apps/web/lib/push/subscription-db.ts` | 5c4c220e676127d1089e4dc73360c4acd1a308ad |
| A | `apps/web/lib/push/use-push-subscription.ts` | 257b80831e16f813ef76b400f96320d5c7eae4b4 |
| A | `apps/web/lib/push/validation.ts` | 8f3ea4514917290a8a4614001793d1313c533d83 |
| A | `apps/web/lib/settlement-outbox/worker.test.ts` | 51f739d419baf2e699c46b28747afd51373a6e1d |
| A | `apps/web/lib/settlement-outbox/worker.ts` | 4d0db192a0d9591d580ca8f9e8051461a595b23f |
| M | `apps/web/lib/stripe.ts` | 85517cb8f309ed4a7b9bbd4f16404c407de4bbac |
| M | `apps/web/lib/watchlist/alert-dispatch.test.ts` | 12542ab3e23679d48fa51dbc982b14e36e6b02a8 |
| M | `apps/web/lib/watchlist/alert-dispatch.ts` | bcc36d1a08fa97afa6bf797d46b3349d7429f1cc |
| A | `apps/web/lib/watchlist/channels/email-channel.test.ts` | 1d5a580641b3eb1a5daf748f0e328e7c7d52bb9d |
| A | `apps/web/lib/watchlist/channels/email-channel.ts` | ea56b5c009e4c3775e34262dbd2ca46b757bb3c5 |
| A | `apps/web/lib/watchlist/channels/web-push-channel.test.ts` | 517a662ce7e6bdcc00f7fcabbfbc50e8f9f85848 |
| A | `apps/web/lib/watchlist/channels/web-push-channel.ts` | 8ff0598e5096e14eb552b87c4250c32fcc668d79 |
| A | `apps/web/lib/watchlist/settlement-hook.test.ts` | 8f446b9d11b2e87c009ce6c94e8099ae28d95920 |
| A | `apps/web/lib/watchlist/settlement-hook.ts` | e74e9f68556a22d0c1a952292bc7ebb3117ac3de |
| M | `apps/web/package.json` | a9d5315d49b2de0239d1e9250c553dd86bc8ab7d |
| A | `apps/web/public/sw.js` | c15c65f48f2b4281e756ec3e7a1f1978ac5bc8be |
| A | `data/nova/ai-capability-inventory-2026-07-21.json` | dfc294edfe4aa52a249f5da661842ee6ce24285f |
| A | `data/nova/ai-capability-inventory-additions-2026-07-21.json` | ecc0e368f2726b35407bea7703809a5e5acf7070 |
| A | `data/nova/capability-governance-2026-07-22.json` | b0d5b04cecb176090ad0cf1e75ede9fbc9f38e89 |
| A | `data/nova/official-source-registry.json` | 07791ad3dfa0493ecb57985d0c10d015b3dd6300 |
| A | `docs/ai/nova/S3_SOURCE_RUNTIME.md` | f8bc843c2be07846058ceb96e01af37a1291132d |
| A | `docs/ai/phase0/AI_CONTROL_PLANE_ADR_2026-07-21.md` | 9a20b8f55010c195b87f09d055e26a891dccfe85 |
| A | `docs/ai/phase0/AI_CONTROL_PLANE_DESIGN_2026-07-22.md` | 779a141b1cfc2c02f7164fbff71bc475beee3269 |
| A | `docs/ai/phase0/CONSTELLATION_MASTER_PLAN_REGISTRATION_2026-07-22.md` | 098901d7b79be50b12f4ac1eafd4393e3c694719 |
| A | `docs/ai/phase0/CURRENT_REPOSITORY_TRUTH_2026-07-21.md` | 570441d5e19d4ef1e6e00c00ce5acb7f3bd15506 |
| A | `docs/ai/phase0/EVIDENCE_GAPS_AND_FAILED_RECEIPTS_2026-07-21.md` | f57040f750b9269f6976cf7f0456f1135d0a4696 |
| A | `docs/ai/phase0/LIVE_PR_REGISTRY_2026-07-22.md` | 4cdeb7864769fcbcaaa3614c6e296ee3cac2b01f |
| A | `docs/ai/phase0/NOVA_CONVERGENCE_FREEZE_2026-07-22.md` | a4c69caae6dba4c27689d8457a28da20c52abd89 |
| A | `docs/ai/phase0/NOVA_CONVERGENCE_FREEZE_HARDENING_ADDENDUM_2026-07-22.md` | 09270ea82a78f004f4e084ae3d6f47f148073995 |
| A | `docs/ai/phase0/OWNER_DECISION_PACKET_2026-07-21.md` | 82e27f03bbff383bb126c12f70bc376d4c3b8f21 |
| A | `docs/ai/phase0/OWNER_DECISION_PACKET_2026-07-22.md` | cf56d0fab1f6a7313e2f2c618d6330ad8c275bc7 |
| A | `docs/ai/phase0/PHASE1_EXECUTION_ADDENDUM_2026-07-22.md` | 5c09779bb7ee04ffa01be2463e53533b8fc20f95 |
| A | `docs/ai/phase0/PHASE1_REMEDIATION_UPDATE_2026-07-22b.md` | 3e93051adc49cf192358edb16252482128e21c43 |
| A | `docs/ai/phase0/PR145_COMPLETE_DISPOSITION_2026-07-21.json` | 369d54dd212a986f84f95c0749bbca1048cb4f20 |
| A | `docs/ai/phase0/PR145_PR146_CONVERGENCE_MAP_2026-07-21.md` | a03c606ffa8c13f927d06874e3804d1f92467bb4 |
| A | `docs/ai/phase0/REVISED_PR_STACK_2026-07-21.md` | 277302c889b644970068f19bff28dc1079310034 |
| A | `docs/payments/checkout-attempt.md` | af449306b0f331983862d9bc5439406438a3d561 |
| A | `formal-regression/.gitignore` | c2658d7d1b31848c3b71960543cb0368e56cd4c7 |
| A | `formal-regression/README.md` | f0ed183518d0ab54777c642f4df0861b93f86c07 |
| A | `formal-regression/docker/docker-compose.chaos.yml` | 5ef0d360d65a36979d96cdfdb2967b3d2692f90c |
| A | `formal-regression/package-lock.json` | 61411cc2783c526700ac636ef29452e39e71e5dd |
| A | `formal-regression/package.json` | 0c44dc6128d0ea1a2125b263cdaac5ffca36827d |
| A | `formal-regression/reports/formal-counterexamples/reference-model-fingerprint-ordering.json` | d5f6e3fc2fca694ab2b2b8046a2fa38f18ea96f8 |
| A | `formal-regression/scripts/chaos-toxiproxy.mjs` | 2352e61905ebed22ebe0bc68f1d5159e5f7acb63 |
| A | `formal-regression/src/adapters/fixture-credit-snapshot-store.ts` | 4b917a207975f7c8714831e5c156f10ca133f45a |
| A | `formal-regression/src/adapters/in-memory-control-sql.ts` | 14f3a43ee0706d02681a1885f47fb9f735270828 |
| A | `formal-regression/src/adapters/in-memory-credit-ledger.ts` | fbc75602bf76db4eebd19557329fe2386a99027f |
| A | `formal-regression/src/reference/claim-reference.ts` | cdf89bf64c6a5cfbd2c3972fd33f1eda99ee9f8d |
| A | `formal-regression/src/reference/credit-reference.ts` | bcdfa7026498af8524f633f955f88200480baf64 |
| A | `formal-regression/src/tests/0-smoke.test.ts` | a08cdef3fe79b54597c7b1af8a7386184422365a |
| A | `formal-regression/src/tests/chaos-deterministic-fault-injection.test.ts` | d884b3b6459491ef4e63ab1277057af562e771fb |
| A | `formal-regression/src/tests/chaos-network.integration.test.ts` | 77cecb366786b843e549d344611bff34635a4d9f |
| A | `formal-regression/src/tests/credit-reservation.real.property.test.ts` | 7f9b2c6d2e5d2fbbd66e56c2cf7b25eefdd155ec |
| A | `formal-regression/src/tests/invocation-claim.real.property.test.ts` | 5d30777d71a51c983f432e79c1a84d1c4b1e615b |
| A | `formal-regression/src/tests/reference-model.property.test.ts` | acaad924961e91557c78f4b180de0e3e30adbd89 |
| A | `formal-regression/tsconfig.json` | a8fd6d33e20d0e838d5bd9c69412d9232b1f9097 |
| A | `formal-regression/vitest.config.ts` | 35b1ee4147799b1ff7ac5f5a9502eb3e8c7ae2bf |
| A | `formal/README.md` | 90bfa1e9573257ab9ded5eb9bcd6f7024259b96c |
| A | `formal/ai-invocation/InvocationClaim.cfg` | 48ea5b8684bcf0d101566f70589014a831916e68 |
| A | `formal/ai-invocation/InvocationClaim.counterexample-found-during-development.txt` | 2b0ffbf769aa18135a030904a450544eec0d927f |
| A | `formal/ai-invocation/InvocationClaim.tla` | 1e657e08cf5cd610deca5a2ed74b93918fccb609 |
| A | `formal/ai-invocation/InvocationClaim.tlc-receipt.txt` | 3093c8627789f86e213748e31798ad48d8935b3c |
| A | `formal/credit-budget/CreditReservation.cfg` | 2a8edb06f9378eb1fc67c8bbeb737d86f305a92e |
| A | `formal/credit-budget/CreditReservation.tla` | dc26bc6a90d9c80f1ce42109facd88b38cfadbcb |
| A | `formal/credit-budget/CreditReservation.tlc-receipt.txt` | c3b8c6e8539fb5e1bdd45f59e957ab0222e68fe3 |
| M | `package-lock.json` | 25034134a12a37c38cbf19c9d2190172edde6057 |
| M | `package.json` | b963d5dce8c3000104ed6d0ade6bd5a0a945a737 |
| A | `packages/db/prisma/migrations/20260719120000_add_push_subscriptions/migration.sql` | 4f28bc57e2fae16ed9f1aba51659f0a84d6fdbae |
| A | `packages/db/prisma/migrations/20260722090000_add_settlement_evidence_outbox/migration.sql` | 65d2fa729e9afe3be44d5e70f5d4a70fb9b1ed0b |
| A | `packages/db/prisma/migrations/20260722120000_add_trusted_actor_audit/migration.sql` | ee5bb43af49ef654eec47beeb64b0af4dac3987d |
| A | `packages/db/prisma/migrations/20260722130000_add_checkout_attempt/migration.sql` | c51c58ecc23d23ccb552c3a9b16112ce0cb82091 |
| A | `packages/db/prisma/migrations/20260722140000_add_ai_control_plane_ledger/migration.sql` | cf48df9706705457112c5fe7f654583d4d477c2a |
| A | `packages/db/prisma/migrations/20260722150000_add_actor_receipts_and_durable_rate_limits/migration.sql` | 86696826980ade64049c51593c8dc0eae7d12e3a |
| A | `packages/db/prisma/migrations/20260722150001_add_ai_budget_reservations/migration.sql` | f7386d9937fd4bdf72c349cc58be77a8d463ddbd |
| A | `packages/db/prisma/migrations/20260722160000_add_credit_grant_authorization/migration.sql` | 3b01c306dec2cb82214be817ab72b0051613e7c1 |
| A | `packages/db/prisma/migrations/20260722183000_harden_settlement_evidence_outbox/migration.sql` | 9935f4dd7f5a215205f4c195d14908e6cddfb5b3 |
| A | `packages/db/prisma/migrations/20260722213000_outbox_dead_letter_receipts/migration.sql` | 9f02de23268a2e3694abd2becd7be07d329d1bd2 |
| M | `packages/db/prisma/schema.prisma` | 9d3feb805e4ca89bd9b6ed06407d30e15166b632 |
| M | `packages/db/prisma/seed.ts` | a48aebb94d4ed551b2840264cfe4ef63bea1b864 |
| A | `packages/db/src/durable-write-guard.ts` | 6908b0b4663b0c7b844d10ab1f08cc70920cd11c |
| M | `packages/db/src/index.ts` | acab11e447bb952a640f22b0bbc2abb7bdd1d813 |
| A | `packages/dev-tools/context-compiler/.gitignore` | b9470778764f72c5257a3361590d2994547f90e1 |
| A | `packages/dev-tools/context-compiler/README.md` | 034faf0f2de7a411b5c29653373dd226c93e1ac9 |
| A | `packages/dev-tools/context-compiler/evidence/benchmark-run.txt` | 5cb961f2a844317155da50716707861844b71bc4 |
| A | `packages/dev-tools/context-compiler/evidence/determinism/task1-run1.json` | e8b6ff4a9aa5ffc6ae42f8df7288b8c2191a92a3 |
| A | `packages/dev-tools/context-compiler/evidence/determinism/task1-run1.receipt.json` | 1bde315df524b6c5866aca57bace10356bf1d219 |
| A | `packages/dev-tools/context-compiler/evidence/determinism/task1-run2.json` | e8b6ff4a9aa5ffc6ae42f8df7288b8c2191a92a3 |
| A | `packages/dev-tools/context-compiler/evidence/determinism/task1-run2.receipt.json` | 7cadfecd5b7c456ef768938aeb38512cad900528 |
| A | `packages/dev-tools/context-compiler/evidence/determinism/task2-run1.json` | 5236c6d4f02d4842e184860fcab70e8a227abf25 |
| A | `packages/dev-tools/context-compiler/evidence/determinism/task2-run1.receipt.json` | 830e087cbf57ea2edf18c406688415f26bc826c7 |
| A | `packages/dev-tools/context-compiler/evidence/determinism/task2-run2.json` | 5236c6d4f02d4842e184860fcab70e8a227abf25 |
| A | `packages/dev-tools/context-compiler/evidence/determinism/task2-run2.receipt.json` | 599076eb1f06fa3783d63ee82b18deb38e129c30 |
| A | `packages/dev-tools/context-compiler/evidence/determinism/task3-run1.json` | aaf7f68767e232fa2efaf810f07a1d79f0334cdc |
| A | `packages/dev-tools/context-compiler/evidence/determinism/task3-run1.receipt.json` | e85774c1de0cf9704313f0f2f54f1970fbab7f6b |
| A | `packages/dev-tools/context-compiler/evidence/determinism/task3-run2.json` | aaf7f68767e232fa2efaf810f07a1d79f0334cdc |
| A | `packages/dev-tools/context-compiler/evidence/determinism/task3-run2.receipt.json` | 1a183fcc7581899512f48bb27765f7bbf565cab9 |
| A | `packages/dev-tools/context-compiler/evidence/task1-guard-order.json` | e8b6ff4a9aa5ffc6ae42f8df7288b8c2191a92a3 |
| A | `packages/dev-tools/context-compiler/evidence/task1-guard-order.receipt.json` | 14008be261e69b8f6f3c0fd786c2d671fe55f8ee |
| A | `packages/dev-tools/context-compiler/evidence/task2-s3-field-rename.json` | 5236c6d4f02d4842e184860fcab70e8a227abf25 |
| A | `packages/dev-tools/context-compiler/evidence/task2-s3-field-rename.receipt.json` | 3eeef8e618ddc3676e6b60007d66d7457dd1cac3 |
| A | `packages/dev-tools/context-compiler/evidence/task3-seed-parse-fix.json` | aaf7f68767e232fa2efaf810f07a1d79f0334cdc |
| A | `packages/dev-tools/context-compiler/evidence/task3-seed-parse-fix.receipt.json` | c1ab621fbb40565b56a433acf466a8d2d93e4e74 |
| A | `packages/dev-tools/context-compiler/package-lock.json` | 3057a9dd6c2f710fb590d54bd6c692c44123357c |
| A | `packages/dev-tools/context-compiler/package.json` | 4e7b2d7249db6d45f34f451051fc3d805613e98f |
| A | `packages/dev-tools/context-compiler/src/benchmark.ts` | 6918d63da9e7716392da099585e15f6751ed1b0d |
| A | `packages/dev-tools/context-compiler/src/canonical.ts` | 0ba849565ad1fe3beb55f363931b2d065040089a |
| A | `packages/dev-tools/context-compiler/src/cli.ts` | 6ade3b9c22579b6a0ae340211d46dcef924cc306 |
| A | `packages/dev-tools/context-compiler/src/compiler.ts` | 49670a12ab23c4e0682bf88f6c84e79bb323dd04 |
| A | `packages/dev-tools/context-compiler/src/git.ts` | fb494ba4b8f80a7ea9530109d645cbfa38031222 |
| A | `packages/dev-tools/context-compiler/src/symbols.ts` | 9da33ffc09d836dee8264bb647135b1be7a0bd7e |
| A | `packages/dev-tools/context-compiler/src/types.ts` | fb4586462af6f62c6e99511c8b3376dcad15e74d |
| A | `packages/dev-tools/context-compiler/test/canonical.test.ts` | a1e85941670fb69026adb58704e66eba4fe395c8 |
| A | `packages/dev-tools/context-compiler/test/compiler.test.ts` | 5d1222212d6a1b643ca3c724c431e1a48b656ddf |
| A | `packages/dev-tools/context-compiler/test/symbols.test.ts` | 4aed6a27e62eaaebba4c2879d153ce9c7909d0ae |
| A | `packages/dev-tools/context-compiler/tsconfig.json` | 1be5d0eae210170fa77407a514188baf099a791f |
| A | `packages/dev-tools/context-compiler/vitest.config.ts` | ed8bf7739b49de9be42316ff65212b291dc1b418 |
| A | `packages/genesis-kernel/RECOVERY_NOTES.md` | e0288ff161421460fe08d40cb07c739321a4cc84 |
| A | `packages/genesis-kernel/package.json` | 795b6ded0db8c9533fc8c5f0f2f0d6ddbe713919 |
| A | `packages/genesis-kernel/src/__tests__/planner.test.ts` | 7624f7af2afbc2c6a129a455830d161baede0e44 |
| A | `packages/genesis-kernel/src/__tests__/structural.test.ts` | 99a5d8d7574c3b0e97820e670dcf490b6eb66c07 |
| A | `packages/genesis-kernel/src/__tests__/twin.test.ts` | 4f56321202124d57af65f5c571f21971d784c135 |
| A | `packages/genesis-kernel/src/canonical-json.ts` | d42cef62ef6507592958f17ae8d96b0a3cea4134 |
| A | `packages/genesis-kernel/src/codebase-twin.ts` | da4105b8fabe55e6e31d882ad6d82b93f1e0d58f |
| A | `packages/genesis-kernel/src/contracts.ts` | dc15946b4e4d3a3c47b71cd77b17de2f5e3d6b6c |
| A | `packages/genesis-kernel/src/fixtures/capability-candidates.example.json` | 06d04b858b99d0ceff9ae8cc7e114e97355d8d21 |
| A | `packages/genesis-kernel/src/fixtures/internal-brief.contract.json` | e9d34a815133c0cfb5c713c2fdab1fb3476deae1 |
| A | `packages/genesis-kernel/src/hard-constraints.ts` | 3e223bd1f46d54fd8e6d14c08bd18e5c1c4245c9 |
| A | `packages/genesis-kernel/src/index.ts` | b0feb2822df8e1be65898efc9567fd0f4008df00 |
| A | `packages/genesis-kernel/src/plan-cli.ts` | 49cf023d1ee526127248e84ae2f828349dde8870 |
| A | `packages/genesis-kernel/src/plan-compiler.ts` | 670cfe039b4902e0d6545f5f075976d10cd5984c |
| A | `packages/genesis-kernel/src/plan-receipt.ts` | af598d3f589ca2e48eac458ab31f5d9122d42bff |
| A | `packages/genesis-kernel/src/repo-evidence.ts` | fa2a0f90f24283e35d402e1b988a4eaaa54ee984 |
| A | `packages/genesis-kernel/src/scan-cli.ts` | 0991945b7fb8e5bebc60cf8c6959e98f9a2064ba |
| A | `packages/genesis-kernel/tsconfig.json` | 34c23f688cc54f094be2a9a8440cee7b2439904d |
| A | `packages/genesis-kernel/vitest.config.ts` | 0f78dc014593e77e065fefa573c971a91457dcac |
| M | `packages/ingestion-pipeline/src/__tests__/settle-sport.test.ts` | 3bdcbc9cb715bb62d597c636141730900050e1ed |
| A | `packages/ingestion-pipeline/src/__tests__/settlement-hardening.test.ts` | 2e4a67f23f1bc84e486e35ce642a0c57c189f2dc |
| M | `packages/ingestion-pipeline/src/index.ts` | 1ed84bd253cb7394116bae91d5a2a7fc4b85de64 |
| A | `packages/ingestion-pipeline/src/post-settlement-work.ts` | 3f70d721c1d2ed1799c9e56425207ff30af9311e |
| M | `packages/ingestion-pipeline/src/settle-sport.ts` | 0a53313a29c58e1d4e67f1de434f004f4eca9f5f |
| A | `packages/ingestion-pipeline/src/settlement-decisions.ts` | 4f767033a94e7a9434827e27c0f3a6155a37f6aa |
| A | `packages/ingestion-pipeline/src/settlement-evidence.ts` | d585c7977a7ed9b6baf1163c9b47203484146c05 |
| A | `packages/ingestion-pipeline/src/settlement-run.ts` | 0f016d98f22dbd52ccb5edda0a6e40399dcef41b |
| A | `reports/ai/call-site-inventory.json` | d30588e479603a5202ba93aa3ee3d7a722fba70d |
| A | `reports/ai/call-site-inventory.md` | a5333c097a27a33cb4df03e2c3ebf2a4858e9330 |
| A | `reports/constellation-wave2/DELTA_MANIFEST.json` | adb90732b397522db959c362cd40f2a56b4c383f |
| A | `reports/constellation-wave2/PRISMA-SAFETY-INVESTIGATION.md` | 70e830b264ea0140685b37cca9478160aa2de732 |
| A | `reports/nova/convergence/NOVA_CONVERGENCE_INVENTORY.json` | 4d59b384521c00bf30b9ea0802400d4c8323566d |
| A | `reports/nova/convergence/NOVA_CONVERGENCE_INVENTORY.md` | 5754516d931d8741dbff1fbe2b877b2b4b5a0571 |
| A | `reports/nova/convergence/NOVA_CONVERGENCE_RECEIPT.json` | 40d9b86fa1b7d52a4d9b33b671844b628d8b6b24 |
| A | `reports/nova/convergence/multi-head/NOVA_MULTIHEAD_INVENTORY.json` | 03f9dbd73261d741319cde54a2063cbbb4e49879 |
| A | `reports/nova/convergence/multi-head/NOVA_MULTIHEAD_INVENTORY.md` | 046b9e7e4b081c841eefb96bb7bcb65ec744e2d6 |
| A | `reports/nova/convergence/multi-head/NOVA_MULTIHEAD_RECEIPT.json` | f327acba022546d0c3de64241b4f190cda051388 |
| A | `reports/nova/source-runtime/.gitignore` | dd9fe066342317425be80c4359d7b23ff49e5ce6 |
| A | `reports/wave5/OWNER_PACKET_2026-07-22.md` | 008cd7ab6dd4fe1f4874eb0f1bd9f6ff0d442aef |
| A | `scripts/ai/build-call-site-inventory.mjs` | ae0af253f82f7981a5e61ea242ceab486cc2788e |
| A | `scripts/ai/build-call-site-inventory.test.mjs` | 269d9bf39776b6c13fae971534e609480eec62db |
| A | `scripts/ai/fixtures/call-site-inventory/alias-call.ts` | d1bad68c4d2597602f92dcdde5707c692c258420 |
| A | `scripts/ai/fixtures/call-site-inventory/control-plane-call.ts` | c05af5b17c298a0214b6a7d3974dd704a159572c |
| A | `scripts/ai/fixtures/call-site-inventory/dispatch-call.ts` | 61fb43f4bea2e751cea175f24c3b059c455f5bc1 |
| A | `scripts/ai/fixtures/call-site-inventory/dynamic-dispatch.ts` | d9e5ed02045ec57b5e4bef3b3a5684e640729d38 |
| A | `scripts/ai/fixtures/call-site-inventory/error-only.ts` | 94c78aa2b10ed703093834bbd5dae9c1f0dac54a |
| A | `scripts/ai/fixtures/call-site-inventory/free-lane-call.ts` | 57751b05f6e6ab46a16c1c8574d34ce469a32c7d |
| A | `scripts/ai/fixtures/call-site-inventory/internal-llm-call.ts` | 81cbef7d9bd4fe806b2fa205a53a20323a680225 |
| A | `scripts/ai/fixtures/call-site-inventory/zod-validated.ts` | 19ae3af12ac128a181ebc2fbbe74f37d7dcf1333 |
| A | `scripts/guardrails/actor-minting-boundary.mjs` | 1fedbe44c12d607afd40752ca7731b9961ddaa32 |
| A | `scripts/guardrails/ai-control-plane-sealing.mjs` | 82342b55462ac587b4cd51e57d788a8279bf0345 |
| A | `scripts/guardrails/ai-transport-import-boundary.mjs` | 9d4e9ef8ed776ff56f9df09ad9c0f35e1f5e1225 |
| A | `scripts/guardrails/ai-transport-import-boundary.test.mjs` | f58d33ceeaf6a7d2730e9710ef8c5bad1a749aa5 |
| M | `scripts/guardrails/claude-api-usage.mjs` | f3949746c33c0b9db2b8a0a428763da29655aae3 |
| M | `scripts/guardrails/draft-only.mjs` | b2ed3e3b2e3df21ef457293684ce326e3ecc38fb |
| A | `scripts/guardrails/fixtures/actor-minting/clean-consumer.ts` | ecd37b5ed16739baa99a99b7d3d78be1057124b5 |
| A | `scripts/guardrails/fixtures/actor-minting/violation-aliased-import.ts` | ee2b1b816c503a92aed3d92e025904cf4a57655b |
| A | `scripts/guardrails/fixtures/actor-minting/violation-dynamic-import.ts` | 5b344b26ef92d8ef3e229b5cc72496755f704ed4 |
| A | `scripts/guardrails/fixtures/actor-minting/violation-export-star.ts` | b2ca2c592c5c80698a020f9ffc2a976685c9324e |
| A | `scripts/guardrails/fixtures/actor-minting/violation-named-import.ts` | c956ff3fd713dd85755d8705be2cc8638e43b299 |
| A | `scripts/guardrails/fixtures/actor-minting/violation-namespace-access.ts` | 4cd1bde9cc895cca982cdec6db11066ee4779547 |
| A | `scripts/guardrails/fixtures/actor-minting/violation-test-internal.ts` | 60652afd9f92595f5d2d8eef4e692cb1749f1db6 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/allowed/budget-store-import.ts` | f9978849cbf160352ff726e37d4d8a3123f7971d |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/allowed/comment-mention.ts` | 1c72007a66d7842786534d104aa4c61825979403 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/allowed/default-import-unrelated-messages.ts` | 25b5246e443df10b65783d463709f191eed221f8 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/allowed/dispatch-import.ts` | d905b1325242239a16de8873448ffeb7241c863e |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/allowed/error-class-import.ts` | ce5dc77309746695b1224f2116b951f137438482 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/allowed/error-class-multiline.ts` | 80c94bdeeee3edff2bb87a841fcad2086984e55b |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/allowed/error-class-reexport.ts` | 1d3a8dc9e98ae12860a28778266470410af3ba87 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/allowed/namespace-computed-other-access.ts` | 341c11b9fa522d0d300e56bc41d12bb316223d71 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/allowed/namespace-dispatch-import.ts` | 53a38da949fe68e1f685fa34834dabdbdf74c8b0 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/allowed/sibling-messages-module.ts` | ffcd04d10dffe2fbe2087369fcfdfa870b0eb556 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/allowed/type-only-import.ts` | daa4b31b2485f9d00c8582d4d7b07630b5e99c0c |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/allowed/type-only-namespace-import.ts` | 9604a92c9a9ee256c39171f1c79409a7ba8be504 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/alias-import.ts` | ccb84c6fbe74ba887f7adab19ca3967e25526a2a |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/barrel-relative-export-star.ts` | 223713df121a75976b7222aeb2d6ec627dc15c74 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/barrel-relative-provider-reexport.ts` | f270ac4a96c6d534d5176a050d28e80f5be409ee |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/barrel-relative-transport-dynamic.ts` | 5d98b8459a691bdbe5b16139080c064f10aa0d10 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/commonjs-require.cjs` | 7285274214d504c78515ea61fc0b887d843e2074 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/default-import-transport.ts` | c986bc9fc51d1d382be6561fb905850254604d73 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/dynamic-import.ts` | c1d4fac5058af51e5e58902b17417c6decbf6d56 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/endpoint-literal.ts` | 7ee8b38bc00b2930025932d5ee4ee2353813468b |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/export-star-alias-transport.ts` | 69726e4b8350dee8b6cbc6f1092312108ded4c8d |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/export-star-transport.ts` | 1d387c95a89f70fc4b5357a4a354f300b2096c84 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/multiline-import.ts` | 68304881994b344bfe3e765a644edc87cf450703 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/namespace-computed-access.ts` | bc0e5f35aa7e73b295e20f0485201be289dd5e0f |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/namespace-destructure-access.ts` | 2bcb2d4479a53ab6c41d0e96cb93da897d7ba05c |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/namespace-import-transport.ts` | 732b4f1db46c7f074d252197b3b68afbc6d2c8fd |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/namespace-property-access.ts` | 5be5e79f0274eeabbda1dc9a3bb8009a30725129 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/provider-import.ts` | 99b4b8a90bb3a5246d168e9079a0643f43415dbf |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/reexport-star-provider.ts` | 89d567efe0c28be210367f353cacf9f29bc099c3 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/reexport.ts` | 6ce73da1560e6a0ce48644fbdc65d804bcbd3186 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/sdk-aws-import.ts` | 05413eb7bb6b2781e7e5253c7080c274e955743f |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/sdk-import.ts` | 9f85412e62b0897ca4fc1369724ade0ecfccf375 |
| A | `scripts/guardrails/fixtures/ai-transport-boundary/violations/static-import.ts` | dfc3c86a58c5cfbc8ea11dceb6d7e569ef838910 |
| A | `scripts/integration/settlement-outbox-acceptance.mjs` | f80cfe511589be87bc6ca21c488bb8f4de0ae8f4 |
| A | `scripts/nova/README.md` | 793ecd97e928ba8d22d9de79e788f4fee9a2d634 |
| A | `scripts/nova/build-convergence-inventory.mjs` | e57211c6996f88c1e6e7ba3be4bae6f0ab2325dc |
| A | `scripts/nova/change-intelligence.mjs` | c6bca842471de4afbce5689c55eea03bc1e4b54f |
| A | `scripts/nova/convergence-inventory.test.mjs` | e78059417ea1f4f91e54a6560f767113f4dee13f |
| A | `scripts/nova/convergence-owners.json` | cabd826e70ab8026284f4adb4d5879234d302cb4 |
| A | `scripts/nova/multihead-inventory.mjs` | ff480b35125de70c4e9ede8579c629a1e7c5f77f |
| A | `scripts/nova/multihead-inventory.test.mjs` | ca60182b7570229a969636b8517cba21392b4787 |
| A | `scripts/nova/nova-intelligence.test.mjs` | fd4becaf745aea448e3ea827f7e14a55a018df79 |
| A | `scripts/nova/run-cycle.mjs` | 7f600e721f5978cb076efe20f5ec262616c8d43f |
| A | `scripts/nova/source-doctor.mjs` | e6760f6a85029629de831bdd12469592a483d8e1 |
| A | `scripts/nova/source-runtime-core.mjs` | 5863dd143ed32d427303d47577c0227a24bbf958 |
| A | `scripts/nova/source-runtime.test.mjs` | 893988011848fe7d00efbeb02053700db130d8eb |
| A | `scripts/nova/source-worker.mjs` | 0ea094ada20e89d6d177a08a19c5f32a63adf4a8 |
| A | `scripts/nova/verify-convergence-inventory.mjs` | a9486c2ec599c52df8c9e1aae27d0dcc255e3114 |
| A | `tools/labs/prisma-safety/PRISMA_SAFETY_PATTERNS.md` | 12aedfc26a1dad007434cb222e1acfc4b583b4cc |
| A | `tools/labs/prisma-safety/introspection-target.prisma` | dfc43c6a5e2f2b79928ab596ca2cadbfc11568e2 |
| A | `tools/labs/prisma-safety/investigation.md` | 3b7fb9fcd39cae6dbc3eead9cee3e1a2d72aac57 |
| M | `vercel.json` | 923ceb241e1a8f79e1d4a40afc50f7b3dfbce160 |

## Exported TypeScript symbols (changed files, head)

### `apps/web/__tests__/actor-governance.test.ts`

_no exports_

### `apps/web/__tests__/actor-hardening-db.integration.test.ts`

_no exports_

### `apps/web/__tests__/actor-minting-boundary.test.ts`

_no exports_

### `apps/web/__tests__/ai-control-plane-authority.test.ts`

_no exports_

### `apps/web/__tests__/ai-control-plane-budget-pg.test.ts`

_no exports_

### `apps/web/__tests__/ai-control-plane-budget.test.ts`

_no exports_

### `apps/web/__tests__/ai-control-plane-claim-pg.test.ts`

_no exports_

### `apps/web/__tests__/ai-control-plane-cost-mode.test.ts`

_no exports_

### `apps/web/__tests__/ai-control-plane-credit-admission.test.ts`

_no exports_

### `apps/web/__tests__/ai-control-plane-invocation.test.ts`

_no exports_

### `apps/web/__tests__/ai-control-plane-sealing-guard.test.ts`

_no exports_

### `apps/web/__tests__/ai-provider-registry.test.ts`

_no exports_

### `apps/web/__tests__/anonymous-report-route.test.ts`

_no exports_

### `apps/web/__tests__/canonical-json.test.ts`

_no exports_

### `apps/web/__tests__/checkout-attempt-db.integration.test.ts`

_no exports_

### `apps/web/__tests__/checkout-attempt-repair.test.ts`

_no exports_

### `apps/web/__tests__/checkout-attempt.test.ts`

_no exports_

### `apps/web/__tests__/checkout-live-mode-guard.test.ts`

_no exports_

### `apps/web/__tests__/checkout-repair-owner-queue.test.ts`

_no exports_

### `apps/web/__tests__/council-ledgers.test.ts`

_no exports_

### `apps/web/__tests__/cron-prune-rate-limits.test.ts`

_no exports_

### `apps/web/__tests__/durable-write-store.test.ts`

_no exports_

### `apps/web/__tests__/moderation-actions.test.ts`

_no exports_

### `apps/web/__tests__/nova-agent.test.ts`

_no exports_

### `apps/web/__tests__/nova-capability-governance.test.ts`

_no exports_

### `apps/web/__tests__/nova-capability-governor.test.ts`

_no exports_

### `apps/web/__tests__/nova-capability-inventory.test.ts`

_no exports_

### `apps/web/__tests__/nova-capability-source-schema.test.ts`

_no exports_

### `apps/web/__tests__/nova-credit-grant-snapshot.test.ts`

_no exports_

### `apps/web/__tests__/nova-credit-grant-state.test.ts`

_no exports_

### `apps/web/__tests__/nova-credit-snapshot-conformance.test.ts`

_no exports_

### `apps/web/__tests__/nova-credit-state-machines.test.ts`

_no exports_

### `apps/web/__tests__/nova-founder-command.test.ts`

_no exports_

### `apps/web/__tests__/nova-founder-work-seed.test.ts`

_no exports_

### `apps/web/__tests__/nova-opportunity-engine.test.ts`

_no exports_

### `apps/web/__tests__/nova-scenario-credits-non-authorizing.test.ts`

_no exports_

### `apps/web/__tests__/nova-source-evidence.test.ts`

_no exports_

### `apps/web/__tests__/nova-subagents.test.ts`

_no exports_

### `apps/web/__tests__/push-subscribe-api.test.ts`

_no exports_

### `apps/web/__tests__/repair-checkout-attempts-cron-route.test.ts`

_no exports_

### `apps/web/__tests__/stripe-checkout-consent.test.ts`

_no exports_

### `apps/web/__tests__/stripe-outcome.test.ts`

_no exports_

### `apps/web/__tests__/stripe-webhook-route.test.ts`

_no exports_

### `apps/web/__tests__/subscriptions-checkout-route.test.ts`

_no exports_

### `apps/web/app/api/cron/deliver-settlement-alerts/route.ts`

- `GET` (function)
- `dynamic` (const)
- `fetchCache` (const)
- `maxDuration` (const)

### `apps/web/app/api/cron/drain-ai-telemetry-recovery/route.ts`

- `GET` (function)
- `dynamic` (const)
- `fetchCache` (const)
- `maxDuration` (const)

### `apps/web/app/api/cron/prune-rate-limits/route.ts`

- `GET` (function)
- `dynamic` (const)

### `apps/web/app/api/cron/repair-checkout-attempts/route.ts`

- `GET` (function)
- `dynamic` (const)
- `fetchCache` (const)
- `maxDuration` (const)

### `apps/web/app/api/cron/settle-picks/route.ts`

- `GET` (function)
- `dynamic` (const)
- `fetchCache` (const)
- `maxDuration` (const)

### `apps/web/app/api/moderation/anonymous-report/route.ts`

- `POST` (const)
- `dynamic` (const)

### `apps/web/app/api/push/subscribe/route.ts`

- `POST` (function)
- `dynamic` (const)

### `apps/web/app/api/push/unsubscribe/route.ts`

- `POST` (function)
- `dynamic` (const)

### `apps/web/app/api/subscriptions/checkout/route.ts`

- `POST` (function)

### `apps/web/app/api/webhooks/stripe/route.ts`

- `POST` (function)

### `apps/web/app/cockpit/layout.tsx`

- `default` (function)
- `metadata` (const)

### `apps/web/app/cockpit/nova/founder/page.tsx`

- `default` (function)
- `dynamic` (const)

### `apps/web/app/cockpit/nova/page.tsx`

- `default` (function)
- `dynamic` (const)

### `apps/web/components/pricing/subscribe-button.tsx`

- `SubscribeButton` (function)

### `apps/web/components/push/push-alert-opt-in.tsx`

- `PushAlertOptIn` (function)

### `apps/web/lib/ai-control-plane/budget.ts`

- `AttemptActualPricer` (type)
- `AttemptPlanWorstCaseInput` (interface)
- `AttemptUsage` (interface)
- `BudgetDb` (interface)
- `BudgetOverageIncident` (interface)
- `BudgetScopeContext` (interface)
- `BudgetScopeKind` (type)
- `BudgetWindowState` (type)
- `CONTROL_PLANE_PRICING_VERSION` (const)
- `CONTROL_PLANE_PROVIDER_MINIMUM_USD` (const)
- `ConfirmSettlementInput` (interface)
- `ConfirmedSettlementKind` (type)
- `KNOWN_PRICING_VERSIONS` (const)
- `OwnerIncidentSink` (type)
- `ReservationHandle` (interface)
- `ReservationSelector` (interface)
- `ReservationState` (type)
- `ReserveInput` (interface)
- `ReserveResult` (interface)
- `ResolvedBudgetWindow` (interface)
- `SettleProvisionalInput` (interface)
- `SettleProvisionalResult` (interface)
- `SweepResult` (interface)
- `confirmSettlement` (function)
- `estimateAttemptPlanWorstCaseUsd` (function)
- `holdForReconciliation` (function)
- `microsToUsd` (function)
- `release` (function)
- `requiresCashReservation` (function)
- `reserve` (function)
- `resolveRequiredBudgetWindows` (function)
- `settleProvisional` (function)
- `sweepExpired` (function)
- `toUsdString` (function)
- `usdToMicros` (function)

### `apps/web/lib/ai-control-plane/contracts.ts`

- `AiAttemptSummary` (interface)
- `AiAuthorityNarrowing` (interface)
- `AiInvocationCorrelation` (interface)
- `AiSurface` (type)
- `AiTaskInvocationRequest` (interface)
- `AiTaskPolicyDefinition` (interface)
- `AiTaskResult` (interface)
- `BudgetScopeTemplate` (type)
- `CapabilityFloor` (interface)
- `ClaudeSurface` (reexport)
- `DataPolicy` (interface)
- `DataPolicyTag` (type)
- `EffectiveAuthority` (interface)
- `Entity` (type)
- `FundingLabel` (type)
- `LatencyClass` (type)
- `ModelSubstitution` (interface)
- `ModelSubstitutionId` (type)
- `OutputValidationPolicy` (interface)
- `ProviderId` (type)
- `ProviderRouteId` (type)
- `ReasoningTier` (type)
- `RegisteredAiTaskClass` (type)
- `RetentionPolicy` (interface)

### `apps/web/lib/ai-control-plane/control-store.ts`

- `AttemptFailureInput` (interface)
- `AttributionCreateInput` (interface)
- `AuthoritativeControlStore` (interface)
- `BlockedInvocationInput` (interface)
- `ClaimInvocationInput` (interface)
- `ClaimOutcome` (type)
- `ControlSqlClient` (interface)
- `FinalizeFailureInput` (interface)
- `FinalizeSuccessInput` (interface)
- `StartAttemptInput` (interface)
- `createPgControlStore` (function)
- `prismaSqlClient` (function)

### `apps/web/lib/ai-control-plane/cost-mode.ts`

- `AiEnvClass` (type)
- `CostMode` (type)
- `EnvClassSource` (type)
- `EnvLike` (interface)
- `LEGACY_COST_MODE_ALIASES` (const)
- `OrderedCostMode` (type)
- `ResolveCostModeInput` (interface)
- `ResolvedEnvClass` (interface)
- `effectiveMode` (function)
- `isRecognizedCostMode` (function)
- `resolveCostMode` (function)
- `resolveEnvClass` (function)

### `apps/web/lib/ai-control-plane/credit-admission.ts`

- `AdmitCreditFundedInput` (interface)
- `AuthorizeCreditInput` (interface)
- `CreditAdmissionDecision` (interface)
- `CreditAdmissionRefusalReason` (type)
- `CreditAdmissionScope` (interface)
- `CreditAuthorizationDecision` (type)
- `CreditAuthorizationHandle` (interface)
- `CreditAuthorizationPort` (interface)
- `CreditAuthorizationState` (type)
- `CreditGrantSnapshot` (reexport)
- `CreditLedgerDb` (interface)
- `CreditScopeRequest` (reexport)
- `CreditSnapshotStore` (interface)
- `admitCreditFunded` (function)
- `createPgCreditAuthorizationPort` (function)
- `creditScopeCovers` (reexport)
- `evaluateCreditAdmission` (function)
- `evaluateCreditSnapshotAdmissibility` (reexport)
- `isCreditGrantSnapshotExpired` (reexport)
- `isCreditGrantSnapshotFresh` (reexport)
- `validateCreditGrantSnapshot` (reexport)

### `apps/web/lib/ai-control-plane/credit-port.ts`

- `CreditAuthorizationPort` (interface)
- `CreditAuthorizationRequest` (interface)
- `CreditReservation` (interface)
- `failClosedCreditAuthorizationPort` (const)

### `apps/web/lib/ai-control-plane/dispatch.ts`

- `ProviderDispatchFn` (type)
- `ProviderDispatchOutcome` (type)
- `ProviderDispatchPayload` (interface)
- `createProviderDispatchers` (function)
- `dispatchAnthropicDirect` (function)
- `dispatchBedrock` (function)
- `dispatchCerebras` (function)
- `dispatchLocal` (function)
- `dispatchVertex` (function)

### `apps/web/lib/ai-control-plane/emergency.ts`

- `EmergencyOverrideReceipt` (interface)
- `EmergencyReceiptStore` (interface)
- `VerifyEmergencyOverrideInput` (interface)
- `failClosedReceiptStore` (const)
- `verifyEmergencyOverride` (function)

### `apps/web/lib/ai-control-plane/errors.ts`

- `AiControlPlaneError` (class)
- `AiErrorCode` (type)
- `AmbiguousCharge` (class)
- `BudgetBlocked` (class)
- `ConfigurationError` (class)
- `Forbidden` (class)
- `InvalidInput` (class)
- `PolicyBlocked` (class)
- `ProviderRejected` (class)
- `ProviderUnavailable` (class)
- `StoreUnavailable` (class)
- `TelemetryDegraded` (class)
- `Unauthenticated` (class)
- `isAiControlPlaneError` (function)

### `apps/web/lib/ai-control-plane/executor.ts`

- `AiDispatchFn` (type)
- `AiDispatchOutcome` (type)
- `AiDispatchPlan` (interface)
- `AiExecutor` (interface)
- `AiPolicySource` (interface)
- `BlockedDecisionRecord` (interface)
- `BlockedDecisionRecorder` (type)
- `SealedAiExecutorDependencies` (interface)
- `createAiExecutor` (function)
- `executeAiTask` (function)

### `apps/web/lib/ai-control-plane/index.ts`

- `AiAttemptSummary` (reexport)
- `AiAuthorityNarrowing` (reexport)
- `AiControlPlaneError` (reexport)
- `AiEnvClass` (reexport)
- `AiErrorCode` (reexport)
- `AiInvocationCorrelation` (reexport)
- `AiSurface` (reexport)
- `AiTaskInvocationRequest` (reexport)
- `AiTaskPolicyDefinition` (reexport)
- `AiTaskResult` (reexport)
- `AmbiguousCharge` (reexport)
- `AttemptPlanWorstCaseInput` (reexport)
- `BudgetBlocked` (reexport)
- `BudgetOverageIncident` (reexport)
- `BudgetScopeContext` (reexport)
- `BudgetScopeKind` (reexport)
- `BudgetScopeTemplate` (reexport)
- `BudgetWindowState` (reexport)
- `CONTROL_PLANE_PRICING_VERSION` (reexport)
- `CapabilityFloor` (reexport)
- `ClaudeSurface` (reexport)
- `ConfigurationError` (reexport)
- `ConfirmedSettlementKind` (reexport)
- `CostMode` (reexport)
- `CreditAuthorizationPort` (reexport)
- `CreditAuthorizationRequest` (reexport)
- `CreditReservation` (reexport)
- `DataPolicy` (reexport)
- `DataPolicyTag` (reexport)
- `DrainSummary` (reexport)
- `EffectiveAuthority` (reexport)
- `EmergencyOverrideReceipt` (reexport)
- `EmergencyReceiptStore` (reexport)
- `Entity` (reexport)
- `EnvClassSource` (reexport)
- `EnvLike` (reexport)
- `Forbidden` (reexport)
- `FundingLabel` (reexport)
- `InvalidInput` (reexport)
- `KNOWN_PRICING_VERSIONS` (reexport)
- `LEGACY_COST_MODE_ALIASES` (reexport)
- `LatencyClass` (reexport)
- `MAX_INPUT_BYTES` (reexport)
- `ModelSubstitution` (reexport)
- `ModelSubstitutionId` (reexport)
- `OrderedCostMode` (reexport)
- `OutputValidationPolicy` (reexport)
- `OwnerIncidentSink` (reexport)
- `POLICY_REGISTRY_VERSION` (reexport)
- `PolicyBlocked` (reexport)
- `ProviderId` (reexport)
- `ProviderRejected` (reexport)
- `ProviderRouteId` (reexport)
- `ProviderUnavailable` (reexport)
- `REGISTERED_AI_TASK_CLASSES` (reexport)
- `REQUEST_ID_PATTERN` (reexport)
- `ReasoningTier` (reexport)
- `RegisteredAiTaskClass` (reexport)
- `ReservationState` (reexport)
- `ResolvedBudgetWindow` (reexport)
- `RetentionPolicy` (reexport)
- `StoreUnavailable` (reexport)
- `TelemetryDegraded` (reexport)
- `Unauthenticated` (reexport)
- `assertPolicyRegistryWellFormed` (reexport)
- `containsPaymentCardLikeNumber` (reexport)
- `drainAiTelemetryRecoveryProduction` (reexport)
- `estimateAttemptPlanWorstCaseUsd` (reexport)
- `executeAiTask` (reexport)
- `getTaskPolicy` (reexport)
- `isAiControlPlaneError` (reexport)
- `isRecognizedCostMode` (reexport)
- `isRegisteredTaskClass` (reexport)
- `microsToUsd` (reexport)
- `requiresCashReservation` (reexport)
- `resolveEffectiveAuthority` (reexport)
- `resolveRequiredBudgetWindows` (reexport)
- `scanForSecretMaterial` (reexport)
- `toUsdString` (reexport)
- `usdToMicros` (reexport)
- `validateInvocationRequest` (reexport)

### `apps/web/lib/ai-control-plane/internal.ts`

- `AdmitCreditFundedInput` (reexport)
- `AiDispatchFn` (reexport)
- `AiDispatchOutcome` (reexport)
- `AiDispatchPlan` (reexport)
- `AiExecutor` (reexport)
- `AiPolicySource` (reexport)
- `AttemptActualPricer` (reexport)
- `AttemptFailureInput` (reexport)
- `AttemptUsage` (reexport)
- `AttributionCreateInput` (reexport)
- `AuthoritativeControlStore` (reexport)
- `AuthorizeCreditInput` (reexport)
- `BlockedDecisionRecord` (reexport)
- `BlockedDecisionRecorder` (reexport)
- `BlockedInvocationInput` (reexport)
- `BudgetDb` (reexport)
- `BudgetSeam` (reexport)
- `CONTROL_PLANE_PROVIDER_MINIMUM_USD` (reexport)
- `ClaimInvocationInput` (reexport)
- `ClaimOutcome` (reexport)
- `ConfirmSettlementInput` (reexport)
- `ControlSqlClient` (reexport)
- `CreditAdmissionDecision` (reexport)
- `CreditAdmissionRefusalReason` (reexport)
- `CreditAdmissionScope` (reexport)
- `CreditAuthorizationDecision` (reexport)
- `CreditAuthorizationHandle` (reexport)
- `CreditAuthorizationState` (reexport)
- `CreditLedgerDb` (reexport)
- `CreditSnapshotStore` (reexport)
- `DrainOptions` (reexport)
- `DrainSummary` (reexport)
- `FinalizeFailureInput` (reexport)
- `FinalizeSuccessInput` (reexport)
- `LedgeredDispatchDeps` (reexport)
- `ObservabilitySink` (reexport)
- `ProviderDispatchFn` (reexport)
- `ProviderDispatchOutcome` (reexport)
- `ProviderDispatchPayload` (reexport)
- `RecoveryEnqueueInput` (reexport)
- `RecoveryKind` (reexport)
- `RecoveryQueueRow` (reexport)
- `ReservationHandle` (reexport)
- `ReservationSelector` (reexport)
- `ReserveInput` (reexport)
- `ReserveResult` (reexport)
- `ResolveCostModeInput` (reexport)
- `ResolvedEnvClass` (reexport)
- `RouteCreditAuthorizationPort` (reexport)
- `SealedAiExecutorDependencies` (reexport)
- `SettleProvisionalInput` (reexport)
- `SettleProvisionalResult` (reexport)
- `StartAttemptInput` (reexport)
- `SweepResult` (reexport)
- `TaskPromptInput` (reexport)
- `abandonExhaustedRecovery` (reexport)
- `admitCreditFunded` (reexport)
- `canonicalJson` (reexport)
- `claimRecoveryBatch` (reexport)
- `computeRequestFingerprint` (reexport)
- `confirmSettlement` (reexport)
- `createAiExecutor` (reexport)
- `createLedgeredDispatch` (reexport)
- `createPgControlStore` (reexport)
- `createPgCreditAuthorizationPort` (reexport)
- `createProviderDispatchers` (reexport)
- `deriveProviderPayload` (reexport)
- `dispatchAnthropicDirect` (reexport)
- `dispatchBedrock` (reexport)
- `dispatchCerebras` (reexport)
- `dispatchLocal` (reexport)
- `dispatchVertex` (reexport)
- `drainAiTelemetryRecovery` (reexport)
- `effectiveMode` (reexport)
- `evaluateCreditAdmission` (reexport)
- `failClosedCreditAuthorizationPort` (reexport)
- `failClosedReceiptStore` (reexport)
- `holdForReconciliation` (reexport)
- `markRecoveryDelivered` (reexport)
- `prismaSqlClient` (reexport)
- `release` (reexport)
- `reserve` (reexport)
- `resolveCostMode` (reexport)
- `resolveEnvClass` (reexport)
- `settleProvisional` (reexport)
- `sha256Hex` (reexport)
- `sweepExpired` (reexport)
- `verifyEmergencyOverride` (reexport)

### `apps/web/lib/ai-control-plane/invocation-pipeline.ts`

- `BudgetSeam` (interface)
- `LedgeredDispatchDeps` (interface)
- `TaskPromptInput` (interface)
- `canonicalJson` (function)
- `computeRequestFingerprint` (function)
- `createLedgeredDispatch` (function)
- `deriveProviderPayload` (function)
- `sha256Hex` (function)

### `apps/web/lib/ai-control-plane/observability.ts`

- `ObservabilityLogger` (type)
- `ObservabilitySink` (class)
- `RecoveryEnqueueInput` (interface)
- `RecoveryKind` (type)
- `RecoveryQueueRow` (interface)
- `abandonExhaustedRecovery` (function)
- `claimRecoveryBatch` (function)
- `markRecoveryDelivered` (function)

### `apps/web/lib/ai-control-plane/policy-registry.ts`

- `POLICY_REGISTRY_VERSION` (const)
- `REGISTERED_AI_TASK_CLASSES` (const)
- `assertPolicyRegistryWellFormed` (function)
- `getTaskPolicy` (function)
- `isRegisteredTaskClass` (function)

### `apps/web/lib/ai-control-plane/provider-registry.data.ts`

- `ChangeReviewState` (type)
- `DataPrivacyTag` (type)
- `EconomicClass` (type)
- `ModelCapability` (interface)
- `ModelDeprecationState` (type)
- `ModelModality` (type)
- `OwnerApprovedSubstitution` (interface)
- `PROVIDER_REGISTRY` (const)
- `PROVIDER_ROUTE_IDS` (const)
- `PricingVersionPointer` (interface)
- `ProviderRegistry` (interface)
- `ProviderRegistryChange` (type)
- `ProviderRegistryChangeReviewPacket` (interface)
- `ProviderRegistryValidationCode` (type)
- `ProviderRegistryValidationError` (class)
- `ProviderRegistryValidationResult` (interface)
- `ProviderRoute` (interface)
- `ProviderRouteAccountShape` (interface)
- `ProviderRouteId` (type)
- `ReviewStatus` (type)
- `RouteModelAssertion` (interface)
- `RouteModelIdSource` (type)
- `assertKnownRouteModel` (function)
- `getModelCapability` (function)
- `getProviderRoute` (function)
- `isDeeplyFrozen` (function)
- `validateProviderRegistry` (function)

### `apps/web/lib/ai-control-plane/recovery-drainer.ts`

- `DrainOptions` (interface)
- `DrainSummary` (interface)
- `drainAiTelemetryRecovery` (function)
- `drainAiTelemetryRecoveryProduction` (function)

### `apps/web/lib/ai-control-plane/validation.ts`

- `MAX_INPUT_BYTES` (const)
- `MAX_RETENTION_TTL_DAYS` (const)
- `MAX_VENDOR_CASH_USD_CEILING` (const)
- `REQUEST_ID_PATTERN` (const)
- `assertPolicyVersionAllowed` (function)
- `containsPaymentCardLikeNumber` (function)
- `resolveEffectiveAuthority` (function)
- `scanForSecretMaterial` (function)
- `validateDataPolicy` (function)
- `validateInvocationRequest` (function)
- `validatePolicyDefinition` (function)
- `validateRetentionPolicy` (function)
- `validateUsdAmount` (function)

### `apps/web/lib/auth/actor-receipt.ts`

- `ActorReceiptRecord` (interface)
- `ActorReceiptUnavailableError` (class)
- `persistActorReceipt` (function)
- `toActorReceiptRecord` (function)

### `apps/web/lib/auth/actor-test-internal.ts`

- `ServiceActorParams` (reexport)
- `SystemActorParams` (reexport)
- `serviceActor` (reexport)
- `systemActor` (reexport)

### `apps/web/lib/auth/actor.ts`

- `ACTOR_POLICY_VERSION` (const)
- `ActorType` (type)
- `AdminActor` (interface)
- `AuthMethod` (type)
- `AuthorityScope` (type)
- `ForbiddenError` (class)
- `HumanActor` (interface)
- `InvalidActorError` (class)
- `InvalidServiceCredentialError` (class)
- `ResolveServiceActorParams` (interface)
- `ServiceActor` (interface)
- `ServiceActorParams` (interface)
- `ServiceCredentialMethod` (type)
- `ServiceOperation` (type)
- `ServicePrincipalId` (type)
- `SystemActor` (interface)
- `SystemActorParams` (interface)
- `TrustedActor` (type)
- `UnauthenticatedError` (class)
- `UnknownServicePrincipalError` (class)
- `VerifiedCredentialContext` (interface)
- `assertActorType` (function)
- `requireAdminActor` (function)
- `requireSessionActor` (function)
- `resolveServiceActor` (function)
- `serviceActor` (function)
- `systemActor` (function)
- `toAdminActorView` (function)

### `apps/web/lib/billing/canonical-json.ts`

- `CanonicalJsonError` (class)
- `CanonicalJsonValue` (type)
- `canonicalJsonStringify` (function)
- `sha256CanonicalJson` (function)

### `apps/web/lib/billing/checkout-attempt-repair.ts`

- `CheckoutAttemptReconcileOutcome` (type)
- `CheckoutAttemptRepairDb` (interface)
- `CheckoutAttemptRepairDeps` (interface)
- `CheckoutAttemptRepairReport` (interface)
- `CheckoutRepairOwnerQueue` (interface)
- `CheckoutSessionLookup` (interface)
- `REPAIR_MIN_AGE_MS` (const)
- `RepairSessionView` (interface)
- `RepairableCheckoutAttempt` (type)
- `reconcileOneCheckoutAttempt` (function)
- `repairUnresolvedCheckoutAttempts` (function)

### `apps/web/lib/billing/checkout-attempt.ts`

- `CHECKOUT_ATTEMPT_TTL_MS` (const)
- `CHECKOUT_RECONCILE_MIN_AGE_MS` (const)
- `CHECKOUT_SESSION_MAX_LIFETIME_MS` (const)
- `CLAIMABLE_STATUSES` (const)
- `CheckoutAttemptDb` (interface)
- `CheckoutAttemptIdError` (class)
- `CheckoutAttemptPersistenceError` (class)
- `CheckoutAttemptRecord` (interface)
- `CheckoutAttemptStatus` (type)
- `CheckoutAttemptUnresolvedError` (class)
- `CheckoutCommercialParams` (interface)
- `CheckoutIntentConflictError` (class)
- `GetOrCreateCheckoutAttemptInput` (interface)
- `GetOrCreateCheckoutAttemptResult` (interface)
- `REQUEST_FINGERPRINT_VERSION` (const)
- `bindCheckoutSessionToAttempt` (function)
- `claimCheckoutAttemptForStripeRequest` (function)
- `computeRequestFingerprint` (function)
- `currentCheckoutCommercialParams` (function)
- `currentCommercialTermsVersion` (function)
- `getOrCreateCheckoutAttempt` (function)
- `isValidCheckoutAttemptId` (function)
- `isValidClientIntentId` (function)
- `mintCheckoutAttemptId` (function)
- `recordCheckoutAttemptOutcome` (function)
- `stripeIdempotencyKeyForAttempt` (function)

### `apps/web/lib/billing/checkout-repair-owner-queue.ts`

- `cockpitCheckoutRepairOwnerQueue` (function)

### `apps/web/lib/billing/stripe-outcome.ts`

- `CheckoutOutcomeClass` (type)
- `OutcomeAttemptStatus` (type)
- `OutcomeTransition` (interface)
- `classifyStripeSessionCreateError` (function)
- `transitionForOutcome` (function)

### `apps/web/lib/community/anonymous-report-handler.ts`

- `AnonymousReportBody` (type)
- `AnonymousReportHandlerDeps` (interface)
- `AnonymousReportPersistInput` (interface)
- `createAnonymousReportHandler` (function)
- `deriveTrustedSourceIp` (function)

### `apps/web/lib/community/durable-rate-limiter.ts`

- `DurableRateLimiter` (interface)
- `InMemoryDurableRateLimiter` (class)
- `PostgresDurableRateLimiter` (class)
- `RATE_COUNTER_MAX_RETENTION_MS` (const)
- `RateLimitConsumeRequest` (interface)
- `RateLimitDecision` (interface)
- `RateLimitSqlClient` (interface)
- `RateLimitStoreUnavailableError` (class)
- `pruneExpiredRateLimitCounters` (function)

### `apps/web/lib/community/moderation-actions.ts`

- `ActionRow` (interface)
- `AppealActionInput` (interface)
- `AuditLogRow` (interface)
- `DecideAppealInput` (interface)
- `FileReportInput` (interface)
- `ModerationStoreUnavailableError` (class)
- `OpenReportRow` (interface)
- `TakeActionInput` (interface)
- `appealAction` (function)
- `auditLog` (function)
- `decideAppeal` (function)
- `fileReport` (function)
- `listActions` (function)
- `listOpenReports` (function)
- `takeAction` (function)

### `apps/web/lib/community/report-abuse-policy.ts`

- `ANONYMOUS_REPORT_LIMITS` (const)
- `AUTHENTICATED_REPORT_LIMITS` (const)
- `AnonymousReportPayload` (interface)
- `AnonymousReportQuotaInput` (interface)
- `MIN_HMAC_SECRET_LENGTH` (const)
- `ReportRateLimitedError` (class)
- `checkAnonymousReportQuotas` (function)
- `checkAuthenticatedReportQuota` (function)
- `deriveAnonymousSourceFingerprint` (function)
- `derivePayloadDedupKey` (function)

### `apps/web/lib/jarvis/ledgers-core.ts`

- `LedgerStoreUnavailableError` (class)
- `LogHandoffInput` (interface)
- `LogSubagentRunInput` (interface)
- `SubagentReviewDecision` (type)
- `SubagentRunAlreadyDecidedError` (class)
- `listPendingSubagentReviews` (function)
- `listRecentHandoffs` (function)
- `logHandoffAs` (function)
- `logSubagentRunAs` (function)
- `reviewSubagentRunAs` (function)

### `apps/web/lib/jarvis/ledgers.ts`

- `LedgerStoreUnavailableError` (reexport)
- `LogHandoffInput` (reexport)
- `LogSubagentRunInput` (reexport)
- `SubagentReviewDecision` (reexport)
- `SubagentRunAlreadyDecidedError` (reexport)
- `listPendingSubagentReviews` (function)
- `listRecentHandoffs` (function)
- `logHandoff` (function)
- `logSubagentRun` (function)
- `reviewSubagentRun` (function)

### `apps/web/lib/nova/founder-os-dashboard.ts`

- `NovaFounderOsSummary` (interface)
- `NovaFounderOsSummaryOptions` (interface)
- `loadNovaFounderOsSummary` (function)

### `apps/web/lib/opportunity-engine/capability-governance.ts`

- `CAPABILITY_ROLLBACK_PLANS` (const)
- `CAPABILITY_STOP_CONDITION_PROFILES` (const)
- `CAPABILITY_SUPPLY_CHAIN_STATES` (const)
- `CAPABILITY_VERSION_DRIFT_STATES` (const)
- `CapabilityContextCostEstimate` (interface)
- `CapabilityExternalCommunicationScope` (type)
- `CapabilityFileReadScope` (type)
- `CapabilityFileWriteScope` (type)
- `CapabilityGovernanceRecord` (interface)
- `CapabilityNetworkScope` (type)
- `CapabilityObservedPerformance` (interface)
- `CapabilityPermissionBasis` (type)
- `CapabilityPermissionManifest` (interface)
- `CapabilityRollbackPlan` (interface)
- `CapabilityRollbackPlanId` (type)
- `CapabilitySecretsScope` (type)
- `CapabilityStopCondition` (interface)
- `CapabilityStopConditionProfileId` (type)
- `CapabilitySupplyChainState` (type)
- `CapabilityVersionDriftState` (type)
- `DRIFT_ELIGIBLE_VERSION_DRIFT_STATES` (const)
- `PLUGIN_CONTEXT_BASE_TOKENS` (const)
- `PLUGIN_CONTEXT_TOKENS_PER_SKILL` (const)
- `estimateCapabilityContextCost` (function)
- `expectedRollbackPlanIdForSurface` (function)
- `findCapabilityGovernanceRecord` (function)
- `getCapabilityGovernanceRecords` (function)
- `validateCapabilityGovernanceCoverage` (function)
- `validateCapabilityGovernanceDocument` (function)
- `validateCapabilityObservedPerformance` (function)
- `validateCapabilityPermissionManifest` (function)

### `apps/web/lib/opportunity-engine/capability-governor.ts`

- `CapabilityIneligibilityReason` (type)
- `CapabilityInspectionCandidate` (interface)
- `CapabilityInspectionRecommendation` (interface)
- `CapabilityRiskFlag` (type)
- `CapabilityRoute` (interface)
- `CapabilityTaskClass` (type)
- `CapabilityTrustTier` (type)
- `GovernedCapabilityCandidate` (interface)
- `IneligibleCapabilityRecord` (interface)
- `InspectionSelectionInput` (interface)
- `MAX_INSPECTION_CANDIDATES` (const)
- `classifyCapabilityTrust` (function)
- `detectCapabilityRisk` (function)
- `routeCapabilities` (function)
- `selectInspectionCandidates` (function)

### `apps/web/lib/opportunity-engine/capability-inventory.ts`

- `CapabilityCaptureBatch` (type)
- `CapabilityConnectionState` (type)
- `CapabilityInventoryEntry` (interface)
- `CapabilityInventorySummary` (interface)
- `CapabilityInventorySurface` (type)
- `findCapabilitiesByName` (function)
- `getAdditionalClaudePlugins` (function)
- `getCapabilityInventory` (function)
- `summarizeCapabilityInventory` (function)
- `validateCapabilityInventory` (function)

### `apps/web/lib/opportunity-engine/capability-provenance.ts`

- `CAPABILITY_PROVENANCE_HASH_PATTERN` (const)
- `CAPABILITY_PROVENANCE_MATERIAL_VERSION` (const)
- `CAPABILITY_PROVENANCE_SCHEME` (const)
- `CapabilityProvenanceMaterialInput` (interface)
- `CapabilityProvenanceSourceDocument` (interface)
- `capabilityProvenanceMaterial` (function)
- `computeCapabilityProvenanceHash` (function)
- `fnv1a64Hex` (function)
- `isWellFormedCapabilityProvenanceHash` (function)

### `apps/web/lib/opportunity-engine/capability-source-schema.ts`

- `validateCapabilityAdditionsDocument` (function)
- `validateCapabilityCaptureDocument` (function)

### `apps/web/lib/opportunity-engine/change-detection.ts`

- `detectMaterialChanges` (function)
- `observationKey` (function)

### `apps/web/lib/opportunity-engine/credit-snapshot.ts`

- `CREDIT_ADMISSIBILITY_REASONS` (const)
- `CREDIT_SCOPE_WILDCARD` (const)
- `CreditAdmissibilityReason` (type)
- `CreditCashOverageBehavior` (type)
- `CreditGrantSnapshot` (interface)
- `CreditScopeRequest` (interface)
- `CreditSnapshotAdmissibility` (interface)
- `CreditSnapshotReconciliationState` (type)
- `CreditSnapshotValidationResult` (interface)
- `CreditSnapshotViolation` (type)
- `creditScopeCovers` (function)
- `evaluateCreditSnapshotAdmissibility` (function)
- `isCreditGrantSnapshotExpired` (function)
- `isCreditGrantSnapshotFresh` (function)
- `validateCreditGrantSnapshot` (function)

### `apps/web/lib/opportunity-engine/credit.ts`

- `CREDIT_ALLOCATION_STATES` (const)
- `CREDIT_ALLOCATION_STATE_TRANSITIONS` (const)
- `CREDIT_APPLICATION_STATES` (const)
- `CREDIT_APPLICATION_STATE_TRANSITIONS` (const)
- `CREDIT_BALANCE_STATES` (const)
- `CREDIT_BALANCE_STATE_TRANSITIONS` (const)
- `CREDIT_GRANT_STATES` (const)
- `CREDIT_PROGRAM_STATES` (const)
- `CREDIT_PROGRAM_STATE_TRANSITIONS` (const)
- `assertCreditAllocationStateTransition` (function)
- `assertCreditApplicationStateTransition` (function)
- `assertCreditBalanceStateTransition` (function)
- `assertCreditProgramStateTransition` (function)
- `canTransitionCreditAllocationState` (function)
- `canTransitionCreditApplicationState` (function)
- `canTransitionCreditBalanceState` (function)
- `canTransitionCreditProgramState` (function)
- `creditAllocationStateToMoneyState` (function)
- `creditApplicationStateToMoneyState` (function)
- `creditBalanceStateToMoneyState` (function)
- `creditGrantStateToMoneyState` (function)
- `creditProgramStateToMoneyState` (function)
- `isCreditAllocationStateTerminal` (function)
- `isCreditApplicationStateTerminal` (function)
- `isCreditBalanceStateTerminal` (function)
- `isCreditProgramStateTerminal` (function)

### `apps/web/lib/opportunity-engine/evidence.ts`

- `assessEvidence` (function)

### `apps/web/lib/opportunity-engine/experiment.ts`

- `buildExperiment` (function)

### `apps/web/lib/opportunity-engine/founder-command.ts`

- `ControlPlaneConfigurationEventReadModel` (interface)
- `ControlPlaneErrorCode` (type)
- `CouncilReviewer` (reexport)
- `DEFAULT_FOUNDER_OPERATING_POLICY` (const)
- `FOUNDER_OPEN_WORK_STATES` (const)
- `FOUNDER_WORK_LANES` (const)
- `FounderDailyBrief` (interface)
- `FounderLaneSummary` (interface)
- `FounderOperatingPolicy` (interface)
- `FounderQueueActorReceipt` (interface)
- `FounderQueueDecision` (interface)
- `FounderQueueDecisionKind` (type)
- `FounderWorkAuthority` (type)
- `FounderWorkItem` (interface)
- `FounderWorkLane` (type)
- `FounderWorkState` (type)
- `NightlyAutopsyInput` (interface)
- `SettlementAnomalyReadModel` (interface)
- `SettlementAnomalyState` (type)
- `SettlementOwnerDecisionKind` (type)

### `apps/web/lib/opportunity-engine/founder-work-seed.ts`

- `CapabilityGovernanceRecord` (reexport)
- `FounderDailyBriefInput` (interface)
- `buildCapabilityGovernanceWorkItems` (function)
- `buildControlPlaneEconomicsWorkItems` (function)
- `buildCreditLifecycleWorkItems` (function)
- `buildFounderDailyBrief` (function)
- `buildSettlementAnomalyWorkItems` (function)
- `buildSourceIntelligenceWorkItems` (function)

### `apps/web/lib/opportunity-engine/index.ts`

- `* from ./capability-governance` (star-reexport)
- `* from ./capability-inventory` (star-reexport)
- `* from ./capability-provenance` (star-reexport)
- `* from ./capability-source-schema` (star-reexport)
- `* from ./change-detection` (star-reexport)
- `* from ./credit` (star-reexport)
- `* from ./credit-snapshot` (star-reexport)
- `* from ./evidence` (star-reexport)
- `* from ./experiment` (star-reexport)
- `* from ./founder-command` (star-reexport)
- `* from ./founder-work-seed` (star-reexport)
- `* from ./learning` (star-reexport)
- `* from ./lifecycle` (star-reexport)
- `* from ./monetization` (star-reexport)
- `* from ./nova-agent` (star-reexport)
- `* from ./nova-subagents` (star-reexport)
- `* from ./pipeline` (star-reexport)
- `* from ./policy` (star-reexport)
- `* from ./scoring` (star-reexport)
- `* from ./source-registry` (star-reexport)
- `* from ./types` (star-reexport)
- `CapabilityIneligibilityReason` (reexport)
- `CapabilityInspectionCandidate` (reexport)
- `CapabilityInspectionRecommendation` (reexport)
- `CapabilityRiskFlag` (reexport)
- `CapabilityTaskClass` (reexport)
- `CapabilityTrustTier` (reexport)
- `IneligibleCapabilityRecord` (reexport)
- `InspectionSelectionInput` (reexport)
- `MAX_INSPECTION_CANDIDATES` (reexport)
- `classifyCapabilityTrust` (reexport)
- `detectCapabilityRisk` (reexport)
- `selectInspectionCandidates` (reexport)

### `apps/web/lib/opportunity-engine/learning.ts`

- `buildLearningReport` (function)

### `apps/web/lib/opportunity-engine/lifecycle.ts`

- `assertCreditGrantStateTransition` (function)
- `assertLifecycleTransition` (function)
- `assertMoneyStateTransition` (function)
- `canTransitionCreditGrantState` (function)
- `canTransitionLifecycle` (function)
- `canTransitionMoneyState` (function)
- `isCreditGrantStateTerminal` (function)
- `moneyStateSupportsCreditGrant` (function)

### `apps/web/lib/opportunity-engine/monetization.ts`

- `MONETIZATION_LANES` (const)
- `MonetizationLaneDefinition` (interface)
- `getMonetizationLane` (function)

### `apps/web/lib/opportunity-engine/nova-agent.ts`

- `FounderWorkClassification` (interface)
- `FounderWorkClassificationInput` (interface)
- `classifyFounderWork` (function)

### `apps/web/lib/opportunity-engine/nova-subagents.ts`

- `FOUNDER_SUBAGENT_ROLES` (const)
- `FounderSubagentRole` (interface)
- `findSubagentRole` (function)
- `subagentsForLane` (function)

### `apps/web/lib/opportunity-engine/pipeline.ts`

- `DEFAULT_PORTFOLIO_POLICY` (const)
- `EvidenceAssessor` (type)
- `PortfolioPolicy` (interface)
- `buildOpportunityPortfolio` (function)
- `evaluateOpportunity` (function)

### `apps/web/lib/opportunity-engine/policy.ts`

- `decidePolicy` (function)
- `findHardBlockers` (function)
- `requiredReviewsFor` (function)

### `apps/web/lib/opportunity-engine/scoring.ts`

- `scoreOpportunity` (function)

### `apps/web/lib/opportunity-engine/source-registry.ts`

- `DEFAULT_OPPORTUNITY_SOURCES` (const)
- `enabledOpportunitySources` (function)
- `getOpportunitySource` (function)
- `validateSourceRegistry` (function)

### `apps/web/lib/opportunity-engine/types.ts`

- `ChangeKind` (type)
- `CouncilReviewer` (type)
- `CreditAllocationState` (type)
- `CreditApplicationState` (type)
- `CreditBalanceState` (type)
- `CreditGrantState` (type)
- `CreditProgramState` (type)
- `EconomicRange` (interface)
- `EvidenceAssessment` (interface)
- `EvidenceTier` (type)
- `ExperimentBudget` (interface)
- `LearningBucket` (interface)
- `LearningReport` (interface)
- `MaterialChange` (interface)
- `MoneyState` (type)
- `OpportunityCandidate` (interface)
- `OpportunityClass` (type)
- `OpportunityDecision` (interface)
- `OpportunityDisposition` (type)
- `OpportunityEconomics` (interface)
- `OpportunityEvidence` (interface)
- `OpportunityExperiment` (interface)
- `OpportunityLifecycleState` (type)
- `OpportunityObservation` (interface)
- `OpportunityOutcome` (interface)
- `OpportunityPolicyDecision` (interface)
- `OpportunityPortfolio` (interface)
- `OpportunityRisks` (interface)
- `OpportunityScore` (interface)
- `OpportunitySignals` (interface)
- `OpportunitySource` (interface)
- `PriorityBand` (type)
- `RevenueLane` (type)
- `RightsStatus` (type)
- `SecurityPosture` (type)
- `SourceAuthority` (type)
- `SourceTransport` (type)

### `apps/web/lib/push/http.ts`

- `badRequestResponse` (function)
- `pushDbErrorResponse` (function)
- `unauthorizedResponse` (function)

### `apps/web/lib/push/subscription-db.test.ts`

_no exports_

### `apps/web/lib/push/subscription-db.ts`

- `PushSubscriptionDb` (interface)
- `PushSubscriptionDbResult` (type)
- `StoredPushSubscriptionRow` (interface)
- `deletePushSubscription` (function)
- `isDatabaseUnreachableError` (function)
- `isTableMissingError` (function)
- `listPushSubscriptionsForUser` (function)
- `upsertPushSubscription` (function)

### `apps/web/lib/push/use-push-subscription.ts`

- `PushSubscriptionStatus` (type)
- `UsePushSubscriptionResult` (interface)
- `usePushSubscription` (function)

### `apps/web/lib/push/validation.ts`

- `PushSubscriptionInput` (type)
- `PushSubscriptionInputSchema` (const)
- `PushUnsubscribeInput` (type)
- `PushUnsubscribeInputSchema` (const)
- `ValidationErr` (interface)
- `ValidationOk` (interface)
- `parsePushSubscriptionInput` (function)
- `parsePushUnsubscribeInput` (function)

### `apps/web/lib/settlement-outbox/worker.test.ts`

_no exports_

### `apps/web/lib/settlement-outbox/worker.ts`

- `DELIVERY_BATCH_SIZE` (const)
- `DELIVERY_FETCH_WINDOW` (const)
- `DELIVERY_LEASE_MINUTES` (const)
- `DeliveryRow` (interface)
- `EVENT_PAYLOAD_SCHEMA_VERSION` (const)
- `FrozenEventPayload` (interface)
- `FrozenPickReceipt` (interface)
- `LatencyPercentiles` (interface)
- `MESSAGE_CONTENT_VERSION` (const)
- `MESSAGE_LOCALE` (const)
- `OUTBOX_BATCH_SIZE` (const)
- `OUTBOX_MAX_ATTEMPTS` (const)
- `OUTBOX_MAX_PAYLOAD_AGE_HOURS` (const)
- `OUTBOX_MAX_PAYLOAD_AGE_MS` (const)
- `OutboxDeps` (interface)
- `OutboxDrainSummary` (interface)
- `OutboxEventRow` (interface)
- `OutboxHealth` (interface)
- `SettlementOutboxDb` (interface)
- `TERMINAL_DELIVERY_STATUSES` (const)
- `computeNextAttemptAt` (function)
- `defaultOutboxDeps` (function)
- `drainSettlementOutbox` (function)
- `getSettlementOutboxHealth` (function)
- `latencyPercentiles` (function)
- `selectFairDeliveryBatch` (function)

### `apps/web/lib/stripe.ts`

- `BillingInterval` (reexport)
- `PRICE_DISPLAY` (const)
- `STRIPE_PRICE_IDS` (const)
- `createCheckoutSession` (function)
- `createPortalSession` (function)
- `getOrCreateStripeCustomer` (function)
- `getStripePriceId` (function)
- `retrieveOpenCheckoutSessionUrl` (function)
- `runCheckoutAttemptRepair` (function)
- `stripe` (const)
- `stripeCheckoutSessionLookup` (function)

### `apps/web/lib/watchlist/alert-dispatch.test.ts`

_no exports_

### `apps/web/lib/watchlist/alert-dispatch.ts`

- `WatchlistAlertPayload` (interface)
- `WatchlistAlertRecipient` (interface)
- `WatchlistChannelOutcome` (interface)
- `WatchlistDispatchOutcome` (type)
- `WatchlistDispatchResult` (interface)
- `dispatchWatchlistAlert` (function)
- `isWatchlistAlertsEnabled` (function)

### `apps/web/lib/watchlist/channels/email-channel.test.ts`

_no exports_

### `apps/web/lib/watchlist/channels/email-channel.ts`

- `EmailSendClassification` (type)
- `EmailSendDetail` (type)
- `EmailSendResult` (interface)
- `isEmailConfigured` (function)
- `sendAlertEmail` (function)

### `apps/web/lib/watchlist/channels/web-push-channel.test.ts`

_no exports_

### `apps/web/lib/watchlist/channels/web-push-channel.ts`

- `WebPushAlertPayload` (interface)
- `WebPushSendClassification` (type)
- `WebPushSendDetail` (type)
- `WebPushSendResult` (interface)
- `WebPushSubscriptionInput` (interface)
- `classifyWebPushStatus` (function)
- `isWebPushConfigured` (function)
- `sendWebPushAlert` (function)

### `apps/web/lib/watchlist/settlement-hook.test.ts`

_no exports_

### `apps/web/lib/watchlist/settlement-hook.ts`

- `GradedPickNotifyEvent` (interface)
- `GradedPickTeamRef` (interface)
- `WatchlistNotifyDispatchRecord` (interface)
- `WatchlistNotifySummary` (interface)
- `notifyWatchlistFollowersForGradedPick` (function)

### `packages/db/prisma/seed.ts`

_no exports_

### `packages/db/src/durable-write-guard.ts`

- `DURABLE_WRITE_CAPABILITIES` (const)
- `DurableWriteCapability` (type)
- `DurableWriteDenialReason` (type)
- `DurableWriteStoreEvaluation` (type)
- `DurableWriteStoreEvaluationInput` (interface)
- `DurableWriteStoreUnavailableError` (class)
- `evaluateDurableWriteStore` (function)
- `requireDurableWriteStore` (function)

### `packages/db/src/index.ts`

- `* from @prisma/client` (star-reexport)
- `DURABLE_WRITE_CAPABILITIES` (reexport)
- `DurableWriteCapability` (reexport)
- `DurableWriteDenialReason` (reexport)
- `DurableWriteStoreEvaluation` (reexport)
- `DurableWriteStoreEvaluationInput` (reexport)
- `DurableWriteStoreUnavailableError` (reexport)
- `SAMPLE_PICK_COUNT` (reexport)
- `SamplePick` (reexport)
- `db` (const)
- `evaluateDurableWriteStore` (reexport)
- `getSamplePicks` (reexport)
- `isDemoPicksEnabled` (reexport)
- `isStubDbUrl` (function)
- `isStubMode` (function)
- `requireDurableWriteStore` (reexport)

### `packages/dev-tools/context-compiler/src/benchmark.ts`

_no exports_

### `packages/dev-tools/context-compiler/src/canonical.ts`

- `canonicalStringify` (function)
- `sha256Hex` (function)

### `packages/dev-tools/context-compiler/src/cli.ts`

_no exports_

### `packages/dev-tools/context-compiler/src/compiler.ts`

- `CompileInput` (interface)
- `canonicalStringify` (reexport)
- `compileContextPack` (function)
- `git` (reexport)
- `sha256Hex` (reexport)

### `packages/dev-tools/context-compiler/src/git.ts`

- `LogEntry` (interface)
- `currentBranch` (function)
- `extractPrNumber` (function)
- `filesTouchedBy` (function)
- `git` (function)
- `grepFilesAtSha` (function)
- `isWorkingTreeDirty` (function)
- `logForPath` (function)
- `readBlobAtSha` (function)
- `resolveRemoteUrl` (function)
- `resolveSha` (function)

### `packages/dev-tools/context-compiler/src/symbols.ts`

- `ParsedImport` (interface)
- `ParsedSymbol` (interface)
- `parseSource` (function)

### `packages/dev-tools/context-compiler/src/types.ts`

- `AcceptanceCondition` (interface)
- `CompileReceipt` (interface)
- `ContextPackManifest` (interface)
- `DependencyEdge` (interface)
- `DependencyEdgeKind` (type)
- `ForbiddenAction` (interface)
- `KnownCollision` (interface)
- `PriorDecisionOrFailure` (interface)
- `RelevantPrHead` (interface)
- `RelevantSymbol` (interface)
- `RelevantTest` (interface)
- `RepoHead` (interface)
- `SymbolKind` (type)

### `packages/dev-tools/context-compiler/test/canonical.test.ts`

_no exports_

### `packages/dev-tools/context-compiler/test/compiler.test.ts`

_no exports_

### `packages/dev-tools/context-compiler/test/symbols.test.ts`

_no exports_

### `packages/dev-tools/context-compiler/vitest.config.ts`

- `default` (export-assignment)

### `packages/genesis-kernel/src/__tests__/planner.test.ts`

_no exports_

### `packages/genesis-kernel/src/__tests__/structural.test.ts`

_no exports_

### `packages/genesis-kernel/src/__tests__/twin.test.ts`

_no exports_

### `packages/genesis-kernel/src/canonical-json.ts`

- `canonicalHash` (function)
- `canonicalJson` (function)
- `sha256Hex` (function)

### `packages/genesis-kernel/src/codebase-twin.ts`

- `CodebaseTwinCapabilitySnapshot` (interface)
- `CodebaseTwinSnapshot` (interface)
- `CollisionFinding` (interface)
- `buildCodebaseTwin` (function)

### `packages/genesis-kernel/src/contracts.ts`

- `Assumption` (interface)
- `AudienceClass` (type)
- `CandidatePlan` (interface)
- `CapabilityEconomics` (interface)
- `CapabilityKind` (type)
- `CapabilityPolicy` (interface)
- `CapabilityProvenance` (interface)
- `CapabilityState` (type)
- `ConstraintResult` (interface)
- `EvidencePolicy` (interface)
- `ExecutionProfile` (interface)
- `FixtureCapabilityCandidate` (interface)
- `FixtureCapabilityKind` (type)
- `GenesisCapability` (interface)
- `IntelligenceContract` (interface)
- `NEVER_EXECUTABLE_STATES` (const)
- `OWNER_GATE_STATES` (const)
- `OutputRequirement` (interface)
- `PLANNER_VERSION` (const)
- `PlanDecision` (type)
- `PlanEdge` (interface)
- `PlanEstimate` (interface)
- `PlanNode` (interface)
- `PlanReceipt` (interface)
- `PrivacyDataClass` (type)
- `PrivacyPolicy` (interface)
- `ProofObligation` (type)
- `ProofRequirement` (interface)
- `QUALITY_FLOOR_BY_TIER` (const)
- `RECEIPT_VERSION` (const)
- `RejectedPlan` (interface)
- `ResourceBudget` (interface)
- `RetentionPolicy` (type)
- `STATE_ELIGIBILITY` (const)
- `TemporalCutoff` (interface)
- `TypeRef` (interface)
- `UTILITY_FUNCTION` (const)
- `UncertaintyEffect` (interface)
- `UncertaintyPolicy` (interface)
- `isCapabilityStateEligible` (function)

### `packages/genesis-kernel/src/hard-constraints.ts`

- `TemporalCandidate` (interface)
- `evaluateHardConstraints` (function)
- `failedConstraintNames` (function)
- `isEligible` (function)

### `packages/genesis-kernel/src/index.ts`

- `* from ./contracts` (star-reexport)
- `BuildPlanReceiptInput` (reexport)
- `CodebaseTwinCapabilitySnapshot` (reexport)
- `CodebaseTwinSnapshot` (reexport)
- `CollisionFinding` (reexport)
- `PlanDecisionOutcome` (reexport)
- `REPO_EVIDENCE` (reexport)
- `TemporalCandidate` (reexport)
- `buildCodebaseTwin` (reexport)
- `buildPlanReceipt` (reexport)
- `canonicalHash` (reexport)
- `canonicalJson` (reexport)
- `compileCandidates` (reexport)
- `computeUtility` (reexport)
- `evaluateHardConstraints` (reexport)
- `failedConstraintNames` (reexport)
- `isEligible` (reexport)
- `sha256Hex` (reexport)

### `packages/genesis-kernel/src/plan-cli.ts`

_no exports_

### `packages/genesis-kernel/src/plan-compiler.ts`

- `PlanDecisionOutcome` (type)
- `compileCandidates` (function)
- `computeUtility` (function)

### `packages/genesis-kernel/src/plan-receipt.ts`

- `BuildPlanReceiptInput` (interface)
- `buildPlanReceipt` (function)

### `packages/genesis-kernel/src/repo-evidence.ts`

- `REPO_EVIDENCE` (const)

### `packages/genesis-kernel/src/scan-cli.ts`

_no exports_

### `packages/genesis-kernel/vitest.config.ts`

- `default` (export-assignment)

### `packages/ingestion-pipeline/src/__tests__/settle-sport.test.ts`

_no exports_

### `packages/ingestion-pipeline/src/__tests__/settlement-hardening.test.ts`

_no exports_

### `packages/ingestion-pipeline/src/index.ts`

- `BookOddsRow` (reexport)
- `CorroborationObservation` (reexport)
- `DEFAULT_QUIET_BOARD_HORIZON_HOURS` (reexport)
- `DispersionPickType` (reexport)
- `MIN_CORROBORATION_SEPARATION_MINUTES` (reexport)
- `OWNER_DECISION_KINDS` (reexport)
- `OwnerActorReceipt` (reexport)
- `OwnerDecisionKind` (reexport)
- `OwnerDecisionOutcome` (reexport)
- `POST_SETTLEMENT_WORK_KINDS` (reexport)
- `PostSettlementWorkDelegate` (reexport)
- `PostSettlementWorkKind` (reexport)
- `ProcessSportResult` (reexport)
- `RecordSettlementSnapshotInput` (reexport)
- `RefreshOddsOptions` (reexport)
- `RefreshOddsResult` (reexport)
- `RefreshOddsSportResult` (reexport)
- `ResolvedSettlementRun` (reexport)
- `SCORELESS_COMPLETED_ANOMALY` (reexport)
- `SCORELESS_REVIEW_THRESHOLD` (reexport)
- `SYSTEM_DECISION_KINDS` (reexport)
- `ScorelessEvidenceInput` (reexport)
- `ScorelessEvidenceOutcome` (reexport)
- `SettleSportConfig` (reexport)
- `SettleSportOptions` (reexport)
- `SettleSportResult` (reexport)
- `SettledPickResult` (reexport)
- `SettlementDecisionDb` (reexport)
- `SettlementEvidenceDb` (reexport)
- `SettlementEvidenceTx` (reexport)
- `SettlementRunDb` (reexport)
- `SettlementRunIdentity` (reexport)
- `SettlementSnapshotDb` (reexport)
- `SettlementSnapshotPick` (reexport)
- `SettlementSnapshotWriteStatus` (reexport)
- `SlateFreezeResult` (reexport)
- `SourceSnapshotInput` (reexport)
- `SportConfig` (reexport)
- `UnsupportedSportError` (reexport)
- `bookLineDispersion` (reexport)
- `computeScheduledWindow` (reexport)
- `countCorroboratingRuns` (reexport)
- `enqueuePostSettlementWork` (reexport)
- `fingerprintScorePayload` (reexport)
- `fingerprintSourceSnapshot` (reexport)
- `freezeSlateCommitments` (reexport)
- `getOrCreateSettlementRun` (reexport)
- `isQuietBoard` (reexport)
- `markPostSettlementWorkDone` (reexport)
- `markPostSettlementWorkFailed` (reexport)
- `mintSlatePedersenAggregate` (reexport)
- `notifyOwner` (reexport)
- `ownerAlertsConfigured` (reexport)
- `processSport` (reexport)
- `quietBoardHorizonHours` (reexport)
- `recordOwnerSettlementDecision` (reexport)
- `recordPickSettlementSnapshot` (reexport)
- `recordScorelessCompletedEvidence` (reexport)
- `recordSourceSnapshot` (reexport)
- `refreshOdds` (reexport)
- `settleSport` (reexport)
- `settlementRunIdempotencyKey` (reexport)

### `packages/ingestion-pipeline/src/post-settlement-work.ts`

- `POST_SETTLEMENT_WORK_KINDS` (const)
- `PostSettlementWorkDelegate` (interface)
- `PostSettlementWorkKind` (type)
- `enqueuePostSettlementWork` (function)
- `markPostSettlementWorkDone` (function)
- `markPostSettlementWorkFailed` (function)

### `packages/ingestion-pipeline/src/settle-sport.ts`

- `SCORELESS_COMPLETED_ANOMALY` (reexport)
- `SCORELESS_REVIEW_THRESHOLD` (reexport)
- `SettleSportConfig` (interface)
- `SettleSportOptions` (interface)
- `SettleSportResult` (interface)
- `settleSport` (function)

### `packages/ingestion-pipeline/src/settlement-decisions.ts`

- `OwnerActorReceipt` (interface)
- `OwnerDecisionOutcome` (type)
- `SettlementDecisionDb` (interface)
- `SettlementDecisionTx` (interface)
- `recordOwnerSettlementDecision` (function)

### `packages/ingestion-pipeline/src/settlement-evidence.ts`

- `CorroborationObservation` (interface)
- `MIN_CORROBORATION_SEPARATION_MINUTES` (const)
- `OWNER_DECISION_KINDS` (const)
- `OwnerDecisionKind` (type)
- `SCORELESS_COMPLETED_ANOMALY` (const)
- `SCORELESS_REVIEW_THRESHOLD` (const)
- `SYSTEM_DECISION_KINDS` (const)
- `ScorelessEvidenceInput` (interface)
- `ScorelessEvidenceOutcome` (interface)
- `SettlementDecisionEventCreateData` (interface)
- `SettlementEvidenceDb` (interface)
- `SettlementEvidenceTx` (interface)
- `countCorroboratingRuns` (function)
- `fingerprintScorePayload` (function)
- `recordScorelessCompletedEvidence` (function)

### `packages/ingestion-pipeline/src/settlement-run.ts`

- `ResolvedSettlementRun` (interface)
- `SettlementRunDb` (interface)
- `SettlementRunIdentity` (interface)
- `computeScheduledWindow` (function)
- `fingerprintSourceSnapshot` (function)
- `getOrCreateSettlementRun` (function)
- `settlementRunIdempotencyKey` (function)

### `scripts/ai/fixtures/call-site-inventory/alias-call.ts`

- `runAliasedCall` (const)

### `scripts/ai/fixtures/call-site-inventory/control-plane-call.ts`

- `runGovernedTask` (function)

### `scripts/ai/fixtures/call-site-inventory/dispatch-call.ts`

- `draftJournalEntry` (function)

### `scripts/ai/fixtures/call-site-inventory/dynamic-dispatch.ts`

- `lazyCall` (function)

### `scripts/ai/fixtures/call-site-inventory/error-only.ts`

- `isClaudeError` (function)

### `scripts/ai/fixtures/call-site-inventory/free-lane-call.ts`

- `draftBrief` (function)

### `scripts/ai/fixtures/call-site-inventory/internal-llm-call.ts`

- `normalizeRecord` (function)

### `scripts/ai/fixtures/call-site-inventory/zod-validated.ts`

- `validatedInternalCall` (function)

### `scripts/guardrails/fixtures/actor-minting/clean-consumer.ts`

- `legitimateConsumer` (function)

### `scripts/guardrails/fixtures/actor-minting/violation-aliased-import.ts`

- `sneakySweep` (function)

### `scripts/guardrails/fixtures/actor-minting/violation-dynamic-import.ts`

- `sneakyDynamic` (function)

### `scripts/guardrails/fixtures/actor-minting/violation-export-star.ts`

- `* from @/lib/auth/actor` (star-reexport)

### `scripts/guardrails/fixtures/actor-minting/violation-named-import.ts`

- `sneakyWorker` (function)

### `scripts/guardrails/fixtures/actor-minting/violation-namespace-access.ts`

- `sneakyComputed` (function)
- `sneakyNamespace` (function)

### `scripts/guardrails/fixtures/actor-minting/violation-test-internal.ts`

- `sneakyViaTestInternal` (function)

### `scripts/guardrails/fixtures/ai-transport-boundary/allowed/budget-store-import.ts`

- `x` (const)

### `scripts/guardrails/fixtures/ai-transport-boundary/allowed/comment-mention.ts`

- `note` (const)

### `scripts/guardrails/fixtures/ai-transport-boundary/allowed/default-import-unrelated-messages.ts`

- `t` (const)

### `scripts/guardrails/fixtures/ai-transport-boundary/allowed/dispatch-import.ts`

- `x` (const)

### `scripts/guardrails/fixtures/ai-transport-boundary/allowed/error-class-import.ts`

- `x` (const)

### `scripts/guardrails/fixtures/ai-transport-boundary/allowed/error-class-multiline.ts`

- `R` (type)
- `x` (const)

### `scripts/guardrails/fixtures/ai-transport-boundary/allowed/error-class-reexport.ts`

- `ClaudeMessagesError` (reexport)

### `scripts/guardrails/fixtures/ai-transport-boundary/allowed/namespace-computed-other-access.ts`

- `run` (const)

### `scripts/guardrails/fixtures/ai-transport-boundary/allowed/namespace-dispatch-import.ts`

- `run` (const)

### `scripts/guardrails/fixtures/ai-transport-boundary/allowed/sibling-messages-module.ts`

- `* from ./messages` (star-reexport)
- `all` (const)

### `scripts/guardrails/fixtures/ai-transport-boundary/allowed/type-only-import.ts`

- `T` (type)

### `scripts/guardrails/fixtures/ai-transport-boundary/allowed/type-only-namespace-import.ts`

- `Transport` (type)

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/alias-import.ts`

- `x` (const)

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/barrel-relative-export-star.ts`

- `* from ./messages` (star-reexport)

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/barrel-relative-provider-reexport.ts`

- `callBedrockMessages` (reexport)

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/barrel-relative-transport-dynamic.ts`

- `lazyTransport` (function)

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/default-import-transport.ts`

- `send` (const)

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/dynamic-import.ts`

- `load` (function)

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/endpoint-literal.ts`

- `url` (const)

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/export-star-alias-transport.ts`

- `claudeTransport` (namespace-reexport)

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/export-star-transport.ts`

- `* from @/lib/claude-api/messages` (star-reexport)

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/multiline-import.ts`

- `x` (const)

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/namespace-computed-access.ts`

- `run` (const)

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/namespace-destructure-access.ts`

_no exports_

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/namespace-import-transport.ts`

- `send` (const)

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/namespace-property-access.ts`

- `run` (const)

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/provider-import.ts`

- `x` (const)

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/reexport-star-provider.ts`

- `* from @/lib/claude-api/providers/bedrock` (star-reexport)

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/reexport.ts`

- `callClaudeMessages` (reexport)

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/sdk-aws-import.ts`

- `c` (const)

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/sdk-import.ts`

- `c` (const)

### `scripts/guardrails/fixtures/ai-transport-boundary/violations/static-import.ts`

- `x` (const)

## Prisma (head)

- models: 85
- enums: 61
- changed migration files: 10

## Semantic-domain candidates

- `AiAttemptSummary` (interface) at `apps/web/lib/ai-control-plane/contracts.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiAttemptSummary` (reexport) at `apps/web/lib/ai-control-plane/index.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiAuthorityNarrowing` (interface) at `apps/web/lib/ai-control-plane/contracts.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiAuthorityNarrowing` (reexport) at `apps/web/lib/ai-control-plane/index.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiControlPlaneError` (class) at `apps/web/lib/ai-control-plane/errors.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiControlPlaneError` (reexport) at `apps/web/lib/ai-control-plane/index.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiDispatchFn` (type) at `apps/web/lib/ai-control-plane/executor.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiDispatchFn` (reexport) at `apps/web/lib/ai-control-plane/internal.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiDispatchOutcome` (type) at `apps/web/lib/ai-control-plane/executor.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiDispatchOutcome` (reexport) at `apps/web/lib/ai-control-plane/internal.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiDispatchPlan` (interface) at `apps/web/lib/ai-control-plane/executor.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiDispatchPlan` (reexport) at `apps/web/lib/ai-control-plane/internal.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiEnvClass` (type) at `apps/web/lib/ai-control-plane/cost-mode.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiEnvClass` (reexport) at `apps/web/lib/ai-control-plane/index.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiErrorCode` (type) at `apps/web/lib/ai-control-plane/errors.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiErrorCode` (reexport) at `apps/web/lib/ai-control-plane/index.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiExecutor` (interface) at `apps/web/lib/ai-control-plane/executor.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiExecutor` (reexport) at `apps/web/lib/ai-control-plane/internal.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiInvocationCorrelation` (interface) at `apps/web/lib/ai-control-plane/contracts.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiInvocationCorrelation` (reexport) at `apps/web/lib/ai-control-plane/index.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiPolicySource` (interface) at `apps/web/lib/ai-control-plane/executor.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiPolicySource` (reexport) at `apps/web/lib/ai-control-plane/internal.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiSurface` (type) at `apps/web/lib/ai-control-plane/contracts.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiSurface` (reexport) at `apps/web/lib/ai-control-plane/index.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiTaskInvocationRequest` (interface) at `apps/web/lib/ai-control-plane/contracts.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiTaskInvocationRequest` (reexport) at `apps/web/lib/ai-control-plane/index.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiTaskPolicyDefinition` (interface) at `apps/web/lib/ai-control-plane/contracts.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiTaskPolicyDefinition` (reexport) at `apps/web/lib/ai-control-plane/index.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiTaskResult` (interface) at `apps/web/lib/ai-control-plane/contracts.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `AiTaskResult` (reexport) at `apps/web/lib/ai-control-plane/index.ts` → candidates: CONTROL_PLANE; path domain: CONTROL_PLANE
- `CreditAdmissibilityReason` (type) at `apps/web/lib/opportunity-engine/credit-snapshot.ts` → candidates: NOVA; path domain: NOVA
- `CreditAdmissionDecision` (interface) at `apps/web/lib/ai-control-plane/credit-admission.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditAdmissionDecision` (reexport) at `apps/web/lib/ai-control-plane/internal.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditAdmissionRefusalReason` (type) at `apps/web/lib/ai-control-plane/credit-admission.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditAdmissionRefusalReason` (reexport) at `apps/web/lib/ai-control-plane/internal.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditAdmissionScope` (interface) at `apps/web/lib/ai-control-plane/credit-admission.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditAdmissionScope` (reexport) at `apps/web/lib/ai-control-plane/internal.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditAllocationState` (type) at `apps/web/lib/opportunity-engine/types.ts` → candidates: NOVA; path domain: NOVA
- `CreditApplicationState` (type) at `apps/web/lib/opportunity-engine/types.ts` → candidates: NOVA; path domain: NOVA
- `CreditAuthorizationDecision` (type) at `apps/web/lib/ai-control-plane/credit-admission.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditAuthorizationDecision` (reexport) at `apps/web/lib/ai-control-plane/internal.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditAuthorizationHandle` (interface) at `apps/web/lib/ai-control-plane/credit-admission.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditAuthorizationHandle` (reexport) at `apps/web/lib/ai-control-plane/internal.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditAuthorizationPort` (interface) at `apps/web/lib/ai-control-plane/credit-admission.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditAuthorizationPort` (interface) at `apps/web/lib/ai-control-plane/credit-port.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditAuthorizationPort` (reexport) at `apps/web/lib/ai-control-plane/index.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditAuthorizationRequest` (interface) at `apps/web/lib/ai-control-plane/credit-port.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditAuthorizationRequest` (reexport) at `apps/web/lib/ai-control-plane/index.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditAuthorizationState` (type) at `apps/web/lib/ai-control-plane/credit-admission.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditAuthorizationState` (reexport) at `apps/web/lib/ai-control-plane/internal.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditBalanceState` (type) at `apps/web/lib/opportunity-engine/types.ts` → candidates: NOVA; path domain: NOVA
- `CreditCashOverageBehavior` (type) at `apps/web/lib/opportunity-engine/credit-snapshot.ts` → candidates: NOVA; path domain: NOVA
- `CreditGrantSnapshot` (reexport) at `apps/web/lib/ai-control-plane/credit-admission.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditGrantSnapshot` (interface) at `apps/web/lib/opportunity-engine/credit-snapshot.ts` → candidates: NOVA; path domain: NOVA
- `CreditGrantState` (type) at `apps/web/lib/opportunity-engine/types.ts` → candidates: NOVA; path domain: NOVA
- `CreditLedgerDb` (interface) at `apps/web/lib/ai-control-plane/credit-admission.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditLedgerDb` (reexport) at `apps/web/lib/ai-control-plane/internal.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditProgramState` (type) at `apps/web/lib/opportunity-engine/types.ts` → candidates: NOVA; path domain: NOVA
- `CreditReservation` (interface) at `apps/web/lib/ai-control-plane/credit-port.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditReservation` (reexport) at `apps/web/lib/ai-control-plane/index.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditScopeRequest` (reexport) at `apps/web/lib/ai-control-plane/credit-admission.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditScopeRequest` (interface) at `apps/web/lib/opportunity-engine/credit-snapshot.ts` → candidates: NOVA; path domain: NOVA
- `CreditSnapshotAdmissibility` (interface) at `apps/web/lib/opportunity-engine/credit-snapshot.ts` → candidates: NOVA; path domain: NOVA
- `CreditSnapshotReconciliationState` (type) at `apps/web/lib/opportunity-engine/credit-snapshot.ts` → candidates: NOVA; path domain: NOVA
- `CreditSnapshotStore` (interface) at `apps/web/lib/ai-control-plane/credit-admission.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditSnapshotStore` (reexport) at `apps/web/lib/ai-control-plane/internal.ts` → candidates: NOVA; path domain: CONTROL_PLANE
- `CreditSnapshotValidationResult` (interface) at `apps/web/lib/opportunity-engine/credit-snapshot.ts` → candidates: NOVA; path domain: NOVA
- `CreditSnapshotViolation` (type) at `apps/web/lib/opportunity-engine/credit-snapshot.ts` → candidates: NOVA; path domain: NOVA
- `FounderDailyBrief` (interface) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: NOVA; path domain: NOVA
- `FounderDailyBriefInput` (interface) at `apps/web/lib/opportunity-engine/founder-work-seed.ts` → candidates: NOVA; path domain: NOVA
- `FounderLaneSummary` (interface) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: NOVA; path domain: NOVA
- `FounderOperatingPolicy` (interface) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: NOVA; path domain: NOVA
- `FounderQueueActorReceipt` (interface) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: NOVA; path domain: NOVA
- `FounderQueueDecision` (interface) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: NOVA; path domain: NOVA
- `FounderQueueDecisionKind` (type) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: NOVA; path domain: NOVA
- `FounderSubagentRole` (interface) at `apps/web/lib/opportunity-engine/nova-subagents.ts` → candidates: NOVA; path domain: NOVA
- `FounderWorkAuthority` (type) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: NOVA; path domain: NOVA
- `FounderWorkClassification` (interface) at `apps/web/lib/opportunity-engine/nova-agent.ts` → candidates: NOVA; path domain: NOVA
- `FounderWorkClassificationInput` (interface) at `apps/web/lib/opportunity-engine/nova-agent.ts` → candidates: NOVA; path domain: NOVA
- `FounderWorkItem` (interface) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: NOVA; path domain: NOVA
- `FounderWorkLane` (type) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: NOVA; path domain: NOVA
- `FounderWorkState` (type) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: NOVA; path domain: NOVA
- `NovaFounderOsSummary` (interface) at `apps/web/lib/nova/founder-os-dashboard.ts` → candidates: NOVA; path domain: UNOWNED_PATH
- `NovaFounderOsSummaryOptions` (interface) at `apps/web/lib/nova/founder-os-dashboard.ts` → candidates: NOVA; path domain: UNOWNED_PATH
- `OpportunitySource` (interface) at `apps/web/lib/opportunity-engine/types.ts` → candidates: NOVA; path domain: NOVA
- `OutboxDeps` (interface) at `apps/web/lib/settlement-outbox/worker.ts` → candidates: SHARED_INFRA; path domain: UNOWNED_PATH
- `OutboxDrainSummary` (interface) at `apps/web/lib/settlement-outbox/worker.ts` → candidates: SHARED_INFRA; path domain: UNOWNED_PATH
- `OutboxEventRow` (interface) at `apps/web/lib/settlement-outbox/worker.ts` → candidates: SHARED_INFRA; path domain: UNOWNED_PATH
- `OutboxHealth` (interface) at `apps/web/lib/settlement-outbox/worker.ts` → candidates: SHARED_INFRA; path domain: UNOWNED_PATH
- `SettlementAnomalyReadModel` (interface) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: SETTLEMENT; path domain: NOVA
- `SettlementAnomalyState` (type) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: SETTLEMENT; path domain: NOVA
- `SettlementDecisionDb` (reexport) at `packages/ingestion-pipeline/src/index.ts` → candidates: SETTLEMENT; path domain: UNOWNED_PATH
- `SettlementDecisionDb` (interface) at `packages/ingestion-pipeline/src/settlement-decisions.ts` → candidates: SETTLEMENT; path domain: UNOWNED_PATH
- `SettlementDecisionEventCreateData` (interface) at `packages/ingestion-pipeline/src/settlement-evidence.ts` → candidates: SETTLEMENT; path domain: UNOWNED_PATH
- `SettlementDecisionTx` (interface) at `packages/ingestion-pipeline/src/settlement-decisions.ts` → candidates: SETTLEMENT; path domain: UNOWNED_PATH
- `SettlementEvidenceDb` (reexport) at `packages/ingestion-pipeline/src/index.ts` → candidates: SETTLEMENT; path domain: UNOWNED_PATH
- `SettlementEvidenceDb` (interface) at `packages/ingestion-pipeline/src/settlement-evidence.ts` → candidates: SETTLEMENT; path domain: UNOWNED_PATH
- `SettlementEvidenceTx` (reexport) at `packages/ingestion-pipeline/src/index.ts` → candidates: SETTLEMENT; path domain: UNOWNED_PATH
- `SettlementEvidenceTx` (interface) at `packages/ingestion-pipeline/src/settlement-evidence.ts` → candidates: SETTLEMENT; path domain: UNOWNED_PATH
- `SettlementOutboxDb` (interface) at `apps/web/lib/settlement-outbox/worker.ts` → candidates: SETTLEMENT; path domain: UNOWNED_PATH
- `SettlementOwnerDecisionKind` (type) at `apps/web/lib/opportunity-engine/founder-command.ts` → candidates: SETTLEMENT; path domain: NOVA
- `SettlementRunDb` (reexport) at `packages/ingestion-pipeline/src/index.ts` → candidates: SETTLEMENT; path domain: UNOWNED_PATH
- `SettlementRunDb` (interface) at `packages/ingestion-pipeline/src/settlement-run.ts` → candidates: SETTLEMENT; path domain: UNOWNED_PATH
- `SettlementRunIdentity` (reexport) at `packages/ingestion-pipeline/src/index.ts` → candidates: SETTLEMENT; path domain: UNOWNED_PATH
- `SettlementRunIdentity` (interface) at `packages/ingestion-pipeline/src/settlement-run.ts` → candidates: SETTLEMENT; path domain: UNOWNED_PATH
- `SettlementSnapshotDb` (reexport) at `packages/ingestion-pipeline/src/index.ts` → candidates: SETTLEMENT; path domain: UNOWNED_PATH
- `SettlementSnapshotPick` (reexport) at `packages/ingestion-pipeline/src/index.ts` → candidates: SETTLEMENT; path domain: UNOWNED_PATH
- `SettlementSnapshotWriteStatus` (reexport) at `packages/ingestion-pipeline/src/index.ts` → candidates: SETTLEMENT; path domain: UNOWNED_PATH
- `TrustedActor` (type) at `apps/web/lib/auth/actor.ts` → candidates: SHARED_INFRA; path domain: UNOWNED_PATH

## Unparsed files

None — scan complete.
