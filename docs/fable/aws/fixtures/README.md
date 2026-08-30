# AWS Local Fixture Library

Updated: 2026-07-03

This folder holds no-cost AWS mocks, fixtures, and refusal cases for GSE/FABLE.

Boundary:
- no AWS credentials.
- no AWS CLI calls.
- no network dependency.
- no deploy.
- no paid resource.
- no live provider data.

Primary artifact:
- `AWS_LOCAL_FIXTURE_LIBRARY.json`

Validation:

```bash
npm run fable:aws-fixtures
npm run test --workspace=apps/web -- lib/fable/aws-local-fixtures.test.ts
```

The fixture library covers:
- local S3 evidence-storage policy mock.
- fake IAM policy review cases.
- local SageMaker model-card fixture.
- Bedrock/AgentCore fake-agent refusal cases.
- Clean Rooms synthetic scenario cases.

Every fixture maps to at least one AWS Well-Architected pillar, and the full library must cover operational excellence, security, reliability, performance efficiency, cost optimization, and sustainability.
