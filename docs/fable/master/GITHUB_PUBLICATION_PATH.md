# GitHub Publication Path

Updated: 2026-07-03

## Current State

- Branch: `codex/fable-nfl-evidence-integration`
- Branch pushed: no; `git ls-remote --heads origin codex/fable-nfl-evidence-integration` returned no remote head.
- PR created: no.
- Issues created: no.
- Blocker: GitHub CLI is not authenticated.

## Verified Commands

```bash
git branch -vv
git ls-remote --heads origin codex/fable-nfl-evidence-integration
gh auth status
```

`gh auth status` result:

```text
You are not logged into any GitHub hosts. To log in, run: gh auth login
```

## Manual Commands

```bash
gh auth login
git push -u origin codex/fable-nfl-evidence-integration
gh pr create --base main --head codex/fable-nfl-evidence-integration --title "feat(fable): add evidence and AWS guardrails" --body-file docs/fable/github/PR_BODY_FABLE_EVIDENCE.md
```

Do not force push. Before creating issues, search existing issues/PRs to avoid duplicates.

## Reviewer Checklist

- Open `docs/fable/README.md`.
- Open `docs/fable/master/MASTER_FINAL_REPORT.md`.
- Review `docs/fable/evidence/CLAIM_EVIDENCE_LEDGER.md`.
- Run `npm run fable:evidence`.
- Confirm AWS resources created/updated/deleted: no.
- Confirm paid services used: no.
- Confirm secrets committed: no.
- Confirm full typecheck status in `docs/fable/master/TYPECHECK_DECISION.md`.
