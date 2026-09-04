---
description: Run a bind through the falsifier and record the verdict. Use when running falsifyBind, evaluating whether an edge survives, recording SURVIVOR/KILLED/STARVED/PARKED, or executing a falsifier sweep over shipped binds.
argument-hint: [bind-name]
allowed-tools: Read, Grep, Glob, Bash(npx vitest run *), Bash(git show *), Bash(git checkout origin/hermes/w2-audit-settlement -- *)
---

# Falsifier run

This procedure was previously §10 of the always-on operating prompt, where it
loaded on every session whether or not any falsifier work happened. It now loads
only when the task is actually this.

## Before anything: the instrument must be acceptable

The falsifier was broken in four distinct ways for its entire life (C-65, supM,
C-70, C-74). Every verdict it produced before those fixes is void. So:

1. Confirm the acceptance harness is green — planted edge + pure noise +
   inverted, at n ∈ {100, 1k, 5k}. If the harness does not exist yet, building it
   is the task, not this.
2. If `packages/prediction-engine/src/edge-lab/falsify.ts` is not on this branch,
   acquire it and its test from the research branch:
   ```
   git checkout origin/hermes/w2-audit-settlement -- \
     packages/prediction-engine/src/edge-lab/falsify.ts \
     packages/prediction-engine/src/edge-lab/__tests__/falsify.test.ts
   npx vitest run packages/prediction-engine/src/edge-lab/__tests__/falsify.test.ts
   ```
   Green before use. Not green means stop.

## The run

Build real backtest rows: `{knownAtWeek, outcomeWeek, season, outcome, modelProb}`.

Never use `confidence/100` as `modelProb` — it is market-structural, not an
independent model probability (C-28). Never use `last_price` as `q`. Independent
`p` first, then `e = p − q`.

Run `falsifyBind`. Record the verdict verbatim, with e-values:

- `SURVIVOR` — passed all four kill tests
- `KILLED` — failed one. Never soften a KILLED. A clean KILLED is a win: it is
  publishable to the kill ledger, on-brand, and the question finally has an answer.
- `STARVED` — n below minN, e-value preserved
- `PARKED` — starved bind held for later

## After the run

Commit the verdict log durably under `handoff/` on this branch, then cite that
SHA from the AGENT_LEDGER row. A verdict that exists only in a session transcript
does not exist.

Then hand the headline numbers to the `stat-adversary` subagent before any of
them enter STATE.md or the battle plan. Builder never verifies own work.

## What this skill will not do

Arm anything. Arming a live track is founder-YES only. Publish anything (C-32,
until an e-process crosses 20). Claim an edge — the scoreboard counts survivors,
and surviving one falsifier pass is not the same as having an edge.
