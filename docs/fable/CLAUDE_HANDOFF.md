# Claude Handoff

Branch:
- `codex/fable-nfl-evidence-integration`

Primary read order:
1. `docs/fable/master/MASTER_FINAL_REPORT.md`
2. `docs/fable/master/AUDIT_STATE.md`
3. `docs/fable/master/TYPECHECK_DECISION.md`
4. `docs/fable/README.md`
5. `docs/fable/INDEX.md`
6. `apps/web/lib/fable/index.ts`
7. `apps/web/lib/fable/aws-decision-engine.ts`
8. `docs/fable/aws/AWS_PLUGIN_TO_REPO_CROSSWALK.md`
9. `docs/fable/aws/AWS_PLUGIN_GOVERNED_AUDIT.md`
10. `docs/fable/CODEX_FINAL_REPORT.md`
11. `docs/fable/CODEX_THIRD_PASS_REPORT.md`
12. `docs/fable/aws/AWS_FINAL_REPORT.md`
13. `docs/fable/evidence/CLAIM_EVIDENCE_LEDGER.md`

Rules for the next agent:
- Do not move source rights out of the existing registry.
- Do not claim live AWS setup from local skeleton files or docs.
- Do not activate paid resources.
- Do not touch the untracked scratch files unless the owner explicitly asks.
- Treat AWS account/profile/region as absent until live read-only discovery is approved and logged.
- Update final reports with exact command output if more verification is run.
- Run `npm run fable:evidence` before trusting any FABLE or AWS evidence claims.
- Check `docs/fable/master/GITHUB_PUBLICATION_PATH.md` before claiming GitHub publication.
