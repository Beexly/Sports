---
name: clearance-registry
description: source-router cleared flags must match source-rights-registry (fail-closed).
allowed-tools: Read, Grep, Glob, Bash(npm run *), Bash(node scripts/*)
---


## Use this skill when

- Working on `clearance-registry` tasks: source-router cleared flags must match source-rights-registry (fail-closed).

## Do not use

- Do not use when the request is unrelated to `clearance-registry` or when a more specific domain skill applies.

## Instructions

Follow the workflow, rules, and verification steps detailed below for `clearance-registry`.

# Clearance ↔ registry

## Purpose
`PLATFORM_SOURCES[].cleared` is **rights truth**, not “adapter exists.” Auto-select only cleared sources.

## Code
- Router: `apps/web/lib/data-sources/source-router.ts`
- Free settlement adapters may call ESPN/henrygd **directly** (adapter plane ≠ router cleared)
- Dual score chains: `apps/web/lib/data-sources/multi-source-scores.ts`

## Cleared (registry-backed)
`nflverse`, `espn-public-api`, `espn-boxscore`, `espn-standings-rankings`, `open-meteo`, `open-meteo-secondary`, `the-odds-api`

## Uncleared until registry grant
`polymarket-gamma` (compliance hold), `kalshi-public`, `mlb-statsapi`, `mlb-statsapi-cleared`, `nhl-web-api`, `balldontlie-nba`, `fpl-official`, `henrygd-ncaa` (adapter-only)

## Commands
```bash
npm run agent:eval   # asserts uncleared ids stay false
# unit: apps/web/__tests__/source-router.test.ts
```

## Failure modes
- Setting `cleared:true` without registry → free-first planner may auto-select illegal source
- Confusing adapter dual-path with router dual-cleared

## Do-not-dos
- Do not re-enable gamma cron without counsel-approved registry entry
- Do not mark henrygd cleared just because free-settlement calls it
