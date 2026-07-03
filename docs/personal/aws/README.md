# Personal AWS Learning Bridge

Purpose:
- Turn Garrett's AWS learning into repo-safe public evidence for GSE/FABLE.
- Keep personal learning outside the repo unless a proof artifact is approved for public use.
- Convert course and badge work into better architecture decisions, cost gates, IAM posture, and portfolio narrative.

Allowed in this folder:
- AWS course names.
- AWS badge names.
- public AWS course or badge links after owner approval.
- approved screenshot paths after manual review.
- learning summaries.
- GSE/FABLE impact notes.
- no-cost repo actions.

Not allowed in this folder:
- passwords.
- personal emails unless the owner explicitly approves them for public use.
- payment data.
- AWS account IDs.
- access keys, secret keys, or session tokens.
- private application details.
- personal form data from re/Start or other programs.
- live AWS resource names from a private account.

Evidence contract:
- `docs/personal/aws/personal-learning-evidence.example.json`
- `schemas/fable/personal-learning-evidence.schema.json`
- `apps/web/lib/fable/evidence/schemas.ts`
- `apps/web/lib/fable/evidence/validators.ts`

Verification:

```bash
npm run fable:evidence
```

Navigation:
- `AWS_PERSONAL_PROGRESS_TEMPLATE.md`
- `AWS_BADGE_EVIDENCE_TEMPLATE.md`
- `AWS_TO_GSE_CROSSWALK.md`
- `AWS_LEARNING_TO_REPO_ACTIONS.md`
- `AWS_PORTFOLIO_CASE_STUDY.md`
- `AWS_RESTART_APPLICATION_BOUNDARY.md`

Boundary:
- This folder does not prove AWS account access.
- This folder does not prove live cloud readiness.
- This folder does not authorize deploys, paid resources, or credential use.
