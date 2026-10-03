---
description: Safe landing path: merge via PR, then hand off to the owner-only deploy
argument-hint: [branch]
allowed-tools: Read, Grep, Glob, Bash(git status*), Bash(git log*), Bash(git diff*), Bash(git fetch*), Bash(git merge-tree*), Bash(npm run qa*), Bash(npm run guardrails*)
---
Land branch: $ARGUMENTS
1. Check preconditions before proposing a merge: CI is green on the branch head (inspect, don't assume), `/qa` is green, `/review-pr` has been run on this branch with no unresolved Critical/High findings, and the branch has no merge conflict with `origin/main`: `git fetch origin` then a read-only mergeability check — `git merge-tree --write-tree origin/main HEAD` — stop and report before proposing the merge if it exits non-zero or its output shows a conflict.
2. Merge only through a pull request. Never push to `main` directly, never force-push, regardless of how confident the preconditions look.
3. After merge, production deploys automatically from `main` on Vercel (`vercel.json`'s `buildCommand` runs `scripts/deploy/migrate-if-configured.mjs`, which is fail-closed on migration errors). Stop here — do not invoke `vercel` (it requires explicit user confirmation per `.claude/settings.json`'s ask list) and do not claim the deploy succeeded.
4. Hand the owner the runbook: `docs/ops/GO_LIVE_RUNBOOK.md` for the owner-facing go-live/deploy sequence, and `docs/ops/LAUNCH_PREFLIGHT.md` for the read-only preflight verification script (`node scripts/ops/launch-preflight.mjs`) to run once Vercel reports the build green.
5. Tell the owner to run `/canary` once Vercel reports green, to confirm the live `deployment.sha` matches this merge before calling it shipped.
