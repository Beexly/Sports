# PR: FABLE evidence and AWS guardrails

## Context
Adds the additive claim-verification, evidence harness, forensic demo, AWS model map, edge lab, red-team review, schemas, local/CI guard surface, AWS plugin-governed crosswalk, AWS decision engine, service-fit matrix, and master final reports.

Adds a repo-safe personal AWS learning bridge so public AWS learning proof can become GSE/FABLE architecture leverage without exposing private information or touching AWS accounts.

Adds a public `/fable` app route and a no-cost AWS local governance OS: S3/IAM/SageMaker/Bedrock/Clean Rooms fixture library, Shadow Control Tower mock, generated Well-Architected lens checks, self-explaining agent cases, SageMaker drift cards, synthetic Clean Rooms NFL cases, and CDK-style synth fixture. Everything is local and runs without AWS credentials, model calls, deploys, DNS, or paid resources.

## Why It Matters
The repo now separates ambition from evidence with executable checks.

## Acceptance Criteria
- `npm run fable:evidence` passes.
- Claim ledger validates.
- Unsupported terms are blocked unless downgraded or evidence-tied.
- AWS gates default off.
- AWS decision engine blocks deploy, paid model calls, destructive actions, missing data rights, broad IAM risk, and production/DNS changes by default.
- Public-data demo remains fixture-only.
- Historical OneNote/prompt hype claims are downgraded in the claim ledger.
- GitHub publication path is documented if CLI auth is unavailable.
- Personal AWS learning bridge exists under `docs/personal/aws/`.
- Personal learning evidence validates through `schemas/fable/personal-learning-evidence.schema.json`.
- AWS local fixture evidence validates through `schemas/fable/aws-local-fixture-library.schema.json`.
- S3, IAM, SageMaker, Bedrock/AgentCore, and Clean Rooms mock cases exist under `docs/fable/aws/fixtures/`.
- Shadow Control Tower governance validates through `apps/web/lib/fable/aws-governance-os.ts`.
- Preventive, detective, and proactive shadow guardrails exist.
- All six Well-Architected pillars have generated local lens checks.
- AWS service scorecard includes decision explanation, Well-Architected pillar checks, and success metrics.
- No personal secrets are included.
- No AWS account was used.
- No paid resources were used.
- No live deployment was performed.
- Badges/courses are public proof only after owner approval.

## Files Likely Touched
- `apps/web/lib/fable/**`
- `apps/web/app/fable/**`
- `scripts/fable-*.ts`
- `docs/fable/**`
- `docs/personal/aws/**`
- `schemas/fable/**`
- `.github/workflows/fable-evidence.yml`
- `.env.example`
- `apps/web/tsconfig.json`

## Test Plan
- `npm run fable:evidence`
- `npm run fable:aws-fixtures`
- `npm run fable:aws-governance`
- `npm run fable:aws-intel`
- `npm run fable:demo`
- targeted FABLE Vitest tests
- `npm run typecheck --workspaces --if-present`
- guardrails

## Risk
Docs, local checks, inert env defaults, and pure TypeScript guardrails only; no AWS resources or paid services.

Personal learning proof is metadata-only unless the owner approves a public artifact. No private AWS account information belongs in the PR.

## Owner Decision Needed
Only for future AWS/model/live-data moves, GitHub publication, legal/data markers, and any paid or live cloud path.

## Manual Publication Commands If Auth Is Blocked

```bash
gh auth login
git push -u origin codex/fable-nfl-evidence-integration
gh pr create --base main --head codex/fable-nfl-evidence-integration --title "feat(fable): add evidence and AWS guardrails" --body-file docs/fable/github/PR_BODY_FABLE_EVIDENCE.md
```
