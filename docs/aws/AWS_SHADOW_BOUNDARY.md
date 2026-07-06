# AWS Shadow Boundary

Status: exact-path boundary for `docs/aws` and `infra/aws-shadow`.

Allowed here:

- Local AWS architecture maps.
- Local compatibility indexes.
- Synthetic JSON fixtures.
- Documentation-grade ASL, EventBridge, Guardrails, AgentCore, SageMaker, Clean Rooms, Control Tower, and CDK-shaped artifacts.
- Links to canonical `docs/fable/aws` and `infrastructure/aws` artifacts.
- Local validation commands that use Node, TypeScript, Vitest, or existing FABLE scripts.

Not allowed here:

- AWS credentials.
- Account IDs.
- ARNs for real resources.
- Regions for deployment targets.
- Live AWS CLI commands.
- CDK account initialization or deployment instructions.
- DNS changes.
- Hosted inference activation.
- Bedrock model invocation.
- SageMaker job creation.
- Clean Rooms collaboration creation.
- S3 bucket creation.
- IAM mutation.
- Billing, budget, or Cost Explorer account configuration.

Promotion gate:

Before any live AWS step exists, the owner must approve a separate implementation plan that names:

- service
- account
- spend cap
- rollback path
- source-rights classification
- IAM scope
- data retention
- monitoring
- test plan
- legal/compliance reviewer

Until then, the only valid state is local shadow evidence.
