# Claude Handoff

Branch:
- `codex/fable-nfl-evidence-integration`

Primary read order:
1. `docs/fable/README.md`
2. `docs/fable/REPO_REALITY_MAP.md`
3. `apps/web/lib/fable/index.ts`
4. `docs/fable/aws/README.md`
5. `docs/fable/CODEX_FINAL_REPORT.md`
6. `docs/fable/aws/AWS_FINAL_REPORT.md`
7. `docs/fable/CODEX_SECOND_LEVEL_REPORT.md`
8. `docs/fable/CLAUDE_SECOND_LEVEL_HANDOFF.md`
9. `docs/fable/evidence/CLAIM_EVIDENCE_LEDGER.md`

Rules for the next agent:
- Do not move source rights out of the existing registry.
- Do not claim live AWS setup from local skeleton files.
- Do not activate paid resources.
- Do not touch the untracked scratch files unless the owner explicitly asks.
- Update final reports with exact command output if more verification is run.
- Run `npm run fable:evidence` before trusting second-level claims.
