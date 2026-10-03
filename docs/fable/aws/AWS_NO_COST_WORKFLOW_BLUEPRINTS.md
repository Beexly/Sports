# AWS No-Cost Workflow Blueprints

Updated: 2026-07-03

These are local workflows that build AWS readiness without touching an AWS account.

## Workflow 1: Learning Proof To Repo Action

1. Complete or start a public AWS learning item.
2. Fill `docs/personal/aws/AWS_PERSONAL_PROGRESS_TEMPLATE.md` outside the repo if it contains personal details.
3. Redact proof.
4. Add only public-safe metadata to a learning evidence JSON entry.
5. Run `npm run fable:evidence`.
6. Add one no-cost repo action, such as a checklist, matrix row, or mock plan.

Output:
- learning evidence entry.
- GSE/FABLE relevance.
- no-secret and no-paid confirmations.

## Workflow 2: Service Fit Review

1. Pick one AWS service.
2. Add or update the scorecard row.
3. Define current repo fit.
4. Define no-cost spike path.
5. Define rejection criteria.
6. Define adoption trigger.
7. Link the learning area that improved the judgment.

Output:
- service scorecard update.
- owner decision gate.

## Workflow 3: Mock Before Cloud

1. Write the cloud intent in local terms.
2. Build a no-cost mock artifact.
3. Define what the mock proves.
4. Define what the mock does not prove.
5. Add the command that validates the mock.
6. Reject live AWS unless the mock passes and the owner approves.

Mock candidates:
- S3 artifact-retention checklist.
- Amplify preview build settings.
- SageMaker model-card manifest.
- Bedrock/AgentCore fake tool policy.
- Clean Rooms synthetic query rule.

## Workflow 4: AWS Agent Gate

1. Define agent tools as propose, read, write, spend, deploy, or publish.
2. Default all spend, deploy, publish, secret, and production tools to blocked.
3. Add fake-tool tests.
4. Require evidence labels in agent output: observed, inferred, assumed, blocked.
5. Require owner approval before any live tool.

Output:
- tool permission matrix.
- failure-mode rubric.
- fake-agent transcript.

## Workflow 5: Cost Review Without Spend

1. Name the AWS service.
2. Identify billing dimensions from official docs.
3. Identify variable-cost drivers.
4. Set default monthly cap to zero.
5. Define a future budget and anomaly-monitor plan without creating it.
6. Identify a local alternative.

Output:
- cost worksheet.
- kill switch.
- owner approval requirement.

## Workflow 6: Partner Architecture Without Partner Data

1. Define partner type.
2. Define aggregate question.
3. Define raw data that must not be exposed.
4. Define allowed and disallowed queries.
5. Define privacy threshold.
6. Use synthetic schema only.

Output:
- Clean Rooms synthetic scenario.
- partner-safe discussion note.
- legal blocker list.
