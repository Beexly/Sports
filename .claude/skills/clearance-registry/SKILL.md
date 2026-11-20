---
name: clearance-registry
description: Fail-closed verification that source-router cleared flags strictly match registered rights grants.
effort: medium
allowed-tools: Read, Grep, Glob, Bash(npm run *), Bash(npx vitest*), Bash(node scripts/*)
---

# Clearance <-> Registry

## Purpose
`PLATFORM_SOURCES[].cleared` in `apps/web/lib/data-sources/source-router.ts` is **rights truth**, not adapter existence. Auto-selection permits cleared entries only. Free settlement adapters (`apps/web/lib/data-sources/free-settlement.ts`) may call ESPN/`henrygd` directly on the adapter plane without marking `henrygd-ncaa` cleared in the router.

## Current Classification (Source of Truth: `source-router.ts`)
- **Cleared (`cleared: true`):** `nflverse`, `espn-public-api`, `espn-boxscore`, `espn-standings-rankings`, `open-meteo`, `open-meteo-secondary`, `the-odds-api`
- **Uncleared (`cleared: false` until registry grant):** `polymarket-gamma` (compliance hold), `kalshi-public`, `mlb-statsapi`, `mlb-statsapi-cleared`, `nhl-web-api`, `balldontlie-nba`, `fpl-official`, `henrygd-ncaa` (linked to `registrySourceId: "henrygd-ncaa"`)
- Multi-source chains: `apps/web/lib/data-sources/multi-source-scores.ts`

## Verification & Done
```powershell
npm run agent:eval
npx vitest run --minWorkers=1 --maxWorkers=2 apps/web/__tests__/source-router.test.ts
```
Done when both commands exit `0` and no source holds `cleared: true` without a verified registry grant.
