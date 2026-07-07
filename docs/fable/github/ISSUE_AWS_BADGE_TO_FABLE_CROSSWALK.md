# Issue: Maintain AWS Badge To FABLE Crosswalk

## Context

Each AWS learning area should map to a GSE/FABLE improvement: better service fit, cost/security gates, partner language, local mock plans, or evidence discipline.

## Why It Matters

The crosswalk keeps learning tied to product architecture and prevents ungrounded AWS claims.

## Acceptance Criteria

- crosswalk includes AWS Educate S3, EC2, VPC, RDS, Cloud Operations/Cost, Cloud Practitioner, IAM/security, Amplify, Bedrock/AgentCore, SageMaker, Clean Rooms, and re/Start.
- each row includes learning output, system affected, repo path, improvement, risk reduced, no-cost artifact, and owner decision.
- no row claims completion unless public proof is owner-approved.

## Files Touched

- `docs/personal/aws/AWS_TO_GSE_CROSSWALK.md`
- `docs/personal/aws/AWS_LEARNING_TO_REPO_ACTIONS.md`
- `docs/fable/aws/AWS_PLUGIN_TO_REPO_CROSSWALK.md`

## Test/Docs Validation

- `npm run fable:evidence`
- `npm run fable:claims`
- `git diff --check`

## Risks

- learning list becomes stale.
- no-cost artifacts are not built after learning.
- public proof is added without redaction.

## Owner Decisions

- choose which learning proofs become public.
- approve any future AWS account discovery separately.
