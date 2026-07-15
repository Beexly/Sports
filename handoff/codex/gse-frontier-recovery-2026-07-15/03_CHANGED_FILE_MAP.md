# Changed File Map

The recovery branch differs from `origin/main` across 259 files. Use this exact command for the complete machine-readable list:

```powershell
git diff --name-status origin/main...HEAD
```

## Canonical intelligence spine

- `apps/web/lib/intelligence-playback/types.ts`: canonical evidence, decision, market, capture, and lifecycle contracts.
- `canonical-json.ts`, `build-envelope.ts`: deterministic ordering, validation, publication eligibility, and digest.
- `project.ts`, `event-projection.ts`: PUBLIC/PAID/COCKPIT redaction policy.
- `events.ts`: canonical lifecycle construction.
- `epistemic-deltas.ts`: deterministic observed-change ledger and cited decision certificate.
- `consumer-projections.ts`: Twin, Brain, autopsy, and draft-only Studio projections.
- `room-types.ts`, `room-evidence.ts`, `room-adapter.ts`: stored-record boundary and no-guess adaptation.

## Game Room vertical slice

- `apps/web/lib/game-room/evidence-record.ts`: one bounded Prisma result -> evidence record, without raw source payloads.
- `load.ts`, `types.ts`, `presenters.ts`: server-entitled room projection and fail-closed playback loading.
- `apps/web/app/room/[gameId]/page.tsx`: real route integration and honest unavailable panel.
- `apps/web/components/game-room/intelligence-playback.tsx`: DOM-first controls, delta, certificate, evidence, transcript, and table.
- `room-primitives.tsx`: extracted shared room components.

## Proof and regression tests

- `pick-evidence-envelope.test.ts`: 12 envelope/digest/publication tests.
- `game-room-evidence-adapter.test.ts`: 5 persisted-record adaptation tests.
- `game-room-paywall.test.ts`: 7 server-boundary entitlement tests.
- `game-room-route.test.ts`: 6 route-shape tests.
- `intelligence-playback-ui.test.tsx`: 2 interaction/accessibility tests.
- `epistemic-delta-ledger.test.ts`: 6 deterministic delta/certificate tests.
- `playback-consumers.test.ts`: 6 consumer safety tests.
- `scripts/qa/intelligence-playback-browser.mjs`: Playwright, axe-core, keyboard, reduced-motion, zoom, overflow, and visual proof.

## Recovery foundations

- `packages/db/**`: production stub fail-closed.
- `packages/data-ingestion/**`, `packages/ingestion-pipeline/**`, `packages/prediction-engine/**`, `packages/types/**`: market units, settlement, CLV, proof, team identity, stale gating, and replay integrity.
- `apps/web/lib/data-reliability/**`, public APIs/pages: honest stale/outage behavior.
- `apps/web/lib/cockpit/require-admin.ts`, `apps/web/app/cockpit/**`: page-boundary ADMIN enforcement.
- `.github/workflows/ci.yml`, `scripts/guardrails/**`, `scripts/vercel-skip-build*`: standing anti-bypass controls.
- `apps/web/lib/fantasy/public-gate.ts`, middleware, fantasy hub/explainer: no public illustrative projections.

## Documentation and evidence

- `reports/agent-handoffs/FRONTIER_RECOVERY_LEDGER.md`
- `reports/agent-handoffs/FRONTIER_RECOVERY_REALITY_MAP.md`
- `docs/architecture/INTELLIGENCE_DECISION_PERSISTENCE_PROPOSAL.md`
- `reports/visual/frontier-recovery/intelligence-playback-renderer-qa-{desktop,mobile}.png`

Protected production migrations, secrets, billing/auth/legal behavior, canonical URLs, and webhooks were not changed by the playback slice.
