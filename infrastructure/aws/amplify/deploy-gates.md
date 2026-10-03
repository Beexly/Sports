# Deploy Gates

Any AWS deploy or account mutation must pass:
- `FABLE_AWS_ALLOW_EXPERIMENTS=true`
- `FABLE_AWS_ALLOW_DEPLOY=true`
- owner-approved release-control record
- no secret scan findings
- source rights review for any data moved to AWS

This branch does not deploy.
