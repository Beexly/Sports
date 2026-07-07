# AWS Technique Ledger

Updated: 2026-07-03

This ledger captures AWS-related techniques that can improve GSE/FABLE without spending money.

| Technique | AWS concept | Local implementation | GSE/FABLE use | Proof command or artifact |
| --- | --- | --- | --- | --- |
| schema-first evidence | Glue/Athena catalog discipline | JSON schema files | evidence contracts | `npm run fable:evidence` |
| local model card | SageMaker Model Registry | markdown/model-card fixture | model governance | future fixture test |
| drift bucket replay | SageMaker Model Monitor | local drift checks | calibration monitoring | drift tests |
| explainability notes | SageMaker Clarify | parity and segment docs | bias/fairness review | parity tests |
| agent tool matrix | AgentCore policy | docs and fake tools | agent safety | evidence harness and docs |
| cost cap gate | Budgets/Cost Explorer | env defaults and validators | spend safety | `npm run fable:aws-gates` |
| fake IAM policy review | IAM Access Analyzer | local fake policies | least privilege | future unit tests |
| synthetic collaboration | Clean Rooms | synthetic schemas and SQL | partner story | docs/fable/aws/clean-rooms-demo |
| artifact retention plan | S3 lifecycle concepts | local retention checklist | evidence storage | data-rights docs |
| operational command log | CloudWatch/CloudTrail mindset | command report | auditability | `docs/fable/evidence/COMMAND_LOG.md` |

## Technique Rule

Every technique must say:
- what AWS concept inspired it.
- how it works locally.
- what it proves.
- what it does not prove.
- what owner gate is needed before live AWS use.
