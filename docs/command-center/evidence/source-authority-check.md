# Source Authority Check

Date: 2026-06-09

## Result

Confidence: HIGH that `C:\Users\Garrett\Sports` is the active runnable app clone for this P0 sprint.

Not final deployment authority: because multiple sibling Sports clones exist, owner confirmation is still required before production deployment or branch surgery.

## Evidence

| Check | Result |
|---|---|
| Repo root | `C:/Users/Garrett/Sports` |
| Branch | `safety/sports-wip-2026-06-04` |
| Remote | `origin https://github.com/BeeXly/Sports.git` |
| HEAD | `f897fd5 wip(sports): safety commit - cockpit/journal updates + brand/emails/social packages` |
| Root package name | `sports-prediction-platform` |
| Web package name | `@sports/web` |
| App framework | Next.js app router under `apps/web/app` |
| Deploy config | `.vercel/project.json`, `vercel.json` |
| GitHub workflows | `brand-lint.yml`, `ci.yml`, `daily-smoke.yml`, `external-cron.yml` |
| Key scripts | `build`, `test`, `lint`, `typecheck`, `prod:probe`, `deploy:ready`, `smoke:prod` |

## Sibling Clone Ranking

| Rank | Path | Branch | Remote | Confidence |
|---:|---|---|---|---|
| 1 | `C:\Users\Garrett\Sports` | `safety/sports-wip-2026-06-04` | `BeeXly/Sports.git` | Best sprint target; runnable app verified. |
| 2 | `C:\Users\Garrett\Sports-deploy-fix` | `claude/gse-moat-aplus-clv-2026-06-03` | `BeeXly/Sports.git` | Related deployment-fix clone; not used here. |
| 3 | `C:\Users\Garrett\Sports-canonical-2026-06-03` | `claude/edge-map-rebuild-2026-06-04` | `Beexly/Sports.git` | Related canonical clone; not used here. |
| 4 | `C:\Users\Garrett\Sports_release_codex` | none shown | `BeeXly/Sports.git` | Release clone; not used here. |

## Decision

Use `C:\Users\Garrett\Sports` for P0 closure evidence and code fixes only. Do not deploy until the owner confirms this is the production source of truth and the readiness blockers are green.
