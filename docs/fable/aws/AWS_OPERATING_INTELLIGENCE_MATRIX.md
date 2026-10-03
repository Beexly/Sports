# AWS Operating Intelligence Matrix

Updated: 2026-07-03

This matrix turns AWS learning into operating judgment for GSE/FABLE. It is local-only and does not require AWS credentials.

Official framing used:
- AWS Well-Architected pillars: operational excellence, security, reliability, performance efficiency, cost optimization, sustainability.
- IAM Access Analyzer policy validation concepts.
- AWS Budgets, Cost Explorer, and Cost Anomaly Detection concepts.
- Bedrock AgentCore policy and runtime concepts.

## Pillar Matrix

| Pillar | GSE/FABLE question | Local evidence artifact | Metric to track | AWS learning input | No-cost action | Owner gate |
| --- | --- | --- | --- | --- | --- | --- |
| Operational excellence | Can this workflow be repeated, observed, and rolled back? | command log, runbook, rollback checklist | replay success rate, mean manual steps, rollback completeness | Cloud Operations, Cloud Practitioner | add local runbook before cloud plan | deploy approval |
| Security | Does the plan minimize access and data exposure? | IAM review template, source-rights marker, agent allowlist | wildcard count, public-surface count, unknown-rights count | IAM/security, VPC, S3 | add fake-policy review and secret scan | security owner |
| Reliability | Does failure degrade safely? | fixture replay, fallback plan, no-action gate | fallback coverage, stale-source rejection rate | EC2/compute, networking | add local failure-mode table | production owner |
| Performance efficiency | Is managed infrastructure needed yet? | local baseline, bottleneck note, scale trigger | local runtime, data volume, queue depth | EC2, Lambda, SageMaker | keep local until bottleneck is measured | compute budget |
| Cost optimization | Can spend be bounded and stopped? | cost worksheet, cap, kill switch | estimated monthly cost, variable-cost driver count | Cost, Budgets, Cost Explorer | require zero default and owner cap | billing owner |
| Sustainability | Can the system avoid unnecessary compute and storage? | retention plan, batch schedule, reject criteria | retained artifact count, replay frequency, storage growth | S3, compute, operations | keep artifacts minimal and local first | storage approval |

## Action Tiers

| Tier | Allowed in this branch | Example | Required evidence |
| --- | --- | --- | --- |
| 0 local docs | yes | learning crosswalk, matrix, runbook | no-secret confirmation |
| 1 local validation | yes | tests, schema validation, dry-run docs | command output |
| 2 read-only AWS discovery | no by default | describe/list/get calls | explicit owner approval plus profile/region |
| 3 reversible AWS change | no | preview app creation | account, region, cost, rollback, final confirmation |
| 4 paid AWS change | no | model calls, training jobs | budget, kill switch, owner approval |
| 5 destructive or production-sensitive | no | DNS, IAM admin, deletes | second confirmation and rollback owner |

## Operating Questions Before Any AWS Action

1. What is the local proof that AWS is needed?
2. Which data rights permit storage, sharing, or derived use?
3. What is the maximum monthly cost?
4. What is the exact kill switch?
5. What IAM permissions are required and why?
6. What is the rollback path?
7. What will prove the action worked without overclaiming?
8. What would make us reject the AWS path?

## No-Cost Output Standard

Every AWS learning item should produce at least one of:
- a better rejection criterion.
- a safer owner gate.
- a local test.
- a public-safe portfolio paragraph.
- a mock plan.
- a measurable artifact.
