---
description: Pre-deploy go/no-go checklist
allowed-tools: Read, Grep, Glob, Bash(npm run deploy:ready*), Bash(npm run guardrails*), Bash(npm run evals:contracts*), Bash(npm run db:migrate:status*), Bash(npm run test:fast*), Bash(npm run build*)
---
Run, in order: `npm run deploy:ready`, `npm run guardrails`, `npm run evals:contracts`, `npm run db:migrate:status`, `npm run test:fast`, and `npm run build` (the web build — root passthrough to `apps/web`'s `scripts/build-web.mjs`).
Tabulate one row per gate: gate name, pass/fail, and the first failing line of output (verbatim) when it fails.
Env presence is checked by `deploy:ready` (`scripts/check-deploy-readiness.mjs`); never display env values.
Output a go/no-go. Do NOT deploy — report only.
