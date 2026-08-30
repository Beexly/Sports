# AWS Plugin Governed Audit

Updated: 2026-07-03

This audit applies the upgraded local AWS plugin reasoning to the FABLE/GSE repo. It does not import plugin internals into the product and it does not create AWS resources.

## Evidence Classification

- Observed in current turn:
  - repo path is `C:\Users\Garrett\Sports`
  - branch is `codex/fable-nfl-evidence-integration`
  - remote is `https://github.com/BeeXly/Sports.git`
  - GitHub CLI is unauthenticated
  - AWS decision engine tests pass locally
- Inferred from repo files:
  - AWS work is docs, gates, skeletons, and local decision logic only
  - source rights are governed through the existing source-rights registry
  - prior FABLE evidence layers remain present
- Unknown:
  - AWS account identity
  - AWS spend/budgets
  - AWS IAM posture
  - live AWS resource inventory
- Blocked:
  - live PR/issue creation through GitHub CLI
  - any live AWS readiness claim
- Requires owner approval:
  - AWS deploys
  - paid AWS resources or model calls
  - source storage in AWS
  - partner data sharing
  - DNS or production traffic

## Action Tier Result

Current changes are Tier 0 and Tier 1 only:

- Tier 0: docs, scorecards, crosswalks, reports, templates.
- Tier 1: local TypeScript decision-engine tests and local evidence harness.

No Tier 2 read-only AWS discovery was run. No Tier 3-5 action was attempted.

## Cost / IAM / Deployment / Data Posture

- Cost: paid use remains blocked by `FABLE_AWS_ALLOW_PAID_RESOURCES=false` and decision-engine defaults.
- IAM: no AWS policies were created; wildcard/admin/PassRole/public-resource signals are modeled as high or critical risk.
- Deployment: deploy is blocked by default; non-local AWS action requires dry-run/plan/synth/diff evidence and rollback fields.
- Data rights: AWS storage or partner sharing blocks when data rights are unknown.

## Repo Fixes Applied

- Added `apps/web/lib/fable/aws-decision-engine.ts`.
- Added `apps/web/lib/fable/aws-decision-engine.test.ts`.
- Added decision-engine schema coverage to the evidence harness.
- Added inert FABLE/AWS env flags to `.env.example`.
- Added this governed audit and the plugin crosswalk.

## Remaining Gaps

- No live AWS account was inspected.
- No IAM policy scanner exists because there is no active IaC policy file to scan.
- No budget/alarm resource exists.
- No deployment framework is active beyond the zero-cost Amplify skeleton.
- No partner Clean Rooms contract exists.
