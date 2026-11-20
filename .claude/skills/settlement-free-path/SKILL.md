---
name: settlement-free-path
description: Free-first settle-picks law since 2026-09-02 — ESPN/consensus runs primary every cycle; THE_ODDS_API_KEY adds a paid supplement only.
effort: medium
allowed-tools: Read, Grep, Glob, Bash(npm run *), Bash(npx vitest*), Bash(node scripts/*)
---

# Settlement free path

## Purpose
Settle completed games reliably without depending on paid Odds API quota. Since `2026-09-02`, the free ESPN/consensus grader runs **primary on every cycle**; `THE_ODDS_API_KEY` only determines whether a PENDING-scoped paid supplement runs afterwards.

## Code & Schedule
- Cron: `apps/web/app/api/cron/settle-picks/route.ts` (hourly `20 * * * *` in `apps/web/vercel.json`, mirrored at root `vercel.json`)
- Free runner & matcher: `apps/web/lib/data-sources/free-settlement-runner.ts`, `free-settlement.ts` (ESPN + `henrygd` adapters)
- Pure selector: `apps/web/lib/settlement/path-select.ts` (`selectSettlementPlan`, `selectSettlementPath`)
- Outbox drain: reuse existing `claimVersion` + lease semantics (never rewrite)

## Path Law (`selectSettlementPlan`)
| `THE_ODDS_API_KEY` | Plan | Response & Fault Isolation |
|---|---|---|
| **ABSENT** | free pass only | `path: "free"`, `paidSupplement: null`, `oddsApiRequired: false` |
| **PRESENT** | free pass **first**, then `settleSport` supplement | `path: "free+odds-api"`; 401/402 fails `paidSupplement` only (`ok` reflects free pass, `advisories[]` alerts) |
| `?path=free` | free pass only, supplement skipped | `path: "free"` |

## Matcher & Stale Backfill Rules
- Pending backfill queries published picks starting `> 6h` ago (cap 200/run); series doubleheaders within 4h or ambiguous city-only team names `HOLD` (`AMBIGUOUS_MATCH` / `DISPUTED`).

## Verification & Done
```powershell
npm run agent:eval
npm run orbit:unlock-smoke
npx vitest run --minWorkers=1 --maxWorkers=2 apps/web/__tests__/free-settlement-runner-map.test.ts apps/web/__tests__/free-settlement-runner-cycle.test.ts
```
Done when all three pass exit `0` and production `?path=free` smoke returns `path: "free"` without `oddsApiRequired: true`.
