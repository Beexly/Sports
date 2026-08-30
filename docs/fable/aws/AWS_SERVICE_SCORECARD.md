# AWS Service Scorecard

Updated: 2026-07-03

Default decision posture: reject for now, monitor, or no-cost spike. "Adopt later" requires evidence and owner approval. "Adopt now" is not used in this repo because no live AWS account mutation, billing approval, or deployment approval exists.

## How To Read The Scorecard

The scorecard is a rejection-first AWS decision surface. A row is useful only if it states:
- the GSE/FABLE use case.
- the minimum implementation that would make the service useful.
- a no-cost spike path.
- cost, IAM/security, data/legal, operations, provider-coupling, and partner-credibility risks.
- a rejection criterion.
- an adoption trigger.
- a current decision.

Decision meanings:
- `reject for now`: no local proof, rights basis, owner approval, or cost path exists.
- `monitor`: useful concept, but no implementation trigger exists.
- `no-cost spike`: local docs, mocks, schemas, or tests may be built; AWS accounts stay untouched.
- `preview-only spike later`: possible only after owner approval, dry-run evidence, rollback, and budget gate.
- `adopt later`: service may become relevant after mature artifacts, data rights, and owner approval.

No row authorizes AWS credentials, AWS CLI, deploys, DNS, model calls, storage, data sharing, or paid resources.

| Service | Use case | Current repo fit | Minimum useful implementation | No-cost spike path | Cost risk | IAM/security risk | Data/legal risk | Ops complexity | Provider coupling risk | Partner credibility value | Rejection criteria | Adoption trigger | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Amplify | Preview hosting for app/demo surfaces | partial | branch preview only | docs skeleton and build review | medium | medium | low | medium | medium | medium | current host is cheaper or SSR mismatch | approved preview need | preview-only spike later |
| CloudFront | CDN edge for static/demo assets | low | distribution in front of approved origin | architecture ADR only | medium | medium | low | medium | medium | medium | no deployed AWS origin | approved AWS hosting path | monitor |
| Route 53 | DNS | low | hosted zone and controlled records | none beyond runbook | low | high | low | high | medium | low | DNS not owner-approved | explicit DNS migration approval | reject for now |
| WAF | Public app protection | low | managed rule set on approved edge | threat model only | medium | medium | low | medium | medium | medium | no AWS edge path | production AWS edge approved | monitor |
| Shield | DDoS posture | low | standard coverage via AWS edge | docs only | low-to-high | medium | low | medium | medium | low | no AWS public edge | AWS edge approved | monitor |
| Cognito | Auth | low | separate auth tenant and migration plan | compare current auth only | medium | high | medium | high | high | medium | current auth is adequate | owner chooses AWS auth | reject for now |
| API Gateway | API front door | low | one read-only API behind local equivalent | OpenAPI review | medium | medium | low | medium | medium | medium | Next routes are sufficient | AWS backend service exists | monitor |
| Lambda | Serverless jobs/APIs | partial | isolated read-only worker | local handler test | medium | medium | medium | medium | medium | medium | existing workers suffice | approved AWS worker lane | no-cost spike |
| AppSync | Graph API | low | schema and resolver plan | schema-only ADR | medium | high | medium | high | high | medium | no mobile/offline GraphQL need | partner app needs GraphQL | reject for now |
| DynamoDB | Low-latency state | low | one non-critical table design | local schema doc | medium | medium | medium | medium | medium | low | Postgres already fits | scale pattern proves need | monitor |
| Aurora Serverless | Relational AWS DB | low | migration plan and rollback | cost/latency comparison | high | high | high | high | high | medium | Neon/Postgres path remains enough | enterprise AWS requirement | reject for now |
| S3 | Evidence/artifact storage | partial | approved artifacts bucket design | local manifest only | medium | medium | high | medium | medium | high | source storage rights unknown | rights-cleared artifacts | no-cost spike |
| Glue | ETL catalog | low | crawler/job design | schema docs only | medium | high | high | high | medium | medium | no S3 data lake | approved lakehouse | monitor |
| Athena | Query approved lake data | low | query over rights-cleared S3 | SQL examples only | medium | medium | high | medium | medium | medium | no approved S3 dataset | rights-cleared lake exists | monitor |
| Lake Formation | Data lake permissions | low | permission model | access model doc | medium | high | high | high | high | high | no shared lake | partner/enterprise data lake | monitor |
| SageMaker AI | MLOps/training | partial | local artifacts shaped for future jobs | artifact schema only | high | high | high | high | high | high | no mature model artifacts | owner-approved ML runtime | adopt later |
| SageMaker Pipelines | MLOps workflow | low | pipeline definition after artifacts | ADR only | high | high | high | high | high | high | no repeatable training process | recurring training exists | monitor |
| SageMaker Model Registry | Model governance | partial | registry-shaped local model cards | local model-card docs | medium | medium | medium | medium | medium | high | no versioned artifacts | versioned model artifacts | adopt later |
| SageMaker Feature Store | Feature governance | low | feature group schema | local feature schema | high | high | high | high | high | high | feature volume too small | stable features and data rights | monitor |
| SageMaker Model Monitor | Drift monitoring | partial | map local drift reports to monitor concepts | local drift reports | medium | medium | medium | medium | medium | high | no recurring hosted inference | production predictions exist | adopt later |
| SageMaker Clarify | Bias/explainability | partial | local parity and report mapping | parity report only | medium | medium | medium | medium | medium | high | no approved sensitive attributes | fairness review process exists | adopt later |
| SageMaker Ground Truth | Labeling | partial | local labeling manifest only | cost simulator | high | medium | high | medium | medium | medium | no owner-approved labeling budget | approved labeling project | monitor |
| Bedrock | Agent/model calls | low | model router with zero paid calls | docs/router only | high | medium | medium | medium | medium | high | no spend approval | owner-approved eval budget | monitor |
| Bedrock Knowledge Bases | Retrieval | low | source-approved retrieval plan | local index plan | high | high | high | high | high | high | rights or storage unknown | approved corpus and budget | monitor |
| Bedrock Guardrails | Agent safety | partial | local policy mirror | rubric docs | medium | medium | medium | medium | medium | high | no Bedrock agents | approved Bedrock agent eval | monitor |
| Bedrock AgentCore | Agent runtime/governance | partial | firebreak and tool matrix | docs only | high | high | high | high | high | high | no agent approval | explicit agent pilot | no-cost design spike |
| OpenSearch | Search/vector retrieval | low | index design over approved corpus | local schema doc | high | high | high | high | high | medium | no search scale need | approved retrieval scale | monitor |
| Neptune | Graph DB | low | graph schema only | local graph model | high | high | medium | high | high | medium | existing graph is enough | graph scale proven | reject for now |
| Timestream | Time-series store | low | metric schema only | local time-series doc | medium | medium | medium | medium | medium | low | Postgres/flat files suffice | high-volume time-series | monitor |
| QuickSight | BI dashboards | low | read-only report over approved data | static report only | medium | medium | high | medium | medium | medium | no approved warehouse | owner asks for AWS BI | monitor |
| CloudWatch | Monitoring | partial | metrics/logs for approved AWS app | local metric map | medium | medium | low | medium | medium | medium | no AWS deployment | AWS workload approved | adopt later |
| CloudTrail | Audit trail | high if AWS is used | org/account trail | checklist only | low | high | low | medium | low | high | no AWS account path | any AWS account use | adopt later |
| Cost Explorer | Cost analysis | high if AWS is used | read-only cost review | template only | low | medium | low | low | low | medium | no AWS spend | any AWS spend | adopt later |
| Budgets | Spend guard | high if AWS is used | budget and alert policy | template only | low | medium | low | low | low | high | no AWS spend | any paid AWS approval | adopt later |
| IAM Access Analyzer | IAM review | high if AWS is used | analyzer findings review | policy checklist | low | medium | low | medium | low | high | no AWS IAM changes | any IAM work | adopt later |
| KMS | Encryption keys | medium | key policy for approved data | key policy template | medium | high | high | high | medium | high | no AWS data stored | approved AWS storage | monitor |
| Secrets Manager | Secrets | medium | secret naming/rotation plan | docs only | medium | high | medium | medium | medium | medium | Vercel/local env sufficient | AWS runtime needs secrets | monitor |
| GuardDuty | Threat detection | medium if AWS account exists | account detector | checklist only | medium | medium | low | medium | medium | medium | no AWS workloads | AWS account becomes active | monitor |
| Security Hub | Security posture | medium if AWS account exists | standards aggregation | checklist only | medium | medium | low | medium | medium | medium | no AWS workloads | multi-service AWS use | monitor |
| Macie | Sensitive-data discovery | medium if S3 data exists | S3 discovery over approved bucket | data classification doc | medium | medium | high | medium | medium | high | no S3 data | approved sensitive data storage | monitor |
| AWS Config | Resource compliance | medium if AWS account exists | rules for approved resources | policy docs | medium | medium | low | medium | medium | medium | no AWS resources | AWS resources approved | monitor |
| Clean Rooms | Partner collaboration | partial | synthetic schema and allowed queries | current synthetic demo | medium | high | high | high | high | high | no partner/contract | partner + legal review | adopt later |
| Clean Rooms ML | Partner ML collaboration | low | future privacy-preserving ML plan | no-code concept only | high | high | high | high | high | high | no partner/data/legal basis | mature clean-room partnership | monitor |
| Entity Resolution | Partner/user matching | low | synthetic matching threat model | docs only | high | high | critical | high | high | medium | identity rights unknown | explicit legal basis | reject for now |
| Data Exchange | External data procurement | low | provider diligence checklist | docs only | medium | medium | high | medium | medium | medium | no provider contract | approved data purchase | monitor |

## Well-Architected Pillar Checks

These checks fuse AWS Well-Architected thinking into every AWS artifact without implying AWS configuration.

| Pillar | Local GSE/FABLE check | Required artifact before AWS action | Blocks |
| --- | --- | --- | --- |
| Operational excellence | Can the workflow be repeated, observed, and rolled back from local evidence? | command log, runbook, owner-decision field, rollback field | undocumented or one-off cloud action |
| Security | Does the plan minimize data exposure, permissions, secrets, and public surfaces? | source-rights marker, secret scan, IAM mock review, agent tool allowlist | wildcard IAM, secret capture, public bucket, unreviewed source |
| Reliability | Does failure degrade safely and keep unsupported claims out of public surfaces? | fixture replay, fallback rule, stale-source rejection, claim downgrade path | public claim from stale, missing, or unknown evidence |
| Performance efficiency | Is a managed service needed, or can local compute and fixtures still answer the question? | local benchmark, bottleneck note, scale trigger | hosted compute before measured local limit |
| Cost optimization | Is the spend ceiling explicit and defaulted to zero? | `FABLE_AWS_MAX_MONTHLY_COST_USD=0`, cost worksheet, kill switch, owner approval | model call, endpoint, storage, job, or preview with no budget gate |
| Sustainability | Does the plan avoid unnecessary storage, replay, and always-on compute? | retention plan, minimal fixture set, batch schedule, deletion review | indefinite artifact growth or always-on service without need |

The local fixture library at `docs/fable/aws/fixtures/AWS_LOCAL_FIXTURE_LIBRARY.json` validates that all six pillars are represented across no-cost S3, IAM, SageMaker, Bedrock/AgentCore, and Clean Rooms scenarios.

The Shadow Control Tower blueprint at `docs/fable/aws/governance-os/SHADOW_CONTROL_TOWER_BLUEPRINT.json` auto-generates one Well-Architected lens check per pillar from local guardrails. It is a Control Tower and AWS Config mock only; no landing zone or rule exists in AWS.

## Success Metrics

| Metric | Target | Evidence source |
| --- | --- | --- |
| scorecard_rows_with_rejection_criteria | 100 percent | every table row has a rejection criterion |
| scorecard_rows_with_no_cost_path | high | no-cost spike path column |
| well_architected_pillars_covered | 6 of 6 | `npm run fable:aws-intel` fixture summary |
| local_fixture_types_present | 5 of 5 | `npm run fable:aws-fixtures` |
| shadow_control_tower_guardrails | 6 or more | `npm run fable:aws-governance` |
| shadow_control_types_present | preventive, detective, proactive | `npm run fable:aws-governance` |
| generated_wa_lens_checks | 6 of 6 | `npm run fable:aws-intel` governance summary |
| learning_entries_public_safe | only owner-approved proof can be public | `npm run fable:learning` |
| live_aws_action_count | 0 | AWS final report and script output |
| paid_resource_count | 0 | AWS final report and script output |
| unsupported_claim_count | 0 scanner hits | `npm run fable:claims` |

Source notes:
- Amplify SSR/Next.js fit is tracked in `docs/fable/aws/AWS_AMPLIFY_INVESTIGATION.md`.
- Bedrock/AgentCore fit is tracked in `docs/fable/aws/AWS_MODEL_LEVERAGE_MAP.md` and `docs/fable/aws/AGENTCORE_SECURITY_FIREBREAK.md`.
- SageMaker fit is tracked in `docs/fable/aws/AWS_SAGEMAKER_MLOPS_PLAN.md`.
- Clean Rooms fit is tracked in `docs/fable/aws/AWS_CLEAN_ROOMS_PARTNERSHIP_PLAN.md`.
- No-cost fixture coverage is tracked in `docs/fable/aws/fixtures/AWS_LOCAL_FIXTURE_LIBRARY.json`.
- Shadow Control Tower and WA lens coverage is tracked in `docs/fable/aws/governance-os/SHADOW_CONTROL_TOWER_BLUEPRINT.json`.

## Personal AWS Learning Feed

Garrett's AWS learning path improves this scorecard only as public-safe evidence and architecture judgment. It is not account proof and does not authorize AWS actions.

Learning effects:
- AWS Educate storage, compute, networking, and database learning sharpens service-fit decisions before any migration.
- Cloud Operations and cost learning improves the scorecard's cost-risk and rejection criteria.
- Cloud Practitioner learning gives partner-safe vocabulary for explaining why a service is held, rejected, or kept as a no-cost spike.
- IAM/security learning improves least-privilege language and wildcard rejection criteria.
- Amplify, Bedrock/AgentCore, SageMaker, and Clean Rooms learning maps directly to the existing service rows without proving live configuration.

Required evidence path:
- learning proof starts in `docs/personal/aws/`
- safe schema is `schemas/fable/personal-learning-evidence.schema.json`
- GSE impact mapping is `docs/personal/aws/AWS_TO_GSE_CROSSWALK.md`
