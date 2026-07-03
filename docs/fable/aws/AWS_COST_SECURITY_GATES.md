# AWS Cost And Security Gates

Implemented code:
- `apps/web/lib/fable/aws-gates.ts`
- `apps/web/lib/fable/aws-decision-engine.ts`

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

Decision-engine defaults:
- Local docs-only changes are allowed by default.
- Local validation/dry-run work is allowed when a validation command exists.
- Read-only AWS discovery requires clear user need plus explicit profile and region.
- Deploys require account, profile, region, owner approval, final confirmation, cost summary, rollback, and dry-run evidence.
- Paid model calls and paid resources are blocked by default.
- Storage or partner sharing is blocked when data rights are unknown.
- Wildcard IAM, administrator access, broad PassRole, and public-resource signals raise risk.
- Production/DNS changes are critical and blocked by default.

Security boundaries:
- No secrets in docs.
- No checked-in AWS credentials.
- No role or service creation in this branch.
- Source storage rights must be checked before any cloud storage.

Verification:
- `npm run test --workspace=apps/web -- lib/fable/aws-gates.test.ts lib/fable/aws-decision-engine.test.ts`
- `npm run fable:aws-gates`

## Personal AWS Learning Feed

AWS learning feeds this gate system through better judgment, not through credentials.

Improvements from the learning path:
- Cloud Operations and cost learning strengthens cost ceilings, kill switches, and future budget/anomaly-monitor runbooks.
- IAM/security learning strengthens wildcard, administrator, broad `PassRole`, public-resource, and cross-account review.
- VPC/networking learning strengthens blast-radius scoring for private versus public surfaces.
- S3/storage learning strengthens source-rights checks before cloud storage.
- Bedrock/AgentCore learning strengthens the default-deny agent firebreak.

Repo-safe action:
- add learning evidence only through `docs/personal/aws/personal-learning-evidence.example.json` or a future owner-approved copy.
- keep proof links blocked until owner approval.
- do not run live AWS cost, IAM, or account commands from this learning bridge.
