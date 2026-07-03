# SageMaker MLOps Ladder

Updated: 2026-07-03

Official references:
- https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry.html
- https://docs.aws.amazon.com/sagemaker/latest/dg/pipelines.html
- https://docs.aws.amazon.com/sagemaker/latest/dg/model-cards.html
- https://docs.aws.amazon.com/sagemaker/latest/dg/model-monitor.html
- https://docs.aws.amazon.com/sagemaker/latest/dg/clarify-configure-processing-jobs.html

Default: Level 0 or Level 1 until there is data volume, model artifact maturity, data-rights clarity, and owner approval.

| Level | Name | Trigger | Minimum evidence | Cost ceiling | IAM requirement | Data-rights requirement | Security requirement | Rollback | Rejection criteria |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | local/open-source only | current state | local tests and replay docs | $0 | none | source registry only | no cloud data | keep local artifacts | any need for paid AWS before proof |
| 1 | local artifacts shaped like SageMaker inputs | model cards/replay artifacts mature locally | feature schema, model card, calibration report | $0 | none | approved local data use | no secrets | delete local artifact | artifact not reproducible |
| 2 | S3/Athena-compatible data lake design only | approved storage design needed | bucket/table schema and deletion path | $0 docs-only | least-privilege design | AWS storage allowed per source | encryption plan | no live resources | source rights unknown |
| 3 | Processing/Training spike later | owner approves ML runtime and budget | local baseline, training data manifest, dry-run plan | owner-set cap | scoped role, no admin | training data approved | no public bucket | delete job/artifacts | local baseline insufficient |
| 4 | Model Registry/Model Cards | versioned artifacts exist | model artifact, metrics, approval status, lineage | owner-set cap | registry-only scoped role | model data approved | artifact retention policy | demote model status | no stable versioning |
| 5 | Model Monitor/Clarify | recurring predictions and outcomes exist | prediction logs, baseline stats, segment definitions | owner-set cap | monitor/clarify scoped role | evaluation data approved | report access controls | disable monitor/job | no recurring predictions |
| 6 | governed partner-grade MLOps | partner or enterprise review requires it | registry, monitor, clarify, audit, cost controls | contract cap | least privilege plus audit | partner/legal agreement | KMS/logging/retention | exit plan and data deletion | no partner/commercial need |

Current state:
- Level 0 and Level 1 are the only supported levels.
- No SageMaker resources are configured.
- No endpoint, training job, processing job, feature group, registry, monitor, or Clarify job exists.
- SageMaker is an adoption ladder, not a shortcut to performance claims.

Owner decisions before Level 3+:
- ML runtime approval.
- AWS account/profile/region.
- monthly cost ceiling.
- source/data-rights marker.
- IAM role owner.
- rollback owner.
