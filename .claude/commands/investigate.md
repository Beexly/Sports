---
description: Systematic root-cause investigation before any change
argument-hint: [symptom, error, or issue link]
allowed-tools: Read, Grep, Glob, Bash(git log*), Bash(git diff*), Bash(git blame*), Bash(git rev-parse*), Bash(curl -s https://www.galaxysportsedge.com/api/ops/public-surface-truth*), Bash(npm run test*), Bash(npx vitest*)
---
Investigate: $ARGUMENTS
1. Ground truths first: production's `/api/ops/public-surface-truth` `deployment.sha` vs `git rev-parse origin/main` (per `docs/ops/DEPLOY_LAG.md` — code on `main` isn't live until Vercel serves that SHA); the relevant rows in `docs/ops/AGENT_LEDGER.md`; and `docs/data/FLEET_DISPATCH.md` for any dispatched/in-flight work touching the same area. Confirm each of these three paths exists and read it before trusting any prior report about the symptom.
2. List ranked hypotheses for the root cause, most likely first, with the code/log/git evidence for and against each (`git log`, `git blame`, `git diff` on the suspect area).
3. Do not declare a root cause without a failing test or a concrete reproduction confirming it — hand off to `/repro` to build that if one doesn't exist yet.
4. Once confirmed, hand off to `/debug` for the fix — this command does not modify code.
Read-only throughout.
