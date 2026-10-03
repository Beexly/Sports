# AWS Compatibility Index

Purpose: expose the exact `docs/aws` path requested in Sunday frontier work while preserving `docs/fable/aws` as the canonical AWS evidence layer.

| Compatibility need | Read this file first | Canonical artifact | What it proves | What it does not prove |
| --- | --- | --- | --- | --- |
| AWS reality map | `docs/aws/README.md` | `docs/fable/aws/AWS_REPO_REALITY_MAP.md` | The repo has local AWS planning and gate artifacts. | AWS account setup or live service use. |
| Well-Architected lens | `docs/aws/AWS_WELL_ARCHITECTED_GSE_LENS.md` | `docs/fable/aws/AWS_SERVICE_SCORECARD.md` | The six AWS Well-Architected pillars are mapped to GSE controls. | A formal AWS Well-Architected Review. |
| Cost/security gates | `docs/aws/AWS_SHADOW_BOUNDARY.md` | `docs/fable/aws/AWS_COST_SECURITY_GATES.md` | Local gates default to no spend and no deploy. | Budget creation, Cost Explorer configuration, or account guardrails. |
| Operating runbook | `docs/aws/README.md` | `docs/fable/aws/AWS_OPERATING_INTELLIGENCE_RUNBOOK.md` | Local commands and failure modes are documented. | Permission to run live AWS commands. |
| Governance OS | `docs/aws/AWS_WELL_ARCHITECTED_GSE_LENS.md` | `docs/fable/aws/governance-os/SHADOW_CONTROL_TOWER_BLUEPRINT.json` | Shadow Control Tower concepts are modeled locally. | AWS Control Tower configuration. |
| Local fixture library | `docs/aws/README.md` | `docs/fable/aws/fixtures/AWS_LOCAL_FIXTURE_LIBRARY.json` | No-cost mocks cover AWS-inspired decision patterns. | Real AWS resource coverage. |
| Amplify investigation | `docs/aws/README.md` | `infrastructure/aws/amplify/README.md` | Amplify is evaluated as a future option. | Amplify app creation or DNS migration. |
| CDK fixture lane | `docs/aws/AWS_SHADOW_BOUNDARY.md` | `infrastructure/aws/cdk/shadow-control-tower-synth.fixture.json` | A reviewable IaC-shaped fixture exists. | CDK account initialization, synthesis, or deployment. |
| Infra shadow aliases | `infra/aws-shadow/README.md` | `infrastructure/aws/*` and `docs/fable/aws/*` | Exact local fixture paths exist for agents. | Live infrastructure. |
| Public case-study route | `docs/aws/AWS_PUBLIC_CASE_STUDY_ROUTE.md` | `apps/web/app/case-studies/aws-governed-sports-intelligence/page.tsx` | GSE can explain AWS-style governance in public-safe copy. | AWS approval, cloud setup, funding, customer adoption, or release readiness. |

Rules for future edits:

- Add new AWS research under `docs/fable/aws` first.
- Add exact-path aliases here only when they improve discovery.
- Keep `infra/aws-shadow` fixture aliases local, synthetic, and non-deployable.
- Run `npm run guard:aws-compatibility-index` after changing this path family.
