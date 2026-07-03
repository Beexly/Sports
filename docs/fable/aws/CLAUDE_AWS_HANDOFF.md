# Claude AWS Handoff

Read order:
1. `docs/fable/aws/README.md`
2. `docs/fable/aws/AWS_REPO_REALITY_MAP.md`
3. `docs/fable/aws/AWS_COST_SECURITY_GATES.md`
4. `apps/web/lib/fable/aws-gates.ts`
5. `infrastructure/aws/amplify/README.md`
6. `docs/fable/aws/AWS_FINAL_REPORT.md`
7. `docs/fable/aws/AWS_MODEL_LEVERAGE_MAP.md`
8. `docs/fable/aws/AGENTCORE_SECURITY_FIREBREAK.md`
9. `docs/fable/aws/sagemaker-adrs/ADR-0001-local-first-ml.md`
10. `docs/fable/aws/clean-rooms-demo/README.md`

Rules:
- Treat all AWS work here as local-only.
- Do not infer account setup from docs.
- Do not add AWS SDK dependencies without owner approval.
- Do not deploy.
- Do not store source data in AWS unless the source registry permits storage.
- Treat all model availability as requiring current AWS/account verification.
