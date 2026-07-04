# Claude Handoff

Branch:
- `codex/fable-nfl-evidence-integration`

Primary read order:
1. `docs/fable/master/MASTER_FINAL_REPORT.md`
2. `docs/fable/master/AUDIT_STATE.md`
3. `docs/fable/master/TYPECHECK_DECISION.md`
4. `docs/fable/README.md`
5. `docs/fable/INDEX.md`
6. `apps/web/app/fable/page.tsx`
7. `apps/web/lib/fable/public-summary.ts`
8. `apps/web/lib/fable/aws-local-fixtures.ts`
9. `apps/web/lib/fable/aws-governance-os.ts`
10. `apps/web/lib/fable/index.ts`
11. `apps/web/lib/fable/aws-decision-engine.ts`
12. `docs/fable/aws/fixtures/AWS_LOCAL_FIXTURE_LIBRARY.json`
13. `docs/fable/aws/governance-os/SHADOW_CONTROL_TOWER_BLUEPRINT.json`
14. `docs/fable/aws/AWS_PLUGIN_TO_REPO_CROSSWALK.md`
15. `docs/fable/aws/AWS_PLUGIN_GOVERNED_AUDIT.md`
16. `docs/fable/CODEX_FINAL_REPORT.md`
17. `docs/fable/CODEX_THIRD_PASS_REPORT.md`
18. `docs/fable/aws/AWS_FINAL_REPORT.md`
19. `docs/fable/evidence/CLAIM_EVIDENCE_LEDGER.md`

Rules for the next agent:
- Do not move source rights out of the existing registry.
- Do not claim live AWS setup from local skeleton files or docs.
- Do not activate paid resources.
- Do not touch the untracked scratch files unless the owner explicitly asks.
- Treat AWS account/profile/region as absent until live read-only discovery is approved and logged.
- Update final reports with exact command output if more verification is run.
- Run `npm run fable:evidence` before trusting any FABLE or AWS evidence claims.
- Run `npm run fable:aws-fixtures` before changing the AWS local fixture library.
- Run `npm run fable:aws-governance` before changing Shadow Control Tower or WA lens artifacts.
- Run the app route tests before changing `/fable`: `npm run test --workspace=apps/web -- lib/fable/public-summary.test.ts lib/fable/evidence/evidence-harness.test.ts __tests__/next-config-policy.test.ts __tests__/public-copy-scan-strong.test.ts`.
- Check `docs/fable/master/GITHUB_PUBLICATION_PATH.md` before claiming GitHub publication.
