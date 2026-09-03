---
description: Read-only post-deploy verification of production
argument-hint: [deployment URL, default https://www.galaxysportsedge.com]
allowed-tools: Read, Grep, Bash(npm run smoke:prod*), Bash(curl *), Bash(git rev-parse*), Bash(git fetch*)
---
Verify: ${ARGUMENTS:-https://www.galaxysportsedge.com}
1. Run `npm run smoke:prod` (`scripts/post-deploy-smoke.mjs`) — when a deployment URL argument was supplied, forward it: `npm run smoke:prod -- --url=$ARGUMENTS` (the script accepts `--url=<value>` and otherwise defaults to `https://www.galaxysportsedge.com`; without forwarding, a supplied non-default URL is silently ignored). Read its exit code and output: exit 1 = FAIL; exit 0 with "warning(s)" in the summary line = WATCH; exit 0 with "all green" = SHIP.
2. `git fetch origin` then `git rev-parse origin/main` for the expected SHA.
3. `curl` the target's `/api/ops/public-surface-truth` and read `deployment.sha` (the real field, per `apps/web/app/api/ops/public-surface-truth/route.ts`). Compare it to `origin/main`'s SHA per `docs/ops/DEPLOY_LAG.md` — code on `main` is not live until Vercel serves that SHA.
4. `curl` the target's `/api/health` (`apps/web/app/api/health/route.ts`) and report `status` (healthy/degraded).
5. Report one overall SHIP / WATCH / FAIL verdict combining 1, 3, and 4 (SHA mismatch or degraded health downgrades SHIP to at best WATCH).
Never deploy, never invoke `vercel`. Note: `scripts/smoke-prod.sh` also exists with true 0/1/2 SHIP/WATCH/FAIL exit codes but is not wired to any npm script — this command uses `npm run smoke:prod` (`post-deploy-smoke.mjs`) as specified.
