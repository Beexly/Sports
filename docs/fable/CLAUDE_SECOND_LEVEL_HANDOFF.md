# Claude Second-Level Handoff

Branch:
- `codex/fable-nfl-evidence-integration`

Status:
- Extended by `docs/fable/CODEX_THIRD_PASS_REPORT.md`.
- Master handoff is now `docs/fable/master/MASTER_FINAL_REPORT.md`.
- The previous workspace typecheck failure is resolved; see `docs/fable/master/TYPECHECK_DECISION.md`.

Changed areas:
- `apps/web/lib/fable/evidence/*`
- `apps/web/lib/fable/aws-decision-engine.ts`
- `apps/web/lib/fable/aws-decision-engine.test.ts`
- `scripts/fable-*.ts`
- `docs/fable/evidence/*`
- `docs/fable/demo/*`
- `docs/fable/edge-lab/*`
- `docs/fable/competitive/*`
- `docs/fable/aws/*`
- `docs/fable/red-team/*`
- `docs/fable/validation/*`
- `docs/fable/github/*`
- `docs/fable/master/*`
- `schemas/fable/*`
- `.github/workflows/fable-evidence.yml`
- `package.json`

Tests to run:
- `npm run fable:evidence`
- `npm run fable:demo`
- `npm run fable:aws-gates`
- `npm run test --workspace=apps/web -- lib/fable/evidence/evidence-harness.test.ts lib/fable/docs-claims.test.ts lib/fable/aws-gates.test.ts lib/fable/aws-decision-engine.test.ts`
- `npm run typecheck --workspaces --if-present`
- `npm run guard:secrets`
- `npm run guard:trust`

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
- broad legal approval
- live AWS setup
- paid labeling
- public demo freshness
