# AWS Learning To Repo Actions

This file converts learning areas into no-cost repo artifacts. It is a backlog for docs, schemas, local tests, and mock plans only.

## No-Cost Mock Plans

| Mock plan | Learning input | Repo artifact | Safe output | Explicitly not included |
| --- | --- | --- | --- | --- |
| Amplify preview mock | Amplify hosting and Next.js docs | `infrastructure/aws/amplify/README.md` plus `docs/fable/aws/AWS_AMPLIFY_INVESTIGATION.md` | build settings, rollback checklist, env handling notes | deploy, DNS, GitHub connection, service role creation |
| S3 evidence storage mock | S3/storage and IAM basics | future local policy note linked from `docs/fable/aws/AWS_COST_SECURITY_GATES.md` | bucket naming rules, object classes, retention checklist, data-rights gate | bucket creation, object upload, account ID, ARNs |
| SageMaker artifact mock | SageMaker registry/model-card learning | `docs/fable/aws/AWS_SAGEMAKER_MLOPS_PLAN.md` | local model-card shape, artifact manifest, approval statuses | training job, endpoint, feature group, paid compute |
| Bedrock/AgentCore agent mock | Bedrock/AgentCore and IAM learning | `docs/fable/aws/AWS_BEDROCK_AGENTCORE_PLAN.md` | fake tool allowlist, approval gates, model-call rejection rules | model call, agent runtime, AWS secret, paid eval |
| Clean Rooms partner mock | Clean Rooms learning | `docs/fable/aws/clean-rooms-demo/` | synthetic schemas, allowed queries, disallowed queries | partner data, collaboration, analysis rule, export |

## Action Queue

1. Add personal learning evidence entries only after owner approval.
2. Keep badge/course proof as `not_yet_public` until redaction is complete.
3. Use learning summaries to improve existing AWS scorecards before proposing cloud work.
4. Build local mock artifacts before any read-only AWS discovery.
5. Convert any future live AWS idea into an AWS decision-engine evaluation first.

## Definition Of Done For A Learning Artifact

- A public-safe evidence entry validates against `personal-learning-evidence.schema.json`.
- The entry states the GSE/FABLE system affected.
- The repo action is no-cost unless an owner approval file exists.
- The artifact confirms no secrets and no paid resource use.
- The artifact does not imply live AWS readiness.
