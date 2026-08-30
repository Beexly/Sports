# AWS Well-Architected GSE Lens

Status: local compatibility lens only. This is not an AWS Well-Architected Tool workload, not an AWS account review, and not a production readiness claim.

Canonical references:

- `docs/fable/aws/AWS_SERVICE_SCORECARD.md`
- `docs/fable/aws/AWS_OPERATING_INTELLIGENCE_MATRIX.md`
- `docs/fable/aws/AWS_COST_SECURITY_GATES.md`
- `docs/fable/aws/fixtures/AWS_LOCAL_FIXTURE_LIBRARY.json`
- `docs/fable/aws/governance-os/SHADOW_CONTROL_TOWER_BLUEPRINT.json`

## Pillar Fusion Map

| AWS pillar | GSE local control | Canonical artifact | Compatibility fixture | Required gate |
| --- | --- | --- | --- | --- |
| Operational excellence | Runbooks, evidence ledgers, workflow state, manual review checkpoints | `docs/fable/aws/AWS_OPERATING_INTELLIGENCE_RUNBOOK.md` | `infra/aws-shadow/step-functions/metric-validation.asl.json` | Every automation stays shadow/manual-review until owner approval. |
| Security | No secrets, no IAM mutation, source-rights and payload-rights fences | `docs/fable/aws/AWS_COST_SECURITY_GATES.md` | `infra/aws-shadow/bedrock/guardrails-policy.json` | No credentials, account ids, SDK calls, or provider mutations. |
| Reliability | Drift cards, refusal cases, replay/idempotency thinking, fail-closed gates | `docs/fable/aws/governance-os/SHADOW_CONTROL_TOWER_BLUEPRINT.json` | `infra/aws-shadow/sagemaker/model-monitor-card.json` | Local tests must prove blocked states stay blocked. |
| Performance efficiency | Service scorecard, model-router choices, local benchmark proxies | `docs/fable/aws/AWS_SERVICE_SCORECARD.md` | `infra/aws-shadow/agentcore/agent-contracts.json` | No paid model call or hosted inference without owner gate. |
| Cost optimization | Zero-cost default, startup-credit packet, deploy gates | `docs/fable/aws/AWS_NO_COST_WORKFLOW_BLUEPRINTS.md` | `infra/aws-shadow/control-tower-policy.json` | Monthly spend assumption remains zero. |
| Sustainability | Synthetic data, no duplicate live jobs, privacy-safe aggregate collaboration | `docs/fable/aws/AWS_CLEAN_ROOMS_PARTNERSHIP_PLAN.md` | `infra/aws-shadow/cleanrooms/synthetic-collab-fixture.json` | No live data movement or partner sharing without rights approval. |

## Scorecard Explanation

The AWS service scorecard is a decision tool, not a procurement mandate. It asks:

- What GSE capability the service would improve.
- Which Well-Architected pillar it strengthens.
- What source-rights or compliance risk it introduces.
- What local proof can be created before any AWS account action.
- What owner approval is required before a live experiment.

Any service that cannot pass cost, security, data-rights, and reversibility gates remains local-only.

## Local Review Loop

1. Read this lens.
2. Read `docs/fable/aws/AWS_SERVICE_SCORECARD.md`.
3. Read the matching fixture under `infra/aws-shadow`.
4. Run `npm run guard:aws-compatibility-index`.
5. Run the relevant FABLE AWS validation command.
6. Record failures in the execution ledger.

No step in this loop authorizes live AWS use.
