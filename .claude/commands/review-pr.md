---
description: Read-only review of a PR or branch against repo rules
argument-hint: [PR number or branch, default HEAD vs origin/main]
allowed-tools: Read, Grep, Glob, Bash(git fetch*), Bash(git diff*), Bash(git log*), Bash(git show*), Bash(git status*), Bash(npm run typecheck*), Bash(npm run lint*), Bash(npm run test*), Bash(npm run guardrails*), Bash(npm run guard:*)
---
Review: $ARGUMENTS
1. Get the diff. Default: `git fetch origin && git diff origin/main...HEAD`. For a PR number: `git fetch origin pull/<N>/head:pr-<N>` then diff `pr-<N>` against `origin/main`. For a branch name, diff that branch against `origin/main`.
2. Apply the checklist in `.claude/skills/claude-delegate/references/review-and-land.md` — cite the section names you used (e.g. "Review tests before trusting gates", "Hold the diff against the brief", "Implementer sweep").
3. Check against CLAUDE.md's 8 non-negotiable rules, in particular #3 (no frontend-only paywalls — new premium routes must call a gate helper from `apps/web/lib/api-entitlement.ts`, e.g. `requirePremiumApi`/`gateApi`, before touching data) and #8 (brand positioning — no copy or docs framing the engine as AI; check against `docs/positioning.md` § "What Not To Say").
4. Check the `.github/PULL_REQUEST_TEMPLATE.md` independence check is answered honestly (does the change move CashSnapshot/activation/receipt-verify/paid-pilot forward, and if not, is there a justification).
5. Output a Critical / High / Medium / Low table, one row per finding, with `file:line` and the rule or checklist item it violates.
Propose only — apply nothing, stage nothing, do not suggest `/commit` unless asked.
