---
name: polymarket-hold
description: Polymarket is a compliance hold, not unfinished product work. Use when asked to finish/enable Polymarket markets.
allowed-tools: Read, Grep, Glob, Bash(npm run *), Bash(node scripts/*)
---


## Use this skill when

- Working on `polymarket-hold` tasks: Polymarket is a compliance hold, not unfinished product work. Use when asked to finish/enable Polymarket markets.

## Do not use

- Do not use when the request is unrelated to `polymarket-hold` or when a more specific domain skill applies.

## Instructions

Follow the workflow, rules, and verification steps detailed below for `polymarket-hold`.

# Polymarket compliance hold

## Law
Polymarket / prediction-market integrations are on **compliance hold**.
They are **not** incomplete features. Agents must **refuse** to open tickets,
build markets, or re-enable crons without counsel registry grant.

## Correct behavior
- Label as compliance hold in plans and PRs
- Point to `docs/ops/ORBIT_UNLOCK.md` non-actions
- Keep `cleared: false` for unregistered prediction sources in source-router

## Incorrect behavior
- "Finish Polymarket integration"
- Enabling gamma cron without grant
- Treating hold as tech debt
