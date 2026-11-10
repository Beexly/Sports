---
name: clearance
description: source-router cleared flags must match source-rights-registry (fail-closed).
allowed-tools: Read, Grep, Glob, Bash(npm run *), Bash(node scripts/*)
---


## Use this skill when

- Working on `clearance` tasks: source-router cleared flags must match source-rights-registry (fail-closed).

## Do not use

- Do not use when the request is unrelated to `clearance` or when a more specific domain skill applies.

## Instructions

Follow the workflow, rules, and verification steps detailed below for `clearance`.

# Clearance honesty

## Purpose
`PLATFORM_SOURCES[].cleared` is **rights truth**, not adapter existence. Auto-select only cleared sources.

## Code
- Router: `apps/web/lib/data-sources/source-router.ts`
- Free settlement adapters may call ESPN/henrygd **directly** without router clearance
- PR #279: unregistered entries → `cleared: false` (incl. polymarket-gamma compliance hold)

## Cleared today (examples)
nflverse, espn-public-api, open-meteo, the-odds-api (+ espn dual endpoint family)

## Uncleared until registry grant
polymarket-gamma, kalshi-public, mlb-statsapi, nhl-web-api, balldontlie-nba, fpl-official, henrygd-ncaa (adapter-only)

## Do-not-dos
- Do not set cleared:true without registry row or written grant
- Do not re-enable gamma cron without counsel
- Do not confuse adapter dual-path with router cleared dual-path

Also see [clearance-registry](../clearance-registry/SKILL.md) (canonical name).
