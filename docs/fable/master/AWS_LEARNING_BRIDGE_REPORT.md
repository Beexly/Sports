# AWS Learning Bridge Report

Updated: 2026-07-03

## Scope

Repo-only learning bridge for `C:\Users\Garrett\Sports`.

No browser personal accounts, AWS credentials, deploys, or paid resources were used.

## Files Created

- `docs/personal/aws/README.md`
- `docs/personal/aws/AWS_PERSONAL_PROGRESS_TEMPLATE.md`
- `docs/personal/aws/AWS_BADGE_EVIDENCE_TEMPLATE.md`
- `docs/personal/aws/AWS_TO_GSE_CROSSWALK.md`
- `docs/personal/aws/AWS_PORTFOLIO_CASE_STUDY.md`
- `docs/personal/aws/AWS_LEARNING_TO_REPO_ACTIONS.md`
- `docs/personal/aws/AWS_RESTART_APPLICATION_BOUNDARY.md`
- `docs/personal/aws/personal-learning-evidence.example.json`
- `docs/fable/aws/AWS_OPERATING_INTELLIGENCE_MATRIX.md`
- `docs/fable/aws/AWS_NO_COST_WORKFLOW_BLUEPRINTS.md`
- `docs/fable/aws/AWS_AGENT_LAB_PLAYBOOK.md`
- `docs/fable/aws/AWS_METRICS_AND_MATRICES.md`
- `docs/fable/aws/AWS_FREE_LEARNING_OPERATING_SYSTEM.md`
- `docs/fable/aws/AWS_INCUMBENT_PRESSURE_SYSTEM.md`
- `docs/fable/aws/AWS_MICRO_EDGE_FACTORY.md`
- `docs/fable/aws/AWS_LOCAL_DATA_FACTORY.md`
- `docs/fable/aws/AWS_LOCAL_APP_BLUEPRINTS.md`
- `docs/fable/aws/AWS_MACHINE_LADDER.md`
- `docs/fable/aws/AWS_TECHNIQUE_LEDGER.md`
- `docs/fable/aws/AWS_OPERATING_INTELLIGENCE_RUNBOOK.md`
- `docs/fable/github/ISSUE_AWS_PERSONAL_LEARNING_BRIDGE.md`
- `docs/fable/github/ISSUE_AWS_PORTFOLIO_CASE_STUDY.md`
- `docs/fable/github/ISSUE_AWS_BADGE_TO_FABLE_CROSSWALK.md`
- `schemas/fable/personal-learning-evidence.schema.json`

## Files Modified

- `apps/web/lib/fable/evidence/schemas.ts`
- `apps/web/lib/fable/evidence/validators.ts`
- `apps/web/lib/fable/evidence/evidence-harness.test.ts`
- `scripts/fable-evidence.ts`
- `scripts/fable-aws-operating-intelligence.ts`
- `package.json`
- `docs/fable/aws/README.md`
- `docs/fable/aws/AWS_SERVICE_SCORECARD.md`
- `docs/fable/aws/AWS_COST_SECURITY_GATES.md`
- `docs/fable/aws/AWS_AMPLIFY_INVESTIGATION.md`
- `docs/fable/aws/AWS_BEDROCK_AGENTCORE_PLAN.md`
- `docs/fable/aws/AWS_SAGEMAKER_MLOPS_PLAN.md`
- `docs/fable/aws/AWS_CLEAN_ROOMS_PARTNERSHIP_PLAN.md`
- `docs/fable/aws/AWS_SHOW_TEETH_STRATEGY.md`
- `docs/fable/aws/AWS_PLUGIN_TO_REPO_CROSSWALK.md`
- `docs/fable/aws/AWS_FINAL_REPORT.md`
- `docs/fable/evidence/EVIDENCE_INDEX.md`
- `docs/fable/INDEX.md`
- `docs/fable/README.md`
- `docs/fable/github/PR_BODY_FABLE_EVIDENCE.md`
- `docs/fable/github/GITHUB_ISSUE_CREATION_COMMANDS.md`

## Safety

- Personal data included: no.
- Secrets included: no.
- AWS live account touched: no.
- Paid resources used: no.
- Browser personal accounts used: no.
- Deploy performed: no.

## Evidence Schema

Added `personal_learning_evidence` validation with fields for provider, course/badge, completion status, completion date, proof type, proof link/path, public safety, GSE relevance, repo action, no-secret confirmation, no-paid-resource confirmation, and owner approval.

Unsafe public proof links without owner approval are rejected by the validator.

## Tests And Guards

Already run:
- `npm run fable:evidence`: passed.
- `npm run fable:claims`: passed.
- `npm run fable:learning`: passed.
- `npm run fable:aws-intel`: passed; emitted `docs_required: 17`, `docs_present: 17`, `live_aws_action: false`, `paid_resource_used: false`, and 3 learning evidence entries.
- `npm run fable:sources`: passed.
- `npm run fable:aws-gates`: passed.
- `npm run test --workspace=apps/web -- lib/fable/evidence/evidence-harness.test.ts`: passed, 1 file / 6 tests.
- `npm run typecheck --workspaces --if-present`: passed.
- `npm run guard:secrets`: passed, scanned 3089 tracked files.
- `npm run guard:trust`: passed.
- `git diff --check`: passed with line-ending warnings in unrelated pre-existing app test files.

## Failures

None from learning evidence, FABLE claims, FABLE sources, AWS gates, targeted evidence-harness tests, full workspace typecheck, secret guard, trust guard, or whitespace check.

## Owner Decisions

- approve which AWS badge or course proofs can become public.
- approve screenshots before they are committed.
- approve any future live AWS discovery.
- approve any paid AWS path separately.
- approve any external portfolio or LinkedIn wording.

## Next Computer-Use Actions

- collect badge screenshots or links only outside the repo.
- redact personal data.
- confirm exact public proof owner approval.
- paste approved proof paths or links into a private staging note before commit.

## Next Coding-Agent Actions

- add real approved learning evidence entries.
- build local S3 storage-policy mock.
- build local fake IAM policy review cases.
- build SageMaker model-card fixture.
- build Bedrock/AgentCore fake-agent refusal cases.
- expand Clean Rooms synthetic scenario library.
