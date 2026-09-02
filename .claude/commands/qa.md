---
description: Run the CI-equivalent gate locally and tabulate
allowed-tools: Read, Grep, Glob, Bash(npm run typecheck*), Bash(npm run lint*), Bash(npm run test*), Bash(npm run guardrails*), Bash(npm run agent:eval*), Bash(npm run evals:contracts*), Bash(npx vitest*)
---
Run, in order: `npm run typecheck`, `npm run lint`, `npm run test:fast`, `npm run guardrails`, `npm run evals:contracts`, `npm run agent:eval`.
Produce one table row per gate: gate name, pass/fail, and the first failing line of output (verbatim) when it fails.
Fix nothing — this command reports only, unless the user explicitly asks for fixes afterward.
State that a clean run here mirrors (but does not replace) `.github/workflows/ci.yml`, whose jobs are: `test`, `build`, `trust-gate`, `ai-council`, `model-freeze`, `draft-only`, `secret-scan`, `dependency-audit`, `api-v1-boundary`, `ai-transport-import-boundary`, `guardrails`, `brand-safety` — note any of those this local run does not cover (e.g. the Prisma-backed test-DB steps, the Next.js production build, the dependency-audit CVE scan).
