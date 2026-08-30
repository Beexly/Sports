# Claude AWS Handoff

Read order:
1. `docs/fable/aws/README.md`
2. `docs/fable/aws/AWS_REPO_REALITY_MAP.md`
3. `docs/fable/aws/AWS_PLUGIN_TO_REPO_CROSSWALK.md`
4. `docs/fable/aws/AWS_PLUGIN_GOVERNED_AUDIT.md`
5. `docs/fable/aws/AWS_SERVICE_SCORECARD.md`
6. `docs/fable/aws/AWS_SHOW_TEETH_STRATEGY.md`
7. `docs/fable/aws/AWS_COST_SECURITY_GATES.md`
8. `apps/web/lib/fable/aws-gates.ts`
9. `apps/web/lib/fable/aws-decision-engine.ts`
10. `infrastructure/aws/amplify/README.md`
11. `docs/fable/aws/AWS_FINAL_REPORT.md`
12. `docs/fable/aws/AWS_MODEL_LEVERAGE_MAP.md`
13. `docs/fable/aws/AWS_MODEL_ROUTER_DESIGN.md`
14. `docs/fable/aws/AGENTCORE_SECURITY_FIREBREAK.md`
15. `docs/fable/aws/AGENT_TOOL_PERMISSION_MATRIX.md`
16. `docs/fable/aws/AGENT_EVALUATION_RUBRICS.md`
17. `docs/fable/aws/AWS_SAGEMAKER_MLOPS_PLAN.md`
18. `docs/fable/aws/sagemaker-adrs/ADR-0001-local-first-ml.md`
19. `docs/fable/aws/AWS_CLEAN_ROOMS_PARTNERSHIP_PLAN.md`
20. `docs/fable/aws/clean-rooms-demo/README.md`

Rules:
- Treat all AWS work here as local-only.
- Do not infer account setup from docs.
- Do not add AWS SDK dependencies without owner approval.
- Do not deploy.
- Do not store source data in AWS unless the source registry permits storage and the owner approves a cloud action.
- Treat all model availability as requiring current AWS/account verification.
- Run `npm run fable:aws-gates` and the AWS decision-engine tests after any AWS policy edit.
