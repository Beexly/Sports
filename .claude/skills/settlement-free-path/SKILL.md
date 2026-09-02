---
name: settlement-free-path
description: Free-path settle-picks when THE_ODDS_API_KEY is absent; paid path when present.
effort: medium
allowed-tools: Read, Grep, Glob, Bash(npm run *), Bash(node scripts/*)
---

# Settlement free path

## Purpose
Settle completed games without paid Odds API scores. Path selection is **key presence**, not key health.

## Code
- Cron: `apps/web/app/api/cron/settle-picks/route.ts` — hourly, `20 * * * *` in `vercel.json` (was `0 */3 * * *` in #278; moved to hourly by the P0 settlement drain, #300, 2026-08-06)
- Free runner: `apps/web/lib/data-sources/free-settlement-runner.ts`
- Consensus: `apps/web/lib/data-sources/free-settlement.ts` (ESPN + henrygd adapters)
- Outbox drain: existing lease + claimVersion (do not rewrite)

## Path law
| `THE_ODDS_API_KEY` | Path | Notes |
|--------------------|------|-------|
| **ABSENT** (unset/blank) | free | `path: "free"`, `oddsApiRequired: false` |
| **PRESENT** (any truthy) | odds-api, free fallback per failed sport | Since 2026-09-02 (PR #684): a sport whose paid scores fetch fails (dead/exhausted key, 401/402/429) is handed to the free ESPN path in the same cycle (`freeFallback` in the response, `paidFailedSports` lists them). Before that a deactivated key silently graded nothing for 9 days. |
| `?path=free` on the URL | free | Forces the free path with the key present. The autonomy executor sends this for its free-settle action. |

## Lanes (all PENDING-scoped, none overwrites a conflicting final)
- Paid `settleSport` (Odds API scores, `daysFrom=3`) — writes `settlement_runs`; its catch returns `status: failed` (captured to Sentry by the route since PR #684).
- Free `runFreePathSettlement` (ESPN, + henrygd for NCAA only once the source is registered) — live path, and the fallback above.
- Stale backfill `backfillStaleSettlement` — every published PENDING pick whose game started more than **6h** ago (= settlement-health grace; was 3 days, which left the 6h–3d band ungraded when the paid path died), cap 200/run, HELD outcomes recorded in `unresolved` with their reason.

## Matcher (free-settlement.ts)
- Nearest start time wins among same-matchup finals (series games); a same-day doubleheader (two finals within 4h) still HOLDs as `AMBIGUOUS_MATCH`.
- City-only pick names ("Los Angeles", "New York", "Chicago") HOLD when two teams with that city are on the fetched boards; grade only when the city names exactly one team.

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

