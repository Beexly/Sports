# Testing Guide

Targeted FABLE tests:

```bash
npm run test --workspace=apps/web -- lib/fable/source-registry.test.ts lib/fable/uncertainty.test.ts lib/fable/labeling.test.ts lib/fable/drift.test.ts lib/fable/aws-gates.test.ts lib/fable/claim-scanner.test.ts lib/fable/docs-claims.test.ts
```

Requested package tests:

```bash
npm run test --workspace=packages/prediction-engine
npm run test --workspace=packages/data-ingestion
npm run typecheck --workspaces --if-present
npm run guard:secrets
npm run guard:trust
```

Recording rule:
- Exact commands, outcomes, failures, and caveats belong in `CODEX_FINAL_REPORT.md`.
- AWS-specific verification belongs in `aws/AWS_FINAL_REPORT.md`.
