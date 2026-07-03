# AWS Cost And Security Gates

Implemented code:
- `apps/web/lib/fable/aws-gates.ts`

Default behavior:
- Experiments are off.
- Deploys are off.
- Paid resources are off.
- Monthly cost cap defaults to `0`.

Env gates:
- `FABLE_AWS_ALLOW_EXPERIMENTS`
- `FABLE_AWS_ALLOW_DEPLOY`
- `FABLE_AWS_ALLOW_PAID_RESOURCES`
- `FABLE_AWS_MAX_MONTHLY_COST_USD`

Security boundaries:
- No secrets in docs.
- No checked-in AWS credentials.
- No role or service creation in this branch.
- Source storage rights must be checked before any cloud storage.
