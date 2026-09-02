---
description: Land one task as one commit (AGENTS.md ritual)
argument-hint: [ledger task-id or one-line summary]
allowed-tools: Read, Grep, Glob, Edit, Bash(git status*), Bash(git diff*), Bash(git add *), Bash(git commit *), Bash(npm run typecheck*), Bash(npm run lint*), Bash(npm run test*), Bash(npx vitest*)
---
Land: $ARGUMENTS
Follow AGENTS.md's ritual (read its "THE LOOP" and "WORKING RULES" sections) exactly:
1. One task = one commit. `git status` first; stage the touched files **by name** — never `git add -A` or `git add .`.
2. Verify block before committing: `npm run typecheck` (0 `error TS`), `npm run lint` (exit 0), and either `npx vitest run <this task's test file(s)>` or `npm run test:fast` if the change is broad. Fix failures before committing; never `--no-verify`.
3. If $ARGUMENTS names a ledger task id, update its row in `docs/ops/AGENT_LEDGER.md` (status, owner, evidence/SHA note) in the **same commit** as the code — read the ledger's own "Rules" section first, and tag the commit message `[hermes-<id>]`.
4. Write a commit message describing what landed and why, ending with the required attribution trailer.
5. Do **not** `git push` unless the user explicitly asked for a push in this session (AGENTS.md law — default is commit-only, owner pushes).
6. Print the resulting commit SHA (`git rev-parse HEAD`) as the last line.
