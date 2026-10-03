# AWS Shadow Compatibility Fixtures

Status: exact-path compatibility layer only. This directory exists for agents and reviewers looking for `infra/aws-shadow` while preserving `infrastructure/aws` and `docs/fable/aws` as the canonical AWS work.

Canonical sources:

- `docs/fable/aws/governance-os/SHADOW_CONTROL_TOWER_BLUEPRINT.json`
- `docs/fable/aws/fixtures/AWS_LOCAL_FIXTURE_LIBRARY.json`
- `infrastructure/aws/amplify/README.md`
- `infrastructure/aws/cdk/shadow-control-tower-synth.fixture.json`

Fixtures:

- `compatibility-manifest.json`
- `control-tower-policy.json`
- `step-functions/metric-validation.asl.json`
- `eventbridge/events.json`
- `sagemaker/model-monitor-card.json`
- `bedrock/guardrails-policy.json`
- `agentcore/agent-contracts.json`
- `cleanrooms/synthetic-collab-fixture.json`

All fixtures must keep:

- `live_aws_action: false`
- `deploy_allowed: false`
- `credentials_required: false`
- `paid_resource_required: false`

Validation:

```bash
npm run guard:aws-compatibility-index
```

This directory contains no deployable IaC. It is a reviewable local map of future AWS patterns for GSE.
