# GSE AWS Compatibility Index

Status: compatibility index only. This folder exists so humans and agents looking for `docs/aws` land on the real AWS evidence layer without creating a parallel source of truth.

Canonical source:

- `docs/fable/aws/README.md`
- `docs/fable/aws/CLAUDE_AWS_HANDOFF.md`
- `docs/fable/aws/AWS_SERVICE_SCORECARD.md`
- `docs/fable/aws/AWS_COST_SECURITY_GATES.md`
- `docs/fable/aws/AWS_OPERATING_INTELLIGENCE_RUNBOOK.md`
- `docs/fable/aws/governance-os/README.md`
- `docs/fable/aws/fixtures/README.md`
- `infrastructure/aws/amplify/README.md`
- `infrastructure/aws/cdk/README.md`

Boundary:

- No live AWS calls.
- No AWS credentials.
- No DNS changes.
- No deploy action.
- No paid resources.
- No SDK or dependency addition.
- No claim that AWS is configured.

Compatibility files:

- `COMPATIBILITY_INDEX.md` maps this exact path to the canonical FABLE/AWS docs.
- `AWS_WELL_ARCHITECTED_GSE_LENS.md` gives the six-pillar reading map for GSE.
- `AWS_SHADOW_BOUNDARY.md` records allowed and forbidden actions for this path family.
- `AWS_PUBLIC_CASE_STUDY_ROUTE.md` records the public-safe local route that explains AWS-style governance without claiming live cloud action.

Validation:

```bash
npm run guard:aws-compatibility-index
npm run fable:aws-gates
npm run fable:aws-fixtures
npm run fable:aws-governance
```

These commands are local checks only. They do not prove AWS account access, funding approval, service availability, deployment readiness, or legal clearance for source data.
