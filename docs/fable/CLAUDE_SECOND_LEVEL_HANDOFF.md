# Claude Second-Level Handoff

Branch:
- `codex/fable-nfl-evidence-integration`

Changed areas:
- `apps/web/lib/fable/evidence/*`
- `scripts/fable-*.ts`
- `docs/fable/evidence/*`
- `docs/fable/demo/*`
- `docs/fable/edge-lab/*`
- `docs/fable/competitive/*`
- `docs/fable/aws/*`
- `docs/fable/red-team/*`
- `docs/fable/validation/*`
- `docs/fable/github/*`
- `schemas/fable/*`
- `.github/workflows/fable-evidence.yml`
- `package.json`

Tests to run:
- `npm run fable:evidence`
- `npm run fable:demo`
- `npm run test --workspace=apps/web -- lib/fable/evidence/evidence-harness.test.ts lib/fable/docs-claims.test.ts lib/fable/aws-gates.test.ts`
- `npm run guard:secrets`
- `npm run guard:trust`

Known failure:
- Workspace typecheck previously failed because `apps/web` targets below ES2020 while importing BigInt-literal prediction-engine files.

Unsupported claims:
- See `docs/fable/evidence/UNSUPPORTED_CLAIMS.md`.

Evidence ledger:
- `docs/fable/evidence/CLAIM_EVIDENCE_LEDGER.json`

AWS model leverage:
- Docs only. No model calls.

Amplify decision:
- Docs-only spike; no migration.

SageMaker ADR status:
- local-first; cloud ML requires owner approval.

AgentCore firebreak:
- default deny.

Clean Rooms demo:
- synthetic only.

Edge lab:
- backlog seeded, not validated.

Red-team status:
- initial hostile review documented.

Do not trust yet:
- model gain
- broad legal clearance
- live AWS setup
- paid labeling
- public demo freshness
