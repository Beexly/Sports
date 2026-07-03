# Claude AWS Handoff

Read order:
1. `docs/fable/aws/README.md`
2. `docs/fable/aws/AWS_REPO_REALITY_MAP.md`
3. `docs/fable/aws/AWS_COST_SECURITY_GATES.md`
4. `apps/web/lib/fable/aws-gates.ts`
5. `infrastructure/aws/amplify/README.md`
6. `docs/fable/aws/AWS_FINAL_REPORT.md`

Rules:
- Treat all AWS work here as local-only.
- Do not infer account setup from docs.
- Do not add AWS SDK dependencies without owner approval.
- Do not deploy.
- Do not store source data in AWS unless the source registry permits storage.
