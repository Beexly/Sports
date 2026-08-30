---
name: settlement-free-path
description: Free-path settle-picks when THE_ODDS_API_KEY is absent; paid path when present.
---

# Settlement free path

## Purpose
Settle completed games without paid Odds API scores. Path selection is **key presence**, not key health.

## Code
- Cron: `apps/web/app/api/cron/settle-picks/route.ts` — `0 */3 * * *` in `vercel.json` (#278)
- Free runner: `apps/web/lib/data-sources/free-settlement-runner.ts`
- Consensus: `apps/web/lib/data-sources/free-settlement.ts` (ESPN + henrygd adapters)
- Outbox drain: existing lease + claimVersion (do not rewrite)

## Path law
| `THE_ODDS_API_KEY` | Path | Notes |
|--------------------|------|-------|
| **ABSENT** (unset/blank) | free | `path: "free"`, `oddsApiRequired: false` |
| **PRESENT** (any truthy) | odds-api | Even if DEACTIVATED → paid path fails; free path NOT taken |

## Commands
```bash
# Manual free settle (Production HOST + CRON_SECRET — never invent secrets)
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.galaxysportsedge.com/api/cron/settle-picks"
# Expect path:free when key blank; path:odds-api when key set
```

## Failure modes
- Key present+deactivated → 401/402 from Odds → free path never runs → blank key in Vercel
- ESPN/henrygd disagree → DISPUTED hold (by design)
- Outbox drain warn → non-fatal; alerts may lag

## Do-not-dos
- Do not set oddsApiRequired=true on free path
- Do not schedule `/api/cron/gamma` without registry grant
- Do not rebuild settlement-outbox claim/lease

## Path selector (pure)
`apps/web/lib/settlement/path-select.ts` — `selectSettlementPath` used by settle-picks.
Smoke: `npm run orbit:unlock-smoke`

