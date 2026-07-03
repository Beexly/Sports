# Codex Second-Level Report

Updated: 2026-07-03.

Branch:
- `codex/fable-nfl-evidence-integration`

Commit hash:
- recorded in the final Codex response after commit creation.

Added beyond original plan:
- claim-to-evidence ledger
- executable evidence harness
- fixture-only public-data forensic demo
- edge lab
- incumbent pressure test
- AWS model leverage map
- AgentCore firebreak
- SageMaker and Amplify ADRs
- Clean Rooms synthetic partner schema
- red-team review
- schema contracts
- no-cost CI workflow
- GitHub PR/issue package

Commands run:
- `npm run fable:evidence`
- `npm run fable:claims`
- `npm run fable:sources`
- `npm run fable:aws-gates`
- `npm run fable:demo`
- `npm run test --workspace=apps/web -- lib/fable/evidence/evidence-harness.test.ts lib/fable/docs-claims.test.ts lib/fable/aws-gates.test.ts lib/fable/claim-scanner.test.ts`
- `npm run test --workspace=packages/prediction-engine`
- `npm run test --workspace=packages/data-ingestion`
- `npm run typecheck --workspaces --if-present`
- `npm run guard:trust`
- `npm run guard:secrets`
- `git diff --check`
- `gh auth status`

Tests passed:
- `npm run fable:evidence`: passed.
- `npm run fable:claims`: passed.
- `npm run fable:sources`: passed.
- `npm run fable:aws-gates`: passed.
- `npm run fable:demo`: passed.
- targeted FABLE web tests: 4 files / 11 tests passed.
- prediction-engine tests: 71 files / 738 tests passed.
- data-ingestion tests: 16 files / 131 tests passed.
- `npm run guard:trust`: passed after scanner detection literals were encoded.
- `npm run guard:secrets`: passed after staging; scanned 3051 tracked files and found no secrets.
- `git diff --check`: passed.

Tests failed:
- `npm run typecheck --workspaces --if-present` still fails in `@sports/web` because imported `packages/prediction-engine/src/pedersen-ledger.ts` and `packages/prediction-engine/src/simhash.ts` use BigInt literals while the web TypeScript target is below ES2020.
- `gh auth status` fails because GitHub CLI is unauthenticated; live issue/PR creation is blocked.

Unsupported claims found:
- see `docs/fable/evidence/UNSUPPORTED_CLAIMS.md`.

High-risk claims downgraded:
- see `docs/fable/evidence/CLAIM_EVIDENCE_LEDGER.json`.

AWS services worth spiking:
- Amplify preview hosting
- Bedrock/AgentCore for governed agents
- SageMaker Model Registry/Model Cards after artifacts exist
- Clean Rooms with a real partner and contract

AWS services rejected for now:
- hosted inference
- backend migration through Amplify
- live Clean Rooms collaboration
- paid model calls

Top 10 edge candidates:
- source freshness decay
- injury-report timing delta
- roster transaction shock
- schedule rest asymmetry
- depth chart instability
- model disagreement entropy
- calibration degradation after roster shock
- source contradiction detection
- role elasticity after transaction shock
- market-open forensic report

Top 10 blockers:
- broad workspace typecheck failure
- no measured model gain
- no legal review marker
- no AWS account approval
- no paid-resource approval
- no Bedrock account access proof
- no Clean Rooms partner
- no live public-data demo
- no MC Dropout runtime approval
- no full OneNote claim extractor

What is visible on GitHub:
- root README FABLE link
- `docs/fable/INDEX.md`
- evidence ledger and validators
- forensic demo
- edge lab
- AWS maps and ADRs
- red-team review
- GitHub issue package

Claude must verify:
- commit hash
- ledger coverage
- docs scanner results
- workflow syntax
- whether GitHub auth exists before issue creation

Owner decisions needed:
- AWS account use
- paid resources
- model runtime
- legal-review marker process
- public demo data source
