# AWS CDK Fixture Lane

Updated: 2026-07-03

This folder contains CDK-style local fixtures only. It does not import `aws-cdk-lib`, synthesize a real CloudFormation template, create a bootstrap stack, connect an AWS account, or deploy resources.

Included:
- `shadow-control-tower-synth.fixture.json`

Boundary:
- no `cdk deploy`.
- no `cdk bootstrap`.
- no credentials.
- no account ID.
- no region.
- no generated CloudFormation deployment artifact.

The fixture gives the repo a reviewable IaC shape for future owner-approved work while keeping the current branch no-cost and local.
