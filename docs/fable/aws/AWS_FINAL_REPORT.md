# AWS Final Report

Updated: 2026-07-03

Implemented:
- AWS repo reality map and service scorecard.
- Cost/security gate module and AWS decision-engine integration.
- Zero-cost Amplify skeleton.
- GitHub-ready AWS issue bodies.
- AWS plugin-to-repo crosswalk and governed audit.
- AWS show-teeth strategy for lawful, falsifiable leverage.
- AWS model leverage map, model router design, model evaluation plan, AgentCore firebreak, tool permission matrix, evaluation rubrics, SageMaker/Amplify ADRs, and synthetic Clean Rooms partner demo docs.
- Personal AWS learning bridge under `docs/personal/aws/`, with public-safe proof templates, badge-to-GSE crosswalk, portfolio case study, learning-to-repo actions, and schema-backed evidence boundaries.
- Public `/fable` app route that exposes AWS deploy/paid-resource gate status from local evidence only; it does not call AWS APIs.
- No-cost AWS fixture library under `docs/fable/aws/fixtures/`, with S3, IAM, SageMaker, Bedrock/AgentCore, and Clean Rooms scenarios.
- AWS local fixture validator in `apps/web/lib/fable/aws-local-fixtures.ts`, plus schema and Vitest coverage.
- Shadow Control Tower governance OS under `docs/fable/aws/governance-os/`, validated by `apps/web/lib/fable/aws-governance-os.ts`.
- CDK-style synth fixture under `infrastructure/aws/cdk/`; no CDK dependency, bootstrap, synth command, account, or deploy is included.
- Service scorecard expansion explaining decision meanings, Well-Architected pillar checks, and success metrics.

Service decisions:
- Amplify: preview-only spike later; no migration or deploy.
- Bedrock/AgentCore: design/firebreak only; no paid model calls.
- SageMaker: Level 0/1 local-first posture until artifacts, rights, budget, and owner approval exist.
- Clean Rooms: synthetic partner demo only; no partnership or live collaboration claimed.
- IAM/security: default deny for write, wildcard, production, destructive, and cross-account actions.

Verification log:
- `npm run fable:evidence`
  - Passed: aggregate evidence harness returned `[fable-evidence] OK - all`.
- `npm run fable:aws-gates`
  - Passed: AWS gate validation returned `[fable-evidence] OK - aws-gates`.
- `npm run fable:aws-fixtures`
  - Passed: local AWS fixture library returned `[fable-evidence] OK - aws-fixtures`.
- `npm run fable:aws-governance`
  - Passed: Shadow Control Tower governance OS returned `[fable-evidence] OK - aws-governance`.
- `npm run fable:aws-intel`
  - Passed: emitted `docs_required: 19`, `docs_present: 19`, `live_aws_action: false`, `paid_resource_used: false`, `fixture_library.fixtures: 5`, `well_architected_pillars_covered: 6`, `shadow_guardrails: 6`, and `well_architected_lens_checks: 6`.
- `npm run test --workspace=apps/web -- lib/fable/source-registry.test.ts lib/fable/uncertainty.test.ts lib/fable/labeling.test.ts lib/fable/drift.test.ts lib/fable/aws-gates.test.ts lib/fable/aws-decision-engine.test.ts lib/fable/claim-scanner.test.ts lib/fable/docs-claims.test.ts lib/fable/evidence/evidence-harness.test.ts`
  - Passed: 9 files / 33 tests.
- `npm run test --workspace=apps/web -- lib/fable/public-summary.test.ts lib/fable/evidence/evidence-harness.test.ts __tests__/next-config-policy.test.ts __tests__/public-copy-scan-strong.test.ts`
  - Passed: 4 files / 27 tests.
- `npm run test --workspace=apps/web -- lib/fable/aws-local-fixtures.test.ts lib/fable/aws-governance-os.test.ts lib/fable/evidence/evidence-harness.test.ts`
  - Passed: 3 files / 10 tests.
- `npm run typecheck --workspaces --if-present`
  - Passed after the ES2020 target update described in `docs/fable/master/TYPECHECK_DECISION.md`; re-run after adding the `/fable` route also completed successfully.
- `npm run guard:secrets`
  - Passed after staging: scanned 3063 tracked files; no secrets detected.
- `npm run guard:trust`
  - Passed: scanned 1103 files; no banned phrases.
- `git diff --check`
  - Passed: no whitespace errors.
- `actionlint .github/workflows/fable-evidence.yml`
  - Not run because `actionlint` is unavailable on this host. Workflow YAML was manually inspected.
- `gh auth status`
  - Failed because GitHub CLI is unauthenticated.

Caveats:
- No AWS account was used.
- No live AWS resources were created, updated, or deleted.
- No AWS secrets were added.
- No paid AWS dependencies or services were used.
- Official AWS docs were used only for research/design notes and are linked in `docs/fable/aws/README.md`.

## Personal AWS Learning Feed

The personal learning feed improves AWS judgment in the repo without importing private learning records.

What it improves:
- better service-fit decisions.
- safer IAM and cost gates.
- stronger AWS vocabulary for partners.
- better no-cost spike design.
- more credible portfolio narrative.
- clearer separation between learning, code, and live cloud.

What it does not prove:
- AWS account access.
- badge completion unless owner-approved proof exists.
- live AWS readiness.
- deployed infrastructure.
- paid-resource approval.
