---
description: Pre-deploy go/no-go checklist
allowed-tools: Read, Grep, Glob, Bash(npm run deploy:ready*), Bash(npm run guardrails*), Bash(npm run evals:contracts*), Bash(npm run db:migrate:status*), Bash(npm run test:fast*), Bash(npm run build*), Bash(npm run typecheck*)
---
Run, in order: `npm run deploy:ready`, `npm run guardrails`, `npm run evals:contracts`, `npm run db:migrate:status`, `npm run test:fast`, `npm run typecheck`, and `npm run build` (the web build — root passthrough to `apps/web`'s `scripts/build-web.mjs`). `npm run typecheck` is an explicit gate here and must not be skipped: `apps/web/next.config.mjs` sets `typescript: { ignoreBuildErrors: true }`, so a green `build` does NOT prove the code typechecks.
Tabulate one row per gate: gate name, pass/fail, and the first failing line of output (verbatim) when it fails.
Env presence is checked by `deploy:ready` (`scripts/check-deploy-readiness.mjs`); never display env values.
Output a go/no-go. Do NOT deploy — report only.
