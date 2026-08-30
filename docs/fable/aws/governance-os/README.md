# FABLE AWS Governance OS

Updated: 2026-07-03

This folder is a local, zero-cost simulation of AWS governance for GSE/FABLE. It borrows concepts from AWS Control Tower, AWS Config, CloudFormation Guard, Bedrock AgentCore, SageMaker governance, Clean Rooms, CDK synth, and the AWS Well-Architected Framework without touching an AWS account.

Artifacts:
- `SHADOW_CONTROL_TOWER_BLUEPRINT.json` - local landing-zone, OU, guardrail, agent, drift-card, Clean Rooms, and CDK fixture model.
- `guard-rules/fable-shadow-control.guard` - CloudFormation Guard-style policy blueprint for local evidence.

Validation:

```bash
npm run fable:aws-governance
npm run test --workspace=apps/web -- lib/fable/aws-governance-os.test.ts
```

Boundaries:
- no AWS credentials.
- no AWS CLI.
- no Control Tower landing zone.
- no AWS Config recorder.
- no cfn-guard binary requirement.
- no CDK deploy.
- no paid Bedrock, SageMaker, Clean Rooms, or storage action.

The purpose is to turn AWS governance vocabulary into local evidence discipline before any owner-approved cloud step exists.
